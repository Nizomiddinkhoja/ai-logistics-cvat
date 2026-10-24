# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
A read-only, admin-only view over the user activity events stored in ClickHouse.
It is used by the "Activity log" page of the UI.
"""

from datetime import datetime, timezone
from typing import Any

import clickhouse_connect
from dateutil import parser
from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from cvat.apps.engine.types import ExtendedRequest

MAX_PAGE_SIZE = 200
DEFAULT_PAGE_SIZE = 50

_ID_FILTERS = ("user_id", "project_id", "task_id", "job_id", "org_id", "obj_id")
_LIST_FILTERS = ("scope", "exclude_scope", "source")

_COLUMNS = (
    "timestamp",
    "scope",
    "source",
    "obj_name",
    "obj_id",
    "obj_val",
    "count",
    "duration",
    "project_id",
    "task_id",
    "job_id",
    "user_id",
    "user_name",
    "user_email",
    "org_id",
    "org_slug",
    "payload",
    "remote_addr",
)


class IsCvatAdmin(BasePermission):
    message = "Only administrators can view the activity log"

    def has_permission(self, request: ExtendedRequest, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False

        return user.is_superuser or user.groups.filter(name=settings.IAM_ADMIN_ROLE).exists()


def _get_client():
    clickhouse_settings = settings.CLICKHOUSE["events"]
    return clickhouse_connect.get_client(
        host=clickhouse_settings["HOST"],
        database=clickhouse_settings["NAME"],
        port=clickhouse_settings["PORT"],
        username=clickhouse_settings["USER"],
        password=clickhouse_settings["PASSWORD"],
    )


def _parse_int(name: str, value: str) -> int:
    try:
        return int(value)
    except ValueError as ex:
        raise serializers.ValidationError(f"{name!r} must be an integer") from ex


def _parse_datetime(name: str, value: str) -> datetime:
    try:
        return parser.isoparse(value)
    except ValueError as ex:
        raise serializers.ValidationError(f"Cannot parse {name!r} datetime parameter") from ex


def _build_conditions(query_params) -> tuple[list[str], dict[str, Any]]:
    conditions: list[str] = []
    parameters: dict[str, Any] = {}

    for name in _ID_FILTERS:
        if value := query_params.get(name):
            parameters[name] = _parse_int(name, value)
            conditions.append(f"{name} = {{{name}:UInt64}}")

    for name in _LIST_FILTERS:
        if value := query_params.get(name):
            parameters[name] = [item for item in value.split(",") if item]
            column = "scope" if name == "exclude_scope" else name
            operator = "NOT IN" if name == "exclude_scope" else "IN"
            conditions.append(f"{column} {operator} {{{name}:Array(String)}}")

    if value := query_params.get("from"):
        parameters["from"] = _parse_datetime("from", value)
        conditions.append("timestamp >= {from:DateTime64}")

    if value := query_params.get("to"):
        parameters["to"] = _parse_datetime("to", value)
        conditions.append("timestamp <= {to:DateTime64}")

    if value := query_params.get("search"):
        parameters["search"] = value
        conditions.append(
            "("
            + " OR ".join(
                f"positionCaseInsensitiveUTF8(ifNull({column}, ''), {{search:String}}) > 0"
                for column in ("user_name", "user_email", "obj_name", "obj_val", "payload")
            )
            + ")"
        )

    return conditions, parameters


def _where(conditions: list[str]) -> str:
    return (" WHERE " + " AND ".join(conditions)) if conditions else ""


class ActivityLogViewSet(viewsets.ViewSet):
    serializer_class = None
    permission_classes = [IsAuthenticated, IsCvatAdmin]

    @extend_schema(exclude=True)
    def list(self, request: ExtendedRequest):
        page = max(1, _parse_int("page", request.query_params.get("page", "1")))
        page_size = _parse_int("page_size", request.query_params.get("page_size", str(DEFAULT_PAGE_SIZE)))
        page_size = min(max(1, page_size), MAX_PAGE_SIZE)
        ordering = "ASC" if request.query_params.get("sort") == "timestamp" else "DESC"

        conditions, parameters = _build_conditions(request.query_params)
        where = _where(conditions)

        with _get_client() as client:
            count = client.query(
                f"SELECT count() FROM events{where}", parameters=parameters
            ).result_rows[0][0]

            result = client.query(
                f"SELECT {', '.join(_COLUMNS)} FROM events{where} "
                f"ORDER BY timestamp {ordering} LIMIT {{limit:UInt32}} OFFSET {{offset:UInt64}}",
                parameters={**parameters, "limit": page_size, "offset": (page - 1) * page_size},
            )

        results = []
        for row in result.result_rows:
            item = dict(zip(result.column_names, row))
            # timestamps are stored in UTC, but the client may return them without timezone
            timestamp = item["timestamp"]
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            item["timestamp"] = timestamp.isoformat()
            results.append(item)

        return Response({"count": count, "results": results})

    @extend_schema(exclude=True)
    @action(detail=False, methods=["GET"], url_path="facets")
    def facets(self, request: ExtendedRequest):
        # facets are computed for the selected period only, other filters are ignored
        conditions, parameters = _build_conditions(
            {key: request.query_params[key] for key in ("from", "to") if key in request.query_params}
        )
        where = _where(conditions)

        with _get_client() as client:
            scopes = client.query(
                f"SELECT scope, count() FROM events{where} GROUP BY scope ORDER BY scope",
                parameters=parameters,
            ).result_rows
            users = client.query(
                f"SELECT user_id, any(user_name), any(user_email), count() FROM events{where} "
                "GROUP BY user_id HAVING user_id IS NOT NULL ORDER BY any(user_name)",
                parameters=parameters,
            ).result_rows

        return Response(
            {
                "scopes": [{"scope": scope, "count": count} for scope, count in scopes],
                "users": [
                    {"id": user_id, "username": username, "email": email, "count": count}
                    for user_id, username, email, count in users
                ],
            }
        )

# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import routers

from . import views
from .activity_log import ActivityLogViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register("events", views.EventsViewSet, basename="events")
router.register("events/activity-log", ActivityLogViewSet, basename="activity-log")

urlpatterns = router.urls

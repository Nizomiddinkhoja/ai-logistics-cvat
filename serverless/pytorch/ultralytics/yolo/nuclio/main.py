# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
import io
import json

import yaml
from model_handler import ModelHandler
from PIL import Image

DEFAULT_THRESHOLD = 0.5


def init_context(context):
    context.logger.info("Init context...  0%")

    with open("/opt/nuclio/function.yaml", "rb") as function_file:
        functionconfig = yaml.safe_load(function_file)

    labels_spec = functionconfig["metadata"]["annotations"]["spec"]
    labels = {item["id"]: item["name"] for item in json.loads(labels_spec)}

    context.user_data.model = ModelHandler(labels)

    context.logger.info("Init context...100%")


def handler(context, event):
    context.logger.info("Run Ultralytics YOLO model")

    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    # CVAT only sends the threshold when a user set one in the model runner dialog
    threshold = float(data.get("threshold", DEFAULT_THRESHOLD))
    image = Image.open(buf).convert("RGB")

    results = context.user_data.model.infer(image, threshold)

    return context.Response(
        body=json.dumps(results), headers={}, content_type="application/json", status_code=200
    )

# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Generates function.yaml for an Ultralytics YOLO model.

CVAT reads the list of model labels from the `spec` annotation of function.yaml,
so the file has to describe the classes of the particular weights being deployed.
This script loads the model, takes the class names and the task from it and writes
the manifest. It runs inside the function base image, where ultralytics is available.
"""

import argparse
import json
import re
import sys

from ultralytics import YOLO

TASK_TO_SHAPE = {
    "detect": "rectangle",
    "segment": "mask",
}

TEMPLATE = """metadata:
  name: {function_name}
  namespace: cvat
  annotations:
    name: {display_name}
    version: 2
    type: detector
    spec: |
{spec}
spec:
  description: {description}
  runtime: 'python:3.10'
  handler: main:handler
  eventTimeout: {event_timeout}
  build:
    # an image per function, so that several models can be deployed side by side
    image: cvat.pytorch.ultralytics.yolo.{function_name}
    baseImage: cvat.pytorch.ultralytics.yolo.base

    directives:
      preCopy:
        - kind: WORKDIR
          value: /opt/nuclio

  triggers:
    myHttpTrigger:
      numWorkers: {num_workers}
      kind: 'http'
      workerAvailabilityTimeoutMilliseconds: 10000
      attributes:
        # a fixed host port: with a random one docker assigns a new port each time
        # the container restarts, while nuclio keeps the old one and CVAT fails
        # to reach the function with "Connection refused"
        port: {http_port}
        maxRequestBodySize: 33554432 # 32MB

  platform:
    attributes:
      restartPolicy:
        name: always
        maximumRetryCount: 3
      mountMode: volume
"""

GPU_RESOURCES = """
  resources:
    limits:
      nvidia.com/gpu: 1
"""


def slugify(value: str) -> str:
    """Nuclio function names have to be lowercase and DNS friendly"""
    slug = re.sub(r"[^a-z0-9-]+", "-", value.lower()).strip("-")
    return slug or "pth-ultralytics-yolo"


def build_spec(names: dict, shape_type: str) -> str:
    labels = [
        {"id": int(class_id), "name": str(name), "type": shape_type}
        for class_id, name in sorted(names.items(), key=lambda item: int(item[0]))
    ]

    lines = json.dumps(labels, indent=2).splitlines()
    # the spec is a block literal inside function.yaml, so every line is indented
    return "\n".join("      " + line for line in lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--weights", default="/opt/nuclio/model.pt")
    parser.add_argument("--output", default="/opt/nuclio/function.yaml")
    parser.add_argument("--display-name", default="Custom YOLO")
    parser.add_argument("--function-name", default="pth-ultralytics-yolo")
    parser.add_argument("--num-workers", type=int, default=1)
    parser.add_argument("--event-timeout", default="60s")
    parser.add_argument("--http-port", type=int, default=32100)
    parser.add_argument("--gpu", action="store_true")
    args = parser.parse_args()

    model = YOLO(args.weights)
    task = getattr(model, "task", "detect")

    if task not in TASK_TO_SHAPE:
        print(
            f"Unsupported model task {task!r}, this function handles "
            f"{' and '.join(TASK_TO_SHAPE)} models",
            file=sys.stderr,
        )
        return 1

    names = getattr(model, "names", None)
    if not names:
        print("The model does not expose class names, can not build a label spec", file=sys.stderr)
        return 1

    content = TEMPLATE.format(
        function_name=slugify(args.function_name),
        display_name=json.dumps(args.display_name),
        description=json.dumps(f"Ultralytics YOLO ({task}) deployed from {args.weights}"),
        spec=build_spec(names, TASK_TO_SHAPE[task]),
        num_workers=args.num_workers,
        event_timeout=args.event_timeout,
        http_port=args.http_port,
    )

    if args.gpu:
        content += GPU_RESOURCES

    with open(args.output, "w", encoding="utf-8", newline="\n") as output:
        output.write(content)

    print(f"Wrote {args.output}: {len(names)} label(s), task {task}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

import numpy as np
from ultralytics import YOLO

# The function directory is copied to /opt/nuclio inside the container.
# A custom model is deployed as model.pt, yolov8n.pt is baked into the base image
# and is used as a fallback so that the function is usable out of the box.
WEIGHTS_CANDIDATES = ("/opt/nuclio/model.pt", "/opt/nuclio/yolov8n.pt")

SUPPORTED_TASKS = ("detect", "segment")


def _find_weights() -> str:
    candidates = []

    explicit = os.environ.get("YOLO_WEIGHTS")
    if explicit:
        candidates.append(explicit)
    candidates.extend(WEIGHTS_CANDIDATES)

    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate

    raise FileNotFoundError(
        "Could not find model weights, looked at: {}. "
        "Put your .pt file next to function.yaml as model.pt "
        "or point YOLO_WEIGHTS at it".format(", ".join(candidates))
    )


class ModelHandler:
    def __init__(self, labels):
        self.labels = labels
        self.model = YOLO(_find_weights())
        self.task = getattr(self.model, "task", "detect")

        if self.task not in SUPPORTED_TASKS:
            raise ValueError(
                "This function supports {} models, got a {!r} one. "
                "Classification and pose models need a different handler".format(
                    " and ".join(SUPPORTED_TASKS), self.task
                )
            )

    def _label_name(self, class_id: int) -> str:
        # names of the loaded model win over the ones declared in function.yaml,
        # they describe what the weights actually predict
        names = getattr(self.model, "names", None) or {}
        return names.get(class_id, self.labels.get(class_id, str(class_id)))

    def infer(self, image, threshold: float) -> list:
        width, height = image.size

        predictions = self.model.predict(
            source=image,
            conf=threshold,
            verbose=False,
            # full resolution masks, otherwise they come back in the letterboxed model space
            retina_masks=self.task == "segment",
        )

        results = []
        for prediction in predictions:
            boxes = prediction.boxes
            if boxes is None:
                continue

            masks = prediction.masks if self.task == "segment" else None

            # the declared labels of a segmentation model are of the mask type,
            # emitting rectangles for them would be rejected by CVAT
            if self.task == "segment" and masks is None:
                continue

            for index in range(len(boxes)):
                confidence = float(boxes.conf[index])
                class_id = int(boxes.cls[index])
                label = self._label_name(class_id)

                xtl, ytl, xbr, ybr = (int(round(value)) for value in boxes.xyxy[index].tolist())
                # predictions may stick out of the image by a pixel or two
                xtl = max(0, min(xtl, width - 1))
                ytl = max(0, min(ytl, height - 1))
                xbr = max(xtl, min(xbr, width - 1))
                ybr = max(ytl, min(ybr, height - 1))

                if masks is None:
                    results.append(
                        {
                            "confidence": str(confidence),
                            "label": label,
                            "points": [xtl, ytl, xbr, ybr],
                            "type": "rectangle",
                        }
                    )
                    continue

                mask = masks.data[index].cpu().numpy()
                binary_mask = (mask > 0.5).astype(np.uint8)

                # CVAT expects the mask cropped to its bounding box with the box appended
                cropped = binary_mask[ytl : ybr + 1, xtl : xbr + 1]
                if not cropped.any():
                    continue

                cvat_mask = cropped.flatten().tolist()
                cvat_mask.extend([xtl, ytl, xbr, ybr])

                shape = {
                    "confidence": str(confidence),
                    "label": label,
                    "mask": cvat_mask,
                    "type": "mask",
                }

                # the contour lets CVAT convert the mask to a polygon when a user asks for it
                contour = masks.xy[index] if index < len(masks.xy) else None
                if contour is not None and len(contour) >= 3:
                    shape["points"] = np.array(contour).ravel().tolist()

                results.append(shape)

        return results

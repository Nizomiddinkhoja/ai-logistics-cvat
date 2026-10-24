# Custom Ultralytics YOLO for automatic annotation

Deploys your own Ultralytics YOLO weights (`.pt`) as a CVAT auto annotation model.
Detection and instance segmentation models are supported; classification and pose
models need a different handler and are rejected with a clear error.

Once deployed, the model appears on the **Models** page and can be run over a whole
task from the task menu, where the confidence threshold, the mapping of model labels
onto task labels and the "clean old annotations" option are set.

## Prerequisites

1. The serverless stack has to be running:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.override.yml        -f components/serverless/docker-compose.serverless.yml up -d
   ```

2. `nuctl`, the nuclio CLI. On Linux and macOS the deploy script uses it from PATH
   when it is installed, see <https://github.com/nuclio/nuclio/releases/tag/1.16.3>.

   On Windows there is nothing to install: the native `nuctl.exe` cannot deploy to
   the local platform at all, because it shells out to `/bin/sh`. The script builds
   a small image from `serverless/nuctl/Dockerfile` and runs the Linux `nuctl` in a
   container with the docker socket mounted. Set `NUCTL_IN_DOCKER=1` to force that
   mode on other systems, or `NUCTL_IN_DOCKER=0` to always use the local binary.

## Deploying your model

```bash
./serverless/deploy_ultralytics_yolo.sh --weights /path/to/best.pt --name "Pallets detector"
```

The script copies the weights next to the function, reads the class names and the task
(detect or segment) out of the model itself, generates `function.yaml` from them and
deploys the function. Nothing has to be edited by hand: the labels CVAT offers for
mapping are exactly the classes your weights predict.

Without `--weights` the COCO pretrained `yolov8n` is deployed, which is a convenient
way to check that the whole pipeline works before bringing in your own model.

To keep several models side by side, give each one its own function name:

```bash
./serverless/deploy_ultralytics_yolo.sh --weights ./boxes.pt --name "Boxes" --function pth-yolo-boxes
./serverless/deploy_ultralytics_yolo.sh --weights ./pallets.pt --name "Pallets" --function pth-yolo-pallets
```

## Confidence threshold

The threshold is chosen per run in the CVAT dialog and is sent to the function with
every request. When CVAT sends nothing, the function falls back to `0.5`
(`DEFAULT_THRESHOLD` in `nuclio/main.py`).

## Throughput

`--workers N` raises the number of parallel nuclio workers. Every worker keeps its own
copy of the model in memory, so raise it together with the available RAM.

## GPU

`--gpu` adds `nvidia.com/gpu: 1` to the function resources. It also needs a CUDA
enabled base image: replace the torch line in `nuclio/Dockerfile` with the CUDA wheels
and use a `nvidia/cuda` base. The nvidia container runtime has to be configured for
docker. This path has not been verified on this deployment.

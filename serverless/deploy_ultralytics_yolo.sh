#!/bin/bash
# Deploys a user provided Ultralytics YOLO model as a CVAT auto annotation function.
#
#   ./serverless/deploy_ultralytics_yolo.sh --weights /path/to/best.pt --name "Pallets detector"
#
# The weights are copied next to the function, the label spec is generated from the
# class names of the model itself, and the function is deployed to nuclio. Afterwards
# the model shows up on the Models page and can be run over a whole task from the
# task menu ("Automatic annotation"), where the confidence threshold is set.

set -eu

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FUNC_DIR="$SCRIPT_DIR/pytorch/ultralytics/yolo/nuclio"
# nuctl and docker on Windows do not understand msys paths like /c/Users/...
HOST_FUNC_DIR="$( cd "$FUNC_DIR" && { pwd -W 2>/dev/null || pwd; } )"
BASE_IMAGE=cvat.pytorch.ultralytics.yolo.base

WEIGHTS=""
DISPLAY_NAME="Custom YOLO"
FUNCTION_NAME="pth-ultralytics-yolo"
NUM_WORKERS=1
HTTP_PORT=32100
GPU_FLAG=""
DOCKER_RUN_GPU=""

usage() {
    cat <<'USAGE'
Usage: deploy_ultralytics_yolo.sh [options]

  --weights PATH    .pt file of your Ultralytics model (detect or segment).
                    Without it the COCO pretrained yolov8n is deployed.
  --name NAME       Name shown on the Models page. Default: "Custom YOLO"
  --function NAME   Nuclio function name, lowercase. Deploy several models by
                    giving each one its own name. Default: pth-ultralytics-yolo
  --workers N       Parallel nuclio workers. Default: 1
  --port N          Fixed host port of the function, so it survives container
                    restarts. Give each deployed model its own. Default: 32100
  --gpu             Request a GPU for the function. Needs the nvidia container
                    runtime and a CUDA enabled base image, see the README.
  -h, --help        This message
USAGE
}

while [ $# -gt 0 ]; do
    case "$1" in
        --weights) WEIGHTS="$2"; shift 2 ;;
        --name) DISPLAY_NAME="$2"; shift 2 ;;
        --function) FUNCTION_NAME="$2"; shift 2 ;;
        --workers) NUM_WORKERS="$2"; shift 2 ;;
        --port) HTTP_PORT="$2"; shift 2 ;;
        --gpu) GPU_FLAG="--gpu"; DOCKER_RUN_GPU="--gpus all"; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
done

# The native Windows nuctl cannot deploy to the local platform: it shells out to
# /bin/sh. There the Linux build is run in a container instead, with the docker
# socket mounted, which behaves the same on every host.
NUCTL_IMAGE=cvat.nuctl
case "${NUCTL_IN_DOCKER:-auto}" in
    1) USE_DOCKER_NUCTL=1 ;;
    0) USE_DOCKER_NUCTL=0 ;;
    *)
        case "$(uname -s)" in
            MINGW*|MSYS*|CYGWIN*) USE_DOCKER_NUCTL=1 ;;
            *) command -v nuctl > /dev/null 2>&1 && USE_DOCKER_NUCTL=0 || USE_DOCKER_NUCTL=1 ;;
        esac
        ;;
esac

if [ "$USE_DOCKER_NUCTL" = "0" ] && ! command -v nuctl > /dev/null 2>&1; then
    echo "nuctl is not installed. Install it from" >&2
    echo "https://github.com/nuclio/nuclio/releases, or set NUCTL_IN_DOCKER=1" >&2
    exit 1
fi

nuctl() {
    if [ "$USE_DOCKER_NUCTL" = "0" ]; then
        command nuctl "$@"
        return
    fi

    MSYS_NO_PATHCONV=1 docker run --rm \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v "$HOST_FUNC_DIR:/mnt/func" \
        "$NUCTL_IMAGE" "$@"
}

# the weights the manifest generator reads. The function directory is mounted at
# /mnt/func rather than /opt/nuclio, otherwise it would hide the model baked into the image
MODEL_ARG=/opt/nuclio/yolov8n.pt
if [ -n "$WEIGHTS" ]; then
    if [ ! -f "$WEIGHTS" ]; then
        echo "No such file: $WEIGHTS" >&2
        exit 1
    fi

    echo "Copying $WEIGHTS into the function..."
    cp "$WEIGHTS" "$FUNC_DIR/model.pt"
    MODEL_ARG=/mnt/func/model.pt
fi

if [ "$USE_DOCKER_NUCTL" = "1" ]; then
    echo "Building the nuctl runner image..."
    DOCKER_BUILDKIT=1 docker build -t "$NUCTL_IMAGE" "$SCRIPT_DIR/nuctl"
fi

echo "Building the base image..."
DOCKER_BUILDKIT=1 docker build -t "$BASE_IMAGE" "$FUNC_DIR"

echo "Reading the label list from the model..."
MSYS_NO_PATHCONV=1 docker run --rm $DOCKER_RUN_GPU \
    -v "$HOST_FUNC_DIR:/mnt/func" \
    "$BASE_IMAGE" \
    python /mnt/func/generate_function_yaml.py \
        --weights "$MODEL_ARG" \
        --output /mnt/func/function.yaml \
        --display-name "$DISPLAY_NAME" \
        --function-name "$FUNCTION_NAME" \
        --num-workers "$NUM_WORKERS" \
        --http-port "$HTTP_PORT" \
        $GPU_FLAG

echo "Deploying the function..."
nuctl create project cvat --platform local 2> /dev/null || true
if [ "$USE_DOCKER_NUCTL" = "1" ]; then
    NUCTL_PATH=/mnt/func
else
    NUCTL_PATH="$HOST_FUNC_DIR"
fi

nuctl deploy --project-name cvat --path "$NUCTL_PATH" \
    --file "$NUCTL_PATH/function.yaml" --platform local \
    --env CVAT_FUNCTIONS_REDIS_HOST=cvat_redis_ondisk \
    --env CVAT_FUNCTIONS_REDIS_PORT=6666 \
    --platform-config '{"attributes": {"network": "cvat_cvat"}}'

nuctl get function --platform local

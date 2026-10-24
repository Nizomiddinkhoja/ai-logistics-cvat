FROM python:3.10-slim

# opencv, pulled in by ultralytics, needs these system libraries
RUN apt-get update && \
    apt-get install --no-install-recommends -y libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# the CPU wheels of torch are an order of magnitude smaller than the default CUDA ones.
# the pytorch index is an extra one, not the main one: it does not carry the build
# dependencies of the other packages, those still have to come from PyPI
RUN pip install --no-cache-dir torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir ultralytics opencv-python-headless pillow pyyaml

# ultralytics writes its settings next to the user home, which is not writable for the function
ENV YOLO_CONFIG_DIR=/tmp/ultralytics \
    MPLCONFIGDIR=/tmp/matplotlib

WORKDIR /opt/nuclio

# a pretrained model, used when no custom weights are provided, and a smoke test of the install
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

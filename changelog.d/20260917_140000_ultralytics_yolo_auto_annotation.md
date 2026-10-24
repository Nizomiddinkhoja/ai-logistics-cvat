### Added

- A serverless function template that deploys a user provided Ultralytics YOLO
  model (detection or instance segmentation) as a CVAT auto annotation model.
  `serverless/deploy_ultralytics_yolo.sh` takes a `.pt` file, reads the class
  names and the task out of the weights, generates the nuclio manifest from them
  and deploys the function, after which the model can be run over a whole task
  with a confidence threshold and a label mapping

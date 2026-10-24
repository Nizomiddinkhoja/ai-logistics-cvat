### Added

- New images can be added to an already created 2D image task that stores its
  files on the server: `Add images` in the task actions menu, or repeated upload
  requests to `POST /api/tasks/<id>/data`. The images are added to the end of the
  task and new jobs are created for them, the existing frames, jobs and
  annotations are not changed

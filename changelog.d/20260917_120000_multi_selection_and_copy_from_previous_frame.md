### Added

- Multi selection of objects in the standard workspace: ctrl+click toggles an
  object, shift+click selects the whole range between two objects and shift+drag
  over an empty part of the image selects every object inside the drawn box.
  Lock, hide, occluded and delete shortcuts, as well as the new sidebar panel,
  apply to the whole selection. Dragging one of the selected objects moves the
  whole selection

- Selected objects can be copied with `Ctrl+C` and pasted with `Ctrl+V` on any
  other frame, job or task. The clipboard is kept in the browser storage and
  matches labels and attributes by name, so objects survive navigation between
  tasks. Objects whose label is missing in the target task are skipped

- A new `R` shortcut that copies every shape drawn on the previous frame to the
  current one. The `Next keyframe` shortcut moved from `R` to `Shift+R`

### Fixed

- Stored shortcut settings no longer shadow shortcuts that were introduced after
  those settings had been saved

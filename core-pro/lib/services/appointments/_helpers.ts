import "server-only"

import { ServiceError } from "../_lib/errors"

// Business invariant shared by create / update / reschedule / save-availability
// flows: end must come strictly after start. Message text is preserved verbatim
// because the action contract surfaced it to the UI.
export function assertEndAfterStart(start: Date, end: Date): void {
  if (end <= start) {
    throw new ServiceError("End time must be after start time.")
  }
}

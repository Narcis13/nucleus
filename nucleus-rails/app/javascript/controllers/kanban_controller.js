import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

// Drag/drop over kanban columns. Rs4 ships the scaffold; the server-side
// move endpoint lands in Rs6 (leads pipeline). Without an update-url value,
// the controller is a no-op after drop — useful for previews.
export default class extends Controller {
  static targets = ["column"]
  static values  = { updateUrl: String }

  connect() {
    this.sortables = this.columnTargets.map(col =>
      Sortable.create(col, {
        group: "kanban",
        animation: 150,
        ghostClass: "opacity-50",
        onEnd: (e) => this.onEnd(e)
      })
    )
  }

  disconnect() {
    this.sortables?.forEach(s => s.destroy())
    this.sortables = null
  }

  onEnd(event) {
    if (!this.hasUpdateUrlValue || !this.updateUrlValue) return

    const itemId   = event.item?.dataset?.itemId
    const columnId = event.to?.dataset?.columnId
    const position = event.newIndex
    const token    = document.querySelector('meta[name="csrf-token"]')?.content

    if (!itemId || !columnId) return

    fetch(this.updateUrlValue.replace(":id", itemId), {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "Accept":       "text/vnd.turbo-stream.html, application/json",
        "X-CSRF-Token": token || ""
      },
      body: JSON.stringify({ column_id: columnId, position })
    })
  }
}

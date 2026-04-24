import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

// Sortable list inside the stage manager modal. Whole rows are draggable;
// on drop we POST the new order to the reorder endpoint. A refresh Turbo
// Stream (broadcast by the controller) then re-renders the board so the
// manager modal and the Kanban stay in sync.
export default class extends Controller {
  static targets = ["row"]
  static values  = { reorderUrl: String }

  connect() {
    this.sortable = Sortable.create(this.element, {
      animation: 150,
      ghostClass: "opacity-40",
      draggable: "[data-stage-reorder-target='row']",
      onEnd: () => this.persist()
    })
  }

  disconnect() {
    this.sortable?.destroy()
    this.sortable = null
  }

  persist() {
    const orderedIds = this.rowTargets.map(el => el.dataset.stageId)
    const token = document.querySelector('meta[name="csrf-token"]')?.content
    const body = new FormData()
    orderedIds.forEach(id => body.append("ordered_ids[]", id))

    fetch(this.reorderUrlValue, {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": token || "", "Accept": "application/json" },
      body
    }).catch(() => {})
  }
}

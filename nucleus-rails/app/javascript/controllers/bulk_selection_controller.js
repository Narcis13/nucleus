import { Controller } from "@hotwired/stimulus"

// Toggles row checkboxes on the clients index. Watches change events on
// each row checkbox and the header's "select all", keeps a live count, and
// enables the bulk-action submit button when at least one row is selected.
export default class extends Controller {
  static targets = ["row", "selectAll", "submit", "counter"]

  connect() {
    this.updateState()
  }

  toggle(_event) {
    this.updateState()
  }

  toggleAll(event) {
    const checked = event.target.checked
    this.rowTargets.forEach((cb) => { cb.checked = checked })
    this.updateState()
  }

  updateState() {
    const selected = this.rowTargets.filter((cb) => cb.checked)
    if (this.hasSubmitTarget) {
      this.submitTarget.disabled = selected.length === 0
    }
    if (this.hasCounterTarget) {
      this.counterTarget.textContent = `${selected.length} selected`
    }
    if (this.hasSelectAllTarget && this.rowTargets.length > 0) {
      this.selectAllTarget.checked = selected.length === this.rowTargets.length
    }
  }
}

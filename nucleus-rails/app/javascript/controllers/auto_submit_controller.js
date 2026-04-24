import { Controller } from "@hotwired/stimulus"

// Submits the enclosing form when the input it's bound to fires an event.
// Used by the stage <select> in the lead detail panel so a choice commits
// immediately without a separate "Save" click.
export default class extends Controller {
  submit() {
    const form = this.element.tagName === "FORM" ? this.element : this.element.closest("form")
    if (!form) return
    if (form.requestSubmit) form.requestSubmit()
    else form.submit()
  }
}

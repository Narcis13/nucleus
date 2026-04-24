import { Controller } from "@hotwired/stimulus"

// Attached to a <dialog>. Opens on connect if open-value is true (covers
// the Turbo-frame modal pattern: server renders <dialog data-modal-open="true">
// into a frame and the controller fires showModal on insertion).
//
// Opened externally via: data-action="modal#open" data-modal-id-param="id"
export default class extends Controller {
  static values = { open: Boolean }

  connect() {
    if (this.openValue) this.element.showModal()
  }

  open(event) {
    const id = event?.params?.id
    const target = id ? document.getElementById(id) : this.element
    target?.showModal?.()
  }

  close() {
    this.element.close?.()
  }
}

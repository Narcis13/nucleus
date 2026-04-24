import { Controller } from "@hotwired/stimulus"

// Auto-dismisses the toast after `dismissAfterValue` ms. Set to 0 to keep
// it open until the user clicks the close button.
export default class extends Controller {
  static values = { dismissAfter: { type: Number, default: 5000 } }

  connect() {
    if (this.dismissAfterValue > 0) {
      this.timeout = setTimeout(() => this.dismiss(), this.dismissAfterValue)
    }
  }

  disconnect() {
    if (this.timeout) clearTimeout(this.timeout)
  }

  dismiss() {
    this.element.remove()
  }
}

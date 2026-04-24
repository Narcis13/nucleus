import { Controller } from "@hotwired/stimulus"

// Slide-over lead detail panel. Present for future keyboard shortcut /
// scroll-lock wiring; the current close flow is handled by frame-targeted
// navigation on the backdrop and × link. Exists so the `data-controller`
// attribute on the panel has something to resolve against.
export default class extends Controller {
}

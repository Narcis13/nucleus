import { Controller } from "@hotwired/stimulus"

// Controls the `dark` class on <html>. Persists preference in localStorage
// so the page-load script in the layout can apply it before paint.
export default class extends Controller {
  static values = { storageKey: { type: String, default: "nucleus.theme" } }

  toggle() {
    const root = document.documentElement
    const next = root.classList.contains("dark") ? "light" : "dark"
    root.classList.toggle("dark", next === "dark")
    try { localStorage.setItem(this.storageKeyValue, next) } catch (_) {}
  }
}

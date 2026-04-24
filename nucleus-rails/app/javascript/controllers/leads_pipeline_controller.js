import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

// Leads Kanban. Every column is a Sortable list in the "leads" group so
// cards drag between columns; stage headers are their own Sortable for
// left-to-right column reordering.
//
// On card drop: POST /leads/:id/move { stage_id }. The server returns a
// Turbo Stream replacing the card (keeps attribute parity with other tabs
// that see the same broadcast).
// On column drop: POST /lead_stages/reorder { ordered_ids[] }.
export default class extends Controller {
  static targets = ["board", "column", "stage", "stageHandle", "card",
                    "quickAdd", "lostForm", "count"]
  static values  = {
    moveUrlTemplate: String,
    reorderUrl: String
  }

  connect() {
    this.cardSortables = this.columnTargets.map(col =>
      Sortable.create(col, {
        group: "leads",
        animation: 150,
        ghostClass: "opacity-40",
        draggable: "[data-leads-pipeline-target='card']",
        onEnd: (e) => this.onCardEnd(e)
      })
    )

    if (this.hasBoardTarget) {
      this.stageSortable = Sortable.create(this.boardTarget, {
        animation: 150,
        handle: "[data-leads-pipeline-target='stageHandle']",
        draggable: "[data-leads-pipeline-target='stage']",
        ghostClass: "opacity-40",
        onEnd: () => this.onStageEnd()
      })
    }
  }

  disconnect() {
    this.cardSortables?.forEach(s => s.destroy())
    this.cardSortables = null
    this.stageSortable?.destroy()
    this.stageSortable = null
  }

  onCardEnd(event) {
    const leadId  = event.item?.dataset?.leadId
    const stageId = event.to?.dataset?.stageId
    const fromStageId = event.from?.dataset?.stageId
    if (!leadId || !stageId) return

    // Update the card's stage-id so a rapid re-drag doesn't post stale state.
    event.item.dataset.stageId = stageId
    this.updateCounts()

    if (stageId === fromStageId) return

    const url = this.moveUrlTemplateValue.replace("__ID__", leadId)
    const token = document.querySelector('meta[name="csrf-token"]')?.content

    fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/vnd.turbo-stream.html",
        "X-CSRF-Token": token || ""
      },
      body: JSON.stringify({ stage_id: stageId })
    }).then(async (resp) => {
      if (!resp.ok) throw new Error("move failed")
      const html = await resp.text()
      if (html) window.Turbo?.renderStreamMessage?.(html)
    }).catch(() => {
      // Roll back: put the card back where it came from.
      const fromCol = this.columnTargets.find(c => c.dataset.stageId === fromStageId)
      if (fromCol) fromCol.appendChild(event.item)
      event.item.dataset.stageId = fromStageId
      this.updateCounts()
    })
  }

  onStageEnd() {
    const orderedIds = this.stageTargets.map(s => s.dataset.stageId)
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

  openStageManager() {
    document.getElementById("stage_manager")?.showModal?.()
  }

  toggleQuickAdd(event) {
    const stageId = event.currentTarget.dataset.stageId
    this.quickAddTargets.forEach(el => {
      if (el.dataset.stageId === stageId) {
        el.classList.toggle("hidden")
        el.classList.toggle("flex")
        el.querySelector("input[name='lead[full_name]']")?.focus()
      } else {
        el.classList.add("hidden")
        el.classList.remove("flex")
      }
    })
  }

  closeQuickAdd(event) {
    const form = event?.target?.closest?.("[data-leads-pipeline-target='quickAdd']") ||
                 this.quickAddTargets[0]
    form?.classList?.add?.("hidden")
    form?.classList?.remove?.("flex")
    form?.querySelector?.("form")?.reset?.()
  }

  resetForm(event) {
    event?.target?.reset?.()
  }

  toggleLostForm() {
    this.lostFormTarget?.classList?.toggle?.("hidden")
    this.lostFormTarget?.classList?.toggle?.("flex")
  }

  updateCounts() {
    this.countTargets?.forEach?.(_ => {})
    this.columnTargets.forEach(col => {
      const stageEl = col.closest("[data-leads-pipeline-target='stage']")
      const count = col.querySelectorAll("[data-leads-pipeline-target='card']").length
      const countEl = stageEl?.querySelector("[data-leads-pipeline-target='count']")
      if (countEl) countEl.textContent = count
    })
  }
}

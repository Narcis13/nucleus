"use client"

import { Download, FileText, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

// Data shape the analytics page passes to the export buttons. Flattened to the
// minimum needed for CSV export so we can serialize without re-fetching.
export type AnalyticsExportPayload = {
  rangeLabel: string
  kpis: Array<{ label: string; value: string }>
  clientsOverTime: Array<{ date: string; count: number }>
  revenueOverTime: Array<{
    date: string
    invoiced: number
    collected: number
  }>
  leadFunnel: Array<{ stage: string; count: number }>
  appointmentsByType: Array<{ type: string; count: number }>
  clientsBySource: Array<{ source: string; count: number }>
}

export function ExportButtons({ payload }: { payload: AnalyticsExportPayload }) {
  function downloadCsv() {
    const csv = buildCsv(payload)
    downloadBlob(csv, `analytics-${payload.rangeLabel}.csv`, "text/csv")
  }
  function printAsPdf() {
    // Browser's native print → save-as-PDF dialog. The analytics page adds a
    // `print:*` stylesheet pass so the layout collapses nicely for print.
    window.print()
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={downloadCsv}>
        <Download /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={printAsPdf}>
        <FileText /> PDF
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={printAsPdf}
        aria-label="Print analytics report"
      >
        <Printer />
      </Button>
    </div>
  )
}

function buildCsv(p: AnalyticsExportPayload): string {
  const sections: Array<[string, string[][]]> = [
    ["Key metrics", [["Label", "Value"], ...p.kpis.map((k) => [k.label, k.value])]],
    [
      "Clients over time",
      [["Date", "New clients"], ...p.clientsOverTime.map((r) => [r.date, String(r.count)])],
    ],
    [
      "Revenue over time",
      [
        ["Date", "Invoiced", "Collected"],
        ...p.revenueOverTime.map((r) => [
          r.date,
          r.invoiced.toFixed(2),
          r.collected.toFixed(2),
        ]),
      ],
    ],
    [
      "Lead funnel",
      [["Stage", "Count"], ...p.leadFunnel.map((r) => [r.stage, String(r.count)])],
    ],
    [
      "Appointments by type",
      [["Type", "Count"], ...p.appointmentsByType.map((r) => [r.type, String(r.count)])],
    ],
    [
      "Clients by source",
      [
        ["Source", "Count"],
        ...p.clientsBySource.map((r) => [r.source, String(r.count)]),
      ],
    ],
  ]
  return sections
    .map(([title, rows]) =>
      [`# ${title}`, ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n"),
    )
    .join("\n\n")
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function downloadBlob(contents: string, filename: string, mime: string) {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

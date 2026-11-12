"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Table as TableIcon } from "lucide-react";
import type { ExportFormat } from "@/types/reports";

interface ReportExportButtonProps {
  reportType: string;
  title: string;
  data: Record<string, unknown>[];
  className?: string;
}

const FORMATS: { key: ExportFormat; label: string; Icon: typeof FileText; mime: string; ext: string }[] = [
  { key: "csv", label: "CSV", Icon: TableIcon, mime: "text/csv;charset=utf-8", ext: "csv" },
  { key: "xlsx", label: "Excel", Icon: FileSpreadsheet, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" },
];

export function ReportExportButton({ reportType, title, data, className = "" }: ReportExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: ExportFormat) {
    if (data.length === 0) return;
    setExporting(true);
    setOpen(false);

    try {
      if (format === "csv") {
        exportCSV(title, data);
      } else if (format === "xlsx") {
        // XLSX requires exceljs — dynamic import to avoid SSR issues
        await exportXLSX(title, data);
      }
      // PDF would use @react-pdf/renderer in a future iteration
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={exporting || data.length === 0}
        className="flex items-center gap-2 rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-dark shadow-sm transition-colors hover:bg-nexora-bg-secondary disabled:opacity-50"
      >
        <Download className="h-4 w-4 text-nexora-text-secondary" />
        <span>{exporting ? "Exportando…" : "Exportar"}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-nexora-border bg-white p-1.5 shadow-lg">
            <p className="mb-1 px-2 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wide">Formato</p>
            {FORMATS.map((fmt) => (
              <button
                key={fmt.key}
                type="button"
                onClick={() => handleExport(fmt.key)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-nexora-dark transition-colors hover:bg-nexora-bg-secondary"
              >
                <fmt.Icon className="h-4 w-4 text-nexora-text-secondary" />
                {fmt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(";") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(";")
    ),
  ].join("\r\n");

  const BOM = "﻿";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFilename(filename)}.csv`);
}

// ---------------------------------------------------------------------------
// XLSX Export (dynamic import of exceljs)
// ---------------------------------------------------------------------------

async function exportXLSX(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Relatório");

    const headers = Object.keys(rows[0]);
    sheet.addRow(headers);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };

    for (const row of rows) {
      sheet.addRow(headers.map((h) => row[h] ?? null));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `${sanitizeFilename(filename)}.xlsx`);
  } catch (err) {
    console.error("XLSX export failed:", err);
    // Fallback to CSV if exceljs is not available
    exportCSV(filename, rows);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();
}
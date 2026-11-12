"use client";

import { useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import type { DatePreset, DateRange } from "@/types/reports";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "last_7_days", label: "Últimos 7 dias" },
  { key: "last_30_days", label: "Últimos 30 dias" },
  { key: "this_week", label: "Esta semana" },
  { key: "last_week", label: "Semana passada" },
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês passado" },
  { key: "this_quarter", label: "Este trimestre" },
  { key: "this_year", label: "Este ano" },
  { key: "last_year", label: "Ano passado" },
];

interface ReportDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function ReportDateFilter({ value, onChange, className = "" }: ReportDateFilterProps) {
  const [open, setOpen] = useState(false);

  const activeLabel =
    PRESETS.find((p) => p.key === value.preset)?.label ??
    `${formatBR(value.from)} — ${formatBR(value.to)}`;

  function handlePreset(key: DatePreset) {
    const now = new Date();
    const today = toDateStr(now);
    let from = today;
    let to = today;

    switch (key) {
      case "today":
        break;
      case "yesterday": {
        const d = new Date(now.getTime() - 86400000);
        from = to = toDateStr(d);
        break;
      }
      case "last_7_days": {
        from = toDateStr(new Date(now.getTime() - 6 * 86400000));
        break;
      }
      case "last_30_days": {
        from = toDateStr(new Date(now.getTime() - 29 * 86400000));
        break;
      }
      case "this_week": {
        const day = now.getDay();
        const mondayOffset = day === 0 ? 6 : day - 1;
        from = toDateStr(new Date(now.getTime() - mondayOffset * 86400000));
        break;
      }
      case "last_week": {
        const day = now.getDay();
        const mondayOffset = day === 0 ? 6 : day - 1;
        const lastMonday = new Date(now.getTime() - (mondayOffset + 7) * 86400000);
        const lastSunday = new Date(lastMonday.getTime() + 6 * 86400000);
        from = toDateStr(lastMonday);
        to = toDateStr(lastSunday);
        break;
      }
      case "this_month": {
        from = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
        break;
      }
      case "last_month": {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        from = toDateStr(first);
        to = toDateStr(last);
        break;
      }
      case "this_quarter": {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        from = toDateStr(new Date(now.getFullYear(), qMonth, 1));
        break;
      }
      case "this_year": {
        from = toDateStr(new Date(now.getFullYear(), 0, 1));
        break;
      }
      case "last_year": {
        from = toDateStr(new Date(now.getFullYear() - 1, 0, 1));
        to = toDateStr(new Date(now.getFullYear() - 1, 11, 31));
        break;
      }
      default:
        return;
    }

    onChange({ from, to, preset: key });
    setOpen(false);
  }

  function handleCustomChange(field: "from" | "to", val: string) {
    onChange({ ...value, [field]: val, preset: "custom" });
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-nexora-border bg-white px-3 py-2 text-sm font-medium text-nexora-dark shadow-sm transition-colors hover:bg-nexora-bg-secondary"
      >
        <Calendar className="h-4 w-4 text-nexora-text-secondary" />
        <span className="max-w-[180px] truncate">{activeLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-nexora-text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-nexora-border bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-nexora-text-secondary uppercase tracking-wide">Período</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-0.5 text-nexora-text-secondary hover:bg-nexora-bg-secondary">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePreset(preset.key)}
                  className={`rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                    value.preset === preset.key
                      ? "bg-nexora-blue text-white"
                      : "text-nexora-dark hover:bg-nexora-bg-secondary"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-3 border-t border-nexora-border pt-3">
              <p className="mb-1.5 text-xs font-semibold text-nexora-text-secondary uppercase tracking-wide">Personalizado</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={value.from}
                  max={value.to}
                  onChange={(e) => handleCustomChange("from", e.target.value)}
                  className="w-full rounded-md border border-nexora-border px-2 py-1.5 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                />
                <span className="text-xs text-nexora-text-secondary">até</span>
                <input
                  type="date"
                  value={value.to}
                  min={value.from}
                  onChange={(e) => handleCustomChange("to", e.target.value)}
                  className="w-full rounded-md border border-nexora-border px-2 py-1.5 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
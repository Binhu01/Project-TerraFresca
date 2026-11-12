"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Filter,
  MoreHorizontal,
  Calendar,
  DollarSign,
  User,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import {
  getLeads,
  getLeadsByStage,
  getPipelineAndStages,
  moveLeadStage,
} from "./actions";
import type { LeadWithStage, PipelineStage, Pipeline } from "@/types/crm";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function isOverdue(expectedReturnAt: string | null, status: string): boolean {
  if (!expectedReturnAt || status !== "open") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const returnDate = new Date(expectedReturnAt);
  returnDate.setHours(0, 0, 0, 0);
  return returnDate < today;
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function ListSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-32 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-24 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-16 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-20 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-28 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-24 animate-pulse rounded bg-nexora-border" />
          <div className="h-4 w-16 animate-pulse rounded bg-nexora-border" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-nexora-border" />
        </div>
      ))}
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[280px] flex-shrink-0 space-y-3 rounded-xl border border-nexora-border bg-nexora-bg-secondary/30 p-3"
        >
          <div className="h-5 w-24 animate-pulse rounded bg-nexora-border" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div
              key={j}
              className="h-24 rounded-lg border border-nexora-border bg-white p-3"
            >
              <div className="h-4 w-3/4 animate-pulse rounded bg-nexora-border" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-nexora-border" />
              <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-nexora-border" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source badge helper
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  website: "bg-blue-50 text-blue-700",
  indicacao: "bg-emerald-50 text-emerald-700",
  "redes-sociais": "bg-purple-50 text-purple-700",
  email: "bg-amber-50 text-amber-700",
  telefone: "bg-cyan-50 text-cyan-700",
  evento: "bg-rose-50 text-rose-700",
};

function sourceBadge(source: string | null) {
  if (!source) return <span className="text-nexora-text-secondary">—</span>;
  const colorClass =
    SOURCE_COLORS[source.toLowerCase()] ?? "bg-gray-50 text-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {source}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function LeadsPage() {
  // View mode
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [viewModeLoaded, setViewModeLoaded] = useState(false);

  // Data
  const [leads, setLeads] = useState<LeadWithStage[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Persist view mode
  useEffect(() => {
    const stored = localStorage.getItem("nexora_leads_view_mode");
    if (stored === "list" || stored === "kanban") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrating persisted view mode from localStorage on mount
      setViewMode(stored);
    }
    setViewModeLoaded(true);
  }, []);

  useEffect(() => {
    if (viewModeLoaded) {
      localStorage.setItem("nexora_leads_view_mode", viewMode);
    }
  }, [viewMode, viewModeLoaded]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pipelineData = await getPipelineAndStages();
      setPipeline(pipelineData.pipeline);
      setStages(pipelineData.stages);

      if (viewMode === "kanban") {
        const grouped = await getLeadsByStage(pipelineData.pipeline.id);
        const allLeads = grouped.flatMap((g) => g.leads);
        setLeads(allLeads);
      } else {
        const result = await getLeads({
          search: search || undefined,
          source: sourceFilter || undefined,
          status: statusFilter || undefined,
          pageSize: 100,
        });
        setLeads(result.leads);
      }
    } catch {
      // Silently handle errors — empty state will show
    } finally {
      setLoading(false);
    }
  }, [viewMode, search, sourceFilter, statusFilter]);

  useEffect(() => {
    if (viewModeLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard async data-fetching pattern gated on hydration flag
      fetchData();
    }
  }, [fetchData, viewModeLoaded]);

  // Stage change handler
  const handleStageChange = async (leadId: string, newStageId: string) => {
    const result = await moveLeadStage(leadId, newStageId);
    if ("success" in result) {
      fetchData();
    }
  };

  // Unique sources for filter dropdown
  const uniqueSources = Array.from(
    new Set(leads.map((l) => l.source).filter(Boolean))
  ).sort();

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setSourceFilter("");
    setStatusFilter("");
  };

  const hasActiveFilters = search || sourceFilter || statusFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-nexora-dark">
            Leads
          </h1>
          <p className="mt-1 text-sm text-nexora-text-secondary">
            Gerencie seu funil de vendas
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-nexora-border bg-white p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-nexora-bg-secondary text-nexora-dark"
                  : "text-nexora-text-secondary hover:text-nexora-dark"
              }`}
            >
              <ListIcon className="h-4 w-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "kanban"
                  ? "bg-nexora-bg-secondary text-nexora-dark"
                  : "text-nexora-text-secondary hover:text-nexora-dark"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
          </div>

          <Link
            href="/dashboard/leads/novo"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-nexora-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nexora-blue/90"
          >
            <Plus className="h-4 w-4" />
            Novo lead
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-nexora-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexora-text-secondary" />
            <input
              type="text"
              placeholder="Buscar por nome, empresa ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-nexora-border bg-nexora-bg-secondary py-2 pl-9 pr-3 text-sm text-nexora-dark placeholder:text-nexora-text-secondary focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
            />
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          >
            <option value="">Todas as origens</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s!}>
                {s}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-nexora-border bg-nexora-bg-secondary px-3 py-2 text-sm text-nexora-dark focus:border-nexora-blue focus:outline-none focus:ring-1 focus:ring-nexora-blue"
          >
            <option value="">Todos os status</option>
            <option value="open">Abertos</option>
            <option value="won">Ganhos</option>
            <option value="lost">Perdidos</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nexora-border px-3 py-2 text-sm font-medium text-nexora-text-secondary hover:bg-nexora-bg-secondary hover:text-nexora-dark"
            >
              <Filter className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        viewMode === "list" ? (
          <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
            <ListSkeleton />
          </div>
        ) : (
          <KanbanSkeleton />
        )
      ) : viewMode === "list" ? (
        /* LIST VIEW */
        <div className="overflow-hidden rounded-xl border border-nexora-border bg-white shadow-sm">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nexora-bg-secondary text-nexora-text-secondary">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-nexora-dark">
                Nenhum lead encontrado
              </h3>
              <p className="mt-1 max-w-xs text-sm text-nexora-text-secondary">
                {hasActiveFilters
                  ? "Tente ajustar os filtros ou buscar por outro termo."
                  : "Comece adicionando seu primeiro lead."}
              </p>
              {!hasActiveFilters && (
                <Link
                  href="/dashboard/leads/novo"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-nexora-blue px-4 py-2 text-sm font-medium text-white hover:bg-nexora-blue/90"
                >
                  <Plus className="h-4 w-4" />
                  Novo lead
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-nexora-border bg-nexora-bg-secondary">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                      Nome
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                      Empresa
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                      Origem
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                      Etapa
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                      Valor Estimado
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                      Retorno
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-nexora-text-secondary">
                      Responsavel
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-nexora-text-secondary">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexora-border">
                  {leads.map((lead) => {
                    const overdue = isOverdue(lead.expected_return_at, lead.status);
                    return (
                      <tr
                        key={lead.id}
                        className="transition-colors hover:bg-nexora-bg-secondary/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-nexora-dark">
                          {lead.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-nexora-text">
                          {lead.company_name || (
                            <span className="text-nexora-text-secondary">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {sourceBadge(lead.source)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-nexora-bg-secondary px-2 py-0.5 text-xs font-medium text-nexora-dark">
                            {lead.stage?.name ?? "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-nexora-text">
                          {lead.estimated_value != null
                            ? currencyFormatter.format(lead.estimated_value)
                            : (
                                <span className="text-nexora-text-secondary">—</span>
                              )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-nexora-text ${overdue ? "font-medium text-amber-600" : ""}`}
                            >
                              {formatDate(lead.expected_return_at)}
                            </span>
                            {overdue && (
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-nexora-text">
                          {lead.assigned_to ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-nexora-blue/10 text-xs font-medium text-nexora-blue">
                                <User className="h-3 w-3" />
                              </div>
                            </div>
                          ) : (
                            <span className="text-nexora-text-secondary">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="inline-flex items-center rounded-md p-1.5 text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-blue"
                            title="Ver detalhes"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.length === 0 ? (
            <div className="flex w-full flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nexora-bg-secondary text-nexora-text-secondary">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-nexora-dark">
                Nenhuma etapa configurada
              </h3>
              <p className="mt-1 max-w-xs text-sm text-nexora-text-secondary">
                Configure o pipeline para visualizar o Kanban.
              </p>
            </div>
          ) : (
            stages.map((stage) => {
              const stageLeads = leads.filter((l) => l.stage_id === stage.id);
              const isWon = stage.is_won;
              const isLost = stage.is_lost;

              let columnBg = "bg-nexora-bg-secondary/30";
              if (isWon) columnBg = "bg-green-50";
              if (isLost) columnBg = "bg-red-50";

              return (
                <div
                  key={stage.id}
                  className={`min-w-[300px] max-w-[340px] flex-shrink-0 rounded-xl border border-nexora-border p-3 ${columnBg}`}
                >
                  {/* Column Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold text-nexora-dark">
                      {stage.name}
                    </h3>
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-nexora-bg-secondary px-1.5 text-xs font-medium text-nexora-text-secondary">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2.5">
                    {stageLeads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-nexora-border py-8 text-center">
                        <p className="text-xs text-nexora-text-secondary">
                          Nenhum lead
                        </p>
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const overdue = isOverdue(
                          lead.expected_return_at,
                          lead.status
                        );
                        return (
                          <KanbanCard
                            key={lead.id}
                            lead={lead}
                            stages={stages}
                            overdue={overdue}
                            onStageChange={handleStageChange}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban Card Sub-component
// ---------------------------------------------------------------------------

function KanbanCard({
  lead,
  stages,
  overdue,
  onStageChange,
}: {
  lead: LeadWithStage;
  stages: PipelineStage[];
  overdue: boolean;
  onStageChange: (leadId: string, newStageId: string) => void;
}) {
  const [showStageSelect, setShowStageSelect] = useState(false);

  return (
    <div className="group relative rounded-lg border border-nexora-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      {/* Card link overlay */}
      <Link
        href={`/dashboard/leads/${lead.id}`}
        className="absolute inset-0 z-10 rounded-lg"
        aria-label={`Ver ${lead.name}`}
      />

      {/* Name + Company */}
      <div className="relative z-20 pointer-events-none">
        <p className="font-medium text-nexora-dark leading-tight">{lead.name}</p>
        {lead.company_name && (
          <p className="mt-0.5 text-xs text-nexora-text-secondary">
            {lead.company_name}
          </p>
        )}
      </div>

      {/* Badges row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {sourceBadge(lead.source)}
        {overdue && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <AlertCircle className="h-3 w-3" />
            Atrasado
          </span>
        )}
      </div>

      {/* Value + Return date */}
      <div className="mt-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-nexora-text">
          <DollarSign className="h-3 w-3 text-nexora-text-secondary" />
          {lead.estimated_value != null
            ? currencyFormatter.format(lead.estimated_value)
            : "—"}
        </div>
        {lead.expected_return_at && (
          <div
            className={`flex items-center gap-1 ${overdue ? "font-medium text-amber-600" : "text-nexora-text-secondary"}`}
          >
            <Calendar className="h-3 w-3" />
            {formatDate(lead.expected_return_at)}
          </div>
        )}
      </div>

      {/* Footer: assignee + stage selector */}
      <div className="mt-3 flex items-center justify-between border-t border-nexora-border pt-2">
        {/* Assignee avatar */}
        <div className="flex items-center gap-1.5">
          {lead.assigned_to ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-nexora-blue/10 text-xs font-medium text-nexora-blue">
              <User className="h-3 w-3" />
            </div>
          ) : (
            <span className="text-xs text-nexora-text-secondary">
              Sem responsavel
            </span>
          )}
        </div>

        {/* Stage change dropdown */}
        <div className="relative z-30">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowStageSelect(!showStageSelect);
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-nexora-text-secondary transition-colors hover:bg-nexora-bg-secondary hover:text-nexora-dark"
          >
            Mover
            <ChevronDown className="h-3 w-3" />
          </button>

          {showStageSelect && (
            <>
              {/* Backdrop to close */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowStageSelect(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-nexora-border bg-white py-1 shadow-lg">
                {stages
                  .filter((s) => s.id !== lead.stage_id)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onStageChange(lead.id, s.id);
                        setShowStageSelect(false);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-nexora-dark hover:bg-nexora-bg-secondary"
                    >
                      {s.name}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import { headers } from "next/headers";
import Link from "next/link";
import {
  ShoppingCart,
  Users,
  Package,
  Truck,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { getPurchasesDashboard } from "./actions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  approved: { label: "Aprovada", color: "bg-blue-100 text-blue-700" },
  sent: { label: "Enviada", color: "bg-indigo-100 text-indigo-700" },
  partially_received: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
  received: { label: "Recebida", color: "bg-green-100 text-green-700" },
  partially_cancelled: { label: "Parc. cancelada", color: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default async function ComprasPage() {
  await headers();

  const stats = await getPurchasesDashboard();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-nexora-dark">Compras</h1>
        <p className="mt-1 text-sm text-nexora-text-secondary">
          Visão geral de fornecedores, ordens de compra e recebimentos · Últimos 30 dias
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexora-blue/10">
              <Users className="h-5 w-5 text-nexora-blue" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">Fornecedores ativos</p>
              <p className="text-xl font-bold text-nexora-dark">{stats.activeSuppliers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <ShoppingCart className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">Ordens no período</p>
              <p className="text-xl font-bold text-nexora-dark">{stats.totalOrdersInPeriod}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-nexora-text-secondary">{stats.ordersInProgress} em andamento</span>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">Total em compras</p>
              <p className="text-xl font-bold text-nexora-dark">{brl.format(stats.totalPurchaseAmount)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-nexora-text-secondary">
              A pagar: {brl.format(stats.payablesFromPurchases)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Truck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-nexora-text-secondary">Aguardando recebimento</p>
              <p className="text-xl font-bold text-nexora-dark">{stats.ordersAwaitingReceipt}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-nexora-text-secondary">
              {stats.partiallyReceivedOrders} parciais
            </span>
            {stats.lateDeliveries > 0 && (
              <span className="flex items-center gap-0.5 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {stats.lateDeliveries} atrasadas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Secondary KPIs Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-nexora-dark">{stats.completedOrders}</p>
          <p className="text-xs text-nexora-text-secondary">Concluídas no período</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{stats.partiallyReceivedOrders}</p>
          <p className="text-xs text-nexora-text-secondary">Parcialmente recebidas</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className={`text-2xl font-bold ${stats.lateDeliveries > 0 ? "text-red-600" : "text-nexora-dark"}`}>
            {stats.lateDeliveries}
          </p>
          <p className="text-xs text-nexora-text-secondary">Entregas atrasadas</p>
        </div>
        <div className="rounded-xl border border-nexora-border bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-nexora-dark">{stats.topSuppliers.length}</p>
          <p className="text-xs text-nexora-text-secondary">Fornecedores utilizados</p>
        </div>
      </div>

      {/* Recent Orders + Upcoming Receipts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-nexora-dark">Ordens recentes</h2>
            <Link href="/dashboard/compras/ordens" className="text-sm font-medium text-nexora-blue hover:underline">
              Ver todas
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <ShoppingCart className="mb-3 h-10 w-10 text-nexora-text-secondary/40" />
              <p className="text-sm text-nexora-text-secondary">Nenhuma ordem de compra registrada</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {stats.recentOrders.map((order) => {
                const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.draft;
                return (
                  <Link
                    key={order.id}
                    href={`/dashboard/compras/ordens/${order.id}`}
                    className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3 transition-colors hover:bg-nexora-bg-secondary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-nexora-dark">{order.purchaseNumber}</p>
                      <p className="truncate text-xs text-nexora-text-secondary">
                        {order.supplierName} · {new Date(order.issueDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <p className="text-sm font-semibold text-nexora-dark">{brl.format(order.totalAmount)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Receipts */}
        <div className="space-y-6">
          <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-nexora-dark">Próximos recebimentos</h2>
              <Link href="/dashboard/compras/ordens" className="text-sm font-medium text-nexora-blue hover:underline">
                Ver ordens
              </Link>
            </div>
            {stats.upcomingReceipts.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center text-center">
                <Clock className="mb-3 h-8 w-8 text-nexora-text-secondary/40" />
                <p className="text-sm text-nexora-text-secondary">Sem recebimentos previstos</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {stats.upcomingReceipts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-nexora-dark">{item.purchaseNumber}</p>
                      <p className="text-xs text-nexora-text-secondary">
                        {item.supplierName} · Previsto: {new Date(item.expectedDeliveryDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-nexora-dark">{brl.format(item.totalAmount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Suppliers Mini */}
          {stats.topSuppliers.length > 0 && (
            <div className="rounded-xl border border-nexora-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-nexora-blue" />
                <h2 className="font-display text-lg font-semibold text-nexora-dark">Top fornecedores</h2>
              </div>
              <div className="mt-3 space-y-2">
                {stats.topSuppliers.map((supplier, i) => (
                  <div key={supplier.supplierId} className="flex items-center justify-between rounded-lg border border-nexora-border/50 p-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nexora-blue/10 text-xs font-bold text-nexora-blue">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-nexora-dark">{supplier.supplierName}</p>
                        <p className="text-xs text-nexora-text-secondary">{supplier.orderCount} ordens</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-nexora-dark">{brl.format(supplier.totalAmount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="font-display text-lg font-semibold text-nexora-dark">Módulo de compras</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { label: "Fornecedores", href: "/dashboard/compras/fornecedores", icon: Users, description: "Cadastro, contatos e endereços" },
            { label: "Ordens de compra", href: "/dashboard/compras/ordens", icon: ShoppingCart, description: "Criar, aprovar e acompanhar" },
            { label: "Recebimentos", href: "/dashboard/compras/recebimentos", icon: Package, description: "Registrar entradas e divergências" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-4 rounded-xl border border-nexora-border bg-white p-5 shadow-sm transition-all hover:border-nexora-blue/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexora-blue/10 transition-colors group-hover:bg-nexora-blue group-hover:text-white">
                <link.icon className="h-5 w-5 text-nexora-blue transition-colors group-hover:text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-semibold text-nexora-dark">{link.label}</h3>
                <p className="mt-1 text-sm text-nexora-text-secondary">{link.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-nexora-text-secondary/40 transition-transform group-hover:translate-x-1 group-hover:text-nexora-blue" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
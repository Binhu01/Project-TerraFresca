import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  change?: number | null;
  changeLabel?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  subtitle?: string;
}

export function KPICard({
  label,
  value,
  change,
  changeLabel,
  icon,
  accentColor = "bg-nexora-blue/10 text-nexora-blue",
  subtitle,
}: KPICardProps) {
  const hasChange = change !== undefined && change !== null;
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-nexora-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentColor}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-nexora-text-secondary">{label}</p>
          <p className="truncate text-xl font-bold text-nexora-dark">{value}</p>
        </div>
      </div>

      {(hasChange || subtitle) && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          {subtitle && (
            <span className="text-nexora-text-secondary">{subtitle}</span>
          )}
          {hasChange && (
            <span
              className={`flex items-center gap-0.5 ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? "+" : ""}
              {change.toFixed(1)}%
              {changeLabel && (
                <span className="ml-1 text-nexora-text-secondary">
                  vs {changeLabel}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
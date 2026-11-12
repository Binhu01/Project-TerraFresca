import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: ShieldCheck },
  { label: "Organizações", href: "/admin/organizacoes", icon: Users },
  { label: "Planos", href: "/admin/planos", icon: CreditCard },
  { label: "Suporte", href: "/admin/suporte", icon: MessageSquare },
  { label: "Audit Log", href: "/admin/audit", icon: ShieldCheck },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("platform_admins")
    .select("id, internal_role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[#E4E9F2] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-[#3563F5]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao app
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-[#0B1220]">
              Nexora Admin
            </span>
            <span className="rounded-full bg-[#3563F5]/10 px-2.5 py-0.5 text-xs font-medium text-[#3563F5]">
              {admin.internal_role.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Navigation tabs */}
        <nav className="mb-8 flex flex-wrap gap-1 rounded-xl border border-[#E4E9F2] bg-white p-1 shadow-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#0B1220] data-[active]:bg-[#3563F5] data-[active]:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
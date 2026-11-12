import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import { DashboardShell } from "./shell";

// Allow blocking render for session-dependent routes under /dashboard
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeData = await getActiveOrganization();

  if (!activeData) redirect("/dashboard/onboarding");

  // Get profile for header display
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: profile?.full_name ?? null,
        email: user.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
      }}
      activeOrg={{
        id: activeData.org.id,
        name: activeData.org.name,
        slug: activeData.org.slug,
        role: activeData.org.membership.role,
      }}
      allOrgs={activeData.allOrgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      }))}
    >
      {children}
    </DashboardShell>
  );
}
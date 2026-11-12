import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string }>) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that do not require authentication
  const publicPaths = ["/planos", "/contato", "/sobre", "/privacidade"];
  const isPublicRoute = publicPaths.some((p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + "/"));

  // Redirect unauthenticated users away from protected routes (/dashboard and /admin)
  if (!user && !isPublicRoute && (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect non-admin users away from /admin routes
  if (user && request.nextUrl.pathname.startsWith("/admin")) {
    const { data: admin } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (!admin || admin.length === 0) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/cadastro")
  ) {
    // Check if user has any organizations
    const { data: memberships } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const hasOrg = memberships && memberships.length > 0;

    const url = request.nextUrl.clone();
    url.pathname = hasOrg ? "/dashboard" : "/dashboard/onboarding";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users without orgs to onboarding
  if (
    user &&
    request.nextUrl.pathname.startsWith("/dashboard") &&
    request.nextUrl.pathname !== "/dashboard/onboarding"
  ) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (!memberships || memberships.length === 0) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/onboarding";
      return NextResponse.redirect(url);
    }
  }

  // Redirect users with orgs away from onboarding
  if (user && request.nextUrl.pathname === "/dashboard/onboarding") {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Only same-site, absolute paths are allowed as a post-login destination. */
function safeNext(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  const publicPaths = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/invite",
    "/auth",
    "/offline",
  ];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next ?? "/dashboard", request.url));
  }
  return supabaseResponse;
}

export const config = {
  // `api` is excluded so route handlers (cron, auth callback) are not redirected
  // to /login — they authenticate themselves. Static assets stay excluded too.
  // `robots.txt` must stay crawlable: it is static metadata, and redirecting it
  // to /login made the crawl directives invisible to search engines.
  matcher: [
    "/((?!api|serwist|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};

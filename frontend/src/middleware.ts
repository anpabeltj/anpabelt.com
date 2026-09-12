import { defineMiddleware } from "astro:middleware";
import { getUserFromCookies } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const user = getUserFromCookies(context.cookies);
  context.locals.user = user;

  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = pathname === "/admin/login";
  const isProtectedAction =
    pathname.startsWith("/actions/") &&
    !pathname.startsWith("/actions/auth/login") &&
    !pathname.startsWith("/actions/contact");

  if (isAdminPage && !isLogin && !user) {
    return context.redirect("/admin/login", 302);
  }

  if (isProtectedAction && !user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return next();
});

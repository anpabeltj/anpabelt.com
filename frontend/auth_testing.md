# Auth Testing (Astro + SQLite, JWT httpOnly cookie)

Admin is seeded from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
Default preview creds: `ann@anpabelt.com` / `anpabelt2025`.

IMPORTANT: endpoints live under `/actions/*` (NOT `/api/*`).

## Curl
```
# login (bad) -> 401
curl -s -X POST http://localhost:3000/actions/auth/login -H "Content-Type: application/json" -d '{"email":"ann@anpabelt.com","password":"wrong"}' -w "\n%{http_code}\n"

# login (ok) -> 200 + sets admin_session cookie
curl -s -c c.txt -X POST http://localhost:3000/actions/auth/login -H "Content-Type: application/json" -d '{"email":"ann@anpabelt.com","password":"anpabelt2025"}'

# authed admin page -> 200 ; unauthed -> 302 to /admin/login
curl -s -b c.txt -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin

# create post requires auth (401 without cookie)
curl -s -X POST http://localhost:3000/actions/posts -H "Content-Type: application/json" -d '{"title":"x"}' -o /dev/null -w "%{http_code}\n"
```

## Notes
- Password hashing: bcryptjs (`$2a$`/`$2b$` hash) in `users.password_hash`.
- Session: JWT (7d) in httpOnly, Secure, SameSite=Lax cookie `admin_session`.
- Middleware (`src/middleware.ts`) guards `/admin/*` (redirect) and `/actions/*` (401),
  allowing `/actions/auth/login` and `/actions/contact` through.

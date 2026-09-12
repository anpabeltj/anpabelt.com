# Test Credentials

## Admin (blog CMS)
- URL: `/admin/login`
- Email: `ann@anpabelt.com`
- Password: `anpabelt2025`
- Role: admin

Credentials are seeded from `/app/frontend/.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_NAME`) on server start. Changing them in `.env` updates the admin on next boot.

## Endpoints (note: this app uses `/actions/*`, NOT `/api/*`, because the preview
## ingress routes `/api` to a different port)
- POST `/actions/auth/login`  { email, password }  -> sets httpOnly `admin_session` cookie
- POST `/actions/auth/logout`
- POST `/actions/posts`            (auth) create post
- PUT  `/actions/posts/:id`        (auth) update post
- DELETE `/actions/posts/:id`      (auth) delete post
- POST `/actions/upload`           (auth) multipart image upload -> { asset.url }
- POST `/actions/contact`          (public) contact form
- GET  `/media/:filename`          (public) serve uploaded image

## Public routes
`/`, `/about`, `/projects`, `/blog`, `/blog/:slug`, `/contact`, `/sitemap.xml`, `/robots.txt`

## Admin routes (protected by middleware)
`/admin`, `/admin/posts/new`, `/admin/posts/:id/edit`, `/admin/preview/:id`, `/admin/media`

# E-Learning Platform (Minimal)

Run locally:

```bash
npm install
npm start
```

Notes:
- Authentication: registers/logins users, stores JWT in an HttpOnly cookie.
- Roles: `student`, `lecturer`, `admin` (admin can bypass role checks).
- Security: uses `helmet`, `express-rate-limit`, `xss-clean`, `express-validator`, and HttpOnly cookies. Set `JWT_SECRET` env var for production and run behind HTTPS.
- Pages: home, login, register, courses, course detail, lesson, dashboard.

Next recommended steps:
- Keep `NODE_ENV=production` in production so cookies are marked secure.
- Enable HTTPS/TLS in production and set secure cookie flags.
- Add tests and CI pipeline.

# Security Checklist

Review the file or feature named: $ARGUMENTS

Work through each item. Flag any that fail or need attention.

## API endpoints

- [ ] **Auth** — is the route behind `Auth.checkToken` + role check? Unauthenticated routes in `unauthenticated.js` must be intentional.
- [ ] **SQL injection** — no `req.query`/`req.params`/`req.body` interpolated into raw SQL strings. Use `replacements:` with `QueryTypes`.
- [ ] **Mass assignment** — `model.update(req.body)` is dangerous. Whitelist with `fields: [...]`.
- [ ] **Polymorphic type injection** — any `models[req.body.someType]` lookup must validate against an allowlist first.
- [ ] **Response leakage** — no `password`, `member_id`, `owner_id` in responses. Use `attributes: { exclude: this.exclude }` or destructure before sending.
- [ ] **Rate limiting** — login, signup, password reset, and any other unauthenticated write routes have `authLimiter` or `signupLimiter` applied.
- [ ] **SSRF** — any server-side fetch uses `ALLOWED_HOSTS` allowlist; `https:` protocol enforced.
- [ ] **Token expiry** — password reset tokens checked with `expires: { [Op.gt]: new Date() }`.
- [ ] **User enumeration** — error responses for missing users are identical to success responses (same status, same shape).

## Frontend

- [ ] **credentials: 'include'** — every `fetch` call (including `useGetQuery`, `usePostQuery`, `apiFetch`) sends cookies.
- [ ] **XSS** — no `dangerouslySetInnerHTML`. User content rendered via `react-markdown` or escaped components only.
- [ ] **Open redirect** — `navigate(from, { replace: true })` in Login only uses paths from `location.state.from.pathname` (router-set, not query params).
- [ ] **Auth guard** — private routes nested under `<PrivateRoute>` which checks `session.user` (not `session.token`).

## CORS / transport

- [ ] **CORS origin** — `ALLOWED_ORIGINS` env var set; no `*` with credentials.
- [ ] **Socket.io** — `origin` uses `[...ALLOWED_ORIGINS]`, not `"*"`.
- [ ] **Cookies** — `httpOnly: true`, `sameSite` from env, `secure: true` when sameSite=none.

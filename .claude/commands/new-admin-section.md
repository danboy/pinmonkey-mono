# New Admin Section

Scaffold a complete new admin section for the resource named: $ARGUMENTS

## API side (`api/`)

1. **Controller** — create `api/src/controllers/admin/$ARGUMENTS.js` extending `BaseController`. Bind any custom methods in the constructor. Use `models` from `../models/index.js`. Exclude sensitive fields.

2. **Route** — add to `api/src/routes/admin.js`:
   ```js
   router.route("/$ARGUMENTS").get(ctrlrs.AdminResource.index);
   router.route("/$ARGUMENTS/:id").get(ctrlrs.AdminResource.show).put(ctrlrs.AdminResource.update).delete(ctrlrs.AdminResource.delete);
   ```

3. **Restart API** to pick up new controller (auto-loads from `src/controllers/admin/`).

## App side (`app/`)

4. **Page files** — create under `app/src/pages/admin/$ARGUMENTS/` (kebab-case):
   - `list.js` — `useGetQuery` with `setPath` for pagination; `Paginate` + `Table` components
   - `show.js` — `useGetQuery({ url: '/admin/$ARGUMENTS/${id}' })`
   - `new.js` — `usePostQuery({ url: '/admin/$ARGUMENTS' })`; navigate on success
   - `edit.js` — `useGetQuery` + `usePostQuery({ method: 'PUT' })`
   - `index.js` — re-export all

5. **Register exports** — add to `app/src/pages/admin/index.js`:
   ```js
   export * from './$ARGUMENTS'
   ```

6. **Register route** — add to the admin route tree:
   ```jsx
   <Route path="/admin/$ARGUMENTS" element={<AdminResourceList />} />
   <Route path="/admin/$ARGUMENTS/:id" element={<AdminResourceShow />} />
   <Route path="/admin/$ARGUMENTS/new" element={<AdminResourceNew />} />
   <Route path="/admin/$ARGUMENTS/:id/edit" element={<AdminResourceEdit />} />
   ```

7. **Nav link** — add to the Admin nav/sidebar component.

## Hooks pattern reminder

All data fetching uses `useGetQuery` / `usePostQuery` from `hooks` — no global state, no dispatch, no token:

```js
const { data, refetch } = useGetQuery({ url: '/admin/$ARGUMENTS' })
const { post } = usePostQuery({ url: '/admin/$ARGUMENTS', method: 'POST' })

// after mutation:
await post(payload)
refetch(true)
```

## Security checklist for new admin routes

- Controller actions only reachable via `api/src/routes/admin.js` (JWT + admin role required by middleware)
- Whitelist fields — never `update(req.body)` directly; use `fields: [...]`
- Never interpolate `req.query`/`req.params` into raw SQL — use `replacements:`
- Validate any polymorphic type params against an allowlist before `models[type]` lookup

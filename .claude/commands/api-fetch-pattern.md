# API Fetch Pattern

Reference for how API calls work in this project after the cookie auth + hooks migration.

## Auth

All requests use HttpOnly cookies — no Authorization header, no token in state.
Every `fetch` call must include `credentials: 'include'`.

Cookies set by API on login/refresh:
- `access_token` — 2-day maxAge, `httpOnly`, `SameSite` from `COOKIE_SAME_SITE` env (dev: `none`, prod: `lax`)
- `refresh_token` — 30-day maxAge, same flags

On 401: hooks automatically call `POST /refresh_token` (sends refresh cookie), then retry. On second 401: dispatch `LOGOUT`.

## In React containers — use hooks

```js
import { useGetQuery, usePostQuery } from 'hooks'

// Read
const { data, isFetching, refetch, setPath } = useGetQuery({ url: '/endpoint' })

// Conditional fetch
const { data } = useGetQuery({ url: `/endpoint/${id}`, enabled: !!id })

// Paginate / dynamic URL
setPath(`/endpoint?limit=${limit}&offset=${offset}`)

// Mutation
const { post } = usePostQuery({ url: '/endpoint', method: 'POST' })
const res = await post(payload)

// DELETE / PUT
const { post: deleteItem } = usePostQuery({ url: '/endpoint', method: 'DELETE' })
const { post: updateItem } = usePostQuery({ url: '/endpoint', method: 'PUT' })

// Dynamic URL override
const { post } = usePostQuery({ method: 'DELETE' })
await post(null, `/endpoint/${id}`)

// After mutation, refetch
refetch(true)
```

## Outside React (fire-and-forget, callbacks)

```js
import { apiFetch } from 'actions/apiFetch'

await apiFetch({ path: '/endpoint', method: 'POST', payload: { ... } })
```

## File uploads

```js
const formData = new FormData()
formData.append('file', files[0], files[0].name)
await fetch(`${process.env.API_URL}/endpoint`, {
  method: 'POST',
  body: formData,
  credentials: 'include'
})
```

## Session state

`session.user` is the login signal — not `session.token` (token no longer in state).

```js
const [{ session: { user } }] = useStateValue()
if (!session.user) // not logged in
```

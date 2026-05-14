# New Page

Scaffold a new frontend page for: $ARGUMENTS

## File location

Pages live in `app/src/pages/` with kebab-case filenames and directories.

```
app/src/pages/
  $ARGUMENTS/
    index.js     ← re-exports
    list.js
    show.js
    edit.js
```

## Webpack aliases

Import using aliases — never relative paths across feature boundaries:

```js
import { useGetQuery, usePostQuery } from 'hooks'
import { Button, Card, Input } from 'components'
import { useStateValue } from 'providers'
import { SomeOtherPage } from 'pages'
```

## Minimal page scaffold

```js
import { useGetQuery } from 'hooks'
import { useParams } from 'react-router-dom'
import { Card, Title } from 'components'

export const $ARGUMENTSShow = () => {
  const { id } = useParams()
  const { data, isFetching } = useGetQuery({ url: `/$ARGUMENTS/${id}` })

  if (isFetching) return null
  if (!data) return null

  return (
    <Card>
      <Title level={2}>{data.$ARGUMENTS.name}</Title>
    </Card>
  )
}
```

## Register the page

1. **Export** — add to `app/src/pages/$ARGUMENTS/index.js`:
   ```js
   export * from './show'
   export * from './list'
   ```

2. **Add to pages index** — add to `app/src/pages/index.js`:
   ```js
   export * from './$ARGUMENTS'
   ```

3. **Route** — add to `app/src/routes/` (create a new router file or add to an existing one):
   ```jsx
   import { $ARGUMENTSShow } from 'pages'

   <Route path="/$ARGUMENTS/:id" element={<$ARGUMENTSShow />} />
   ```

4. **Register router** — wire the router into `app/src/routes/index.js` under `<PrivateRoute>` if auth-required.

## Private vs public

- **Private** (requires login): nest under `<PrivateRoute />` in `app/src/routes/index.js`
- **Public**: add path prefix to `PUBLIC_PATHS` in `app/src/routes/Routes.js`

## Auth check

`session.user` is the auth signal — not `session.token`:

```js
const [{ session: { user } }] = useStateValue()
```

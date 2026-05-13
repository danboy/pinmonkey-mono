# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo containing two separate git repositories:

- `api/` — Node.js/Express REST API backend (port 3013)
- `app/` — React frontend, webpack-based (dev server port 3011)

Each subdirectory has its own `CLAUDE.md` with more specific conventions.

## API (`api/`)

### Commands

```bash
npm start                  # run server
npm run inspect            # run with Node inspector (nodemon)
npm test                   # run mocha unit tests
npm run features           # run cucumber feature tests
npm run test:watch         # watch mode for unit tests

npm run db:migrate         # run pending migrations
npm run db:reset           # drop, create, migrate, seed
npm run db:reset:noseeds   # drop, create, migrate (no seeds)
npm run db:seed:all        # run all seeders
```

### Architecture

**Request lifecycle:** All routes require `Content-Type: application/json`. Authenticated routes use `Auth.checkToken` (validates `Authorization: JWT <token>` header), then `localActorByJwt` to hydrate `res.locals.actor` from the JWT's `user_id`.

**Route tiers** (`src/routes/`):
- `unauthenticated` — public endpoints (signup, token, guest karaoke, etc.)
- `user/index` — JWT-authenticated (standard user)
- `host/index` — JWT + requires role `admin`, `host:owner`, or `host:manager`
- `admin` — JWT + requires role `admin` only

**Controllers** auto-load from `src/controllers/` (including `admin/` and `host/` subdirs). Filenames are converted to PascalCase keys: `queue_items.js` → `ctrlrs.QueueItems`. All controllers extend `BaseController` (`src/controllers/base.js`), which provides standard `index`, `show`, `create`, `update`, `delete` methods. Override only what differs.

**Models** auto-load from `src/models/` via Sequelize. Each model file exports a function `(sequelize, DataTypes) => Model`. Associations and scopes are wired up in `src/models/index.js` after all models load.

**`DecoratedRouter`** wraps Express Router. Chain `.docs(name, info).route(path)` to annotate endpoints; the `GET /` landing route auto-generates API documentation from these annotations.

**Authentication flow:** JWT is RS256. `src/services/jwt.js` signs/verifies using `PRIVATE_KEY`/`PUBLIC_KEY` env vars. Tokens carry `{ user_id }` in payload. `req.user.payload.user_id` is set after `checkToken`.

**Environment:** Copy `env.sample` to `.env`. Key vars: `PRIVATE_KEY`, `PUBLIC_KEY`, `ALGO=RS256`, `TOKEN_EXP`, `ISSUER`, `DB_*`, `GOOGLE_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`.

**Database:** PostgreSQL with PostGIS extension. Sequelize CLI config lives in `db/config.js`. Migrations in `db/migrations/`, seeders in `db/seeders/`. `.sequelizerc` sets all paths.

**Real-time:** Socket.io is wired up; controllers can emit on `res.io` after mutations when a `socket` option is set on the controller.

**Caching:** `src/lib/middleware/cache.js` provides in-memory HTTP response caching (e.g., `mw.cache(60)` for 60-second TTL).

**i18n:** `i18n` package with locale files in `config/locales/`. `defaultLocaleInfo` middleware sets locale on the request.

### Testing

Tests use Mocha + Chai + Supertest. Run a single test file:
```bash
node_modules/.bin/mocha --exit -r ./test/init.js test/models/person_test.js
```
`test/helpers.js` provides `generateUserMeta`, `getTokenFor`, `random`, `uuid`. Tests hit a real database — no DB mocking.

---

## App (`app/`)

### Commands

```bash
npm start          # webpack dev server (port 3011)
npm run build      # production build to dist/
npm test           # vitest
npm run test:ui    # vitest with UI
npm run storybook  # Storybook on port 6006
```

### Architecture

**State management:** No Redux. State lives in React Context providers (`src/providers/`) and local component state. The `actions/` directory contains async functions, not Redux action creators (except for a few thunk-style dispatch wrappers).

**Two-layer actions pattern:**
- `src/actions/api/*.js` — raw `useFetch` calls that return API response data
- `src/actions/*.js` — higher-level functions that call the API layer and return/dispatch typed action objects (`{ type: 'ACTION_TYPE', data: ... }`)

**`useFetch`** (`src/actions/useFetch.js`) is the core HTTP utility — not a React hook despite the name. It wraps `fetch` with JSON headers and `Authorization: JWT <token>`.

**Webpack aliases** (importable without relative paths):
- `actions` → `src/actions/`
- `components` → `src/components/`
- `containers` → `src/containers/`
- `hooks` → `src/hooks/`
- `providers` → `src/providers/`
- `reducers` → `src/reducers/`
- `utils` → `src/utils/`

**Environment:** Uses `dotenv-webpack`. Default `.env` for local dev; `.env.prd` for production builds. Key var: `API_URL` (base URL for API calls).

**Styling:** `styled-components` v6.

**Component library:** Shared UI in `src/components/`, with Storybook stories (`*.stories.js`) for isolated development. Forms are in `src/components/forms/`.

**Deployment:** `npm run deploy` builds and uploads to Google Cloud Storage (`gs://www.pinmonkey.com/`).

---

## Key Subsystems

### Posts, Comments & Voting (`app/src/components/Post.js`)

- `ShowPosts` fetches posts with votes, media, and nested comments in one SQL query (raw SQL in `PostController.index`).
- Comments support replies via `parent_id` (self-referential `Comment` model). Top-level vs reply is determined by `parent_id IS NULL` in the SQL.
- `PostComments` sends replies with `{ parent_id }` to `POST /posts/:id/comments`.
- Post bodies, comments, and replies render via `react-markdown` (v9, no remark-gfm). The `Markdown` styled wrapper collapses paragraph margins for inline contexts.
- Voting: `PUT /votes` with `{ post_id, id?, value }`. Toggle off by sending `value: 'removed'`.

### User Profile (`app/src/containers/Account/Show.js` + `api/src/controllers/users.js`)

- `PUT /account/:slug/edit` updates user profile. The controller whitelists only `username`, `full_name`, `common_name` — all other fields are stripped.
- Username has a DB-level UNIQUE constraint (migration `20200519220713`). The controller catches `SequelizeUniqueConstraintError` and returns HTTP 422.
- The Account page uses an edit-mode toggle: clicking Edit makes the username table cell an inline input; Save/Cancel control the transition.

### Map Tag Filtering (`app/src/components/Map/MapFilters.js`)

- `GET /tags` with no params returns only tags linked to locations (queries `ItemTag` where `taggable_type: "location"`).
- `GET /tags?q=term` searches all tags by name (used by the typeahead).
- Active filters are passed as a pipe-separated string: `&filters=tag1|tag2`.

### AddressController — Critical Gotchas (`api/src/controllers/addresses.js`)

- **Never mutate `this.associations` in-place.** Always build include arrays fresh per request using spread. In-place mutation persists across requests (Node module singleton).
- Scope key for polymorphic tag join is `taggable_type: "location"` (not `taggable`).
- Must use `distinct: true` in `findAndCountAll` — JOINs with multiple tags inflate the count otherwise.

### Geolocation

- `GeolocationProvider` (`app/src/providers/geolocationProvider.js`) is the single source via `watchPosition`. All components should read from context via `useGeolocation` hook (delegates to provider) — do not create independent `watchPosition` calls.
- Falls back to default Chicago coordinates on error or unsupported browser.

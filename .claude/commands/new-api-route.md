# New API Route

Scaffold a new API endpoint for: $ARGUMENTS

## 1. Controller

Create `api/src/controllers/$ARGUMENTS.js` (or `admin/$ARGUMENTS.js` for admin routes):

```js
import BaseController from './base.js'
import models from '../models/index.js'

class $ARGUMENTSController extends BaseController {
  constructor() {
    super('$ARGUMENTSModel', {
      exclude: ['password', 'member_id', 'owner_id'],
      instanceSearchAttribute: 'slug',  // or 'id'
    })
    // Bind custom methods
    this.customAction = this.customAction.bind(this)
  }

  customAction(req, res, next) {
    // Whitelist fields — never spread req.body directly
    const allowed = ['field1', 'field2']
    const body = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    )

    models.$ARGUMENTSModel.create(body)
      .then((item) => res.status(201).send({ item }))
      .catch(next)
  }
}

export default $ARGUMENTSController
```

`BaseController` auto-provides: `index`, `show`, `create`, `update`, `delete`.
Override only what differs.

## 2. Route registration

**Unauthenticated** (`api/src/routes/unauthenticated.js`):
```js
router.route('/$ARGUMENTS').get(ctrlrs.$ARGUMENTSController.index)
```

**User-authenticated** (`api/src/routes/user/index.js`):
```js
router.route('/$ARGUMENTS').get(ctrlrs.$ARGUMENTSController.index).post(ctrlrs.$ARGUMENTSController.create)
router.route('/$ARGUMENTS/:id').get(ctrlrs.$ARGUMENTSController.show).put(ctrlrs.$ARGUMENTSController.update).delete(ctrlrs.$ARGUMENTSController.delete)
```

**Admin-only** (`api/src/routes/admin.js`):
```js
router.route('/$ARGUMENTS').get(ctrlrs.Admin$ARGUMENTSController.index)
```

Controllers auto-load from `src/controllers/` — filename to PascalCase: `queue_items.js` → `ctrlrs.QueueItems`.

## 3. Rate limiting (unauthenticated write routes)

```js
import rateLimit from 'express-rate-limit'
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: () => process.env.NODE_ENV === 'test',
})
router.route('/$ARGUMENTS').post(limiter, ctrlrs.$ARGUMENTSController.create)
```

## 4. Integration test

Create `api/test/integration/$ARGUMENTS.test.js`:

```js
import request from 'supertest'
import assert from 'assert'
import m from '../../src/models/index.js'
import { app } from '../../index.js'
import * as h from '../helpers.js'
import Auth from '../../src/services/auth.js'

describe('GET /$ARGUMENTS', () => {
  let user, cookie

  beforeEach(async () => {
    user = await m.User.create(h.generateUserMeta())
    const tokens = await Auth.getToken({
      user_id: user.id,
      issuer: process.env.ISSUER,
      subject: user.email,
      audience: 'app',
    })
    cookie = `access_token=${tokens.token}`
  })

  afterEach(async () => {
    await m.User.destroy({ where: {} })
  })

  it('returns 200', async () => {
    const res = await request(app)
      .get('/$ARGUMENTS')
      .set('Cookie', cookie)
      .set('Content-Type', 'application/json')
    assert.strictEqual(res.status, 200)
  })
})
```

Run: `node_modules/.bin/mocha --exit -r ./test/init.js test/integration/$ARGUMENTS.test.js`

## Security checklist

- [ ] Auth: unauthenticated routes intentional? Otherwise use `user/index.js`
- [ ] Mass assignment: whitelist fields with `fields: [...]`, never `update(req.body)`
- [ ] SQL injection: named `replacements:` + `QueryTypes.SELECT` for raw queries
- [ ] Polymorphic types: allowlist before `models[type]` lookup
- [ ] Response leakage: exclude `password`, `member_id`, `owner_id`
- [ ] Rate limiting: add `authLimiter` or `signupLimiter` on unauthenticated write routes

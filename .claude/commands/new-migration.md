# New Database Migration

Create a Sequelize migration for: $ARGUMENTS

## Generate the file

```bash
cd api && npx sequelize-cli migration:generate --name $ARGUMENTS
```

File lands in `api/db/migrations/YYYYMMDDHHMMSS-$ARGUMENTS.js`.

## CJS format (db/ stays CommonJS — do NOT use import/export)

```js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // forward migration
  },

  async down(queryInterface, Sequelize) {
    // rollback — must fully undo `up`
  }
};
```

## Common patterns

### Add column
```js
await queryInterface.addColumn('table_name', 'column_name', {
  type: Sequelize.STRING,
  allowNull: true,
  defaultValue: null,
});
```

### Remove column
```js
await queryInterface.removeColumn('table_name', 'column_name');
```

### Add index
```js
await queryInterface.addIndex('table_name', ['col_a', 'col_b'], {
  unique: true,
  name: 'table_name_col_a_col_b_unique',
});
```

### JSONB column (PostgreSQL)
```js
await queryInterface.addColumn('table_name', 'data', {
  type: Sequelize.JSONB,
  allowNull: false,
  defaultValue: {},
});
```

### PostGIS geometry
```js
await queryInterface.addColumn('table_name', 'location', {
  type: Sequelize.GEOMETRY('POINT', 4326),
  allowNull: true,
});
```

### Create table
```js
await queryInterface.createTable('table_name', {
  id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});
```

## Run and rollback

```bash
cd api
npm run db:migrate           # run pending
npx sequelize-cli db:migrate:undo  # undo last
```

## Rules

- `down` must fully undo `up` — always implement it
- Do NOT edit already-run migrations; create a new one
- `db/` is CJS — no `import`/`export`, use `require`/`module.exports`
- Check `api/src/models/` to see if the model needs updating too (Sequelize models must mirror schema)

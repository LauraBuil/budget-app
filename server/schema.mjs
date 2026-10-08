export async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      expense_group TEXT NOT NULL DEFAULT 'daily',
      date DATE NOT NULL,
      note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
      is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
      recurring_id TEXT,
      recurrence_month TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expense_group TEXT NOT NULL DEFAULT 'daily'`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_id TEXT`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_month TEXT`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'other'`
  await sql`CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions (user_id, date DESC, created_at DESC)`
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
      slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{1,80}$'),
      expense_group TEXT NOT NULL DEFAULT 'daily',
      type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS expense_group TEXT NOT NULL DEFAULT 'daily'`
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'expense'`
  await sql`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_slug_key`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS categories_user_type_slug_idx ON categories (user_id, type, slug)`
  await sql`
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      expense_group TEXT NOT NULL DEFAULT 'daily',
      recurrence_day SMALLINT NOT NULL CHECK (recurrence_day BETWEEN 1 AND 31),
      window_start TEXT NOT NULL DEFAULT '',
      window_end TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS expense_group TEXT NOT NULL DEFAULT 'daily'`
  await sql`ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'expense'`
  await sql`ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS window_start TEXT NOT NULL DEFAULT ''`
  await sql`ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS window_end TEXT NOT NULL DEFAULT ''`
  await sql`ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'other'`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_month_idx ON transactions (recurring_id, recurrence_month) WHERE recurring_id IS NOT NULL`
  await sql`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '' CHECK (char_length(name) <= 80),
      category TEXT NOT NULL CHECK (char_length(category) BETWEEN 1 AND 80),
      monthly_limit NUMERIC(12, 2) NOT NULL CHECK (monthly_limit > 0),
      color TEXT NOT NULL DEFAULT '#c87d78' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
      note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, category)
    )
  `
  await sql`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '' CHECK (char_length(name) <= 80)`
  await sql`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000)`
  await sql`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'other'`
  await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
      target NUMERIC(12, 2) NOT NULL CHECK (target > 0),
      saved NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (saved >= 0),
      due_date DATE,
      icon TEXT NOT NULL DEFAULT 'safety' CHECK (icon IN ('travel', 'tech', 'safety')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS monthly_balances (
      user_id TEXT NOT NULL,
      month TEXT NOT NULL CHECK (month ~ '^\\d{4}-(0[1-9]|1[0-2])$'),
      opening_balance NUMERIC(12, 2) NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, month)
    )
  `
  await sql`ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_icon_check`
  await sql`ALTER TABLE goals ALTER COLUMN icon SET DEFAULT 'other'`
}

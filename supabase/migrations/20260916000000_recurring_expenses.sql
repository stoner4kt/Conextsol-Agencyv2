-- Recurring expenses: templates that apply on the 1st of every month from start_date onward.
-- expense_entries: concrete monthly postings used when subtracting from profits.

CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    start_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS expense_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_expense_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_month DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT expense_entries_month_unique UNIQUE (recurring_expense_id, expense_month)
);

CREATE INDEX IF NOT EXISTS idx_expense_entries_month ON expense_entries(expense_month);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recurring_expenses' AND policyname = 'Admins have full access to recurring_expenses'
  ) THEN
    CREATE POLICY "Admins have full access to recurring_expenses"
    ON recurring_expenses FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'email' LIKE '%@conextsol.com'
        OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' LIKE '%@conextsol.com'
        OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expense_entries' AND policyname = 'Admins have full access to expense_entries'
  ) THEN
    CREATE POLICY "Admins have full access to expense_entries"
    ON expense_entries FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'email' LIKE '%@conextsol.com'
        OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' LIKE '%@conextsol.com'
        OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com'
    );
  END IF;
END
$$;

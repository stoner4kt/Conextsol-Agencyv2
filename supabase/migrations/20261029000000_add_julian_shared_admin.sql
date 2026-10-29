-- Grant juliangreen237@gmail.com shared agency-wide CRUD access.
-- This is additive: existing admin and client policies remain unchanged.
-- Apply through Supabase SQL Editor or your normal migration deployment process.

DO $$
DECLARE
  v_table_name text;
  v_policy_name text := 'Julian Green shared agency admin access';
  agency_tables text[] := ARRAY[
    'clients',
    'projects',
    'retainers',
    'documents_and_notes',
    'ai_tool_accounts',
    'invoices',
    'recurring_expenses',
    'expense_entries'
  ];
BEGIN
  FOREACH v_table_name IN ARRAY agency_tables LOOP
    IF to_regclass(format('public.%I', v_table_name)) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_policies p
         WHERE p.schemaname = 'public'
           AND p.tablename = v_table_name
           AND p.policyname = v_policy_name
       )
    THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (lower(auth.jwt() ->> ''email'') = %L) WITH CHECK (lower(auth.jwt() ->> ''email'') = %L)',
        v_policy_name,
        v_table_name,
        'juliangreen237@gmail.com',
        'juliangreen237@gmail.com'
      );
    END IF;
  END LOOP;
END
$$;

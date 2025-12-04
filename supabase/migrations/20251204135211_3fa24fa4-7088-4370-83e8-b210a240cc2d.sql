-- First, drop ALL existing policies on conversations
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT polname FROM pg_policy 
               JOIN pg_class ON pg_policy.polrelid = pg_class.oid 
               WHERE relname = 'conversations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.polname);
    END LOOP;
END $$;

-- Recreate INSERT policy as PERMISSIVE for authenticated users
CREATE POLICY "conversations_insert_policy"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Recreate SELECT policy as PERMISSIVE using the security definer function
CREATE POLICY "conversations_select_policy"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));
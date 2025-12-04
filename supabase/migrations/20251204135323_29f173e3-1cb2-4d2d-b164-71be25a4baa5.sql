-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify and recreate INSERT policy with explicit grant
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;

-- Grant necessary permissions to authenticated role
GRANT INSERT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;

-- Create simple permissive INSERT policy
CREATE POLICY "allow_authenticated_insert"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create SELECT policy
CREATE POLICY "allow_participant_select"
ON public.conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));
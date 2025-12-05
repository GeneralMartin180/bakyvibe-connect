-- Drop existing policies on conversations
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.conversations;
DROP POLICY IF EXISTS "allow_participant_select" ON public.conversations;

-- Create new permissive policies
CREATE POLICY "Anyone authenticated can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone authenticated can select conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (true);

-- Also fix conversation_participants policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;

CREATE POLICY "Anyone authenticated can view participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "select_participants_in_own_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "insert_participants_if_member" ON public.conversation_participants;

-- SELECT: Users can only see participants of conversations they're part of
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- INSERT: Users can only add participants if they're already in the conversation OR if it's a brand new conversation (no participants yet)
CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- Either the user is adding themselves as the first participant to a new conversation
  (user_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
  ))
  OR
  -- Or the user is already a participant and can add others
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);
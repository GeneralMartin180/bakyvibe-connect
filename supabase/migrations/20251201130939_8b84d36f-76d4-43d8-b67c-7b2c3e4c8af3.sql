-- DROP starej policy
DROP POLICY IF EXISTS "select_participants_in_own_conversations" ON public.conversation_participants;

-- CREATE bezpečnej policy
CREATE POLICY "select_participants_in_own_conversations"
ON public.conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

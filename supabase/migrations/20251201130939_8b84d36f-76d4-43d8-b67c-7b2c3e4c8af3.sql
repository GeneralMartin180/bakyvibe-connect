-- DROP starých policy pre participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- CREATE bezpečnej policy
CREATE POLICY "select_participants_in_own_conversations"
ON public.conversation_participants
FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
  )
);

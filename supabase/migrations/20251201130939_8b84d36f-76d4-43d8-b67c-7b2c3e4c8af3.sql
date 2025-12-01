-- =======================
-- DROP starých policy pre participants
-- =======================
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- =======================
-- CREATE bezpečnej policy
-- =======================
CREATE POLICY IF NOT EXISTS "select_participants_in_own_conversations"
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

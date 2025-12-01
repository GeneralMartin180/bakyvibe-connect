-- DROP starej policy
DROP POLICY IF EXISTS "select_participants_in_own_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "insert_participants" ON public.conversation_participants;

-- SELECT: iba členovia vidia účastníkov svojej konverzácie
CREATE POLICY "select_participants_in_own_conversations"
ON public.conversation_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
  )
);

-- INSERT: iba existujúci účastníci môžu pridávať nových
CREATE POLICY "insert_participants_if_member"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

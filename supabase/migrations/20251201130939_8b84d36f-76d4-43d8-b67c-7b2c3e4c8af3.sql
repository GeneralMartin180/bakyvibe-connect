-- DROP starých policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

-- CREATE policy pre conversations
CREATE POLICY "Users can create conversation if they are participant"
ON public.conversations
FOR INSERT
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (true); -- aplikácia musí zabezpečiť vloženie seba do participants

-- CREATE policy pre conversation_participants
CREATE POLICY "Users can add participants if they are in conversation"
ON public.conversation_participants
FOR INSERT
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

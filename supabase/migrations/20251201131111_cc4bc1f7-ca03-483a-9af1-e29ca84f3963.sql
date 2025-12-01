-- =======================
-- DROP a CREATE policy pre INSERT do conversations
-- =======================
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY IF NOT EXISTS "Users can create their own conversation"
ON public.conversations
FOR INSERT
USING (true)        -- používateľ môže vytvoriť konverzáciu
WITH CHECK (true);  -- trigger/aplikácia musí pridať seba ako participant

-- =======================
-- DROP a CREATE policy pre INSERT do conversation_participants
-- =======================
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

CREATE POLICY IF NOT EXISTS "Users can add participants if they are in the conversation"
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

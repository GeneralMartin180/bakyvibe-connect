-- =======================
-- EXTENSIONS
-- =======================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =======================
-- TABLES
-- =======================

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- =======================
-- ENABLE RLS
-- =======================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =======================
-- POLICIES: Conversations
-- =======================

-- Members can SELECT their own conversations
CREATE POLICY IF NOT EXISTS "select_own_conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Authenticated users can INSERT new conversations
CREATE POLICY IF NOT EXISTS "insert_conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (true);

-- =======================
-- POLICIES: Conversation Participants
-- =======================

-- Members can SELECT participants in their conversations
CREATE POLICY IF NOT EXISTS "select_participants_in_own_conversations"
ON public.conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Authenticated users can INSERT participants
CREATE POLICY IF NOT EXISTS "insert_participants"
ON public.conversation_participants FOR INSERT
TO authenticated
WITH CHECK (true);

-- =======================
-- POLICIES: Messages
-- =======================

-- Members can SELECT messages in their conversations
CREATE POLICY IF NOT EXISTS "select_messages_in_own_conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Authenticated users can INSERT messages if they are sender and member
CREATE POLICY IF NOT EXISTS "insert_own_messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Sender can UPDATE their own messages
CREATE POLICY IF NOT EXISTS "update_own_messages"
ON public.messages FOR UPDATE
USING (
  sender_id = auth.uid()
);

-- =======================
-- REALTIME
-- =======================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =======================
-- TRIGGERS
-- =======================

-- Update conversations.updated_at when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

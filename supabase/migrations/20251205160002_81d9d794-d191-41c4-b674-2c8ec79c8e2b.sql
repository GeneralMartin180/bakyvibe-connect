-- Drop and recreate policies to apply to all roles (like posts table)
DROP POLICY IF EXISTS "Anyone authenticated can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone authenticated can select conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone authenticated can view participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Anyone authenticated can add participants" ON public.conversation_participants;

-- Conversations policies (no TO clause = applies to all roles)
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Conversation participants policies
CREATE POLICY "Users can view participants"
ON public.conversation_participants
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
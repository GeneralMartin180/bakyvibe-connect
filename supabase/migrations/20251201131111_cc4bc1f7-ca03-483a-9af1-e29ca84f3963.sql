-- Drop and recreate the INSERT policy for conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure the participants INSERT policy is correct
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

CREATE POLICY "Authenticated users can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (true);
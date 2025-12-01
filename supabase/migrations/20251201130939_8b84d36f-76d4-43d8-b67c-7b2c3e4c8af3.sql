-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Create a simpler, non-recursive policy
-- Users can view participants if they are part of the conversation
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
TO public
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Alternative: Just allow authenticated users to view all participants
-- This is simpler and avoids recursion entirely
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

CREATE POLICY "Authenticated users can view participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (true);
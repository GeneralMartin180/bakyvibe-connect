-- Grant all necessary permissions on conversations table
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO anon;

-- Also ensure conversation_participants has proper grants
GRANT ALL ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO anon;
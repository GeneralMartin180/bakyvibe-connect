-- Force grant all permissions
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversation_participants TO authenticated;
GRANT ALL ON TABLE public.conversation_participants TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO anon;
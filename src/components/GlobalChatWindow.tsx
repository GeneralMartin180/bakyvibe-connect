import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChat } from "@/contexts/ChatContext";
import { ChatWindow } from "./ChatWindow";

export function GlobalChatWindow() {
  const { activeChat, closeChat } = useChat();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUserId(session?.user.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!activeChat || !currentUserId) return null;

  return (
    <ChatWindow
      conversationId={activeChat.conversationId}
      otherUser={activeChat.otherUser}
      currentUserId={currentUserId}
      onClose={closeChat}
    />
  );
}

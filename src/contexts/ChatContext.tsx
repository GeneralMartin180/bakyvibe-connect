import { createContext, useContext, useState, ReactNode } from "react";

interface OtherUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ActiveChat {
  conversationId: string;
  otherUser: OtherUser;
}

interface ChatContextType {
  activeChat: ActiveChat | null;
  openChat: (conversationId: string, otherUser: OtherUser) => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);

  const openChat = (conversationId: string, otherUser: OtherUser) => {
    setActiveChat({ conversationId, otherUser });
  };

  const closeChat = () => {
    setActiveChat(null);
  };

  return (
    <ChatContext.Provider value={{ activeChat, openChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

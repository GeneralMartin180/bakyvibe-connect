import { createContext, useContext, ReactNode } from "react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface UnreadMessagesContextType {
  totalUnread: number;
  unreadByConversation: Map<string, number>;
  markAsRead: (conversationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const unreadMessages = useUnreadMessages();

  return (
    <UnreadMessagesContext.Provider value={unreadMessages}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessagesContext() {
  const context = useContext(UnreadMessagesContext);
  if (!context) {
    throw new Error("useUnreadMessagesContext must be used within an UnreadMessagesProvider");
  }
  return context;
}

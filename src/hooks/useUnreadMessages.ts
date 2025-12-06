import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UnreadCount {
  conversationId: string;
  count: number;
}

export function useUnreadMessages() {
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByConversation, setUnreadByConversation] = useState<Map<string, number>>(new Map());
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

  useEffect(() => {
    if (!currentUserId) return;

    fetchUnreadCounts();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const message = payload.new as any;
          // Only count if message is from someone else and not read
          if (message.sender_id !== currentUserId && !message.read) {
            setTotalUnread(prev => prev + 1);
            setUnreadByConversation(prev => {
              const newMap = new Map(prev);
              const current = newMap.get(message.conversation_id) || 0;
              newMap.set(message.conversation_id, current + 1);
              return newMap;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refetch when messages are updated (marked as read)
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchUnreadCounts = async () => {
    if (!currentUserId) return;

    try {
      // Get all conversations the user is part of
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      if (!participantData) return;

      const conversationIds = participantData.map(p => p.conversation_id);

      // Get unread messages not sent by current user
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', currentUserId)
        .eq('read', false);

      if (unreadMessages) {
        const counts = new Map<string, number>();
        unreadMessages.forEach(msg => {
          const current = counts.get(msg.conversation_id) || 0;
          counts.set(msg.conversation_id, current + 1);
        });
        setUnreadByConversation(counts);
        setTotalUnread(unreadMessages.length);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!currentUserId) return;

    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .eq('read', false);

      // Update local state
      setUnreadByConversation(prev => {
        const newMap = new Map(prev);
        const count = newMap.get(conversationId) || 0;
        setTotalUnread(t => Math.max(0, t - count));
        newMap.delete(conversationId);
        return newMap;
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  return {
    totalUnread,
    unreadByConversation,
    markAsRead,
    refetch: fetchUnreadCounts
  };
}

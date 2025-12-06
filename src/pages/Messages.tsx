import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { useUnreadMessagesContext } from "@/contexts/UnreadMessagesContext";
import { useChat } from "@/contexts/ChatContext";

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { unreadByConversation, markAsRead } = useUnreadMessagesContext();
  const { openChat } = useChat();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(session.user.id);
      fetchConversations(session.user.id);
    });
  }, [navigate]);

  const fetchConversations = async (userId: string) => {
    try {
      const { data: convos, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const conversationsData = await Promise.all(
        (convos || []).map(async (convo) => {
          // Get other participant user_ids
          const { data: participantIds } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', convo.conversation_id)
            .neq('user_id', userId);

          if (!participantIds || participantIds.length === 0) return null;

          // Get participant profile
          const { data: participantProfile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', participantIds[0].user_id)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', convo.conversation_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: convo.conversation_id,
            updated_at: convo.conversations.updated_at,
            other_user: participantProfile,
            last_message: lastMessage
          };
        })
      );

      setConversations(conversationsData.filter(c => c && c.other_user).sort((a, b) => 
        new Date(b!.updated_at).getTime() - new Date(a!.updated_at).getTime()
      ) as Conversation[]);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass rounded-2xl p-4 flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold gradient-text">Messages</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground mt-2">Start a conversation by visiting a profile</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const unreadCount = unreadByConversation.get(conversation.id) || 0;
            
            return (
              <div
                key={conversation.id}
                onClick={() => {
                  markAsRead(conversation.id);
                  openChat(conversation.id, conversation.other_user);
                }}
                className="glass rounded-2xl p-4 flex items-center gap-3 hover:shadow-glow hover-lift cursor-pointer transition-all duration-200"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12 transition-transform duration-200 hover:scale-110">
                    <AvatarImage src={conversation.other_user.avatar_url} />
                    <AvatarFallback>
                      {conversation.other_user.display_name?.[0] || conversation.other_user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-foreground ${unreadCount > 0 ? 'text-primary' : ''}`}>
                    {conversation.other_user.display_name || conversation.other_user.username}
                  </p>
                  <p className={`text-sm truncate ${unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {conversation.last_message?.content || "No messages yet"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {conversation.last_message && new Date(conversation.last_message.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
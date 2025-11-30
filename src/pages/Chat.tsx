import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface OtherUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(session.user.id);
      fetchMessages();
      fetchOtherUser(session.user.id);
    });

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchOtherUser = async (userId: string) => {
    try {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, profiles!inner(id, username, display_name, avatar_url)')
        .eq('conversation_id', conversationId)
        .neq('user_id', userId);

      if (participants && participants.length > 0) {
        setOtherUser(participants[0].profiles as any);
      }
    } catch (error: any) {
      console.error('Error fetching other user:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="glass rounded-t-2xl p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/messages")}
          className="hover:scale-110 transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {otherUser && (
          <>
            <Avatar className="w-10 h-10 transition-transform duration-200 hover:scale-110">
              <AvatarImage src={otherUser.avatar_url} />
              <AvatarFallback>
                {otherUser.display_name?.[0] || otherUser.username[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{otherUser.display_name || otherUser.username}</p>
              <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 glass rounded-none">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 transition-all duration-200 hover:shadow-glow ${
                message.sender_id === currentUserId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <p className="break-words">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="glass rounded-b-2xl p-4 flex gap-2 sticky bottom-0">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          disabled={loading}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!newMessage.trim() || loading}
          className="hover:scale-110 transition-all duration-200"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from "@/utils/notificationSound";
interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface OtherUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ChatWindowProps {
  conversationId: string;
  otherUser: OtherUser;
  currentUserId: string;
  onClose: () => void;
}

export function ChatWindow({ conversationId, otherUser, currentUserId, onClose }: ChatWindowProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Request notification permission on mount
    requestNotificationPermission();
    fetchMessages();

    const channel = supabase
      .channel(`chat-window:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const message = payload.new as Message;
          try {
            const content = JSON.parse(message.content);
            if (!content.type) {
              setMessages((prev) => [...prev, message]);
              // Play sound and show notification for messages from others
              if (message.sender_id !== currentUserId) {
                playNotificationSound();
                if (isMinimized || document.hidden) {
                  showBrowserNotification(
                    otherUser.display_name || otherUser.username,
                    message.content
                  );
                }
              }
            }
          } catch {
            setMessages((prev) => [...prev, message]);
            // Play sound and show notification for messages from others
            if (message.sender_id !== currentUserId) {
              playNotificationSound();
              if (isMinimized || document.hidden) {
                showBrowserNotification(
                  otherUser.display_name || otherUser.username,
                  message.content
                );
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, otherUser, isMinimized]);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const regularMessages = (data || []).filter(msg => {
        try {
          const content = JSON.parse(msg.content);
          return !content.type || !['call-offer', 'call-answer', 'ice-candidate', 'call-end'].includes(content.type);
        } catch {
          return true;
        }
      });

      setMessages(regularMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

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

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 glass rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:scale-105 transition-all duration-200 shadow-glow"
        onClick={() => setIsMinimized(false)}
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={otherUser.avatar_url || undefined} />
          <AvatarFallback>
            {otherUser.display_name?.[0] || otherUser.username[0]}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm">{otherUser.display_name || otherUser.username}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 h-[500px] glass rounded-2xl flex flex-col shadow-glow animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center gap-3">
        <Avatar className="w-9 h-9">
          <AvatarImage src={otherUser.avatar_url || undefined} />
          <AvatarFallback>
            {otherUser.display_name?.[0] || otherUser.username[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{otherUser.display_name || otherUser.username}</p>
          <p className="text-xs text-muted-foreground truncate">@{otherUser.username}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}>
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Start the conversation!</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    message.sender_id === currentUserId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-border/50 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-9 text-sm"
          disabled={loading}
        />
        <Button 
          type="submit" 
          size="icon" 
          className="h-9 w-9"
          disabled={!newMessage.trim() || loading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

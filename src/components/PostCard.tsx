import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostCardProps {
  post: {
    id: string;
    image_url: string;
    caption: string;
    created_at: string;
    profiles: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
    likes: { id: string; user_id: string }[];
  };
  currentUserId?: string;
}

export const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(
    post.likes.some(like => like.user_id === currentUserId)
  );
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (!currentUserId || isLiking) return;

    setIsLiking(true);
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        if (error) throw error;

        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: currentUserId });

        if (error) throw error;

        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error: any) {
      toast.error("Failed to update like");
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden hover-lift animate-fade-in mb-6">
      {/* Post Header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="w-10 h-10 border-2 border-primary/20">
          <AvatarImage src={post.profiles.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-primary text-white">
            {post.profiles.display_name?.[0] || post.profiles.username[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{post.profiles.display_name || post.profiles.username}</p>
          <p className="text-xs text-muted-foreground">@{post.profiles.username}</p>
        </div>
      </div>

      {/* Post Image */}
      <div className="relative aspect-square bg-muted">
        <img 
          src={post.image_url} 
          alt="Post" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Post Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 hover:text-secondary ${isLiked ? 'text-secondary' : ''}`}
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageCircle className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Send className="w-6 h-6" />
            </Button>
          </div>
          <Button variant="ghost" size="sm">
            <Bookmark className="w-6 h-6" />
          </Button>
        </div>

        {/* Like Count */}
        {likeCount > 0 && (
          <p className="font-semibold text-sm">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <span className="font-semibold mr-2">{post.profiles.username}</span>
            {post.caption}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {new Date(post.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
      </div>
    </div>
  );
};

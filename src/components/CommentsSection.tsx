import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentsSectionProps {
  postId?: string;
  storyId?: string;
  currentUserId?: string;
  variant?: "default" | "story";
}

export const CommentsSection = ({ postId, storyId, currentUserId, variant = "default" }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId, storyId]);

  const fetchComments = async () => {
    const query = supabase
      .from("comments")
      .select(`
        id,
        user_id,
        content,
        created_at,
        profiles (
          username,
          display_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: true });

    if (postId) {
      query.eq("post_id", postId);
    } else if (storyId) {
      query.eq("story_id", storyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      setComments(data as Comment[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId || submitting) return;

    setSubmitting(true);
    try {
      const commentData: any = {
        user_id: currentUserId,
        content: newComment.trim(),
      };

      if (postId) {
        commentData.post_id = postId;
      } else if (storyId) {
        commentData.story_id = storyId;
      }

      const { data, error } = await supabase
        .from("comments")
        .insert(commentData)
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      setComments([...comments, data as Comment]);
      setNewComment("");
    } catch (error: any) {
      toast.error("Failed to add comment");
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const isStory = variant === "story";

  return (
    <div className={isStory ? "space-y-2" : "space-y-3 mt-3"}>
      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={`space-y-2 ${isStory ? "max-h-32 overflow-y-auto" : "max-h-48 overflow-y-auto"}`}>
          {comments.map((comment) => (
            <div key={comment.id} className={`flex items-start gap-2 group ${isStory ? "text-white" : ""}`}>
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {comment.profiles?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isStory ? "text-white" : ""}`}>
                  <span className="font-semibold mr-1">
                    {comment.profiles?.username || "user"}
                  </span>
                  {comment.content}
                </p>
                <p className={`text-xs ${isStory ? "text-white/60" : "text-muted-foreground"}`}>
                  {new Date(comment.created_at).toLocaleDateString()}
                </p>
              </div>
              {comment.user_id === currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${isStory ? "text-white hover:bg-white/20" : ""}`}
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
          {comments.length === 0 && !loading && (
            <p className={`text-xs ${isStory ? "text-white/60" : "text-muted-foreground"}`}>
              No comments yet
            </p>
          )}
        </div>
      )}

      {/* Comment Input */}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className={isStory ? "bg-white/10 border-white/20 text-white placeholder:text-white/50 flex-1" : "flex-1"}
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || submitting}
            variant={isStory ? "ghost" : "default"}
            className={isStory ? "text-white hover:bg-white/20" : ""}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      )}
    </div>
  );
};
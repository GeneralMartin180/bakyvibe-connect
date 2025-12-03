import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { CommentsSection } from "@/components/CommentsSection";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface StoryGroup {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  stories: Story[];
  hasUnviewed: boolean;
}

const Stories = () => {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewingStory, setViewingStory] = useState<{group: StoryGroup, index: number} | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchStories = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(session.user.id);

      // Fetch stories from last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: stories, error } = await supabase
        .from("stories")
        .select(`
          id,
          user_id,
          image_url,
          created_at,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stories:", error);
        setLoading(false);
        return;
      }

      // Group stories by user
      const groupedMap = new Map<string, StoryGroup>();
      
      (stories || []).forEach((story: any) => {
        const userId = story.user_id;
        if (!groupedMap.has(userId)) {
          groupedMap.set(userId, {
            user_id: userId,
            username: story.profiles?.username || "user",
            display_name: story.profiles?.display_name,
            avatar_url: story.profiles?.avatar_url,
            stories: [],
            hasUnviewed: true,
          });
        }
        groupedMap.get(userId)!.stories.push(story);
      });

      // Put current user first if they have stories
      const groups = Array.from(groupedMap.values());
      const currentUserIndex = groups.findIndex(g => g.user_id === session.user.id);
      if (currentUserIndex > 0) {
        const [currentUserGroup] = groups.splice(currentUserIndex, 1);
        groups.unshift(currentUserGroup);
      }

      setStoryGroups(groups);
      setLoading(false);
    };

    fetchStories();
  }, [navigate]);

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentUserId) return;
    
    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("posts")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: currentUserId,
          image_url: publicUrl,
        });

      if (insertError) throw insertError;

      toast({ title: "Story added!" });
      window.location.reload();
    } catch (error) {
      console.error("Error uploading story:", error);
      toast({ title: "Failed to add story", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openStory = (group: StoryGroup) => {
    setViewingStory({ group, index: 0 });
  };

  const closeStory = () => {
    setViewingStory(null);
  };

  const nextStory = () => {
    if (!viewingStory) return;
    
    if (viewingStory.index < viewingStory.group.stories.length - 1) {
      setViewingStory({ ...viewingStory, index: viewingStory.index + 1 });
    } else {
      // Move to next user's stories
      const currentGroupIndex = storyGroups.findIndex(g => g.user_id === viewingStory.group.user_id);
      if (currentGroupIndex < storyGroups.length - 1) {
        setViewingStory({ group: storyGroups[currentGroupIndex + 1], index: 0 });
      } else {
        closeStory();
      }
    }
  };

  const prevStory = () => {
    if (!viewingStory) return;
    
    if (viewingStory.index > 0) {
      setViewingStory({ ...viewingStory, index: viewingStory.index - 1 });
    } else {
      // Move to previous user's stories
      const currentGroupIndex = storyGroups.findIndex(g => g.user_id === viewingStory.group.user_id);
      if (currentGroupIndex > 0) {
        const prevGroup = storyGroups[currentGroupIndex - 1];
        setViewingStory({ group: prevGroup, index: prevGroup.stories.length - 1 });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold gradient-text">Stories</h1>
      
      {/* Story circles */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleAddStory}
              className="hidden"
              disabled={uploading}
            />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-dashed border-primary/50 flex items-center justify-center hover:scale-105 transition-transform">
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              ) : (
                <Plus className="w-8 h-8 text-primary" />
              )}
            </div>
          </label>
          <span className="text-xs text-muted-foreground">Add Story</span>
        </div>

        {/* Story Groups */}
        {storyGroups.map((group) => (
          <button
            key={group.user_id}
            onClick={() => openStory(group)}
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div className={`p-0.5 rounded-full ${group.hasUnviewed ? 'bg-gradient-to-br from-primary to-pink-500' : 'bg-muted'}`}>
              <Avatar className="w-20 h-20 border-2 border-background">
                <AvatarImage src={group.avatar_url || undefined} />
                <AvatarFallback>{group.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs text-muted-foreground truncate w-20 text-center">
              {group.user_id === currentUserId ? "Your Story" : group.display_name || group.username}
            </span>
          </button>
        ))}

        {storyGroups.length === 0 && (
          <p className="text-muted-foreground text-sm py-8">No stories yet. Be the first to share!</p>
        )}
      </div>

      {/* Story Viewer Modal */}
      {viewingStory && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeStory}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Story Header */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={viewingStory.group.avatar_url || undefined} />
              <AvatarFallback>{viewingStory.group.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium">{viewingStory.group.display_name || viewingStory.group.username}</p>
              <p className="text-white/60 text-xs">
                {new Date(viewingStory.group.stories[viewingStory.index].created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Progress bars */}
          <div className="absolute top-16 left-4 right-4 z-50 flex gap-1">
            {viewingStory.group.stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white transition-all duration-300 ${
                    idx < viewingStory.index ? 'w-full' : idx === viewingStory.index ? 'w-full animate-pulse' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Navigation areas */}
          <button
            onClick={prevStory}
            className="absolute left-0 top-24 bottom-24 w-1/4 z-40"
          />
          <button
            onClick={nextStory}
            className="absolute right-0 top-24 bottom-24 w-1/4 z-40"
          />

          {/* Story Image */}
          <img
            src={viewingStory.group.stories[viewingStory.index].image_url}
            alt="Story"
            className="max-h-[70vh] max-w-full object-contain"
          />

          {/* Story Comments */}
          <div className="absolute bottom-4 left-4 right-4 z-50">
            <CommentsSection 
              storyId={viewingStory.group.stories[viewingStory.index].id} 
              currentUserId={currentUserId || undefined}
              variant="story"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Stories;

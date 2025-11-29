import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth');
      return;
    }

    setCurrentUserId(session.user.id);
    fetchProfile(session.user.id);
    fetchUserPosts(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserPosts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url
          ),
          likes (
            id,
            user_id
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error("Error logging out");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-3xl p-8 mb-6">
          <div className="flex items-start gap-8">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-6">
      {/* Profile Header */}
      <div className="glass rounded-3xl p-8 mb-6 animate-fade-in">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <Avatar className="w-32 h-32 border-4 border-primary/20 transition-transform duration-300 hover:scale-105">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-4xl bg-gradient-primary text-white">
              {profile?.display_name?.[0] || profile?.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{profile?.display_name || profile?.username}</h1>
                <p className="text-muted-foreground">@{profile?.username}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="hover:scale-110 transition-all duration-200">
                  <Settings className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:scale-110 transition-all duration-200">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {profile?.bio && (
              <p className="text-sm">{profile.bio}</p>
            )}

            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-semibold">{posts.length}</span>{" "}
                <span className="text-muted-foreground">posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-12 glass rounded-3xl">
            <p className="text-muted-foreground">No posts yet. Share your first moment!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProfileModal } from "@/components/EditProfileModal";
import { Pencil, LogOut, MessageCircle, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/contexts/ChatContext";

export default function Profile() {
  const { id } = useParams<{ id: string }>(); // DYNAMIC PROFILE ID
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const navigate = useNavigate();
  const { openChat } = useChat();

  useEffect(() => {
    checkAuth();
  }, [id]); // zmeny id -> refresh

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/auth');
      return;
    }

    setCurrentUserId(session.user.id);

    if (!id) { // ak nie je id v URL -> current user
      fetchProfile(session.user.id);
    } else { // iný používateľ
      fetchProfile(id);
    }
  };

  const fetchProfile = async (userIdOrUsername: string) => {
    try {
      // Check if it's a UUID or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq(isUUID ? 'id' : 'username', userIdOrUsername)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      
      // Fetch posts and follow data using the actual user ID
      if (data) {
        fetchUserPosts(data.id);
        fetchFollowData(data.id);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const fetchFollowData = async (profileId: string) => {
    try {
      // Check if current user is following this profile
      if (currentUserId && profileId !== currentUserId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('following_id', profileId)
          .maybeSingle();
        
        setIsFollowing(!!followData);
      }

      // Get followers count
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId);

      // Get following count
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error) {
      console.error('Error fetching follow data:', error);
    }
  };

  const handleFollow = async () => {
    if (!profile?.id || !currentUserId) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id);
        
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast.success(`Unfollowed @${profile.username}`);
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: profile.id });
        
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success(`Following @${profile.username}`);
      }
    } catch (error: any) {
      toast.error('Failed to update follow status');
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

  const handleMessage = async () => {
    if (!profile?.id || !currentUserId) {
      toast.error('You must be logged in');
      return;
    }
    
    if (profile.id === currentUserId) return;

    try {
      // Check if conversation already exists
      const { data: myConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      if (myConversations) {
        for (const conv of myConversations) {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id);

          const participantIds = participants?.map(p => p.user_id) || [];
          
          if (participantIds.length === 2 && 
              participantIds.includes(currentUserId) && 
              participantIds.includes(profile.id)) {
            openChat(conv.conversation_id, {
              id: profile.id,
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url
            });
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: currentUserId },
          { conversation_id: newConversation.id, user_id: profile.id }
        ]);

      openChat(newConversation.id, {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url
      });
    } catch (error: any) {
      toast.error(`Failed to start conversation: ${error.message}`);
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

  if (!profile) return <div>Profil nenájdený 😢</div>;

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
                {currentUserId !== profile?.id && (
                  <>
                    <Button 
                      variant={isFollowing ? "outline" : "default"} 
                      size="sm"
                      onClick={handleFollow} 
                      className="hover:scale-105 transition-all duration-200"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-1" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleMessage} className="hover:scale-110 transition-all duration-200">
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                  </>
                )}
                {currentUserId === profile?.id && (
                  <>
                    <EditProfileModal profile={profile} onProfileUpdate={() => fetchProfile(profile.id)}>
                      <Button variant="ghost" size="icon" className="hover:scale-110 transition-all duration-200">
                        <Pencil className="w-5 h-5" />
                      </Button>
                    </EditProfileModal>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:scale-110 transition-all duration-200">
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {profile?.bio && <p className="text-sm">{profile.bio}</p>}

            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-semibold">{posts.length}</span>{" "}
                <span className="text-muted-foreground">posts</span>
              </div>
              <div>
                <span className="font-semibold">{followersCount}</span>{" "}
                <span className="text-muted-foreground">followers</span>
              </div>
              <div>
                <span className="font-semibold">{followingCount}</span>{" "}
                <span className="text-muted-foreground">following</span>
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


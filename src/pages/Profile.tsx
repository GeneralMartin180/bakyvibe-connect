import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProfileModal } from "@/components/EditProfileModal";
import { Pencil, LogOut, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { id } = useParams<{ id: string }>(); // DYNAMIC PROFILE ID
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const navigate = useNavigate();

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
      
      // Fetch posts using the actual user ID
      if (data) {
        fetchUserPosts(data.id);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setLoading(false);
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
    console.log('handleMessage called', { profileId: profile?.id, currentUserId });
    
    if (!profile?.id) {
      toast.error('Profile not loaded');
      return;
    }
    
    if (!currentUserId) {
      toast.error('You must be logged in to start a conversation');
      navigate('/auth');
      return;
    }
    
    // If viewing own profile, just go to messages list
    if (profile.id === currentUserId) {
      navigate('/messages');
      return;
    }

    try {
      // Check if conversation already exists between these two users
      const { data: myConversations, error: myConvError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      console.log('My conversations:', myConversations, myConvError);

      if (myConvError) {
        console.error('Error fetching my conversations:', myConvError);
        throw myConvError;
      }

      if (myConversations && myConversations.length > 0) {
        // Check each conversation to see if the other user is in it
        for (const conv of myConversations) {
          const { data: participants, error: partError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id);

          if (partError) {
            console.error('Error fetching participants:', partError);
            continue;
          }

          const participantIds = participants?.map(p => p.user_id) || [];
          
          // If this conversation has exactly 2 participants and includes both users
          if (participantIds.length === 2 && 
              participantIds.includes(currentUserId) && 
              participantIds.includes(profile.id)) {
            console.log('Found existing conversation:', conv.conversation_id);
            navigate(`/chat/${conv.conversation_id}`);
            return;
          }
        }
      }

      console.log('Creating new conversation...');

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      console.log('Conversation created:', newConversation, convError);

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      if (!newConversation) {
        throw new Error('Failed to create conversation - no data returned');
      }

      // Add both participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: currentUserId },
          { conversation_id: newConversation.id, user_id: profile.id }
        ]);

      console.log('Participants added:', participantsError);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        throw participantsError;
      }

      console.log('Navigating to chat:', newConversation.id);
      navigate(`/chat/${newConversation.id}`);
      toast.success('Conversation started!');
    } catch (error: any) {
      console.error('Error in handleMessage:', error);
      toast.error(`Failed to start conversation: ${error.message || 'Unknown error'}`);
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
                  <Button variant="ghost" size="icon" onClick={handleMessage} className="hover:scale-110 transition-all duration-200">
                    <MessageCircle className="w-5 h-5" />
                  </Button>
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


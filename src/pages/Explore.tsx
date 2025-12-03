import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

export default function Explore() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchUsers();
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-12 w-full rounded-2xl mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-6">
      <div className="mb-6 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 glass border-none h-12 rounded-2xl focus:shadow-glow"
            />
          </div>
      </div>

      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 glass rounded-2xl">
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <Link
              key={user.id}
              to={`/profile/${user.username}`}
              className="glass rounded-2xl p-4 flex items-center gap-4 hover-lift block animate-fade-in"
            >
              <Avatar className="w-16 h-16 border-2 border-primary/20 transition-transform duration-200 hover:scale-110">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-primary text-white text-xl">
                  {user.display_name?.[0] || user.username[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{user.display_name || user.username}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                {user.bio && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

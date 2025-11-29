import { Home, Search, PlusSquare, User, Heart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import bakyLogo from "@/assets/baky-logo.png";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover-lift">
            <img src={bakyLogo} alt="BakyChat" className="w-10 h-10" />
            <h1 className="text-2xl font-bold gradient-text">BakyChat</h1>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </Link>
            <Link 
              to="/explore" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/explore') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Explore</span>
            </Link>
            <Link 
              to="/create" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/create') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PlusSquare className="w-5 h-5" />
              <span className="font-medium">Create</span>
            </Link>
            <Link 
              to="/profile" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/profile') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-medium">Profile</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border/50 z-50">
        <div className="flex items-center justify-around py-3 px-4">
          <Link 
            to="/" 
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive('/') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-6 h-6" />
          </Link>
          <Link 
            to="/explore" 
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive('/explore') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Search className="w-6 h-6" />
          </Link>
          <Link 
            to="/create" 
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive('/create') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <PlusSquare className="w-6 h-6" />
          </Link>
          <Link 
            to="/profile" 
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive('/profile') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <User className="w-6 h-6" />
          </Link>
        </div>
      </nav>
    </div>
  );
};

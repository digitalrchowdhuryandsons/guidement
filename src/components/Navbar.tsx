import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Heart, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export function Navbar() {
  const { user, profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/courses?q=${encodeURIComponent(search)}`);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-28">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <img src="/logo.png" alt="" className="w-30 h-20" />
        </Link>

        <form onSubmit={handleSearch} className="hidden flex-1 md:flex max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-full bg-secondary border-0"
            />
          </div>
        </form>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/courses">
            <Button variant="ghost" size="sm">Explore</Button>
          </Link>

          {user && hasRole("instructor") && (
            <Link to="/instructor/dashboard">
              <Button variant="ghost" size="sm">Teach</Button>
            </Link>
          )}
          {!user && (
            <Link to="/become-instructor">
              <Button variant="ghost" size="sm">Teach on Guidement</Button>
            </Link>
          )}

          <ThemeToggle />

          {user ? (
            <>
              <Link to="/wishlist">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="gradient-primary text-primary-foreground text-xs">
                        {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    My Learning
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    Profile
                  </DropdownMenuItem>
                  {hasRole("instructor") && (
                    <DropdownMenuItem onClick={() => navigate("/instructor/dashboard")}>
                      Instructor Dashboard
                    </DropdownMenuItem>
                  )}
                  {hasRole("admin") && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  {hasRole("super_admin" as any) && (
                    <DropdownMenuItem onClick={() => navigate("/super-admin")}>
                      <span className="flex items-center gap-1.5">Super Admin</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth?tab=register">
                <Button size="sm" className="gradient-primary text-primary-foreground rounded-full">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-auto"
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileMenu && (
        <div className="border-t md:hidden p-4 space-y-3 animate-fade-in">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
          <Link to="/courses" className="block py-2" onClick={() => setMobileMenu(false)}>Explore</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="block py-2" onClick={() => setMobileMenu(false)}>My Learning</Link>
              <button onClick={() => { signOut(); setMobileMenu(false); }} className="block py-2 text-destructive">Sign Out</button>
            </>
          ) : (
            <Link to="/auth" className="block py-2" onClick={() => setMobileMenu(false)}>Sign In</Link>
          )}
        </div>
      )}
    </nav>
  );
}

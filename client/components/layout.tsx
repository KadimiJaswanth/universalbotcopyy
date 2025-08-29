import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-primary">
              Universal Bot
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive("/") ? "text-primary" : "text-muted-foreground",
                )}
              >
                Home
              </Link>
              <Link
                to="/chatbot"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive("/chatbot")
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                Chatbot
              </Link>
              <Link
                to="/settings"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive("/settings")
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link to="/login">
              <Button>Sign in</Button>
            </Link>
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground">
              © 2024 Universal Bot. All rights reserved.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                to="/about"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Contact
              </Link>
              <Link
                to="/privacy"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

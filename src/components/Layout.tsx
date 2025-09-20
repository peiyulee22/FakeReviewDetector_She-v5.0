import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-card-border/20 bg-background-secondary/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 text-primary group-hover:animate-glow transition-all">
              <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 16H13V18H11V16ZM12 6C9.79 6 8 7.79 8 10H10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 12 11 11.75 11 15H13C13 12.75 16 12.5 16 10C16 7.79 14.21 6 12 6Z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              Review Verifier
            </h1>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="text-sm font-medium text-foreground-secondary hover:text-primary transition-colors"
            >
              Home
            </Link>
            <a 
              href="#" 
              className="text-sm font-medium text-foreground-secondary hover:text-primary transition-colors"
            >
              About
            </a>
            <a 
              href="#" 
              className="text-sm font-medium text-foreground-secondary hover:text-primary transition-colors"
            >
              Contact
            </a>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-accent-hover transition-all transform hover:scale-105">
              Get Started
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="border-t border-card-border/20 bg-background-secondary">
        <div className="container mx-auto px-6 py-4 text-center text-sm text-foreground-muted">
          © 2024 Review Verifier. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
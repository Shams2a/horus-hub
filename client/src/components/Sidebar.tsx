import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Tablet, 
  Wifi, 
  MessageSquare,
  ScrollText,
  Settings,
  X,
  Cloud,
  HardDrive
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { toggleDarkMode, isDarkMode } = useTheme();
  
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };

  const isActive = (path: string) => location === path;

  return (
    <aside 
      className={`w-64 bg-sidebar fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col h-full`}
      style={{ backgroundColor: 'hsl(var(--sidebar-background))' }}
    >
      {/* Logo Section */}
      <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center">
          <HardDrive className="h-6 w-6 mr-2 text-sidebar-foreground" />
          <span className="text-xl font-bold text-sidebar-foreground">Horus Hub</span>
        </div>
        <button 
          className="md:hidden text-sidebar-foreground focus:outline-none" 
          onClick={() => setOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          <li>
            <Link 
              href="/" 
              onClick={closeSidebarOnMobile}
              className={`flex items-center p-2 rounded-md transition-colors duration-200 ${
                isActive('/') 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-border'
              }`}
            >
              <LayoutDashboard className="h-5 w-5 mr-3" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/devices" 
              onClick={closeSidebarOnMobile}
              className={`flex items-center p-2 rounded-md transition-colors duration-200 ${
                isActive('/devices') 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-border'
              }`}
            >
              <Tablet className="h-5 w-5 mr-3" />
              <span>Tablet</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/zigbee" 
              onClick={closeSidebarOnMobile}
              className={`flex items-center p-2 rounded-md transition-colors duration-200 ${
                isActive('/zigbee') 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-border'
              }`}
            >
              <Wifi className="h-5 w-5 mr-3" />
              <span>Zigbee</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/wifi" 
              onClick={closeSidebarOnMobile}
              className={`flex items-center p-2 rounded-md transition-colors duration-200 ${
                isActive('/wifi') 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-border'
              }`}
            >
              <Wifi className="h-5 w-5 mr-3" />
              <span>Wi-Fi</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/mqtt" 
              onClick={closeSidebarOnMobile}
              className={`flex items-center p-2 rounded-md transition-colors duration-200 ${
                isActive('/mqtt') 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-border'
              }`}
            >
              <Cloud className="h-5 w-5 mr-3" />
              <span>MQTT</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/logs" 
              onClick={closeSidebarOnMobile}
              className={`flex items-center p-2 rounded-md transition-colors duration-200 ${
                isActive('/logs') 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-border'
              }`}
            >
              <ScrollText className="h-5 w-5 mr-3" />
              <span>Logs</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/settings" 
              onClick={closeSidebarOnMobile}
              className={`flex items-center p-2 rounded-md transition-colors duration-200 ${
                isActive('/settings') 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-border'
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      {/* Bottom Section */}
      <div className="p-4 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-sidebar-foreground opacity-75">v1.0.0</span>
          <button 
            onClick={toggleDarkMode} 
            className="p-1 rounded-md text-sidebar-foreground hover:bg-sidebar-border"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

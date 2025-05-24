import { Menu, Bell } from "lucide-react";
import { useLocation } from "wouter";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [location] = useLocation();
  
  const getPageTitle = () => {
    switch (location) {
      case '/':
        return 'Dashboard';
      case '/devices':
        return 'Devices';
      case '/zigbee':
        return 'Zigbee Devices';
      case '/wifi':
        return 'Wi-Fi Devices';
      case '/mqtt':
        return 'MQTT Configuration';
      case '/logs':
        return 'System Logs';
      case '/settings':
        return 'Settings';
      default:
        return 'Horus Hub';
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <h2 className="text-xl font-medium ml-4 lg:ml-0">{getPageTitle()}</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="hidden md:block text-sm text-gray-600 dark:text-gray-400">Connected to Raspberry Pi</span>
        </div>
      </div>
    </header>
  );
}

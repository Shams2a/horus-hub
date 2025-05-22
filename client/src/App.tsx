import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Zigbee from "./pages/Zigbee";
import Wifi from "./pages/Wifi";
import Mqtt from "./pages/Mqtt";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Locations from "./pages/Locations";
import AdapterManagement from "./pages/AdapterManagement";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="flex-1 p-4 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/devices" component={Devices} />
            <Route path="/locations" component={Locations} />
            <Route path="/adapters" component={AdapterManagement} />
            <Route path="/zigbee" component={Zigbee} />
            <Route path="/wifi" component={Wifi} />
            <Route path="/mqtt" component={Mqtt} />
            <Route path="/logs" component={Logs} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      
      {/* Mobile page shade when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;

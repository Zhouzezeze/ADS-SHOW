import React from 'react';
import { LayoutDashboard, ShoppingCart, BarChart3, Settings, Bug } from 'lucide-react';
import type { Platform } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentPlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, currentPlatform, onPlatformChange }) => {
  const menuItems = [
    { id: 'total', label: '总览概括', icon: LayoutDashboard, view: 'dashboard' },
    { id: 'shopee', label: 'Shopee广告', icon: ShoppingCart, view: 'dashboard' },
    { id: 'amazon', label: 'Amazon广告', icon: BarChart3, view: 'dashboard' },
    { id: 'settings', label: '设置', icon: Settings, view: 'settings' },
    { id: 'debug', label: '调试', icon: Bug, view: 'debug' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          广告监控看板
        </h1>
      </div>
      
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const isActive = (item.view === 'settings' && currentView === 'settings') || 
                           (item.view === 'dashboard' && currentView === 'dashboard' && currentPlatform === item.id);
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.view);
                if (item.view === 'dashboard') onPlatformChange(item.id as Platform);
              }}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-6 text-slate-500 text-xs border-t border-slate-800">
        版本号 v1.0.0
      </div>
    </div>
  );
};

export default Sidebar;

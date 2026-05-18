import React from 'react';
import { LayoutDashboard, ShoppingCart, BarChart3, Settings } from 'lucide-react';

interface SidebarProps {
  activePlatform: string;
  setActivePlatform: (platform: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePlatform, setActivePlatform }) => {
  const menuItems = [
    { id: 'total', label: '总览概括', icon: LayoutDashboard },
    { id: 'shopee', label: 'Shopee 广告', icon: ShoppingCart },
    { id: 'amazon', label: 'Amazon 广告', icon: BarChart3 },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen text-white flex flex-col fixed left-0 top-0">
      <div className="p-6 text-xl font-bold border-b border-slate-800">
        跨境广告看板
      </div>
      <nav className="flex-1 mt-6 px-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePlatform(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              activePlatform === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-6 text-xs text-slate-500 border-t border-slate-800">
        v1.0.0
      </div>
    </div>
  );
};

export default Sidebar;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Search, Users, Settings as SettingsIcon, BookOpen, Bookmark, User, Compass } from 'lucide-react';
import { UserProfile } from '../services/store';

export type TabType = 'home' | 'discover' | 'search' | 'mylist' | 'community' | 'settings' | 'music';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentUser: UserProfile | null;
  onNavigateProfile: () => void;
  onOpenAuth?: () => void;
}

export default function BottomNav({ 
  activeTab, 
  onChangeTab, 
  currentUser, 
  onNavigateProfile, 
  onOpenAuth 
}: BottomNavProps) {
  
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'discover' as TabType, label: 'Discover', icon: Compass },
    { id: 'search' as TabType, label: 'Search', icon: Search },
    { id: 'mylist' as TabType, label: 'My List', icon: Bookmark },
    { id: 'community' as TabType, label: 'Community', icon: Users },
    { id: 'settings' as TabType, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 md:top-0 md:left-0 md:bottom-0 md:right-auto md:w-20 bg-[#040405]/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-zinc-900/60 z-40 py-2.5 px-4 md:py-8 flex flex-row md:flex-col items-center justify-around md:justify-start md:items-center gap-1 md:gap-6 shadow-2xl safe-bottom transition-all">
      
      {/* Brand logo in Sidebar for Desktop - Icons only / Clean mark */}
      <div className="hidden md:flex flex-col items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-800 flex items-center justify-center font-black text-xs text-white shadow-lg shadow-red-650/15">
          AP
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-row md:flex-col items-center justify-around md:justify-start w-full gap-1 md:gap-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav_${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 cursor-pointer transition-all duration-200 outline-none group rounded-xl md:p-3 relative ${
                isActive ? 'text-[#ef4444]' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={tab.label}
            >
              <div className={`p-1 rounded-xl transition-all duration-300 shrink-0 ${
                isActive ? 'bg-red-950/10 text-red-500 scale-110 shadow-md' : 'group-hover:scale-105'
              }`}>
                <Icon className="w-5.5 h-5.5" />
              </div>
              
              {/* Hide names on desktop, pc, and TV, show them only on mobile navigation items */}
              <span className="text-[9px] md:hidden font-black tracking-wider uppercase leading-none mt-1">
                {tab.label}
              </span>

              {/* Active side indicator tag on desktop */}
              {isActive && (
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-red-655 rounded-l-md animate-fade-in text-[#ef4444]" />
              )}
            </button>
          );
        })}
      </div>

    </nav>
  );
}

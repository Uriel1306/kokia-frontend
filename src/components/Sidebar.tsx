import { Archive, ListMusic, Mic } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { Tab } from '../types';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: Dispatch<SetStateAction<Tab>>;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="w-20 md:w-64 bg-white border-l border-slate-200 flex flex-col items-center md:items-stretch py-8 px-4 gap-8 shadow-sm z-20">
      <div className="hidden md:block px-4">
        <h2 className="text-xl font-bold text-blue-600">תפריט</h2>
      </div>

      <nav className="flex flex-col gap-2 w-full">
        <button
          onClick={() => setActiveTab('recordings')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
            activeTab === 'recordings' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Mic className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">יצירת הקלטות</span>
        </button>

        <button
          onClick={() => setActiveTab('scenarios')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
            activeTab === 'scenarios' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <ListMusic className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">יצירת תרחיש</span>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
            activeTab === 'archive' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Archive className="w-5 h-5" />
          <span className="hidden md:inline font-bold font-brand">ארכיון הקלטות</span>
        </button>
      </nav>
    </aside>
  );
}

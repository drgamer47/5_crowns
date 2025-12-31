import { useState } from 'react';
import { 
  ClipboardDocumentListIcon,
  SquaresPlusIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import Scoresheet from './components/Scoresheet';
import MeldHelper from './components/MeldHelper';
import PlayGame from './components/PlayGame';

type Tab = 'scoresheet' | 'meldhelper' | 'playgame';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scoresheet');

  const getTabName = (tab: Tab): string => {
    switch (tab) {
      case 'scoresheet': return 'Scoresheet';
      case 'meldhelper': return 'Meld Helper';
      case 'playgame': return 'Play Game';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {(['scoresheet', 'meldhelper', 'playgame'] as Tab[]).map(tab => (
              <button
                key={tab}
                className={`px-6 py-4 font-semibold text-base border-b-4 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'scoresheet' && <ClipboardDocumentListIcon className="w-5 h-5 inline-block mr-2" />}
                {tab === 'meldhelper' && <SquaresPlusIcon className="w-5 h-5 inline-block mr-2" />}
                {tab === 'playgame' && <PlayIcon className="w-5 h-5 inline-block mr-2" />}
                {getTabName(tab)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="py-6">
        {activeTab === 'scoresheet' && <Scoresheet />}
        {activeTab === 'meldhelper' && <MeldHelper />}
        {activeTab === 'playgame' && <PlayGame />}
      </div>
    </div>
  );
}


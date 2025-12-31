import { useState, useEffect } from 'react';
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
  const [isPlayGameEnabled, setIsPlayGameEnabled] = useState(() => {
    const saved = localStorage.getItem('playGameEnabled');
    return saved === 'true';
  });
  const [showConfirmToast, setShowConfirmToast] = useState(false);
  const [showSimpleToast, setShowSimpleToast] = useState(false);
  const [simpleToastMessage, setSimpleToastMessage] = useState('');

  const getTabName = (tab: Tab): string => {
    switch (tab) {
      case 'scoresheet': return 'Scoresheet';
      case 'meldhelper': return 'Meld Helper';
      case 'playgame': return 'Play Game';
    }
  };

  // Auto-dismiss simple toast after 3 seconds
  useEffect(() => {
    if (showSimpleToast) {
      const timer = setTimeout(() => {
        setShowSimpleToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSimpleToast]);

  // If Play Game is disabled and user is on that tab, switch to Scoresheet
  useEffect(() => {
    if (!isPlayGameEnabled && activeTab === 'playgame') {
      setActiveTab('scoresheet');
    }
  }, [isPlayGameEnabled, activeTab]);

  const handleToggle = () => {
    if (!isPlayGameEnabled) {
      // Enabling - show confirmation
      setShowConfirmToast(true);
    } else {
      // Disabling - do it immediately
      setIsPlayGameEnabled(false);
      localStorage.setItem('playGameEnabled', 'false');
      setSimpleToastMessage('Play Game mode disabled');
      setShowSimpleToast(true);
    }
  };

  const handleEnable = () => {
    setIsPlayGameEnabled(true);
    localStorage.setItem('playGameEnabled', 'true');
    setShowConfirmToast(false);
  };

  const handleCancel = () => {
    setShowConfirmToast(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {(['scoresheet', 'meldhelper', ...(isPlayGameEnabled ? ['playgame'] : [])] as Tab[]).map(tab => (
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
            
            {/* Play Game Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 hidden sm:inline">Play Game Mode</span>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isPlayGameEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={handleToggle}
                aria-label="Toggle Play Game mode"
                role="switch"
                aria-checked={isPlayGameEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPlayGameEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-6 pt-24">
        {activeTab === 'scoresheet' && <Scoresheet />}
        {activeTab === 'meldhelper' && <MeldHelper isPlayGameEnabled={isPlayGameEnabled} />}
        {activeTab === 'playgame' && isPlayGameEnabled && <PlayGame />}
      </div>

      {/* Confirmation Toast */}
      {showConfirmToast && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 z-50 max-w-sm">
          <p className="text-sm font-medium text-gray-900 mb-2">
            Enable Play Game mode?
          </p>
          <p className="text-xs text-gray-600 mb-3">
            This will sync your current hand with the game.
          </p>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm transition-colors"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition-colors"
              onClick={handleEnable}
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Simple Toast */}
      {showSimpleToast && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 z-50">
          <p className="text-sm text-gray-900">{simpleToastMessage}</p>
        </div>
      )}
    </div>
  );
}


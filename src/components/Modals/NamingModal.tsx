import { AnimatePresence, motion } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';

interface NamingModalProps {
  show: boolean;
  setShowNamingModal: Dispatch<SetStateAction<boolean>>;
  scenarioName: string;
  setScenarioName: Dispatch<SetStateAction<string>>;
  confirmFinalizeMerge: () => void;
}

export default function NamingModal({
  show,
  setShowNamingModal,
  scenarioName,
  setScenarioName,
  confirmFinalizeMerge,
}: NamingModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowNamingModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">שמור את התרחיש</h2>
              <p className="text-slate-500">בחר שם לתרחיש המאוחד לפני ההעלאה לשרת.</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="למשל: תרחיש אימון בוקר"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && confirmFinalizeMerge()}
              />
              <div className="flex gap-4">
                <button
                  onClick={confirmFinalizeMerge}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-2xl font-bold hover:bg-green-700 transition-all"
                >
                  שמור תרחיש
                </button>
                <button
                  onClick={() => setShowNamingModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

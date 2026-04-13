import { AnimatePresence, motion } from 'motion/react';
import { Radio } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

interface ConflictModalProps {
  show: boolean;
  setShowConflictModal: Dispatch<SetStateAction<boolean>>;
  mergeTimelines: (autoFix?: boolean) => void;
  show: boolean;
  setShowConflictModal: React.Dispatch<React.SetStateAction<boolean>>;
  mergeTimelines: (autoFix?: boolean) => void;
}

export default function ConflictModal({ show, setShowConflictModal, mergeTimelines }: ConflictModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowConflictModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Radio className="w-8 h-8 text-amber-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">זוהתה התנגשות!</h2>
              <p className="text-slate-500">נמצאו הקלטות חופפות בין צירי זמן שונים. כיצד תרצה להמשיך?</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => mergeTimelines(true)}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex flex-col items-center"
              >
                פתח איחוד אוטומטי
              </button>
              <button
                onClick={() => setShowConflictModal(false)}
                className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                חזור ותעדכן צירים
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

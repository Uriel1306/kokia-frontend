import { AnimatePresence, motion } from 'motion/react';
import { Play, Pause, Edit, Trash2, Download } from 'lucide-react';
import { Recording } from '../../types';
import AudioPlayer from '../Common/AudioPlayer';

interface RecordingCardProps {
  recording: Recording;
  isPlaying: boolean;
  isEditing: boolean;
  editValue: string;
  onTogglePlay: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onEditValueChange: (value: string) => void;
  formatTime: (seconds: number) => string;
}

export default function RecordingCard({
  recording,
  isPlaying,
  isEditing,
  editValue,
  onTogglePlay,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDownload,
  onEditValueChange,
  formatTime,
}: RecordingCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-blue-200 transition-all group"
    >
      <div className="flex items-center gap-4">
        <AudioPlayer
          isPlaying={isPlaying}
          onToggle={onTogglePlay}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-slate-600 border border-slate-200 hover:text-blue-600 hover:border-blue-300'
          }`}
          label={isPlaying ? 'עצור השמעה' : 'הפעל הקלטה'}
        />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => onEditValueChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={onSaveEdit}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  שמור
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-slate-900 truncate">{recording.title || recording.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{formatTime(recording.duration)}</p>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onStartEdit}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="ערוך שם"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDownload}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="הורד הקלטה"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              title="מחק הקלטה"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
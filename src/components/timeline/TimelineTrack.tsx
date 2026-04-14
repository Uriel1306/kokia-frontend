import { motion } from 'motion/react';
import { GripVertical, Clock, Radio, Trash2 } from 'lucide-react';
import { TimelineItem } from '../../types';
import { formatFrequencyForDisplay } from '../../utils/audioUtils';

interface TimelineTrackProps {
  item: TimelineItem;
  isActive: boolean;
  onRemove: () => void;
  onUpdateDelay?: (newDuration: number) => void;
}

export default function TimelineTrack({
  item,
  isActive,
  onRemove,
  onUpdateDelay,
}: TimelineTrackProps) {
  return (
    <motion.div
      layout
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isActive
          ? 'bg-blue-50 border-blue-300 shadow-sm'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
        <div className={`w-3 h-3 rounded-full ${item.type === 'audio' ? 'bg-blue-500' : 'bg-slate-400'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">{item.name}</span>
          {item.type === 'audio' && item.frequency && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Radio className="w-3 h-3" />
              <span>{formatFrequencyForDisplay(item.frequency)} MHz</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
          <Clock className="w-3 h-3" />
          <span>{item.type === 'delay' ? item.seconds : item.duration}s</span>
        </div>
      </div>

      {item.type === 'delay' && onUpdateDelay && (
        <input
          type="number"
          step="0.1"
          min="0.5"
          value={item.duration}
          onChange={(e) => onUpdateDelay(parseFloat(e.target.value) || 0.5)}
          className="w-16 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}

      <button
        onClick={onRemove}
        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
        title="הסר פריט"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
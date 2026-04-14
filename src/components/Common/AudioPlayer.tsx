import { Pause, Play } from 'lucide-react';

interface AudioPlayerProps {
  isPlaying: boolean;
  onToggle: () => void;
  currentTime?: number;
  duration?: number;
  className?: string;
  label?: string;
}

// פונקציית עזר לעיצוב הזמן (00:00)
function formatPlayerTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ 
  isPlaying, 
  onToggle, 
  currentTime = 0,
  duration = 0,
  className = '', 
  label 
}: AudioPlayerProps) {
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showTime = isPlaying || currentTime > 0;

  return (
    <div className="flex items-center gap-3">
      <button onClick={onToggle} className={className} type="button">
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        {label ? <span className="sr-only">{label}</span> : null}
      </button>

      {/* תצוגת זמנים (טיימר) - מופיע רק כשיש זמן אמת לנגן */}
      {showTime && duration > 0 && (
        <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-mono tracking-wide">
          {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
        </div>
      )}

      {/* פס התקדמות דקיק וחלק בתחתית */}
      {(isPlaying || progress > 0) && (
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-200 z-0">
          <div 
            className="bg-blue-600 h-full transition-all duration-[50ms] ease-linear"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
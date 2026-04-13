import { Pause, Play } from 'lucide-react';

interface AudioPlayerProps {
  isPlaying: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
}

export default function AudioPlayer({ isPlaying, onToggle, className = '', label }: AudioPlayerProps) {
  return (
    <button onClick={onToggle} className={className} type="button">
      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      {label ? <span className="sr-only">{label}</span> : null}
    </button>
  );
}

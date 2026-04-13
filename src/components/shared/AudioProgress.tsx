import { formatTime } from '../../utils/audioUtils';

interface AudioProgressProps {
  current: number;
  total: number;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export default function AudioProgress({ current, total, onClick }: AudioProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-mono text-slate-500 px-1">
        <span>{formatTime(Math.floor(current))}</span>
        <span>{formatTime(Math.floor(total))}</span>
      </div>
      <div
        className="relative h-2 bg-slate-200 rounded-full cursor-pointer overflow-hidden"
        onClick={onClick}
      >
        <div
          className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
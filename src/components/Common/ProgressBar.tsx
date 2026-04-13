import { motion } from 'motion/react';

interface ProgressBarProps {
  current: number;
  total: number;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export default function ProgressBar({ current, total, onClick }: ProgressBarProps) {
  const width = total > 0 ? `${(current / total) * 100}%` : '0%';

  return (
    <div className="h-3 bg-slate-100 rounded-full overflow-hidden cursor-pointer relative group" onClick={onClick}>
      <motion.div
        className="absolute inset-y-0 right-0 bg-blue-500"
        initial={false}
        animate={{ width }}
        transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
      />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-blue-400/10 transition-opacity" />
    </div>
  );
}

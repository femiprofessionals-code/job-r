import { cn, formatScore, scoreColor } from '@/lib/utils';

export function MatchScore({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white',
        scoreColor(score),
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {formatScore(score)} match
    </span>
  );
}

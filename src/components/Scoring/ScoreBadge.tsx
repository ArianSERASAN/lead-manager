import { getScoreColor, getScoreBgColor, getScoreLabel } from '../../utils/format';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function ScoreBadge({ score, size = 'md', showTooltip = false }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const scoreColor = getScoreColor(score);
  const scoreBgColor = getScoreBgColor(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <div className="relative inline-block" aria-label={`Puntuación: ${score} — ${scoreLabel}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white border tabular-nums transition-all duration-200 md:hover:scale-110 ${scoreBgColor} ${
          score >= 80 ? 'bg-emerald-600 shadow-sm shadow-emerald-400/40' :
          score >= 60 ? 'bg-primary-600 shadow-sm shadow-primary-400/30' :
          score >= 40 ? 'bg-amber-600' :
          'bg-gray-400'
        }`}
      >
        {score}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs font-semibold rounded whitespace-nowrap pointer-events-none">
          {scoreLabel}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

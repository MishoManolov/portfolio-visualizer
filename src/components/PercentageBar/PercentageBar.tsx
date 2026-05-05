import type { DisplayMode } from '../../types';
import './PercentageBar.css';

interface PercentageBarProps {
  relativePercent: number;
  absolutePercent: number;
  displayMode: DisplayMode;
  isValid: boolean;
  hasChildren: boolean;
}

export function PercentageBar({
  relativePercent,
  absolutePercent,
  displayMode,
  isValid,
  hasChildren,
}: PercentageBarProps) {
  const value = displayMode === 'relative' ? relativePercent : absolutePercent;
  const colorClass = !isValid && hasChildren
    ? 'percentage-bar__fill--danger'
    : 'percentage-bar__fill--default';

  return (
    <div className="percentage-bar" aria-label={`${value.toFixed(1)}%`}>
      <div
        className={`percentage-bar__fill ${colorClass}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

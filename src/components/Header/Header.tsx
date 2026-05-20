import { useState } from 'react';
import type { DisplayMode } from '../../types';
import './Header.css';

interface HeaderProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
  tolerance: number;
  onSetTolerance: (t: number) => void;
}

export function Header({ displayMode, onToggleMode, tolerance, onSetTolerance }: HeaderProps) {
  const [localTolerance, setLocalTolerance] = useState(String(tolerance));

  function handleToleranceBlur() {
    const val = parseFloat(localTolerance.replace(',', '.'));
    if (isNaN(val) || val < 0 || val > 100) {
      setLocalTolerance(String(tolerance));
      return;
    }
    if (val !== tolerance) onSetTolerance(val);
  }

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__title-group">
          <h1 className="header__title">Portfolio Visualizer</h1>
          <p className="header__subtitle">Interactive allocation tree</p>
        </div>
        <div className="header__controls">
          <span className="header__mode-label">Show:</span>
          <div className="header__toggle" role="group" aria-label="Percentage display mode">
            <button
              className={`header__toggle-btn ${displayMode === 'relative' ? 'header__toggle-btn--active' : ''}`}
              onClick={() => displayMode !== 'relative' && onToggleMode()}
              aria-pressed={displayMode === 'relative'}
            >
              Relative %
            </button>
            <button
              className={`header__toggle-btn ${displayMode === 'absolute' ? 'header__toggle-btn--active' : ''}`}
              onClick={() => displayMode !== 'absolute' && onToggleMode()}
              aria-pressed={displayMode === 'absolute'}
            >
              Absolute %
            </button>
          </div>

          <div className="header__divider" />

          <span className="header__mode-label">Drift tolerance:</span>
          <div className="header__tolerance-wrap">
            <input
              type="text"
              inputMode="decimal"
              className="header__tolerance-input"
              value={localTolerance}
              onChange={e => setLocalTolerance(e.target.value)}
              onBlur={handleToleranceBlur}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              aria-label="Drift tolerance in percent"
            />
            <span className="header__tolerance-unit">%</span>
          </div>
        </div>
      </div>
    </header>
  );
}

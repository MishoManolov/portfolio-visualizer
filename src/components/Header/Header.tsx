import type { DisplayMode } from '../../types';
import './Header.css';

interface HeaderProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
}

export function Header({ displayMode, onToggleMode }: HeaderProps) {
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
        </div>
      </div>
    </header>
  );
}

import type { DisplayMode, LayoutMode } from '../../types';
import './Header.css';

interface HeaderProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
  layoutMode: LayoutMode;
  onToggleLayout: () => void;
}

export function Header({ displayMode, onToggleMode, layoutMode, onToggleLayout }: HeaderProps) {
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

          <span className="header__mode-label">Layout:</span>
          <div className="header__toggle" role="group" aria-label="Tree layout direction">
            <button
              className={`header__toggle-btn header__toggle-btn--icon ${layoutMode === 'vertical' ? 'header__toggle-btn--active' : ''}`}
              onClick={() => layoutMode !== 'vertical' && onToggleLayout()}
              aria-pressed={layoutMode === 'vertical'}
              title="Vertical layout"
            >
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="5" y="1" width="8" height="5" rx="1.2" />
                <line x1="9" y1="6" x2="9" y2="9" />
                <line x1="4" y1="9" x2="14" y2="9" />
                <rect x="1" y="9" width="7" height="5" rx="1.2" />
                <rect x="10" y="9" width="7" height="5" rx="1.2" />
              </svg>
              Vertical
            </button>
            <button
              className={`header__toggle-btn header__toggle-btn--icon ${layoutMode === 'horizontal' ? 'header__toggle-btn--active' : ''}`}
              onClick={() => layoutMode !== 'horizontal' && onToggleLayout()}
              aria-pressed={layoutMode === 'horizontal'}
              title="Horizontal layout"
            >
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="1" y="6.5" width="5" height="5" rx="1.2" />
                <line x1="6" y1="9" x2="9" y2="9" />
                <line x1="9" y1="4" x2="9" y2="14" />
                <rect x="9" y="1.5" width="8" height="5" rx="1.2" />
                <rect x="9" y="11.5" width="8" height="5" rx="1.2" />
              </svg>
              Horizontal
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

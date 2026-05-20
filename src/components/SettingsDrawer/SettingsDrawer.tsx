import { useState } from 'react';
import type { DisplayMode } from '../../types';
import './SettingsDrawer.css';

interface SettingsDrawerProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
  tolerance: number;
  onSetTolerance: (t: number) => void;
}

export function SettingsDrawer({ displayMode, onToggleMode, tolerance, onSetTolerance }: SettingsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      <button
        className="settings-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Open settings"
        title="Settings"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <line x1="12" y1="3" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="12" y1="17.5" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="3" y1="12" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="17.5" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="settings-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`settings-drawer${isOpen ? ' settings-drawer--open' : ''}`}
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
      >
        <div className="settings-drawer__header">
          <span className="settings-drawer__title">Settings</span>
          <button
            className="settings-drawer__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close settings"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="settings-drawer__body">
          <section className="settings-section">
            <div className="settings-section__label">Percentage display</div>
            <div className="settings-toggle" role="group" aria-label="Percentage display mode">
              <button
                className={`settings-toggle__btn${displayMode === 'relative' ? ' settings-toggle__btn--active' : ''}`}
                onClick={() => displayMode !== 'relative' && onToggleMode()}
                aria-pressed={displayMode === 'relative'}
              >
                Relative %
              </button>
              <button
                className={`settings-toggle__btn${displayMode === 'absolute' ? ' settings-toggle__btn--active' : ''}`}
                onClick={() => displayMode !== 'absolute' && onToggleMode()}
                aria-pressed={displayMode === 'absolute'}
              >
                Absolute %
              </button>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section__label">Drift tolerance</div>
            <div className="settings-tolerance">
              <input
                type="text"
                inputMode="decimal"
                className="settings-tolerance__input"
                value={localTolerance}
                onChange={e => setLocalTolerance(e.target.value)}
                onBlur={handleToleranceBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                aria-label="Drift tolerance in percent"
              />
              <span className="settings-tolerance__unit">%</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

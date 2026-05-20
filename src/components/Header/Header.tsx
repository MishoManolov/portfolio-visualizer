import type { DisplayMode } from '../../types';
import { SettingsDrawer } from '../SettingsDrawer/SettingsDrawer';
import './Header.css';

interface HeaderProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
  tolerance: number;
  onSetTolerance: (t: number) => void;
}

export function Header({ displayMode, onToggleMode, tolerance, onSetTolerance }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__inner">
        <SettingsDrawer
          displayMode={displayMode}
          onToggleMode={onToggleMode}
          tolerance={tolerance}
          onSetTolerance={onSetTolerance}
        />
        <div className="header__title-group">
          <h1 className="header__title">Portfolio Visualizer</h1>
          <p className="header__subtitle">Interactive allocation tree</p>
        </div>
      </div>
    </header>
  );
}

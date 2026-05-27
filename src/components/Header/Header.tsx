import type { DisplayMode, ComputedNode, PortfolioAction, PortfolioNode } from '../../types';
import { SettingsDrawer } from '../SettingsDrawer/SettingsDrawer';
import './Header.css';

interface HeaderProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
  tolerance: number;
  onSetTolerance: (t: number) => void;
  cash: number;
  onSetCash: (v: number) => void;
  computedRoot: ComputedNode;
  portfolioRoot: PortfolioNode;
  dispatch: React.Dispatch<PortfolioAction>;
  hideValues: boolean;
  onToggleHideValues: () => void;
}

export function Header({
  displayMode, onToggleMode, tolerance, onSetTolerance,
  cash, onSetCash, computedRoot, portfolioRoot, dispatch,
  hideValues, onToggleHideValues,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header__inner">
        <SettingsDrawer
          displayMode={displayMode}
          onToggleMode={onToggleMode}
          tolerance={tolerance}
          onSetTolerance={onSetTolerance}
          cash={cash}
          onSetCash={onSetCash}
          computedRoot={computedRoot}
          portfolioRoot={portfolioRoot}
          dispatch={dispatch}
          hideValues={hideValues}
          onToggleHideValues={onToggleHideValues}
        />
        <div className="header__title-group">
          <h1 className="header__title">Portfolio Visualizer</h1>
          <p className="header__subtitle">Interactive allocation tree</p>
        </div>
      </div>
    </header>
  );
}

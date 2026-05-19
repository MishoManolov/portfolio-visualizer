import type { ComputedNode, DisplayMode } from '../../types';
import { PercentageBar } from '../PercentageBar/PercentageBar';
import { formatPercent } from '../../utils/calculations';
import './NodeCard.css';

interface NodeCardProps {
  node: ComputedNode;
  displayMode: DisplayMode;
  isRoot: boolean;
  isAddFormOpen: boolean;
  isOverlapFocused?: boolean;
  onToggleExpand: () => void;
  onAddChild: () => void;
  onCardBodyClick?: () => void;
}

export function NodeCard({
  node,
  displayMode,
  isRoot,
  isAddFormOpen,
  isOverlapFocused = false,
  onToggleExpand,
  onAddChild,
  onCardBodyClick,
}: NodeCardProps) {
  const hasChildren = node.children.length > 0;
  const isInvalid = !node.isValid && hasChildren;
  const activePercent = displayMode === 'relative' ? node.relativePercent : node.absolutePercent;
  const otherPercent = displayMode === 'relative' ? node.absolutePercent : node.relativePercent;
  const otherLabel = displayMode === 'relative' ? 'abs' : 'rel';

  function handleCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    onCardBodyClick?.();
  }

  function stopProp(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className={`node-card
        ${!hasChildren ? 'node-card--leaf' : ''}
        ${isInvalid ? 'node-card--invalid' : ''}
        ${isRoot ? 'node-card--root' : ''}
        ${isOverlapFocused ? 'node-card--overlap-focused' : ''}
        ${onCardBodyClick ? 'node-card--clickable' : ''}
      `.replace(/\s+/g, ' ').trim()}
      onClick={onCardBodyClick ? handleCardClick : undefined}
    >
      <div className="node-card__main">
        <button
          className={`node-card__expand-btn ${hasChildren ? '' : 'node-card__expand-btn--invisible'}`}
          onClick={(e) => { stopProp(e); onToggleExpand(); }}
          aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={node.isExpanded}
          disabled={!hasChildren}
        >
          <svg
            className={`node-card__chevron ${node.isExpanded ? 'node-card__chevron--open' : ''}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </button>

        <div className="node-card__content">
          <div className="node-card__top">
            <span className="node-card__name">{node.name}</span>
            <div className="node-card__percent-group">
              <span className={`node-card__percent ${isInvalid ? 'node-card__percent--danger' : ''}`}>
                {formatPercent(activePercent)}
              </span>
              <span className="node-card__percent-secondary">
                {otherLabel}: {formatPercent(otherPercent)}
              </span>
            </div>
          </div>
          <PercentageBar
            relativePercent={node.relativePercent}
            absolutePercent={node.absolutePercent}
            displayMode={displayMode}
            isValid={node.isValid}
            hasChildren={hasChildren}
          />
          {isInvalid && (
            <div className="node-card__validation-error">
              Children sum: {formatPercent(node.childrenSum)} (must be 100%)
            </div>
          )}
        </div>

        <div className="node-card__actions" onClick={stopProp}>
          <button
            className={`node-card__action-btn node-card__action-btn--add ${isAddFormOpen ? 'node-card__action-btn--active' : ''}`}
            onClick={onAddChild}
            aria-label="Add child allocation"
            title="Add child allocation"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

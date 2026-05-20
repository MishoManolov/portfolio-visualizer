import type { ComputedNode, DisplayMode } from '../../types';
import { PercentageBar } from '../PercentageBar/PercentageBar';
import { formatPercent, formatValue } from '../../utils/calculations';
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
  const isDrifted = displayMode === 'relative' ? node.isRelativeDrifted : node.isAbsoluteDrifted;
  const actualPercent = displayMode === 'relative'
    ? (node.actualRelativePercent ?? node.actualAbsolutePercent)
    : node.actualAbsolutePercent;
  const mainPercent = node.valueIsTracked && actualPercent !== null ? actualPercent : activePercent;

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
              <span className={`node-card__percent ${isInvalid ? 'node-card__percent--danger' : ''} ${isDrifted ? 'node-card__percent--drifted' : ''}`}>
                {formatPercent(mainPercent)}
              </span>
              {isDrifted && (
                <span className="node-card__drift-icon" title="Allocation drifted from target">
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
                    <path d="M8 1.5a.5.5 0 0 1 .437.257l6 10.5A.5.5 0 0 1 14 13H2a.5.5 0 0 1-.437-.743l6-10.5A.5.5 0 0 1 8 1.5zM8 5.5a.5.5 0 0 0-.5.5v2.5a.5.5 0 0 0 1 0V6a.5.5 0 0 0-.5-.5zm0 5.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
                  </svg>
                </span>
              )}
            </div>
          </div>
          {node.valueIsTracked && (
            <div className="node-card__target-row">
              target: {formatPercent(activePercent)}
            </div>
          )}
          {node.valueIsTracked && (
            <div className="node-card__value-row">
              value: {formatValue(node.aggregatedValue)}
              {node.isValuePartial && <span className="node-card__value-partial">*</span>}
            </div>
          )}
          <PercentageBar
            relativePercent={node.relativePercent}
            absolutePercent={node.absolutePercent}
            displayMode={displayMode}
            isValid={node.isValid}
            hasChildren={hasChildren}
          />
          {isInvalid && (
            <div className="node-card__validation-error">
              Children sum: {formatPercent(node.childrenSum)}
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

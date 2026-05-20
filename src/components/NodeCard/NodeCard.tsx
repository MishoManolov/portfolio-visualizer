import { useState, useRef, useEffect } from 'react';
import type { ComputedNode, DisplayMode } from '../../types';
import { PercentageBar } from '../PercentageBar/PercentageBar';
import { formatPercent, formatValue } from '../../utils/calculations';
import './NodeCard.css';

interface NodeCardProps {
  node: ComputedNode;
  displayMode: DisplayMode;
  isRoot: boolean;
  isOverlapFocused?: boolean;
  onToggleExpand: () => void;
  onUpdateValue?: (newValue: number) => void;
  onCardBodyClick?: () => void;
}

type TxMode = 'deposit' | 'withdraw' | null;

export function NodeCard({
  node,
  displayMode,
  isRoot,
  isOverlapFocused = false,
  onToggleExpand,
  onUpdateValue,
  onCardBodyClick,
}: NodeCardProps) {
  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren;
  const isInvalid = !node.isValid && hasChildren;
  const activePercent = displayMode === 'relative' ? node.relativePercent : node.absolutePercent;
  const isDrifted = displayMode === 'relative' ? node.isRelativeDrifted : node.isAbsoluteDrifted;
  const actualPercent = displayMode === 'relative'
    ? (node.actualRelativePercent ?? node.actualAbsolutePercent)
    : node.actualAbsolutePercent;
  const mainPercent = node.valueIsTracked && actualPercent !== null ? actualPercent : activePercent;

  const [txMode, setTxMode] = useState<TxMode>(null);
  const [amountStr, setAmountStr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (txMode) inputRef.current?.focus();
  }, [txMode]);

  function openMode(mode: TxMode, e: React.MouseEvent) {
    e.stopPropagation();
    if (txMode === mode) { setTxMode(null); setAmountStr(''); return; }
    setTxMode(mode);
    setAmountStr('');
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    const current = node.currentValue ?? 0;
    const next = txMode === 'deposit'
      ? current + amount
      : Math.max(0, current - amount);
    onUpdateValue?.(next);
    setTxMode(null);
    setAmountStr('');
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setTxMode(null);
    setAmountStr('');
  }

  function handleCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    onCardBodyClick?.();
  }

  function stopProp(e: React.MouseEvent) { e.stopPropagation(); }

  return (
    <div
      className={[
        'node-card',
        isLeaf ? 'node-card--leaf' : '',
        isInvalid ? 'node-card--invalid' : '',
        isRoot ? 'node-card--root' : '',
        isOverlapFocused ? 'node-card--overlap-focused' : '',
        onCardBodyClick ? 'node-card--clickable' : '',
      ].filter(Boolean).join(' ')}
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
            viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </button>

        <div className="node-card__content">
          <div className="node-card__top">
            <span className="node-card__name">{node.name}</span>
            <div className="node-card__percent-group">
              <span className={`node-card__percent${isInvalid ? ' node-card__percent--danger' : ''}${isDrifted ? ' node-card__percent--drifted' : ''}`}>
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

          {/* ── Deposit / Withdraw ──────────────────────────────── */}
          {isLeaf && onUpdateValue && (
            <div className="node-card__tx" onClick={stopProp}>
              <div className="node-card__tx-btns">
                <button
                  className={`node-card__tx-btn node-card__tx-btn--deposit${txMode === 'deposit' ? ' node-card__tx-btn--active' : ''}`}
                  onClick={e => openMode('deposit', e)}
                  title="Deposit"
                >
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="7" y1="2" x2="7" y2="12" />
                    <line x1="2" y1="7" x2="12" y2="7" />
                  </svg>
                  Deposit
                </button>
                <button
                  className={`node-card__tx-btn node-card__tx-btn--withdraw${txMode === 'withdraw' ? ' node-card__tx-btn--active' : ''}`}
                  onClick={e => openMode('withdraw', e)}
                  title="Withdraw"
                >
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="2" y1="7" x2="12" y2="7" />
                  </svg>
                  Withdraw
                </button>
              </div>

              {txMode && (
                <form className="node-card__tx-form" onSubmit={handleSubmit}>
                  <span className="node-card__tx-label">
                    {txMode === 'deposit' ? '+' : '−'}
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    className="node-card__tx-input"
                    placeholder="0"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') { setTxMode(null); setAmountStr(''); } }}
                    aria-label={`${txMode} amount`}
                  />
                  <button type="submit" className="node-card__tx-confirm" aria-label="Confirm">
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 7 6 11 12 3" />
                    </svg>
                  </button>
                  <button type="button" className="node-card__tx-cancel" onClick={handleCancel} aria-label="Cancel">
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="3" y1="3" x2="11" y2="11" />
                      <line x1="11" y1="3" x2="3" y2="11" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

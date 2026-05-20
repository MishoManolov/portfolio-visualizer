import { useState, useEffect } from 'react';
import type { DisplayMode, ComputedNode, PortfolioAction } from '../../types';
import { computeRebalancePlan, type RebalancePlan, type RebalanceOperation } from '../../utils/rebalance';
import { formatValue, formatPercent } from '../../utils/calculations';
import './SettingsDrawer.css';

interface SettingsDrawerProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
  tolerance: number;
  onSetTolerance: (t: number) => void;
  cash: number;
  onSetCash: (v: number) => void;
  computedRoot: ComputedNode;
  dispatch: React.Dispatch<PortfolioAction>;
}

function findNode(node: ComputedNode, id: string): ComputedNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function SettingsDrawer({
  displayMode, onToggleMode, tolerance, onSetTolerance,
  cash, onSetCash, computedRoot, dispatch,
}: SettingsDrawerProps) {
  const investedCapital = computedRoot.aggregatedValue;
  const [isOpen, setIsOpen] = useState(false);
  const [localTolerance, setLocalTolerance] = useState(String(tolerance));
  const [localCash, setLocalCash] = useState(cash !== 0 ? String(cash) : '');
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // Keep localCash in sync when cash changes externally (e.g. after fulfilling an operation)
  useEffect(() => {
    setLocalCash(cash !== 0 ? String(Math.round(cash * 100) / 100) : '');
  }, [cash]);

  // Auto-recompute plan whenever relevant state changes, but only if plan is visible
  useEffect(() => {
    if (plan !== null) {
      setPlan(computeRebalancePlan(computedRoot, tolerance, cash));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedRoot, tolerance, cash]);

  function handleToleranceBlur() {
    const val = parseFloat(localTolerance.replace(',', '.'));
    if (isNaN(val) || val < 0 || val > 100) { setLocalTolerance(String(tolerance)); return; }
    if (val !== tolerance) onSetTolerance(val);
  }

  function handleCashBlur() {
    const val = parseFloat(localCash.replace(',', '.').replace(/\s/g, ''));
    if (isNaN(val)) { setLocalCash(cash !== 0 ? String(cash) : ''); return; }
    if (val !== cash) onSetCash(val);
  }

  function handleSuggest() {
    setPlan(computeRebalancePlan(computedRoot, tolerance, cash));
    setMethodologyOpen(false);
  }

  function handleFulfill(op: RebalanceOperation) {
    const node = findNode(computedRoot, op.assetId);
    if (!node) return;
    const current = node.aggregatedValue;

    if (op.type === 'withdraw') {
      dispatch({ type: 'UPDATE_NODE', nodeId: op.assetId, updates: { currentValue: Math.max(0, current - op.amount) } });
      onSetCash(Math.round((cash + op.amount) * 100) / 100);
    } else {
      if (cash < op.amount) return;
      dispatch({ type: 'UPDATE_NODE', nodeId: op.assetId, updates: { currentValue: current + op.amount } });
      onSetCash(Math.round((cash - op.amount) * 100) / 100);
    }
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

      {isOpen && <div className="settings-backdrop" onClick={() => setIsOpen(false)} aria-hidden="true" />}

      <div className={`settings-drawer${isOpen ? ' settings-drawer--open' : ''}`} role="dialog" aria-label="Settings" aria-modal="true">
        <div className="settings-drawer__header">
          <span className="settings-drawer__title">Settings</span>
          <button className="settings-drawer__close" onClick={() => setIsOpen(false)} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="settings-drawer__body">

          {/* ── Capital ──────────────────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-section__label">Portfolio capital</div>
            <div className="settings-capital-grid">
              <div className="settings-capital-row settings-capital-row--readonly">
                <span className="settings-capital-row__label">Invested</span>
                <span className="settings-capital-row__value">
                  {investedCapital > 0 ? investedCapital.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                </span>
              </div>
              <label className="settings-capital-row">
                <span className="settings-capital-row__label">
                  Cash
                  {cash < 0 && <span className="settings-capital-row__hint"> (reducing)</span>}
                  {cash > 0 && <span className="settings-capital-row__hint"> (growing)</span>}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="settings-capital-row__input"
                  placeholder="0"
                  value={localCash}
                  onChange={e => setLocalCash(e.target.value)}
                  onBlur={handleCashBlur}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  aria-label="Cash balance (positive = growing, negative = reducing)"
                />
              </label>
            </div>
          </section>

          {/* ── Display mode ─────────────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-section__label">Percentage display</div>
            <div className="settings-toggle" role="group">
              <button
                className={`settings-toggle__btn${displayMode === 'relative' ? ' settings-toggle__btn--active' : ''}`}
                onClick={() => displayMode !== 'relative' && onToggleMode()}
                aria-pressed={displayMode === 'relative'}
              >Relative %</button>
              <button
                className={`settings-toggle__btn${displayMode === 'absolute' ? ' settings-toggle__btn--active' : ''}`}
                onClick={() => displayMode !== 'absolute' && onToggleMode()}
                aria-pressed={displayMode === 'absolute'}
              >Absolute %</button>
            </div>
          </section>

          {/* ── Drift tolerance ───────────────────────────────────── */}
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

          {/* ── Rebalancing ───────────────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-section__label">Rebalancing</div>
            <button className="settings-rebalance-btn" onClick={handleSuggest}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Suggest Re-allocations
            </button>

            {plan && (
              <RebalancePlanView
                plan={plan}
                tolerance={tolerance}
                currentCash={cash}
                methodologyOpen={methodologyOpen}
                onToggleMethodology={() => setMethodologyOpen(o => !o)}
                onFulfill={handleFulfill}
              />
            )}
          </section>

        </div>
      </div>
    </>
  );
}

/* ── Rebalance result panel ──────────────────────────────────── */

function RebalancePlanView({
  plan, tolerance, currentCash, methodologyOpen, onToggleMethodology, onFulfill,
}: {
  plan: RebalancePlan;
  tolerance: number;
  currentCash: number;
  methodologyOpen: boolean;
  onToggleMethodology: () => void;
  onFulfill: (op: RebalanceOperation) => void;
}) {
  const withdrawals = plan.operations.filter(o => o.type === 'withdraw');
  const deposits    = plan.operations.filter(o => o.type === 'deposit');

  return (
    <div className="rebalance-result">

      {/* Methodology toggle */}
      <button className="rebalance-methodology-toggle" onClick={onToggleMethodology}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16" r="0.8" fill="currentColor" />
        </svg>
        How is this calculated?
        <svg className={`rebalance-chevron${methodologyOpen ? ' rebalance-chevron--open' : ''}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {methodologyOpen && (
        <div className="rebalance-methodology">
          <p>
            Each asset's <strong>target value</strong> is derived from its allocation percentage applied to the total capital (invested + cash balance).
          </p>
          <p>
            Assets above their target by more than the {tolerance}% tolerance generate a <strong>Withdraw</strong> operation. Assets below target generate a <strong>Deposit</strong> operation.
            Withdrawals are listed first — completing them replenishes the cash balance which can then fund deposits.
          </p>
          <p>
            A <strong>positive cash balance</strong> means you want to grow the portfolio, widening each asset's target. A <strong>negative cash balance</strong> signals a planned reduction, shrinking each target — so assets that are now relatively overweight need to be withdrawn.
          </p>
          <p>
            Fulfilling an operation updates the asset value and adjusts the cash balance automatically. Deposits are blocked when the cash balance is insufficient.
          </p>
        </div>
      )}

      {plan.status === 'no-values' && (
        <p className="rebalance-empty">
          No asset values are tracked. Enter current market values for your leaf assets (via the side panel) to get rebalancing suggestions.
        </p>
      )}

      {plan.status === 'in-tolerance' && (
        <div className="rebalance-ok">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All {plan.trackedLeafCount} assets are within the {tolerance}% tolerance.
        </div>
      )}

      {plan.status === 'ok' && (
        <>
          {withdrawals.length > 0 && (
            <div className="rebalance-group">
              <div className="rebalance-group__label rebalance-group__label--withdraw">
                Withdrawals
              </div>
              {withdrawals.map(op => (
                <OperationRow key={op.assetId} op={op} currentCash={currentCash} onFulfill={onFulfill} />
              ))}
            </div>
          )}

          {deposits.length > 0 && (
            <div className="rebalance-group">
              <div className="rebalance-group__label rebalance-group__label--deposit">
                Deposits
              </div>
              {deposits.map(op => (
                <OperationRow key={op.assetId} op={op} currentCash={currentCash} onFulfill={onFulfill} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OperationRow({ op, currentCash, onFulfill }: {
  op: RebalanceOperation;
  currentCash: number;
  onFulfill: (op: RebalanceOperation) => void;
}) {
  const isDeposit = op.type === 'deposit';
  const canFulfill = !isDeposit || currentCash >= op.amount;

  return (
    <div className={`rebalance-op rebalance-op--${op.type}`}>
      <div className="rebalance-op__icon" aria-hidden="true">
        {isDeposit ? '+' : '−'}
      </div>
      <div className="rebalance-op__body">
        <span className="rebalance-op__name">{op.assetName}</span>
        <span className="rebalance-op__amount">
          {formatValue(op.amount)}{' '}
          <span className="rebalance-op__pct">({formatPercent(op.portfolioPercent)})</span>
        </span>
      </div>
      <button
        className={`rebalance-op__fulfill${canFulfill ? '' : ' rebalance-op__fulfill--disabled'}`}
        onClick={() => canFulfill && onFulfill(op)}
        disabled={!canFulfill}
        title={canFulfill ? `Fulfill ${op.type}` : `Insufficient cash (need ${formatValue(op.amount)}, have ${formatValue(currentCash)})`}
      >
        {canFulfill ? '▶' : '⊘'}
      </button>
    </div>
  );
}

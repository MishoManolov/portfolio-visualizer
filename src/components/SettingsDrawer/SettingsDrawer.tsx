import { useState, useEffect, useRef } from 'react';
import type { DisplayMode, ComputedNode, PortfolioAction, PortfolioNode, NodeMetrics } from '../../types';
import { computeRebalancePlan, type RebalancePlan, type RebalanceOperation } from '../../utils/rebalance';
import { formatValue, formatPercent } from '../../utils/calculations';
import './SettingsDrawer.css';

interface PortfolioFile {
  version: number;
  root: PortfolioNode;
  tolerance?: number;
  cash?: number;
}

interface SettingsDrawerProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
  tolerance: number;
  onSetTolerance: (t: number) => void;
  cash: number;
  onSetCash: (v: number) => void;
  computedRoot: ComputedNode;
  portfolioRoot: PortfolioNode;
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

function isValidNode(obj: unknown): obj is PortfolioNode {
  if (typeof obj !== 'object' || obj === null) return false;
  const n = obj as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.name === 'string' &&
    typeof n.relativePercent === 'number' &&
    Array.isArray(n.children) &&
    (n.children as unknown[]).every(isValidNode)
  );
}

function normalizeNode(obj: Record<string, unknown>): PortfolioNode {
  return {
    id: obj.id as string,
    name: obj.name as string,
    relativePercent: obj.relativePercent as number,
    isExpanded: (obj.isExpanded as boolean | undefined) ?? false,
    description: obj.description as string | undefined,
    metrics: obj.metrics as NodeMetrics | undefined,
    currentValue: obj.currentValue as number | undefined,
    children: (obj.children as Record<string, unknown>[]).map(normalizeNode),
  };
}

export function SettingsDrawer({
  displayMode, onToggleMode, tolerance, onSetTolerance,
  cash, onSetCash, computedRoot, portfolioRoot, dispatch,
}: SettingsDrawerProps) {
  const investedCapital = computedRoot.aggregatedValue;
  const [isOpen, setIsOpen] = useState(false);
  const [localTolerance, setLocalTolerance] = useState(String(tolerance));
  const [localCash, setLocalCash] = useState(cash !== 0 ? String(cash) : '');
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep localCash in sync when cash changes externally (e.g. after fulfilling an operation)
  useEffect(() => {
    setLocalCash(cash !== 0 ? String(Math.round(cash * 100) / 100) : '');
  }, [cash]);

  // Auto-recompute plan when the portfolio or settings change, but NOT when the
  // user edits cash manually. Cash is intentionally omitted from deps: when a
  // fulfill operation fires it changes both computedRoot and cash simultaneously,
  // so the effect re-runs (due to computedRoot) and picks up the new cash value
  // from the current render closure. A standalone cash edit must not auto-show
  // suggestions the user hasn't asked for yet.
  useEffect(() => {
    if (plan !== null) {
      setPlan(computeRebalancePlan(computedRoot, tolerance, cash, displayMode));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedRoot, tolerance, displayMode]);

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
    setPlan(computeRebalancePlan(computedRoot, tolerance, cash, displayMode));
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

  function handleAutoRebalance() {
    const livePlan = computeRebalancePlan(computedRoot, tolerance, cash, displayMode);
    if (livePlan.status !== 'ok' || livePlan.operations.length === 0) return;

    // All dispatches go to the reducer in the same batch; each uses the
    // pre-operation aggregatedValue from computedRoot (correct, since React
    // hasn't re-rendered yet). Cash is accumulated sequentially here instead.
    let newCash = cash;
    for (const op of livePlan.operations) {
      const node = findNode(computedRoot, op.assetId);
      if (!node) continue;
      const current = node.aggregatedValue;

      if (op.type === 'withdraw') {
        dispatch({ type: 'UPDATE_NODE', nodeId: op.assetId, updates: { currentValue: Math.max(0, current - op.amount) } });
        newCash += op.amount;
      } else {
        if (newCash < op.amount) continue;
        dispatch({ type: 'UPDATE_NODE', nodeId: op.assetId, updates: { currentValue: current + op.amount } });
        newCash -= op.amount;
      }
    }
    onSetCash(Math.round(newCash * 100) / 100);
    setPlan(null);
  }

  function handleExport() {
    const file: PortfolioFile = { version: 1, root: portfolioRoot, tolerance, cash };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-imported if needed
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as unknown;
        if (typeof raw !== 'object' || raw === null) throw new Error('Invalid file structure.');
        const data = raw as Record<string, unknown>;
        if (!isValidNode(data.root)) throw new Error('File does not contain a valid portfolio tree.');
        dispatch({
          type: 'IMPORT_PORTFOLIO',
          root: normalizeNode(data.root as unknown as Record<string, unknown>),
          tolerance: typeof data.tolerance === 'number' ? data.tolerance : undefined,
          cash: typeof data.cash === 'number' ? data.cash : undefined,
        });
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Could not read file.');
      }
    };
    reader.onerror = () => setImportError('Could not read file.');
    reader.readAsText(file);
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
          <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

          {/* ── Capital & tolerance ──────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-section__label">Portfolio</div>
            <div className="settings-capital-grid">
              <div className="settings-capital-row settings-capital-row--readonly">
                <span className="settings-capital-row__label">Invested</span>
                <span className="settings-capital-row__value">
                  {investedCapital > 0 ? investedCapital.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
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
              <label className="settings-capital-row">
                <span className="settings-capital-row__label">Drift tolerance</span>
                <div className="settings-capital-row__right">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="settings-capital-row__input settings-capital-row__input--narrow"
                    value={localTolerance}
                    onChange={e => setLocalTolerance(e.target.value)}
                    onBlur={handleToleranceBlur}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    aria-label="Drift tolerance in percent"
                  />
                  <span className="settings-capital-row__unit">%</span>
                </div>
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

          {/* ── Rebalancing ───────────────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-section__label">Rebalancing</div>
            <div className="settings-rebalance-actions">
              <button className="settings-rebalance-btn" onClick={handleSuggest}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Suggest
              </button>
              <button className="settings-rebalance-btn settings-rebalance-btn--auto" onClick={handleAutoRebalance}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M13 2L4 13h7l-1 9 10-12h-7l1-8z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Auto Apply
              </button>
            </div>

            {plan && (
              <RebalancePlanView
                plan={plan}
                tolerance={tolerance}
                displayMode={displayMode}
                currentCash={cash}
                methodologyOpen={methodologyOpen}
                onToggleMethodology={() => setMethodologyOpen(o => !o)}
                onFulfill={handleFulfill}
              />
            )}
          </section>

          {/* ── Export / Import ───────────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-section__label">Portfolio file</div>
            <div className="settings-rebalance-actions">
              <button className="settings-rebalance-btn" onClick={handleExport}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Export
              </button>
              <button className="settings-rebalance-btn settings-rebalance-btn--auto" onClick={handleImportClick}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 21V8M7 13l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 5h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Import
              </button>
            </div>
            {importError && (
              <p className="settings-import-error">{importError}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </section>

        </div>
      </div>
    </>
  );
}

/* ── Rebalance result panel ──────────────────────────────────── */

function RebalancePlanView({
  plan, tolerance, displayMode, currentCash, methodologyOpen, onToggleMethodology, onFulfill,
}: {
  plan: RebalancePlan;
  tolerance: number;
  displayMode: DisplayMode;
  currentCash: number;
  methodologyOpen: boolean;
  onToggleMethodology: () => void;
  onFulfill: (op: RebalanceOperation) => void;
}) {
  const withdrawals = plan.operations.filter(o => o.type === 'withdraw');
  const deposits    = plan.operations.filter(o => o.type === 'deposit');

  const toleranceLabel = displayMode === 'relative'
    ? `${tolerance}% of each asset's own target`
    : `${tolerance}% of total capital`;

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
            The drift band is currently in <strong>{displayMode === 'relative' ? 'relative' : 'absolute'} mode</strong> ({toleranceLabel}
            {displayMode === 'relative'
              ? ' — larger positions get proportionally more slack'
              : ' — every asset gets the same fixed band'
            }).
            Assets outside their band generate a <strong>Withdraw</strong> (overweight) or <strong>Deposit</strong> (underweight) operation.
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

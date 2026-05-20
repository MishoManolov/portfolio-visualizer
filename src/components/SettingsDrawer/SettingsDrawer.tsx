import { useState } from 'react';
import type { DisplayMode, ComputedNode } from '../../types';
import { computeRebalancePlan, type RebalancePlan } from '../../utils/rebalance';
import { formatValue, formatPercent } from '../../utils/calculations';
import './SettingsDrawer.css';

interface SettingsDrawerProps {
  displayMode: DisplayMode;
  onToggleMode: () => void;
  tolerance: number;
  onSetTolerance: (t: number) => void;
  investedCapital: number;
  onSetInvestedCapital: (v: number) => void;
  cash: number;
  onSetCash: (v: number) => void;
  computedRoot: ComputedNode;
}

export function SettingsDrawer({
  displayMode, onToggleMode, tolerance, onSetTolerance,
  investedCapital, onSetInvestedCapital, cash, onSetCash,
  computedRoot,
}: SettingsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localTolerance, setLocalTolerance] = useState(String(tolerance));
  const [localInvested, setLocalInvested] = useState(investedCapital > 0 ? String(investedCapital) : '');
  const [localCash, setLocalCash] = useState(cash > 0 ? String(cash) : '');
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  function handleToleranceBlur() {
    const val = parseFloat(localTolerance.replace(',', '.'));
    if (isNaN(val) || val < 0 || val > 100) {
      setLocalTolerance(String(tolerance));
      return;
    }
    if (val !== tolerance) onSetTolerance(val);
  }

  function handleCapitalBlur(raw: string, current: number, setter: (v: number) => void) {
    const val = parseFloat(raw.replace(',', '.').replace(/\s/g, ''));
    if (isNaN(val) || val < 0) { return; }
    if (val !== current) setter(val);
  }

  function handleSuggest() {
    setPlan(computeRebalancePlan(computedRoot, tolerance, cash));
    setMethodologyOpen(false);
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

          {/* ── Capital ──────────────────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-section__label">Portfolio capital</div>
            <div className="settings-capital-grid">
              <label className="settings-capital-row">
                <span className="settings-capital-row__label">Invested</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="settings-capital-row__input"
                  placeholder="0"
                  value={localInvested}
                  onChange={e => setLocalInvested(e.target.value)}
                  onBlur={() => handleCapitalBlur(localInvested, investedCapital, onSetInvestedCapital)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  aria-label="Invested capital"
                />
              </label>
              <label className="settings-capital-row">
                <span className="settings-capital-row__label">Cash</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="settings-capital-row__input"
                  placeholder="0"
                  value={localCash}
                  onChange={e => setLocalCash(e.target.value)}
                  onBlur={() => handleCapitalBlur(localCash, cash, onSetCash)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  aria-label="Cash (uninvested capital)"
                />
              </label>
            </div>
          </section>

          {/* ── Display mode ─────────────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-section__label">Percentage display</div>
            <div className="settings-toggle" role="group" aria-label="Percentage display mode">
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

            {plan && <RebalancePlanView plan={plan} tolerance={tolerance} onToggleMethodology={() => setMethodologyOpen(o => !o)} methodologyOpen={methodologyOpen} />}
          </section>

        </div>
      </div>
    </>
  );
}

/* ── Rebalance result panel ──────────────────────────────────── */

function RebalancePlanView({
  plan, tolerance, methodologyOpen, onToggleMethodology,
}: {
  plan: RebalancePlan;
  tolerance: number;
  methodologyOpen: boolean;
  onToggleMethodology: () => void;
}) {
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
            For each asset with a tracked value, we compute the difference between its <strong>actual current value</strong> and its <strong>target value</strong> (derived from the target allocation percentages).
          </p>
          <p>
            Assets holding <em>more</em> than their target are marked as <strong>sell</strong>; assets holding <em>less</em> are marked as <strong>buy</strong>. We then pair the most overweight seller with the most underweight buyer, transferring the smaller of the two amounts. This exhausts at least one asset per step, giving the <strong>minimum possible number of transfers</strong>.
          </p>
          <p>
            Transfers target the <strong>exact allocation value</strong> (not just the edge of the tolerance band), so the result is always within your {tolerance}% tolerance.
          </p>
        </div>
      )}

      {/* Status / result */}
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
          All {plan.trackedLeafCount} assets are within the {tolerance}% tolerance. No rebalancing needed.
        </div>
      )}

      {plan.transactions.length > 0 && (
        <ol className="rebalance-list">
          {plan.transactions.map((tx, i) => (
            <li key={i} className="rebalance-item">
              <span className="rebalance-item__step">{i + 1}</span>
              <div className="rebalance-item__body">
                <span className="rebalance-item__action">
                  Withdraw <strong>{formatValue(tx.amount)}</strong>{' '}
                  <span className="rebalance-item__pct">({formatPercent(tx.portfolioPercent)} of portfolio)</span>{' '}
                  from <strong>{tx.fromName}</strong> and deposit into <strong>{tx.toName}</strong>.
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

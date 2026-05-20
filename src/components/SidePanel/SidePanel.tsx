import { useState, useEffect } from 'react';

function normalizeDecimal(s: string): string {
  return s.replace(/,/g, '.');
}
import type { ComputedNode, PortfolioAction, DisplayMode } from '../../types';
import { AddNodeForm } from '../AddNodeForm/AddNodeForm';
import { formatPercent, formatValue } from '../../utils/calculations';
import './SidePanel.css';

interface SidePanelProps {
  node: ComputedNode;
  parentNode: ComputedNode | null;
  displayMode: DisplayMode;
  dispatch: React.Dispatch<PortfolioAction>;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

function MetricInput({
  label, unit, value, onChange, onBlur,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="side-panel__field">
      <span className="side-panel__field-label">
        {label} <span className="side-panel__field-unit">({unit})</span>
      </span>
      <input
        type="text"
        inputMode="decimal"
        className="side-panel__metric-input"
        value={value}
        placeholder="—"
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
    </div>
  );
}

function MetricRow({ label, value, unit, partial }: {
  label: string;
  value: number | null;
  unit?: string;
  partial?: boolean;
}) {
  return (
    <div className="side-panel__field">
      <span className="side-panel__field-label">{label}</span>
      <span className={`side-panel__field-value${value === null || partial ? ' side-panel__field-value--secondary' : ''}`}>
        {value === null ? '—' : `${value.toFixed(1)}${unit ?? ''}`}
        {value !== null && partial && <span className="side-panel__partial-mark">*</span>}
      </span>
    </div>
  );
}

export function SidePanel({ node, parentNode, displayMode, dispatch, onClose, onNavigate }: SidePanelProps) {
  const [localName, setLocalName] = useState(node.name);
  const [localDescription, setLocalDescription] = useState(node.description ?? '');
  const [localPercent, setLocalPercent] = useState(String(node.relativePercent));
  const [percentError, setPercentError] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [localReturn, setLocalReturn] = useState(
    node.metrics?.expectedReturn != null ? String(node.metrics.expectedReturn) : ''
  );
  const [localVolatility, setLocalVolatility] = useState(
    node.metrics?.volatility != null ? String(node.metrics.volatility) : ''
  );
  const [localDrawdown, setLocalDrawdown] = useState(
    node.metrics?.maxDrawdown != null ? String(node.metrics.maxDrawdown) : ''
  );
  const [localValue, setLocalValue] = useState(
    node.currentValue != null ? String(node.currentValue) : ''
  );

  useEffect(() => {
    setLocalName(node.name);
    setLocalDescription(node.description ?? '');
    setLocalPercent(String(node.relativePercent));
    setPercentError(null);
    setShowAddChild(false);
    setLocalReturn(node.metrics?.expectedReturn != null ? String(node.metrics.expectedReturn) : '');
    setLocalVolatility(node.metrics?.volatility != null ? String(node.metrics.volatility) : '');
    setLocalDrawdown(node.metrics?.maxDrawdown != null ? String(node.metrics.maxDrawdown) : '');
    setLocalValue(node.currentValue != null ? String(node.currentValue) : '');
  }, [node.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleNameBlur() {
    const trimmed = localName.trim();
    if (!trimmed) { setLocalName(node.name); return; }
    if (trimmed !== node.name) dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { name: trimmed } });
  }

  function handleDescriptionBlur() {
    if (localDescription !== (node.description ?? '')) {
      dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { description: localDescription } });
    }
  }

  function handlePercentBlur() {
    const val = parseFloat(normalizeDecimal(localPercent));
    if (isNaN(val) || val <= 0 || val > 100) {
      setPercentError('Must be between 0.01 and 100');
      setLocalPercent(String(node.relativePercent));
      return;
    }
    setPercentError(null);
    if (val !== node.relativePercent) dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { relativePercent: val } });
  }

  function handleValueBlur() {
    if (localValue.trim() === '') {
      if (node.currentValue != null) dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { currentValue: undefined } });
      return;
    }
    const val = parseFloat(normalizeDecimal(localValue));
    if (isNaN(val) || val < 0) { setLocalValue(node.currentValue != null ? String(node.currentValue) : ''); return; }
    if (val !== node.currentValue) dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { currentValue: val } });
  }

  function saveMetric(field: 'expectedReturn' | 'volatility' | 'maxDrawdown', raw: string, current: number | undefined) {
    if (raw.trim() === '') {
      if (current != null) dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { metrics: { [field]: undefined } } });
      return;
    }
    const val = parseFloat(normalizeDecimal(raw));
    if (isNaN(val)) {
      const fallback = current != null ? String(current) : '';
      if (field === 'expectedReturn') setLocalReturn(fallback);
      else if (field === 'volatility') setLocalVolatility(fallback);
      else setLocalDrawdown(fallback);
      return;
    }
    if (val !== current) dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { metrics: { [field]: val } } });
  }

  function handleAddChild(name: string, percent: number) {
    dispatch({ type: 'ADD_NODE', parentId: node.id, name, percent });
    setShowAddChild(false);
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_NODE', nodeId: node.id });
    onClose();
  }

  const isRoot = node.depth === 0;
  const hasChildren = node.children.length > 0;
  const isInvalid = !node.isValid && hasChildren;

  const { aggregatedMetrics } = node;
  const sharpe =
    aggregatedMetrics.expectedReturn !== null &&
    aggregatedMetrics.volatility !== null &&
    aggregatedMetrics.volatility !== 0
      ? aggregatedMetrics.expectedReturn / aggregatedMetrics.volatility
      : null;
  const calmar =
    aggregatedMetrics.expectedReturn !== null &&
    aggregatedMetrics.maxDrawdown !== null &&
    aggregatedMetrics.maxDrawdown !== 0
      ? aggregatedMetrics.expectedReturn / aggregatedMetrics.maxDrawdown
      : null;

  return (
    <aside className="side-panel">
      {/* ── Header ── */}
      {/* ── Name + close ── */}
      <div className="side-panel__name-row">
        <input
          className="side-panel__name-input"
          value={localName}
          onChange={e => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          maxLength={50}
          aria-label="Node name"
        />
        <button className="side-panel__close" onClick={onClose} aria-label="Close panel">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>

      <div className="side-panel__body">
        {/* ── Allocation ── */}
        <section className="side-panel__section">
          <h3 className="side-panel__section-title">Allocation</h3>
          <div className="side-panel__field">
            <span className="side-panel__field-label">
              Relative <span className="side-panel__field-unit">(%)</span>
            </span>
            {isRoot ? (
              <span className="side-panel__field-value">{formatPercent(node.relativePercent)}</span>
            ) : (
              <input
                type="text"
                inputMode="decimal"
                className={`side-panel__percent-input${percentError ? ' side-panel__percent-input--error' : ''}`}
                value={localPercent}
                onChange={e => { setLocalPercent(e.target.value); setPercentError(null); }}
                onBlur={handlePercentBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
            )}
          </div>
          {percentError && <p className="side-panel__field-error">{percentError}</p>}
          <div className="side-panel__field">
            <span className="side-panel__field-label">Absolute</span>
            <span className="side-panel__field-value side-panel__field-value--secondary">
              {formatPercent(node.absolutePercent)}
            </span>
          </div>
          <div className="side-panel__field">
            <span className="side-panel__field-label">Depth</span>
            <span className="side-panel__field-value side-panel__field-value--secondary">
              Level {node.depth}
            </span>
          </div>
          {(() => {
            const actualPercent = displayMode === 'relative' ? node.actualRelativePercent : node.actualAbsolutePercent;
            const drift = displayMode === 'relative' ? node.relativeDrift : node.absoluteDrift;
            const isDrifted = displayMode === 'relative' ? node.isRelativeDrifted : node.isAbsoluteDrifted;
            if (actualPercent === null) return null;
            return (
              <>
                <div className="side-panel__field">
                  <span className="side-panel__field-label">Actual</span>
                  <span className="side-panel__field-value">{actualPercent.toFixed(2)}%</span>
                </div>
                <div className="side-panel__field">
                  <span className="side-panel__field-label">Drift</span>
                  <span className={`side-panel__field-value${isDrifted ? ' side-panel__field-value--warning' : ''}`}>
                    {drift !== null ? `${drift.toFixed(2)}%` : '—'}
                    {isDrifted && <span className="side-panel__drift-warning"> — exceeds tolerance</span>}
                  </span>
                </div>
              </>
            );
          })()}
        </section>

        {/* ── Value ── */}
        <section className="side-panel__section">
          <h3 className="side-panel__section-title">
            {hasChildren ? 'Total Value' : 'Current Value'}
          </h3>
          {hasChildren ? (
            <div className="side-panel__field">
              <span className="side-panel__field-label">Value</span>
              <span className={`side-panel__field-value${!node.valueIsTracked ? ' side-panel__field-value--secondary' : ''}`}>
                {!node.valueIsTracked ? '—' : formatValue(node.aggregatedValue)}
                {node.valueIsTracked && node.isValuePartial && (
                  <span className="side-panel__partial-mark" title="Some leaf nodes have no value set (counted as 0)">*</span>
                )}
              </span>
            </div>
          ) : (
            <div className="side-panel__field">
              <span className="side-panel__field-label">Value</span>
              <input
                type="text"
                inputMode="decimal"
                className="side-panel__metric-input"
                value={localValue}
                placeholder="—"
                onChange={e => setLocalValue(e.target.value)}
                onBlur={handleValueBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
            </div>
          )}
          {node.isValuePartial && hasChildren && (
            <p className="side-panel__metrics-note">* Partial — some leaf nodes have no value set.</p>
          )}
        </section>

        {isInvalid && (
          <div className="side-panel__warning">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2L14 13H2L8 2Z" />
              <line x1="8" y1="7" x2="8" y2="10" />
              <circle cx="8" cy="12" r="0.6" fill="currentColor" stroke="none" />
            </svg>
            Children sum to {formatPercent(node.childrenSum)}
          </div>
        )}

        {/* ── Performance metrics ── */}
        <section className="side-panel__section">
          <div className="side-panel__section-header">
            <h3 className="side-panel__section-title">
              {hasChildren ? 'Aggregated Performance' : 'Performance Metrics'}
            </h3>
            {aggregatedMetrics.isPartial && (
              <span className="side-panel__partial-badge" title="Some allocations are missing data">
                Incomplete
              </span>
            )}
          </div>

          {hasChildren ? (
            /* Parent node — read-only aggregated values */
            <>
              <MetricRow label="Exp. Return"  value={aggregatedMetrics.expectedReturn} unit="% p.a." partial={aggregatedMetrics.isPartial} />
              <MetricRow label="Volatility"   value={aggregatedMetrics.volatility}     unit="% p.a." partial={aggregatedMetrics.isPartial} />
              <MetricRow label="Max Drawdown" value={aggregatedMetrics.maxDrawdown}    unit="%"      partial={aggregatedMetrics.isPartial} />
              {sharpe  !== null && <MetricRow label="Sharpe Ratio" value={sharpe}  />}
              {calmar  !== null && <MetricRow label="Calmar Ratio" value={calmar}  />}
              <p className="side-panel__metrics-note">
                Weighted averages from {node.children.length} children.
                Volatility and drawdown assume full correlation.
                {aggregatedMetrics.isPartial && ' * Partial data.'}
              </p>
            </>
          ) : (
            /* Leaf node — editable inputs */
            <>
              <MetricInput label="Exp. Return"  unit="% p.a." value={localReturn}    onChange={setLocalReturn}    onBlur={() => saveMetric('expectedReturn', localReturn,    node.metrics?.expectedReturn)} />
              <MetricInput label="Volatility"   unit="% p.a." value={localVolatility} onChange={setLocalVolatility} onBlur={() => saveMetric('volatility',     localVolatility, node.metrics?.volatility)} />
              <MetricInput label="Max Drawdown" unit="%"       value={localDrawdown}  onChange={setLocalDrawdown}  onBlur={() => saveMetric('maxDrawdown',    localDrawdown,   node.metrics?.maxDrawdown)} />
              {sharpe !== null && <MetricRow label="Sharpe Ratio" value={sharpe} />}
              {calmar !== null && <MetricRow label="Calmar Ratio" value={calmar} />}
            </>
          )}
        </section>

        {/* ── Notes ── */}
        <section className="side-panel__section">
          <h3 className="side-panel__section-title">Notes</h3>
          <textarea
            className="side-panel__description"
            value={localDescription}
            onChange={e => setLocalDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Add notes about this allocation…"
            rows={3}
          />
        </section>

        {/* ── Parent ── */}
        {parentNode && (
          <section className="side-panel__section">
            <h3 className="side-panel__section-title">Parent</h3>
            <div className="side-panel__children-list">
              <button
                className="side-panel__child-item"
                onClick={() => onNavigate(parentNode.id)}
              >
                <span className="side-panel__child-name">{parentNode.name}</span>
                <span className="side-panel__child-percent" title="Absolute % of total portfolio">
                  {formatPercent(parentNode.absolutePercent)} of portfolio
                </span>
              </button>
            </div>
          </section>
        )}

        {/* ── Children list ── */}
        {hasChildren && (
          <section className="side-panel__section">
            <h3 className="side-panel__section-title">
              Children <span className="side-panel__section-count">({node.children.length})</span>
            </h3>
            <div className="side-panel__children-list">
              {node.children.map(child => (
                <button
                  key={child.id}
                  className="side-panel__child-item"
                  onClick={() => onNavigate(child.id)}
                >
                  <span className="side-panel__child-name">{child.name}</span>
                  <span className="side-panel__child-percent" title="Relative % of this node">
                    {formatPercent(child.relativePercent)} of parent
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Add child ── */}
        <section className="side-panel__section">
          {showAddChild ? (
            <AddNodeForm
              parentId={node.id}
              existingChildrenSum={node.childrenSum}
              onSubmit={handleAddChild}
              onCancel={() => setShowAddChild(false)}
            />
          ) : (
            <button className="side-panel__add-btn" onClick={() => setShowAddChild(true)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
              Add child allocation
            </button>
          )}
        </section>

        {/* ── Actions ── */}
        <section className="side-panel__section side-panel__section--actions">
          {hasChildren && (
            <button
              className="side-panel__action-btn"
              onClick={() => dispatch({ type: 'TOGGLE_EXPAND', nodeId: node.id })}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {node.isExpanded
                  ? <polyline points="4 6 8 10 12 6" />
                  : <polyline points="4 10 8 6 12 10" />}
              </svg>
              {node.isExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          {!isRoot && (
            <button className="side-panel__action-btn side-panel__action-btn--danger" onClick={handleDelete}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 5 13 5" />
                <path d="M5 5V3h6v2" />
                <rect x="3" y="5" width="10" height="9" rx="1" />
                <line x1="6" y1="8" x2="6" y2="11" />
                <line x1="10" y1="8" x2="10" y2="11" />
              </svg>
              Delete node
            </button>
          )}
        </section>
      </div>
    </aside>
  );
}

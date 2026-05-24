import { useState, useRef } from 'react';
import type { PortfolioAction, PortfolioNode, NodeMetrics } from '../../types';
import './WelcomePage.css';

interface WelcomePageProps {
  dispatch: React.Dispatch<PortfolioAction>;
}

const FALLBACK_NAME = 'My Portfolio';

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

export function WelcomePage({ dispatch }: WelcomePageProps) {
  const [mode, setMode] = useState<'idle' | 'creating'>('idle');
  const [name, setName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    dispatch({ type: 'CREATE_PORTFOLIO', name: name.trim() || FALLBACK_NAME });
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Could not read file.');
      }
    };
    reader.onerror = () => setImportError('Could not read file.');
    reader.readAsText(file);
  }

  return (
    <div className="welcome">
      <div className="welcome__content">
        <div className="welcome__brand">
          <svg className="welcome__logo" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            <circle cx="17" cy="6" r="5" fill="var(--color-primary)" />
            <circle cx="6" cy="27" r="4.5" fill="var(--color-primary)" opacity="0.55" />
            <circle cx="28" cy="27" r="4.5" fill="var(--color-primary)" opacity="0.55" />
            <line x1="17" y1="11" x2="17" y2="19" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="19" x2="6" y2="23" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="19" x2="28" y2="23" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1 className="welcome__title">Portfolio Visualizer</h1>
        </div>

        <p className="welcome__desc">
          Visualize your investments as a hierarchical allocation tree. Track drift from your target percentages and get rebalancing suggestions.
        </p>

        {mode === 'idle' && (
          <div className="welcome__actions">
            <button className="welcome__action" onClick={() => setMode('creating')}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
                <line x1="10" y1="6.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="6.5" y1="10" x2="13.5" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              New portfolio
            </button>
            <button className="welcome__action" onClick={handleImportClick}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 13.5V4.5M6.5 8l3.5-4 3.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 16h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Import from file
            </button>
          </div>
        )}
        {mode === 'idle' && importError && <p className="welcome__error">{importError}</p>}

        {mode === 'creating' && (
          <form className="welcome__create-form" onSubmit={handleCreate}>
            <input
              id="portfolio-name"
              className="welcome__input"
              type="text"
              placeholder={FALLBACK_NAME}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={80}
            />
            <div className="welcome__form-row">
              <button type="submit" className="welcome__action welcome__action--submit">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 10h12M11 5.5l4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Create
              </button>
              <button type="button" className="welcome__cancel" onClick={() => { setMode('idle'); setName(''); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}

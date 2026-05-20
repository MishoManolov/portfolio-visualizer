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
      <div className="welcome__card">
        <div className="welcome__brand">
          <h1 className="welcome__title">Portfolio Visualizer</h1>
          <p className="welcome__subtitle">Interactive allocation tree</p>
        </div>

        {mode === 'idle' && (
          <div className="welcome__actions">
            <button className="welcome__btn welcome__btn--primary" onClick={() => setMode('creating')}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Create new portfolio
            </button>
            <button className="welcome__btn welcome__btn--secondary" onClick={handleImportClick}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21V8M7 13l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 5h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Import portfolio
            </button>
            {importError && <p className="welcome__error">{importError}</p>}
          </div>
        )}

        {mode === 'creating' && (
          <form className="welcome__create-form" onSubmit={handleCreate}>
            <label className="welcome__field-label" htmlFor="portfolio-name">
              Portfolio name
            </label>
            <div className="welcome__field-row">
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
              <button type="submit" className="welcome__btn welcome__btn--primary welcome__btn--compact">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <button type="button" className="welcome__cancel" onClick={() => { setMode('idle'); setName(''); }}>
              Cancel
            </button>
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

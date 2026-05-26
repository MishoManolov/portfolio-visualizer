import { useState, useEffect } from 'react';
import { createSnapshot } from '../../api/portfolioApi';
import type { PortfolioNode } from '../../types';
import './ShareModal.css';

interface ShareModalProps {
  root: PortfolioNode;
  tolerance: number;
  cash: number;
  onClose: () => void;
}

type Status = 'saving' | 'success' | 'error';

export function ShareModal({ root, tolerance, cash, onClose }: ShareModalProps) {
  const [status, setStatus] = useState<Status>('saving');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    createSnapshot({ root, tolerance, cash }).then(id => {
      if (id) {
        setShareUrl(`${window.location.origin}/?share=${id}`);
        setStatus('success');
      } else {
        setStatus('error');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRetry() {
    setStatus('saving');
    setCopied(false);
    createSnapshot({ root, tolerance, cash }).then(id => {
      if (id) {
        setShareUrl(`${window.location.origin}/?share=${id}`);
        setStatus('success');
      } else {
        setStatus('error');
      }
    });
  }

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal__header">
          <span className="share-modal__title">Save &amp; Share</span>
          <button className="share-modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        {status === 'saving' && (
          <div className="share-modal__body">
            <div className="share-modal__spinner" aria-label="Saving…" />
            <p className="share-modal__status-text">Saving snapshot…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="share-modal__body">
            <div className="share-modal__success-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="var(--color-success)" strokeWidth="1.8" />
                <path d="M7 12l3.5 3.5L17 8" stroke="var(--color-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="share-modal__status-text">Snapshot saved! Anyone with this link can view it.</p>
            <div className="share-modal__url-row">
              <input
                className="share-modal__url-input"
                value={shareUrl}
                readOnly
                onFocus={e => e.target.select()}
              />
              <button className="share-modal__copy-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="share-modal__body">
            <div className="share-modal__error-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="var(--color-danger)" strokeWidth="1.8" />
                <line x1="12" y1="8" x2="12" y2="13" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="16.5" r="1" fill="var(--color-danger)" />
              </svg>
            </div>
            <p className="share-modal__status-text share-modal__status-text--error">
              Failed to save. Check your connection and try again.
            </p>
            <button className="share-modal__retry-btn" onClick={handleRetry}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { setShareMode } from '../../api/portfolioApi';
import './ShareModal.css';

interface ShareModalProps {
  portfolioId: string;
  onClose: () => void;
}

export function ShareModal({ portfolioId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState<'view' | 'edit' | null>(null);
  const [loading, setLoading] = useState<'view' | 'edit' | null>(null);

  async function handleShare(mode: 'view' | 'edit') {
    setLoading(mode);
    try {
      await setShareMode(portfolioId, mode);
      const url = `${window.location.origin}/?share=${portfolioId}&mode=${mode}`;
      await navigator.clipboard.writeText(url);
      setCopied(mode);
      setTimeout(() => setCopied(null), 2500);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal__header">
          <span className="share-modal__title">Share portfolio</span>
          <button className="share-modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        <p className="share-modal__desc">
          Generate a link — anyone with it can open this portfolio.
        </p>

        <div className="share-modal__options">
          <button
            className="share-modal__option"
            onClick={() => handleShare('view')}
            disabled={loading !== null}
          >
            <div className="share-modal__option-icon">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 4C5.5 4 2 10 2 10s3.5 6 8 6 8-6 8-6-3.5-6-8-6z" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <div className="share-modal__option-text">
              <span className="share-modal__option-label">
                {copied === 'view' ? 'Link copied!' : 'View only'}
              </span>
              <span className="share-modal__option-hint">Recipient can explore but not edit</span>
            </div>
          </button>

          <button
            className="share-modal__option"
            onClick={() => handleShare('edit')}
            disabled={loading !== null}
          >
            <div className="share-modal__option-icon">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M14 2l4 4-9 9H5v-4l9-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12 4l4 4" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <div className="share-modal__option-text">
              <span className="share-modal__option-label">
                {copied === 'edit' ? 'Link copied!' : 'Editable'}
              </span>
              <span className="share-modal__option-hint">Recipient can view and make changes</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

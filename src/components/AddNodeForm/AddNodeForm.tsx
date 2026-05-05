import { useState } from 'react';
import './AddNodeForm.css';

interface AddNodeFormProps {
  parentId: string;
  existingChildrenSum: number;
  onSubmit: (name: string, percent: number) => void;
  onCancel: () => void;
}

export function AddNodeForm({ existingChildrenSum, onSubmit, onCancel }: AddNodeFormProps) {
  const [name, setName] = useState('');
  const [percentStr, setPercentStr] = useState('');
  const [errors, setErrors] = useState<{ name?: string; percent?: string }>({});

  const remaining = Math.max(0, 100 - existingChildrenSum);
  const percentNum = parseFloat(percentStr);
  const wouldExceed = !isNaN(percentNum) && existingChildrenSum + percentNum > 100.001;

  function validate() {
    const errs: { name?: string; percent?: string } = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (percentStr === '' || isNaN(percentNum)) errs.percent = 'Enter a number';
    else if (percentNum <= 0) errs.percent = 'Must be greater than 0';
    else if (percentNum > 100) errs.percent = 'Cannot exceed 100%';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(name.trim(), percentNum);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
  }

  return (
    <form className="add-node-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
      <div className="add-node-form__header">
        <span className="add-node-form__title">Add allocation</span>
        <span className="add-node-form__remaining">
          Remaining: <strong>{remaining.toFixed(remaining % 1 === 0 ? 0 : 2)}%</strong>
        </span>
      </div>
      <div className="add-node-form__fields">
        <div className="add-node-form__field">
          <input
            type="text"
            className={`add-node-form__input ${errors.name ? 'add-node-form__input--error' : ''}`}
            placeholder="Allocation name"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: undefined })); }}
            autoFocus
            maxLength={50}
          />
          {errors.name && <span className="add-node-form__error">{errors.name}</span>}
        </div>
        <div className="add-node-form__field add-node-form__field--narrow">
          <div className="add-node-form__percent-wrap">
            <input
              type="number"
              className={`add-node-form__input add-node-form__input--percent ${errors.percent ? 'add-node-form__input--error' : ''}`}
              placeholder={remaining > 0 ? `${remaining.toFixed(remaining % 1 === 0 ? 0 : 2)}` : '0'}
              value={percentStr}
              onChange={(e) => { setPercentStr(e.target.value); setErrors((prev) => ({ ...prev, percent: undefined })); }}
              min="0.01"
              max="100"
              step="0.01"
            />
            <span className="add-node-form__percent-symbol">%</span>
          </div>
          {errors.percent && <span className="add-node-form__error">{errors.percent}</span>}
          {!errors.percent && wouldExceed && (
            <span className="add-node-form__warn">
              Will total {(existingChildrenSum + percentNum).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      <div className="add-node-form__actions">
        <button type="button" className="add-node-form__btn add-node-form__btn--cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="add-node-form__btn add-node-form__btn--submit">
          Add
        </button>
      </div>
    </form>
  );
}

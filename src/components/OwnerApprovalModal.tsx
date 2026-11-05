import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, AlertTriangle, X, Trash2, KeyRound } from 'lucide-react';

interface OwnerApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemTitle: string;
  itemSubtitle?: string;
  itemType?: 'GRN' | 'Quotation' | 'Invoice' | string;
}

export const OwnerApprovalModal: React.FC<OwnerApprovalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  itemSubtitle,
  itemType = 'Record',
}) => {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setErrorMessage('');
      setShowCode(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code) {
      setErrorMessage('Invalid Secret Code. Deletion authorization rejected.');
      return;
    }

    // Required secret approval code is strictly "19AZE" (exact case-sensitive match)
    if (code === '19AZE') {
      onConfirm();
      onClose();
    } else {
      setErrorMessage('Invalid Secret Code. Deletion authorization rejected.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 z-[999] overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 my-8 relative overflow-hidden">
        {/* Top Warning Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-rose-500/10 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-2xl border border-rose-200/80 dark:border-rose-800/60 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                Owner Authorization Required - Delete Record
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                Approval by Haradhan Patra required to permanently delete this record.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Record Details Card */}
        <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
            <span>Target {itemType} for Permanent Deletion</span>
            <span className="font-mono text-[10px] bg-rose-200 dark:bg-rose-900/70 px-1.5 py-0.2 rounded font-extrabold text-rose-900 dark:text-rose-200">
              IRREVERSIBLE
            </span>
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
            {itemTitle}
          </div>
          {itemSubtitle && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {itemSubtitle}
            </div>
          )}
        </div>

        {/* Security Code Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Enter Owner Secret Approval Code <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter secret approval code"
                autoComplete="off"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono tracking-widest focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder:text-slate-400 placeholder:tracking-normal placeholder:text-xs"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                title={showCode ? 'Hide Code' : 'Show Code'}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error Message */}
            {errorMessage ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Authorized code issued exclusively to proprietor <strong>Haradhan Patra</strong>.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Authorize &amp; Permanently Delete</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

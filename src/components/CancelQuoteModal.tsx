import React, { useState } from 'react';
import { QuotationInvoice } from '../types';
import { X, AlertCircle, Ban } from 'lucide-react';

interface CancelQuoteModalProps {
  quote: QuotationInvoice;
  onClose: () => void;
  onConfirmCancel: (reason: string) => void;
}

export const CancelQuoteModal: React.FC<CancelQuoteModalProps> = ({
  quote,
  onClose,
  onConfirmCancel,
}) => {
  const [reason, setReason] = useState(quote.cancellationReason || '');

  const PRESET_REASONS = [
    'Customer chose competitor / local vendor',
    'Quotation price exceeded customer budget',
    'Rooftop installation deferred by customer',
    'Government subsidy / Bank loan application rejected',
    'Customer site location unsuitable / shading issues',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirmCancel(reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-extrabold">
            <Ban className="w-5 h-5" />
            <h3 className="text-base text-slate-900 dark:text-slate-100">
              Cancel / Reject Quotation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300">
          You are marking <strong className="font-mono text-slate-900 dark:text-slate-100">{quote.documentNumber}</strong> ({quote.customerName}) as <strong className="text-rose-600">Cancelled</strong>.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Cancellation / Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Preset Reasons:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg transition-all text-left cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!reason.trim()}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
            >
              Confirm Cancellation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { QuotationInvoice, PaymentReceipt, Language } from '../types';
import { numberToWordsINR } from '../utils/numberToWords';
import { X, CheckCircle, CreditCard, Calendar, Hash, FileText, User, Tag, Clock, Layers } from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: QuotationInvoice;
  onClose: () => void;
  onSavePayment: (newRecord: PaymentReceipt) => void;
  lang: Language;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  onClose,
  onSavePayment,
  lang,
}) => {
  const existingPayments = invoice.payments || [];
  const currentPaid = existingPayments.reduce(
    (acc, p) => acc + (p.amount ?? p.amountPaid ?? 0),
    0
  );
  const remainingDue = Math.max(0, invoice.grandTotal - currentPaid);

  const installmentIndex = existingPayments.length + 1;
  const cleanInvNo = (invoice.documentNumber || invoice.invoiceNo || 'INV').replace(/^SLE\/(INV|QT)\//, '');
  const defaultReceiptNo = `SLE/REC/2026/${cleanInvNo}-${installmentIndex}`;

  const [receiptNo, setReceiptNo] = useState(defaultReceiptNo);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number | ''>(remainingDue > 0 ? remainingDue : 0);
  const [paymentMode, setPaymentMode] = useState<
    'UPI / GPay' | 'NEFT / RTGS' | 'Cheque' | 'Cash' | 'Bank Transfer'
  >('UPI / GPay');
  const [referenceNo, setReferenceNo] = useState('');
  const [installmentNote, setInstallmentNote] = useState<string>(
    existingPayments.length === 0
      ? 'Advance 30%'
      : remainingDue === (typeof amount === 'number' ? amount : 0)
      ? 'Final balance'
      : 'Material delivery dispatch'
  );
  const [recordedBy, setRecordedBy] = useState('Haradhan Patra');

  const numericAmount = typeof amount === 'number' ? amount : 0;
  const isOverpaying = numericAmount > remainingDue;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    const newRecord: PaymentReceipt = {
      id: `PAY-${Date.now()}`,
      receiptNo: receiptNo.trim() || defaultReceiptNo,
      receiptDate,
      date: receiptDate,
      amount: numericAmount,
      amountPaid: numericAmount,
      paymentMode,
      referenceNo: referenceNo.trim() || undefined,
      installmentNote: installmentNote.trim() || undefined,
      notes: installmentNote.trim() || undefined,
      recordedBy: recordedBy.trim() || 'Haradhan Patra',
      invoiceNo: invoice.documentNumber || invoice.invoiceNo,
    };

    onSavePayment(newRecord);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-start p-2 sm:p-4 md:p-6 z-50 overflow-y-auto">
      <div className="my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Record Invoice Payment Voucher</h3>
              <p className="text-xs text-slate-400 font-mono">Invoice Ref: {invoice.documentNumber || invoice.invoiceNo} | Installment #{installmentIndex}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Payment Status Summary */}
        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 grid grid-cols-3 gap-3 text-center font-mono">
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block uppercase font-bold">Total Invoiced</span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block uppercase font-bold">Total Collected</span>
            <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">₹{currentPaid.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block uppercase font-bold">Balance Due</span>
            <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">₹{remainingDue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Previous Payment History Timeline */}
        {existingPayments.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Prior Installments Recorded ({existingPayments.length}):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {existingPayments.map((p, idx) => {
                const pAmt = p.amount ?? p.amountPaid ?? 0;
                const pDate = p.receiptDate || p.date || '';
                const pNote = p.installmentNote || p.notes || `Installment #${idx + 1}`;
                return (
                  <div key={p.receiptNo || idx} className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[11px] flex items-center space-x-1.5 shadow-2xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">₹{pAmt.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 dark:text-slate-400 font-sans">{pNote}</span>
                    <span className="text-slate-400">({pDate})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                <Hash className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Receipt Voucher Number
              </label>
              <input
                type="text"
                required
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Receipt / Payment Date
              </label>
              <input
                type="date"
                required
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Installment Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {numericAmount > 0 && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-sans italic mt-1">
                  Rupees {numberToWordsINR(numericAmount)}
                </span>
              )}
              {isOverpaying && (
                <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                  Warning: Amount exceeds remaining balance due of ₹{remainingDue.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) =>
                  setPaymentMode(
                    e.target.value as 'UPI / GPay' | 'NEFT / RTGS' | 'Cheque' | 'Cash' | 'Bank Transfer'
                  )
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="UPI / GPay">UPI / GPay / PhonePe</option>
                <option value="NEFT / RTGS">NEFT / RTGS Transfer</option>
                <option value="Cheque">Bank Cheque</option>
                <option value="Cash">Cash Handover</option>
                <option value="Bank Transfer">Direct Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Installment Note / Stage
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {['Advance 30%', 'Material delivery dispatch', 'Structure mounting & wiring', 'WBSEDCL Net-metering', 'Final balance'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInstallmentNote(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      installmentNote === preset
                        ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-200 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="e.g. Advance 30%, Material delivery dispatch, Final balance..."
                value={installmentNote}
                onChange={(e) => setInstallmentNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Reference / UTR No / Cheque No (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UTR9823410592 or Cheque #000124"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Recorded By
            </label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={numericAmount <= 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Record Voucher &amp; Issue Receipt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

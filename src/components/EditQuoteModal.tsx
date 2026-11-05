import React, { useState } from 'react';
import { QuotationInvoice, QuotationStatus, DocumentLineItem } from '../types';
import { X, Save, AlertCircle, Calendar, IndianRupee, Sun, User, Phone, MapPin, Tag } from 'lucide-react';

interface EditQuoteModalProps {
  quote: QuotationInvoice;
  onClose: () => void;
  onSave: (updatedQuote: QuotationInvoice) => void;
}

export const EditQuoteModal: React.FC<EditQuoteModalProps> = ({
  quote,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState(quote.customerName);
  const [customerPhone, setCustomerPhone] = useState(quote.customerPhone);
  const [customerAddress, setCustomerAddress] = useState(quote.customerAddress || '');
  const [systemCapacityKw, setSystemCapacityKw] = useState<number>(quote.systemCapacityKw || 5.0);
  const [date, setDate] = useState(quote.date);
  const [validUntil, setValidUntil] = useState(quote.validUntilOrDueDate);
  const [status, setStatus] = useState<QuotationStatus>((quote.status as QuotationStatus) || 'Pending');
  const [discount, setDiscount] = useState<number>(quote.discount || 0);
  const [subsidyEstimate, setSubsidyEstimate] = useState<number>(quote.subsidyEstimate || 0);
  const [cancellationReason, setCancellationReason] = useState<string>(quote.cancellationReason || '');
  const [items, setItems] = useState<DocumentLineItem[]>(quote.items || []);

  const PRESET_CANCELLATION_REASONS = [
    'Customer chose competitor / local vendor',
    'Quotation price exceeded customer budget',
    'Rooftop installation deferred by customer',
    'Government subsidy / Bank loan application rejected',
    'Customer site location unsuitable / shading issues',
  ];

  // Recalculate totals
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitRate), 0);
  const taxTotal = items.reduce((acc, item) => {
    const itemSub = item.quantity * item.unitRate;
    return acc + (itemSub * (item.taxRatePercent / 100));
  }, 0);
  const netPayable = Math.max(0, subtotal + taxTotal - discount - subsidyEstimate);

  const handleItemChange = (index: number, field: keyof DocumentLineItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitRate') {
      item.amount = (Number(item.quantity) || 0) * (Number(item.unitRate) || 0);
    }
    updated[index] = item;
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedQuote: QuotationInvoice = {
      ...quote,
      customerName,
      customerPhone,
      customerAddress,
      systemCapacityKw,
      date,
      validUntilOrDueDate: validUntil,
      status: status as any,
      cancellationReason: status === 'Cancelled' ? cancellationReason : undefined,
      discount,
      subsidyEstimate,
      items,
      subtotal,
      taxTotal,
      grandTotal: netPayable,
      dueAmount: netPayable - (quote.totalPaid || 0),
    };

    onSave(updatedQuote);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Edit Solar Quotation Details
              </h3>
              <p className="text-xs text-slate-500 font-mono">Quotation No: {quote.documentNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Status & Dates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Quotation Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                className="w-full text-xs font-bold p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500"
              >
                <option value="Draft">Draft</option>
                <option value="Pending">Pending / Sent</option>
                <option value="Approved">Approved</option>
                <option value="Expired">Expired</option>
                <option value="Cancelled">Cancelled / Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Quotation Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs font-mono p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Valid Until Date
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full text-xs font-mono p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          {/* Cancellation Reason (shown if Cancelled) */}
          {status === 'Cancelled' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Specify Cancellation / Rejection Reason</span>
              </div>
              <input
                type="text"
                placeholder="Enter cancellation reason..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl focus:ring-2 focus:ring-rose-500"
                required={status === 'Cancelled'}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 self-center">Quick Presets:</span>
                {PRESET_CANCELLATION_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancellationReason(preset)}
                    className="text-[10px] bg-white dark:bg-slate-800 hover:bg-rose-100 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer & Technical Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Client Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                System Capacity (kW)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={systemCapacityKw}
                onChange={(e) => setSystemCapacityKw(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-extrabold text-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Address
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Quotation Line Items ({items.length})
              </label>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-[10px] uppercase text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 w-24 text-center">HSN/SAC</th>
                    <th className="p-2.5 w-20 text-center">Qty</th>
                    <th className="p-2.5 w-28 text-right">Unit Rate (₹)</th>
                    <th className="p-2.5 w-20 text-center">GST %</th>
                    <th className="p-2.5 w-28 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full text-xs p-1.5 bg-transparent font-medium border-b border-transparent focus:border-amber-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.hsnCode || ''}
                          placeholder="85017200"
                          onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                          className="w-full text-xs p-1.5 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full text-xs p-1.5 text-center font-bold bg-slate-50 dark:bg-slate-800 rounded-lg"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={item.unitRate}
                          onChange={(e) => handleItemChange(idx, 'unitRate', Number(e.target.value))}
                          className="w-full text-xs p-1.5 text-right font-mono bg-slate-50 dark:bg-slate-800 rounded-lg"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="28"
                          value={item.taxRatePercent}
                          onChange={(e) => handleItemChange(idx, 'taxRatePercent', Number(e.target.value))}
                          className="w-full text-xs p-1.5 text-center font-mono bg-slate-50 dark:bg-slate-800 rounded-lg"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{((item.quantity * item.unitRate) * (1 + item.taxRatePercent / 100)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discounts & Govt Subsidy Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Special Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-rose-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Govt. Subsidy Estimate (₹)
              </label>
              <input
                type="number"
                min="0"
                value={subsidyEstimate}
                onChange={(e) => setSubsidyEstimate(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-emerald-600"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-1 flex flex-col justify-end">
              <div className="p-2.5 bg-slate-900 text-white rounded-xl text-right">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Net Payable Amount</span>
                <span className="text-xl font-black font-mono text-white">
                  ₹{netPayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-extrabold text-xs shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

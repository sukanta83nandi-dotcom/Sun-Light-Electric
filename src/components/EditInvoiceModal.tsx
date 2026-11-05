import React, { useState } from 'react';
import { QuotationInvoice, DocumentLineItem, InventoryItem } from '../types';
import {
  X,
  Save,
  Plus,
  Trash2,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  Building,
  Tag,
  Hash,
  ShieldCheck,
  Percent,
  AlertCircle,
  Check,
} from 'lucide-react';

interface EditInvoiceModalProps {
  invoice: QuotationInvoice;
  inventory: InventoryItem[];
  onClose: () => void;
  onSave: (updatedInvoice: QuotationInvoice) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  inventory,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState(invoice.customerName);
  const [customerPhone, setCustomerPhone] = useState(invoice.customerPhone);
  const [customerAddress, setCustomerAddress] = useState(invoice.customerAddress || '');
  const [customerGstin, setCustomerGstin] = useState(invoice.customerGstin || '');
  const [customerState, setCustomerState] = useState(invoice.customerState || 'West Bengal');
  const [customerStateCode, setCustomerStateCode] = useState(invoice.customerStateCode || '19');
  const [systemCapacityKw, setSystemCapacityKw] = useState<number>(invoice.systemCapacityKw || 5.0);
  const [date, setDate] = useState(invoice.date);
  const [validUntilOrDueDate, setValidUntilOrDueDate] = useState(invoice.validUntilOrDueDate);
  const [discount, setDiscount] = useState<number>(invoice.discount || 0);
  const [notes, setNotes] = useState<string>(invoice.notes || '');
  const [termsAndConditions, setTermsAndConditions] = useState<string>(invoice.termsAndConditions || '');

  // Line items state
  const [items, setItems] = useState<DocumentLineItem[]>(
    (invoice.items || []).map((it, idx) => ({
      ...it,
      id: it.id || `INV-ITM-${idx + 1}`,
      hsnCode: it.hsnCode || '85017200',
      serialNumbers: it.serialNumbers || [],
    }))
  );

  // Recalculate financial breakdown
  const isWestBengal =
    customerState.toLowerCase().includes('bengal') || customerStateCode === '19';

  const subtotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitRate) || 0),
    0
  );

  const totalGst = items.reduce((acc, it) => {
    const itemSub = (Number(it.quantity) || 0) * (Number(it.unitRate) || 0);
    const gstPct = Number(it.taxRatePercent) || 0;
    return acc + itemSub * (gstPct / 100);
  }, 0);

  const cgstAmount = isWestBengal ? Math.round((totalGst / 2) * 100) / 100 : 0;
  const sgstAmount = isWestBengal ? Math.round((totalGst / 2) * 100) / 100 : 0;
  const igstAmount = !isWestBengal ? Math.round(totalGst * 100) / 100 : 0;
  const grandTotal = Math.max(0, Math.round(subtotal + totalGst - (Number(discount) || 0)));
  const totalPaid = invoice.totalPaid || 0;
  const dueAmount = Math.max(0, grandTotal - totalPaid);

  const [mismatchedIndex, setMismatchedIndex] = useState<number | null>(null);

  const handleItemChange = (
    index: number,
    field: keyof DocumentLineItem,
    value: any
  ) => {
    setMismatchedIndex(null);
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity') {
      const newQty = Math.max(0, Number(value) || 0);
      item.quantity = newQty;
      // Strict capping: slice serial array if count exceeds new quantity
      if (item.serialNumbers && item.serialNumbers.length > newQty) {
        item.serialNumbers = item.serialNumbers.slice(0, newQty);
      }
    }
    if (field === 'quantity' || field === 'unitRate') {
      item.amount = (Number(item.quantity) || 0) * (Number(item.unitRate) || 0);
    }
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setMismatchedIndex(null);
    const newItem: DocumentLineItem = {
      id: `INV-ITM-${Date.now()}`,
      itemId: inventory[0]?.id || '',
      itemCode: inventory[0]?.code || 'SP-GEN-01',
      description: inventory[0]?.name || 'Solar PV Equipment Line Item',
      hsnCode: inventory[0]?.hsnCode || '85017200',
      quantity: 1,
      unit: inventory[0]?.unit || 'Pcs',
      unitRate: inventory[0]?.unitRate || 10000,
      taxRatePercent: 12,
      amount: inventory[0]?.unitRate || 10000,
      serialNumbers: [],
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('An invoice must contain at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    setMismatchedIndex(null);
  };

  const handleSerialsChange = (index: number, serialsString: string) => {
    setMismatchedIndex(null);
    const parsed = serialsString
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const updated = [...items];
    const targetQty = Number(updated[index].quantity) || 0;
    // Cap serial numbers up to targetQty
    updated[index] = { ...updated[index], serialNumbers: parsed.slice(0, targetQty) };
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('Please enter a valid Customer Name.');
      return;
    }

    if (items.length === 0 || items.some((it) => !it.description.trim() || it.quantity <= 0)) {
      alert('Please ensure all items have a description and quantity greater than zero.');
      return;
    }

    // Strict 1:1 Quantity vs. Serial Number validation for PCS / tracked items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const u = (it.unit || '').toUpperCase();
      const desc = (it.description || '').toLowerCase();
      const isTracked =
        u.includes('PCS') ||
        u.includes('SET') ||
        desc.includes('panel') ||
        desc.includes('inverter') ||
        desc.includes('battery');

      if (isTracked) {
        const serialCount = it.serialNumbers?.length || 0;
        const requiredQty = Number(it.quantity) || 0;
        if (serialCount !== requiredQty) {
          setMismatchedIndex(i);
          alert(
            `Serial Count Mismatch in Item #${i + 1}! Quantity is ${requiredQty}, but ${serialCount} serial numbers are entered. Please provide exactly ${requiredQty} serial numbers.`
          );
          const el = document.getElementById(`edit-invoice-item-${i}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }
    }

    const updatedInvoice: QuotationInvoice = {
      ...invoice,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      customerGstin: customerGstin.trim().toUpperCase(),
      customerState: customerState.trim(),
      customerStateCode: customerStateCode.trim(),
      isWestBengal,
      systemCapacityKw,
      date,
      validUntilOrDueDate,
      discount: Number(discount) || 0,
      items: items.map((it) => ({
        ...it,
        amount: (Number(it.quantity) || 0) * (Number(it.unitRate) || 0),
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(totalGst * 100) / 100,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal,
      dueAmount,
      paymentStatus:
        dueAmount === 0 ? 'Fully Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid',
      notes: notes.trim(),
      termsAndConditions: termsAndConditions.trim(),
    };

    onSave(updatedInvoice);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-purple-800/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Edit Tax Invoice
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {invoice.documentNumber}
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Update customer scope, line items, HSN codes, rates &amp; component serials
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          
          {/* Section 1: Customer & Invoice Metadata */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-purple-500" />
                1. Customer &amp; Billing Identification
              </span>
              <span className="text-[11px] font-mono text-slate-400">Tax Invoice Master</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Entity Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile / WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 19AAACC1234K1Z1"
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Billing &amp; Installation Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  System Capacity (kW)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={systemCapacityKw}
                  onChange={(e) => setSystemCapacityKw(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={validUntilOrDueDate}
                  onChange={(e) => setValidUntilOrDueDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Place of Supply (State)
                </label>
                <input
                  type="text"
                  value={customerState}
                  onChange={(e) => setCustomerState(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Line Items with HSN & Serial Numbers */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-amber-500" />
                2. Equipment Scope, HSN Code &amp; Serial Numbers
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {items.map((item, index) => {
                const targetQty = Number(item.quantity) || 0;
                const serialCount = item.serialNumbers?.length || 0;
                const isComplete = serialCount === targetQty && targetQty > 0;
                const isHighlighted = mismatchedIndex === index;

                return (
                  <div
                    key={item.id || index}
                    id={`edit-invoice-item-${index}`}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-3.5 space-y-3 shadow-xs transition-all ${
                      isHighlighted
                        ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-50/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {isHighlighted && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-400 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Serial Count Mismatch in Item #{index + 1}! Quantity is {targetQty}, but {serialCount} serial numbers are entered. Please provide exactly {targetQty} serial numbers.
                        </span>
                      </div>
                    )}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    {/* Description */}
                    <div className="md:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Equipment / Service Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-xs"
                        placeholder="Description..."
                      />
                    </div>

                    {/* HSN Code */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        HSN / SAC
                      </label>
                      <input
                        type="text"
                        value={item.hsnCode || ''}
                        onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold"
                        placeholder="85017200"
                      />
                    </div>

                    {/* Qty & Unit */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Qty &amp; Unit
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-16 p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs"
                        />
                        <input
                          type="text"
                          value={item.unit || 'Pcs'}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-14 p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                        />
                      </div>
                    </div>

                    {/* Unit Rate */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Unit Rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitRate}
                        onChange={(e) => handleItemChange(index, 'unitRate', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs"
                      />
                    </div>

                    {/* GST % & Delete */}
                    <div className="md:col-span-1 flex items-center justify-between gap-1 pt-6">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Serial Numbers Box */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Allocated Serial Numbers ({item.serialNumbers?.length || 0} / {item.quantity})
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Separate multiple serials with comma or new line
                      </span>
                    </div>
                    <input
                      type="text"
                      value={(item.serialNumbers || []).join(', ')}
                      onChange={(e) => handleSerialsChange(index, e.target.value)}
                      placeholder="e.g. LS-730-001, LS-730-002, LS-730-003"
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Section 3: Totals & Discounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 block text-xs uppercase tracking-wider">
                Notes &amp; Commercial Terms
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice terms, warranty or delivery notes..."
                rows={3}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>

            {/* Financial Summary Card */}
            <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/60 rounded-2xl p-4 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">Taxable Subtotal:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  ₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>

              {isWestBengal ? (
                <>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>CGST (6%):</span>
                    <span className="font-mono">₹{cgstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>SGST (6%):</span>
                    <span className="font-mono">₹{sgstAmount.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>IGST (12% Interstate):</span>
                  <span className="font-mono">₹{igstAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pt-1 border-t border-purple-200 dark:border-purple-900/50">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Special Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-28 p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-mono font-bold text-xs bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-purple-300 dark:border-purple-800">
                <span className="text-purple-900 dark:text-purple-200">Grand Total (Net Payable):</span>
                <span className="font-mono text-base text-purple-700 dark:text-purple-300">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-bold pt-1 text-slate-600 dark:text-slate-400">
                <span>Already Paid:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-black text-rose-600 dark:text-rose-400">
                <span>Balance Due:</span>
                <span className="font-mono text-sm">
                  ₹{dueAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Update Invoice</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

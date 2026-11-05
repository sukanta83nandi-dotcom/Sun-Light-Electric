import React, { useState, useMemo } from 'react';
import {
  NonPoGrnRecord,
  NonPoGrnFilter,
  Supplier,
  Language,
} from '../types';
import {
  Search,
  Plus,
  Printer,
  Eye,
  FileText,
  RotateCcw,
  CheckCircle2,
  Package,
  X,
  ShieldCheck,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { useDebounce } from '../utils/useDebounce';

interface NonPoGrnTabProps {
  records: NonPoGrnRecord[];
  onSaveRecord: (record: NonPoGrnRecord) => void;
  suppliers: Supplier[];
  currentSubView?: 'search' | 'entry';
  onSubViewChange?: (view: 'search' | 'entry') => void;
  lang?: Language;
}

const UOM_OPTIONS = ['Bales', 'PCS', 'Sets', 'Kgs', 'Mtrs', 'Rolls', 'Box', 'Nos'] as const;

export const NonPoGrnTab: React.FC<NonPoGrnTabProps> = ({
  records,
  onSaveRecord,
  suppliers,
  currentSubView = 'search',
  onSubViewChange,
  lang = 'en',
}) => {
  const [internalSubView, setInternalSubView] = useState<'search' | 'entry'>(currentSubView);
  const activeSubView = onSubViewChange ? currentSubView : internalSubView;
  const setSubView = (view: 'search' | 'entry') => {
    if (onSubViewChange) onSubViewChange(view);
    setInternalSubView(view);
  };

  // ==========================================
  // Screen 1: Filter States (Place, Verified By, Merchandiser & MIR removed)
  // ==========================================
  const [filters, setFilters] = useState<NonPoGrnFilter>({
    gateReceiptNo: '',
    invoiceNo: '',
    supplierName: '',
    itemName: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleFilterChange = (field: keyof NonPoGrnFilter, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      gateReceiptNo: '',
      invoiceNo: '',
      supplierName: '',
      itemName: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  // Debounce text search inputs to eliminate typing lag
  const debouncedGateReceiptNo = useDebounce(filters.gateReceiptNo, 250);
  const debouncedInvoiceNo = useDebounce(filters.invoiceNo, 250);
  const debouncedSupplierName = useDebounce(filters.supplierName, 250);
  const debouncedItemName = useDebounce(filters.itemName, 250);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (
        debouncedGateReceiptNo &&
        !rec.gateReceiptNo.toLowerCase().includes(debouncedGateReceiptNo.toLowerCase().trim())
      )
        return false;
      if (
        debouncedInvoiceNo &&
        !rec.invoiceNo.toLowerCase().includes(debouncedInvoiceNo.toLowerCase().trim())
      )
        return false;
      if (
        debouncedSupplierName &&
        !rec.supplierName.toLowerCase().includes(debouncedSupplierName.toLowerCase().trim())
      )
        return false;
      if (
        debouncedItemName &&
        !rec.itemName.toLowerCase().includes(debouncedItemName.toLowerCase().trim())
      )
        return false;
      if (filters.dateFrom && rec.date < filters.dateFrom) return false;
      if (filters.dateTo && rec.date > filters.dateTo) return false;
      return true;
    });
  }, [
    records,
    debouncedGateReceiptNo,
    debouncedInvoiceNo,
    debouncedSupplierName,
    debouncedItemName,
    filters.dateFrom,
    filters.dateTo,
  ]);

  // Aggregate stats
  const totalAmount = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [filteredRecords]
  );
  const totalQty = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (Number(r.receivedQty) || 0), 0),
    [filteredRecords]
  );
  const totalWeight = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (Number(r.weight) || 0), 0),
    [filteredRecords]
  );

  // ==========================================
  // Screen 2: Form States (Place, Verified By, Merchandiser & MIR removed)
  // ==========================================
  const todayStr = new Date().toISOString().split('T')[0];

  const [formGateReceiptNo, setFormGateReceiptNo] = useState<string>(
    () => `GT-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [formGrnDate, setFormGrnDate] = useState<string>(todayStr);
  const [formInvoiceNo, setFormInvoiceNo] = useState<string>('');
  const [formSupplierName, setFormSupplierName] = useState<string>('');
  const [formItemName, setFormItemName] = useState<string>('');
  const [formReceivedQty, setFormReceivedQty] = useState<string>('10');
  const [formUom, setFormUom] = useState<string>('PCS');
  const [formCurrency, setFormCurrency] = useState<string>('INR (₹)');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formWeight, setFormWeight] = useState<string>('5.0');
  const [formVehicleNo, setFormVehicleNo] = useState<string>('');
  const [formWeighbridgeNo, setFormWeighbridgeNo] = useState<string>('');
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [formSuccessBanner, setFormSuccessBanner] = useState<string | null>(null);

  // Auto-calculated weight per unit
  const calculatedWeightPerUnit = useMemo(() => {
    const w = parseFloat(formWeight);
    const q = parseFloat(formReceivedQty);
    if (!isNaN(w) && !isNaN(q) && q > 0) {
      return (w / q).toFixed(3);
    }
    return '0.000';
  }, [formWeight, formReceivedQty]);

  const handleResetForm = () => {
    setFormGateReceiptNo(`GT-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormGrnDate(todayStr);
    setFormInvoiceNo('');
    setFormSupplierName('');
    setFormItemName('');
    setFormReceivedQty('10');
    setFormUom('PCS');
    setFormCurrency('INR (₹)');
    setFormAmount('');
    setFormWeight('5.0');
    setFormVehicleNo('');
    setFormWeighbridgeNo('');
    setFormRemarks('');
    setFormSuccessBanner(null);
  };

  const handleSaveNonPoGrn = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formGateReceiptNo.trim()) {
      alert('Please enter Gate Receipt No.');
      return;
    }
    if (!formSupplierName.trim()) {
      alert('Please enter or select Supplier Name.');
      return;
    }
    if (!formItemName.trim()) {
      alert('Please enter Item Name / Consumable Description.');
      return;
    }
    const q = parseFloat(formReceivedQty);
    if (isNaN(q) || q <= 0) {
      alert('Received Quantity must be greater than 0.');
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt < 0) {
      alert('Please enter a valid expense Amount.');
      return;
    }

    const randSeq = Math.floor(100 + Math.random() * 900);
    const newGrnNo = `NP-GRN-2026-${String(records.length + 1).padStart(3, '0')}`;
    const w = parseFloat(formWeight) || 0;
    const wpu = parseFloat(calculatedWeightPerUnit) || 0;

    const newRecord: NonPoGrnRecord = {
      id: `NPGRN-${Date.now()}-${randSeq}`,
      slNo: records.length + 1,
      grnNo: newGrnNo,
      date: formGrnDate || todayStr,
      gateReceiptNo: formGateReceiptNo.trim(),
      invoiceNo: formInvoiceNo.trim() || 'CASH-MEMO',
      supplierName: formSupplierName.trim(),
      itemName: formItemName.trim(),
      receivedQty: q,
      uom: formUom,
      currency: formCurrency,
      amount: amt,
      weight: w,
      weightPerUnit: wpu,
      vehicleNo: formVehicleNo.trim() || '—',
      weighbridgeNo: formWeighbridgeNo.trim() || '—',
      remarks: formRemarks.trim() || 'General operational consumable expense.',
      createdAt: new Date().toISOString(),
    };

    onSaveRecord(newRecord);
    setFormSuccessBanner(`Non PO GRN ${newRecord.grnNo} created successfully! (Gate Receipt: ${newRecord.gateReceiptNo})`);

    setTimeout(() => {
      handleResetForm();
      setSubView('search');
    }, 1200);
  };

  // ==========================================
  // View & Print Modal State
  // ==========================================
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<NonPoGrnRecord | null>(null);

  const handleOpenViewModal = (rec: NonPoGrnRecord, printImmediate = false) => {
    setSelectedRecordForModal(rec);
    if (printImmediate) {
      setTimeout(() => {
        window.print();
      }, 350);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* SCREEN 1: SEARCH NON PO GRN (DIRECTORY & FILTER VIEW)                 */}
      {/* ===================================================================== */}
      {activeSubView === 'search' && (
        <div className="space-y-6">
          {/* Main Card with Dark Teal Header Ribbon */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
            {/* Header Ribbon: Dark Teal Top Bar */}
            <div className="bg-[#0f4e56] text-white px-5 py-3.5 font-black text-sm flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-2.5">
                <FileCheck2 className="w-5 h-5 text-teal-300" />
                <span className="tracking-wide uppercase font-extrabold text-sm sm:text-base">
                  Search Non PO GRN
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-white/20 text-white font-mono px-2 py-0.5 rounded-full">
                  Non-Inventory Operational Expenses
                </span>
              </div>

              {/* Top-Right Action Button: Dark Teal Button */}
              <button
                type="button"
                onClick={() => setSubView('entry')}
                className="bg-[#0f4e56] hover:bg-[#005963] active:scale-95 text-white font-black text-xs px-4 py-2 rounded-xl border border-teal-300/40 shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer hover:shadow-md"
              >
                <Plus className="w-4 h-4 text-teal-200 stroke-[3]" />
                <span>+ Non PO GRN Entry</span>
              </button>
            </div>

            {/* Filter Card Grid: Clean 2-Row Balanced Grid (No Place / Verified By) */}
            <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0f4e56] dark:text-teal-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span>Filter Criteria &amp; Register Search</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Showing <strong>{filteredRecords.length}</strong> of {records.length} records
                </span>
              </div>

              {/* Row 1: 4 columns - Gate Receipt No, Invoice No, Supplier Name, Item Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Gate Receipt No */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Gate Receipt No</label>
                  <input
                    type="text"
                    value={filters.gateReceiptNo}
                    onChange={(e) => handleFilterChange('gateReceiptNo', e.target.value)}
                    placeholder="e.g. GT-8941"
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>

                {/* Invoice No */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Invoice No</label>
                  <input
                    type="text"
                    value={filters.invoiceNo}
                    onChange={(e) => handleFilterChange('invoiceNo', e.target.value)}
                    placeholder="Supplier bill / memo ref..."
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>

                {/* Supplier Name (Searchable with clear x) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Supplier Name</span>
                    {filters.supplierName && (
                      <button
                        type="button"
                        onClick={() => handleFilterChange('supplierName', '')}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer text-[10px]"
                      >
                        Clear ×
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="supplier-search-list"
                      value={filters.supplierName}
                      onChange={(e) => handleFilterChange('supplierName', e.target.value)}
                      placeholder="Type or pick supplier..."
                      className="w-full p-2 pr-7 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0f4e56]"
                    />
                    {filters.supplierName && (
                      <button
                        type="button"
                        onClick={() => handleFilterChange('supplierName', '')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <datalist id="supplier-search-list">
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.companyName || s.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Item Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Item Name</label>
                  <input
                    type="text"
                    value={filters.itemName}
                    onChange={(e) => handleFilterChange('itemName', e.target.value)}
                    placeholder="Consumable or item desc..."
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>
              </div>

              {/* Row 2: GRN Date Range (Left, 2 cols) & Action Buttons (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
                {/* GRN Date Range (Spans 2 columns on md/lg for balanced layout) */}
                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300">GRN Date Range</label>
                    {(filters.dateFrom || filters.dateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          handleFilterChange('dateFrom', '');
                          handleFilterChange('dateTo', '');
                        }}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer text-[10px]"
                      >
                        Clear Dates ×
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        title="GRN Date From"
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0f4e56]"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        title="GRN Date To"
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0f4e56]"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Search & Clear (Right) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {}}
                    className="flex-1 bg-[#0f4e56] hover:bg-[#005963] active:scale-95 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-teal-300" />
                    <span>Search</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    title="Reset all search filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results Register Table: (Merchandiser Filter and ACTIONS Column Completely Removed) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0f4e56] text-white uppercase text-[10px] font-black tracking-wider border-b border-[#0b383e]">
                  <tr>
                    <th className="p-3 text-center w-12">SL</th>
                    <th className="p-3 w-24">DATE</th>
                    <th className="p-3 w-36">GATE RECEIPT NO</th>
                    <th className="p-3 min-w-[160px]">SUPPLIER</th>
                    <th className="p-3 min-w-[220px]">ITEM NAME</th>
                    <th className="p-3 text-right w-24">RECV QTY</th>
                    <th className="p-3 text-center w-20">UOM</th>
                    <th className="p-3 text-right w-32">AMOUNT (₹)</th>
                    <th className="p-3 w-32">INVOICE NO</th>
                    <th className="p-3 min-w-[220px]">REMARKS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-500 space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                        <div className="font-bold text-slate-700 dark:text-slate-300">
                          No Non-PO GRN records match your search criteria.
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Try adjusting your filters or click "+ Non PO GRN Entry" to record a new receipt.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs font-bold text-[#0f4e56] dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec, index) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* 1. SL */}
                        <td className="p-3 text-center font-mono font-bold text-slate-500">
                          {rec.slNo || index + 1}
                        </td>

                        {/* 2. DATE */}
                        <td className="p-3 font-mono whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold">
                          {rec.date}
                        </td>

                        {/* 3. GATE RECEIPT NO */}
                        <td className="p-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(rec, false)}
                            className="font-mono font-black text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors cursor-pointer text-left"
                            title="Click to view Non-PO GRN Voucher"
                          >
                            {rec.gateReceiptNo}
                          </button>
                        </td>

                        {/* 4. SUPPLIER */}
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                          {rec.supplierName}
                        </td>

                        {/* 5. ITEM NAME */}
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          <div>{rec.itemName}</div>
                          {rec.weight > 0 && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Wt: {rec.weight} Kgs ({rec.weightPerUnit} kg/unit)
                            </div>
                          )}
                        </td>

                        {/* 6. RECV QTY */}
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {rec.receivedQty}
                        </td>

                        {/* 7. UOM */}
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {rec.uom}
                          </span>
                        </td>

                        {/* 8. AMOUNT */}
                        <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          ₹{Number(rec.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* 9. INVOICE NO */}
                        <td className="p-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {rec.invoiceNo}
                        </td>

                        {/* 10. REMARKS (Expands naturally across available width) */}
                        <td className="p-3 text-[11px] text-slate-600 dark:text-slate-300">
                          {rec.remarks || <span className="text-slate-400 italic">None</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Results Register Footer Summary */}
            {filteredRecords.length > 0 && (
              <div className="p-4 bg-slate-100/90 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
                  <span>
                    Total Entries: <strong className="text-slate-900 dark:text-white font-mono">{filteredRecords.length}</strong>
                  </span>
                  <span>
                    Total Recv Qty: <strong className="text-slate-900 dark:text-white font-mono">{totalQty} Units</strong>
                  </span>
                  {totalWeight > 0 && (
                    <span>
                      Total Weight: <strong className="text-slate-900 dark:text-white font-mono">{totalWeight.toFixed(1)} Kgs</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[11px]">
                    Total General Expenses:
                  </span>
                  <span className="text-sm font-black font-mono text-[#0f4e56] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-3 py-1 rounded-xl border border-teal-300 dark:border-teal-700">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SCREEN 2: GRN FOR NON PO (ENTRY FORM) (Place & Verified By Removed)   */}
      {/* ===================================================================== */}
      {activeSubView === 'entry' && (
        <div className="space-y-6">
          {/* Main Form Card with Dark Teal Header Ribbon */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
            {/* Header Ribbon: Dark Teal Top Bar */}
            <div className="bg-[#0f4e56] text-white px-5 py-3.5 font-black text-sm flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-2.5">
                <Package className="w-5 h-5 text-teal-300" />
                <span className="tracking-wide uppercase font-extrabold text-sm sm:text-base">
                  GRN for Non PO
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-white/20 text-white font-mono px-2 py-0.5 rounded-full">
                  Direct Inward • Non-Inventory Expense
                </span>
              </div>

              {/* Top-Right Navigation Button */}
              <button
                type="button"
                onClick={() => setSubView('search')}
                className="bg-[#0f4e56] hover:bg-[#005963] active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl border border-teal-300/40 shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer hover:shadow-md"
              >
                <Search className="w-3.5 h-3.5 text-teal-200" />
                <span>Search Non PO GRN</span>
              </button>
            </div>

            {/* Success Banner */}
            {formSuccessBanner && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{formSuccessBanner}</span>
              </div>
            )}

            {/* Critical Business Logic Isolation Notice */}
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold uppercase tracking-wide">
                  Administrative Isolation Guarantee:
                </strong>{' '}
                Non-PO GRN records are tracked strictly as general operational expenses (tools, consumables, office stationery, site PPE).
                Saving this entry will <strong>NOT increment physical equipment stock</strong>, require serial numbers, or affect project capacity (kW).
              </div>
            </div>

            {/* Entry Form Grid: Clean Balanced Grid */}
            <form onSubmit={handleSaveNonPoGrn} className="p-5 sm:p-7 space-y-6 text-xs">
              {/* Row 1: 4 Columns - Gate Receipt No, GRN Date, Invoice No, Supplier Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Gate Receipt No */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Gate Receipt No <span className="text-rose-500">*</span></span>
                    <button
                      type="button"
                      onClick={() => setFormGateReceiptNo(`GT-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </label>
                  <input
                    type="text"
                    value={formGateReceiptNo}
                    onChange={(e) => setFormGateReceiptNo(e.target.value)}
                    placeholder="e.g. GT-8941"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>

                {/* GRN Date */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    GRN Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formGrnDate}
                    onChange={(e) => setFormGrnDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>

                {/* Invoice No */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Invoice No <span className="text-slate-400 font-normal">(Supplier bill/memo ref)</span>
                  </label>
                  <input
                    type="text"
                    value={formInvoiceNo}
                    onChange={(e) => setFormInvoiceNo(e.target.value)}
                    placeholder="e.g. BILL-4581 or Cash Memo"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>

                {/* Supplier Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Supplier Name <span className="text-rose-500">*</span></span>
                    {formSupplierName && (
                      <button
                        type="button"
                        onClick={() => setFormSupplierName('')}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer text-[10px]"
                      >
                        Clear ×
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="form-supplier-datalist"
                      value={formSupplierName}
                      onChange={(e) => setFormSupplierName(e.target.value)}
                      placeholder="Select vendor or type name..."
                      required
                      className="w-full p-2.5 pr-7 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#0f4e56]"
                    />
                    <datalist id="form-supplier-datalist">
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.companyName || s.name} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Row 2: 4 Columns - Item Name (span 2), Received Qty (span 1), UOM (span 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Item Name (Consumable) */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Item Name <span className="text-rose-500">*</span>{' '}
                    <span className="text-slate-400 font-normal text-[10px]">
                      (Free-form expense item, e.g. PVC tape, helmets, stationery)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formItemName}
                    onChange={(e) => setFormItemName(e.target.value)}
                    placeholder="e.g. Heavy Duty PVC Insulation Tape & Safety Helmets"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>

                {/* Received Qty */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Received Qty <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={formReceivedQty}
                    onChange={(e) => setFormReceivedQty(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>

                {/* UOM */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    UOM <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formUom}
                    onChange={(e) => setFormUom(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#0f4e56]"
                  >
                    {UOM_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: 3 Columns - Amount, Weight, Weight per Unit (Auto) (MIR removed) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Amount (Currency + Amount) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Amount <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full p-2.5 rounded-r-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-black focus:ring-2 focus:ring-[#0f4e56]"
                    />
                  </div>
                </div>

                {/* Weight (Kgs) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Weight (Kgs)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formWeight}
                      onChange={(e) => setFormWeight(e.target.value)}
                      placeholder="e.g. 15.0"
                      className="w-full p-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#0f4e56]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">
                      Kgs
                    </span>
                  </div>
                </div>

                {/* Weight per Unit: Read-only auto-calculated input (Weight / Received Qty) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <span>Weight per Unit</span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono font-bold">
                      (Auto)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={`${calculatedWeightPerUnit} Kg/${formUom}`}
                      className="w-full p-2.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-300 font-mono font-bold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: 2 Columns (50% each) - Vehicle No & Weighbridge No (Merchandiser removed) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle No */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Vehicle No
                  </label>
                  <input
                    type="text"
                    value={formVehicleNo}
                    onChange={(e) => setFormVehicleNo(e.target.value)}
                    placeholder="e.g. WB-15-E-4589"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono uppercase focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>

                {/* Weighbridge No */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Weighbridge No
                  </label>
                  <input
                    type="text"
                    value={formWeighbridgeNo}
                    onChange={(e) => setFormWeighbridgeNo(e.target.value)}
                    placeholder="e.g. WB-PURS-094"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#0f4e56]"
                  />
                </div>
              </div>

              {/* Row 5: Remarks / Purpose (Full width) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Remarks / Consumption Purpose
                </label>
                <textarea
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="General expense remarks, usage purpose or department allocation..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0f4e56]"
                />
              </div>

              {/* Bottom Action Ribbon */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Reset Form
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSubView('search')}
                    className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  {/* Save Button (Dark Teal) */}
                  <button
                    type="submit"
                    className="bg-[#0f4e56] hover:bg-[#005963] active:scale-95 text-white font-black text-xs px-8 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer hover:shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4 text-teal-300" />
                    <span>Save Non PO GRN</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VOUCHER MODAL: VIEW & PRINT NON PO GRN SLIP                           */}
      {/* ===================================================================== */}
      {selectedRecordForModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-[#0f4e56] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-teal-300" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Goods Received Note (Non-PO Expense Voucher)
                  </h3>
                  <p className="text-[10px] text-teal-200/90 font-mono">
                    Ref: {selectedRecordForModal.grnNo} • Gate Receipt: {selectedRecordForModal.gateReceiptNo}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecordForModal(null)}
                  className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-slate-800 dark:text-slate-200 print:text-black">
              {/* Sun Light Electric Brand Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-[#0f4e56] gap-4">
                <div className="flex items-center space-x-4">
                  <CompanyLogo className="h-14 w-auto rounded-xl shadow-xs" />
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      SUN LIGHT ELECTRIC
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      SOALUK, PURSURAH, HOOGHLY, WEST BENGAL - 712410
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      GSTIN: 19AZEPP1218L1Z5 • Phone: +91 7908798079
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="inline-block px-3 py-1 rounded-md bg-[#0f4e56] text-white font-black text-xs uppercase tracking-wider">
                    NON-PO GRN SLIP
                  </span>
                  <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                    GRN No: {selectedRecordForModal.grnNo}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    Date: {selectedRecordForModal.date}
                  </div>
                </div>
              </div>

              {/* Top Meta Details Grid: 3 Clean Columns (Place removed) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Gate Receipt No</span>
                  <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                    {selectedRecordForModal.gateReceiptNo}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Supplier Bill / Inv No</span>
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {selectedRecordForModal.invoiceNo}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Supplier Name</span>
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {selectedRecordForModal.supplierName}
                  </span>
                </div>
              </div>

              {/* Itemized Received Particulars */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f4e56] text-white uppercase text-[10px] font-black">
                    <tr>
                      <th className="p-3">Item Description (Consumable)</th>
                      <th className="p-3 text-center">Recv Qty</th>
                      <th className="p-3 text-center">UOM</th>
                      <th className="p-3 text-right">Weight (Kgs)</th>
                      <th className="p-3 text-right">Unit Wt (Kg/Unit)</th>
                      <th className="p-3 text-right">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {selectedRecordForModal.itemName}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {selectedRecordForModal.receivedQty}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {selectedRecordForModal.uom}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        {selectedRecordForModal.weight > 0 ? `${selectedRecordForModal.weight} Kg` : '—'}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        {selectedRecordForModal.weightPerUnit > 0 ? `${selectedRecordForModal.weightPerUnit} Kg/${selectedRecordForModal.uom}` : '—'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-sm text-[#0f4e56] dark:text-teal-400">
                        ₹{Number(selectedRecordForModal.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Additional Logistics Audit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle No</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedRecordForModal.vehicleNo || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Weighbridge No</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedRecordForModal.weighbridgeNo || '—'}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                  Remarks &amp; Consumption Purpose:
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {selectedRecordForModal.remarks}
                </p>
              </div>

              {/* Signature Blocks: 2 Clean Balanced Columns (Verified By removed) */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center border-t border-slate-200 dark:border-slate-700 text-[11px]">
                <div className="space-y-8">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedRecordForModal.merchandiser || 'Authorized Receiver'}
                  </div>
                  <div className="pt-1 border-t border-slate-300 dark:border-slate-700 text-slate-500 font-semibold">
                    Gate Incharge / Receiver
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="font-bold text-[#0f4e56] dark:text-teal-400 font-mono">
                    Haradhan Patra
                  </div>
                  <div className="pt-1 border-t border-slate-300 dark:border-slate-700 text-slate-500 font-semibold">
                    Authorized Signatory (Sun Light Electric)
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedRecordForModal(null)}
                className="px-5 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#0f4e56] hover:bg-[#005963] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

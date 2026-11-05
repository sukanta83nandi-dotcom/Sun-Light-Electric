import React, { useState, useMemo } from 'react';
import { InventoryItem, StockLogEntry, Language } from '../types';
import { utils, writeFile } from 'xlsx';
import {
  X,
  History,
  Calendar,
  Filter,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  User,
  ShieldCheck,
  CheckCircle2,
  Package,
  Layers
} from 'lucide-react';

interface StockLogModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  stockLogs: StockLogEntry[];
  onAddStockLog: (newEntry: Omit<StockLogEntry, 'id'>) => void;
  lang?: Language;
}

export const StockLogModal: React.FC<StockLogModalProps> = ({
  item,
  onClose,
  stockLogs,
  onAddStockLog,
}) => {
  if (!item) return null;

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INWARD' | 'OUTWARD' | 'ADJUSTMENT'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // New Entry Form Modal/Drawer State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<'INWARD' | 'OUTWARD' | 'ADJUSTMENT'>('INWARD');
  const [newQuantity, setNewQuantity] = useState<number | ''>(1);
  const [newDocType, setNewDocType] = useState<'TAX_INVOICE' | 'PURCHASE_RECEIPT' | 'INITIAL_STOCK' | 'MANUAL_CORRECTION'>('PURCHASE_RECEIPT');
  const [newDocNo, setNewDocNo] = useState('');
  const [newPartyName, setNewPartyName] = useState('');
  const [newRemarks, setNewRemarks] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // Quick Date Presets
  const handlePresetDate = (preset: 'all' | 'this_month' | 'last_30_days' | 'today') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === 'last_30_days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFromDate(past30);
      setToDate(todayStr);
    }
  };

  // Filtered Logs for this SKU item code
  const itemLogs = useMemo(() => {
    return stockLogs.filter((log) => log.itemCode === item.code);
  }, [stockLogs, item.code]);

  const filteredLogs = useMemo(() => {
    return itemLogs.filter((log) => {
      // Type Filter
      if (typeFilter !== 'ALL' && log.type !== typeFilter) return false;

      // Date Range Filter
      if (fromDate && log.date < fromDate) return false;
      if (toDate && log.date > toDate) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRemarks = log.remarks?.toLowerCase().includes(q);
        const matchesParty = log.partyName?.toLowerCase().includes(q);
        const matchesDoc = log.referenceDocNo?.toLowerCase().includes(q);
        const matchesDocType = log.referenceDocType?.toLowerCase().includes(q);
        if (!matchesRemarks && !matchesParty && !matchesDoc && !matchesDocType) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [itemLogs, typeFilter, fromDate, toDate, searchQuery]);

  // Summary Metrics
  const totalInward = useMemo(() => {
    return filteredLogs
      .filter((l) => l.type === 'INWARD' || (l.type === 'ADJUSTMENT' && l.quantity > 0))
      .reduce((acc, l) => acc + Math.abs(l.quantity), 0);
  }, [filteredLogs]);

  const totalOutward = useMemo(() => {
    return filteredLogs
      .filter((l) => l.type === 'OUTWARD' || (l.type === 'ADJUSTMENT' && l.quantity < 0))
      .reduce((acc, l) => acc + Math.abs(l.quantity), 0);
  }, [filteredLogs]);

  const currentStock = item.currentStock ?? item.stockLevel ?? 0;

  // Handle Recording New Movement Entry
  const handleSubmitNewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuantity || Number(newQuantity) <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }
    if (!newRemarks.trim()) {
      alert('Please provide remarks/reason for this stock entry.');
      return;
    }

    const qtyNum = Number(newQuantity);
    const actualQtyChange = newType === 'OUTWARD' ? -qtyNum : qtyNum;
    const balanceAfter = Math.max(0, currentStock + actualQtyChange);

    onAddStockLog({
      itemCode: item.code,
      date: newDate || new Date().toISOString().split('T')[0],
      type: newType,
      quantity: actualQtyChange,
      balanceAfter,
      referenceDocType: newDocType,
      referenceDocNo: newDocNo.trim() || undefined,
      partyName: newPartyName.trim() || undefined,
      remarks: newRemarks.trim(),
      recordedBy: 'Haradhan Patra',
    });

    // Reset Form
    setShowAddForm(false);
    setNewQuantity(1);
    setNewRemarks('');
    setNewDocNo('');
    setNewPartyName('');
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      alert('No stock logs available to export.');
      return;
    }

    const data = filteredLogs.map((log) => ({
      'Date': log.date,
      'Item Code': log.itemCode,
      'Item Name': item.name,
      'Category': item.category,
      'Movement Type': log.type,
      'Quantity': log.quantity,
      'Unit': item.unit,
      'Balance After': log.balanceAfter,
      'Doc Type': log.referenceDocType || 'N/A',
      'Doc Ref No': log.referenceDocNo || 'N/A',
      'Party Name': log.partyName || '—',
      'Remarks': log.remarks,
      'Recorded By': log.recordedBy,
    }));

    const worksheet = utils.json_to_sheet(data);

    // Auto column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 15 }, // Item Code
      { wch: 30 }, // Item Name
      { wch: 20 }, // Category
      { wch: 15 }, // Movement Type
      { wch: 10 }, // Quantity
      { wch: 8 },  // Unit
      { wch: 15 }, // Balance After
      { wch: 20 }, // Doc Type
      { wch: 22 }, // Doc Ref No
      { wch: 28 }, // Party Name
      { wch: 36 }, // Remarks
      { wch: 18 }, // Recorded By
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Stock Audit Trail');

    const fileName = `Stock_Movement_Audit_${item.code}_${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, fileName);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No stock logs available to export.');
      return;
    }

    const headers = ['Date', 'Item Code', 'Item Name', 'Type', 'Quantity', 'Balance After', 'Doc Type', 'Doc Ref No', 'Party Name', 'Remarks', 'Recorded By'];
    const rows = filteredLogs.map((log) => [
      log.date,
      log.itemCode,
      `"${item.name.replace(/"/g, '""')}"`,
      log.type,
      log.quantity,
      log.balanceAfter,
      log.referenceDocType || '',
      log.referenceDocNo || '',
      `"${(log.partyName || '').replace(/"/g, '""')}"`,
      `"${log.remarks.replace(/"/g, '""')}"`,
      log.recordedBy,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Movement_Audit_${item.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-amber-500 text-slate-950 font-mono font-black text-xs px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  {item.code}
                </span>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {item.category}
                </span>
              </div>
              <h2 className="text-lg font-extrabold tracking-tight mt-0.5 text-slate-100">
                {item.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 transition-all shadow-sm cursor-pointer"
              title="Export Stock Audit to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 transition-all cursor-pointer"
              title="Export Stock Audit to CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/50 dark:bg-slate-950/40 flex-1">
          
          {/* Item Quick Overview & KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5 tracking-wider">
                Current Available Stock
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {currentStock}{' '}
                <span className="text-xs font-sans font-semibold text-slate-500">{item.unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Cost: ₹{(currentStock * (item.buyPrice ?? Math.round(item.unitRate * 0.8))).toLocaleString('en-IN')} | Sell: ₹{(currentStock * item.unitRate).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5 tracking-wider">
                Total Inward (+)
              </span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                +{totalInward}{' '}
                <span className="text-xs font-sans font-semibold text-slate-500">{item.unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Purchases & Inward logs</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-rose-600 block mb-0.5 tracking-wider">
                Total Outward (-)
              </span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                -{totalOutward}{' '}
                <span className="text-xs font-sans font-semibold text-slate-500">{item.unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Tax Invoices issued</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5 tracking-wider">
                Unit Base Rate
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                INR {item.unitRate.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">GST Rate: {item.gstRate ?? item.gstPercent}%</div>
            </div>
          </div>

          {/* Controls Bar: Date Filter, Type Filter & New Log Action */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* Left Search & Type Filter */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search invoice #, customer, supplier..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Movement Type Filter Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0">
                  <button
                    onClick={() => setTypeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      typeFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTypeFilter('INWARD')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      typeFilter === 'INWARD'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800'
                    }`}
                  >
                    Inward (+)
                  </button>
                  <button
                    onClick={() => setTypeFilter('OUTWARD')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      typeFilter === 'OUTWARD'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-rose-700 dark:text-rose-400 hover:text-rose-800'
                    }`}
                  >
                    Outward (-)
                  </button>
                  <button
                    onClick={() => setTypeFilter('ADJUSTMENT')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      typeFilter === 'ADJUSTMENT'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-700 dark:text-amber-400 hover:text-amber-800'
                    }`}
                  >
                    Adjustment
                  </button>
                </div>
              </div>

              {/* Right Action: Add New Stock Entry */}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center justify-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Record Stock Entry</span>
              </button>
            </div>

            {/* Date Range Controls & Presets */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Date Range:
                </span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => handlePresetDate('all')}
                    className="text-[11px] text-amber-600 hover:underline font-bold"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Date Presets */}
              <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                <span className="hidden md:inline text-slate-400">Presets:</span>
                <button
                  onClick={() => handlePresetDate('all')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  All Time
                </button>
                <button
                  onClick={() => handlePresetDate('this_month')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  This Month
                </button>
                <button
                  onClick={() => handlePresetDate('last_30_days')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Last 30 Days
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Record New Stock Entry Panel */}
          {showAddForm && (
            <form
              onSubmit={handleSubmitNewEntry}
              className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Record Stock Movement / Adjustment ({item.code})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Movement Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Movement Type *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold"
                  >
                    <option value="INWARD">INWARD (+ Purchase / Stock In)</option>
                    <option value="OUTWARD">OUTWARD (- Invoice / Issue)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Audit Correction)</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity ({item.unit}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono font-bold"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono"
                    required
                  />
                </div>

                {/* Reference Doc Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reference Doc Type
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2"
                  >
                    <option value="PURCHASE_RECEIPT">PURCHASE RECEIPT</option>
                    <option value="TAX_INVOICE">TAX INVOICE</option>
                    <option value="INITIAL_STOCK">INITIAL STOCK</option>
                    <option value="MANUAL_CORRECTION">MANUAL CORRECTION</option>
                  </select>
                </div>

                {/* Reference Doc No */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Doc / Invoice / PO Ref No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SLE/INV/2026/012 or PO/2026/089"
                    value={newDocNo}
                    onChange={(e) => setNewDocNo(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono"
                  />
                </div>

                {/* Party Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer / Supplier Party Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tata Power Solar / Sukanta Nandi"
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2"
                  />
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Remarks / Audit Reason *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stock shipment received at Pursurah Godown"
                    value={newRemarks}
                    onChange={(e) => setNewRemarks(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Save Stock Entry
                </button>
              </div>
            </form>
          )}

          {/* Audit Log Trail Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-900 text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Stock Movement History Trail ({filteredLogs.length} Entries)</span>
              </div>
              <span className="text-[11px] font-normal text-slate-400">
                Sorted by latest transactions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-3 py-3">Movement Type</th>
                    <th className="px-3 py-3">Ref Doc & No.</th>
                    <th className="px-3 py-3">Party Name</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Balance After</th>
                    <th className="px-4 py-3">Remarks & Auditor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                        <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No stock movement logs found</p>
                        <p className="text-[11px] mt-0.5">Try adjusting date range or movement filters</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isInward = log.type === 'INWARD' || (log.type === 'ADJUSTMENT' && log.quantity > 0);
                      const isOutward = log.type === 'OUTWARD' || (log.type === 'ADJUSTMENT' && log.quantity < 0);

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {log.date}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {log.type === 'INWARD' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                                <span>INWARD</span>
                              </span>
                            ) : log.type === 'OUTWARD' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                <span>OUTWARD</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                <RefreshCw className="w-3 h-3 text-amber-600" />
                                <span>ADJUSTMENT</span>
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900 dark:text-slate-200 text-xs">
                              {log.referenceDocNo || 'N/A'}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-tight">
                              {log.referenceDocType || 'DIRECT'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {log.partyName || '—'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-black text-sm whitespace-nowrap">
                            {isInward ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                +{Math.abs(log.quantity)}
                              </span>
                            ) : isOutward ? (
                              <span className="text-rose-600 dark:text-rose-400">
                                -{Math.abs(log.quantity)}
                              </span>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300">
                                {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            {log.balanceAfter} {item.unit}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                              {log.remarks}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>Recorded by {log.recordedBy}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Stock Inventory Audit Trail - Sun Light Electric</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Audit Log
          </button>
        </div>

      </div>
    </div>
  );
};

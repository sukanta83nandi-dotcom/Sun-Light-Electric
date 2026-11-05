import React, { useState, useMemo } from 'react';
import { NonPoGrnRecord } from '../types/nonPoGrn';
import { Supplier } from '../types/supplier';
import {
  FileSpreadsheet,
  Calendar,
  Search,
  Filter,
  Download,
  RotateCcw,
  Building2,
  ReceiptText,
  DollarSign,
  Package,
  Layers,
  ShieldAlert,
  X,
  FileText,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useDebounce } from '../utils/useDebounce';

interface NonPoGrnReportViewProps {
  records: NonPoGrnRecord[];
  suppliers?: Supplier[];
}

export const NonPoGrnReportView: React.FC<NonPoGrnReportViewProps> = ({
  records,
  suppliers = [],
}) => {
  // -------------------------------------------------------------
  // DATE PRESET HELPERS
  // -------------------------------------------------------------
  const getInitialDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    return { from: firstDay, to: today };
  };

  const initialDates = getInitialDates();
  const [dateFrom, setDateFrom] = useState<string>(initialDates.from);
  const [dateTo, setDateTo] = useState<string>(initialDates.to);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [searchItemQuery, setSearchItemQuery] = useState<string>('');
  const [activeDatePreset, setActiveDatePreset] = useState<'this_month' | 'last_month' | 'all_time' | 'custom'>('this_month');

  // Preset Handlers
  const handlePresetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    setDateFrom(firstDay);
    setDateTo(today);
    setActiveDatePreset('this_month');
  };

  const handlePresetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    setDateFrom(firstDay);
    setDateTo(lastDay);
    setActiveDatePreset('last_month');
  };

  const handlePresetAllTime = () => {
    setDateFrom('');
    setDateTo('');
    setActiveDatePreset('all_time');
  };

  const handleResetFilters = () => {
    handlePresetThisMonth();
    setSelectedSupplier('ALL');
    setSearchItemQuery('');
  };

  const debouncedItemQuery = useDebounce(searchItemQuery, 250);

  // Distinct suppliers from records & prop
  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.supplierName) set.add(r.supplierName.trim());
    });
    suppliers.forEach((s) => {
      const name = s.companyName || s.name;
      if (name) set.add(name.trim());
    });
    return Array.from(set).sort();
  }, [records, suppliers]);

  // -------------------------------------------------------------
  // FILTERED RECORDS
  // -------------------------------------------------------------
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Date filter
      if (dateFrom && rec.date < dateFrom) return false;
      if (dateTo && rec.date > dateTo) return false;

      // Supplier filter
      if (selectedSupplier !== 'ALL' && rec.supplierName.toLowerCase() !== selectedSupplier.toLowerCase()) {
        return false;
      }

      // Item search filter
      if (debouncedItemQuery.trim()) {
        const q = debouncedItemQuery.toLowerCase().trim();
        const inItem = (rec.itemName || '').toLowerCase().includes(q);
        const inInvoice = (rec.invoiceNo || '').toLowerCase().includes(q);
        const inGate = (rec.gateReceiptNo || '').toLowerCase().includes(q);
        const inRemarks = (rec.remarks || '').toLowerCase().includes(q);
        if (!inItem && !inInvoice && !inGate && !inRemarks) return false;
      }

      return true;
    });
  }, [records, dateFrom, dateTo, selectedSupplier, debouncedItemQuery]);

  // -------------------------------------------------------------
  // KPI CALCULATIONS
  // -------------------------------------------------------------
  const kpiData = useMemo(() => {
    let totalExpense = 0;
    let totalUnits = 0;
    const vendorSet = new Set<string>();

    filteredRecords.forEach((rec) => {
      totalExpense += Number(rec.amount || 0);
      totalUnits += Number(rec.receivedQty || 0);
      if (rec.supplierName) vendorSet.add(rec.supplierName.trim());
    });

    return {
      totalExpense,
      totalEntries: filteredRecords.length,
      totalUnits,
      activeVendors: vendorSet.size,
    };
  }, [filteredRecords]);

  // -------------------------------------------------------------
  // EXCEL / CSV EXPORT
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('No Non-PO GRN records available in the filtered view to export.');
      return;
    }

    const rows = filteredRecords.map((rec, idx) => ({
      'SL': idx + 1,
      'DATE': rec.date,
      'GATE RECEIPT NO': rec.gateReceiptNo,
      'SUPPLIER NAME': rec.supplierName,
      'ITEM NAME & SPECIFICATION': rec.itemName,
      'RECV QTY': rec.receivedQty,
      'UOM': rec.uom,
      'AMOUNT (INR)': Number(rec.amount || 0),
      'INVOICE / CASH MEMO NO': rec.invoiceNo,
      'VEHICLE NO': rec.vehicleNo || '—',
      'REMARKS / CONSUMPTION PURPOSE': rec.remarks || '—',
    }));

    // Append summary row
    rows.push({
      'SL': 'TOTAL' as any,
      'DATE': '',
      'GATE RECEIPT NO': '',
      'SUPPLIER NAME': '',
      'ITEM NAME & SPECIFICATION': `Total Entries: ${filteredRecords.length}`,
      'RECV QTY': kpiData.totalUnits,
      'UOM': '',
      'AMOUNT (INR)': kpiData.totalExpense,
      'INVOICE / CASH MEMO NO': '',
      'VEHICLE NO': '',
      'REMARKS / CONSUMPTION PURPOSE': '',
    });

    const worksheet = utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },  // SL
      { wch: 12 }, // DATE
      { wch: 18 }, // GATE RECEIPT NO
      { wch: 28 }, // SUPPLIER NAME
      { wch: 38 }, // ITEM NAME
      { wch: 12 }, // RECV QTY
      { wch: 10 }, // UOM
      { wch: 16 }, // AMOUNT
      { wch: 22 }, // INVOICE NO
      { wch: 16 }, // VEHICLE NO
      { wch: 35 }, // REMARKS
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Non-PO Expense Register');
    const filename = `SLE_Non_PO_GRN_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, filename);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* HEADER & SUMMARY KPI RIBBON                               */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-[#0f4e56] via-[#005963] to-[#0f4e56] text-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xl border border-[#164e63] space-y-5">
        {/* Title Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-black/25 border border-white/20 shadow-inner">
              <ReceiptText className="w-7 h-7 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Non PO GRN Report
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  Operational Expenses &amp; Consumables
                </span>
              </div>
              <p className="text-xs text-teal-100/80">
                Direct Administrative, Hardware &amp; Consumable Expenses Inwarded without Inventory Impact • Sun Light Electric
              </p>
            </div>
          </div>

          {/* Isolation Badge */}
          <div className="flex items-center space-x-2 bg-black/30 border border-teal-300/30 px-3 py-1.5 rounded-xl text-teal-100 text-xs font-semibold self-start sm:self-auto">
            <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-[11px]">Strictly Isolated from Solar Stock &amp; Capital Assets</span>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. TOTAL EXPENSE VALUE */}
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/15 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Expense Value</span>
              <DollarSign className="w-4 h-4 text-teal-300" />
            </div>
            <div className="text-xl lg:text-2xl font-black font-mono text-white">
              ₹{kpiData.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-teal-100/70 font-medium">
              Gross operational outlay
            </div>
          </div>

          {/* 2. TOTAL ENTRIES */}
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/15 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Entries</span>
              <Layers className="w-4 h-4 text-sky-300" />
            </div>
            <div className="text-xl lg:text-2xl font-black font-mono text-white">
              {kpiData.totalEntries}
            </div>
            <div className="text-[10px] text-teal-100/70 font-medium">
              Recorded inward vouchers
            </div>
          </div>

          {/* 3. TOTAL CONSUMABLE UNITS */}
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/15 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Consumable Units</span>
              <Package className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-xl lg:text-2xl font-black font-mono text-white">
              {kpiData.totalUnits.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-teal-100/70 font-medium">
              Pieces, sets, meters &amp; bails
            </div>
          </div>

          {/* 4. ACTIVE SUPPLIERS / VENDORS */}
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/15 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-teal-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Active Suppliers / Vendors</span>
              <Building2 className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-xl lg:text-2xl font-black font-mono text-white">
              {kpiData.activeVendors}
            </div>
            <div className="text-[10px] text-teal-100/70 font-medium">
              Local stores &amp; expense parties
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FILTER & EXPORT BAR                                       */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4 text-xs">
        {/* Top Filter Controls: Date Range + Presets + Supplier + Item Search + Export */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Left: Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 flex-1">
            {/* 1. Date Range with Quick Presets */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0f4e56] dark:text-teal-400" />
                  <span>GRN Date Range</span>
                </label>
                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePresetThisMonth}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      activeDatePreset === 'this_month'
                        ? 'bg-[#0f4e56] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetLastMonth}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      activeDatePreset === 'last_month'
                        ? 'bg-[#0f4e56] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Last Month
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetAllTime}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      activeDatePreset === 'all_time'
                        ? 'bg-[#0f4e56] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    All Time
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setActiveDatePreset('custom');
                  }}
                  title="Date From"
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0f4e56]"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setActiveDatePreset('custom');
                  }}
                  title="Date To"
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-[#0f4e56]"
                />
              </div>
            </div>

            {/* 2. Supplier Dropdown */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0f4e56] dark:text-teal-400" />
                <span>Supplier / Store</span>
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#0f4e56]"
              >
                <option value="ALL">All Suppliers / Vendors</option>
                {supplierOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Item & Spec Search Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[#0f4e56] dark:text-teal-400" />
                  <span>Item / Invoice Search</span>
                </label>
                {searchItemQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchItemQuery('')}
                    className="text-rose-500 hover:text-rose-600 text-[10px] cursor-pointer"
                  >
                    Clear ×
                  </button>
                )}
              </div>
              <input
                type="text"
                value={searchItemQuery}
                onChange={(e) => setSearchItemQuery(e.target.value)}
                placeholder="Item name, spec, bill no..."
                className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0f4e56]"
              />
            </div>
          </div>

          {/* Right Action: Export & Reset */}
          <div className="flex items-center gap-2 self-end w-full lg:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex-1 lg:flex-initial bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              title="Download Accountant Audit Excel Sheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              title="Reset all search filters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* REPORT DATA REGISTER TABLE                                */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
        {/* Table Top Ribbon Header */}
        <div className="bg-[#0f4e56] text-white px-5 py-3.5 font-black text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-4 h-4 text-teal-300" />
            <span className="tracking-wide uppercase font-extrabold text-xs sm:text-sm">
              Non PO GRN Audit Register (Operational Consumables)
            </span>
          </div>

          <div className="text-[11px] font-mono text-teal-200">
            Showing <strong className="text-white">{filteredRecords.length}</strong> of {records.length} Records
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0b383e] text-white uppercase text-[10px] font-black tracking-wider border-b border-teal-900">
              <tr>
                <th className="p-3 text-center w-12">SL</th>
                <th className="p-3 w-24">DATE</th>
                <th className="p-3 w-32">GATE RECEIPT NO</th>
                <th className="p-3 min-w-[160px]">SUPPLIER NAME</th>
                <th className="p-3 min-w-[220px]">ITEM NAME &amp; SPECIFICATION</th>
                <th className="p-3 text-right w-20">RECV QTY</th>
                <th className="p-3 text-center w-16">UOM</th>
                <th className="p-3 text-right w-28">AMOUNT (₹)</th>
                <th className="p-3 w-32">INVOICE / CASH MEMO NO</th>
                <th className="p-3 w-28">VEHICLE NO</th>
                <th className="p-3 min-w-[200px]">REMARKS / CONSUMPTION PURPOSE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-500 space-y-2">
                    <ReceiptText className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      No Non-PO GRN records match your selected report filter criteria.
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Try selecting "All Time" or adjusting your supplier and item search keywords.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs font-bold text-[#0f4e56] dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      Reset Filter Parameters
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
                      <span className="font-mono font-black text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300">
                        {rec.gateReceiptNo}
                      </span>
                    </td>

                    {/* 4. SUPPLIER NAME */}
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {rec.supplierName}
                    </td>

                    {/* 5. ITEM NAME & SPECIFICATION */}
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      <div>{rec.itemName}</div>
                      {rec.weight > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Gross: {rec.weight} Kgs ({rec.weightPerUnit} kg/unit)
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
                      ₹{Number(rec.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 9. INVOICE / CASH MEMO NO */}
                    <td className="p-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {rec.invoiceNo || '—'}
                    </td>

                    {/* 10. VEHICLE NO */}
                    <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {rec.vehicleNo && rec.vehicleNo !== '—' ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {rec.vehicleNo}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>

                    {/* 11. REMARKS / CONSUMPTION PURPOSE */}
                    <td className="p-3 text-[11px] text-slate-600 dark:text-slate-300">
                      {rec.remarks || <span className="text-slate-400 italic">General site consumption</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer: Summary Row */}
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 border-t-2 border-[#0f4e56] font-black text-xs text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={5} className="p-3.5 text-right font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Total Inwarded Units &amp; Incurred Outlay:
                  </td>
                  {/* Total Inwarded Units */}
                  <td className="p-3.5 text-right font-mono text-sm text-[#0f4e56] dark:text-teal-400">
                    {kpiData.totalUnits.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3.5 text-center text-slate-400 font-normal">—</td>
                  {/* Total Incurred Expense Value */}
                  <td className="p-3.5 text-right font-mono text-sm text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    ₹{kpiData.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="p-3.5 text-left text-[11px] text-slate-500 font-normal italic">
                    Count: {filteredRecords.length} inward expense consignments
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

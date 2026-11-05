import React, { useState } from 'react';
import { QuotationInvoice, InventoryItem, Language, ProjectExpenses } from '../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Users,
  FileCheck,
  Edit3,
  Search,
  PieChart,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Download,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';

interface ProfitAnalysisProps {
  documents: QuotationInvoice[];
  inventory: InventoryItem[];
  onUpdateInvoiceExpenses: (invoiceId: string, expenses: ProjectExpenses) => void;
  lang: Language;
}

export const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({
  documents,
  inventory,
  onUpdateInvoiceExpenses,
  lang,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('All Time');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [docFilter, setDocFilter] = useState<'INVOICES_ONLY' | 'ALL'>('INVOICES_ONLY');
  const [editingDoc, setEditingDoc] = useState<QuotationInvoice | null>(null);

  // Form State for Expense Modal
  const [transportationCost, setTransportationCost] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [expenseNotes, setExpenseNotes] = useState<string>('');

  // Apply Quick Date Range Preset
  const handleApplyPreset = (preset: string) => {
    setSelectedPreset(preset);
    const now = new Date();

    const formatYmd = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'All Time') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatYmd(start));
      setEndDate(formatYmd(end));
    } else if (preset === 'Last 30 Days') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setStartDate(formatYmd(start));
      setEndDate(formatYmd(now));
    } else if (preset === 'This FY') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      let fyStartYear = currentYear;
      let fyEndYear = currentYear + 1;
      if (currentMonth < 3) {
        fyStartYear = currentYear - 1;
        fyEndYear = currentYear;
      }
      const start = new Date(fyStartYear, 3, 1);
      const end = new Date(fyEndYear, 2, 31);
      setStartDate(formatYmd(start));
      setEndDate(formatYmd(end));
    }
  };

  // Filter documents by type, date range, and search query
  const filteredDocs = documents.filter((doc) => {
    const matchesType = docFilter === 'INVOICES_ONLY' ? doc.type === 'Invoice' : true;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      doc.documentNumber.toLowerCase().includes(q) ||
      doc.customerName.toLowerCase().includes(q) ||
      (doc.systemCapacityKw && doc.systemCapacityKw.toString().includes(q));

    const rawDate = doc.date ? doc.date.split('T')[0] : '';
    const matchesStart = !startDate || rawDate >= startDate;
    const matchesEnd = !endDate || rawDate <= endDate;

    return matchesType && matchesSearch && matchesStart && matchesEnd;
  });

  // Calculate Profit Breakdown for a single document
  const calculateDocProfit = (doc: QuotationInvoice) => {
    // Taxable Revenue = Subtotal (net of items before tax) - Discount
    const taxableRevenue = Math.max(0, (doc.subtotal || 0) - (doc.discount || 0));

    // Calculate Product Cost by matching line items with Inventory buyPrice
    let productCost = 0;
    doc.items.forEach((item) => {
      const match = inventory.find(
        (inv) => inv.id === item.itemId || inv.code === item.itemCode
      );
      const buyPrice = match?.buyPrice ?? Math.round(item.unitRate * 0.8);
      productCost += buyPrice * item.quantity;
    });

    const expenses: ProjectExpenses = doc.expenses || {
      transportationCost: 0,
      laborCost: 0,
      otherCost: 0,
      expenseNotes: '',
    };

    const operationalExpenses =
      (expenses.transportationCost || 0) +
      (expenses.laborCost || 0) +
      (expenses.otherCost || 0);

    const totalExpenses = productCost + operationalExpenses;
    const netProfit = taxableRevenue - totalExpenses;
    const marginPercentage =
      taxableRevenue > 0 ? (netProfit / taxableRevenue) * 100 : 0;

    return {
      taxableRevenue,
      productCost,
      expenses,
      operationalExpenses,
      totalExpenses,
      netProfit,
      marginPercentage,
    };
  };

  // Overall Financial Aggregates
  const profitSummaries = filteredDocs.map((doc) => ({
    doc,
    ...calculateDocProfit(doc),
  }));

  const totalRevenue = profitSummaries.reduce((acc, curr) => acc + curr.taxableRevenue, 0);
  const totalEquipmentCost = profitSummaries.reduce((acc, curr) => acc + curr.productCost, 0);
  const totalTransportationCost = profitSummaries.reduce(
    (acc, curr) => acc + (curr.expenses.transportationCost || 0),
    0
  );
  const totalLaborCost = profitSummaries.reduce(
    (acc, curr) => acc + (curr.expenses.laborCost || 0),
    0
  );
  const totalOtherCost = profitSummaries.reduce(
    (acc, curr) => acc + (curr.expenses.otherCost || 0),
    0
  );
  const totalOperationalExpenses =
    totalTransportationCost + totalLaborCost + totalOtherCost;
  const grandTotalExpenses = totalEquipmentCost + totalOperationalExpenses;
  const grandNetProfit = totalRevenue - grandTotalExpenses;
  const overallMargin = totalRevenue > 0 ? (grandNetProfit / totalRevenue) * 100 : 0;

  // Open Edit Expense Modal
  const handleOpenEditExpense = (doc: QuotationInvoice) => {
    setEditingDoc(doc);
    const ex = doc.expenses || {
      transportationCost: 0,
      laborCost: 0,
      otherCost: 0,
      expenseNotes: '',
    };
    setTransportationCost(ex.transportationCost || 0);
    setLaborCost(ex.laborCost || 0);
    setOtherCost(ex.otherCost || 0);
    setExpenseNotes(ex.expenseNotes || '');
  };

  // Save Expense Form
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    onUpdateInvoiceExpenses(editingDoc.id, {
      transportationCost: Number(transportationCost) || 0,
      laborCost: Number(laborCost) || 0,
      otherCost: Number(otherCost) || 0,
      expenseNotes,
    });

    setEditingDoc(null);
  };

  // Export Profit Report to Excel
  const handleExportExcel = () => {
    if (profitSummaries.length === 0) {
      alert('No invoices available for profit export.');
      return;
    }

    const data = profitSummaries.map(({ doc, taxableRevenue, productCost, expenses, operationalExpenses, totalExpenses, netProfit, marginPercentage }) => ({
      'Invoice No': doc.documentNumber,
      'Date': doc.date,
      'Customer Name': doc.customerName,
      'Capacity (kW)': doc.systemCapacityKw || 0,
      'Taxable Revenue (₹)': taxableRevenue,
      'Equipment Cost (₹)': productCost,
      'Freight / Transport (₹)': expenses.transportationCost || 0,
      'Technician Labor (₹)': expenses.laborCost || 0,
      'Net-Metering / Liaisoning (₹)': expenses.otherCost || 0,
      'Total Operational Costs (₹)': operationalExpenses,
      'Grand Total Cost (₹)': totalExpenses,
      'Net Profit (₹)': netProfit,
      'Margin (%)': `${marginPercentage.toFixed(2)}%`,
    }));

    const worksheet = utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 18 }, // Invoice No
      { wch: 12 }, // Date
      { wch: 25 }, // Customer
      { wch: 14 }, // Capacity
      { wch: 20 }, // Taxable Revenue
      { wch: 20 }, // Equipment Cost
      { wch: 18 }, // Freight
      { wch: 18 }, // Labor
      { wch: 22 }, // Liaisoning
      { wch: 22 }, // Total Ops
      { wch: 20 }, // Grand Total Cost
      { wch: 18 }, // Net Profit
      { wch: 12 }, // Margin %
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Profit & Loss Summary');
    writeFile(workbook, `SunLight_Profit_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>
              {lang === 'bn' ? 'প্রজেক্ট মুনাফা ও ব্যয় বিশ্লেষণ' : 'Solar Project Profit & Loss Analysis'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time net margin tracking for Sun Light Electric projects factoring equipment purchase costs, tempo freight, technician labor, and WBSEDCL liaisoning paperwork.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all duration-200 shadow-[0_4px_0_#047857,0_8px_12px_rgba(16,185,129,0.35)] hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_1px_0_#047857] border border-emerald-400/80 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Export Profit Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Taxable Revenue */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Taxable Revenue (Net)
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Excludes GST collected
            </div>
          </div>
          <div className="p-3 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Equipment Purchase Cost */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Equipment Inward Cost
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              ₹{totalEquipmentCost.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Solar panels, inverter, battery stock cost
            </div>
          </div>
          <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Operational Expenses */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Operational Expenses
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              ₹{totalOperationalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Freight + Labor + Liaisoning
            </div>
          </div>
          <div className="p-3 bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Net Project Profit & Margin */}
        <div className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between ${
          grandNetProfit >= 0
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80'
        }`}>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
              Net Project Profit
            </span>
            <div className={`text-2xl font-black font-mono ${
              grandNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              ₹{grandNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-xs font-bold mt-1 inline-flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded-md font-mono ${
                overallMargin >= 20
                  ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                  : overallMargin >= 10
                  ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200'
              }`}>
                Net Margin: {overallMargin.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${
            grandNetProfit >= 0
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}>
            {grandNetProfit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Operational Expense Breakdown Sub-Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Freight & Transportation</span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              ₹{totalTransportationCost.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Technician & Installation Labor</span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              ₹{totalLaborCost.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Net-Metering & Liaisoning</span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              ₹{totalOtherCost.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Date Range & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice no, customer, or capacity..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Date Range & Presets Section */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            {['All Time', 'This Month', 'Last 30 Days', 'This FY'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedPreset === preset
                    ? 'bg-amber-400 text-amber-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedPreset('Custom');
              }}
              className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-amber-400 text-xs font-mono"
            />
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedPreset('Custom');
              }}
              className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-amber-400 text-xs font-mono"
            />
          </div>

          {/* Document Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs ml-auto">
            <button
              type="button"
              onClick={() => setDocFilter('INVOICES_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                docFilter === 'INVOICES_ONLY'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Invoices Only
            </button>
            <button
              type="button"
              onClick={() => setDocFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                docFilter === 'ALL'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Documents
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Profit Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-sky-950 text-white text-[11px] font-bold uppercase tracking-wider border-b border-sky-800">
              <tr>
                <th className="px-4 py-3.5">Invoice / Document</th>
                <th className="px-4 py-3.5">Customer & Capacity</th>
                <th className="px-4 py-3.5 text-right">Taxable Revenue</th>
                <th className="px-4 py-3.5 text-right">Equipment Cost</th>
                <th className="px-4 py-3.5 text-right">Operational Costs</th>
                <th className="px-4 py-3.5 text-right">Total Cost</th>
                <th className="px-4 py-3.5 text-right">Net Profit</th>
                <th className="px-4 py-3.5 text-center">Net Margin %</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {profitSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No matching invoices found for profit analysis.
                  </td>
                </tr>
              ) : (
                profitSummaries.map(({ doc, taxableRevenue, productCost, expenses, operationalExpenses, totalExpenses, netProfit, marginPercentage }) => {
                  const isProfit = netProfit >= 0;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Document Details */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {doc.documentNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">{doc.date}</div>
                      </td>

                      {/* Customer & Capacity */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {doc.customerName}
                        </div>
                        {doc.systemCapacityKw && (
                          <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {doc.systemCapacityKw} kW Solar Setup
                          </div>
                        )}
                      </td>

                      {/* Taxable Revenue */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{taxableRevenue.toLocaleString('en-IN')}
                      </td>

                      {/* Equipment Cost */}
                      <td className="px-4 py-3.5 text-right font-mono text-amber-700 dark:text-amber-400 font-medium">
                        ₹{productCost.toLocaleString('en-IN')}
                      </td>

                      {/* Operational Costs */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        <div className="font-bold text-rose-600 dark:text-rose-400">
                          ₹{operationalExpenses.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          T: ₹{expenses.transportationCost || 0} | L: ₹{expenses.laborCost || 0} | O: ₹{expenses.otherCost || 0}
                        </div>
                      </td>

                      {/* Total Cost */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        ₹{totalExpenses.toLocaleString('en-IN')}
                      </td>

                      {/* Net Profit */}
                      <td className="px-4 py-3.5 text-right font-mono font-extrabold text-sm">
                        <span className={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {isProfit ? '+' : ''}₹{netProfit.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Net Margin % */}
                      <td className="px-4 py-3.5 text-center font-mono">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          marginPercentage >= 20
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300'
                            : marginPercentage >= 10
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300'
                        }`}>
                          {marginPercentage.toFixed(1)}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenEditExpense(doc)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer shadow-2xs"
                          title="Set / Edit Project Operational Expenses"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Expenses</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Summary */}
            <tfoot className="bg-sky-950 text-white font-bold text-xs border-t-2 border-sky-800">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-sans uppercase tracking-wider text-[11px] text-slate-300">
                  TOTAL CUMULATIVE PROFIT SUMMARY
                </td>
                <td className="px-4 py-3 text-right font-mono text-blue-300">
                  ₹{totalRevenue.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-right font-mono text-amber-400">
                  ₹{totalEquipmentCost.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-right font-mono text-rose-400">
                  ₹{totalOperationalExpenses.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-200">
                  ₹{grandTotalExpenses.toLocaleString('en-IN')}
                </td>
                <td className={`px-4 py-3 text-right font-mono text-sm ${grandNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{grandNetProfit.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3 text-center font-mono text-amber-300">
                  {overallMargin.toFixed(1)}%
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Edit Expenses Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-xs">
                  {editingDoc.documentNumber}
                </span>
                <h3 className="font-extrabold text-base text-slate-100 mt-1">
                  Operational Project Expenses
                </h3>
                <p className="text-xs text-slate-400">
                  {editingDoc.customerName} {editingDoc.systemCapacityKw ? `(${editingDoc.systemCapacityKw} kW Solar Setup)` : ''}
                </p>
              </div>

              <button
                onClick={() => setEditingDoc(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 text-xs">
              
              {/* Financial Quick Breakdown Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Taxable Revenue</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{Math.max(0, (editingDoc.subtotal || 0) - (editingDoc.discount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Equipment Buy Cost</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    ₹{calculateDocProfit(editingDoc).productCost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Transportation / Freight Cost */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Freight & Transportation Cost (₹)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={transportationCost}
                  onChange={(e) => setTransportationCost(Number(e.target.value))}
                  placeholder="e.g. 8500 (Tempo, diesel fuel, delivery)"
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-500 font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Covers tempo hire, vehicle fuel, and logistics from godown to site.
                </span>
              </div>

              {/* Technician & Installation Labor */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Technician & Installation Labor Wages (₹)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                  placeholder="e.g. 18000 (Rooftop riggers, electrician wages)"
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-500 font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Covers structure mounting riggers, DC/AC electrician daily wages.
                </span>
              </div>

              {/* Net-Metering Liaisoning & Other Expenses */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-purple-600" />
                  <span>Liaisoning, Discom Paperwork & Civil Cost (₹)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={otherCost}
                  onChange={(e) => setOtherCost(Number(e.target.value))}
                  placeholder="e.g. 5500 (WBSEDCL paperwork, inspector, civil)"
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-500 font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Covers net-metering application, discom approval fees, earthing pit civil work.
                </span>
              </div>

              {/* Expense Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. 3-day rooftop mounting team + WBSEDCL inspector charges included."
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              {/* Live Real-time Profit Preview */}
              {(() => {
                const taxableRev = Math.max(0, (editingDoc.subtotal || 0) - (editingDoc.discount || 0));
                const eqCost = calculateDocProfit(editingDoc).productCost;
                const totalOps = Number(transportationCost) + Number(laborCost) + Number(otherCost);
                const totalExp = eqCost + totalOps;
                const liveProfit = taxableRev - totalExp;
                const liveMargin = taxableRev > 0 ? (liveProfit / taxableRev) * 100 : 0;
                const isPositive = liveProfit >= 0;

                return (
                  <div className={`p-4 rounded-2xl border font-mono ${
                    isPositive
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Live Calculated Net Profit:
                      </span>
                      <span className={`text-base font-black ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {isPositive ? '+' : ''}₹{liveProfit.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-slate-500">Project Net Margin:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {liveMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Project Expenses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

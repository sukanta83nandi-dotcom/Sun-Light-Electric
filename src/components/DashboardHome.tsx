import React, { useState } from 'react';
import {
  Customer,
  InventoryItem,
  QuotationInvoice,
  Language,
  DocumentType,
} from '../types';
import { translations } from '../data/translations';
import { getWhatsAppDeepLinks, sendPaymentDueReminderWhatsApp } from '../utils/whatsappHelper';
import {
  Sun,
  FileText,
  CheckCircle2,
  AlertCircle,
  Boxes,
  Zap,
  Plus,
  Send,
  PhoneCall,
  ArrowRight,
  TrendingUp,
  IndianRupee,
  Calculator,
  Users,
  Package,
  Clock,
  Sparkles,
  ShieldAlert,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  Award,
  Activity,
} from 'lucide-react';

interface DashboardHomeProps {
  documents: QuotationInvoice[];
  inventory: InventoryItem[];
  customers: Customer[];
  lang: Language;
  onNavigateTab: (tab: 'dashboard' | 'quotations' | 'invoices' | 'inventory' | 'customers' | 'suppliers' | 'challans' | 'profit' | 'create_doc') => void;
  onCreateDoc: (type: DocumentType, initialKw?: number) => void;
  onOpenAddStockModal: () => void;
  onOpenAddCustomerModal: () => void;
  onRecordPaymentForInvoice: (inv: QuotationInvoice) => void;
  stockLogs?: import('../types').StockLogEntry[];
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  documents,
  inventory,
  customers,
  lang,
  onNavigateTab,
  onCreateDoc,
  onOpenAddStockModal,
  onOpenAddCustomerModal,
  onRecordPaymentForInvoice,
  stockLogs = [],
}) => {
  const t = translations[lang];

  // Quick Solar Capacity Estimator State
  const [monthlyBill, setMonthlyBill] = useState<number>(3500);

  // Estimator Calculations
  const estKw = Math.max(1, Math.ceil((monthlyBill / 900) * 2) / 2);
  const estRoofArea = Math.round(estKw * 100);
  const estSubsidy = estKw <= 1 ? 30000 : estKw <= 2 ? 60000 : 78000;
  const estMonthlySavings = Math.min(monthlyBill, Math.round(estKw * 120 * 7.5));

  // Documents Breakdown
  const quotes = documents.filter((d) => d.type === 'Quotation');
  const invoices = documents.filter((d) => d.type === 'Invoice');

  const totalQuotesValue = quotes.reduce((sum, q) => sum + q.grandTotal, 0);
  const totalInvoicedRevenue = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalGstCollected = invoices.reduce((sum, i) => sum + (i.totalTax || 0), 0);

  // Outstanding Dues
  let totalOutstanding = 0;
  let unpaidInvoicesCount = 0;

  invoices.forEach((inv) => {
    const totalPaid = (inv.payments || []).reduce((sum, p) => sum + p.amountPaid, 0);
    const due = Math.max(0, inv.grandTotal - totalPaid);
    if (due > 1) {
      totalOutstanding += due;
      unpaidInvoicesCount += 1;
    }
  });

  // Capacity Deployed & Stock Synchronized Metrics
  const totalKwDeployed = invoices.reduce((sum, i) => sum + (i.systemCapacityKw || 0), 0);
  const totalKwPipeline = quotes.reduce((sum, q) => sum + (q.systemCapacityKw || 0), 0);
  const totalPhysicalStock = inventory.reduce((sum, item) => sum + (item.currentStock ?? item.stockLevel ?? 0), 0);
  const totalUnitsInwarded = stockLogs
    .filter((l) => l.type === 'INWARD' || l.type === 'INWARD_GRN')
    .reduce((sum, l) => sum + (l.quantity || 0), 0);

  // Stock Alerts
  const lowStockItems = inventory.filter((item) => (item.currentStock ?? item.stockLevel) <= item.minStockAlert);

  // Format Current Date
  const currentDateFormatted = new Date().toLocaleDateString(lang === 'bn' ? 'bn-IN' : 'en-US', {
    month: 'long',
    year: 'numeric',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* 1. Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-slate-900/60 dark:from-amber-950/40 dark:via-slate-900/80 dark:to-slate-950 border border-amber-500/30 dark:border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_12px_30px_rgba(245,158,11,0.12)] backdrop-blur-md">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-amber-900 dark:text-amber-300 text-xs font-extrabold tracking-wide uppercase shadow-2xs">
              <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
              <span>Operations Command Center • {currentDateFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Welcome back, <span className="text-amber-600 dark:text-amber-400">Haradhan Patra!</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Sun Light Electric — Solar Billing, GST Invoicing, Inventory &amp; Field Operations Hub (Pursurah, Hooghly)
            </p>
          </div>

          {/* Quick Action Floating Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onCreateDoc('Quotation')}
              className="flex items-center space-x-2 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all duration-200 ease-out shadow-[0_6px_0_#b45309,0_10px_15px_rgba(245,158,11,0.35)] hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_2px_0_#b45309] border border-amber-300/80 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ New Solar Quote</span>
            </button>

            <button
              onClick={() => onCreateDoc('Invoice')}
              className="flex items-center space-x-2 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-amber-300 font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all duration-200 ease-out shadow-[0_6px_0_#020617,0_10px_15px_rgba(0,0,0,0.4)] hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_2px_0_#020617] border border-slate-700/80 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Create Tax Invoice</span>
            </button>

            <button
              onClick={() => {
                onNavigateTab('inventory');
                onOpenAddStockModal();
              }}
              className="flex items-center space-x-2 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all duration-200 ease-out shadow-[0_6px_0_#047857,0_10px_15px_rgba(16,185,129,0.35)] hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_2px_0_#047857] border border-emerald-400/80 cursor-pointer"
            >
              <Package className="w-4 h-4 text-emerald-100 stroke-[2.5]" />
              <span>+ Add SKU</span>
            </button>

            <button
              onClick={() => {
                onNavigateTab('customers');
                onOpenAddCustomerModal();
              }}
              className="flex items-center space-x-2 bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all duration-200 ease-out shadow-[0_6px_0_#0369a1,0_10px_15px_rgba(14,165,233,0.35)] hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_2px_0_#0369a1] border border-sky-400/80 cursor-pointer"
            >
              <Users className="w-4 h-4 text-sky-100 stroke-[2.5]" />
              <span>+ Register Client</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Business KPI Metrics Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Pipeline (Quotes) */}
        <div
          onClick={() => onNavigateTab('quotations')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Pipeline
            </span>
            <div className="p-2.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl group-hover:rotate-12 transition-transform">
              <Sun className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              ₹{totalQuotesValue.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span>{quotes.length} Proposals Sent</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center">
                {totalKwPipeline} kW Total <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Monthly Revenue & Invoiced Tax */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Billed Revenue
            </span>
            <div className="p-2.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:rotate-12 transition-transform">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              ₹{totalInvoicedRevenue.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span>GST Tax: ₹{totalGstCollected.toLocaleString('en-IN')}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                {invoices.length} Invoices <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Outstanding Payment Dues */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Recovery
            </span>
            <div className="p-2.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl group-hover:rotate-12 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-rose-600 dark:text-rose-400 font-bold">{unpaidInvoicesCount} Pending Bills</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold underline flex items-center">
                Record Payment <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Critical Stock, Inwarded & Solar Capacity Deployed */}
        <div
          onClick={() => onNavigateTab('inventory')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Physical Stock
            </span>
            <div className="p-2.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl group-hover:rotate-12 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {totalPhysicalStock} <span className="text-sm font-bold text-slate-500">Units</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                {totalKwDeployed} kW Invoiced
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{totalUnitsInwarded}</span> Inwarded
                {lowStockItems.length > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-extrabold ml-1.5 flex items-center">
                    • {lowStockItems.length} Low
                  </span>
                )}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center">
                Stock Master <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Widgets Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Quick Solar Capacity Estimator */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-5 shadow-lg space-y-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Calculator className="w-32 h-32 text-amber-500" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 rounded-xl shadow-sm">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Quick Solar Rooftop Sizing Estimator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Instant solar capacity recommendation &amp; govt. subsidy calculation for client site visits.
                </p>
              </div>
            </div>

            {/* Slider & Input */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Client Monthly Electricity Bill (₹)
                </label>
                <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1 rounded-lg">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1000"
                    max="100000"
                    step="500"
                    value={monthlyBill}
                    onChange={(e) => setMonthlyBill(Math.max(500, Number(e.target.value) || 0))}
                    className="w-20 font-mono font-bold text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <input
                type="range"
                min="1000"
                max="30000"
                step="500"
                value={monthlyBill}
                onChange={(e) => setMonthlyBill(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />

              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>₹1,000/mo (Small Household)</span>
                <span>₹15,000/mo (Commercial)</span>
                <span>₹30,000+/mo</span>
              </div>
            </div>

            {/* Sizing Results Matrix */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                  Recommended System
                </span>
                <span className="text-2xl font-black text-amber-900 dark:text-amber-300 font-mono">
                  {estKw} <span className="text-xs font-bold">kW</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  ~{Math.round(estKw * 120)} kWh / month
                </span>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
                <span className="text-[10px] font-extrabold text-blue-800 dark:text-blue-400 uppercase tracking-wider block">
                  Roof Area Required
                </span>
                <span className="text-2xl font-black text-blue-900 dark:text-blue-300 font-mono">
                  {estRoofArea} <span className="text-xs font-bold">sq. ft.</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Shadow-free rooftop
                </span>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                  PM Surya Ghar Subsidy
                </span>
                <span className="text-lg font-black text-emerald-900 dark:text-emerald-300 font-mono">
                  ₹{estSubsidy.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-bold">
                  Direct Govt. Rebate
                </span>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Est. Bill Savings
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
                  ₹{estMonthlySavings.toLocaleString('en-IN')}<span className="text-xs font-bold text-slate-500">/mo</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ~90% Bill Reduction
                </span>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={() => onCreateDoc('Quotation', estKw)}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all duration-200 shadow-[0_5px_0_#b45309,0_10px_15px_rgba(245,158,11,0.35)] hover:-translate-y-1 active:translate-y-0.5 active:shadow-[0_2px_0_#b45309] border border-amber-300/80 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Generate Official Quotation for {estKw} kW Plant</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Right Column (7 Cols): Recent Activity & WhatsApp Follow-ups */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recent Invoices & Quick WhatsApp Reminders */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Recent Invoices &amp; Payment Follow-ups
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('invoices')}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center"
              >
                View All ({invoices.length}) <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No invoices generated yet. Create your first invoice using the button above.
              </div>
            ) : (
              <div className="space-y-2.5">
                {invoices.slice(0, 4).map((inv) => {
                  const totalPaid = (inv.payments || []).reduce((s, p) => s + p.amountPaid, 0);
                  const due = Math.max(0, inv.grandTotal - totalPaid);
                  const isFullyPaid = due <= 0;
                  const isPartiallyPaid = totalPaid > 0 && due > 0;

                  const waLinks = getWhatsAppDeepLinks(inv, lang);

                  return (
                    <div
                      key={inv.id}
                      className="p-3.5 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            {inv.documentNumber}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {inv.customerName}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">({inv.systemCapacityKw || 5} kW)</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-3">
                          <span>Total: <strong className="text-slate-800 dark:text-slate-200">₹{inv.grandTotal.toLocaleString('en-IN')}</strong></span>
                          <span>•</span>
                          <span>Due: <strong className={due > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>₹{due.toLocaleString('en-IN')}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Status Badge */}
                        {isFullyPaid ? (
                          <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] rounded-lg border border-emerald-500/30 flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Fully Paid
                          </span>
                        ) : isPartiallyPaid ? (
                          <span className="px-2.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[11px] rounded-lg border border-amber-500/30 flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Partial
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold text-[11px] rounded-lg border border-rose-500/30 flex items-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            Unpaid
                          </span>
                        )}

                        {/* WhatsApp Follow-up Button */}
                        {isFullyPaid ? (
                          <button
                            type="button"
                            disabled
                            title="No payment pending (Fully Paid)"
                            className="p-2 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 rounded-xl cursor-not-allowed opacity-40 flex items-center justify-center"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              sendPaymentDueReminderWhatsApp(
                                {
                                  invoiceNo: inv.documentNumber,
                                  date: inv.date,
                                  customerName: inv.customerName,
                                  customerPhone: inv.customerPhone,
                                  grandTotal: inv.grandTotal,
                                  totalPaid,
                                  dueAmount: due,
                                },
                                lang
                              )
                            }
                            title={`Send WhatsApp Payment Due Reminder (Due: ₹${due.toLocaleString('en-IN')})`}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-transform active:scale-90 flex items-center justify-center cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Record Payment Button */}
                        {!isFullyPaid && (
                          <button
                            onClick={() => onRecordPaymentForInvoice(inv)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[11px] rounded-xl transition-all shadow-xs"
                          >
                            + Record Pay
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RELOCATED 4-CARD QUICK METRICS GRID (2x2) */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span>Operations &amp; Catalog Overview</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 1. Active Solar Quotes */}
              <div
                onClick={() => onNavigateTab('quotations')}
                className="cursor-pointer bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 flex items-center gap-3.5 hover:shadow-md transition-all"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Active Solar Quotes</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{quotes.length}</p>
                </div>
              </div>

              {/* 2. Invoices Generated */}
              <div
                onClick={() => onNavigateTab('invoices')}
                className="cursor-pointer bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center gap-3.5 hover:shadow-md transition-all"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Invoices Generated</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{invoices.length}</p>
                </div>
              </div>

              {/* 3. Equipment SKUs */}
              <div
                onClick={() => onNavigateTab('inventory')}
                className="cursor-pointer bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-2xl p-4 flex items-center gap-3.5 hover:shadow-md transition-all"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Equipment SKUs</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {inventory.length} <span className="text-xs font-normal text-slate-400">SKUs</span>
                  </p>
                </div>
              </div>

              {/* 4. Total Clients */}
              <div
                onClick={() => onNavigateTab('customers')}
                className="cursor-pointer bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 rounded-2xl p-4 flex items-center gap-3.5 hover:shadow-md transition-all"
              >
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Total Clients</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {customers.length} <span className="text-xs font-normal text-slate-400">Clients</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Low-Stock Warning Widget */}
          {lowStockItems.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 dark:border-rose-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h4 className="font-extrabold text-sm text-rose-950 dark:text-rose-200">
                    Critical Equipment Low Stock Warning ({lowStockItems.length} SKUs)
                  </h4>
                </div>
                <button
                  onClick={() => onNavigateTab('inventory')}
                  className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline"
                >
                  Manage Inventory &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Code: {item.code}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-extrabold text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                        {item.stockLevel} {item.unit} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span><strong>Sun Light Electric</strong> — Solar Quotation, Billing &amp; Operations Platform</span>
        </div>
        <div className="font-medium">
          Designed &amp; Developed by <strong className="text-slate-800 dark:text-slate-200">Sukanta Nandi</strong>
        </div>
      </div>
    </div>
  );
};

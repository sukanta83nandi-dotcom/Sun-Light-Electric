import React, { useState, useRef } from 'react';
import { Supplier, SupplierDocument } from '../types/supplier';
import { Language } from '../types';
import {
  Building2,
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Trash2,
  Landmark,
  IndianRupee,
  Clock,
  Layers,
  FileText,
  CreditCard,
  Send,
  ExternalLink,
  Paperclip,
  Eye,
  File,
  Image as ImageIcon,
  X,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { AddSupplierModal } from './AddSupplierModal';
import {
  exportSuppliersToExcel,
  importSuppliersFromExcel,
  downloadSupplierExcelTemplate,
} from '../utils/excelSupplierHelper';

interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  lang: Language;
  onNavigateToChallans?: () => void;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers,
  setSuppliers,
  lang,
  onNavigateToChallans,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [payableFilter, setPayableFilter] = useState<'ALL' | 'WITH_DUES' | 'CLEARED'>('ALL');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Settlement prompt state
  const [settlingSupplier, setSettlingSupplier] = useState<Supplier | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);

  // KYC Documents Viewing state
  const [selectedKycSupplier, setSelectedKycSupplier] = useState<Supplier | null>(null);
  const [previewKycDoc, setPreviewKycDoc] = useState<SupplierDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadDoc = (doc: SupplierDocument) => {
    if (!doc.dataUrl) {
      alert(`File content for "${doc.name}" is not locally stored.`);
      return;
    }
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sanitize phone for tel: and wa.me:
  const sanitizePhoneNumber = (phone: string) => phone.replace(/[^0-9]/g, '');

  const handleDirectCall = (phone: string) => {
    window.location.href = `tel:${sanitizePhoneNumber(phone)}`;
  };

  const handleDirectWhatsApp = (supplier: Supplier) => {
    const clean = sanitizePhoneNumber(supplier.phone);
    const target = clean.startsWith('91') ? clean : `91${clean}`;
    const duesText = supplier.balancePayable > 0 
      ? ` Regarding our outstanding balance of ₹${supplier.balancePayable.toLocaleString('en-IN')}, we are processing payment reconciliation.`
      : '';
    const message = encodeURIComponent(
      `Hello ${supplier.contactPerson} (${supplier.companyName}), Haradhan Patra here from Sun Light Electric (Pursurah, Hooghly). Inquiring regarding ${supplier.categorySupplied} supply, dispatch schedule & tax invoice.${duesText}`
    );
    window.open(`https://wa.me/${target}?text=${message}`, '_blank');
  };

  const handleDirectEmail = (supplier: Supplier) => {
    if (!supplier.email) {
      alert(`No email address recorded for ${supplier.companyName}.`);
      return;
    }
    const subject = encodeURIComponent(
      `Solar Equipment Procurement & Dispatch Inquiry - Sun Light Electric (${supplier.supplierCode})`
    );
    const body = encodeURIComponent(
      `Dear ${supplier.contactPerson},\n\n` +
      `Greetings from Sun Light Electric, Pursurah, Hooghly (West Bengal).\n\n` +
      `We are reviewing our inventory requirements for ${supplier.categorySupplied}.\n` +
      `Kindly share your latest price list, GST credit invoice, and dispatch lead times.\n\n` +
      (supplier.balancePayable > 0
        ? `Current ledger outstanding balance with us: ₹${supplier.balancePayable.toLocaleString('en-IN')}.\n\n`
        : '') +
      `Warm regards,\n` +
      `Haradhan Patra\n` +
      `Managing Director, Sun Light Electric\n` +
      `Phone: +91 7908798079 | Email: sunlightelectric.1984@gmail.com`
    );
    window.location.href = `mailto:${supplier.email}?subject=${subject}&body=${body}`;
  };

  // Bulk Excel Import
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importSuppliersFromExcel(file, suppliers);
      setSuppliers(result.updatedSuppliers);

      let msg = `Bulk Supplier Excel Import Complete:\n• Total Parsed Rows: ${result.totalParsed}\n• New Suppliers Added: ${result.addedCount}\n• Existing Suppliers Updated: ${result.updatedCount}`;
      if (result.errors.length > 0) {
        msg += `\n\nNotes/Skipped Rows:\n` + result.errors.join('\n');
      }
      alert(msg);
    } catch (err: any) {
      alert(`Import Error: ${err || 'Failed to process Excel file'}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveSupplier = (supplierData: Supplier) => {
    if (editingSupplier) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === editingSupplier.id ? supplierData : s))
      );
    } else {
      setSuppliers((prev) => [supplierData, ...prev]);
    }
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete supplier "${name}"? This action cannot be undone.`)) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Quick Settle Balance
  const handleConfirmSettle = () => {
    if (!settlingSupplier) return;
    const paid = Number(settleAmount) || 0;
    if (paid <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    const newBal = Math.max(0, settlingSupplier.balancePayable - paid);
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === settlingSupplier.id ? { ...s, balancePayable: newBal } : s
      )
    );
    alert(`Payment of ₹${paid.toLocaleString('en-IN')} recorded for ${settlingSupplier.companyName}. Remaining balance: ₹${newBal.toLocaleString('en-IN')}`);
    setSettlingSupplier(null);
    setSettleAmount(0);
  };

  // Extract unique categories across all suppliers
  const allCategories = Array.from(
    new Set(suppliers.map((s) => s.categorySupplied).filter(Boolean))
  );

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.companyName.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.supplierCode.toLowerCase().includes(q) ||
      s.gstin.toLowerCase().includes(q) ||
      s.categorySupplied.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategory === 'All' || s.categorySupplied === selectedCategory;

    let matchesPayable = true;
    if (payableFilter === 'WITH_DUES') {
      matchesPayable = (s.balancePayable || 0) > 0;
    } else if (payableFilter === 'CLEARED') {
      matchesPayable = (s.balancePayable || 0) === 0;
    }

    return matchesSearch && matchesCategory && matchesPayable;
  });

  // KPI Calculations
  const totalBalancePayable = suppliers.reduce((acc, s) => acc + (s.balancePayable || 0), 0);
  const suppliersWithDuesCount = suppliers.filter((s) => (s.balancePayable || 0) > 0).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-2xl shadow-md shadow-amber-500/20 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Solar Equipment Suppliers &amp; Vendors
              </h2>
              <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                Procurement Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Maintain solar panel OEMs, inverter distributors, structure fabricators, credit terms, bank accounts, and batch Excel processing.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Hidden File Input for Excel Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelImport}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {/* Template Download */}
          <button
            type="button"
            onClick={downloadSupplierExcelTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
            title="Download blank sample Excel template for suppliers"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel Template</span>
          </button>

          {/* Import Excel */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-950/60 hover:bg-sky-900 border border-sky-600/40 text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Upload Excel spreadsheet to bulk create or update suppliers"
          >
            <UploadCloud className="w-4 h-4 text-sky-400" />
            <span>Import Excel</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={() => exportSuppliersToExcel(suppliers)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Export full suppliers directory to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          {/* Inward Challans & GRN */}
          {onNavigateToChallans && (
            <button
              type="button"
              onClick={onNavigateToChallans}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Open Supplier Goods Received Notes (GRN) Register"
            >
              <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>GRN &amp; Inward Register</span>
            </button>
          )}

          {/* Add Supplier Button */}
          <button
            type="button"
            onClick={() => {
              setEditingSupplier(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Register Supplier</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Suppliers */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Registered Vendors
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {suppliers.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across solar supply chain
            </div>
          </div>
          <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Balance Payable */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
              Total Dues Payable
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              ₹{totalBalancePayable.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Outstanding vendor credit
            </div>
          </div>
          <div className="p-3 bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pending Vendors Count */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Payment Pending Vendors
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {suppliersWithDuesCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {suppliers.length - suppliersWithDuesCount} vendors fully cleared
            </div>
          </div>
          <div className="p-3 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Equipment Categories */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              Categories Sourced
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {allCategories.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Panels, Inverters, Structures
            </div>
          </div>
          <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor name, contact person, phone, GSTIN, code, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Payables Filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shrink-0">
          {(['ALL', 'WITH_DUES', 'CLEARED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setPayableFilter(filter)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                payableFilter === filter
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {filter === 'ALL' ? 'All Vendors' : filter === 'WITH_DUES' ? 'Has Dues' : 'Cleared'}
            </button>
          ))}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1 p-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl overflow-x-auto shrink-0 max-w-full md:max-w-md">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Categories ({suppliers.length})
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-sky-950 text-white text-[11px] font-bold uppercase tracking-wider border-b border-sky-800">
              <tr>
                <th className="px-4 py-3.5">Code &amp; Category</th>
                <th className="px-4 py-3.5">Supplier / Company</th>
                <th className="px-4 py-3.5">Contact Person</th>
                <th className="px-4 py-3.5 text-center">Direct Comms</th>
                <th className="px-4 py-3.5">GSTIN &amp; State</th>
                <th className="px-4 py-3.5">Bank Details</th>
                <th className="px-4 py-3.5 text-center">Credit Terms</th>
                <th className="px-4 py-3.5 text-right">Balance Payable</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                    <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                      No suppliers matched the current filters.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing your search query or click "Register Supplier" above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const hasDues = (supplier.balancePayable || 0) > 0;

                  return (
                    <tr
                      key={supplier.id}
                      className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Code & Category */}
                      <td className="px-4 py-3.5 align-middle">
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs block w-max">
                          {supplier.supplierCode}
                        </span>
                        <span className="inline-block mt-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                          {supplier.categorySupplied}
                        </span>
                      </td>

                      {/* Company Name & Address */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {supplier.companyName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {supplier.address}
                        </div>
                        <div className="mt-1">
                          {supplier.documents && supplier.documents.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedKycSupplier(supplier)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 px-2 py-0.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                              title="Click to view attached KYC documents"
                            >
                              <Paperclip className="w-2.5 h-2.5" />
                              <span>{supplier.documents.length} KYC {supplier.documents.length === 1 ? 'Doc' : 'Docs'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setIsAddModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title="Upload KYC Documents for this supplier"
                            >
                              <Paperclip className="w-2.5 h-2.5 opacity-60" />
                              <span>+ Attach KYC</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {supplier.contactPerson}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {supplier.phone}
                        </div>
                      </td>

                      {/* Direct Communications Buttons (Call, WhatsApp, Email) */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Direct Phone Call */}
                          <button
                            type="button"
                            onClick={() => handleDirectCall(supplier.phone)}
                            className="p-1.5 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/80 rounded-lg border border-sky-200 dark:border-sky-800 transition-transform active:scale-90 cursor-pointer"
                            title={`Call ${supplier.contactPerson} (${supplier.phone})`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleDirectWhatsApp(supplier)}
                            className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-transform active:scale-90 cursor-pointer"
                            title={`WhatsApp message to ${supplier.contactPerson}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct Email */}
                          <button
                            type="button"
                            onClick={() => handleDirectEmail(supplier)}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-transform active:scale-90 cursor-pointer"
                            title={`Send Procurement Email to ${supplier.email || 'Vendor'}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* GSTIN & State */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {supplier.gstin || 'Unregistered'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {supplier.state || 'West Bengal'}
                        </div>
                      </td>

                      {/* Bank Details */}
                      <td className="px-4 py-3.5 align-middle">
                        {supplier.bankDetails?.accountNo ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px]">
                              <Landmark className="w-3 h-3 text-emerald-600" />
                              <span>{supplier.bankDetails.bankName || 'Bank'}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              A/C: {supplier.bankDetails.accountNo}
                            </div>
                            <div className="text-[9px] font-mono font-bold text-amber-700 dark:text-amber-400">
                              IFSC: {supplier.bankDetails.ifscCode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Not Provided</span>
                        )}
                      </td>

                      {/* Payment Credit Terms */}
                      <td className="px-4 py-3.5 text-center align-middle font-mono font-bold">
                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                          {supplier.paymentTermsDays ?? 30} Days
                        </span>
                      </td>

                      {/* Balance Payable */}
                      <td className="px-4 py-3.5 text-right align-middle font-mono">
                        <div
                          className={`text-sm font-black ${
                            hasDues ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          ₹{(supplier.balancePayable || 0).toLocaleString('en-IN')}
                        </div>
                        {hasDues && (
                          <button
                            type="button"
                            onClick={() => {
                              setSettlingSupplier(supplier);
                              setSettleAmount(supplier.balancePayable);
                            }}
                            className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer block ml-auto"
                          >
                            + Settle Due
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right align-middle">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedKycSupplier(supplier)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title={supplier.documents?.length ? `View ${supplier.documents.length} KYC Documents` : "Attach KYC Documents"}
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Supplier Profile"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupplier(supplier.id, supplier.companyName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete Supplier Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredSuppliers.length > 0 && (
              <tfoot className="bg-sky-950 text-white font-bold text-xs border-t-2 border-sky-800">
                <tr>
                  <td colSpan={7} className="px-4 py-3 font-sans uppercase tracking-wider text-[11px] text-slate-300">
                    TOTAL OUTSTANDING VENDOR PAYABLES ({filteredSuppliers.length} SUPPLIERS)
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-rose-300 text-sm">
                    ₹{filteredSuppliers.reduce((acc, s) => acc + (s.balancePayable || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      <AddSupplierModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingSupplier(null);
        }}
        onSave={handleSaveSupplier}
        editingSupplier={editingSupplier}
        existingSuppliersCount={suppliers.length}
      />

      {/* Settle Due Mini Modal */}
      {settlingSupplier && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Record Vendor Payment</span>
              </div>
              <button
                onClick={() => setSettlingSupplier(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-500">Supplier:</span>
                <p className="font-extrabold text-slate-900 dark:text-white">
                  {settlingSupplier.companyName}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Current Outstanding Due:</span>
                <p className="font-mono font-bold text-rose-600 text-base">
                  ₹{settlingSupplier.balancePayable.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Payment Amount to Settle (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  max={settlingSupplier.balancePayable}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-emerald-600 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setSettlingSupplier(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier KYC Documents Viewer Modal */}
      {selectedKycSupplier && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-sky-800/80">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    KYC &amp; Supporting Documents
                  </h3>
                  <p className="text-xs text-sky-200/80 font-medium">
                    {selectedKycSupplier.companyName} ({selectedKycSupplier.supplierCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKycSupplier(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Supplier Info strip */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500">GSTIN:</span>{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedKycSupplier.gstin || 'Not Provided'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">State:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedKycSupplier.state || 'West Bengal'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {selectedKycSupplier.categorySupplied}
                  </span>
                </div>
              </div>

              {/* Documents */}
              {(!selectedKycSupplier.documents || selectedKycSupplier.documents.length === 0) ? (
                <div className="text-center py-8 space-y-3 bg-amber-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-amber-300 dark:border-slate-700">
                  <FileText className="w-10 h-10 text-amber-500/60 mx-auto" />
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      No KYC documents attached
                    </h5>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Upload GST Certificate, MSME/Udyam registration, or cancelled cheque for vendor reconciliation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sup = selectedKycSupplier;
                      setSelectedKycSupplier(null);
                      setEditingSupplier(sup);
                      setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    + Upload Documents Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Attached Documents ({selectedKycSupplier.documents.length}):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const sup = selectedKycSupplier;
                        setSelectedKycSupplier(null);
                        setEditingSupplier(sup);
                        setIsAddModalOpen(true);
                      }}
                      className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Manage / Add More</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedKycSupplier.documents.map((doc) => {
                      const isPdf = doc.type?.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
                      const isImage = doc.type?.includes('image') || /\.(jpg|jpeg|png|webp|svg)$/i.test(doc.name);

                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                isPdf
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : isImage
                                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {isPdf ? (
                                <FileText className="w-4 h-4" />
                              ) : isImage ? (
                                <ImageIcon className="w-4 h-4" />
                              ) : (
                                <File className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                                  {doc.category || 'KYC Doc'}
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-sm" title={doc.name}>
                                  {doc.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {doc.size} {doc.uploadedAt && `• Added ${doc.uploadedAt}`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {doc.dataUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewKycDoc(doc)}
                                className="flex items-center space-x-1 px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                            )}
                            {doc.dataUrl && (
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(doc)}
                                className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedKycSupplier(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Lightbox in SuppliersTab */}
      {previewKycDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-60 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate max-w-md">
                    {previewKycDoc.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {previewKycDoc.category} • {previewKycDoc.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewKycDoc)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewKycDoc(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950 min-h-[300px]">
              {previewKycDoc.type?.includes('image') || /\.(jpg|jpeg|png|webp|svg)$/i.test(previewKycDoc.name) ? (
                <img
                  src={previewKycDoc.dataUrl}
                  alt={previewKycDoc.name}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg"
                />
              ) : previewKycDoc.type?.includes('pdf') || previewKycDoc.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewKycDoc.dataUrl}
                  title={previewKycDoc.name}
                  className="w-full h-[65vh] rounded-xl border border-slate-300 dark:border-slate-800 bg-white"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    Direct preview is not supported for this file type.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(previewKycDoc)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Download to view file
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

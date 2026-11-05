import React, { useState, useMemo, useEffect } from 'react';
import { SupplierChallan } from '../types/challan';
import { QuotationInvoice, Customer, Language } from '../types';
import { Supplier } from '../types/supplier';
import { FinanceNote } from '../types/finance';
import { INITIAL_FINANCE_NOTES } from '../data/mockFinanceNotes';
import {
  ShoppingBag,
  Receipt,
  FileSpreadsheet,
  Calendar,
  Search,
  Filter,
  Download,
  RotateCcw,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  PackageCheck,
  BarChart3,
  ChevronDown,
  Layers,
  ArrowUpDown,
  Tag,
  DollarSign,
  Zap,
  X,
  FileText,
  ExternalLink,
  ReceiptText,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { NonPoGrnRecord, INITIAL_NON_PO_GRN_RECORDS } from '../types/nonPoGrn';
import { NonPoGrnReportView } from './NonPoGrnReportView';
import { useDebounce } from '../utils/useDebounce';

export type ReportType = 'purchase' | 'invoice' | 'non_po_grn' | 'non-po-grn-report';

interface ReportsTabProps {
  challans: SupplierChallan[];
  documents: QuotationInvoice[];
  suppliers: Supplier[];
  customers: Customer[];
  financeNotes?: FinanceNote[];
  nonPoGrnRecords?: NonPoGrnRecord[];
  lang: Language;
  currentSubView?: ReportType;
  onSubViewChange?: (view: ReportType) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  challans,
  documents,
  suppliers,
  customers,
  financeNotes,
  nonPoGrnRecords,
  lang,
  currentSubView = 'purchase',
  onSubViewChange,
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>(currentSubView);
  const [selectedNoteForPreview, setSelectedNoteForPreview] = useState<FinanceNote | null>(null);

  // Synchronize internal active Non-PO records from prop or fallback to localStorage / mock
  const activeNonPoRecords: NonPoGrnRecord[] = useMemo(() => {
    if (nonPoGrnRecords !== undefined) return nonPoGrnRecords;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sle_non_po_grn_records');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_NON_PO_GRN_RECORDS;
  }, [nonPoGrnRecords]);

  // Synchronize internal active notes from prop or fallback to localStorage / mock
  const activeNotes: FinanceNote[] = useMemo(() => {
    if (financeNotes !== undefined) return financeNotes;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sle_finance_notes');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_FINANCE_NOTES;
  }, [financeNotes]);

  useEffect(() => {
    if (currentSubView) {
      setActiveReport(currentSubView);
    }
  }, [currentSubView]);

  const handleSelectReport = (rep: ReportType) => {
    setActiveReport(rep);
    onSubViewChange?.(rep);
  };

  // -------------------------------------------------------------
  // HELPER: DATE PRESETS
  // -------------------------------------------------------------
  const getInitialDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    return { from: firstDay, to: today };
  };

  // -------------------------------------------------------------
  // NOTE LINKING HELPERS
  // -------------------------------------------------------------
  /**
   * Links a Customer Tax Invoice with Debit Notes (DN) and Credit Notes (CN)
   */
  const getLinkedNotesForInvoice = (inv: QuotationInvoice) => {
    const docNo = inv.documentNumber?.trim().toLowerCase();
    const docId = inv.id?.trim().toLowerCase();
    const custName = inv.customerName?.trim().toLowerCase();

    const matched = activeNotes.filter((n) => {
      if (n.status === 'Cancelled') return false;
      const ref = n.referenceInvoiceNo?.trim().toLowerCase();
      if (!ref) return false;
      return (
        ref === docNo ||
        ref === docId ||
        (n.partyType === 'Buyer' && n.partyName?.trim().toLowerCase() === custName && ref === docNo)
      );
    });

    const creditNotes = matched.filter((n) => n.noteType === 'Credit Note');
    const debitNotes = matched.filter((n) => n.noteType === 'Debit Note');

    const totalCreditAmount = creditNotes.reduce((sum, n) => sum + Number(n.grandTotal || 0), 0);
    const totalDebitAmount = debitNotes.reduce((sum, n) => sum + Number(n.grandTotal || 0), 0);

    const originalBill = Number(inv.grandTotal || 0);
    // Net adjustment on customer bill: - Credit Note + Debit Note
    const netAdjustment = totalDebitAmount - totalCreditAmount;
    const adjustedNetPayable = Math.max(0, originalBill - totalCreditAmount + totalDebitAmount);

    const received = Number(inv.totalPaid || (originalBill - (inv.dueAmount || 0)));
    const adjustedDue = Math.max(0, adjustedNetPayable - received);
    const adjustedStatus =
      adjustedDue <= 0 ? 'Fully Paid' : received > 0 ? 'Partially Paid' : 'Unpaid';

    return {
      matchedNotes: matched,
      creditNotes,
      debitNotes,
      totalCreditAmount,
      totalDebitAmount,
      originalBill,
      netAdjustment,
      adjustedNetPayable,
      received,
      adjustedDue,
      adjustedStatus,
    };
  };

  /**
   * Links a Supplier Procurement Challan / GRN with Debit Notes (DN) and Credit Notes (CN)
   */
  const getLinkedNotesForChallan = (c: SupplierChallan) => {
    const invNo = c.challanInvoiceNo?.trim().toLowerCase();
    const grnNo = c.challanCode?.trim().toLowerCase();
    const id = c.id?.trim().toLowerCase();
    const suppName = c.supplierName?.trim().toLowerCase();

    const matched = activeNotes.filter((n) => {
      if (n.status === 'Cancelled') return false;
      const ref = n.referenceInvoiceNo?.trim().toLowerCase();
      if (!ref) return false;
      return (
        ref === invNo ||
        ref === grnNo ||
        ref === id ||
        (n.partyType === 'Supplier' && n.partyName?.trim().toLowerCase() === suppName && (ref === invNo || ref === grnNo))
      );
    });

    const debitNotes = matched.filter((n) => n.noteType === 'Debit Note'); // DN issued to supplier (rejection/rate diff) reduces supplier payable
    const creditNotes = matched.filter((n) => n.noteType === 'Credit Note'); // CN received from supplier

    const dnAmount = debitNotes.reduce((sum, n) => sum + Number(n.grandTotal || 0), 0);
    const cnAmount = creditNotes.reduce((sum, n) => sum + Number(n.grandTotal || 0), 0);

    const originalGrandTotal = Number(c.grandTotal || 0);
    // Adjusted procurement: Original Grand Total - DN Amount + CN Amount
    const adjustedGrandTotal = Math.max(0, originalGrandTotal - dnAmount + cnAmount);
    const netAdjustment = -dnAmount + cnAmount;

    return {
      matchedNotes: matched,
      debitNotes,
      creditNotes,
      dnAmount,
      cnAmount,
      originalGrandTotal,
      adjustedGrandTotal,
      netAdjustment,
    };
  };

  // -------------------------------------------------------------
  // 1. PURCHASE REPORT STATE & FILTERING
  // -------------------------------------------------------------
  const initialPurchaseDates = getInitialDates();
  const [purchaseFromDate, setPurchaseFromDate] = useState<string>(initialPurchaseDates.from);
  const [purchaseToDate, setPurchaseToDate] = useState<string>(initialPurchaseDates.to);
  const [purchaseSupplier, setPurchaseSupplier] = useState<string>('all');
  const [purchaseSearch, setPurchaseSearch] = useState<string>('');
  const [purchaseActivePreset, setPurchaseActivePreset] = useState<string>('this_month');

  const debouncedPurchaseSearch = useDebounce(purchaseSearch, 250);

  const applyPurchasePreset = (preset: 'this_month' | 'last_month' | 'this_fy' | 'all') => {
    setPurchaseActivePreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (preset === 'this_month') {
      const from = new Date(year, month, 1).toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];
      setPurchaseFromDate(from);
      setPurchaseToDate(to);
    } else if (preset === 'last_month') {
      const from = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const to = new Date(year, month, 0).toISOString().split('T')[0];
      setPurchaseFromDate(from);
      setPurchaseToDate(to);
    } else if (preset === 'this_fy') {
      const fyStartYear = month >= 3 ? year : year - 1;
      const from = new Date(fyStartYear, 3, 1).toISOString().split('T')[0];
      const to = new Date(fyStartYear + 1, 2, 31).toISOString().split('T')[0];
      setPurchaseFromDate(from);
      setPurchaseToDate(to);
    } else if (preset === 'all') {
      setPurchaseFromDate('');
      setPurchaseToDate('');
    }
  };

  const handleResetPurchaseFilters = () => {
    const init = getInitialDates();
    setPurchaseFromDate(init.from);
    setPurchaseToDate(init.to);
    setPurchaseSupplier('all');
    setPurchaseSearch('');
    setPurchaseActivePreset('this_month');
  };

  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      if (purchaseFromDate && c.challanDate < purchaseFromDate) return false;
      if (purchaseToDate && c.challanDate > purchaseToDate) return false;

      if (purchaseSupplier !== 'all') {
        const matchesSupplier =
          c.supplierName?.toLowerCase() === purchaseSupplier.toLowerCase() ||
          c.supplierId === purchaseSupplier;
        if (!matchesSupplier) return false;
      }

      if (debouncedPurchaseSearch.trim()) {
        const q = debouncedPurchaseSearch.toLowerCase().trim();
        const codeMatch = c.challanCode?.toLowerCase().includes(q);
        const invMatch = c.challanInvoiceNo?.toLowerCase().includes(q);
        const suppMatch = c.supplierName?.toLowerCase().includes(q);
        const gstinMatch = c.supplierGstin?.toLowerCase().includes(q);
        const itemMatch = c.items?.some((it) =>
          it.itemDescription?.toLowerCase().includes(q)
        );
        if (!codeMatch && !invMatch && !suppMatch && !gstinMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [challans, purchaseFromDate, purchaseToDate, purchaseSupplier, debouncedPurchaseSearch]);

  // Purchase KPI metrics with DN / CN Reconciliation
  const purchaseMetrics = useMemo(() => {
    let totalOriginalProcurement = 0;
    let totalAdjustedProcurement = 0;
    let totalProcurementAdj = 0;
    let totalTaxable = 0;
    let totalInputGst = 0;
    let totalUnits = 0;
    const uniqueSuppliers = new Set<string>();

    filteredChallans.forEach((c) => {
      const { originalGrandTotal, adjustedGrandTotal, netAdjustment } = getLinkedNotesForChallan(c);

      totalOriginalProcurement += originalGrandTotal;
      totalAdjustedProcurement += adjustedGrandTotal;
      totalProcurementAdj += netAdjustment;

      totalTaxable += Number(c.totalTaxable || (c.grandTotal - c.totalTax) || 0);
      totalInputGst += Number(c.totalTax || 0);
      if (c.supplierName) uniqueSuppliers.add(c.supplierName);
      if (c.items && Array.isArray(c.items)) {
        c.items.forEach((it) => {
          totalUnits += Number(it.quantity || 0);
        });
      }
    });

    return {
      totalOriginalProcurement,
      totalAdjustedProcurement,
      totalProcurementAdj,
      totalTaxable,
      totalInputGst,
      totalUnits,
      activeSuppliersCount: uniqueSuppliers.size,
    };
  }, [filteredChallans, activeNotes]);

  // Export Purchase Report to Excel with DN / CN reconciliation columns
  const handleExportPurchaseExcel = () => {
    if (filteredChallans.length === 0) {
      alert('No purchase records available in the filtered view to export.');
      return;
    }

    const exportRows = filteredChallans.map((c, idx) => {
      const itemsSummary = (c.items || [])
        .map((it) => `${it.itemDescription} (${it.quantity} ${it.unit || 'PCS'})`)
        .join('; ');

      const {
        matchedNotes,
        dnAmount,
        cnAmount,
        originalGrandTotal,
        adjustedGrandTotal,
        netAdjustment,
      } = getLinkedNotesForChallan(c);

      const noteRefStr = matchedNotes.map((n) => n.noteNumber).join(', ') || '-';
      const noteTypeStr =
        matchedNotes.length > 0
          ? Array.from(new Set(matchedNotes.map((n) => n.noteType))).join(', ')
          : '-';

      const adjSummary =
        matchedNotes.length === 0
          ? 0
          : netAdjustment;

      return {
        'Sl No': idx + 1,
        'Date': c.challanDate,
        'GRN Code': c.challanCode || `GRN-${c.id}`,
        'Supplier Name': c.supplierName,
        'Supplier GSTIN': c.supplierGstin || '-',
        'Supplier Invoice / Challan No': c.challanInvoiceNo,
        'Items & Quantity': itemsSummary,
        'Taxable Value (INR)': Number(c.totalTaxable || 0),
        'GST Input Tax (INR)': Number(c.totalTax || 0),
        'Original Grand Total (INR)': originalGrandTotal,
        'Note Ref (DN/CN)': noteRefStr,
        'Note Type': noteTypeStr,
        'Adjustment Value (INR)': adjSummary,
        'Adjusted Grand Total (INR)': adjustedGrandTotal,
        'Status': c.status,
        'Received By': c.receivedBy || 'Haradhan Patra',
      };
    });

    const worksheet = utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 8 },  // Sl No
      { wch: 14 }, // Date
      { wch: 16 }, // GRN Code
      { wch: 32 }, // Supplier Name
      { wch: 20 }, // GSTIN
      { wch: 24 }, // Invoice Ref
      { wch: 45 }, // Items & Qty
      { wch: 18 }, // Taxable
      { wch: 18 }, // GST
      { wch: 22 }, // Original Grand Total
      { wch: 20 }, // Note Ref (DN/CN)
      { wch: 16 }, // Note Type
      { wch: 20 }, // Adjustment Value
      { wch: 22 }, // Adjusted Grand Total
      { wch: 22 }, // Status
      { wch: 18 }, // Received By
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Purchase Procurement Report');
    const filename = `SLE_Purchase_Report_Adjusted_${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, filename);
  };

  // -------------------------------------------------------------
  // 2. INVOICE REPORT STATE & FILTERING
  // -------------------------------------------------------------
  const initialInvoiceDates = getInitialDates();
  const [invoiceFromDate, setInvoiceFromDate] = useState<string>(initialInvoiceDates.from);
  const [invoiceToDate, setInvoiceToDate] = useState<string>(initialInvoiceDates.to);
  const [invoiceCustomer, setInvoiceCustomer] = useState<string>('all');
  const [invoicePaymentStatus, setInvoicePaymentStatus] = useState<string>('all');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [invoiceActivePreset, setInvoiceActivePreset] = useState<string>('this_month');

  const debouncedInvoiceSearch = useDebounce(invoiceSearch, 250);

  const applyInvoicePreset = (preset: 'this_month' | 'last_month' | 'this_fy' | 'all') => {
    setInvoiceActivePreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (preset === 'this_month') {
      const from = new Date(year, month, 1).toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];
      setInvoiceFromDate(from);
      setInvoiceToDate(to);
    } else if (preset === 'last_month') {
      const from = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const to = new Date(year, month, 0).toISOString().split('T')[0];
      setInvoiceFromDate(from);
      setInvoiceToDate(to);
    } else if (preset === 'this_fy') {
      const fyStartYear = month >= 3 ? year : year - 1;
      const from = new Date(fyStartYear, 3, 1).toISOString().split('T')[0];
      const to = new Date(fyStartYear + 1, 2, 31).toISOString().split('T')[0];
      setInvoiceFromDate(from);
      setInvoiceToDate(to);
    } else if (preset === 'all') {
      setInvoiceFromDate('');
      setInvoiceToDate('');
    }
  };

  const handleResetInvoiceFilters = () => {
    const init = getInitialDates();
    setInvoiceFromDate(init.from);
    setInvoiceToDate(init.to);
    setInvoiceCustomer('all');
    setInvoicePaymentStatus('all');
    setInvoiceSearch('');
    setInvoiceActivePreset('this_month');
  };

  // Only Invoices (not Quotations)
  const allInvoices = useMemo(() => {
    return documents.filter((d) => d.type === 'Invoice');
  }, [documents]);

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // 1. Date Range
      if (invoiceFromDate && inv.date < invoiceFromDate) return false;
      if (invoiceToDate && inv.date > invoiceToDate) return false;

      // 2. Customer Filter
      if (invoiceCustomer !== 'all') {
        const matchesCustomer =
          inv.customerName?.toLowerCase() === invoiceCustomer.toLowerCase() ||
          inv.customerId === invoiceCustomer;
        if (!matchesCustomer) return false;
      }

      // 3. Payment Status Filter (Evaluated against adjusted status)
      if (invoicePaymentStatus !== 'all') {
        const { adjustedStatus } = getLinkedNotesForInvoice(inv);
        if (invoicePaymentStatus === 'Paid' && adjustedStatus !== 'Fully Paid' && adjustedStatus !== 'Paid') return false;
        if (invoicePaymentStatus === 'Partially Paid' && adjustedStatus !== 'Partially Paid') return false;
        if (invoicePaymentStatus === 'Overdue' && adjustedStatus !== 'Unpaid' && adjustedStatus !== 'Overdue') return false;
      }

      // 4. Search Query (Invoice No, Customer Name, Phone, Item Description)
      if (debouncedInvoiceSearch.trim()) {
        const q = debouncedInvoiceSearch.toLowerCase().trim();
        const numMatch = inv.documentNumber?.toLowerCase().includes(q);
        const nameMatch = inv.customerName?.toLowerCase().includes(q);
        const phoneMatch = inv.customerPhone?.includes(q);
        const itemMatch = inv.items?.some((it) =>
          it.description?.toLowerCase().includes(q) ||
          it.hsnCode?.includes(q)
        );
        if (!numMatch && !nameMatch && !phoneMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [allInvoices, invoiceFromDate, invoiceToDate, invoiceCustomer, invoicePaymentStatus, debouncedInvoiceSearch, activeNotes]);

  // Invoice KPI metrics with DN / CN Reconciliation
  const invoiceMetrics = useMemo(() => {
    let totalOriginalSales = 0;
    let totalAdjustedSales = 0;
    let totalSalesAdj = 0;
    let totalOutputGst = 0;
    let totalSolarCapacity = 0;
    let totalAdjustedOutstanding = 0;

    filteredInvoices.forEach((inv) => {
      const {
        originalBill,
        adjustedNetPayable,
        netAdjustment,
        adjustedDue,
      } = getLinkedNotesForInvoice(inv);

      totalOriginalSales += originalBill;
      totalAdjustedSales += adjustedNetPayable;
      totalSalesAdj += netAdjustment;

      const gstVal =
        Number(inv.totalGst || 0) ||
        Number(inv.taxTotal || 0) ||
        (Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0)) ||
        (inv.taxableTotal ? inv.grandTotal - inv.taxableTotal : inv.grandTotal * 0.138);
      totalOutputGst += gstVal;
      totalSolarCapacity += Number(inv.systemCapacityKw || 0);
      totalAdjustedOutstanding += adjustedDue;
    });

    return {
      totalOriginalSales,
      totalAdjustedSales,
      totalSalesAdj,
      totalOutputGst,
      totalSolarCapacity,
      totalAdjustedOutstanding,
    };
  }, [filteredInvoices, activeNotes]);

  // Export Invoice Report to Excel with DN / CN reconciliation columns
  const handleExportInvoiceExcel = () => {
    if (filteredInvoices.length === 0) {
      alert('No invoice records available in the filtered view to export.');
      return;
    }

    const exportRows = filteredInvoices.map((inv, idx) => {
      const hsnCodes = Array.from(new Set((inv.items || []).map((it) => it.hsnCode || '85017200'))).join(', ');
      const gstVal =
        Number(inv.totalGst || 0) ||
        Number(inv.taxTotal || 0) ||
        (Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0)) ||
        (inv.taxableTotal ? inv.grandTotal - inv.taxableTotal : inv.grandTotal * 0.138);
      const taxableVal = inv.taxableTotal || Number((inv.grandTotal - gstVal).toFixed(2));

      const {
        matchedNotes,
        originalBill,
        netAdjustment,
        adjustedNetPayable,
        received,
        adjustedDue,
        adjustedStatus,
      } = getLinkedNotesForInvoice(inv);

      const noteRefStr = matchedNotes.map((n) => n.noteNumber).join(', ') || '-';
      const noteTypeStr =
        matchedNotes.length > 0
          ? Array.from(new Set(matchedNotes.map((n) => n.noteType))).join(', ')
          : '-';

      return {
        'Sl No': idx + 1,
        'Date': inv.date,
        'Invoice No': inv.documentNumber,
        'Customer Name': inv.customerName,
        'Phone Number': inv.customerPhone || '-',
        'Capacity (kW)': inv.systemCapacityKw || 0,
        'HSN Codes': hsnCodes,
        'Taxable Amount (INR)': taxableVal,
        'Total GST (INR)': Number(gstVal.toFixed(2)),
        'Original Bill (INR)': originalBill,
        'Linked Note No': noteRefStr,
        'Note Type (DN/CN)': noteTypeStr,
        'DN / CN Adjustment (INR)': netAdjustment,
        'Adjusted Net Payable (INR)': adjustedNetPayable,
        'Received Amount (INR)': received,
        'Final Due (INR)': adjustedDue,
        'Payment Status': adjustedStatus,
      };
    });

    const worksheet = utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 8 },  // Sl No
      { wch: 14 }, // Date
      { wch: 20 }, // Invoice No
      { wch: 30 }, // Customer Name
      { wch: 18 }, // Phone
      { wch: 14 }, // Capacity
      { wch: 16 }, // HSN Codes
      { wch: 18 }, // Taxable Amount
      { wch: 16 }, // Total GST
      { wch: 20 }, // Original Bill
      { wch: 20 }, // Linked Note No
      { wch: 18 }, // Note Type
      { wch: 24 }, // DN/CN Adjustment
      { wch: 24 }, // Adjusted Net Payable
      { wch: 20 }, // Received Amount
      { wch: 18 }, // Final Due
      { wch: 16 }, // Status
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Sales Invoices Report');
    const filename = `SLE_Sales_Invoice_Report_Adjusted_${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, filename);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Module Navigation Header */}
      <div className="bg-gradient-to-r from-[#0f4e56] via-[#005963] to-[#0f4e56] text-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xl border border-[#164e63] space-y-4">
        {/* Title & Brand */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-black/25 border border-white/20 shadow-inner">
              <FileSpreadsheet className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Enterprise Reports &amp; Registers
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  Tax &amp; Procurement
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Inward Supplier Procurement (GRN) • Customer Sales Tax Invoices • DN &amp; CN Reconciled • Sun Light Electric
              </p>
            </div>
          </div>

          {/* Quick Sub-tab Switcher Pills */}
          <div className="flex items-center bg-black/30 p-1.5 rounded-2xl border border-white/15 w-fit">
            <button
              type="button"
              onClick={() => handleSelectReport('purchase')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeReport === 'purchase'
                  ? 'bg-emerald-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-emerald-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Purchase Report (Inward GRN)</span>
              <span className="ml-1 bg-black/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {challans.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectReport('invoice')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeReport === 'invoice'
                  ? 'bg-emerald-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-emerald-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Invoice Report (Sales Register)</span>
              <span className="ml-1 bg-black/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {allInvoices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectReport('non_po_grn')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeReport === 'non_po_grn' || activeReport === 'non-po-grn-report'
                  ? 'bg-teal-400 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-emerald-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Non PO GRN Report</span>
              <span className="ml-1 bg-black/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {activeNonPoRecords.length}
              </span>
            </button>
          </div>
        </div>

        {/* Informative Sub-header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-emerald-100/90 gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Active Ledger View:
            </span>
            <strong className="text-white bg-white/15 px-2.5 py-0.5 rounded-md border border-white/15 font-mono">
              {activeReport === 'purchase'
                ? 'Supplier Inward Procurement & GST Register (Post DN/CN Adjustments)'
                : activeReport === 'invoice'
                ? 'Customer Sales Invoices & Output Tax Register (Reconciled with DN/CN)'
                : 'Operational Expense Inward & Consumable Register (Non-Inventory Audit)'}
            </strong>
          </div>

          <div className="text-[11px] text-emerald-200/80">
            GSTIN: <strong className="text-white font-mono">19AZEPP1218L1Z5</strong> • West Bengal State Code: <strong className="text-white font-mono">19</strong>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODULE 1: PURCHASE REPORT                                     */}
      {/* ============================================================= */}
      {activeReport === 'purchase' && (
        <div className="space-y-6">
          {/* Top KPI Cards (Purchase) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Procurement Value */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Procurement Value
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#0f4e56] dark:text-emerald-400 mt-1">
                  ₹{purchaseMetrics.totalAdjustedProcurement.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Orig: ₹{purchaseMetrics.totalOriginalProcurement.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                  {purchaseMetrics.totalProcurementAdj !== 0 && (
                    <span className={purchaseMetrics.totalProcurementAdj < 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      • Adj: {purchaseMetrics.totalProcurementAdj < 0 ? '-' : '+'}₹{Math.abs(purchaseMetrics.totalProcurementAdj).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Total Input GST Paid */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Input GST Paid
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
                  ₹{purchaseMetrics.totalInputGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Eligible ITC (CGST + SGST)
                </div>
              </div>
              <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Total Units / Inwarded Quantity */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Units Inwarded
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
                  {purchaseMetrics.totalUnits.toLocaleString('en-IN')} Pcs
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Modules, inverters &amp; accessories
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                <PackageCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Active Suppliers Count */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Suppliers
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {purchaseMetrics.activeSuppliersCount} Vendor{purchaseMetrics.activeSuppliersCount !== 1 ? 's' : ''}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Registered procurement sources
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Panel (Purchase) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-[#0f4e56] dark:text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Filter Purchase Records
                </span>
              </div>

              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPurchasePreset('this_month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    purchaseActivePreset === 'this_month'
                      ? 'bg-[#0f4e56] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPurchasePreset('last_month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    purchaseActivePreset === 'last_month'
                      ? 'bg-[#0f4e56] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPurchasePreset('this_fy')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    purchaseActivePreset === 'this_fy'
                      ? 'bg-[#0f4e56] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  This Financial Year
                </button>
                <button
                  type="button"
                  onClick={() => applyPurchasePreset('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    purchaseActivePreset === 'all'
                      ? 'bg-[#0f4e56] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs items-end">
              {/* From Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>From Date</span>
                </label>
                <input
                  type="date"
                  value={purchaseFromDate}
                  onChange={(e) => {
                    setPurchaseFromDate(e.target.value);
                    setPurchaseActivePreset('custom');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                />
              </div>

              {/* To Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>To Date</span>
                </label>
                <input
                  type="date"
                  value={purchaseToDate}
                  onChange={(e) => {
                    setPurchaseToDate(e.target.value);
                    setPurchaseActivePreset('custom');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                />
              </div>

              {/* Supplier Dropdown */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Supplier</span>
                </label>
                <select
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.companyName}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search GRN / Product</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. GRN-2026, TOPCon, Loom"
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleResetPurchaseFilters}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-colors flex items-center justify-center space-x-1"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPurchaseExcel}
                  className="flex-1 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="Export Filtered Purchase Records to Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Purchase Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#164e63] text-white font-black text-[11px] uppercase tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="py-3.5 px-3 text-center">Sl</th>
                    <th className="py-3.5 px-3 text-center">Date</th>
                    <th className="py-3.5 px-3 text-center">GRN Code</th>
                    <th className="py-3.5 px-4">Supplier Name &amp; GSTIN</th>
                    <th className="py-3.5 px-3">Invoice / Challan Ref</th>
                    <th className="py-3.5 px-4">Items &amp; Quantity</th>
                    <th className="py-3.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-3.5 px-3 text-right">GST (₹)</th>
                    <th className="py-3.5 px-3 text-right">Original Bill (₹)</th>
                    <th className="py-3.5 px-3 text-center">Note Ref (DN/CN)</th>
                    <th className="py-3.5 px-3 text-right">Adjustment (₹)</th>
                    <th className="py-3.5 px-4 text-right">Adjusted Total (₹)</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredChallans.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <div className="font-bold text-sm text-slate-600 dark:text-slate-400">
                          No Inward Procurement Records Found
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Try clicking <strong>[This Financial Year]</strong> or <strong>[All Time]</strong> preset to view all historical challans.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredChallans.map((c, idx) => {
                      const {
                        matchedNotes,
                        dnAmount,
                        cnAmount,
                        originalGrandTotal,
                        adjustedGrandTotal,
                        netAdjustment,
                      } = getLinkedNotesForChallan(c);

                      return (
                        <tr
                          key={c.id || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Sl No */}
                          <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {c.challanDate}
                          </td>

                          {/* GRN Code */}
                          <td className="py-3.5 px-3 text-center font-mono font-black text-[#0f4e56] dark:text-emerald-400 whitespace-nowrap">
                            {c.challanCode || `GRN-${c.id}`}
                          </td>

                          {/* Supplier Name & GSTIN */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 min-w-[200px]">
                            <div>{c.supplierName}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal">
                              GSTIN: {c.supplierGstin || 'Not Provided'}
                            </div>
                          </td>

                          {/* Invoice / Challan Ref */}
                          <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap font-bold">
                            {c.challanInvoiceNo}
                          </td>

                          {/* Items & Quantity */}
                          <td className="py-3.5 px-4 min-w-[220px]">
                            <div className="space-y-1">
                              {(c.items || []).map((it, itemIdx) => (
                                <div key={it.id || itemIdx} className="text-[11px] text-slate-700 dark:text-slate-300">
                                  <span className="font-semibold">{it.itemDescription}</span>{' '}
                                  <span className="font-mono font-bold text-[#0f4e56] dark:text-emerald-400">
                                    × {it.quantity} {it.unit || 'PCS'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Taxable Value */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            ₹{Number(c.totalTaxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* GST */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                            ₹{Number(c.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Original Grand Total */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            ₹{originalGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* NOTE REF (DN/CN) */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {matchedNotes.length === 0 ? (
                              <span className="text-slate-400 font-mono text-xs">-</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {matchedNotes.map((n) => (
                                  <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => setSelectedNoteForPreview(n)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                                      n.noteType === 'Debit Note'
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    }`}
                                    title={`Click to view note details (${n.noteType})`}
                                  >
                                    {n.noteNumber}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* ADJUSTMENT (₹) */}
                          <td className="py-3.5 px-3 text-right font-mono whitespace-nowrap">
                            {matchedNotes.length === 0 ? (
                              <span className="text-slate-400 font-mono text-xs">-</span>
                            ) : (
                              <div className="space-y-0.5">
                                {dnAmount > 0 && (
                                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                    -₹{dnAmount.toLocaleString('en-IN')} (DN)
                                  </div>
                                )}
                                {cnAmount > 0 && (
                                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    +₹{cnAmount.toLocaleString('en-IN')} (CN)
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ADJUSTED GRAND TOTAL (₹) */}
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap text-[13px]">
                            ₹{adjustedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer Summary */}
                {filteredChallans.length > 0 && (
                  <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                    <tr>
                      <td colSpan={6} className="py-3 px-4 text-right uppercase text-[11px] text-slate-600 dark:text-slate-400">
                        Consolidated Procurement Totals:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        ₹{purchaseMetrics.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-teal-600 dark:text-teal-400">
                        ₹{purchaseMetrics.totalInputGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ₹{purchaseMetrics.totalOriginalProcurement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center text-[10px] text-slate-500">
                        Net Adj:
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {purchaseMetrics.totalProcurementAdj < 0 ? '-' : '+'}₹{Math.abs(purchaseMetrics.totalProcurementAdj).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#0f4e56] dark:text-emerald-400 font-extrabold text-sm">
                        ₹{purchaseMetrics.totalAdjustedProcurement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODULE 2: INVOICE REPORT                                      */}
      {/* ============================================================= */}
      {activeReport === 'invoice' && (
        <div className="space-y-6">
          {/* Top KPI Cards (Invoice) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Sales Value (Adjusted) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Sales Value
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                  ₹{invoiceMetrics.totalAdjustedSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Orig: ₹{invoiceMetrics.totalOriginalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                  {invoiceMetrics.totalSalesAdj !== 0 && (
                    <span className={invoiceMetrics.totalSalesAdj < 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      • Adj: {invoiceMetrics.totalSalesAdj < 0 ? '-' : '+'}₹{Math.abs(invoiceMetrics.totalSalesAdj).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Total Output GST Collected */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Output GST Collected
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{invoiceMetrics.totalOutputGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Output Tax Liability Reconciled
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Invoiced Solar Capacity */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Invoiced Solar Capacity
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-500 dark:text-amber-400 mt-1">
                  {invoiceMetrics.totalSolarCapacity.toFixed(1)} kW
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Rooftop &amp; Commercial EPC
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-2xl">
                <Zap className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Outstanding Dues (Reconciled with DN/CN) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Outstanding Receivables
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                  ₹{invoiceMetrics.totalAdjustedOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Reconciled balance across clients
                </div>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Panel (Invoice) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-[#0f4e56] dark:text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Filter Sales Invoices
                </span>
              </div>

              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyInvoicePreset('this_month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceActivePreset === 'this_month'
                      ? 'bg-[#0f4e56] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyInvoicePreset('last_month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceActivePreset === 'last_month'
                      ? 'bg-[#0f4e56] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => applyInvoicePreset('this_fy')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceActivePreset === 'this_fy'
                      ? 'bg-[#0f4e56] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  This Financial Year
                </button>
                <button
                  type="button"
                  onClick={() => applyInvoicePreset('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceActivePreset === 'all'
                      ? 'bg-[#0f4e56] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
              {/* From Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>From Date</span>
                </label>
                <input
                  type="date"
                  value={invoiceFromDate}
                  onChange={(e) => {
                    setInvoiceFromDate(e.target.value);
                    setInvoiceActivePreset('custom');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                />
              </div>

              {/* To Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>To Date</span>
                </label>
                <input
                  type="date"
                  value={invoiceToDate}
                  onChange={(e) => {
                    setInvoiceToDate(e.target.value);
                    setInvoiceActivePreset('custom');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                />
              </div>

              {/* Customer Dropdown */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Customer</span>
                </label>
                <select
                  value={invoiceCustomer}
                  onChange={(e) => setInvoiceCustomer(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                >
                  <option value="all">All Customers</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Dropdown */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Payment Status</span>
                </label>
                <select
                  value={invoicePaymentStatus}
                  onChange={(e) => setInvoicePaymentStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                >
                  <option value="all">All Status</option>
                  <option value="Paid">Paid / Fully Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Overdue">Overdue / Unpaid</option>
                </select>
              </div>

              {/* Search input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Invoice / Client</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV/2026, Mondal"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleResetInvoiceFilters}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-colors flex items-center justify-center space-x-1"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportInvoiceExcel}
                  className="flex-1 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="Export Filtered Invoice Records to Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Data Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#164e63] text-white font-black text-[11px] uppercase tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="py-3.5 px-3 text-center">Sl</th>
                    <th className="py-3.5 px-3 text-center">Date</th>
                    <th className="py-3.5 px-3">Invoice No</th>
                    <th className="py-3.5 px-4">Customer Name &amp; Phone</th>
                    <th className="py-3.5 px-3 text-center">Capacity</th>
                    <th className="py-3.5 px-3">HSN</th>
                    <th className="py-3.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-3.5 px-3 text-right">Total GST (₹)</th>
                    <th className="py-3.5 px-3 text-right">Original Bill (₹)</th>
                    <th className="py-3.5 px-3 text-center">DN / CN Adjustment</th>
                    <th className="py-3.5 px-3 text-right">Adjusted Net Payable (₹)</th>
                    <th className="py-3.5 px-3 text-right">Received (₹)</th>
                    <th className="py-3.5 px-3 text-right">Due (₹)</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <div className="font-bold text-sm text-slate-600 dark:text-slate-400">
                          No Customer Invoices Found
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Try clicking <strong>[This Financial Year]</strong> or <strong>[All Time]</strong> preset to view all historical invoices.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => {
                      const gstVal =
                        Number(inv.totalGst || 0) ||
                        Number(inv.taxTotal || 0) ||
                        (Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0)) ||
                        (inv.taxableTotal ? inv.grandTotal - inv.taxableTotal : inv.grandTotal * 0.138);
                      const taxableVal = inv.taxableTotal || Number((inv.grandTotal - gstVal).toFixed(2));
                      const hsnCodes = Array.from(new Set((inv.items || []).map((it) => it.hsnCode || '85017200'))).join(', ');

                      const {
                        matchedNotes,
                        creditNotes,
                        debitNotes,
                        totalCreditAmount,
                        totalDebitAmount,
                        originalBill,
                        netAdjustment,
                        adjustedNetPayable,
                        received,
                        adjustedDue,
                        adjustedStatus,
                      } = getLinkedNotesForInvoice(inv);

                      return (
                        <tr
                          key={inv.id || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Sl No */}
                          <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {inv.date}
                          </td>

                          {/* Invoice No */}
                          <td className="py-3.5 px-3 font-mono font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {inv.documentNumber}
                          </td>

                          {/* Customer Name & Phone */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 min-w-[190px]">
                            <div>{inv.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal">
                              {inv.customerPhone || 'Phone unrecorded'}
                            </div>
                          </td>

                          {/* Capacity */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            {inv.systemCapacityKw || 0} kW
                          </td>

                          {/* HSN Codes */}
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {hsnCodes}
                          </td>

                          {/* Taxable Amount */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            ₹{taxableVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Total GST */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            ₹{gstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* ORIGINAL BILL (₹) */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            ₹{originalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* DN / CN ADJUSTMENT */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {matchedNotes.length === 0 ? (
                              <span className="text-slate-400 font-mono text-xs">-</span>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {matchedNotes.map((n) => (
                                    <button
                                      key={n.id}
                                      type="button"
                                      onClick={() => setSelectedNoteForPreview(n)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                                        n.noteType === 'Credit Note'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                                      }`}
                                      title={`Click to view note details (${n.noteType})`}
                                    >
                                      {n.noteNumber}
                                    </button>
                                  ))}
                                </div>
                                <div className="font-mono text-[11px] font-bold">
                                  {totalCreditAmount > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 block">
                                      -₹{totalCreditAmount.toLocaleString('en-IN')} (CN)
                                    </span>
                                  )}
                                  {totalDebitAmount > 0 && (
                                    <span className="text-rose-600 dark:text-rose-400 block">
                                      +₹{totalDebitAmount.toLocaleString('en-IN')} (DN)
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* ADJUSTED NET PAYABLE (₹) */}
                          <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap text-[13px]">
                            ₹{adjustedNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Received Amount */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            ₹{received.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* DUE (₹) (Adjusted Due) */}
                          <td className="py-3.5 px-3 text-right font-mono font-black whitespace-nowrap">
                            <span className={adjustedDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              ₹{adjustedDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                adjustedStatus === 'Fully Paid' || adjustedStatus === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                  : adjustedStatus === 'Partially Paid'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                              }`}
                            >
                              {adjustedStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer Summary */}
                {filteredInvoices.length > 0 && (
                  <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                    <tr>
                      <td colSpan={6} className="py-3 px-4 text-right uppercase text-[11px] text-slate-600 dark:text-slate-400">
                        Consolidated Sales Totals:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        ₹{(invoiceMetrics.totalOriginalSales - invoiceMetrics.totalOutputGst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{invoiceMetrics.totalOutputGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ₹{invoiceMetrics.totalOriginalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center text-[10px] text-slate-500 font-mono">
                        Net Adj: {invoiceMetrics.totalSalesAdj < 0 ? '-' : '+'}₹{Math.abs(invoiceMetrics.totalSalesAdj).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-extrabold text-sm">
                        ₹{invoiceMetrics.totalAdjustedSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{(invoiceMetrics.totalAdjustedSales - invoiceMetrics.totalAdjustedOutstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-extrabold">
                        ₹{invoiceMetrics.totalAdjustedOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODULE 3: NON PO GRN REPORT (OPERATIONAL & CONSUMABLES)       */}
      {/* ============================================================= */}
      {(activeReport === 'non_po_grn' || activeReport === 'non-po-grn-report') && (
        <NonPoGrnReportView
          records={activeNonPoRecords}
          suppliers={suppliers}
        />
      )}

      {/* ============================================================= */}
      {/* QUICK PREVIEW MODAL: DEBIT / CREDIT NOTE DETAILS              */}
      {/* ============================================================= */}
      {selectedNoteForPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`p-4 text-white flex items-center justify-between ${
              selectedNoteForPreview.noteType === 'Credit Note'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                : 'bg-gradient-to-r from-rose-600 to-amber-700'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-base tracking-tight">{selectedNoteForPreview.noteNumber}</h3>
                    <span className="bg-black/30 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {selectedNoteForPreview.noteType}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedNoteForPreview.status === 'Approved'
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-amber-400 text-slate-950'
                    }`}>
                      {selectedNoteForPreview.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80">
                    Linked Reference: <strong className="text-white font-mono">{selectedNoteForPreview.referenceInvoiceNo || 'Direct Adjustment'}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNoteForPreview(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Primary Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Party Name</span>
                  <div className="font-black text-slate-900 dark:text-slate-100">{selectedNoteForPreview.partyName}</div>
                  <span className="text-[10px] text-slate-500 font-mono">({selectedNoteForPreview.partyType})</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Note Date</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">{selectedNoteForPreview.date}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedNoteForPreview.location} Hub</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Approved By</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">{selectedNoteForPreview.approvedBy || 'Haradhan Patra'}</div>
                </div>
              </div>

              {/* Particulars Table */}
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider block mb-1.5">
                  Adjustment Particulars &amp; Reason:
                </span>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-center">HSN</th>
                        <th className="p-2.5 text-right">Taxable</th>
                        <th className="p-2.5 text-right">GST Rate</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                      {(selectedNoteForPreview.particulars || []).map((p, pIdx) => (
                        <tr key={p.id || pIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">{p.particulars}</td>
                          <td className="p-2.5 text-center font-mono text-slate-500">{p.hsnNo || '85017200'}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            ₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-500">
                            {selectedNoteForPreview.gstDetails?.percentage || 18}%
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                            ₹{(Number(p.amount || 0) * (1 + (selectedNoteForPreview.gstDetails?.percentage || 18) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {selectedNoteForPreview.remarks && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-2.5 rounded-xl text-[11px] text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Remarks: </span>
                  {selectedNoteForPreview.remarks}
                </div>
              )}

              {/* Total Summary Row */}
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="text-slate-500 text-[11px]">
                  Generated On: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedNoteForPreview.generatedOn || selectedNoteForPreview.date}</strong>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Note Adjustment Amount</span>
                  <div className={`text-xl font-black font-mono ${
                    selectedNoteForPreview.noteType === 'Credit Note'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {selectedNoteForPreview.noteType === 'Credit Note' ? '-' : '+'}₹{Number(selectedNoteForPreview.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNoteForPreview(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;

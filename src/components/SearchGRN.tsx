import React, { useState, useMemo } from 'react';
import { SupplierChallan } from '../types/challan';
import { Supplier } from '../types/supplier';
import { PurchaseOrder } from '../types/purchaseOrder';
import { InventoryItem, Language } from '../types';
import { utils, writeFile } from 'xlsx';
import {
  Truck,
  Plus,
  Search,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  Trash2,
  Edit3,
  RotateCcw,
  X,
  AlertCircle,
} from 'lucide-react';
import { AddChallanModal } from './AddChallanModal';
import { ChallanViewerModal } from './ChallanViewerModal';
import { OwnerApprovalModal } from './OwnerApprovalModal';
import { useDebounce } from '../utils/useDebounce';

interface SearchGRNProps {
  challans: SupplierChallan[];
  setChallans: React.Dispatch<React.SetStateAction<SupplierChallan[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  purchaseOrders?: PurchaseOrder[];
  onAddStockLogInward: (
    itemCode: string,
    quantity: number,
    docNo: string,
    supplierName: string,
    remarks: string
  ) => void;
  lang: Language;
}

interface GrnSearchFilters {
  poNo: string;
  supplier: string;
  weighbridgeNo: string;
  invoiceDateFrom: string;
  invoiceDateTo: string;
  grnNo: string;
  invoiceChallanNo: string;
  grnDateFrom: string;
  grnDateTo: string;
}

const EMPTY_FILTERS: GrnSearchFilters = {
  poNo: '',
  supplier: '',
  weighbridgeNo: '',
  invoiceDateFrom: '',
  invoiceDateTo: '',
  grnNo: '',
  invoiceChallanNo: '',
  grnDateFrom: '',
  grnDateTo: '',
};

export const SearchGRN: React.FC<SearchGRNProps> = ({
  challans,
  setChallans,
  suppliers,
  setSuppliers,
  inventory,
  setInventory,
  purchaseOrders = [],
  onAddStockLogInward,
  lang,
}) => {
  // Modal states (conditionally mounted only when open)
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingChallan, setEditingChallan] = useState<SupplierChallan | null>(null);
  const [viewingChallan, setViewingChallan] = useState<SupplierChallan | null>(null);
  const [deleteTargetChallan, setDeleteTargetChallan] = useState<SupplierChallan | null>(null);

  // Filter form state + instant commit counter for Search button
  const [filters, setFilters] = useState<GrnSearchFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<GrnSearchFilters>(EMPTY_FILTERS);

  // Debounce live typing values while also supporting explicit Search click
  const debouncedPoNo = useDebounce(filters.poNo, 200);
  const debouncedSupplier = useDebounce(filters.supplier, 200);
  const debouncedWeighbridgeNo = useDebounce(filters.weighbridgeNo, 200);
  const debouncedGrnNo = useDebounce(filters.grnNo, 200);
  const debouncedInvoiceChallanNo = useDebounce(filters.invoiceChallanNo, 200);

  const effectiveFilters = useMemo<GrnSearchFilters>(
    () => ({
      poNo: appliedFilters.poNo || debouncedPoNo,
      supplier: appliedFilters.supplier || debouncedSupplier,
      weighbridgeNo: appliedFilters.weighbridgeNo || debouncedWeighbridgeNo,
      invoiceDateFrom: filters.invoiceDateFrom,
      invoiceDateTo: filters.invoiceDateTo,
      grnNo: appliedFilters.grnNo || debouncedGrnNo,
      invoiceChallanNo: appliedFilters.invoiceChallanNo || debouncedInvoiceChallanNo,
      grnDateFrom: filters.grnDateFrom,
      grnDateTo: filters.grnDateTo,
    }),
    [
      appliedFilters,
      debouncedPoNo,
      debouncedSupplier,
      debouncedWeighbridgeNo,
      debouncedGrnNo,
      debouncedInvoiceChallanNo,
      filters.invoiceDateFrom,
      filters.invoiceDateTo,
      filters.grnDateFrom,
      filters.grnDateTo,
    ]
  );

  const handleFilterChange = (field: keyof GrnSearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    // Clear stale explicit snapshot on text field edit so debounced typing takes over cleanly
    setAppliedFilters((prev) => ({ ...prev, [field]: '' }));
  };

  const handleApplySearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  // Resolve PO Number & Weighbridge No helper for any challan
  const getResolvedMetadata = useMemo(() => {
    const poByGrn = new Map<string, string>();
    const wbByGrn = new Map<string, string>();

    purchaseOrders.forEach((po) => {
      (po.inwardLogs || []).forEach((log) => {
        if (log.grnNo) {
          poByGrn.set(log.grnNo, po.poNumber);
          if (log.weighbridgeNo) wbByGrn.set(log.grnNo, log.weighbridgeNo);
        }
      });
    });

    return (ch: SupplierChallan) => {
      const code = ch.challanCode || ch.id;
      let resolvedPo = ch.poNumber || (ch.challanCode ? poByGrn.get(ch.challanCode) : undefined) || '';
      if (!resolvedPo && ch.notes) {
        const match = ch.notes.match(/Inwarded from PO\s+([A-Za-z0-9\-/]+)/i);
        if (match) resolvedPo = match[1];
      }
      const resolvedWb =
        ch.weighbridgeNo || (ch.challanCode ? wbByGrn.get(ch.challanCode) : undefined) || '';
      const resolvedGrnDate = ch.challanDate || '';
      const resolvedInvoiceDate = ch.invoiceDate || ch.challanDate || '';

      return {
        grnNo: code,
        poNo: resolvedPo,
        weighbridgeNo: resolvedWb,
        grnDate: resolvedGrnDate,
        invoiceDate: resolvedInvoiceDate,
      };
    };
  }, [purchaseOrders]);

  // Filtered Challans
  const filteredChallans = useMemo(() => {
    const qPo = effectiveFilters.poNo.trim().toLowerCase();
    const qSupplier = effectiveFilters.supplier.trim().toLowerCase();
    const qWb = effectiveFilters.weighbridgeNo.trim().toLowerCase();
    const qGrn = effectiveFilters.grnNo.trim().toLowerCase();
    const qInv = effectiveFilters.invoiceChallanNo.trim().toLowerCase();

    return challans.filter((ch) => {
      const meta = getResolvedMetadata(ch);

      if (qPo) {
        const poMatch =
          meta.poNo.toLowerCase().includes(qPo) ||
          (ch.notes || '').toLowerCase().includes(qPo);
        if (!poMatch) return false;
      }

      if (qSupplier) {
        const supMatch =
          ch.supplierName.toLowerCase().includes(qSupplier) ||
          (ch.supplierGstin || '').toLowerCase().includes(qSupplier);
        if (!supMatch) return false;
      }

      if (qWb) {
        const wbMatch =
          meta.weighbridgeNo.toLowerCase().includes(qWb) ||
          (ch.eWayBillNo || '').toLowerCase().includes(qWb) ||
          (ch.vehicleNo || '').toLowerCase().includes(qWb);
        if (!wbMatch) return false;
      }

      if (qGrn) {
        const grnMatch =
          meta.grnNo.toLowerCase().includes(qGrn) ||
          ch.id.toLowerCase().includes(qGrn);
        if (!grnMatch) return false;
      }

      if (qInv) {
        if (!ch.challanInvoiceNo.toLowerCase().includes(qInv)) {
          return false;
        }
      }

      if (effectiveFilters.invoiceDateFrom && meta.invoiceDate < effectiveFilters.invoiceDateFrom) {
        return false;
      }
      if (effectiveFilters.invoiceDateTo && meta.invoiceDate > effectiveFilters.invoiceDateTo) {
        return false;
      }

      if (effectiveFilters.grnDateFrom && meta.grnDate < effectiveFilters.grnDateFrom) {
        return false;
      }
      if (effectiveFilters.grnDateTo && meta.grnDate > effectiveFilters.grnDateTo) {
        return false;
      }

      return true;
    });
  }, [challans, effectiveFilters, getResolvedMetadata]);

  // Filtered Summary Metrics
  const totalFilteredUnits = useMemo(
    () =>
      filteredChallans.reduce(
        (acc, ch) => acc + ch.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        0
      ),
    [filteredChallans]
  );

  const totalFilteredGrandAmount = useMemo(
    () => filteredChallans.reduce((acc, ch) => acc + (ch.grandTotal || 0), 0),
    [filteredChallans]
  );

  // Handle Save New or Edited Challan with Direct Stock Inflow & Ledger Update
  const handleSaveChallan = (
    newChallan: SupplierChallan,
    directInflow: boolean,
    updateSupplierBalance: boolean
  ) => {
    setChallans((prev) => {
      const exists = prev.some((c) => c.id === newChallan.id);
      if (exists) {
        return prev.map((c) => (c.id === newChallan.id ? newChallan : c));
      }
      return [newChallan, ...prev];
    });

    if (directInflow) {
      setInventory((prevInv) => {
        const updatedInv = [...prevInv];

        newChallan.items.forEach((item) => {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) return;

          const matchIndex = updatedInv.findIndex(
            (inv) =>
              (item.matchingSkuCode && inv.code === item.matchingSkuCode) ||
              inv.name.toLowerCase().trim() === item.itemDescription.toLowerCase().trim()
          );

          if (matchIndex >= 0) {
            const existing = updatedInv[matchIndex];
            const currentStock = existing.currentStock ?? existing.stockLevel ?? 0;
            const newStock = currentStock + qty;

            const incomingSerials = item.serialNumbers || [];
            const existingSerials = existing.availableSerialNumbers || [];
            const serialSet = new Set(existingSerials);
            const uniqueNew = incomingSerials.filter((s) => !serialSet.has(s));
            const mergedSerials = [...existingSerials, ...uniqueNew];

            updatedInv[matchIndex] = {
              ...existing,
              stockLevel: newStock,
              currentStock: newStock,
              buyPrice: item.unitPrice || existing.buyPrice,
              availableSerialNumbers: mergedSerials,
            };

            onAddStockLogInward(
              existing.code,
              qty,
              newChallan.challanInvoiceNo,
              newChallan.supplierName,
              `Inward GRN: ${item.itemDescription} (${qty} ${item.unit})${
                incomingSerials.length > 0 ? ` with ${incomingSerials.length} serials inwarded` : ''
              } via Vehicle ${newChallan.vehicleNo || 'Direct'}`
            );
          } else {
            const newSkuCode =
              item.matchingSkuCode ||
              `SKU-${item.category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

            const newItem: InventoryItem = {
              id: `INV-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              code: newSkuCode,
              name: item.itemDescription,
              nameBn: item.itemDescription,
              description: `Received via Challan ${newChallan.challanInvoiceNo} (HSN: ${item.hsnCode})`,
              category: item.category as any,
              unit: (item.unit === 'SETS' ? 'Sets' : item.unit === 'METERS' ? 'Meters' : 'Pcs') as any,
              buyPrice: item.unitPrice,
              unitRate: Math.round(item.unitPrice * 1.2),
              gstPercent: item.taxRate || 12,
              gstRate: item.taxRate || 12,
              cgstRate: (item.taxRate || 12) / 2,
              sgstRate: (item.taxRate || 12) / 2,
              stockLevel: qty,
              currentStock: qty,
              minStockAlert: 2,
              specifications: `HSN ${item.hsnCode}, Received from ${newChallan.supplierName}`,
              availableSerialNumbers: item.serialNumbers || [],
            };

            updatedInv.unshift(newItem);

            onAddStockLogInward(
              newSkuCode,
              qty,
              newChallan.challanInvoiceNo,
              newChallan.supplierName,
              `Inward GRN (New SKU Created): ${item.itemDescription} (${qty} ${item.unit})${
                (item.serialNumbers || []).length > 0 ? ` with ${item.serialNumbers?.length} serials` : ''
              }`
            );
          }
        });

        return updatedInv;
      });
    }

    if (updateSupplierBalance) {
      setSuppliers((prevSuppliers) =>
        prevSuppliers.map((s) => {
          if (s.id === newChallan.supplierId || s.companyName === newChallan.supplierName) {
            return {
              ...s,
              balancePayable: (s.balancePayable || 0) + newChallan.grandTotal,
            };
          }
          return s;
        })
      );
    }
  };

  // Export filtered GRN rows to Excel
  const handleExportExcel = () => {
    const rows = filteredChallans.flatMap((ch) => {
      const meta = getResolvedMetadata(ch);
      return ch.items.map((item, idx) => ({
        'GRN No': meta.grnNo,
        'GRN Date': meta.grnDate,
        'PO No': meta.poNo || 'Direct Inward',
        'Supplier Name': ch.supplierName,
        'Supplier GSTIN': ch.supplierGstin,
        'Invoice / Challan No': ch.challanInvoiceNo,
        'Invoice Date': meta.invoiceDate,
        'Weighbridge No.': meta.weighbridgeNo || '',
        'E-Way Bill No': ch.eWayBillNo || '',
        'Vehicle No': ch.vehicleNo || '',
        'Dispatch From': ch.dispatchFrom || '',
        'Destination Site': ch.destinationSite,
        'Item #': idx + 1,
        'Item Description': item.itemDescription,
        'HSN Code': item.hsnCode,
        'Category': item.category,
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Taxable Rate (₹)': item.unitPrice,
        'GST %': item.taxRate,
        'CGST (₹)': item.cgstAmount || 0,
        'SGST (₹)': item.sgstAmount || 0,
        'Line Total (₹)': item.totalWithTax || 0,
        'Consignment Total (₹)': ch.grandTotal,
        'Stock Inward Status': ch.status,
        'Received By': ch.receivedBy || 'Haradhan Patra',
      }));
    });

    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'GRN Report');
    writeFile(workbook, `SLE_GRN_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Header Banner: Full-width dark teal gradient ribbon bar */}
      <div className="bg-gradient-to-r from-[#0b3b48] to-[#1d6f7a] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Truck className="w-4 h-4 text-teal-200 shrink-0" />
          <h2 className="font-bold text-sm sm:text-base tracking-wide text-white">
            GRN Report
          </h2>
          <span className="hidden sm:inline-block text-[10px] font-mono bg-white/15 text-teal-50 px-2 py-0.5 rounded">
            Search GRN
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingChallan(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-teal-200 stroke-[2.5]" />
          <span>+ Create GRN / Inward Entry</span>
        </button>
      </div>

      {/* 2. Search Filter Card (2-Column Structured Form Layout) */}
      <form
        onSubmit={handleApplySearch}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-4">
          {/* Left Column (4 Rows) */}
          <div className="space-y-4">
            {/* Row 1: PO No : */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <label
                htmlFor="grn-filter-po-no"
                className="sm:w-40 sm:text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              >
                PO No :
              </label>
              <input
                id="grn-filter-po-no"
                type="text"
                value={filters.poNo}
                onChange={(e) => handleFilterChange('poNo', e.target.value)}
                placeholder="Enter PO No..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
              />
            </div>

            {/* Row 2: Supplier : */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <label
                htmlFor="grn-filter-supplier"
                className="sm:w-40 sm:text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              >
                Supplier :
              </label>
              <div className="relative flex-1">
                <input
                  id="grn-filter-supplier"
                  type="text"
                  list="search-grn-supplier-list"
                  value={filters.supplier}
                  onChange={(e) => handleFilterChange('supplier', e.target.value)}
                  placeholder="Type or select supplier..."
                  className="w-full px-3 py-2 pr-7 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
                />
                {filters.supplier && (
                  <button
                    type="button"
                    onClick={() => handleFilterChange('supplier', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear Supplier"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <datalist id="search-grn-supplier-list">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.companyName || s.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Row 3: Weighbridge No. : */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <label
                htmlFor="grn-filter-weighbridge"
                className="sm:w-40 sm:text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              >
                Weighbridge No. :
              </label>
              <input
                id="grn-filter-weighbridge"
                type="text"
                value={filters.weighbridgeNo}
                onChange={(e) => handleFilterChange('weighbridgeNo', e.target.value)}
                placeholder="Enter Weighbridge No..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
              />
            </div>

            {/* Row 4: Invoice Date : */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <label
                htmlFor="grn-filter-invoice-date-from"
                className="sm:w-40 sm:text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              >
                Invoice Date :
              </label>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  id="grn-filter-invoice-date-from"
                  type="date"
                  value={filters.invoiceDateFrom}
                  onChange={(e) => handleFilterChange('invoiceDateFrom', e.target.value)}
                  title="Invoice From Date"
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
                />
                <input
                  id="grn-filter-invoice-date-to"
                  type="date"
                  value={filters.invoiceDateTo}
                  onChange={(e) => handleFilterChange('invoiceDateTo', e.target.value)}
                  title="Invoice To Date"
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
                />
              </div>
            </div>
          </div>

          {/* Right Column (4 Rows) */}
          <div className="space-y-4">
            {/* Row 1: GRN No : */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <label
                htmlFor="grn-filter-grn-no"
                className="sm:w-40 sm:text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              >
                GRN No :
              </label>
              <input
                id="grn-filter-grn-no"
                type="text"
                value={filters.grnNo}
                onChange={(e) => handleFilterChange('grnNo', e.target.value)}
                placeholder="Enter GRN No..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
              />
            </div>

            {/* Row 2: Invoice / Challan No. : */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <label
                htmlFor="grn-filter-invoice-no"
                className="sm:w-40 sm:text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              >
                Invoice / Challan No. :
              </label>
              <input
                id="grn-filter-invoice-no"
                type="text"
                value={filters.invoiceChallanNo}
                onChange={(e) => handleFilterChange('invoiceChallanNo', e.target.value)}
                placeholder="Enter Invoice / Challan No..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
              />
            </div>

            {/* Row 3: GRN Date : */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <label
                htmlFor="grn-filter-grn-date-from"
                className="sm:w-40 sm:text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              >
                GRN Date :
              </label>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  id="grn-filter-grn-date-from"
                  type="date"
                  value={filters.grnDateFrom}
                  onChange={(e) => handleFilterChange('grnDateFrom', e.target.value)}
                  title="GRN From Date"
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
                />
                <input
                  id="grn-filter-grn-date-to"
                  type="date"
                  value={filters.grnDateTo}
                  onChange={(e) => handleFilterChange('grnDateTo', e.target.value)}
                  title="GRN To Date"
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#104e5b]"
                />
              </div>
            </div>

            {/* Row 4: Action Row aligned directly under the GRN Date inputs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 pt-0.5">
              <div className="hidden sm:block sm:w-40 shrink-0" aria-hidden="true" />
              <div className="flex-1 flex items-center gap-2.5">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 bg-[#104e5b] hover:bg-[#0b3b48] active:scale-95 text-white font-semibold px-6 py-2 rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-teal-200" />
                  <span>Search</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 3. Results Register Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Truck className="w-4 h-4 text-[#104e5b] dark:text-teal-400" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
              Goods Received Notes (GRN) Register
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-mono font-bold text-slate-700 dark:text-slate-300">
              {filteredChallans.length} of {challans.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span>
                Units: <strong className="text-slate-900 dark:text-slate-100">{totalFilteredUnits}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>
                Total Value:{' '}
                <strong className="text-[#104e5b] dark:text-teal-400">
                  ₹{totalFilteredGrandAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredChallans.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Download filtered GRN Register to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {filteredChallans.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              No GRN records found
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {challans.length === 0
                ? 'No Goods Received Notes recorded yet. Click "+ Create GRN / Inward Entry" above to record incoming stock.'
                : 'No GRN records match your current filter criteria. Try adjusting or clearing the filters.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {challans.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingChallan(null);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-[#104e5b] hover:bg-[#0b3b48] text-white font-semibold rounded-lg text-xs cursor-pointer"
              >
                + Create GRN / Inward Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0f4e56] text-white uppercase text-[10px] font-bold tracking-wider border-b border-[#0b383e]">
                  <th className="py-3 px-3 text-center w-12">SL</th>
                  <th className="py-3 px-4">GRN No &amp; Date</th>
                  <th className="py-3 px-4">PO No</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Invoice / Challan No &amp; Date</th>
                  <th className="py-3 px-4">Weighbridge &amp; Vehicle</th>
                  <th className="py-3 px-4">Inward Equipment Breakdown</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredChallans.map((ch, idx) => {
                  const meta = getResolvedMetadata(ch);
                  return (
                    <tr
                      key={ch.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* SL */}
                      <td className="py-3.5 px-3 align-top text-center font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* GRN No & Date */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className="inline-block text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/15 text-[#0f4e56] dark:text-teal-300 border border-teal-500/30">
                          {meta.grnNo}
                        </span>
                        <div className="font-mono font-semibold text-slate-700 dark:text-slate-300 mt-1">
                          {meta.grnDate}
                        </div>
                      </td>

                      {/* PO No */}
                      <td className="py-3.5 px-4 align-top font-mono whitespace-nowrap">
                        {meta.poNo ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-[11px]">
                            {meta.poNo}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Direct Inward</span>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {ch.supplierName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          GSTIN: {ch.supplierGstin || 'Unregistered'}
                        </div>
                      </td>

                      {/* Invoice / Challan No & Date */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {ch.challanInvoiceNo}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Date: {meta.invoiceDate || '—'}
                        </div>
                      </td>

                      {/* Weighbridge & Vehicle */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          WB: {meta.weighbridgeNo || '—'}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mt-0.5">
                          Veh: {ch.vehicleNo || 'N/A'}
                        </div>
                        {ch.eWayBillNo && (
                          <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400">
                            EWB: {ch.eWayBillNo}
                          </div>
                        )}
                      </td>

                      {/* Equipment Breakdown */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          {ch.items.map((it) => (
                            <div
                              key={it.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium mr-1.5 mb-1"
                            >
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {it.quantity} {it.unit}
                              </span>
                              <span
                                className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]"
                                title={it.itemDescription}
                              >
                                {it.itemDescription}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          ₹{ch.grandTotal.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Tax: ₹{ch.totalTax.toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Inwarded</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => setEditingChallan(ch)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Edit GRN Details & Line Items"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setViewingChallan(ch)}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition-colors cursor-pointer"
                            title="View GRN Details & Print Slip"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTargetChallan(ch)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Delete GRN record (Owner Authorization Required)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Challan Modal (Conditionally Mounted) */}
      {showAddModal && (
        <AddChallanModal
          onClose={() => setShowAddModal(false)}
          onSaveChallan={handleSaveChallan}
          suppliers={suppliers}
          inventory={inventory}
          lang={lang}
        />
      )}

      {/* Edit Challan Modal (Conditionally Mounted) */}
      {editingChallan && (
        <AddChallanModal
          existingChallan={editingChallan}
          onClose={() => setEditingChallan(null)}
          onSaveChallan={handleSaveChallan}
          suppliers={suppliers}
          inventory={inventory}
          lang={lang}
        />
      )}

      {/* Challan & GRN Viewer Modal (Conditionally Mounted) */}
      {viewingChallan && (
        <ChallanViewerModal
          challan={viewingChallan}
          onClose={() => setViewingChallan(null)}
          lang={lang}
        />
      )}

      {/* Owner Authorization Deletion Modal (Conditionally Mounted) */}
      {deleteTargetChallan && (
        <OwnerApprovalModal
          isOpen={Boolean(deleteTargetChallan)}
          onClose={() => setDeleteTargetChallan(null)}
          onConfirm={() => {
            if (deleteTargetChallan) {
              setChallans((prev) => prev.filter((c) => c.id !== deleteTargetChallan.id));
              alert(
                `GRN record ${
                  deleteTargetChallan.challanCode || deleteTargetChallan.challanInvoiceNo
                } permanently deleted with owner authorization.`
              );
              setDeleteTargetChallan(null);
            }
          }}
          itemTitle={`${deleteTargetChallan.challanCode || 'GRN'} (Ref: ${
            deleteTargetChallan.challanInvoiceNo
          })`}
          itemSubtitle={`Supplier: ${deleteTargetChallan.supplierName} • Total: ₹${deleteTargetChallan.grandTotal.toLocaleString(
            'en-IN'
          )}`}
          itemType="GRN"
        />
      )}
    </div>
  );
};

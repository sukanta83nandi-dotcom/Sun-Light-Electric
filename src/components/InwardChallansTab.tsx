import React, { useState, useMemo } from 'react';
import { SupplierChallan } from '../types/challan';
import { Supplier } from '../types/supplier';
import { InventoryItem, Language } from '../types';
import { utils, writeFile } from 'xlsx';
import {
  Truck,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Building2,
  Calendar,
  Eye,
  FileText,
  CheckCircle2,
  Package,
  Layers,
  ArrowDownRight,
  TrendingUp,
  Trash2,
  Edit3,
  MapPin,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { AddChallanModal } from './AddChallanModal';
import { ChallanViewerModal } from './ChallanViewerModal';
import { OwnerApprovalModal } from './OwnerApprovalModal';

interface InwardChallansTabProps {
  challans: SupplierChallan[];
  setChallans: React.Dispatch<React.SetStateAction<SupplierChallan[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  onAddStockLogInward: (
    itemCode: string,
    quantity: number,
    docNo: string,
    supplierName: string,
    remarks: string
  ) => void;
  lang: Language;
}

export const InwardChallansTab: React.FC<InwardChallansTabProps> = ({
  challans,
  setChallans,
  suppliers,
  setSuppliers,
  inventory,
  setInventory,
  onAddStockLogInward,
  lang,
}) => {
  // Modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingChallan, setEditingChallan] = useState<SupplierChallan | null>(null);
  const [viewingChallan, setViewingChallan] = useState<SupplierChallan | null>(null);
  const [deleteTargetChallan, setDeleteTargetChallan] = useState<SupplierChallan | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');

  // Filtered Challans
  const filteredChallans = useMemo(() => {
    return challans.filter((ch) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = ch.challanInvoiceNo.toLowerCase().includes(q);
        const matchesSupplier = ch.supplierName.toLowerCase().includes(q);
        const matchesEWay = (ch.eWayBillNo || '').toLowerCase().includes(q);
        const matchesVehicle = (ch.vehicleNo || '').toLowerCase().includes(q);
        const matchesItems = ch.items.some((i) =>
          i.itemDescription.toLowerCase().includes(q) || (i.hsnCode || '').includes(q)
        );
        if (!matchesNo && !matchesSupplier && !matchesEWay && !matchesVehicle && !matchesItems) {
          return false;
        }
      }

      // 2. Supplier Filter
      if (supplierFilter !== 'All' && ch.supplierId !== supplierFilter && ch.supplierName !== supplierFilter) {
        return false;
      }

      return true;
    });
  }, [challans, searchQuery, supplierFilter]);

  // Aggregate Metrics
  const totalChallansCount = challans.length;
  const totalUnitsReceived = challans.reduce(
    (acc, ch) => acc + ch.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    0
  );
  const totalTaxableAmount = challans.reduce((acc, ch) => acc + (ch.totalTaxable || 0), 0);
  const totalGrandAmount = challans.reduce((acc, ch) => acc + (ch.grandTotal || 0), 0);

  // Handle Save New Challan with Direct Stock Inflow & Ledger Update
  const handleSaveChallan = (
    newChallan: SupplierChallan,
    directInflow: boolean,
    updateSupplierBalance: boolean
  ) => {
    // 1. Add or update Challans list
    setChallans((prev) => {
      const exists = prev.some((c) => c.id === newChallan.id);
      if (exists) {
        return prev.map((c) => (c.id === newChallan.id ? newChallan : c));
      }
      return [newChallan, ...prev];
    });

    // 2. Direct Stock Inflow: Update Inventory & create Stock Log entries
    if (directInflow) {
      setInventory((prevInv) => {
        let updatedInv = [...prevInv];

        newChallan.items.forEach((item) => {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) return;

          // Find matching item by matchingSkuCode or item description
          const matchIndex = updatedInv.findIndex(
            (inv) =>
              (item.matchingSkuCode && inv.code === item.matchingSkuCode) ||
              inv.name.toLowerCase().trim() === item.itemDescription.toLowerCase().trim()
          );

          if (matchIndex >= 0) {
            // Update existing stock
            const existing = updatedInv[matchIndex];
            const currentStock = existing.currentStock ?? existing.stockLevel ?? 0;
            const newStock = currentStock + qty;

            // Merge incoming serial numbers without duplicates
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

            // Call stock log helper
            onAddStockLogInward(
              existing.code,
              qty,
              newChallan.challanInvoiceNo,
              newChallan.supplierName,
              `Inward GRN: ${item.itemDescription} (${qty} ${item.unit})${incomingSerials.length > 0 ? ` with ${incomingSerials.length} serials inwarded` : ''} via Vehicle ${newChallan.vehicleNo || 'Direct'}`
            );
          } else {
            // Auto-create new SKU in inventory!
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
              unitRate: Math.round(item.unitPrice * 1.2), // Default 20% margin
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

            // Log Inward
            onAddStockLogInward(
              newSkuCode,
              qty,
              newChallan.challanInvoiceNo,
              newChallan.supplierName,
              `Inward GRN (New SKU Created): ${item.itemDescription} (${qty} ${item.unit})${(item.serialNumbers || []).length > 0 ? ` with ${item.serialNumbers?.length} serials` : ''}`
            );
          }
        });

        return updatedInv;
      });
    }

    // 3. Update Supplier Ledger
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

  // Delete Challan
  const handleDeleteChallan = (challanId: string) => {
    if (confirm('Are you sure you want to delete this delivery challan record?')) {
      setChallans((prev) => prev.filter((c) => c.id !== challanId));
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = challans.flatMap((ch) =>
      ch.items.map((item, idx) => ({
        'Challan Date': ch.challanDate,
        'GRN Code': ch.challanCode || ch.id,
        'Supplier Name': ch.supplierName,
        'Supplier GSTIN': ch.supplierGstin,
        'Challan / Invoice No': ch.challanInvoiceNo,
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
      }))
    );

    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Inward Challans & GRN');
    writeFile(workbook, `SLE_Supplier_Challans_GRN_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Consignments Count */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Inward Consignments
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {totalChallansCount} GRNs
            </div>
          </div>
        </div>

        {/* Card 2: Total Units Received */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Units Inwarded
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {totalUnitsReceived} Units / Pcs
            </div>
          </div>
        </div>

        {/* Card 3: Total Taxable Inward */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-sky-500/15 text-sky-600 dark:text-sky-400 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Taxable Stock Value
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              ₹{totalTaxableAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Card 4: Grand Billed Consignment Total */}
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total GRN Value (with GST)
            </span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
              ₹{totalGrandAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Search Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by GRN / Inward Entry, Invoice / Challan Ref No, E-Way Bill, Vehicle No (WB18AP2877), Supplier or SKU..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Supplier Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium"
          >
            <option value="All">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer"
            title="Download GRN Register in Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Primary Action Button: Create GRN / Inward Entry */}
          <button
            type="button"
            onClick={() => {
              setEditingChallan(null);
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create GRN / Inward Entry</span>
          </button>
        </div>
      </div>

      {/* Goods Received Notes (GRN) Register */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Goods Received Notes (GRN) Register
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-mono font-bold text-slate-700 dark:text-slate-300">
              {filteredChallans.length}
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Direct stock additions recorded at SOALUK Pursurah Hooghly warehouse
          </span>
        </div>

        {filteredChallans.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              No GRN records found
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No GRN records match your search or filter. Create an inward entry to start tracking stock inflow.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              + Create GRN / Inward Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">
                    <span className="block text-slate-900 dark:text-white font-extrabold tracking-wide">GRN Code</span>
                    <span className="text-[10px] text-slate-500 font-normal">Date &amp; Inward No</span>
                  </th>
                  <th className="py-3 px-4">Supplier &amp; Dispatcher</th>
                  <th className="py-3 px-4 font-mono font-bold">Invoice / Challan Ref No</th>
                  <th className="py-3 px-4 font-mono">E-Way Bill &amp; Vehicle</th>
                  <th className="py-3 px-4">Inward Equipment Breakdown</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-center">Stock Inflow</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredChallans.map((ch) => (
                  <tr
                    key={ch.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Date & GRN Code */}
                    <td className="py-3.5 px-4 align-top">
                      <span className="inline-block text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/30">
                        {ch.challanCode || ch.id}
                      </span>
                      <div className="font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {ch.challanDate}
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100">
                        {ch.supplierName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        GSTIN: {ch.supplierGstin || 'Unregistered'}
                      </div>
                      {ch.dispatchFrom && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {ch.dispatchFrom}
                        </div>
                      )}
                    </td>

                    {/* Challan / Invoice No */}
                    <td className="py-3.5 px-4 align-top font-mono font-black text-slate-800 dark:text-slate-200">
                      {ch.challanInvoiceNo}
                    </td>

                    {/* E-Way Bill & Vehicle */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                        {ch.eWayBillNo || '—'}
                      </div>
                      <div className="text-[10px] font-mono uppercase font-bold text-slate-700 dark:text-slate-300">
                        Vehicle: {ch.vehicleNo || 'N/A'}
                      </div>
                    </td>

                    {/* Equipment Items */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        {ch.items.map((it) => (
                          <div
                            key={it.id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium mr-1.5 mb-1"
                          >
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {it.quantity} {it.unit}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={it.itemDescription}>
                              {it.itemDescription}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        ₹{ch.grandTotal.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Tax: ₹{ch.totalTax.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Status / Stock Inflow */}
                    <td className="py-3.5 px-4 align-top text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Inwarded</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="flex items-center justify-end space-x-1.5">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Challan Modal */}
      {showAddModal && (
        <AddChallanModal
          onClose={() => setShowAddModal(false)}
          onSaveChallan={handleSaveChallan}
          suppliers={suppliers}
          inventory={inventory}
          lang={lang}
        />
      )}

      {/* Edit Challan Modal */}
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

      {/* Challan & GRN Viewer Modal */}
      {viewingChallan && (
        <ChallanViewerModal
          challan={viewingChallan}
          onClose={() => setViewingChallan(null)}
          lang={lang}
        />
      )}

      {/* Owner Authorization Deletion Modal */}
      {deleteTargetChallan && (
        <OwnerApprovalModal
          isOpen={Boolean(deleteTargetChallan)}
          onClose={() => setDeleteTargetChallan(null)}
          onConfirm={() => {
            if (deleteTargetChallan) {
              setChallans((prev) => prev.filter((c) => c.id !== deleteTargetChallan.id));
              alert(`GRN record ${deleteTargetChallan.challanCode || deleteTargetChallan.challanInvoiceNo} permanently deleted with owner authorization.`);
              setDeleteTargetChallan(null);
            }
          }}
          itemTitle={`${deleteTargetChallan.challanCode || 'GRN'} (Ref: ${deleteTargetChallan.challanInvoiceNo})`}
          itemSubtitle={`Supplier: ${deleteTargetChallan.supplierName} • Total: ₹${deleteTargetChallan.grandTotal.toLocaleString('en-IN')}`}
          itemType="GRN"
        />
      )}

    </div>
  );
};

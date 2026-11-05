import React, { useState, useRef } from 'react';
import { Supplier } from '../types/supplier';
import { InventoryItem, Language, StockLogEntry } from '../types';
import { ChallanItem, SupplierChallan } from '../types/challan';
import {
  X,
  Plus,
  Trash2,
  Truck,
  FileText,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Package,
  Layers,
  Paperclip,
  Check,
  AlertCircle,
  Barcode,
  Hash,
  Sparkles,
  ClipboardPaste,
  AlertTriangle,
} from 'lucide-react';

interface AddChallanModalProps {
  onClose: () => void;
  onSaveChallan: (
    newChallan: SupplierChallan,
    directInflow: boolean,
    updateSupplierBalance: boolean
  ) => void;
  suppliers: Supplier[];
  inventory: InventoryItem[];
  lang: Language;
  preselectedSupplierId?: string;
  existingChallan?: SupplierChallan | null;
}

export const AddChallanModal: React.FC<AddChallanModalProps> = ({
  onClose,
  onSaveChallan,
  suppliers,
  inventory,
  lang,
  preselectedSupplierId,
  existingChallan,
}) => {
  // Preselected supplier if specifically passed via prop or editing
  const targetSupplier = existingChallan?.supplierId
    ? suppliers.find((s) => s.id === existingChallan.supplierId)
    : preselectedSupplierId
    ? suppliers.find((s) => s.id === preselectedSupplierId)
    : null;

  const [supplierId, setSupplierId] = useState<string>(existingChallan?.supplierId || preselectedSupplierId || '');
  const [supplierName, setSupplierName] = useState<string>(existingChallan?.supplierName || targetSupplier?.companyName || '');
  const [supplierGstin, setSupplierGstin] = useState<string>(existingChallan?.supplierGstin || targetSupplier?.gstin || '');
  const [dispatchFrom, setDispatchFrom] = useState<string>(
    existingChallan?.dispatchFrom || (targetSupplier?.address ? `${targetSupplier.address}, ${targetSupplier.state}` : '')
  );
  const [destinationSite, setDestinationSite] = useState<string>(
    existingChallan?.destinationSite || 'SOALUK, Pursurah, Hooghly - 712410'
  );
  
  const [challanInvoiceNo, setChallanInvoiceNo] = useState<string>(existingChallan?.challanInvoiceNo || '');
  const [challanDate, setChallanDate] = useState<string>(existingChallan?.challanDate || new Date().toISOString().split('T')[0]);
  const [eWayBillNo, setEWayBillNo] = useState<string>(existingChallan?.eWayBillNo || '');
  const [vehicleNo, setVehicleNo] = useState<string>(existingChallan?.vehicleNo || '');
  const [receivedBy, setReceivedBy] = useState<string>(existingChallan?.receivedBy || 'Haradhan Patra');
  const [notes, setNotes] = useState<string>(existingChallan?.notes || '');

  // Direct Stock Inflow & Supplier Balance automation flags
  const [directInflow, setDirectInflow] = useState<boolean>(existingChallan ? false : true);
  const [updateSupplierBalance, setUpdateSupplierBalance] = useState<boolean>(existingChallan ? false : true);

  // Line items state - empty by default on Create mode
  const [items, setItems] = useState<ChallanItem[]>(
    existingChallan?.items && existingChallan.items.length > 0
      ? existingChallan.items
      : []
  );

  // Uploaded Challan Scan
  const [documentUrl, setDocumentUrl] = useState<string>(existingChallan?.documentUrl || '');
  const [documentName, setDocumentName] = useState<string>(existingChallan?.documentName || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When supplier dropdown changes, update details
  const handleSupplierSelect = (id: string) => {
    setSupplierId(id);
    if (!id) {
      setSupplierName('');
      setSupplierGstin('');
      setDispatchFrom('');
      return;
    }
    const found = suppliers.find((s) => s.id === id);
    if (found) {
      setSupplierName(found.companyName);
      setSupplierGstin(found.gstin || '');
      setDispatchFrom(found.address ? `${found.address}, ${found.state}` : '');
    }
  };

  // Recalculate row amounts
  const updateItemRow = (
    index: number,
    field: keyof ChallanItem,
    value: any
  ) => {
    setMismatchedIndex(null);
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      if (field === 'quantity') {
        const newQty = Math.max(0, Number(value) || 0);
        item.quantity = newQty;
        // Strict capping: If existing serial numbers exceed new quantity, slice to match new limit
        if (item.serialNumbers && item.serialNumbers.length > newQty) {
          item.serialNumbers = item.serialNumbers.slice(0, newQty);
        }
      }

      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;

      const taxable = Math.round(qty * price * 100) / 100;
      const halfTaxRate = taxRate / 2;
      const cgst = Math.round((taxable * (halfTaxRate / 100)) * 100) / 100;
      const sgst = Math.round((taxable * (halfTaxRate / 100)) * 100) / 100;
      const totalTax = cgst + sgst;
      const lineTotal = Math.round((taxable + totalTax) * 100) / 100;

      item.totalTaxableAmount = taxable;
      item.cgstAmount = cgst;
      item.sgstAmount = sgst;
      item.totalWithTax = lineTotal;

      copy[index] = item;
      return copy;
    });
  };

  // Handle inventory SKU selection to autofill row
  const handleSelectSkuForIndex = (index: number, skuCode: string) => {
    const invItem = inventory.find((i) => i.code === skuCode);
    if (!invItem) return;

    setItems((prev) => {
      const copy = [...prev];
      const rate = invItem.buyPrice || Math.round(invItem.unitRate * 0.85);
      const taxRate = invItem.gstPercent || 12;
      const qty = copy[index]?.quantity || 1;
      const taxable = qty * rate;
      const halfTaxRate = taxRate / 2;
      const cgst = Math.round((taxable * (halfTaxRate / 100)) * 100) / 100;
      const sgst = Math.round((taxable * (halfTaxRate / 100)) * 100) / 100;

      copy[index] = {
        ...copy[index],
        itemDescription: invItem.name,
        category: invItem.category,
        matchingSkuCode: invItem.code,
        unitPrice: rate,
        taxRate: taxRate,
        unit: invItem.unit || 'PCS',
        totalTaxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalWithTax: taxable + cgst + sgst,
      };
      return copy;
    });
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `CH-ITM-${Date.now()}-${prev.length + 1}`,
        itemDescription: '',
        hsnCode: '85017200',
        category: 'Solar Panel',
        quantity: 1,
        unit: 'PCS',
        unitPrice: 0,
        taxRate: 5,
        totalTaxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalWithTax: 0,
        matchingSkuCode: '',
        serialNumbers: [],
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setMismatchedIndex(null);
  };

  // Multi-serial number management per item row
  const [mismatchedIndex, setMismatchedIndex] = useState<number | null>(null);
  const [singleSerialInputs, setSingleSerialInputs] = useState<Record<number, string>>({});
  const [bulkSerialInputs, setBulkSerialInputs] = useState<Record<number, string>>({});
  const [activeSerialPanel, setActiveSerialPanel] = useState<Record<number, 'none' | 'bulk' | 'auto'>>({});
  const [autoPrefixInputs, setAutoPrefixInputs] = useState<Record<number, string>>({});
  const [autoStartNoInputs, setAutoStartNoInputs] = useState<Record<number, number>>({});
  const [autoCountInputs, setAutoCountInputs] = useState<Record<number, number>>({});
  const [autoPadDigitsInputs, setAutoPadDigitsInputs] = useState<Record<number, number>>({});

  const handleAddSingleSerial = (index: number) => {
    const raw = (singleSerialInputs[index] || '').trim();
    if (!raw) return;
    setItems((prev) => {
      const copy = [...prev];
      const targetQty = Number(copy[index].quantity) || 0;
      const currentSerials = copy[index].serialNumbers ? [...copy[index].serialNumbers!] : [];
      if (currentSerials.length >= targetQty) {
        return prev;
      }
      if (!currentSerials.includes(raw)) {
        currentSerials.push(raw);
        copy[index] = { ...copy[index], serialNumbers: currentSerials };
      }
      return copy;
    });
    setSingleSerialInputs((prev) => ({ ...prev, [index]: '' }));
    setMismatchedIndex(null);
  };

  const handleAddBulkSerials = (index: number) => {
    const rawText = bulkSerialInputs[index] || '';
    if (!rawText.trim()) return;
    const parsed = rawText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parsed.length === 0) return;

    setItems((prev) => {
      const copy = [...prev];
      const targetQty = Number(copy[index].quantity) || 0;
      const currentSerials = copy[index].serialNumbers ? [...copy[index].serialNumbers!] : [];
      const remainingSlots = Math.max(0, targetQty - currentSerials.length);
      if (remainingSlots <= 0) {
        return prev;
      }
      const serialSet = new Set(currentSerials);
      const uniqueNew = parsed.filter((sn) => !serialSet.has(sn));
      const capped = uniqueNew.slice(0, remainingSlots);
      capped.forEach((sn) => {
        currentSerials.push(sn);
      });
      copy[index] = { ...copy[index], serialNumbers: currentSerials };
      return copy;
    });
    setBulkSerialInputs((prev) => ({ ...prev, [index]: '' }));
    setActiveSerialPanel((prev) => ({ ...prev, [index]: 'none' }));
    setMismatchedIndex(null);
  };

  const handleAutoGenerateSerials = (index: number) => {
    const item = items[index];
    if (!item) return;
    const targetQty = Number(item.quantity) || 0;
    const currentCount = item.serialNumbers?.length || 0;
    const remainingSlots = Math.max(0, targetQty - currentCount);
    if (remainingSlots <= 0) return;

    const defaultPrefix =
      item.matchingSkuCode ? `${item.matchingSkuCode}-` :
      item.category === 'Solar Panel' ? 'SN-SP-' :
      item.category === 'Inverter' ? 'SN-INV-' : 'SN-';

    const prefix = (autoPrefixInputs[index] !== undefined ? autoPrefixInputs[index] : defaultPrefix).trim();
    const startNo = autoStartNoInputs[index] !== undefined ? autoStartNoInputs[index] : 1;
    const requestedCount = autoCountInputs[index] !== undefined ? autoCountInputs[index] : remainingSlots;
    const count = Math.min(requestedCount, remainingSlots);
    const pad = autoPadDigitsInputs[index] !== undefined ? autoPadDigitsInputs[index] : 3;

    const generated: string[] = [];
    for (let i = 0; i < count; i++) {
      const numStr = String(startNo + i).padStart(pad, '0');
      generated.push(`${prefix}${numStr}`);
    }

    setItems((prev) => {
      const copy = [...prev];
      const currentSerials = copy[index].serialNumbers ? [...copy[index].serialNumbers!] : [];
      const serialSet = new Set(currentSerials);
      generated.forEach((sn) => {
        if (!serialSet.has(sn) && currentSerials.length < targetQty) {
          serialSet.add(sn);
          currentSerials.push(sn);
        }
      });
      copy[index] = { ...copy[index], serialNumbers: currentSerials };
      return copy;
    });

    setActiveSerialPanel((prev) => ({ ...prev, [index]: 'none' }));
    setMismatchedIndex(null);
  };

  const handleRemoveSerial = (index: number, serialIndex: number) => {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]?.serialNumbers) {
        const filtered = copy[index].serialNumbers!.filter((_, sIdx) => sIdx !== serialIndex);
        copy[index] = { ...copy[index], serialNumbers: filtered };
      }
      return copy;
    });
  };

  const handleClearAllSerials = (index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], serialNumbers: [] };
      }
      return copy;
    });
  };

  // Totals
  const totalTaxable = Math.round(items.reduce((sum, item) => sum + (item.totalTaxableAmount || 0), 0) * 100) / 100;
  const totalCgst = Math.round(items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) * 100) / 100;
  const totalSgst = Math.round(items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) * 100) / 100;
  const totalTax = Math.round((totalCgst + totalSgst) * 100) / 100;
  const grandTotal = Math.round(totalTaxable + totalTax);

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(`File "${file.name}" exceeds the 10MB upload limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setDocumentUrl(event.target?.result as string);
      setDocumentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierName.trim()) {
      alert('Please select or specify a Supplier name.');
      return;
    }

    if (!challanInvoiceNo.trim()) {
      alert('Please enter an Invoice or Challan Reference Number.');
      return;
    }

    if (items.length === 0 || items.some((i) => !i.itemDescription.trim() || i.quantity <= 0)) {
      alert('Please ensure all items have a valid description and quantity greater than zero.');
      return;
    }

    // Strict 1:1 Quantity vs. Serial Number validation for PCS / tracked items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const isTracked =
        (it.unit || '').toUpperCase().includes('PCS') ||
        (it.unit || '').toUpperCase().includes('SET') ||
        it.category === 'Solar Panel' ||
        it.category === 'Inverter' ||
        it.category === 'Battery';

      if (isTracked) {
        const serialCount = it.serialNumbers?.length || 0;
        const requiredQty = Number(it.quantity) || 0;
        if (serialCount !== requiredQty) {
          setMismatchedIndex(i);
          alert(
            `Serial Count Mismatch in Item #${i + 1}! Quantity is ${requiredQty}, but ${serialCount} serial numbers are entered. Please provide exactly ${requiredQty} serial numbers.`
          );
          const el = document.getElementById(`challan-item-${i}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }
    }

    const newChallan: SupplierChallan = {
      id: existingChallan ? existingChallan.id : `CHALLAN-${Date.now()}`,
      challanCode: existingChallan ? (existingChallan.challanCode || `GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`) : `GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      supplierId: supplierId || `SUP-CUSTOM-${Date.now()}`,
      supplierName: supplierName.trim(),
      supplierGstin: supplierGstin.trim(),
      challanInvoiceNo: challanInvoiceNo.trim(),
      challanDate: challanDate || new Date().toISOString().split('T')[0],
      eWayBillNo: eWayBillNo.trim() || undefined,
      vehicleNo: vehicleNo.trim() || undefined,
      dispatchFrom: dispatchFrom.trim() || undefined,
      destinationSite: destinationSite.trim(),
      items: items,
      totalTaxable: totalTaxable,
      totalTax: totalTax,
      grandTotal: grandTotal,
      documentUrl: documentUrl || undefined,
      documentName: documentName || undefined,
      status: directInflow ? 'Verified & Stock Inwarded' : (existingChallan?.status || 'Received (Pending Inflow)'),
      directInflowApplied: directInflow || (existingChallan?.directInflowApplied ?? false),
      receivedBy: receivedBy.trim() || 'Haradhan Patra',
      notes: notes.trim() || undefined,
      createdAt: existingChallan?.createdAt || new Date().toISOString(),
    };

    onSaveChallan(newChallan, directInflow, updateSupplierBalance);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-sky-800/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {existingChallan ? 'Edit GRN / Inward Entry' : 'Record GRN / Inward Entry'}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {existingChallan ? (existingChallan.challanCode || 'Edit Mode') : 'Stock Inwarding'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Record incoming solar modules, inverters &amp; structures with instant stock inflow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          
          {/* Section 1: Supplier & Dispatch Details */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-amber-500" />
                1. Supplier &amp; Dispatcher Details
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Consignor Info</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Supplier Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} ({s.supplierCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Or Company Name Manual */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. LOOM SOLAR PRIVATE LIMITED"
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Supplier GSTIN */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 19AADCL6607J1Z9"
                  maxLength={15}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Dispatch Location */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dispatch / Pickup From
                </label>
                <input
                  type="text"
                  value={dispatchFrom}
                  onChange={(e) => setDispatchFrom(e.target.value)}
                  placeholder="e.g. Natibpur Facility, NH-6, Howrah"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Destination Site */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destination / Unloading Warehouse
                </label>
                <input
                  type="text"
                  value={destinationSite}
                  onChange={(e) => setDestinationSite(e.target.value)}
                  placeholder="e.g. SOALUK, Pursurah, Hooghly - 712410"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Transport & Document Numbers */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-sky-500" />
                2. GRN, Invoice / Challan Ref &amp; Logistics Identification
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Consignment IDs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Invoice / Challan Ref No */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice / Challan Ref No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={challanInvoiceNo}
                  onChange={(e) => setChallanInvoiceNo(e.target.value)}
                  placeholder="e.g. WB/SL/126/27"
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Challan Date */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Challan Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* E-Way Bill No */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-Way Bill Number (12 Digits)
                </label>
                <input
                  type="text"
                  value={eWayBillNo}
                  onChange={(e) => setEWayBillNo(e.target.value)}
                  placeholder="e.g. 881682871188"
                  maxLength={14}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transport Vehicle No
                </label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="e.g. WB18AP2877"
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold uppercase focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Inward Equipment & Goods Line Items */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-emerald-500" />
                  3. Inward Equipment &amp; Material Breakdown
                </span>
                <p className="text-[11px] text-slate-500">
                  Specify equipment description, HSN (e.g. 85017200 for modules), quantity and taxable rates
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Line items list */}
            <div className="space-y-3.5">
              {items.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-3">
                  <Package className="w-10 h-10 text-slate-400 mx-auto" />
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-300">No Inward Equipment Added</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click &quot;+ Add Item&quot; to enter incoming solar modules, inverters, cables or accessories.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-xs transition-all cursor-pointer text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Equipment Item</span>
                  </button>
                </div>
              ) : (
                items.map((item, idx) => {
                  const targetQty = Number(item.quantity) || 0;
                  const currentCount = item.serialNumbers?.length || 0;
                  const isComplete = currentCount === targetQty && targetQty > 0;
                  const isLimitReached = currentCount >= targetQty && targetQty > 0;
                  const isHighlighted = mismatchedIndex === idx;

                  return (
                    <div
                      key={item.id}
                      id={`challan-item-${idx}`}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl p-3.5 shadow-2xs space-y-3 transition-all ${
                        isHighlighted
                          ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-50/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {isHighlighted && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-400 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Serial Count Mismatch in Item #{idx + 1}! Quantity is {targetQty}, but {currentCount} serial numbers are entered. Please provide exactly {targetQty} serial numbers.
                          </span>
                        </div>
                      )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>Item #{idx + 1}</span>
                    </span>

                    {/* Quick SKU Link dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Link SKU:</span>
                      <select
                        onChange={(e) => handleSelectSkuForIndex(idx, e.target.value)}
                        value={item.matchingSkuCode || ''}
                        className="p-1 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                      >
                        <option value="">-- Auto-fill from Inventory SKU --</option>
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.code}>
                            {inv.code} - {inv.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete item row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Item Description */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Item Description / Goods Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.itemDescription}
                        onChange={(e) => updateItemRow(idx, 'itemDescription', e.target.value)}
                        placeholder="e.g. PHOTOVOLTAIC (PV) DC POWER HJT 730W"
                        required
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>

                    {/* HSN Code */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        HSN Code
                      </label>
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => updateItemRow(idx, 'hsnCode', e.target.value)}
                        placeholder="85017200"
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>

                    {/* Category */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Category
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) => updateItemRow(idx, 'category', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      >
                        <option value="Solar Panel">Solar Panel</option>
                        <option value="Inverter">Inverter</option>
                        <option value="Battery">Battery</option>
                        <option value="Mounting Structure">Mounting Structure</option>
                        <option value="Cable & Wiring">Cable &amp; Wiring</option>
                        <option value="Accessories">Accessories</option>
                      </select>
                    </div>

                    {/* Unit */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Unit
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => updateItemRow(idx, 'unit', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      >
                        <option value="PCS">PCS</option>
                        <option value="SETS">SETS</option>
                        <option value="METERS">METERS</option>
                        <option value="WATTS">WATTS</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {/* Quantity */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Quantity <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemRow(idx, 'quantity', Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                      />
                    </div>

                    {/* Taxable Unit Rate */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        Taxable Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => updateItemRow(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>

                    {/* GST Rate */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        GST %
                      </label>
                      <select
                        value={item.taxRate}
                        onChange={(e) => updateItemRow(idx, 'taxRate', Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                      >
                        <option value={5}>5% (2.5% CGST + 2.5% SGST)</option>
                        <option value={12}>12% (6% CGST + 6% SGST)</option>
                        <option value={18}>18% (9% CGST + 9% SGST)</option>
                        <option value={0}>0% (Tax Exempt)</option>
                      </select>
                    </div>

                    {/* Line Total with Tax */}
                    <div className="text-right flex flex-col justify-end">
                      <span className="text-[10px] text-slate-400">Total with GST</span>
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{(item.totalWithTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Serial Numbers (Stock Inward) Section */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Serial Numbers (Stock Inward)
                        </span>

                        {/* Tracker badge */}
                        {(() => {
                          if (isComplete) {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                ✓ All {targetQty} / {targetQty} Serials Assigned
                              </span>
                            );
                          }
                          const pending = Math.max(0, targetQty - currentCount);
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              Pending {pending} serial{pending !== 1 ? 's' : ''} ({currentCount} / {targetQty})
                            </span>
                          );
                        })()}
                      </div>

                      {/* Tool Actions */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          disabled={isLimitReached}
                          onClick={() =>
                            setActiveSerialPanel((prev) => ({
                              ...prev,
                              [idx]: prev[idx] === 'bulk' ? 'none' : 'bulk',
                            }))
                          }
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1 transition-colors ${
                            isLimitReached
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                              : activeSerialPanel[idx] === 'bulk'
                              ? 'bg-sky-100 border-sky-400 text-sky-800 dark:bg-sky-950/80 dark:border-sky-600 dark:text-sky-300 cursor-pointer'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                          }`}
                          title={isLimitReached ? `Quota reached: All ${targetQty} serials assigned` : 'Bulk Paste or Scan'}
                        >
                          <ClipboardPaste className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          <span>Bulk Paste / Scan</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLimitReached}
                          onClick={() =>
                            setActiveSerialPanel((prev) => ({
                              ...prev,
                              [idx]: prev[idx] === 'auto' ? 'none' : 'auto',
                            }))
                          }
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1 transition-colors ${
                            isLimitReached
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                              : activeSerialPanel[idx] === 'auto'
                              ? 'bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-950/80 dark:border-purple-600 dark:text-purple-300 cursor-pointer'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                          }`}
                          title={isLimitReached ? `Quota reached: All ${targetQty} serials assigned` : 'Auto-Generate Serials'}
                        >
                          <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span>Auto-Generate</span>
                        </button>

                        {(item.serialNumbers?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearAllSerials(idx)}
                            className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Clear all serials for this item"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Single Serial Input */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          disabled={isLimitReached}
                          value={singleSerialInputs[idx] || ''}
                          onChange={(e) =>
                            setSingleSerialInputs((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSingleSerial(idx);
                            }
                          }}
                          placeholder={
                            isLimitReached
                              ? `All ${targetQty} / ${targetQty} serial numbers registered`
                              : "Type or scan serial number (e.g. SN-540W-001) & press Enter..."
                          }
                          className={`w-full pl-8 pr-3 py-1.5 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 ${
                            isLimitReached
                              ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                          }`}
                        />
                        <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSingleSerial(idx)}
                        disabled={isLimitReached || !(singleSerialInputs[idx] || '').trim()}
                        className={`px-3 py-1.5 font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1 ${
                          isLimitReached || !(singleSerialInputs[idx] || '').trim()
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Serial</span>
                      </button>
                    </div>

                    {/* Bulk Paste / Scan Tool */}
                    {activeSerialPanel[idx] === 'bulk' && (
                      <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-900 dark:text-sky-200 text-xs flex items-center gap-1.5">
                            <ClipboardPaste className="w-3.5 h-3.5 text-sky-600" />
                            Bulk Paste / Barcode Scanner Dump
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveSerialPanel((prev) => ({ ...prev, [idx]: 'none' }))}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Paste comma-separated or newline-separated serial numbers (e.g. SN-001, SN-002, SN-003 or one per line).
                        </p>
                        <textarea
                          rows={3}
                          value={bulkSerialInputs[idx] || ''}
                          onChange={(e) =>
                            setBulkSerialInputs((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          placeholder={`SN-001, SN-002, SN-003, SN-004\nor paste lines...`}
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveSerialPanel((prev) => ({ ...prev, [idx]: 'none' }))}
                            className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 rounded-lg text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBulkSerials(idx)}
                            disabled={!(bulkSerialInputs[idx] || '').trim()}
                            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
                          >
                            Add Serials from Text
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Auto-Generate Helper Tool */}
                    {activeSerialPanel[idx] === 'auto' && (
                      <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-900 dark:text-purple-200 text-xs flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            Auto-Generate Serials (Prefix + Start No)
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveSerialPanel((prev) => ({ ...prev, [idx]: 'none' }))}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-purple-950 dark:text-purple-300 mb-0.5">
                              Prefix
                            </label>
                            <input
                              type="text"
                              value={
                                autoPrefixInputs[idx] !== undefined
                                  ? autoPrefixInputs[idx]
                                  : item.matchingSkuCode
                                  ? `${item.matchingSkuCode}-`
                                  : item.category === 'Solar Panel'
                                  ? 'SN-SP-'
                                  : item.category === 'Inverter'
                                  ? 'SN-INV-'
                                  : 'SN-'
                              }
                              onChange={(e) =>
                                setAutoPrefixInputs((prev) => ({ ...prev, [idx]: e.target.value }))
                              }
                              placeholder="e.g. HJT-2026-"
                              className="w-full p-1.5 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-purple-950 dark:text-purple-300 mb-0.5">
                              Start Number
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={autoStartNoInputs[idx] !== undefined ? autoStartNoInputs[idx] : 1}
                              onChange={(e) =>
                                setAutoStartNoInputs((prev) => ({ ...prev, [idx]: Number(e.target.value) || 1 }))
                              }
                              className="w-full p-1.5 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-purple-950 dark:text-purple-300 mb-0.5">
                              Count
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={
                                autoCountInputs[idx] !== undefined
                                  ? autoCountInputs[idx]
                                  : Math.max(1, (item.quantity || 1) - (item.serialNumbers?.length || 0))
                              }
                              onChange={(e) =>
                                setAutoCountInputs((prev) => ({ ...prev, [idx]: Number(e.target.value) || 1 }))
                              }
                              className="w-full p-1.5 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-purple-950 dark:text-purple-300 mb-0.5">
                              Pad Digits
                            </label>
                            <select
                              value={autoPadDigitsInputs[idx] !== undefined ? autoPadDigitsInputs[idx] : 3}
                              onChange={(e) =>
                                setAutoPadDigitsInputs((prev) => ({ ...prev, [idx]: Number(e.target.value) || 3 }))
                              }
                              className="w-full p-1.5 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs"
                            >
                              <option value={2}>2 digits (01)</option>
                              <option value={3}>3 digits (001)</option>
                              <option value={4}>4 digits (0001)</option>
                              <option value={5}>5 digits (00001)</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveSerialPanel((prev) => ({ ...prev, [idx]: 'none' }))}
                            className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 rounded-lg text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateSerials(idx)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Generate &amp; Append Serials</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Monospace Serial Badges Container */}
                    {(item.serialNumbers?.length || 0) > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                          {item.serialNumbers!.map((sn, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs group"
                            >
                              <span className="text-[9px] text-slate-400 font-sans font-normal">#{sIdx + 1}</span>
                              <span>{sn}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSerial(idx, sIdx)}
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded p-0.5 transition-colors cursor-pointer"
                                title={`Remove serial ${sn}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Exceeds Quantity Alert Warning */}
                        {(item.serialNumbers?.length || 0) > (item.quantity || 0) && (
                          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>
                              <strong>Warning:</strong> {item.serialNumbers?.length} serial numbers entered for quantity {item.quantity}. Please increase quantity or remove redundant serial numbers.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        No serial numbers registered for this item yet. Use quick input, bulk paste, or auto-generate above.
                      </div>
                    )}
                  </div>
                </div>
              );
            }))}
            </div>

            {/* Consignment Totals Summary Strip */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Consignment Total Valuation:
                </span>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Taxable: ₹{totalTaxable.toLocaleString('en-IN')} + CGST: ₹{totalCgst.toLocaleString('en-IN')} + SGST: ₹{totalSgst.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">
                  Grand Total (Payable / Billed)
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Supporting Document Upload */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Paperclip className="w-4 h-4 text-amber-500" />
                4. Attached GRN / Challan / Invoice Scan or Photo Proof
              </span>
              <span className="text-[11px] text-slate-500">Max 10MB (PDF, PNG, JPG)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {documentUrl ? (
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-xs sm:max-w-md">
                      {documentName || 'Scanned_Challan.pdf'}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready to save with GRN record
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDocumentUrl('');
                    setDocumentName('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-bold"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-xl p-4 text-center cursor-pointer transition-colors space-y-1 bg-white/50 dark:bg-slate-900/50"
              >
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Click to attach GRN / Challan / E-Way Bill scan
                </div>
                <div className="text-[10px] text-slate-400">
                  Supports photo from phone, scanned receipt, PDF or image file
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Direct Stock Inflow & Ledger Automations */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
            <span className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Automated Inventory &amp; Ledger Actions
            </span>

            <div className="space-y-2.5">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={directInflow}
                  onChange={(e) => setDirectInflow(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded-sm border-slate-300 focus:ring-amber-500"
                />
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                    Direct Stock Inflow (Recommended)
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Immediately increase inventory stock by received quantities and write an "INWARD" entry in the Stock Ledger with Reference Doc No.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateSupplierBalance}
                  onChange={(e) => setUpdateSupplierBalance(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded-sm border-slate-300 focus:ring-amber-500"
                />
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                    Add Consignment Value to Supplier Balance Payable
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Automatically credit ₹{grandTotal.toLocaleString('en-IN')} to {supplierName || 'supplier'}'s outstanding payable ledger.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 6: Notes & Verification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Received &amp; Verified By
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Haradhan Patra"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Receipt / Unloading Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Unloaded with zero transit defect"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{existingChallan ? 'Save & Update GRN' : 'Save & Inward Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

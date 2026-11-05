import React, { useState, useEffect } from 'react';
import { Customer, InventoryItem, QuotationInvoice, DocumentLineItem, Language, DocumentType } from '../types';
import { translations } from '../data/translations';
import { DEFAULT_TERMS_AND_CONDITIONS } from '../data/mockData';
import { numberToWordsINR } from '../utils/numberToWords';
import { getUpiDetails } from '../utils/upiHelper';
import {
  Plus,
  Trash2,
  FileText,
  Eye,
  Calculator,
  CheckCircle,
  AlertCircle,
  FileCheck,
  QrCode,
  Tag,
  Sparkles,
  Barcode,
  Search,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Printer,
  PackageCheck,
} from 'lucide-react';

interface DocumentBuilderProps {
  customers: Customer[];
  inventory: InventoryItem[];
  onSaveDocument: (doc: QuotationInvoice) => void;
  onPreviewPdf: (doc: QuotationInvoice) => void;
  lang: Language;
  defaultType?: DocumentType;
  initialDoc?: QuotationInvoice | null;
}

export const DocumentBuilder: React.FC<DocumentBuilderProps> = ({
  customers,
  inventory,
  onSaveDocument,
  onPreviewPdf,
  lang,
  defaultType = 'Quotation',
  initialDoc,
}) => {
  const t = translations[lang];

  const [docType, setDocType] = useState<DocumentType>(initialDoc ? initialDoc.type : defaultType);
  const [selectedCustId, setSelectedCustId] = useState<string>(initialDoc ? initialDoc.customerId : '');
  const [systemCapacityKw, setSystemCapacityKw] = useState<number | ''>(initialDoc?.systemCapacityKw ?? '');
  const [discount, setDiscount] = useState<number>(initialDoc?.discount ?? 0);
  const [subsidyEstimate, setSubsidyEstimate] = useState<number>(initialDoc?.subsidyEstimate ?? 0);
  const [terms, setTerms] = useState<string>(initialDoc?.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS);
  const [referenceQuotationNo, setReferenceQuotationNo] = useState<string | undefined>(initialDoc?.referenceQuotationNo);
  const [serialInputs, setSerialInputs] = useState<Record<string, string>>({});
  const [openSerialPickerIndex, setOpenSerialPickerIndex] = useState<number | null>(null);
  const [serialSearchFilter, setSerialSearchFilter] = useState<Record<string, string>>({});
  const [customSerialInputs, setCustomSerialInputs] = useState<Record<string, string>>({});
  const [mismatchedItemIndex, setMismatchedItemIndex] = useState<number | null>(null);

  const isSerialTrackedItem = (item: DocumentLineItem): boolean => {
    const u = (item.unit || '').toUpperCase();
    if (u.includes('PCS') || u.includes('SET')) return true;
    const desc = (item.description || '').toLowerCase();
    if (desc.includes('panel') || desc.includes('inverter') || desc.includes('battery') || desc.includes('module')) return true;
    return false;
  };

  const getCategoryHsn = (inv?: InventoryItem, code?: string): string => {
    if (inv?.hsnCode) return inv.hsnCode;
    const c = (code || inv?.code || '').toUpperCase();
    if (c.startsWith('SP-') || c.includes('PANEL') || c.includes('SOLAR') || c.includes('PHOTOVOLTAIC')) return '85017200';
    if (c.startsWith('INV-') || c.includes('INVERTER')) return '850440';
    if (c.startsWith('BAT-') || c.includes('BATTERY') || c.includes('LITH')) return '85076000';
    if (c.startsWith('MNT-') || c.includes('ROOF') || c.includes('STRUCT')) return '730890';
    if (c.startsWith('CBL-') || c.includes('CABLE') || c.includes('WIRE')) return '854449';
    return '85017200';
  };

  // Dynamic Line Items State - empty list on Create mode
  const [lineItems, setLineItems] = useState<DocumentLineItem[]>(() => {
    if (initialDoc && initialDoc.items && initialDoc.items.length > 0) {
      return initialDoc.items.map((item) => {
        const inv = inventory.find((i) => i.id === item.itemId || i.code === item.itemCode);
        const liveStock = inv ? inv.stockLevel : (item.stockQty ?? 0);
        return {
          ...item,
          hsnCode: item.hsnCode || getCategoryHsn(inv, item.itemCode),
          serialNumbers: item.serialNumbers ? [...item.serialNumbers] : [],
          stockQty: liveStock,
          amount: (item.quantity || 1) * (item.unitRate || 0),
        };
      });
    }
    return [];
  });

  useEffect(() => {
    if (initialDoc) {
      setDocType(initialDoc.type);
      setSelectedCustId(initialDoc.customerId);
      setSystemCapacityKw(initialDoc.systemCapacityKw ?? '');
      setDiscount(initialDoc.discount ?? 0);
      setSubsidyEstimate(initialDoc.subsidyEstimate ?? 0);
      setTerms(initialDoc.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS);
      setReferenceQuotationNo(initialDoc.referenceQuotationNo);
      if (initialDoc.items && initialDoc.items.length > 0) {
        setLineItems(
          initialDoc.items.map((item) => {
            const inv = inventory.find((i) => i.id === item.itemId || i.code === item.itemCode);
            const liveStock = inv ? inv.stockLevel : (item.stockQty ?? 0);
            return {
              ...item,
              hsnCode: item.hsnCode || getCategoryHsn(inv, item.itemCode),
              serialNumbers: item.serialNumbers ? [...item.serialNumbers] : [],
              stockQty: liveStock,
              amount: (item.quantity || 1) * (item.unitRate || 0),
            };
          })
        );
      } else {
        setLineItems([]);
      }
    } else {
      setDocType(defaultType);
      setSelectedCustId('');
      setSystemCapacityKw('');
      setDiscount(0);
      setSubsidyEstimate(0);
      setTerms(DEFAULT_TERMS_AND_CONDITIONS);
      setReferenceQuotationNo(undefined);
      setLineItems([]);
    }
  }, [initialDoc, defaultType, inventory]);

  const selectedCustomer = selectedCustId ? (customers.find((c) => c.id === selectedCustId) || null) : null;

  // Dynamic Intra-state (West Bengal 19) vs. Inter-state GST Detection Rule
  const isWestBengal = Boolean(
    selectedCustomer && (
      selectedCustomer.state?.toLowerCase().includes('west bengal') ||
      selectedCustomer.stateCode === '19' ||
      selectedCustomer.address?.toLowerCase().includes('west bengal') ||
      (selectedCustomer.gstin && selectedCustomer.gstin.startsWith('19'))
    )
  );

  // Helper to get real-time stock level for an inventory item
  const getItemStockLevel = (itemId: string, defaultStock?: number): number => {
    const inv = inventory.find((i) => i.id === itemId);
    return inv ? inv.stockLevel : (defaultStock ?? 0);
  };

  // Real-time calculations computed strictly using Issue Qty (item.quantity)
  const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
  const taxTotal = lineItems.reduce((acc, item) => acc + Math.round((item.amount * item.taxRatePercent) / 100), 0);

  // Tax Segregation: Intra-state (CGST + SGST) vs. Inter-state (IGST)
  const cgstAmount = isWestBengal ? taxTotal / 2 : 0;
  const sgstAmount = isWestBengal ? taxTotal / 2 : 0;
  const igstAmount = !isWestBengal ? taxTotal : 0;

  const grandTotal = Math.max(0, subtotal + taxTotal - discount - subsidyEstimate);
  const grandTotalWords = numberToWordsINR(grandTotal);
  const upiDetails = getUpiDetails(docType, referenceQuotationNo || 'Draft', grandTotal);

  // Check validation rules: Issue Qty must be > 0 and <= Stock Qty
  const validationErrorItem = lineItems.find((item) => {
    const stock = getItemStockLevel(item.itemId, item.stockQty);
    return item.quantity <= 0 || item.quantity > stock;
  });

  const hasValidationErrors = Boolean(validationErrorItem);

  const handleAddItem = () => {
    const firstInv = inventory[0];
    const defaultHsn = getCategoryHsn(firstInv, firstInv?.code);
    const newItem: DocumentLineItem = {
      id: `LI-${Date.now().toString().slice(-4)}`,
      itemId: firstInv?.id || 'INV-101',
      itemCode: firstInv?.code || 'SP-MONO-540',
      description: firstInv?.name || 'Solar Equipment',
      descriptionBn: firstInv?.nameBn || 'সোলার সরঞ্জাম',
      hsnCode: defaultHsn,
      serialNumbers: [],
      stockQty: firstInv?.stockLevel ?? 10,
      quantity: 1,
      unit: firstInv?.unit || 'Pcs',
      unitRate: firstInv?.unitRate || 14500,
      taxRatePercent: firstInv?.gstPercent || 12,
      amount: firstInv?.unitRate || 14500,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof DocumentLineItem, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      if (field === 'itemId') {
        const invItem = inventory.find((i) => i.id === value);
        if (invItem) {
          target.itemCode = invItem.code;
          target.description = invItem.name;
          target.descriptionBn = invItem.nameBn;
          target.hsnCode = invItem.hsnCode || getCategoryHsn(invItem, invItem.code);
          target.stockQty = invItem.stockLevel;
          target.unit = invItem.unit;
          target.unitRate = invItem.unitRate; // Auto-populated rate from stock
          target.taxRatePercent = invItem.gstPercent || 12; // Auto-populated GST from stock
          // Reset serial numbers on item change so irrelevant serials are not carried over
          target.serialNumbers = [];
        }
      }

      // Auto Recalculate Amount using Issue Qty (target.quantity * target.unitRate)
      target.amount = (target.quantity || 0) * (target.unitRate || 0);
      updated[index] = target;
      return updated;
    });
  };

  const handleToggleStockSerial = (index: number, serial: string) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const current = target.serialNumbers ? [...target.serialNumbers] : [];
      const isSelected = current.includes(serial);

      if (isSelected) {
        target.serialNumbers = current.filter((s) => s !== serial);
      } else {
        if (current.length >= target.quantity) {
          alert(`Quantity limit reached: Cannot select more than ${target.quantity} serial numbers for this item (Qty: ${target.quantity}). Increase item quantity to add more.`);
          return prev;
        }
        target.serialNumbers = [...current, serial];
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleSelectAvailableStockBatch = (index: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const invItem = inventory.find((i) => i.id === target.itemId || i.code === target.itemCode);
      const stockSerials = invItem?.availableSerialNumbers || [];
      const current = target.serialNumbers ? [...target.serialNumbers] : [];
      const neededCount = Math.max(0, target.quantity - current.length);

      if (neededCount === 0) {
        alert(`All ${target.quantity} serial numbers have already been selected for this item.`);
        return prev;
      }

      const availableToAdd = stockSerials.filter((sn) => !current.includes(sn)).slice(0, neededCount);
      if (availableToAdd.length === 0) {
        alert('No additional stock serial numbers are available in inventory for this equipment.');
        return prev;
      }

      target.serialNumbers = [...current, ...availableToAdd];
      updated[index] = target;
      return updated;
    });
  };

  const handleAddCustomSerial = (index: number, itemId: string) => {
    const raw = (customSerialInputs[itemId] || '').trim().toUpperCase();
    if (!raw) return;

    setLineItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const current = target.serialNumbers ? [...target.serialNumbers] : [];

      if (current.includes(raw)) {
        alert(`Serial number "${raw}" is already assigned to this item.`);
        return prev;
      }

      if (current.length >= target.quantity) {
        alert(`Quantity limit reached: Cannot select more than ${target.quantity} serial numbers for this item (Qty: ${target.quantity}). Increase quantity to add more.`);
        return prev;
      }

      target.serialNumbers = [...current, raw];
      updated[index] = target;
      return updated;
    });

    setCustomSerialInputs((prev) => ({ ...prev, [itemId]: '' }));
  };

  const handleAddSerialNumbers = (index: number, itemId: string) => {
    const raw = serialInputs[itemId] || '';
    if (!raw.trim()) return;
    const splitSerials = raw
      .split(/[,;\n\t]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    if (splitSerials.length === 0) return;

    setLineItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const current = target.serialNumbers ? [...target.serialNumbers] : [];

      for (const sn of splitSerials) {
        if (!current.includes(sn)) {
          if (current.length >= target.quantity) {
            alert(`Quantity limit reached: Allowed up to ${target.quantity} serial numbers for this item. Excess serials were omitted.`);
            break;
          }
          current.push(sn);
        }
      }

      target.serialNumbers = current;
      updated[index] = target;
      return updated;
    });

    setSerialInputs((prev) => ({ ...prev, [itemId]: '' }));
  };

  const handleRemoveSerialNumber = (itemIndex: number, snIndex: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[itemIndex] };
      if (target.serialNumbers) {
        target.serialNumbers = target.serialNumbers.filter((_, idx) => idx !== snIndex);
      }
      updated[itemIndex] = target;
      return updated;
    });
  };

  const handleAutoGenerateSerials = (index: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const prefix = target.itemCode ? target.itemCode.replace(/[^A-Za-z0-9]/g, '') : 'SN';
      const year = new Date().getFullYear();
      const neededCount = Math.max(1, target.quantity || 1);
      const generated: string[] = [];

      for (let i = 1; i <= neededCount; i++) {
        const padded = String(i).padStart(3, '0');
        generated.push(`${prefix}-${year}-${padded}`);
      }

      target.serialNumbers = generated;
      updated[index] = target;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!selectedCustId || !selectedCustomer) {
      alert('Validation Error: Please select a customer before proceeding.');
      return false;
    }
    if (lineItems.length === 0) {
      alert('Validation Error: Please add at least one equipment line item before proceeding.');
      return false;
    }
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const currentStock = getItemStockLevel(item.itemId, item.stockQty);
      if (item.quantity <= 0) {
        alert(`Validation Error: Issue Qty must be greater than 0 for item "${item.description}". Please adjust quantity before generating.`);
        return false;
      }
      if (item.quantity > currentStock) {
        alert(`Validation Error: Issue Qty exceeds available Stock Qty for item "${item.description}". Please adjust quantity before generating.`);
        return false;
      }
      // Strict 1:1 Quantity vs. Serial Number validation for PCS / tracked items
      if (isSerialTrackedItem(item)) {
        const serialCount = item.serialNumbers?.length || 0;
        const requiredQty = Number(item.quantity) || 0;
        if (serialCount !== requiredQty) {
          setMismatchedItemIndex(i);
          alert(
            `Serial Count Mismatch in Item #${i + 1}! Quantity is ${requiredQty}, but ${serialCount} serial numbers are entered. Please provide exactly ${requiredQty} serial numbers.`
          );
          const el = document.getElementById(`doc-line-item-${i}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return false;
        }
      }
    }
    return true;
  };

  const constructDocObject = (): QuotationInvoice => {
    if (!selectedCustomer) {
      throw new Error('Please select a customer before proceeding.');
    }
    const prefix = docType === 'Quotation' ? 'SLE/QT' : 'SLE/INV';
    const randNum = Math.floor(100 + Math.random() * 900);
    const docNum = (initialDoc && initialDoc.type === docType) ? initialDoc.documentNumber : `${prefix}/2026/${randNum}`;
    
    return {
      id: `DOC-${Date.now()}`,
      documentNumber: docNum,
      referenceQuotationNo: referenceQuotationNo,
      type: docType,
      date: new Date().toISOString().split('T')[0],
      validUntilOrDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerAddress: selectedCustomer.address,
      customerGstin: selectedCustomer.gstin,
      customerCategory: selectedCustomer.category,
      customerState: selectedCustomer.state,
      customerStateCode: selectedCustomer.stateCode,
      isWestBengal,
      systemCapacityKw: typeof systemCapacityKw === 'number' ? systemCapacityKw : (Number(systemCapacityKw) || 0),
      items: lineItems,
      subtotal,
      taxTotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      discount,
      subsidyEstimate,
      grandTotal,
      status: 'Sent',
      payments: initialDoc?.payments || [],
      totalPaid: initialDoc?.totalPaid || 0,
      dueAmount: initialDoc?.dueAmount ?? grandTotal,
      paymentStatus: initialDoc?.paymentStatus || 'Unpaid',
      notes: '',
      termsAndConditions: terms,
      createdByName: 'Haradhan Patra',
    };
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    const doc = constructDocObject();
    onPreviewPdf(doc);
  };

  const handleSaveAndPrint = () => {
    if (!validateForm()) return;
    const doc = constructDocObject();
    onSaveDocument(doc);
    onPreviewPdf(doc);
  };

  const handleSaveAndSubmit = () => {
    if (!validateForm()) return;
    const doc = constructDocObject();
    onSaveDocument(doc);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-slate-900">
              {docType === 'Quotation' ? 'Create Solar Quotation' : 'Create Tax Invoice'}
            </span>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              Sun Light Electric
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-populates item names, unit rates, and GST % directly from stock inventory.
          </p>
        </div>

        {/* Document Type Selector (3D Floating Switch) */}
        <div className="flex items-center space-x-1.5 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_20px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => setDocType('Quotation')}
            className={`px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out ${
              docType === 'Quotation'
                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-bold shadow-[0_6px_0_#b45309,0_10px_15px_rgba(245,158,11,0.35)] border border-amber-300/80 active:translate-y-1 active:shadow-[0_2px_0_#b45309]'
                : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            Solar Quotation
          </button>
          <button
            type="button"
            onClick={() => setDocType('Invoice')}
            className={`px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out ${
              docType === 'Invoice'
                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-bold shadow-[0_6px_0_#b45309,0_10px_15px_rgba(245,158,11,0.35)] border border-amber-300/80 active:translate-y-1 active:shadow-[0_2px_0_#b45309]'
                : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            Tax Invoice
          </button>
        </div>
      </div>

      {referenceQuotationNo && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Converted from Solar Quotation:</strong>{' '}
              <span className="font-mono font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                {referenceQuotationNo}
              </span>
            </span>
          </div>
          <span className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm w-fit">
            Auto-Populated Tax Invoice
          </span>
        </div>
      )}

      {/* Section 1: Customer & System Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
        <div>
          <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">{t.selectCustomer}</label>
          <select
            value={selectedCustId}
            onChange={(e) => setSelectedCustId(e.target.value)}
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 shadow-sm"
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-medium">
                {c.name} ({c.phone}) - {c.category} {c.status === 'inactive' ? '[Inactive]' : ''}
              </option>
            ))}
          </select>
          {selectedCustomer ? (
            <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span>Status:</span>
                <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                  selectedCustomer.status === 'inactive'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}>
                  {selectedCustomer.status === 'inactive' ? 'Inactive Client' : 'Active Client'}
                </span>
              </div>
              <div>Address: <span className="text-slate-900 dark:text-slate-100 font-bold">{selectedCustomer.address}, {selectedCustomer.state} ({selectedCustomer.stateCode || '19'}) - {selectedCustomer.pinCode || selectedCustomer.pincode}</span></div>
              <div>GSTIN: <span className="text-slate-900 dark:text-slate-100 font-mono font-bold">{selectedCustomer.gstin || 'N/A'}</span></div>
            </div>
          ) : (
            <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 italic">
              Please select a customer to display contact, address, and GSTIN site details.
            </div>
          )}
        </div>

        <div>
          <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">{t.systemCapacity}</label>
          <input
            type="number"
            step="0.5"
            placeholder="e.g. 5.0"
            value={systemCapacityKw === '' ? '' : systemCapacityKw}
            onChange={(e) => setSystemCapacityKw(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-amber-500 shadow-sm"
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
            e.g. 3.0 kW, 5.0 kW, 10.0 kW Rooftop Solar
          </span>
        </div>

        <div>
          <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Prepared By (Architect User)</label>
          <div className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100 shadow-sm">
            Haradhan Patra (Sun Light Electric)
          </div>
        </div>
      </div>

      {/* Section 2: Line Items Table (Auto-Populates Rate & GST from Stock) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-600" />
              <span>{t.lineItems}</span>
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Selecting an item automatically fills Item Name, Unit Rate &amp; GST % from stock inventory.</span>
            </p>
          </div>

          <button
            onClick={handleAddItem}
            className="inline-flex items-center space-x-1 text-xs bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addEquipment}</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-950 text-white text-[11px] font-bold uppercase border-b border-sky-800">
              <tr>
                <th className="p-3 w-8 text-center">#</th>
                <th className="p-3 min-w-[280px]">Equipment &amp; Scope Description (Select Stock)</th>
                <th className="p-3 w-28 text-center">HSN Code</th>
                <th className="p-3 w-24 text-center">Stock Qty</th>
                <th className="p-3 w-28 text-center">Issue Qty</th>
                <th className="p-3 w-28 text-right">Unit Rate (₹)</th>
                <th className="p-3 w-24 text-center">GST %</th>
                <th className="p-3 w-32 text-right">Total Amount (₹)</th>
                <th className="p-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="max-w-sm mx-auto space-y-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                        <PackageCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Equipment Added Yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Click &quot;+ Add Equipment&quot; to pick solar panels, inverters, cables or structures directly from live stock.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="inline-flex items-center space-x-1.5 text-xs bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Equipment Item</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                lineItems.map((item, idx) => {
                const stockQty = getItemStockLevel(item.itemId, item.stockQty);
                const isExceeded = item.quantity > stockQty;
                const isInvalid = item.quantity <= 0 || isExceeded;
                const targetQty = Number(item.quantity) || 0;
                const serialCount = item.serialNumbers?.length || 0;
                const isTracked = isSerialTrackedItem(item);
                const isComplete = serialCount === targetQty && targetQty > 0;
                const isLimitReached = serialCount >= targetQty && targetQty > 0;
                const isHighlighted = mismatchedItemIndex === idx;

                const invItem = inventory.find((i) => i.id === item.itemId || i.code === item.itemCode);
                const stockSerials = invItem?.availableSerialNumbers || [];
                const neededCount = Math.max(0, targetQty - serialCount);
                const filterQuery = (serialSearchFilter[item.id] || '').toLowerCase().trim();
                const filteredStockSerials = stockSerials.filter(
                  (sn) => !filterQuery || sn.toLowerCase().includes(filterQuery)
                );

                return (
                  <tr
                    key={item.id}
                    id={`doc-line-item-${idx}`}
                    className={`transition-colors ${
                      isHighlighted
                        ? 'bg-rose-50/50 ring-2 ring-rose-500'
                        : isInvalid
                        ? 'bg-red-50/30'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3 text-center font-bold text-slate-400 text-[11px] align-top pt-4">{idx + 1}</td>
                    <td className="p-3 align-top">
                      {isHighlighted && (
                        <div className="mb-2 p-2 rounded-lg bg-rose-100 dark:bg-rose-950/80 border border-rose-400 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>
                            Serial Count Mismatch in Item #{idx + 1}! Quantity is {targetQty}, but {serialCount} serial numbers are entered. Please provide exactly {targetQty} serial numbers.
                          </span>
                        </div>
                      )}
                      <select
                        value={item.itemId}
                        onChange={(e) => handleUpdateItem(idx, 'itemId', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-amber-500 shadow-sm"
                      >
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-semibold">
                            {inv.name} — ₹{inv.unitRate}/{inv.unit} ({inv.gstPercent || 12}% GST, {inv.stockLevel} in stock)
                          </option>
                        ))}
                      </select>

                      {/* Equipment Serial Numbers Management Section */}
                      <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                        {/* Header Status & Action Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-1.5">
                            <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                              Serial Numbers (Warranty / Subsidies)
                            </span>
                            {isComplete ? (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>✓ All {targetQty} / {targetQty} Serials Assigned</span>
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                <span>Pending {targetQty - serialCount} serial{targetQty - serialCount !== 1 ? 's' : ''} ({serialCount}/{targetQty})</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Toggle Searchable Stock Serial Dropdown */}
                            <button
                              type="button"
                              disabled={isLimitReached && openSerialPickerIndex !== idx}
                              onClick={() => setOpenSerialPickerIndex(openSerialPickerIndex === idx ? null : idx)}
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all border shadow-2xs ${
                                isLimitReached && openSerialPickerIndex !== idx
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                  : openSerialPickerIndex === idx
                                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold cursor-pointer'
                                  : 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700/60 hover:bg-amber-50 cursor-pointer'
                              }`}
                              title={isLimitReached ? `Quota met: All ${targetQty} serials assigned` : 'Browse and select registered serial numbers from stock'}
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Select from Stock ({stockSerials.length})</span>
                              {openSerialPickerIndex === idx ? (
                                <ChevronUp className="w-3 h-3 ml-0.5" />
                              ) : (
                                <ChevronDown className="w-3 h-3 ml-0.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isLimitReached}
                              onClick={() => handleAutoGenerateSerials(idx)}
                              className={`text-[10px] font-bold flex items-center gap-1 ${
                                isLimitReached
                                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                                  : 'text-slate-600 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-400 cursor-pointer hover:underline'
                              }`}
                              title={isLimitReached ? `Quota met: All ${targetQty} serials assigned` : 'Auto-fill sequential barcode serial numbers'}
                            >
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Auto-Fill</span>
                            </button>
                          </div>
                        </div>

                        {/* Searchable Multi-Select Dropdown from Stock */}
                        {openSerialPickerIndex === idx && (
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-600/80 shadow-md space-y-2.5">
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <PackageCheck className="w-4 h-4 text-amber-600" />
                                <span>Available Stock Serials ({stockSerials.length} in stock)</span>
                              </span>
                              <div className="flex items-center gap-2">
                                {neededCount > 0 && stockSerials.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAvailableStockBatch(idx)}
                                    className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 cursor-pointer"
                                    title={`Select the next ${neededCount} available serials in stock`}
                                  >
                                    ⚡ Pick Next {neededCount} Available
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setOpenSerialPickerIndex(null)}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Search bar inside multi-select dropdown */}
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                              <input
                                type="text"
                                placeholder={`Search among ${stockSerials.length} equipment serials...`}
                                value={serialSearchFilter[item.id] || ''}
                                onChange={(e) =>
                                  setSerialSearchFilter((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              {serialSearchFilter[item.id] && (
                                <button
                                  type="button"
                                  onClick={() => setSerialSearchFilter((prev) => ({ ...prev, [item.id]: '' }))}
                                  className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Stock Serials Checkable List */}
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                              {filteredStockSerials.length === 0 ? (
                                <div className="text-center py-3 text-xs text-slate-400 italic">
                                  {stockSerials.length === 0
                                    ? 'No pre-registered serials in stock for this equipment. Use "+ Add Custom Serial" below.'
                                    : `No serial numbers matching "${serialSearchFilter[item.id]}".`}
                                </div>
                              ) : (
                                filteredStockSerials.map((sn) => {
                                  const isSelected = item.serialNumbers?.includes(sn);
                                  const isReached = !isSelected && (item.serialNumbers?.length || 0) >= item.quantity;

                                  return (
                                    <label
                                      key={sn}
                                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                                          : isReached
                                          ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40'
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          checked={isSelected || false}
                                          disabled={isReached}
                                          onChange={() => handleToggleStockSerial(idx, sn)}
                                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <span className="font-semibold">{sn}</span>
                                      </div>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
                                          isSelected
                                            ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        {isSelected ? '✓ Selected' : 'In Stock'}
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>

                            {/* Selection Status Note */}
                            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                              <span>
                                Selected: <strong className="text-slate-900 dark:text-white font-mono">{serialCount}</strong> / {item.quantity} units
                              </span>
                              {serialCount < item.quantity ? (
                                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                  Need {item.quantity - serialCount} more serials
                                </span>
                              ) : (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  ✓ Quota met ({item.quantity}/{item.quantity})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Badges list */}
                        {item.serialNumbers && item.serialNumbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                            {item.serialNumbers.map((sn, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-slate-800 dark:text-slate-200 shadow-2xs group hover:border-amber-400"
                              >
                                <span className="font-semibold">{sn}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSerialNumber(idx, sIdx)}
                                  className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer leading-none text-xs"
                                  title={`Remove ${sn}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">
                            No serial numbers selected yet. Click "Select from Stock" or add custom below.
                          </div>
                        )}

                        {/* Inline "+ Add Custom Serial" Input Option */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="text"
                            disabled={isLimitReached}
                            placeholder={
                              isLimitReached
                                ? `All ${targetQty} / ${targetQty} serial numbers registered`
                                : "Type or paste custom serial (e.g. SN-CUSTOM-001)..."
                            }
                            value={customSerialInputs[item.id] || ''}
                            onChange={(e) =>
                              setCustomSerialInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomSerial(idx, item.id);
                              }
                            }}
                            className={`flex-1 text-[11px] p-1.5 border rounded-lg font-mono placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 ${
                              isLimitReached
                                ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddCustomSerial(idx, item.id)}
                            disabled={isLimitReached || !(customSerialInputs[item.id] || '').trim()}
                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shrink-0 shadow-xs flex items-center gap-1 ${
                              isLimitReached || !(customSerialInputs[item.id] || '').trim()
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-900 hover:bg-slate-800 text-amber-400 cursor-pointer'
                            }`}
                            title={isLimitReached ? `Quota met: All ${targetQty} serials assigned` : 'Add custom serial number'}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Custom Serial</span>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* HSN / SAC Code Column */}
                    <td className="p-3 text-center align-top pt-4">
                      <input
                        type="text"
                        value={item.hsnCode || ''}
                        onChange={(e) => handleUpdateItem(idx, 'hsnCode', e.target.value)}
                        placeholder="85017200"
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 shadow-sm"
                        title="HSN/SAC Statutory Code for GST compliance"
                      />
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1 font-mono">
                        {item.hsnCode === '85017200'
                          ? 'Solar PV'
                          : item.hsnCode === '850440'
                          ? 'Inverter'
                          : item.hsnCode === '85076000'
                          ? 'Battery'
                          : item.hsnCode === '730890'
                          ? 'Structure'
                          : 'GST HSN'}
                      </span>
                    </td>

                    {/* Stock Qty Column (Read-Only) */}
                    <td className="p-3 text-center align-top pt-4">
                      <input
                        type="number"
                        disabled
                        value={stockQty}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-200 font-mono font-bold cursor-not-allowed text-center"
                        title="Available inventory stock level"
                      />
                    </td>

                    {/* Issue Qty Column (Editable with Validation) */}
                    <td className="p-3 align-top pt-4">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                        className={`w-full p-2 border rounded-lg text-center font-mono font-bold transition-all focus:ring-2 ${
                          isExceeded
                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                            : item.quantity <= 0
                            ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50 text-amber-900 focus:ring-amber-500'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        }`}
                      />
                      {isExceeded && (
                        <span className="text-[10px] text-red-600 font-bold block mt-1 leading-tight text-center">
                          Issue Qty cannot exceed available stock ({stockQty})
                        </span>
                      )}
                      {item.quantity <= 0 && (
                        <span className="text-[10px] text-amber-700 font-bold block mt-1 leading-tight text-center">
                          Issue Qty must be &gt; 0
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right align-top pt-4">
                      <input
                        type="number"
                        value={item.unitRate}
                        onChange={(e) => handleUpdateItem(idx, 'unitRate', Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-right font-mono font-bold bg-amber-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        title="Auto-filled from stock inventory rate"
                      />
                    </td>
                    <td className="p-3 text-center align-top pt-4">
                      <select
                        value={item.taxRatePercent}
                        onChange={(e) => handleUpdateItem(idx, 'taxRatePercent', Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold bg-amber-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        title="Auto-filled from stock GST %"
                      >
                        <option value={12} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">
                          {isWestBengal ? 'CGST 6% + SGST 6%' : 'IGST 12%'}
                        </option>
                        <option value={18} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">
                          {isWestBengal ? 'CGST 9% + SGST 9%' : 'IGST 18%'}
                        </option>
                        <option value={5} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">
                          {isWestBengal ? 'CGST 2.5% + SGST 2.5%' : 'IGST 5%'}
                        </option>
                      </select>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm align-top pt-5">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center align-top pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="Remove Line Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Terms & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Terms &amp; Conditions (Exact Invoice Terms)
            </label>
            <textarea
              rows={8}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-[11px] font-bold leading-relaxed bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>

          <div className="border border-slate-300 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 pr-2 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 pb-1 mb-1.5 font-sans">
                Bank &amp; Payment Details
              </div>
              <div className="truncate"><span className="font-semibold text-slate-900 dark:text-slate-100">Account Name:</span> Sun Light Electric / Haradhan Patra</div>
              <div className="truncate"><span className="font-semibold text-slate-900 dark:text-slate-100">Bank Name:</span> HDFC BANK, DEHIBATPUR BRANCH</div>
              <div><span className="font-semibold text-slate-900 dark:text-slate-100">A/c No:</span> 50200058552107</div>
              <div><span className="font-semibold text-slate-900 dark:text-slate-100">IFSC Code:</span> HDFC0003506</div>
              <div className="text-emerald-700 dark:text-emerald-400 font-medium pt-0.5">
                <span className="font-semibold">UPI Pay ID:</span> {upiDetails.upiId}
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 italic pt-1 font-sans">
                Thank you for partnering with us for a cleaner, greener future.
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
              <img
                src={upiDetails.qrCodeUrl}
                alt="UPI Payment QR Code"
                className="w-20 h-20 object-contain block"
              />
              <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 tracking-tight mt-1 uppercase font-sans">
                Scan to Pay via UPI
              </span>
              <span className="text-[9px] font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div className="text-slate-600 dark:text-slate-400 font-medium">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Company Sign-off</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">For SUN LIGHT ELECTRIC</span>
            </div>
            <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 italic">
              Authorized Signatory: <strong className="text-slate-900 dark:text-slate-100 font-bold not-italic">Haradhan Patra</strong>
            </div>
          </div>
        </div>

        {/* Total Calculations Card (In Figures AND in Words) */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 text-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between text-slate-300">
              <span>{t.subtotal}:</span>
              <span className="font-mono font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            {/* Dynamic GST Tax Segregation based on Customer State */}
            {isWestBengal ? (
              <>
                <div className="flex justify-between text-amber-300/90 text-[11px] pl-2 border-l-2 border-amber-500/40">
                  <span>CGST (Central Tax):</span>
                  <span className="font-mono font-bold">
                    ₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-amber-300/90 text-[11px] pl-2 border-l-2 border-amber-500/40">
                  <span>SGST (State Tax):</span>
                  <span className="font-mono font-bold">
                    ₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-amber-300/90 text-[11px] pl-2 border-l-2 border-amber-500/40">
                <span>IGST (Integrated Tax):</span>
                <span className="font-mono font-bold">
                  ₹{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-200 font-semibold pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <span>{t.taxTotal} (Total GST):</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {isWestBengal ? 'WB Intra-State' : 'Inter-State'}
                </span>
              </span>
              <span className="font-mono font-bold text-amber-400">₹{taxTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span>Discount (₹):</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-28 p-1 text-right bg-slate-800 border border-slate-700 rounded text-amber-400 font-mono font-bold"
              />
            </div>

            <div className="flex justify-between items-center text-emerald-400">
              <span>{t.subsidy}:</span>
              <input
                type="number"
                value={subsidyEstimate}
                onChange={(e) => setSubsidyEstimate(Number(e.target.value))}
                className="w-28 p-1 text-right bg-slate-800 border border-slate-700 rounded text-emerald-400 font-mono font-bold"
              />
            </div>

            <div className="border-t border-slate-800 pt-3">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-sm text-slate-200">Grand Total (In Figures):</span>
                <span className="font-mono font-extrabold text-2xl text-amber-400">
                  INR {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Grand Total in Words directly beneath numeric figures */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                  Grand Total (In Words):
                </span>
                <p className="font-bold text-slate-100 text-xs italic leading-snug">
                  ({grandTotalWords})
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Warning Alert Banner if any row has invalid Issue Qty */}
      {hasValidationErrors && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs flex items-center gap-2.5 font-medium shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <strong className="font-bold block">Stock Validation Warning:</strong>
            Issue Qty exceeds available Stock Qty for item <strong>"{validationErrorItem?.description}"</strong> (Available Stock: {getItemStockLevel(validationErrorItem?.itemId || '', validationErrorItem?.stockQty)}). Please adjust quantity before generating.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handlePreview}
          disabled={hasValidationErrors}
          className={`flex items-center space-x-2 font-bold text-xs px-5 py-2.5 rounded-xl transition-all border cursor-pointer ${
            hasValidationErrors
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
          }`}
          title={hasValidationErrors ? `Validation Error: Issue Qty exceeds stock for item "${validationErrorItem?.description}"` : 'Preview PDF Document'}
        >
          <Eye className="w-4 h-4 text-amber-600" />
          <span>{t.btnGeneratePdf}</span>
        </button>

        <button
          type="button"
          onClick={handleSaveAndPrint}
          disabled={hasValidationErrors}
          className={`flex items-center space-x-2 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border ${
            hasValidationErrors
              ? 'bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed opacity-60 shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
          }`}
          title={
            hasValidationErrors
              ? `Validation Error: Issue Qty exceeds stock for item "${validationErrorItem?.description}"`
              : 'Finalize & save invoice, deduct stock & serial numbers, and open printable tax invoice layout'
          }
        >
          <Printer className="w-4 h-4 text-emerald-100" />
          <span>Save &amp; Print</span>
        </button>

        <button
          type="button"
          onClick={handleSaveAndSubmit}
          disabled={hasValidationErrors}
          className={`flex items-center space-x-2 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer ${
            hasValidationErrors
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
          title={hasValidationErrors ? `Validation Error: Issue Qty exceeds stock for item "${validationErrorItem?.description}"` : 'Save document & update stock'}
        >
          <FileText className="w-4 h-4" />
          <span>Save &amp; Generate Document</span>
        </button>
      </div>

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  PurchaseOrder,
  POLineItem,
  POType,
  POGroupName,
  POStatus,
} from '../types/purchaseOrder';
import { Supplier } from '../types/supplier';
import { SupplierChallan } from '../types/challan';
import { InventoryItem, Customer } from '../types';
import { COMPANY_CREDENTIALS } from '../data/mockData';
import { CompanyLogo } from './CompanyLogo';
import { useDebounce } from '../utils/useDebounce';
import {
  FileText,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Printer,
  PackagePlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Truck,
  Building2,
  Calendar,
  Layers,
  X,
  Trash2,
  ChevronRight,
  Download,
  DollarSign,
  Tag,
  ShieldCheck,
  Check,
  Barcode,
} from 'lucide-react';
import { numberToWordsINR } from '../utils/numberToWords';

interface PurchaseOrderTabProps {
  purchaseOrders: PurchaseOrder[];
  onSavePO: (po: PurchaseOrder) => void;
  onInwardPO: (
    poId: string,
    itemInwards: { itemId: string; inwardQty: number; inwardRate?: number; serialNumbers?: string[] }[],
    grnMetadata: {
      challanInvoiceNo: string;
      challanDate: string;
      eWayBillNo?: string;
      vehicleNo?: string;
      weighbridgeNo?: string;
      grnWeight?: string;
      receivedBy: string;
      notes?: string;
    }
  ) => void;
  onAddNewInventoryItem?: (item: InventoryItem) => void;
  suppliers: Supplier[];
  inventory: InventoryItem[];
  customers: Customer[];
  challans?: SupplierChallan[];
  currentSubView?: 'create_po' | 'search_po';
  onSubViewChange?: (view: 'create_po' | 'search_po') => void;
}

export const PurchaseOrderTab: React.FC<PurchaseOrderTabProps> = ({
  purchaseOrders,
  onSavePO,
  onInwardPO,
  onAddNewInventoryItem,
  suppliers,
  inventory,
  customers,
  challans = [],
  currentSubView = 'search_po',
  onSubViewChange,
}) => {
  const [activeSubView, setActiveSubView] = useState<'create_po' | 'search_po'>(currentSubView);

  // Sync subview
  React.useEffect(() => {
    if (currentSubView) setActiveSubView(currentSubView);
  }, [currentSubView]);

  const switchView = (view: 'create_po' | 'search_po') => {
    setActiveSubView(view);
    onSubViewChange?.(view);
  };

  // Modals state
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [inwardingPO, setInwardingPO] = useState<PurchaseOrder | null>(null);

  // Step 1: Quick Add Master Item Shortcut State
  const [showQuickAddMasterModal, setShowQuickAddMasterModal] = useState<boolean>(false);
  const [quickItemCode, setQuickItemCode] = useState<string>('');
  const [quickItemName, setQuickItemName] = useState<string>('');
  const [quickItemCategory, setQuickItemCategory] = useState<string>('Solar Panel');
  const [quickItemHsn, setQuickItemHsn] = useState<string>('85017200');
  const [quickItemUnit, setQuickItemUnit] = useState<string>('Pcs');
  const [quickItemBuyRate, setQuickItemBuyRate] = useState<number>(10000);
  const [quickItemSellRate, setQuickItemSellRate] = useState<number>(12500);
  const [quickItemGst, setQuickItemGst] = useState<number>(12);

  const handleOpenQuickAddModal = () => {
    setQuickItemCode(`INV-${Math.floor(100 + Math.random() * 900)}`);
    setQuickItemName('');
    setQuickItemCategory('Solar Panel');
    setQuickItemHsn('85017200');
    setQuickItemUnit('Pcs');
    setQuickItemBuyRate(10000);
    setQuickItemSellRate(12500);
    setQuickItemGst(12);
    setShowQuickAddMasterModal(true);
  };

  // ---------------------------------------------------------------------------
  // CREATE PO FORM STATE
  // ---------------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];

  // Section 1: Items to be ordered
  const [buyerOrderNo, setBuyerOrderNo] = useState<string>('');

  // Section 2: Purchase Order Meta
  const [invoiceTo, setInvoiceTo] = useState<string>(
    'Sun Light Electric, Soaluk, Pursurah, Hooghly - 712410'
  );
  const [dispatchTo, setDispatchTo] = useState<string>('Main Warehouse Pursurah');
  const [poType, setPoType] = useState<POType>('Regular Procurement');
  const [groupName, setGroupName] = useState<POGroupName>('Solar Modules');
  const [shortCategory, setShortCategory] = useState<string>('NA');

  const [poDate, setPoDate] = useState<string>(todayStr);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierRef, setSupplierRef] = useState<string>('NA');
  const [division, setDivision] = useState<string>('Solar EPC');
  const [forFactory, setForFactory] = useState<string>('Pursurah Godown');

  // Item Entry Row State
  const [selectedItemSku, setSelectedItemSku] = useState<string>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemHsn, setItemHsn] = useState<string>('85017200');
  const [itemUnit, setItemUnit] = useState<string>('PCS');
  const [itemQuantity, setItemQuantity] = useState<number>(10);
  const [itemRate, setItemRate] = useState<number>(0);
  const [itemTaxType, setItemTaxType] = useState<string>('GST');
  const [itemTaxSubType, setItemTaxSubType] = useState<string>('CGST + SGST');
  const [itemTaxRatePercent, setItemTaxRatePercent] = useState<number>(12);
  const [itemDueOn, setItemDueOn] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [itemPosVar, setItemPosVar] = useState<number>(0);
  const [itemNegVar, setItemNegVar] = useState<number>(0);

  // Allocation sub-row
  const [allocCustomer, setAllocCustomer] = useState<string>('');
  const [allocQty, setAllocQty] = useState<number>(0);
  const [allocations, setAllocations] = useState<{ buyerName: string; quantity: number }[]>([]);

  // List of added items in current draft PO
  const [poItems, setPoItems] = useState<POLineItem[]>([]);

  // Commercial Terms & Logistical Settings
  const [paymentTerms, setPaymentTerms] = useState<string>('10 Days from LR Date');
  const [remarks, setRemarks] = useState<string>(
    'Please mention our corresponding P.O. no in challan/invoice.'
  );

  // Additional Expenses & Summary
  const [accessoriesCartage, setAccessoriesCartage] = useState<number>(0);
  const [accessoriesOthersFor, setAccessoriesOthersFor] = useState<string>('');
  const [accessoriesOthersAmount, setAccessoriesOthersAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  const handleSaveQuickMasterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemName.trim()) {
      alert('Please enter Item Description.');
      return;
    }
    const cleanCode = (quickItemCode.trim() || `INV-${Date.now().toString().slice(-4)}`).toUpperCase();
    const newItem: InventoryItem = {
      id: `INV-${Date.now().toString().slice(-4)}`,
      code: cleanCode,
      name: quickItemName.trim(),
      nameBn: quickItemName.trim(),
      description: quickItemName.trim(),
      category: quickItemCategory as any,
      unit: quickItemUnit as any,
      hsnCode: quickItemHsn.trim() || '85017200',
      buyPrice: quickItemBuyRate,
      unitRate: quickItemSellRate,
      gstPercent: quickItemGst,
      gstRate: quickItemGst,
      cgstRate: quickItemGst / 2,
      sgstRate: quickItemGst / 2,
      igstRate: quickItemGst,
      stockLevel: 0, // Initial physical stock starts at 0 as per Step 1
      currentStock: 0,
      minStockAlert: 4,
      availableSerialNumbers: [], // Empty serial numbers array
    };

    if (onAddNewInventoryItem) {
      onAddNewInventoryItem(newItem);
    }

    setSelectedItemSku(cleanCode);
    setItemDescription(newItem.name);
    setItemUnit(newItem.unit);
    setItemHsn(newItem.hsnCode || '85017200');
    setItemRate(quickItemBuyRate);
    setItemTaxRatePercent(quickItemGst);
    setShowQuickAddMasterModal(false);
  };

  // When an inventory item is picked in the dropdown
  const handleSelectInventoryItem = (sku: string) => {
    if (sku === '__ADD_NEW_ITEM__') {
      handleOpenQuickAddModal();
      return;
    }
    setSelectedItemSku(sku);
    const found = inventory.find((it) => it.code === sku || (it as any).itemCode === sku);
    if (found) {
      setItemDescription(found.name);
      setItemHsn(found.hsnCode || '85017200');
      setItemUnit(found.unit || 'PCS');
      setItemRate(found.buyPrice || (found as any).purchasePrice || 0);
      setItemTaxRatePercent(found.gstPercent || found.gstRate || (found as any).taxRatePercent || 12);
    }
  };

  // Add allocation
  const handleAddAllocation = () => {
    if (!allocCustomer || allocQty <= 0) {
      alert('Please select a Buyer and enter a valid allocation quantity.');
      return;
    }
    setAllocations((prev) => [...prev, { buyerName: allocCustomer, quantity: allocQty }]);
    setAllocCustomer('');
    setAllocQty(0);
  };

  // Add Item to PO items list
  const handleAddItemToPo = () => {
    if (!itemDescription.trim() || itemQuantity <= 0 || itemRate <= 0) {
      alert('Please fill valid item description, quantity (> 0), and rate (> 0).');
      return;
    }

    const totalTaxable = Number((itemQuantity * itemRate).toFixed(2));
    const isInterState = itemTaxSubType === 'IGST';
    const taxAmount = Number(((totalTaxable * itemTaxRatePercent) / 100).toFixed(2));

    const newItem: POLineItem = {
      id: `POI-${Date.now()}`,
      itemCode: selectedItemSku || `ITEM-${poItems.length + 1}`,
      description: itemDescription,
      hsnCode: itemHsn,
      unit: itemUnit,
      quantity: itemQuantity,
      freeBalance: 0,
      allocations: allocations.length > 0 ? allocations : undefined,
      unitRate: itemRate,
      totalTaxable,
      taxType: itemTaxType,
      taxSubType: itemTaxSubType,
      taxRatePercent: itemTaxRatePercent,
      cgstAmount: isInterState ? 0 : Number((taxAmount / 2).toFixed(2)),
      sgstAmount: isInterState ? 0 : Number((taxAmount / 2).toFixed(2)),
      igstAmount: isInterState ? taxAmount : 0,
      totalWithTax: Number((totalTaxable + taxAmount).toFixed(2)),
      dueOn: itemDueOn,
      posVarPercent: itemPosVar,
      negVarPercent: itemNegVar,
      inwardedQty: 0,
    };

    setPoItems((prev) => [...prev, newItem]);

    // Reset item input row
    setSelectedItemSku('');
    setItemDescription('');
    setItemQuantity(10);
    setItemRate(0);
    setAllocations([]);
  };

  const handleRemovePoItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate Totals for Draft PO
  const draftTotals = useMemo(() => {
    const subtotalTaxable = poItems.reduce((acc, it) => acc + it.totalTaxable, 0);
    const totalTax = poItems.reduce((acc, it) => acc + (it.totalWithTax - it.totalTaxable), 0);
    const extraCharges = Number(accessoriesCartage || 0) + Number(accessoriesOthersAmount || 0);
    const netGrandTotal = Math.max(0, subtotalTaxable + totalTax + extraCharges - Number(discount || 0));

    return {
      subtotalTaxable: Number(subtotalTaxable.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      grandTotal: Number(netGrandTotal.toFixed(2)),
    };
  }, [poItems, accessoriesCartage, accessoriesOthersAmount, discount]);

  // Selected supplier details
  const activeSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId);
  }, [suppliers, selectedSupplierId]);

  // Save PO
  const handleSavePurchaseOrder = (previewFirst = false) => {
    if (!selectedSupplierId || !activeSupplier) {
      alert('Please select a Supplier for this Purchase Order.');
      return;
    }
    if (poItems.length === 0) {
      alert('Please add at least one line item to the Purchase Order.');
      return;
    }

    // Auto-generate PO Number
    const nextNumber = `SLE/PO/2026/${String(purchaseOrders.length + 1).padStart(3, '0')}`;

    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      poNumber: nextNumber,
      poDate,
      buyerOrderNo: buyerOrderNo || undefined,
      invoiceTo,
      dispatchTo,
      poType,
      groupName,
      shortCategory,
      supplierId: activeSupplier.id,
      supplierName: activeSupplier.companyName,
      supplierGstin: activeSupplier.gstin,
      supplierRef: supplierRef || 'NA',
      division,
      forFactory,
      items: poItems,
      paymentTerms,
      dispatchThrough: '',
      destination: '',
      deliveryTerms: '',
      remarks,
      accessoriesCartage: Number(accessoriesCartage || 0),
      accessoriesOthersFor,
      accessoriesOthersAmount: Number(accessoriesOthersAmount || 0),
      discount: Number(discount || 0),
      subtotalTaxable: draftTotals.subtotalTaxable,
      totalTax: draftTotals.totalTax,
      grandTotal: draftTotals.grandTotal,
      status: 'Open',
      createdBy: 'Haradhan Patra',
      createdAt: new Date().toISOString(),
      inwardLogs: [],
    };

    if (previewFirst) {
      setViewingPO(newPO);
      return;
    }

    onSavePO(newPO);
    alert(`Purchase Order ${newPO.poNumber} generated successfully!`);
    handleResetForm();
    switchView('search_po');
  };

  const handleResetForm = () => {
    setBuyerOrderNo('');
    setInvoiceTo('Sun Light Electric, Soaluk, Pursurah, Hooghly - 712410');
    setDispatchTo('Main Warehouse Pursurah');
    setPoType('Regular Procurement');
    setGroupName('Solar Modules');
    setSelectedSupplierId('');
    setSupplierRef('NA');
    setPoItems([]);
    setAccessoriesCartage(0);
    setAccessoriesOthersFor('');
    setAccessoriesOthersAmount(0);
    setDiscount(0);
  };

  // ---------------------------------------------------------------------------
  // SEARCH PO STATE & FILTERING
  // ---------------------------------------------------------------------------
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSupplier, setFilterSupplier] = useState<string>('All');
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>('All');
  const [filterPoNo, setFilterPoNo] = useState<string>('');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');

  const debouncedPoNo = useDebounce(filterPoNo, 250);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (filterStatus !== 'All' && po.status !== filterStatus) return false;
      if (filterSupplier !== 'All' && po.supplierId !== filterSupplier && po.supplierName !== filterSupplier) return false;
      if (filterCreatedBy !== 'All' && po.createdBy !== filterCreatedBy) return false;
      if (debouncedPoNo.trim()) {
        const q = debouncedPoNo.toLowerCase().trim();
        if (!po.poNumber.toLowerCase().includes(q)) return false;
      }
      if (filterFromDate && po.poDate < filterFromDate) return false;
      if (filterToDate && po.poDate > filterToDate) return false;
      return true;
    });
  }, [purchaseOrders, filterStatus, filterSupplier, filterCreatedBy, debouncedPoNo, filterFromDate, filterToDate]);

  // Statistics
  const poStats = useMemo(() => {
    const totalCount = purchaseOrders.length;
    const openCount = purchaseOrders.filter((po) => po.status === 'Open').length;
    const partialCount = purchaseOrders.filter((po) => po.status === 'Partially Inwarded').length;
    const fullyCount = purchaseOrders.filter((po) => po.status === 'Fully Inwarded').length;
    return { totalCount, openCount, partialCount, fullyCount };
  }, [purchaseOrders]);

  // ---------------------------------------------------------------------------
  // INWARD GRN MODAL STATE
  // ---------------------------------------------------------------------------
  const [inwardQuantities, setInwardQuantities] = useState<Record<string, number>>({});
  const [inwardRates, setInwardRates] = useState<Record<string, number>>({});
  const [inwardSerials, setInwardSerials] = useState<Record<string, string[]>>({});
  const [inwardSerialText, setInwardSerialText] = useState<Record<string, string>>({});
  const [grnChallanNo, setGrnChallanNo] = useState<string>('');
  const [grnDate, setGrnDate] = useState<string>(todayStr);
  const [grnEwbNo, setGrnEwbNo] = useState<string>('');
  const [grnVehicleNo, setGrnVehicleNo] = useState<string>('WB 18AP2877');
  const [grnWeighbridgeNo, setGrnWeighbridgeNo] = useState<string>('WB-7821');
  const [grnWeight, setGrnWeight] = useState<string>('490.0');
  const [grnReceivedBy, setGrnReceivedBy] = useState<string>('Haradhan Patra');
  const [grnNotes, setGrnNotes] = useState<string>('');

  const handleAutoGenerateItemSerials = (itemId: string, itemCode: string, qty: number) => {
    if (qty <= 0) return;
    const cleanSku = (itemCode || 'SKU').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
    const randSeed = Math.floor(100 + Math.random() * 900);
    const generated = Array.from(
      { length: qty },
      (_, i) => `SN-${cleanSku}-${randSeed}-${String(i + 1).padStart(3, '0')}`
    );
    setInwardSerials((prev) => ({ ...prev, [itemId]: generated }));
    setInwardSerialText((prev) => ({ ...prev, [itemId]: generated.join(', ') }));
  };

  const handleUpdateItemSerialText = (itemId: string, text: string) => {
    setInwardSerialText((prev) => ({ ...prev, [itemId]: text }));
    const split = text
      .split(/[\n,;\t]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
    setInwardSerials((prev) => ({ ...prev, [itemId]: split }));
  };

  const handleOpenInwardModal = (po: PurchaseOrder) => {
    setInwardingPO(po);
    const initialQtys: Record<string, number> = {};
    const initialRates: Record<string, number> = {};
    const initialSerials: Record<string, string[]> = {};
    const initialSerialText: Record<string, string> = {};

    const poItemsList = po.items || (po as any).lineItems || [];
    poItemsList.forEach((it: POLineItem) => {
      const balance = Math.max(0, it.quantity - (it.inwardedQty || 0));
      initialQtys[it.id] = balance; // Default to inwarding remaining balance
      initialRates[it.id] = it.unitRate; // Default pre-filled with PO Rate

      if (balance > 0) {
        const cleanSku = (it.itemCode || 'SKU').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
        const randSeed = Math.floor(100 + Math.random() * 900);
        const autoSerials = Array.from(
          { length: balance },
          (_, i) => `SN-${cleanSku}-${randSeed}-${String(i + 1).padStart(3, '0')}`
        );
        initialSerials[it.id] = autoSerials;
        initialSerialText[it.id] = autoSerials.join(', ');
      } else {
        initialSerials[it.id] = [];
        initialSerialText[it.id] = '';
      }
    });

    setInwardQuantities(initialQtys);
    setInwardRates(initialRates);
    setInwardSerials(initialSerials);
    setInwardSerialText(initialSerialText);
    setGrnChallanNo(`CH-${Date.now().toString().slice(-6)}`);
    setGrnDate(todayStr);
    setGrnEwbNo('');
    setGrnVehicleNo('WB 18AP2877');
    setGrnWeighbridgeNo(`WB-${Math.floor(1000 + Math.random() * 9000)}`);
    setGrnWeight('490.0');
    setGrnNotes('');
  };

  const handleConfirmInward = () => {
    if (!inwardingPO) return;
    if (!grnChallanNo.trim()) {
      alert('Please enter a Supplier Invoice / Delivery Challan Number.');
      return;
    }

    const itemsToInward: { itemId: string; inwardQty: number; inwardRate?: number; serialNumbers?: string[] }[] = [];
    let totalInwardedThisStage = 0;

    const poItemsList = inwardingPO.items || (inwardingPO as any).lineItems || [];
    for (const item of poItemsList) {
      const balance = Math.max(0, item.quantity - (item.inwardedQty || 0));
      const enteredQty = Number(inwardQuantities[item.id] !== undefined ? inwardQuantities[item.id] : balance);
      const enteredRate = Number(inwardRates[item.id] !== undefined ? inwardRates[item.id] : item.unitRate);
      const serials = (inwardSerials[item.id] || []).filter((s) => s.trim().length > 0);

      if (enteredQty > balance) {
        alert(
          `Inward quantity for "${item.description}" cannot exceed remaining balance of ${balance} ${item.unit}.`
        );
        return;
      }
      if (enteredQty > 0) {
        // Enforce 1:1 Serial Number Capture
        if (serials.length !== enteredQty) {
          alert(
            `Serial Number Mismatch for "${item.description}"!\nReceived quantity is ${enteredQty}, but ${serials.length} serial numbers are entered.\nPlease provide exactly ${enteredQty} serial numbers (or click "Auto-Generate Serials").`
          );
          return;
        }

        itemsToInward.push({
          itemId: item.id,
          inwardQty: enteredQty,
          inwardRate: enteredRate > 0 ? enteredRate : item.unitRate,
          serialNumbers: serials,
        });
        totalInwardedThisStage += enteredQty;
      }
    }

    if (totalInwardedThisStage <= 0) {
      alert('Please enter at least 1 unit to inward in this GRN stage.');
      return;
    }

    onInwardPO(inwardingPO.id, itemsToInward, {
      challanInvoiceNo: grnChallanNo,
      challanDate: grnDate,
      eWayBillNo: grnEwbNo,
      vehicleNo: grnVehicleNo,
      weighbridgeNo: grnWeighbridgeNo,
      grnWeight: grnWeight,
      receivedBy: grnReceivedBy,
      notes: grnNotes,
    });

    alert(`GRN Inward successfully recorded against PO ${inwardingPO.poNumber}! Stock and serial numbers updated.`);
    setInwardingPO(null);
  };

  // Helper to compile chronological multi-consignment GRN history rows for any PO
  const getGrnHistoryForPO = (po: PurchaseOrder, allChallans: SupplierChallan[] = []) => {
    const historyRows: {
      id: string;
      poNumber: string;
      itemName: string;
      poQty: number;
      poRate: number;
      recvQty: number;
      recvRate: number;
      addlCharge: number;
      amount: number;
      invoiceNo: string;
      invoiceDate: string;
      grnNo: string;
      weighbridgeNo: string;
      vehicleNo: string;
      grnDate: string;
      grnWeight: string;
      note: string;
    }[] = [];

    // 1. Gather from PO's inwardLogs
    const logs = po.inwardLogs || [];
    logs.forEach((log) => {
      const matchedItem = (po.items || (po as any).lineItems || []).find((i: any) => i.id === log.itemId);
      const poQty = log.poQty || matchedItem?.quantity || 0;
      const poRate = log.poRate || matchedItem?.unitRate || 0;
      const recvQty = log.quantity || 0;
      const recvRate = log.recvRate || poRate;
      const addlCharge = log.addlCharge || 0;
      const amount = log.amount || (recvQty * recvRate + addlCharge);

      const matchedChallan = allChallans.find(
        (c) => c.challanCode === log.grnNo || c.challanInvoiceNo === log.supplierInvoiceNo
      );

      historyRows.push({
        id: log.id,
        poNumber: po.poNumber,
        itemName: log.itemDescription || matchedItem?.description || 'Solar Equipment',
        poQty,
        poRate,
        recvQty,
        recvRate,
        addlCharge,
        amount,
        invoiceNo: log.supplierInvoiceNo || matchedChallan?.challanInvoiceNo || 'CH-Pending',
        invoiceDate: log.invoiceDate || log.date || matchedChallan?.challanDate || po.poDate,
        grnNo: log.grnNo,
        weighbridgeNo: log.weighbridgeNo || (matchedChallan?.eWayBillNo ? `WB-${matchedChallan.eWayBillNo.slice(-6)}` : `WB-${log.grnNo.slice(-4)}`),
        vehicleNo: log.vehicleNo || matchedChallan?.vehicleNo || 'WB 18AP2877',
        grnDate: log.date || matchedChallan?.challanDate || po.poDate,
        grnWeight: String(log.grnWeight || (recvQty > 0 ? (recvQty * 24.5).toFixed(1) : '—')),
        note: log.notes || matchedChallan?.notes || 'Inward verified and stock updated.',
      });
    });

    // 2. Also incorporate linked challans in global ERP repository
    allChallans.forEach((chal) => {
      if (chal.notes?.includes(po.poNumber) || chal.challanInvoiceNo?.includes(po.poNumber)) {
        const alreadyCaptured = historyRows.some((r) => r.grnNo === chal.challanCode);
        if (!alreadyCaptured && chal.items) {
          chal.items.forEach((ci) => {
            const matchedItem = (po.items || (po as any).lineItems || []).find(
              (i: any) => i.itemCode === ci.matchingSkuCode || i.description === ci.itemDescription
            );
            const poQty = matchedItem?.quantity || ci.quantity;
            const poRate = matchedItem?.unitRate || ci.unitPrice;
            const recvQty = ci.quantity;
            const recvRate = ci.unitPrice;
            const addlCharge = 0;
            const amount = recvQty * recvRate + addlCharge;

            historyRows.push({
              id: ci.id,
              poNumber: po.poNumber,
              itemName: ci.itemDescription,
              poQty,
              poRate,
              recvQty,
              recvRate,
              addlCharge,
              amount,
              invoiceNo: chal.challanInvoiceNo,
              invoiceDate: chal.challanDate,
              grnNo: chal.challanCode || `GRN-${chal.id.slice(-6)}`,
              weighbridgeNo: chal.eWayBillNo ? `WB-${chal.eWayBillNo.slice(-6)}` : `WB-${chal.id.slice(-4)}`,
              vehicleNo: chal.vehicleNo || 'WB 18AP2877',
              grnDate: chal.challanDate,
              grnWeight: String((recvQty * 24.5).toFixed(1)),
              note: chal.notes || 'Inward verified and stock updated.',
            });
          });
        }
      }
    });

    return historyRows;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Module Navigation Header */}
      <div className="bg-gradient-to-r from-[#0f4e56] via-[#005963] to-[#0f4e56] text-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xl border border-[#164e63] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-black/25 border border-white/20 shadow-inner">
              <PackagePlus className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Purchase Order (P.O.) Management
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  Procurement ERP
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Equipment Purchase Orders • Multi-Stage GRN Inwarding • Supplier Procurement Lifecycle
              </p>
            </div>
          </div>

          {/* Sub-tab Navigation Switcher Pills */}
          <div className="flex items-center bg-black/30 p-1.5 rounded-2xl border border-white/15 w-fit">
            <button
              type="button"
              onClick={() => switchView('create_po')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubView === 'create_po'
                  ? 'bg-emerald-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-emerald-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Create PO</span>
            </button>

            <button
              type="button"
              onClick={() => switchView('search_po')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubView === 'search_po'
                  ? 'bg-emerald-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-emerald-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search PO</span>
              <span className="ml-1 bg-black/30 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {purchaseOrders.length}
              </span>
            </button>
          </div>
        </div>

        {/* Informative Sub-header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-emerald-100/90 gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Procurement Hub:
            </span>
            <strong className="text-white bg-white/15 px-2.5 py-0.5 rounded-md border border-white/15 font-mono">
              SOALUK, Pursurah, Hooghly • WB 19
            </strong>
          </div>
          <div className="text-[11px] text-emerald-200/80">
            GSTIN: <strong className="text-white font-mono">19AZEPP1218L1Z5</strong> • Enlisted Supplier Network
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SCREEN 1: CREATE PO                                                   */}
      {/* ===================================================================== */}
      {activeSubView === 'create_po' && (
        <div className="space-y-6">
          {/* SECTION 1: "Items to be Ordered" Ribbon */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-lg overflow-hidden">
            <div className="bg-[#0f4e56] text-white px-5 py-3 font-black text-sm flex items-center justify-between">
              <span>Items to be Ordered</span>
              <span className="text-[10px] bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full uppercase font-bold">
                Order Linking
              </span>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
              <div className="max-w-md space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Buyer Code &amp; Order No.</span>
                  {buyerOrderNo && (
                    <button
                      type="button"
                      onClick={() => setBuyerOrderNo('')}
                      className="text-rose-500 hover:text-rose-600 cursor-pointer text-[11px]"
                    >
                      Clear ×
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={buyerOrderNo}
                    onChange={(e) => setBuyerOrderNo(e.target.value)}
                    placeholder="Search or enter Client Project Order (e.g. ORD-MON-101)"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: "Purchase Order" Main Form Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-[#0f4e56] text-white px-5 py-3 font-black text-sm flex items-center justify-between">
              <span>Purchase Order</span>
              <span className="text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-mono">
                DRAFT P.O.
              </span>
            </div>

            <div className="p-5 md:p-6 space-y-6 text-xs">
              {/* Top Meta Grid (Left & Right Column Setup) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/50 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                {/* Left Column */}
                <div className="space-y-3.5">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Invoice To
                    </label>
                    <select
                      value={invoiceTo}
                      onChange={(e) => setInvoiceTo(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      <option value="Sun Light Electric, Soaluk, Pursurah, Hooghly - 712410">
                        Sun Light Electric, Soaluk, Pursurah, Hooghly - 712410
                      </option>
                      <option value="Sun Light Electric, Eastern Regional Hub, Kalyani - 741235">
                        Sun Light Electric, Eastern Regional Hub, Kalyani - 741235
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Despatch To
                    </label>
                    <select
                      value={dispatchTo}
                      onChange={(e) => setDispatchTo(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      <option value="Main Warehouse Pursurah">Main Warehouse Pursurah</option>
                      <option value="Kalyani Hub">Kalyani Hub</option>
                      <option value="Falta Godown">Falta Godown</option>
                      <option value="Site Direct Installation Site">Site Direct Installation Site</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        PO Type
                      </label>
                      <select
                        value={poType}
                        onChange={(e) => setPoType(e.target.value as POType)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                      >
                        <option value="Regular Procurement">Regular Procurement</option>
                        <option value="High Sea">High Sea</option>
                        <option value="Job-Work">Job-Work</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Group Name
                      </label>
                      <select
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value as POGroupName)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                      >
                        <option value="Solar Modules">Solar Modules</option>
                        <option value="Inverters">Inverters</option>
                        <option value="Battery">Battery</option>
                        <option value="Structures">Structures</option>
                        <option value="Cables">Cables</option>
                        <option value="BOS">BOS (Balance of System)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span>Short Category:</span>
                      <span className="font-mono text-[#0f4e56] dark:text-emerald-400">{shortCategory}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Division
                      </label>
                      <select
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                      >
                        <option value="Solar EPC">Solar EPC</option>
                        <option value="Distribution">Distribution</option>
                        <option value="Retail">Retail</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Supplier</label>
                      {selectedSupplierId && (
                        <button
                          type="button"
                          onClick={() => setSelectedSupplierId('')}
                          className="text-rose-500 hover:text-rose-600 text-[11px] cursor-pointer"
                        >
                          Clear ×
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      <option value="">-- Select Supplier from Directory --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName} {s.gstin ? `(${s.gstin})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Supplier's Ref
                      </label>
                      <input
                        type="text"
                        value={supplierRef}
                        onChange={(e) => setSupplierRef(e.target.value)}
                        placeholder="Quotation / Ref No"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        For Factory
                      </label>
                      <select
                        value={forFactory}
                        onChange={(e) => setForFactory(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                      >
                        <option value="Factory 1">Factory 1</option>
                        <option value="Pursurah Godown">Pursurah Godown</option>
                        <option value="Site Direct">Site Direct</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ITEM ENTRY ROW & ALLOCATION CARD */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h3 className="font-black text-xs text-[#0f4e56] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Item Entry &amp; Allocation</span>
                  </h3>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono">
                    Free Balance: 0
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Inventory Picker & Description */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block">
                        Description of Goods
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenQuickAddModal}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Quickly register new equipment SKU to Inventory Master without leaving PO"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>+ Add New Item to Master</span>
                      </button>
                    </div>
                    <select
                      value={selectedItemSku}
                      onChange={(e) => handleSelectInventoryItem(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56] mb-1.5"
                    >
                      <option value="">-- Pick from Inventory Master --</option>
                      <option value="__ADD_NEW_ITEM__" className="text-emerald-700 font-bold bg-emerald-50">
                        + Add New Item to Master...
                      </option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.code || (item as any).itemCode}>
                          [{item.code || (item as any).itemCode}] {item.name}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={2}
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Or enter complete technical equipment description..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56] resize-none"
                    />
                  </div>

                  {/* Quantity & Unit */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Quantity &amp; Unit
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-center text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                      />
                      <select
                        value={itemUnit}
                        onChange={(e) => setItemUnit(e.target.value)}
                        className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-1.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <option value="PCS">PCS</option>
                        <option value="NOS">NOS</option>
                        <option value="SET">SET</option>
                        <option value="MTR">MTR</option>
                        <option value="KG">KG</option>
                      </select>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      HSN: <input
                        type="text"
                        value={itemHsn}
                        onChange={(e) => setItemHsn(e.target.value)}
                        className="w-20 bg-transparent border-b border-slate-300 dark:border-slate-700 text-[10px] px-1 font-mono"
                      />
                    </div>
                  </div>

                  {/* Unit Rate & Calculated Total */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={itemRate}
                      onChange={(e) => setItemRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-right text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    />
                    <div className="text-[10px] font-mono text-slate-500 text-right">
                      Total: ₹{(itemQuantity * itemRate).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Tax Settings */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      TAX
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={itemTaxSubType}
                        onChange={(e) => setItemTaxSubType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-1.5 py-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <option value="CGST + SGST">CGST+SGST</option>
                        <option value="IGST">IGST</option>
                      </select>
                      <select
                        value={itemTaxRatePercent}
                        onChange={(e) => setItemTaxRatePercent(parseInt(e.target.value))}
                        className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-1 py-1.5 text-[11px] font-bold text-center text-slate-800 dark:text-slate-200"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 text-right">
                      +₹{(((itemQuantity * itemRate * itemTaxRatePercent) / 100)).toFixed(0)} GST
                    </div>
                  </div>

                  {/* Due On & Variance */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Due on / Var (%)
                    </label>
                    <input
                      type="date"
                      value={itemDueOn}
                      onChange={(e) => setItemDueOn(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 mb-1"
                    />
                    <div className="flex items-center gap-1 text-[10px]">
                      <span>(+)</span>
                      <input
                        type="number"
                        value={itemPosVar}
                        onChange={(e) => setItemPosVar(parseFloat(e.target.value) || 0)}
                        className="w-10 bg-white dark:bg-slate-900 border border-slate-300 rounded px-1 text-center"
                      />
                      <span>(-)</span>
                      <input
                        type="number"
                        value={itemNegVar}
                        onChange={(e) => setItemNegVar(parseFloat(e.target.value) || 0)}
                        className="w-10 bg-white dark:bg-slate-900 border border-slate-300 rounded px-1 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-row: Client Project Allocation */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                    Allocation:
                  </span>
                  <select
                    value={allocCustomer}
                    onChange={(e) => setAllocCustomer(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs"
                  >
                    <option value="">-- Select Buyer / Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={allocQty || ''}
                    onChange={(e) => setAllocQty(parseInt(e.target.value) || 0)}
                    className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddAllocation}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Allocate
                  </button>

                  {allocations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-auto">
                      {allocations.map((a, i) => (
                        <span
                          key={i}
                          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-300"
                        >
                          {a.buyerName}: {a.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddItemToPo}
                    className="ml-auto px-4 py-2 bg-[#0f4e56] hover:bg-[#005963] text-white font-black rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add</span>
                  </button>
                </div>
              </div>

              {/* Added Line Items Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#164e63] text-white font-black text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3 text-center w-10">#</th>
                      <th className="p-3">Description of Goods</th>
                      <th className="p-3 text-center">HSN</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Rate (₹)</th>
                      <th className="p-3 text-right">Taxable (₹)</th>
                      <th className="p-3 text-center">TAX</th>
                      <th className="p-3 text-right">Total with Tax (₹)</th>
                      <th className="p-3 text-center">Due on</th>
                      <th className="p-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {poItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          No items added yet. Configure above and click <strong>[+ Add]</strong>.
                        </td>
                      </tr>
                    ) : (
                      poItems.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{it.description}</div>
                            <div className="text-[10px] text-slate-400 font-mono">SKU: {it.itemCode}</div>
                            {it.allocations && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {it.allocations.map((al, ai) => (
                                  <span key={ai} className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300">
                                    Alloc: {al.buyerName} ({al.quantity})
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono">{it.hsnCode}</td>
                          <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100">
                            {it.quantity} {it.unit}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            ₹{it.unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            ₹{it.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center font-mono text-[10px]">
                            {it.taxSubType} @ {it.taxRatePercent}%
                          </td>
                          <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                            ₹{it.totalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                            {it.dueOn}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePoItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* COMMERCIAL TERMS & REMARKS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                {/* Mode/Terms of Payment */}
                <div className="space-y-1.5 flex flex-col justify-between">
                  <div>
                    <label className="font-black text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider block mb-1">
                      Mode / Terms of Payment
                    </label>
                    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-1.5 max-h-36 overflow-y-auto space-y-1">
                      {[
                        '100% against Proforma',
                        '10 Days from LR Date',
                        '10 days from submission of bill',
                        '30 Days Credit',
                        '50% Advance & 50% on Delivery',
                      ].map((opt) => (
                        <div
                          key={opt}
                          onClick={() => setPaymentTerms(opt)}
                          className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-between ${
                            paymentTerms === opt
                              ? 'bg-[#0f4e56] text-white font-bold shadow-xs'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{opt}</span>
                          {paymentTerms === opt && <Check className="w-3.5 h-3.5 text-amber-300" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Remarks / Dispatch Instructions */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="font-black text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider block mb-1">
                    Remarks / Dispatch Instructions
                  </label>
                  <textarea
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Please mention our corresponding P.O. no in challan/invoice..."
                    className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56] resize-none"
                  />
                </div>
              </div>

              {/* Additional Expenses & Final Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Accessories Cartage (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={accessoriesCartage || ''}
                        onChange={(e) => setAccessoriesCartage(parseFloat(e.target.value) || 0)}
                        placeholder="Freight & cartage"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={discount || ''}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="Volume discount"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Accessories Others For
                      </label>
                      <input
                        type="text"
                        value={accessoriesOthersFor}
                        onChange={(e) => setAccessoriesOthersFor(e.target.value)}
                        placeholder="e.g. Special wooden crating"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={accessoriesOthersAmount || ''}
                        onChange={(e) => setAccessoriesOthersAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Grand Total Summary Box */}
                <div className="bg-slate-100 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal Taxable:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        ₹{draftTotals.subtotalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="flex justify-between text-teal-600 dark:text-teal-400">
                      <span>Total Input GST:</span>
                      <strong>₹{draftTotals.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    {(accessoriesCartage > 0 || accessoriesOthersAmount > 0) && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Cartage &amp; Other Expenses:</span>
                        <strong>+₹{(accessoriesCartage + accessoriesOthersAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between text-rose-600 dark:text-rose-400">
                        <span>Discount:</span>
                        <strong>-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-300 dark:border-slate-700 flex justify-between items-baseline">
                    <span className="font-black text-sm uppercase text-slate-800 dark:text-slate-200">
                      Grand Total:
                    </span>
                    <span className="font-black text-xl font-mono text-[#0f4e56] dark:text-emerald-400">
                      ₹{draftTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleSavePurchaseOrder(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSavePurchaseOrder(false)}
                  className="px-6 py-2.5 bg-[#0f4e56] hover:bg-[#005963] text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Generate Purchase Order</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SCREEN 2: SEARCH PO                                                   */}
      {/* ===================================================================== */}
      {activeSubView === 'search_po' && (
        <div className="space-y-6">
          {/* Quick Statistics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total POs</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{poStats.totalCount}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Procurement contracts</span>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Open POs</span>
                <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{poStats.openCount}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Awaiting dispatch</span>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partially Inwarded</span>
                <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{poStats.partialCount}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Pending stage GRN</span>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Truck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fully Inwarded</span>
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{poStats.fullyCount}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Procurement completed</span>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search & Filter Card with Dark Teal Header Ribbon */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-[#0f4e56] text-white px-5 py-3 font-black text-sm flex items-center justify-between">
              <span className="uppercase tracking-wider">PO SEARCH</span>
              <span className="text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-mono">
                {filteredPOs.length} Records Found
              </span>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Filters */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      PO Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Open">Open</option>
                      <option value="Partially Inwarded">Partially Inwarded</option>
                      <option value="Fully Inwarded">Fully Inwarded</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400">Supplier</label>
                      {filterSupplier !== 'All' && (
                        <button
                          type="button"
                          onClick={() => setFilterSupplier('All')}
                          className="text-rose-500 hover:text-rose-600 text-[11px] cursor-pointer"
                        >
                          Clear ×
                        </button>
                      )}
                    </div>
                    <select
                      value={filterSupplier}
                      onChange={(e) => setFilterSupplier(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      <option value="All">All Suppliers</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Created By
                    </label>
                    <select
                      value={filterCreatedBy}
                      onChange={(e) => setFilterCreatedBy(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      <option value="All">All</option>
                      <option value="Haradhan Patra">Haradhan Patra</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                {/* Right Filters */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      PO No
                    </label>
                    <input
                      type="text"
                      placeholder="Search PO Number (e.g. SLE/PO/2026/001)"
                      value={filterPoNo}
                      onChange={(e) => setFilterPoNo(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        PO Dated From
                      </label>
                      <input
                        type="date"
                        value={filterFromDate}
                        onChange={(e) => setFilterFromDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        PO Dated To
                      </label>
                      <input
                        type="date"
                        value={filterToDate}
                        onChange={(e) => setFilterToDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus('All');
                        setFilterSupplier('All');
                        setFilterCreatedBy('All');
                        setFilterPoNo('');
                        setFilterFromDate('');
                        setFilterToDate('');
                      }}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {}}
                      className="px-6 py-2 bg-[#0f4e56] hover:bg-[#005963] text-white font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PO Register Table */}
            <div className="border-t border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#164e63] text-white font-black text-[11px] uppercase tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="py-3 px-3 text-center">SL</th>
                    <th className="py-3 px-3">PO Number</th>
                    <th className="py-3 px-3 text-center">PO Date</th>
                    <th className="py-3 px-4">Supplier Name &amp; GSTIN</th>
                    <th className="py-3 px-4">Ordered Items Summary</th>
                    <th className="py-3 px-3 text-center">Ordered Qty</th>
                    <th className="py-3 px-3 text-center">Inwarded Qty</th>
                    <th className="py-3 px-3 text-center">Balance Qty</th>
                    <th className="py-3 px-3 text-right">Grand Total (₹)</th>
                    <th className="py-3 px-3 text-center">PO Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <div className="font-bold text-sm text-slate-600 dark:text-slate-400">
                          No Purchase Orders Found
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Try adjusting search filters or click <strong>[Create PO]</strong> to issue a new order.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po, idx) => {
                      const totalOrdered = po.items.reduce((s, it) => s + it.quantity, 0);
                      const totalInwarded = po.items.reduce((s, it) => s + (it.inwardedQty || 0), 0);
                      const balanceQty = Math.max(0, totalOrdered - totalInwarded);

                      return (
                        <tr key={po.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-3 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-3 font-mono font-black text-[#0f4e56] dark:text-emerald-400 whitespace-nowrap">
                            {po.poNumber}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {po.poDate}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 min-w-[200px]">
                            <div>{po.supplierName}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal">
                              GSTIN: {po.supplierGstin || 'Not recorded'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <div className="space-y-0.5">
                              {po.items.map((it, i) => (
                                <div key={i} className="text-[11px] text-slate-700 dark:text-slate-300">
                                  <span className="font-semibold">{it.description}</span>{' '}
                                  <span className="text-slate-400 font-mono">({it.quantity} {it.unit})</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {totalOrdered}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {totalInwarded}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-black text-amber-600 dark:text-amber-400">
                            {balanceQty}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                            ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                po.status === 'Fully Inwarded'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                  : po.status === 'Partially Inwarded'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View / Print PO Button */}
                              <button
                                type="button"
                                onClick={() => setViewingPO(po)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                title="View & Print Purchase Order"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Multi-stage GRN Inward Button */}
                              {po.status !== 'Fully Inwarded' && po.status !== 'Cancelled' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInwardModal(po)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                  title="Inward goods against this PO"
                                >
                                  <PackagePlus className="w-3.5 h-3.5" />
                                  <span>+ Inward GRN</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Inwarded</span>
                                </span>
                              )}
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
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: MULTI-STAGE GRN INWARDING WIZARD                             */}
      {/* ===================================================================== */}
      {inwardingPO && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-4xl lg:max-w-5xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#0f4e56] text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <PackagePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-base">Inward Goods Against PO</h3>
                    <span className="font-mono text-emerald-300 font-bold">{inwardingPO.poNumber}</span>
                  </div>
                  <p className="text-[11px] text-emerald-100/80">
                    Vendor: <strong className="text-white">{inwardingPO.supplierName}</strong> • Destination: {inwardingPO.destination}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInwardingPO(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Inward Challan Meta Details */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Supplier Invoice / Challan No *
                  </label>
                  <input
                    type="text"
                    value={grnChallanNo}
                    onChange={(e) => setGrnChallanNo(e.target.value)}
                    placeholder="e.g. WB/SL/9921"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Challan Date
                  </label>
                  <input
                    type="date"
                    value={grnDate}
                    onChange={(e) => setGrnDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={grnVehicleNo}
                    onChange={(e) => setGrnVehicleNo(e.target.value)}
                    placeholder="e.g. WB 18AP2877"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Weighbridge Slip No
                  </label>
                  <input
                    type="text"
                    value={grnWeighbridgeNo}
                    onChange={(e) => setGrnWeighbridgeNo(e.target.value)}
                    placeholder="e.g. WB-449102"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    GRN Weight (Kgs)
                  </label>
                  <input
                    type="text"
                    value={grnWeight}
                    onChange={(e) => setGrnWeight(e.target.value)}
                    placeholder="e.g. 490.0"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Items Inwarding Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    Line Items Inward Receiving:
                  </span>
                  <span className="text-[10px] text-slate-500 italic">
                    Cap limit enforced per remaining balance • Recv Rate pre-filled with locked PO Rate
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#164e63] text-white font-bold text-[10px] uppercase tracking-wider">
                        <tr>
                          {/* 1. PO No */}
                          <th className="p-2.5 text-center whitespace-nowrap">PO No</th>
                          {/* 2. Item Description */}
                          <th className="p-2.5 min-w-[220px]">Item Description</th>
                          {/* 3. PO Rate */}
                          <th className="p-2.5 text-right whitespace-nowrap">PO Rate</th>
                          {/* 4. UOM */}
                          <th className="p-2.5 text-center whitespace-nowrap">UOM</th>
                          {/* 5. Recv Qty */}
                          <th className="p-2.5 text-center whitespace-nowrap min-w-[110px]">Recv Qty *</th>
                          {/* 6. Pending Qty */}
                          <th className="p-2.5 text-center whitespace-nowrap min-w-[120px]">Pending Qty</th>
                          {/* 7. Recv Rate */}
                          <th className="p-2.5 text-right whitespace-nowrap min-w-[140px]">Recv Rate (₹) *</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {(inwardingPO.items || (inwardingPO as any).lineItems || []).map((it: POLineItem) => {
                          const orderedQty = it.quantity || 0;
                          const prevInwarded = it.inwardedQty || 0;
                          const maxAvailableBalance = Math.max(0, orderedQty - prevInwarded);

                          // 5. Current Recv Qty
                          const currentRecvQty =
                            inwardQuantities[it.id] !== undefined
                              ? inwardQuantities[it.id]
                              : maxAvailableBalance;

                          // 6. Pending Qty: (Ordered Qty - Prev Inwarded Qty) - Current Recv Qty
                          const pendingQty = Math.max(0, maxAvailableBalance - currentRecvQty);

                          // 7. Current Recv Rate
                          const currentRecvRate =
                            inwardRates[it.id] !== undefined ? inwardRates[it.id] : it.unitRate;
                          const isRateModified =
                            Number(currentRecvRate) !== Number(it.unitRate);

                          return (
                            <React.Fragment key={it.id}>
                              <tr
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                              >
                              {/* 1. PO No */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                  {inwardingPO.poNumber}
                                </span>
                              </td>

                              {/* 2. Item Description */}
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                  {it.description}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                  <span>
                                    SKU: <strong className="text-slate-600 dark:text-slate-300">{it.itemCode}</strong>
                                  </span>
                                  {it.hsnCode && <span>| HSN: {it.hsnCode}</span>}
                                </div>
                              </td>

                              {/* 3. PO Rate */}
                              <td className="p-2.5 text-right whitespace-nowrap">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  ₹{Number(it.unitRate || 0).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </td>

                              {/* 4. UOM */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 uppercase">
                                  {it.unit || 'PCS'}
                                </span>
                              </td>

                              {/* 5. Recv Qty */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <div className="flex flex-col items-center gap-0.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max={maxAvailableBalance}
                                    value={currentRecvQty}
                                    onChange={(e) => {
                                      const raw = parseInt(e.target.value) || 0;
                                      const clamped = Math.min(maxAvailableBalance, Math.max(0, raw));
                                      setInwardQuantities((prev) => ({ ...prev, [it.id]: clamped }));
                                    }}
                                    className="w-20 bg-white dark:bg-slate-900 border-2 border-emerald-500 focus:ring-2 focus:ring-emerald-400 rounded-lg px-2 py-1 text-xs font-mono font-black text-center text-slate-900 dark:text-slate-100 outline-none shadow-2xs"
                                    title={`Max allowable in this consignment: ${maxAvailableBalance}`}
                                  />
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    Max: {maxAvailableBalance}
                                  </span>
                                </div>
                              </td>

                              {/* 6. Pending Qty */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                {pendingQty === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>0 (Complete)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    <span>{pendingQty} {it.unit || 'PCS'}</span>
                                  </span>
                                )}
                              </td>

                              {/* 7. Recv Rate */}
                              <td className="p-2.5 text-right whitespace-nowrap">
                                <div className="flex flex-col items-end gap-1">
                                  <div className="relative flex items-center">
                                    <span className="absolute left-2 text-slate-400 font-mono text-xs">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={currentRecvRate}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setInwardRates((prev) => ({ ...prev, [it.id]: val }));
                                      }}
                                      className={`w-28 pl-5 pr-2 py-1 text-xs font-mono font-bold text-right rounded-lg outline-none border-2 transition-all ${
                                        isRateModified
                                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 focus:ring-2 focus:ring-amber-400'
                                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#0f4e56]'
                                      }`}
                                      placeholder={String(it.unitRate)}
                                    />
                                  </div>
                                  {isRateModified && (
                                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>Rate Diff (PO: ₹{Number(it.unitRate).toFixed(2)})</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {currentRecvQty > 0 && (
                              <tr key={`${it.id}-serials`} className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-300 dark:border-emerald-800/80">
                                <td colSpan={7} className="p-3">
                                  <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/80 rounded-xl p-3 space-y-2 shadow-2xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                                          1:1 Equipment Serial Numbers Capture
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          (Required: <strong>{currentRecvQty}</strong> serials)
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const count = (inwardSerials[it.id] || []).filter((s) => s.trim().length > 0).length;
                                          const isExact = count === currentRecvQty;
                                          return isExact ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                              <span>Exact Match ({count}/{currentRecvQty})</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                                              <span>{count} / {currentRecvQty} Entered ({Math.abs(currentRecvQty - count)} {count < currentRecvQty ? 'needed' : 'excess'})</span>
                                            </span>
                                          );
                                        })()}

                                        <button
                                          type="button"
                                          onClick={() => handleAutoGenerateItemSerials(it.id, it.itemCode, currentRecvQty)}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-xs cursor-pointer flex items-center gap-1"
                                          title="Auto generate sequential serial numbers matching received quantity"
                                        >
                                          <span>Auto-Generate {currentRecvQty} Serials</span>
                                        </button>
                                      </div>
                                    </div>

                                    <textarea
                                      rows={2}
                                      value={inwardSerialText[it.id] || ''}
                                      onChange={(e) => handleUpdateItemSerialText(it.id, e.target.value)}
                                      placeholder="Scan barcode or type serial numbers separated by comma, space or newline..."
                                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                                    />

                                    {/* Preview badges */}
                                    {(inwardSerials[it.id] || []).length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1 pt-1 max-h-24 overflow-y-auto">
                                        {(inwardSerials[it.id] || []).map((sn, snIdx) => (
                                          <span
                                            key={snIdx}
                                            className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                                          >
                                            #{snIdx + 1}: {sn}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Consignment Live Valuation Bar */}
                {(() => {
                  const poItemsList = inwardingPO.items || (inwardingPO as any).lineItems || [];
                  const totalUnits = poItemsList.reduce((acc: number, it: POLineItem) => {
                    const maxBal = Math.max(0, it.quantity - (it.inwardedQty || 0));
                    const q = inwardQuantities[it.id] !== undefined ? inwardQuantities[it.id] : maxBal;
                    return acc + q;
                  }, 0);
                  const totalTaxableValuation = poItemsList.reduce((acc: number, it: POLineItem) => {
                    const maxBal = Math.max(0, it.quantity - (it.inwardedQty || 0));
                    const q = inwardQuantities[it.id] !== undefined ? inwardQuantities[it.id] : maxBal;
                    const r = inwardRates[it.id] !== undefined ? inwardRates[it.id] : it.unitRate;
                    return acc + q * r;
                  }, 0);

                  return (
                    <div className="mt-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 uppercase text-[10px] tracking-wider">
                          Consignment Valuation:
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          (Calculated as Recv Qty × Recv Rate)
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                          Inwarding: <strong className="text-slate-900 dark:text-slate-100 font-mono">{totalUnits} Units</strong>
                        </span>
                        <span className="text-emerald-800 dark:text-emerald-300 font-bold text-xs font-mono">
                          Taxable Total: ₹{totalTaxableValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Inward Remarks &amp; Unloading Notes
                </label>
                <textarea
                  rows={2}
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  placeholder="e.g. Unloaded at Pursurah Bay 2. Physical inspection verified OK."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                />
              </div>
            </div>

            {/* Modal Footer (Action Buttons: Cancel / Confirm) */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Receiver: <strong className="text-slate-800 dark:text-slate-200">{grnReceivedBy}</strong>
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInwardingPO(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmInward}
                  className="px-5 py-2 bg-[#0f4e56] hover:bg-[#005963] text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Inward &amp; Generate GRN</span>
                </button>
              </div>
            </div>

            {/* Dedicated GRN History Audit Section (Directly below active line items & action buttons) */}
            <div className="p-5 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-blue-700 dark:text-blue-400 font-bold text-base mb-2">
                  GRN History
                </h4>
                {(() => {
                  const inwardingHistory = getGrnHistoryForPO(inwardingPO, challans);
                  if (inwardingHistory.length === 0) return null;
                  return (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mb-2">
                      Inward Consignments: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{inwardingHistory.length}</strong>
                    </span>
                  );
                })()}
              </div>

              {(() => {
                const inwardingHistory = getGrnHistoryForPO(inwardingPO, challans);
                if (inwardingHistory.length === 0) {
                  return (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 text-xs italic bg-white/60 dark:bg-slate-900/40">
                      No previous GRNs recorded against this PO yet.
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-[#008744] text-white font-bold text-[10px] uppercase tracking-wider">
                          <tr>
                            <th className="p-2.5 text-center whitespace-nowrap">PO No</th>
                            <th className="p-2.5 min-w-[200px]">Item Name</th>
                            <th className="p-2.5 text-center whitespace-nowrap">PO Qty.</th>
                            <th className="p-2.5 text-right whitespace-nowrap">PO Rate</th>
                            <th className="p-2.5 text-center whitespace-nowrap">Recv Qty.</th>
                            <th className="p-2.5 text-right whitespace-nowrap">Recv Rate</th>
                            <th className="p-2.5 text-right whitespace-nowrap">Addl Charge</th>
                            <th className="p-2.5 text-right whitespace-nowrap">Amount</th>
                            <th className="p-2.5 text-center whitespace-nowrap min-w-[130px]">Invoice/ Challan No</th>
                            <th className="p-2.5 text-center whitespace-nowrap">Invoice Date</th>
                            <th className="p-2.5 text-center whitespace-nowrap">GRN No.</th>
                            <th className="p-2.5 text-center whitespace-nowrap">Weighbridge No</th>
                            <th className="p-2.5 text-center whitespace-nowrap">Vehicle No</th>
                            <th className="p-2.5 text-center whitespace-nowrap">GRN Date</th>
                            <th className="p-2.5 text-center whitespace-nowrap">GRN Weight (Kgs)</th>
                            <th className="p-2.5 min-w-[160px]">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                          {inwardingHistory.map((row, idx) => (
                            <tr
                              key={row.id || `${row.grnNo}-${idx}`}
                              className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              {/* 1. PO No */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                  {row.poNumber}
                                </span>
                              </td>

                              {/* 2. Item Name */}
                              <td className="p-2.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                  {row.itemName}
                                </span>
                              </td>

                              {/* 3. PO Qty. */}
                              <td className="p-2.5 text-center whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">
                                {row.poQty}
                              </td>

                              {/* 4. PO Rate */}
                              <td className="p-2.5 text-right whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                                ₹{Number(row.poRate || 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>

                              {/* 5. Recv Qty. */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  {row.recvQty}
                                </span>
                              </td>

                              {/* 6. Recv Rate */}
                              <td className="p-2.5 text-right whitespace-nowrap font-mono font-bold text-slate-900 dark:text-slate-100">
                                ₹{Number(row.recvRate || 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>

                              {/* 7. Addl Charge */}
                              <td className="p-2.5 text-right whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                                {row.addlCharge > 0 ? (
                                  `+₹${Number(row.addlCharge).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                ) : (
                                  '₹0.00'
                                )}
                              </td>

                              {/* 8. Amount */}
                              <td className="p-2.5 text-right whitespace-nowrap font-mono font-black text-slate-900 dark:text-emerald-300">
                                ₹{Number(row.amount || 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>

                              {/* 9. Invoice/ Challan No */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                                  {row.invoiceNo}
                                </span>
                              </td>

                              {/* 10. Invoice Date */}
                              <td className="p-2.5 text-center whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {row.invoiceDate}
                              </td>

                              {/* 11. GRN No. */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                                  {row.grnNo}
                                </span>
                              </td>

                              {/* 12. Weighbridge No */}
                              <td className="p-2.5 text-center whitespace-nowrap font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                {row.weighbridgeNo || '—'}
                              </td>

                              {/* 13. Vehicle No */}
                              <td className="p-2.5 text-center whitespace-nowrap font-mono font-bold uppercase text-slate-800 dark:text-slate-200">
                                {row.vehicleNo || '—'}
                              </td>

                              {/* 14. GRN Date */}
                              <td className="p-2.5 text-center whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {row.grnDate}
                              </td>

                              {/* 15. GRN Weight (Kgs) */}
                              <td className="p-2.5 text-center whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                                {row.grnWeight}
                              </td>

                              {/* 16. Note */}
                              <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                                {row.note}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: PRINTABLE PURCHASE ORDER PREVIEW SHEET                       */}
      {/* ===================================================================== */}
      {viewingPO && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Top Toolbar */}
            <div className="no-print bg-slate-900 text-white p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="font-black text-sm">Purchase Order Preview:</span>
                <span className="font-mono text-emerald-300 font-bold">{viewingPO.poNumber}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print PO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPO(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Printable Paper Sheet) */}
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950">
              <div className="printable-document bg-white text-slate-900 border border-slate-300 rounded-xl p-8 max-w-3xl mx-auto shadow-xl space-y-6 text-xs font-sans">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
                  <div className="flex items-start gap-4">
                    <CompanyLogo className="h-16 w-auto object-contain rounded-xl shadow-xs shrink-0" />
                    <div>
                      <h1 className="text-xl font-black text-amber-600 tracking-tight">
                        {COMPANY_CREDENTIALS.companyName}
                      </h1>
                      <p className="text-xs text-slate-700 font-semibold">{COMPANY_CREDENTIALS.tagline}</p>
                      <p className="text-[11px] text-slate-500">{COMPANY_CREDENTIALS.address}</p>
                      <p className="text-[11px] text-slate-500">
                        GSTIN: <strong className="text-slate-900">{COMPANY_CREDENTIALS.gstin}</strong> | Mobile: +91 {COMPANY_CREDENTIALS.mobile}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block bg-[#0f4e56] text-white font-black text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider shadow-xs">
                      PURCHASE ORDER
                    </span>
                    <div className="text-xs font-mono font-black text-slate-900 mt-2">
                      PO #: {viewingPO.poNumber}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">Date: {viewingPO.poDate}</div>
                    {viewingPO.buyerOrderNo && (
                      <div className="text-[10px] font-mono text-emerald-700 font-bold">
                        Ref Order: {viewingPO.buyerOrderNo}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vendor & Logistics Grid */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <span className="font-extrabold text-[#0f4e56] uppercase text-[10px] tracking-wider block">
                      Vendor / Supplier:
                    </span>
                    <div className="font-black text-slate-900 text-sm">{viewingPO.supplierName}</div>
                    <div className="text-slate-600 font-mono">
                      GSTIN: <strong>{viewingPO.supplierGstin || 'Not Recorded'}</strong>
                    </div>
                    <div className="text-slate-600">Supplier Ref: {viewingPO.supplierRef || 'NA'}</div>
                  </div>

                  <div className="space-y-1 text-right">
                    <span className="font-extrabold text-[#0f4e56] uppercase text-[10px] tracking-wider block">
                      Invoicing &amp; Despatch:
                    </span>
                    <div className="text-slate-700">
                      Invoice To: <strong>{viewingPO.invoiceTo}</strong>
                    </div>
                    <div className="text-slate-700">
                      Despatch To: <strong>{viewingPO.dispatchTo}</strong>
                    </div>
                    {viewingPO.destination ? (
                      <div className="text-slate-700">
                        Destination: <strong>{viewingPO.destination}</strong>{' '}
                        {viewingPO.deliveryTerms ? `(${viewingPO.deliveryTerms})` : ''}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Items Ordered Table */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-center">HSN</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Taxable (₹)</th>
                        <th className="p-2.5 text-center">Tax %</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {viewingPO.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{it.description}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Item Code: {it.itemCode}</div>
                          </td>
                          <td className="p-2.5 text-center font-mono">{it.hsnCode}</td>
                          <td className="p-2.5 text-center font-bold text-slate-900">
                            {it.quantity} {it.unit}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            ₹{it.unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            ₹{it.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center font-mono text-[10px]">
                            {it.taxRatePercent}%
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ₹{it.totalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary & Remarks */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 uppercase text-[10px] block">
                        Commercial Terms:
                      </span>
                      <div className="text-[11px] text-slate-600">
                        Payment: <strong>{viewingPO.paymentTerms || 'Standard'}</strong>
                      </div>
                      {viewingPO.dispatchThrough ? (
                        <div className="text-[11px] text-slate-600">
                          Despatch Mode: <strong>{viewingPO.dispatchThrough}</strong>
                        </div>
                      ) : null}
                      {viewingPO.deliveryTerms ? (
                        <div className="text-[11px] text-slate-600">
                          Delivery Terms: <strong>{viewingPO.deliveryTerms}</strong>
                        </div>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-slate-600 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                      <strong>Remarks: </strong> {viewingPO.remarks}
                    </div>
                  </div>

                  {/* Totals Box */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono text-right">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Taxable:</span>
                      <strong>₹{viewingPO.subtotalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between text-teal-700">
                      <span>Input Tax (GST):</span>
                      <strong>+₹{viewingPO.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    {viewingPO.accessoriesCartage > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Cartage:</span>
                        <strong>+₹{viewingPO.accessoriesCartage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}
                    {viewingPO.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount:</span>
                        <strong>-₹{viewingPO.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-slate-800 flex justify-between text-sm font-black text-slate-900">
                      <span>Grand Total:</span>
                      <span>₹{viewingPO.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans italic text-right mt-1">
                      ({numberToWordsINR(viewingPO.grandTotal)})
                    </div>
                  </div>
                </div>

                {/* Inwarding GRN History Audit Trail (if inwarded) */}
                {(() => {
                  const history = getGrnHistoryForPO(viewingPO, challans);
                  if (history.length === 0) return null;
                  return (
                    <div className="space-y-2 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#008744] uppercase text-[10px] tracking-wider block">
                          Goods Receipt Note (GRN) Inward History
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {history.length} Inward Consignment(s) Recorded
                        </span>
                      </div>
                      <div className="border border-slate-300 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-[#008744] text-white font-bold text-[9px] uppercase tracking-wider">
                            <tr>
                              <th className="p-2 text-center">GRN No.</th>
                              <th className="p-2">Item Description</th>
                              <th className="p-2 text-center">PO Qty</th>
                              <th className="p-2 text-center">Recv Qty</th>
                              <th className="p-2 text-right">Recv Rate</th>
                              <th className="p-2 text-right">Amount (₹)</th>
                              <th className="p-2 text-center">Supplier Challan</th>
                              <th className="p-2 text-center">GRN Date</th>
                              <th className="p-2 text-center">Vehicle No</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-[10px] font-mono">
                            {history.map((h, i) => (
                              <tr key={h.id || i} className="hover:bg-slate-50">
                                <td className="p-2 text-center font-bold text-emerald-800">{h.grnNo}</td>
                                <td className="p-2 font-sans font-semibold text-slate-800">{h.itemName}</td>
                                <td className="p-2 text-center">{h.poQty}</td>
                                <td className="p-2 text-center font-bold text-emerald-700">{h.recvQty}</td>
                                <td className="p-2 text-right">₹{Number(h.recvRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 text-right font-bold text-slate-900">₹{Number(h.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 text-center text-slate-600">{h.invoiceNo}</td>
                                <td className="p-2 text-center text-slate-600">{h.grnDate}</td>
                                <td className="p-2 text-center font-bold text-slate-700 uppercase">{h.vehicleNo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Signatory Box */}
                <div className="pt-8 flex justify-between items-end border-t border-slate-200">
                  <div className="text-[10px] text-slate-400">
                    This is a computer-generated Purchase Order by Sun Light Electric.
                  </div>
                  <div className="text-right space-y-12">
                    <span className="font-bold text-slate-700 block">For Sun Light Electric</span>
                    <span className="border-t border-slate-800 pt-1 font-bold text-slate-900 block text-[11px]">
                      Authorized Signatory
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Master Item Modal (Step 1 shortcut from PO Screen) */}
      {showQuickAddMasterModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#0f4e56] text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm text-white">Add New Item to Inventory Master</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddMasterModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickMasterItem} className="p-5 space-y-3.5 text-xs">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px]">
                ℹ Item will be registered in Stock Master with <strong>0 initial physical stock</strong> and an empty serial numbers pool []. Physical stock will only increase upon actual GRN inwarding.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Item Code / SKU *
                  </label>
                  <input
                    type="text"
                    value={quickItemCode}
                    onChange={(e) => setQuickItemCode(e.target.value.toUpperCase())}
                    required
                    placeholder="e.g. INV-HYB-5KW"
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-[#0f4e56] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={quickItemCategory}
                    onChange={(e) => setQuickItemCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0f4e56] bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Solar Panel">Solar Panel</option>
                    <option value="Inverter">Inverter</option>
                    <option value="Battery">Battery</option>
                    <option value="Mounting Structure">Mounting Structure</option>
                    <option value="Cable & Wiring">Cable & Wiring</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  value={quickItemName}
                  onChange={(e) => setQuickItemName(e.target.value)}
                  required
                  placeholder="e.g. Havells 5kW 3-Phase On-Grid Solar Inverter with WiFi"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0f4e56] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    value={quickItemHsn}
                    onChange={(e) => setQuickItemHsn(e.target.value)}
                    placeholder="e.g. 850440"
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-[#0f4e56] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit / UOM
                  </label>
                  <select
                    value={quickItemUnit}
                    onChange={(e) => setQuickItemUnit(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0f4e56] bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Sets">Sets</option>
                    <option value="Meters">Meters</option>
                    <option value="Watts">Watts</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Buy Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quickItemBuyRate}
                    onChange={(e) => setQuickItemBuyRate(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-[#0f4e56] bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Sell Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quickItemSellRate}
                    onChange={(e) => setQuickItemSellRate(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-[#0f4e56] bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={quickItemGst}
                    onChange={(e) => setQuickItemGst(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-[#0f4e56] bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddMasterModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0f4e56] hover:bg-[#005963] font-bold text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save to Master &amp; Add to PO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderTab;

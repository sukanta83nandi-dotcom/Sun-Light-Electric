import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Customer,
  InventoryItem,
  QuotationInvoice,
  DocumentLineItem,
  PaymentReceipt,
  PaymentRecord,
  Language,
  DocumentType,
  StockLogEntry,
  ProjectExpenses,
  ClientDocument,
  ClientDocumentCategory,
} from '../types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY,
  INITIAL_DOCUMENTS,
  INITIAL_STOCK_LOGS,
  INDIAN_STATES
} from '../data/mockData';
import { translations } from '../data/translations';

// Lazy-load heavy dependencies and secondary tabs for optimal performance & code splitting
const InventoryManager = lazy(() => import('./InventoryManager').then(m => ({ default: m.InventoryManager })));
const DocumentBuilder = lazy(() => import('./DocumentBuilder').then(m => ({ default: m.DocumentBuilder })));
const DashboardHome = lazy(() => import('./DashboardHome').then(m => ({ default: m.DashboardHome })));
const ProfitAnalysis = lazy(() => import('./ProfitAnalysis').then(m => ({ default: m.ProfitAnalysis })));
const PdfViewerModal = lazy(() => import('./PdfViewerModal').then(m => ({ default: m.PdfViewerModal })));
const RecordPaymentModal = lazy(() => import('./RecordPaymentModal').then(m => ({ default: m.RecordPaymentModal })));
const ReceiptViewerModal = lazy(() => import('./ReceiptViewerModal').then(m => ({ default: m.ReceiptViewerModal })));
const EditQuoteModal = lazy(() => import('./EditQuoteModal').then(m => ({ default: m.EditQuoteModal })));
const CancelQuoteModal = lazy(() => import('./CancelQuoteModal').then(m => ({ default: m.CancelQuoteModal })));
const SerialScannerModal = lazy(() => import('./SerialScannerModal').then(m => ({ default: m.SerialScannerModal })));
const SuppliersTab = lazy(() => import('./SuppliersTab').then(m => ({ default: m.SuppliersTab })));
const InwardChallansTab = lazy(() => import('./InwardChallansTab').then(m => ({ default: m.InwardChallansTab })));
const FinanceTab = lazy(() => import('./FinanceTab').then(m => ({ default: m.FinanceTab })));
const ReportsTab = lazy(() => import('./ReportsTab').then(m => ({ default: m.ReportsTab })));
const PurchaseOrderTab = lazy(() => import('./PurchaseOrderTab').then(m => ({ default: m.PurchaseOrderTab })));
const NonPoGrnTab = lazy(() => import('./NonPoGrnTab').then(m => ({ default: m.NonPoGrnTab })));
const EditInvoiceModal = lazy(() => import('./EditInvoiceModal').then(m => ({ default: m.EditInvoiceModal })));
const OwnerApprovalModal = lazy(() => import('./OwnerApprovalModal').then(m => ({ default: m.OwnerApprovalModal })));
const DeliveryChallanModal = lazy(() => import('./DeliveryChallanModal').then(m => ({ default: m.DeliveryChallanModal })));
const EWayBillModal = lazy(() => import('./EWayBillModal').then(m => ({ default: m.EWayBillModal })));
const CustomerDetailsModal = lazy(() => import('./CustomerDetailsModal').then(m => ({ default: m.CustomerDetailsModal })));
const DocumentViewerModal = lazy(() => import('./DocumentViewerModal').then(m => ({ default: m.DocumentViewerModal })));
import { KYC_DOCUMENT_CATEGORIES, formatFileSize } from './CustomerDetailsModal';
import { CompanyLogo } from './CompanyLogo';
import { Supplier } from '../types/supplier';
import { SupplierChallan, ChallanItem } from '../types/challan';
import { FinanceNote } from '../types/finance';
import { PurchaseOrder, POInwardLog, POStatus } from '../types/purchaseOrder';
import { NonPoGrnRecord, INITIAL_NON_PO_GRN_RECORDS } from '../types/nonPoGrn';
import { INITIAL_SUPPLIERS } from '../data/mockSuppliers';
import { INITIAL_CHALLANS } from '../data/mockChallans';
import { INITIAL_FINANCE_NOTES } from '../data/mockFinanceNotes';
import { INITIAL_PURCHASE_ORDERS } from '../data/mockPurchaseOrders';
import {
  Package,
  FileText,
  Users,
  Plus,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sun,
  Download,
  Building2,
  Truck,
  PhoneCall,
  Phone,
  MessageSquare,
  MessageCircle,
  MapPin,
  Tag,
  Search,
  X,
  FileCheck,
  Edit3,
  CreditCard,
  Receipt,
  DollarSign,
  History,
  FileSpreadsheet,
  Home,
  TrendingUp,
  UploadCloud,
  Scan,
  ChevronDown,
  Layers,
  Check,
  Trash2,
  QrCode,
  Landmark,
  FilePlus2,
  LayoutList,
  ShoppingBag,
  BarChart3,
  Boxes,
  Briefcase,
  FileCheck2,
  Image as ImageIcon,
  ReceiptText,
} from 'lucide-react';
import { downloadDocumentPdf } from '../utils/pdfGenerator';
import { getWhatsAppDeepLinks, sendPaymentDueReminderWhatsApp } from '../utils/whatsappHelper';
import { exportGSTSalesCSV, filterInvoicesByPeriod } from '../utils/gstReportHelper';
import { exportCustomersToExcel, importCustomersFromExcel } from '../utils/excelCustomerHelper';
import { exportQuotationsToExcel } from '../utils/quotationExportHelper';

interface DemoAppProps {
  lang: Language;
  activeTab?: 'dashboard' | 'inventory' | 'quotations' | 'invoices' | 'customers' | 'suppliers' | 'challans' | 'profit' | 'finance' | 'reports' | 'purchase_orders' | 'create_doc' | 'non_po_grn' | 'non-po-grn-report';
  setActiveTab?: (tab: 'dashboard' | 'inventory' | 'quotations' | 'invoices' | 'customers' | 'suppliers' | 'challans' | 'profit' | 'finance' | 'reports' | 'purchase_orders' | 'create_doc' | 'non_po_grn' | 'non-po-grn-report') => void;
}

export const DemoApp: React.FC<DemoAppProps> = ({
  lang,
  activeTab: activeTabProp,
  setActiveTab: setActiveTabProp,
}) => {
  const t = translations[lang];

  // Quick Direct Communication Action Handlers (Call, SMS, WhatsApp)
  const sanitizePhoneNumber = (phone: string) => phone.replace(/[^0-9]/g, '');

  const handleDirectCall = (phone: string) => {
    window.location.href = `tel:${sanitizePhoneNumber(phone)}`;
  };

  const handleDirectSMS = (phone: string, name: string) => {
    const cleanPhone = sanitizePhoneNumber(phone);
    const defaultText = encodeURIComponent(`Hello ${name}, regarding your solar project with Sun Light Electric...`);
    window.location.href = `sms:${cleanPhone}?body=${defaultText}`;
  };

  const handleDirectWhatsApp = (phone: string, name: string) => {
    const cleanPhone = sanitizePhoneNumber(phone);
    const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const message = encodeURIComponent(`Hello ${name}, greeting from Sun Light Electric (Haradhan Patra).`);
    window.open(`https://wa.me/${targetPhone}?text=${message}`, '_blank');
  };

  const [internalActiveTab, setInternalActiveTab] = useState<
    'dashboard' | 'inventory' | 'quotations' | 'invoices' | 'customers' | 'suppliers' | 'challans' | 'profit' | 'finance' | 'reports' | 'purchase_orders' | 'create_doc' | 'non_po_grn'
  >('dashboard');

  const activeTab = activeTabProp !== undefined ? activeTabProp : internalActiveTab;
  const setActiveTab = (
    tab: 'dashboard' | 'inventory' | 'quotations' | 'invoices' | 'customers' | 'suppliers' | 'challans' | 'profit' | 'finance' | 'reports' | 'purchase_orders' | 'create_doc' | 'non_po_grn' | 'non-po-grn-report'
  ) => {
    if (tab === 'non-po-grn-report') {
      setReportSubView('non_po_grn');
      if (setActiveTabProp) setActiveTabProp('reports');
      setInternalActiveTab('reports');
      return;
    }
    if (setActiveTabProp) setActiveTabProp(tab);
    setInternalActiveTab(tab);
  };

  // Operation Dropdown State (Enterprise ERP Navigation)
  const [isOperationDropdownOpen, setIsOperationDropdownOpen] = useState(false);
  const operationDropdownRef = React.useRef<HTMLDivElement>(null);
  const operationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const isOperationActive =
    activeTab === 'challans' || activeTab === 'non_po_grn' || activeTab === 'quotations' || activeTab === 'invoices';

  const handleOperationMouseEnter = () => {
    if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
    setIsOperationDropdownOpen(true);
  };

  const handleOperationMouseLeave = () => {
    operationTimeoutRef.current = setTimeout(() => {
      setIsOperationDropdownOpen(false);
    }, 200);
  };

  // Finance Dropdown State (Enterprise ERP Navigation)
  const [isFinanceDropdownOpen, setIsFinanceDropdownOpen] = useState(false);
  const financeDropdownRef = React.useRef<HTMLDivElement>(null);
  const financeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Active sub-view for Finance module:
  // 'debit_entry' | 'debit_dashboard' | 'credit_entry' | 'credit_dashboard'
  const [financeSubView, setFinanceSubView] = useState<
    'debit_entry' | 'debit_dashboard' | 'credit_entry' | 'credit_dashboard'
  >('debit_dashboard');

  const isFinanceActive = activeTab === 'finance';

  const handleFinanceMouseEnter = () => {
    if (financeTimeoutRef.current) clearTimeout(financeTimeoutRef.current);
    setIsFinanceDropdownOpen(true);
  };

  const handleFinanceMouseLeave = () => {
    financeTimeoutRef.current = setTimeout(() => {
      setIsFinanceDropdownOpen(false);
    }, 200);
  };

  // Report Dropdown State (Purchase, Invoice & Non PO GRN Reports)
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const reportDropdownRef = React.useRef<HTMLDivElement>(null);
  const reportTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Active sub-view for Reports module: 'purchase' | 'invoice' | 'non_po_grn'
  const [reportSubView, setReportSubView] = useState<'purchase' | 'invoice' | 'non_po_grn'>('purchase');

  const isReportActive = activeTab === 'reports' || (activeTab as any) === 'non-po-grn-report';

  const handleReportMouseEnter = () => {
    if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
    setIsReportDropdownOpen(true);
  };

  const handleReportMouseLeave = () => {
    reportTimeoutRef.current = setTimeout(() => {
      setIsReportDropdownOpen(false);
    }, 200);
  };

  // BackOffice Dropdown State (Inventory, Customers, Suppliers)
  const [isBackOfficeDropdownOpen, setIsBackOfficeDropdownOpen] = useState(false);
  const backOfficeDropdownRef = React.useRef<HTMLDivElement>(null);
  const backOfficeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const isBackOfficeActive =
    activeTab === 'inventory' || activeTab === 'customers' || activeTab === 'suppliers';

  const handleBackOfficeMouseEnter = () => {
    if (backOfficeTimeoutRef.current) clearTimeout(backOfficeTimeoutRef.current);
    setIsBackOfficeDropdownOpen(true);
  };

  const handleBackOfficeMouseLeave = () => {
    backOfficeTimeoutRef.current = setTimeout(() => {
      setIsBackOfficeDropdownOpen(false);
    }, 200);
  };

  // Purchase Order Dropdown State (Enterprise ERP Navigation)
  const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
  const poDropdownRef = React.useRef<HTMLDivElement>(null);
  const poTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [poSubView, setPoSubView] = useState<'create_po' | 'search_po'>('search_po');

  const isPoActive = activeTab === 'purchase_orders';

  const handlePoMouseEnter = () => {
    if (poTimeoutRef.current) clearTimeout(poTimeoutRef.current);
    setIsPoDropdownOpen(true);
  };

  const handlePoMouseLeave = () => {
    poTimeoutRef.current = setTimeout(() => {
      setIsPoDropdownOpen(false);
    }, 200);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        operationDropdownRef.current &&
        !operationDropdownRef.current.contains(e.target as Node)
      ) {
        setIsOperationDropdownOpen(false);
      }
      if (
        poDropdownRef.current &&
        !poDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPoDropdownOpen(false);
      }
      if (
        backOfficeDropdownRef.current &&
        !backOfficeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsBackOfficeDropdownOpen(false);
      }
      if (
        financeDropdownRef.current &&
        !financeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFinanceDropdownOpen(false);
      }
      if (
        reportDropdownRef.current &&
        !reportDropdownRef.current.contains(e.target as Node)
      ) {
        setIsReportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (operationTimeoutRef.current) clearTimeout(operationTimeoutRef.current);
      if (poTimeoutRef.current) clearTimeout(poTimeoutRef.current);
      if (backOfficeTimeoutRef.current) clearTimeout(backOfficeTimeoutRef.current);
      if (financeTimeoutRef.current) clearTimeout(financeTimeoutRef.current);
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
    };
  }, []);

  const handleUpdateInvoiceExpenses = (invoiceId: string, expenses: ProjectExpenses) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === invoiceId ? { ...doc, expenses } : doc
      )
    );
  };
  // One-time auto purge of legacy demo data from browser localStorage
  useEffect(() => {
    const PURGE_FLAG = 'sle_demo_data_purged_v5';
    if (typeof window !== 'undefined' && localStorage.getItem(PURGE_FLAG) !== 'true') {
      localStorage.removeItem('sle_inventory');
      localStorage.removeItem('sle_customers');
      localStorage.removeItem('sle_suppliers');
      localStorage.removeItem('sle_challans');
      localStorage.removeItem('sle_documents');
      localStorage.removeItem('sle_stock_logs');
      localStorage.removeItem('sle_finance_notes');
      localStorage.removeItem('sle_purchase_orders');
      localStorage.removeItem('sle_non_po_grn_records');
      localStorage.setItem(PURGE_FLAG, 'true');
      setInventory([]);
      setCustomers([]);
      setSuppliers([]);
      setChallans([]);
      setDocuments([]);
      setStockLogs([]);
      setFinanceNotes([]);
      setPurchaseOrders([]);
      setNonPoGrnRecords([]);
    }
  }, []);

  const handleClearAllData = () => {
    if (
      window.confirm(
        'Are you sure you want to delete all transaction and master data? This will clear all inventory items, customers, suppliers, GRN challans, quotations, tax invoices, purchase orders, finance notes, and expense records.'
      )
    ) {
      setInventory([]);
      setCustomers([]);
      setSuppliers([]);
      setChallans([]);
      setDocuments([]);
      setStockLogs([]);
      setFinanceNotes([]);
      setPurchaseOrders([]);
      setNonPoGrnRecords([]);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('sle_inventory');
        localStorage.removeItem('sle_customers');
        localStorage.removeItem('sle_suppliers');
        localStorage.removeItem('sle_challans');
        localStorage.removeItem('sle_documents');
        localStorage.removeItem('sle_stock_logs');
        localStorage.removeItem('sle_finance_notes');
        localStorage.removeItem('sle_purchase_orders');
        localStorage.removeItem('sle_non_po_grn_records');
        localStorage.setItem('sle_demo_data_purged_v5', 'true');
      }
      alert('All demo and transaction data has been permanently cleared.');
    }
  };

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_inventory');
    if (!saved) return INITIAL_INVENTORY;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_INVENTORY;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_customers');
    if (!saved) return INITIAL_CUSTOMERS;
    try {
      const parsed: Customer[] = JSON.parse(saved);
      return parsed.map((c) => ({ ...c, status: c.status || 'active' }));
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_suppliers');
    if (!saved) return INITIAL_SUPPLIERS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_SUPPLIERS;
    }
  });

  const [challans, setChallans] = useState<SupplierChallan[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_challans');
    if (!saved) return INITIAL_CHALLANS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_CHALLANS;
    }
  });

  const [documents, setDocuments] = useState<QuotationInvoice[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_documents');
    if (!saved) return INITIAL_DOCUMENTS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_DOCUMENTS;
    }
  });

  const [stockLogs, setStockLogs] = useState<StockLogEntry[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_stock_logs');
    return saved ? JSON.parse(saved) : INITIAL_STOCK_LOGS;
  });

  const [financeNotes, setFinanceNotes] = useState<FinanceNote[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_finance_notes');
    if (!saved) return INITIAL_FINANCE_NOTES;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_FINANCE_NOTES;
    }
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_purchase_orders');
    if (!saved) return INITIAL_PURCHASE_ORDERS;
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_PURCHASE_ORDERS;
    }
  });

  const [nonPoGrnRecords, setNonPoGrnRecords] = useState<NonPoGrnRecord[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sle_demo_data_purged_v5') !== 'true') {
      return [];
    }
    const saved = localStorage.getItem('sle_non_po_grn_records');
    if (!saved) return INITIAL_NON_PO_GRN_RECORDS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_NON_PO_GRN_RECORDS;
    } catch {
      return INITIAL_NON_PO_GRN_RECORDS;
    }
  });

  const [nonPoGrnSubView, setNonPoGrnSubView] = useState<'search' | 'entry'>('search');

  useEffect(() => {
    localStorage.setItem('sle_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('sle_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('sle_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('sle_challans', JSON.stringify(challans));
  }, [challans]);

  useEffect(() => {
    localStorage.setItem('sle_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('sle_stock_logs', JSON.stringify(stockLogs));
  }, [stockLogs]);

  useEffect(() => {
    localStorage.setItem('sle_finance_notes', JSON.stringify(financeNotes));
  }, [financeNotes]);

  useEffect(() => {
    localStorage.setItem('sle_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem('sle_non_po_grn_records', JSON.stringify(nonPoGrnRecords));
  }, [nonPoGrnRecords]);

  // Dedicated Save Handler for Non PO GRN (Pure Administrative Expense, strictly isolated from inventory)
  const handleSaveNonPoGrnRecord = (newRec: NonPoGrnRecord) => {
    setNonPoGrnRecords((prev) => [newRec, ...prev]);
  };

  // Direct Inward Stock Logger for Challans / GRN
  const handleAddStockLogInward = (
    itemCode: string,
    quantity: number,
    docNo: string,
    supplierName: string,
    remarks: string
  ) => {
    const existing = inventory.find((i) => i.code === itemCode);
    const prevStock = existing ? (existing.currentStock ?? existing.stockLevel ?? 0) : 0;
    const newEntry: StockLogEntry = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemCode,
      date: new Date().toISOString().split('T')[0],
      type: 'INWARD',
      quantity,
      balanceAfter: prevStock + quantity,
      referenceDocType: 'PURCHASE_RECEIPT',
      referenceDocNo: docNo,
      partyName: supplierName,
      remarks,
      recordedBy: 'Haradhan Patra',
    };
    setStockLogs((prev) => [newEntry, ...prev]);
  };

  const handleAddStockLog = (newEntry: Omit<StockLogEntry, 'id'>) => {
    const log: StockLogEntry = {
      ...newEntry,
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    setStockLogs((prev) => [log, ...prev]);
  };

  const handleSavePO = (po: PurchaseOrder) => {
    setPurchaseOrders((prev) => {
      const idx = prev.findIndex((p) => p.id === po.id || p.poNumber === po.poNumber);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = po;
        return copy;
      }
      return [po, ...prev];
    });
  };

  const handleInwardPO = (
    poId: string,
    itemInwards: { itemId: string; inwardQty: number; inwardRate?: number; serialNumbers?: string[] }[],
    grnMetadata: {
      challanInvoiceNo: string;
      challanDate: string;
      eWayBillNo?: string;
      vehicleNo?: string;
      receivedBy: string;
      notes?: string;
    }
  ) => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    if (!targetPO) return;

    const grnNo = `GRN-${Date.now().toString().slice(-6)}`;
    const newLogs: POInwardLog[] = [];

    // Support both targetPO.items and targetPO.lineItems
    const rawItems: any[] = targetPO.items || (targetPO as any).lineItems || [];

    // Update PO line items
    const updatedLineItems = rawItems.map((item) => {
      const inwardItem = itemInwards.find((inw) => inw.itemId === item.id);
      if (inwardItem && inwardItem.inwardQty > 0) {
        const addedQty = inwardItem.inwardQty;
        const newCumulative = (item.inwardedQty || 0) + addedQty;
        const itemSerials = inwardItem.serialNumbers || [];
        const serialRemarks = itemSerials.length > 0 ? ` [S/N: ${itemSerials.join(', ')}]` : '';

        newLogs.push({
          id: `INW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          grnNo,
          date: grnMetadata.challanDate || new Date().toISOString().split('T')[0],
          itemId: item.id,
          itemDescription: item.description,
          quantity: addedQty,
          receivedBy: grnMetadata.receivedBy || 'Haradhan Patra',
          supplierInvoiceNo: grnMetadata.challanInvoiceNo,
          notes: grnMetadata.notes,
          serialNumbers: itemSerials,
        });

        // Add inward stock ledger entry (Single source of truth)
        const existingInv = inventory.find((i) => i.code === item.itemCode);
        const prevBal = existingInv ? (existingInv.currentStock ?? existingInv.stockLevel ?? 0) : 0;
        handleAddStockLog({
          itemCode: item.itemCode,
          date: grnMetadata.challanDate || new Date().toISOString().split('T')[0],
          type: 'INWARD_GRN',
          quantity: addedQty,
          balanceAfter: prevBal + addedQty,
          referenceDocType: 'INWARD_GRN',
          referenceDocNo: grnNo,
          partyName: targetPO.supplierName,
          remarks: `PO Inward GRN (${targetPO.poNumber}) - ${grnMetadata.notes || 'Received & Inwarded to Store'}${serialRemarks}`,
          recordedBy: grnMetadata.receivedBy || 'Haradhan Patra',
        });

        // Update inventory item current stock & append verified serial numbers
        setInventory((prevInv) =>
          prevInv.map((inv) =>
            inv.code === item.itemCode
              ? {
                  ...inv,
                  currentStock: (inv.currentStock ?? inv.stockLevel ?? 0) + addedQty,
                  stockLevel: (inv.stockLevel ?? 0) + addedQty,
                  availableSerialNumbers: [
                    ...(inv.availableSerialNumbers || []),
                    ...itemSerials,
                  ],
                }
              : inv
          )
        );

        return {
          ...item,
          inwardedQty: newCumulative,
        };
      }
      return item;
    });

    // Check status
    const allFullyInwarded = updatedLineItems.every((it) => (it.inwardedQty || 0) >= it.quantity);
    const anyInwarded = updatedLineItems.some((it) => (it.inwardedQty || 0) > 0);
    const nextStatus: POStatus = allFullyInwarded
      ? 'Fully Inwarded'
      : anyInwarded
      ? 'Partially Inwarded'
      : 'Open';

    const updatedPO: PurchaseOrder = {
      ...targetPO,
      items: updatedLineItems,
      lineItems: updatedLineItems,
      inwardLogs: [...(targetPO.inwardLogs || []), ...newLogs],
      status: nextStatus,
    };

    setPurchaseOrders((prev) => prev.map((p) => (p.id === poId ? updatedPO : p)));

    // Create a SupplierChallan entry in `challans` using Recv Qty × Recv Rate
    const challanItems: ChallanItem[] = [];
    let challanTaxable = 0;
    let challanTax = 0;

    itemInwards.forEach((inw) => {
      if (inw.inwardQty <= 0) return;
      const poItem = rawItems.find((it) => it.id === inw.itemId);
      if (!poItem) return;

      const effectiveRate =
        inw.inwardRate !== undefined && inw.inwardRate > 0 ? inw.inwardRate : poItem.unitRate;
      const lineTaxable = effectiveRate * inw.inwardQty;
      const lineTax = (lineTaxable * (poItem.taxRatePercent || 0)) / 100;

      challanTaxable += lineTaxable;
      challanTax += lineTax;

      challanItems.push({
        id: `CI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        itemDescription: poItem.description,
        hsnCode: poItem.hsnCode,
        category: targetPO.groupName,
        quantity: inw.inwardQty,
        unit: poItem.unit,
        unitPrice: effectiveRate,
        taxRate: poItem.taxRatePercent,
        totalTaxableAmount: lineTaxable,
        cgstAmount: lineTax / 2,
        sgstAmount: lineTax / 2,
        totalWithTax: lineTaxable + lineTax,
        matchingSkuCode: poItem.itemCode,
      });
    });

    if (challanItems.length > 0) {
      const newChallan: SupplierChallan = {
        id: `CHAL-${Date.now()}`,
        challanCode: grnNo,
        supplierId: targetPO.supplierId,
        supplierName: targetPO.supplierName,
        supplierGstin: targetPO.supplierGstin || '',
        challanInvoiceNo: grnMetadata.challanInvoiceNo || targetPO.poNumber,
        challanDate: grnMetadata.challanDate || new Date().toISOString().split('T')[0],
        eWayBillNo: grnMetadata.eWayBillNo,
        vehicleNo: grnMetadata.vehicleNo,
        dispatchFrom: targetPO.dispatchThrough || 'Supplier Facility',
        destinationSite: targetPO.dispatchTo || 'SOALUK, Pursurah, Hooghly',
        items: challanItems,
        totalTaxable: challanTaxable,
        totalTax: challanTax,
        grandTotal: challanTaxable + challanTax,
        status: 'Verified & Stock Inwarded',
        directInflowApplied: true,
        receivedBy: grnMetadata.receivedBy || 'Haradhan Patra',
        notes: `Inwarded from PO ${targetPO.poNumber}. ${grnMetadata.notes || ''}`.trim(),
        createdAt: new Date().toISOString(),
      };

      setChallans((prev) => [newChallan, ...prev]);
    }
  };

  // Active Document for PDF Modal
  const [previewDoc, setPreviewDoc] = useState<QuotationInvoice | null>(null);
  const [createDocType, setCreateDocType] = useState<DocumentType>('Quotation');
  const [builderInitialDoc, setBuilderInitialDoc] = useState<QuotationInvoice | null>(null);

  // Solar Quotations Edit & Status Management State
  const [editingQuoteDoc, setEditingQuoteDoc] = useState<QuotationInvoice | null>(null);
  const [cancellingQuoteDoc, setCancellingQuoteDoc] = useState<QuotationInvoice | null>(null);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'All' | 'Draft' | 'Pending' | 'Approved' | 'Cancelled' | 'Expired'>('All');

  const handleSaveEditedQuote = (updatedQuote: QuotationInvoice) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updatedQuote.id ? updatedQuote : d))
    );
    setEditingQuoteDoc(null);
  };

  const handleQuickUpdateQuoteStatus = (docId: string, newStatus: string) => {
    if (newStatus === 'Cancelled') {
      const target = documents.find((d) => d.id === docId);
      if (target) setCancellingQuoteDoc(target);
      return;
    }
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: newStatus as any } : d))
    );
  };

  const handleConfirmCancelQuote = (reason: string) => {
    if (!cancellingQuoteDoc) return;
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === cancellingQuoteDoc.id
          ? { ...d, status: 'Cancelled', cancellationReason: reason }
          : d
      )
    );
    setCancellingQuoteDoc(null);
  };

  // Invoice Edit & Document Deletion State (Owner Authorization Protected)
  const [editingInvoiceDoc, setEditingInvoiceDoc] = useState<QuotationInvoice | null>(null);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<QuotationInvoice | null>(null);

  // Delivery Challan & e-Way Bill Modal State
  const [deliveryChallanDoc, setDeliveryChallanDoc] = useState<QuotationInvoice | null>(null);
  const [ewayBillDoc, setEwayBillDoc] = useState<QuotationInvoice | null>(null);

  const handleSaveEditedInvoice = (updatedInvoice: QuotationInvoice) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updatedInvoice.id ? updatedInvoice : d))
    );
    setEditingInvoiceDoc(null);
    alert(`Tax Invoice ${updatedInvoice.documentNumber} successfully updated.`);
  };

  const handleDeleteDocument = (doc: QuotationInvoice) => {
    if (doc.type === 'Invoice') {
      // 1. Revert inventory stock levels & restore assigned serial numbers
      setInventory((prev) =>
        prev.map((item) => {
          const line = doc.items.find((li) => li.itemId === item.id || li.itemCode === item.code);
          if (line) {
            const serialsToRestore = line.serialNumbers || [];
            const existingSerials = new Set(item.availableSerialNumbers || []);
            const mergedSerials = [...(item.availableSerialNumbers || [])];
            serialsToRestore.forEach((sn) => {
              if (!existingSerials.has(sn)) {
                mergedSerials.push(sn);
              }
            });
            const restoredStock = item.stockLevel + line.quantity;
            return {
              ...item,
              stockLevel: restoredStock,
              currentStock: restoredStock,
              availableSerialNumbers: mergedSerials,
            };
          }
          return item;
        })
      );

      // 2. Audit inward stock log for restored stock
      doc.items.forEach((line) => {
        handleAddStockLog({
          itemCode: line.itemCode,
          date: new Date().toISOString().split('T')[0],
          type: 'INWARD',
          quantity: line.quantity,
          balanceAfter: 0,
          referenceDocType: 'MANUAL_CORRECTION',
          referenceDocNo: doc.documentNumber,
          partyName: doc.customerName,
          remarks: `Stock returned on authorized deletion of Tax Invoice ${doc.documentNumber}`,
          recordedBy: 'Haradhan Patra (Owner Approved)',
        });
      });
    }

    // Remove document from documents state
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    setDeleteTargetDoc(null);
    alert(`${doc.type} ${doc.documentNumber} permanently deleted with owner authorization.`);
  };

  // Payment Tracking & GST Report State
  const [recordingPaymentDoc, setRecordingPaymentDoc] = useState<QuotationInvoice | null>(null);
  const [viewingReceiptData, setViewingReceiptData] = useState<{
    receipt: PaymentRecord;
    invoice: QuotationInvoice;
  } | null>(null);
  const [showReceiptsListForDoc, setShowReceiptsListForDoc] = useState<QuotationInvoice | null>(null);
  const [selectedGstPeriod, setSelectedGstPeriod] = useState<string>('2026-09');
  const [gstStartDate, setGstStartDate] = useState<string>('2026-09-01');
  const [gstEndDate, setGstEndDate] = useState<string>('2026-09-30');

  const getFilteredGstInvoices = () => {
    return filterInvoicesByPeriod(invoices, selectedGstPeriod, gstStartDate, gstEndDate);
  };

  const getActiveDateRangeLabel = () => {
    if (selectedGstPeriod === '2026-09') return '01-Sep-2026 to 30-Sep-2026';
    if (selectedGstPeriod === '2026-08') return '01-Aug-2026 to 31-Aug-2026';
    if (selectedGstPeriod === 'FY-2026') return '01-Apr-2026 to 31-Mar-2027';
    if (selectedGstPeriod === 'custom') {
      const s = gstStartDate || 'Start';
      const e = gstEndDate || 'End';
      return `${s} to ${e}`;
    }
    return 'Full Invoice History';
  };

  const handleExportGstReport = () => {
    const periodFiltered = getFilteredGstInvoices();
    const periodLabelMap: Record<string, string> = {
      'all': 'All_Time',
      '2026-09': 'Sep_2026',
      '2026-08': 'Aug_2026',
      'FY-2026': 'FY2026_27',
      'custom': `Custom_${gstStartDate}_to_${gstEndDate}`,
    };
    const label = periodLabelMap[selectedGstPeriod] || selectedGstPeriod;
    exportGSTSalesCSV(periodFiltered, label);
  };

  const handleSavePayment = (newRecord: PaymentReceipt) => {
    if (!recordingPaymentDoc) return;

    setDocuments((prevDocs) =>
      prevDocs.map((doc) => {
        if (doc.id !== recordingPaymentDoc.id) return doc;

        const updatedPayments = [...(doc.payments || []), newRecord];
        const newTotalPaid = updatedPayments.reduce(
          (acc, p) => acc + (p.amount ?? p.amountPaid ?? 0),
          0
        );
        const newDue = Math.max(0, doc.grandTotal - newTotalPaid);
        const newPaymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid' =
          newDue === 0 ? 'Fully Paid' : newTotalPaid > 0 ? 'Partially Paid' : 'Unpaid';

        const updatedDoc: QuotationInvoice = {
          ...doc,
          payments: updatedPayments,
          totalPaid: newTotalPaid,
          dueAmount: newDue,
          paymentStatus: newPaymentStatus,
          status: newPaymentStatus === 'Fully Paid' ? 'Paid' : doc.status,
        };

        // Automatically display newly created Money Receipt
        setViewingReceiptData({
          receipt: newRecord,
          invoice: updatedDoc,
        });

        return updatedDoc;
      })
    );

    setRecordingPaymentDoc(null);
  };

  // Conversion logic: Quotation -> Tax Invoice
  const handleConvertQuotationToInvoice = (quotation: QuotationInvoice) => {
    // 1. Mark original quotation status as 'Approved'
    setDocuments((prev) =>
      prev.map((d) => (d.id === quotation.id ? { ...d, status: 'Approved' } : d))
    );

    // 2. Map line items with live inventory stock level
    const updatedItems = quotation.items.map((item) => {
      const inv = inventory.find((i) => i.id === item.itemId || i.code === item.itemCode);
      const liveStock = inv ? inv.stockLevel : (item.stockQty ?? 0);
      return {
        ...item,
        stockQty: liveStock,
        quantity: item.quantity || 1,
        amount: (item.quantity || 1) * (item.unitRate || 0),
      };
    });

    // 3. Generate Tax Invoice data with reference quotation number
    const randNum = Math.floor(100 + Math.random() * 900);
    const convertedDoc: QuotationInvoice = {
      ...quotation,
      id: `CONV-${Date.now()}`,
      type: 'Invoice',
      documentNumber: `SLE/INV/2026/${randNum}`,
      referenceQuotationNo: quotation.documentNumber,
      date: new Date().toISOString().split('T')[0],
      validUntilOrDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: updatedItems,
      status: 'Draft',
    };

    setBuilderInitialDoc(convertedDoc);
    setCreateDocType('Invoice');
    if (previewDoc) setPreviewDoc(null);
    setActiveTab('create_doc');
  };

  // Customer Directory Search & Filter State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<'All' | 'Domestic' | 'Commercial'>('All');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Customer Bulk Excel Import & Export
  const customerFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCustomerExcelExport = () => {
    exportCustomersToExcel(customers);
  };

  const handleCustomerExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importCustomersFromExcel(file, customers);
      setCustomers(result.updatedCustomers);

      let msg = `Bulk Customer Excel Import Complete:\n• Total Parsed: ${result.totalParsed}\n• New Customers Added: ${result.addedCount}\n• Existing Customers Updated: ${result.updatedCount}`;
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

  // Serial Scanner Modal State
  const [serialScannerInvoice, setSerialScannerInvoice] = useState<QuotationInvoice | null>(null);

  const handleSaveSerialNumbers = (invoiceId: string, updatedItems: DocumentLineItem[]) => {
    setDocuments((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              items: updatedItems,
            }
          : inv
      )
    );

    // Also deduct any assigned serial numbers from inventory availableSerialNumbers
    setInventory((prev) =>
      prev.map((item) => {
        const line = updatedItems.find((li) => li.itemId === item.id || li.itemCode === item.code);
        if (line && line.serialNumbers && line.serialNumbers.length > 0 && item.availableSerialNumbers) {
          const used = new Set(line.serialNumbers);
          return {
            ...item,
            availableSerialNumbers: item.availableSerialNumbers.filter((sn) => !used.has(sn)),
          };
        }
        return item;
      })
    );
  };

  // New Customer Form Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custState, setCustState] = useState('West Bengal');
  const [custStateCode, setCustStateCode] = useState('19');
  const [custPinCode, setCustPinCode] = useState('713101');
  const [custCategory, setCustCategory] = useState<'Domestic' | 'Commercial'>('Domestic');
  const [custGstin, setCustGstin] = useState('');
  const [custStatus, setCustStatus] = useState<'active' | 'inactive'>('active');

  // Customer KYC & Supporting Documents Upload State (Add Customer Modal)
  const [custDocuments, setCustDocuments] = useState<ClientDocument[]>([]);
  const [custDocCategory, setCustDocCategory] = useState<ClientDocumentCategory>(
    'Electricity Bill (Discom Consumer Copy)'
  );
  const [custDocUploadError, setCustDocUploadError] = useState<string | null>(null);
  const [isCustDocDragging, setIsCustDocDragging] = useState(false);
  const [custDocValidationError, setCustDocValidationError] = useState<boolean>(false);
  const [showCustDocWarningModal, setShowCustDocWarningModal] = useState<boolean>(false);
  const [custShakeKey, setCustShakeKey] = useState<number>(0);
  const custDocFileInputRef = React.useRef<HTMLInputElement>(null);
  const custDocSectionRef = React.useRef<HTMLDivElement>(null);

  // Customer Details & KYC Document Vault Modal
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<Customer | null>(null);

  // Standalone Document Viewer Modal
  const [viewingClientDoc, setViewingClientDoc] = useState<ClientDocument | null>(null);

  const handleCustFiles = (files: FileList | File[]) => {
    setCustDocUploadError(null);
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit

    Array.from(files).forEach((file) => {
      if (file.size > maxSizeBytes) {
        setCustDocUploadError(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }

      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
        setCustDocUploadError(`File "${file.name}" is not a supported format (PDF, JPG, PNG).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const doc: ClientDocument = {
          id: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          category: custDocCategory,
          name: file.name,
          size: formatFileSize(file.size),
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString().split('T')[0],
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        };

        setCustDocuments((prev) => [...prev, doc]);
        setCustDocValidationError(false);
        setShowCustDocWarningModal(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveCustDoc = (id: string) => {
    setCustDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateCustomerProfile = (updatedCust: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
    setSelectedCustomerForDetails(updatedCust);
  };

  // Quotations & Invoices Live Search State
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  const rawQuotations = documents.filter((d) => d.type === 'Quotation');
  const quotations = rawQuotations.filter((d) => {
    if (!quoteSearchQuery.trim()) return true;
    const q = quoteSearchQuery.toLowerCase();
    return (
      d.documentNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      (d.customerPhone && d.customerPhone.toLowerCase().includes(q)) ||
      (d.systemCapacityKw && d.systemCapacityKw.toString().includes(q))
    );
  });

  const filteredQuotations = quotations.filter((q) => {
    if (quoteStatusFilter === 'All') return true;
    if (quoteStatusFilter === 'Pending') return q.status === 'Pending' || q.status === 'Sent';
    return q.status === quoteStatusFilter;
  });

  const rawInvoices = documents.filter((d) => d.type === 'Invoice');
  const invoices = rawInvoices.filter((d) => {
    if (!invoiceSearchQuery.trim()) return true;
    const q = invoiceSearchQuery.toLowerCase();
    return (
      d.documentNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      (d.customerPhone && d.customerPhone.toLowerCase().includes(q)) ||
      (d.systemCapacityKw && d.systemCapacityKw.toString().includes(q))
    );
  });

  const toggleCustomerStatus = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'inactive' ? 'active' : 'inactive' } : c
      )
    );
  };

  const handleSaveDocument = (newDoc: QuotationInvoice) => {
    // Upsert into documents
    setDocuments((prev) => {
      const existsIndex = prev.findIndex((d) => d.id === newDoc.id);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = newDoc;
        return copy;
      }
      return [newDoc, ...prev];
    });

    // When invoice is finalized/saved ("Save & Print" or "Create Invoice"), automatically deduct used serial numbers & decrease stock
    if (newDoc.type === 'Invoice') {
      setInventory((prev) =>
        prev.map((item) => {
          const line = newDoc.items.find((li) => li.itemId === item.id || li.itemCode === item.code);
          if (line) {
            const usedSerials = new Set(line.serialNumbers || []);
            const updatedAvailable = (item.availableSerialNumbers || []).filter(
              (sn) => !usedSerials.has(sn)
            );
            const newStock = Math.max(0, item.stockLevel - line.quantity);
            return {
              ...item,
              stockLevel: newStock,
              currentStock: newStock,
              availableSerialNumbers: updatedAvailable,
            };
          }
          return item;
        })
      );

      // Record outward stock audit log
      newDoc.items.forEach((line) => {
        const serialsText =
          line.serialNumbers && line.serialNumbers.length > 0
            ? ` [S/N: ${line.serialNumbers.join(', ')}]`
            : '';
        const currentItem = inventory.find((i) => i.id === line.itemId || i.code === line.itemCode);
        const currentBal = currentItem ? (currentItem.currentStock ?? currentItem.stockLevel ?? 0) : 0;
        handleAddStockLog({
          itemCode: line.itemCode,
          date: newDoc.date || new Date().toISOString().split('T')[0],
          type: 'OUTWARD_INVOICE',
          quantity: line.quantity,
          balanceAfter: Math.max(0, currentBal - line.quantity),
          referenceDocType: 'OUTWARD_INVOICE',
          referenceDocNo: newDoc.documentNumber,
          partyName: newDoc.customerName,
          remarks: `Issued for Tax Invoice ${newDoc.documentNumber}${serialsText}`,
          recordedBy: 'Haradhan Patra',
        });
      });
    }

    setPreviewDoc(newDoc);
    setActiveTab(newDoc.type === 'Quotation' ? 'quotations' : 'invoices');
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = INDIAN_STATES.find((s) => s.stateCode === e.target.value);
    if (selected) {
      setCustState(selected.state);
      setCustStateCode(selected.stateCode);
    }
  };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !custAddress || !custPinCode) return;

    // Strictly mandatory supporting document validation
    if (!custDocuments || custDocuments.length === 0) {
      setCustDocValidationError(true);
      setCustShakeKey((prev) => prev + 1);
      setShowCustDocWarningModal(true);
      custDocSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const newC: Customer = {
      id: `CUST-${Math.floor(100 + Math.random() * 900)}`,
      name: custName,
      phone: custPhone,
      address: custAddress,
      state: custState,
      stateCode: custStateCode,
      pinCode: custPinCode,
      pincode: custPinCode,
      category: custCategory,
      gstin: custGstin,
      status: custStatus,
      documents: custDocuments,
    };

    setCustomers((prev) => [newC, ...prev]);
    setShowAddCustomerModal(false);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustState('West Bengal');
    setCustStateCode('19');
    setCustPinCode('713101');
    setCustGstin('');
    setCustStatus('active');
    setCustDocuments([]);
    setCustDocUploadError(null);
    setCustDocValidationError(false);
    setShowCustDocWarningModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Official Business Credentials Header Card */}
      <div className="bg-gradient-to-r from-sky-300/90 via-sky-200 to-sky-300/90 dark:from-sky-900 dark:via-slate-900 dark:to-sky-900 text-slate-900 dark:text-slate-100 rounded-2xl md:rounded-3xl p-6 border border-sky-400 dark:border-sky-700/80 shadow-md shadow-sky-500/15 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="flex items-center space-x-5">
          <div className="flex items-center shrink-0">
            <CompanyLogo className="h-16 sm:h-20 w-auto shadow-md rounded-2xl shrink-0" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-sky-950 dark:text-sky-100 tracking-tight">SUN LIGHT ELECTRIC</h1>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                Domestic &amp; Commercial Solar Solutions
              </span>
            </div>
            <p className="text-xs text-sky-900 dark:text-sky-200 font-semibold mt-1 flex items-center gap-1.5">
              <span>SOALUK, PURSURAH, HOOGHLY, WEST BENGAL, 712410</span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sky-900 dark:text-sky-200 mt-2 font-mono">
              <div>Phone: <strong className="text-sky-950 dark:text-sky-100 font-extrabold">+91 7908798079</strong></div>
              <div>Email: <strong className="text-sky-950 dark:text-sky-100 font-extrabold">sunlightelectric.1984@gmail.com</strong></div>
            </div>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-sky-950/90 p-3.5 rounded-xl border border-sky-300 dark:border-sky-700/80 text-xs space-y-1 font-mono shrink-0 shadow-2xs text-sky-950 dark:text-sky-100 flex flex-col justify-between">
          <div>
            <div className="text-amber-800 dark:text-amber-400 font-extrabold uppercase text-[10px] tracking-wider">Tax &amp; Legal Credentials</div>
            <div>GSTIN: <strong className="text-sky-950 dark:text-white font-extrabold">19AZEPP1218L1Z5</strong></div>
            <div>PAN: <strong className="text-sky-950 dark:text-white font-extrabold">AZEPP1218L</strong> | State Code: <strong className="text-sky-950 dark:text-white font-extrabold">WB 19</strong></div>
            <div>Owner: <strong className="text-sky-950 dark:text-white font-extrabold">Haradhan Patra</strong></div>
          </div>
          <button
            type="button"
            onClick={handleClearAllData}
            className="mt-2 text-[10px] text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-700 border border-rose-300 dark:border-rose-800 px-2 py-1 rounded-md transition-colors font-sans font-bold flex items-center gap-1 cursor-pointer w-fit"
            title="Wipe all demo or test data and reset to fresh empty registers"
          >
            <Trash2 className="w-3 h-3 text-rose-500" />
            <span>Reset / Clear All Data</span>
          </button>
        </div>
      </div>



      {/* Main Tabs Navigation */}
      <div className="w-full bg-gradient-to-r from-sky-100 via-sky-50 to-sky-100 dark:from-sky-950/70 dark:via-slate-900 dark:to-sky-950/70 border border-sky-300 dark:border-sky-800/80 rounded-2xl md:rounded-3xl p-2 md:p-2.5 shadow-md shadow-sky-500/10 flex items-center justify-between gap-2 transition-all">
        <div className="flex flex-wrap gap-1.5 w-full">
          {/* 1. Dashboard Tab - Amber / Solar Gold */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-extrabold shadow-[0_6px_0_#b45309,0_10px_15px_rgba(245,158,11,0.35)] border border-amber-300/80 active:translate-y-1 active:shadow-[0_2px_0_#b45309]'
                : 'bg-white/80 dark:bg-slate-800/80 text-sky-900 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800/60 hover:text-sky-950 hover:bg-sky-200/70 dark:hover:bg-sky-900/60 font-semibold hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>🏠 {t.tabDashboard}</span>
          </button>

          {/* 2. Operation Dropdown Menu (Classic ERP Navigation) */}
          <div
            ref={operationDropdownRef}
            onMouseEnter={handleOperationMouseEnter}
            onMouseLeave={handleOperationMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setIsOperationDropdownOpen((prev) => !prev)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out cursor-pointer select-none ${
                isOperationActive
                  ? 'bg-gradient-to-b from-blue-500 to-indigo-600 text-white font-extrabold shadow-[0_6px_0_#1d4ed8,0_10px_15px_rgba(59,130,246,0.35)] border border-blue-400/80 active:translate-y-1 active:shadow-[0_2px_0_#1d4ed8]'
                  : 'bg-white/80 dark:bg-slate-800/80 text-sky-900 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800/60 hover:text-sky-950 hover:bg-sky-200/70 dark:hover:bg-sky-900/60 font-semibold hover:-translate-y-0.5 hover:shadow-md'
              }`}
              aria-haspopup="true"
              aria-expanded={isOperationDropdownOpen}
            >
              <Layers className="w-4 h-4 text-blue-200" />
              <span>Operation</span>
              {isOperationActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono font-bold tracking-tight">
                  {activeTab === 'challans' ? 'GRN' : activeTab === 'non_po_grn' ? 'Non PO GRN' : activeTab === 'quotations' ? 'Quotation' : 'Invoice'}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isOperationDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Floating Dropdown Menu */}
            {isOperationDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2 z-50 text-slate-800 dark:text-slate-200 backdrop-blur-md animate-in fade-in duration-150"
                role="menu"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                  <span>Operation Modules</span>
                  <span className="text-[9px] font-mono text-slate-400">ERP</span>
                </div>

                {/* Item 1: GRN (Goods Received Note) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('challans');
                    setIsOperationDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    activeTab === 'challans'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold border border-amber-300/40 dark:border-amber-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">GRN</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Goods Received Notes &amp; Stock Inward ({challans.length})
                      </div>
                    </div>
                  </div>
                  {activeTab === 'challans' && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                </button>

                {/* Item 2: Non PO GRN (General Expense & Direct Inward - Non-Inventory) [NEW] */}
                <button
                  type="button"
                  onClick={() => {
                    setNonPoGrnSubView('search');
                    setActiveTab('non_po_grn');
                    setIsOperationDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-1 ${
                    activeTab === 'non_po_grn'
                      ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 font-extrabold border border-teal-300/40 dark:border-teal-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Non PO GRN</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        General Expense &amp; Direct Inward - Non-Inventory ({nonPoGrnRecords.length})
                      </div>
                    </div>
                  </div>
                  {activeTab === 'non_po_grn' && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                </button>

                {/* Item 3: Quotation */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('quotations');
                    setIsOperationDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-1 ${
                    activeTab === 'quotations'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 font-extrabold border border-blue-300/40 dark:border-blue-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Quotation</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Solar proposals &amp; estimates ({quotations.length})
                      </div>
                    </div>
                  </div>
                  {activeTab === 'quotations' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </button>

                {/* Item 3: Invoice */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('invoices');
                    setIsOperationDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-1 ${
                    activeTab === 'invoices'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 font-extrabold border border-purple-300/40 dark:border-purple-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Invoice</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        GST Tax Invoices &amp; Serials ({invoices.length})
                      </div>
                    </div>
                  </div>
                  {activeTab === 'invoices' && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                </button>
              </div>
            )}
          </div>

          {/* 3. Purchase Order Dropdown Menu (Enterprise Procurement Navigation) */}
          <div
            ref={poDropdownRef}
            onMouseEnter={handlePoMouseEnter}
            onMouseLeave={handlePoMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setIsPoDropdownOpen((prev) => !prev)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out cursor-pointer select-none ${
                isPoActive
                  ? 'bg-gradient-to-b from-[#0e7490] to-[#155e75] text-white font-extrabold shadow-[0_6px_0_#164e63,0_10px_15px_rgba(14,116,144,0.35)] border border-cyan-400/80 active:translate-y-1 active:shadow-[0_2px_0_#164e63]'
                  : 'bg-white/80 dark:bg-slate-800/80 text-sky-900 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800/60 hover:text-sky-950 hover:bg-sky-200/70 dark:hover:bg-sky-900/60 font-semibold hover:-translate-y-0.5 hover:shadow-md'
              }`}
              aria-haspopup="true"
              aria-expanded={isPoDropdownOpen}
            >
              <ShoppingBag className="w-4 h-4 text-cyan-300" />
              <span>Purchase Order</span>
              {isPoActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono font-bold tracking-tight">
                  {poSubView === 'create_po' ? 'Create' : 'Search'}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isPoDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Floating Dropdown Menu */}
            {isPoDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2 z-50 text-slate-800 dark:text-slate-200 backdrop-blur-md animate-in fade-in duration-150"
                role="menu"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                  <span>Procurement &amp; Orders</span>
                  <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">PO</span>
                </div>

                {/* Item 1: Create PO */}
                <button
                  type="button"
                  onClick={() => {
                    setPoSubView('create_po');
                    setActiveTab('purchase_orders');
                    setIsPoDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isPoActive && poSubView === 'create_po'
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 font-extrabold border border-cyan-300/40 dark:border-cyan-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                      <FilePlus2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Create PO</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Order goods, assign specs &amp; tax
                      </div>
                    </div>
                  </div>
                  {isPoActive && poSubView === 'create_po' && (
                    <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  )}
                </button>

                {/* Item 2: Search PO */}
                <button
                  type="button"
                  onClick={() => {
                    setPoSubView('search_po');
                    setActiveTab('purchase_orders');
                    setIsPoDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-1 ${
                    isPoActive && poSubView === 'search_po'
                      ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 font-extrabold border border-teal-300/40 dark:border-teal-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Search PO</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Track status &amp; inward GRN ({purchaseOrders.length})
                      </div>
                    </div>
                  </div>
                  {isPoActive && poSubView === 'search_po' && (
                    <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* BackOffice Dropdown Menu (Stock Inventory, Customer, Supplier) */}
          <div
            ref={backOfficeDropdownRef}
            onMouseEnter={handleBackOfficeMouseEnter}
            onMouseLeave={handleBackOfficeMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setIsBackOfficeDropdownOpen((prev) => !prev)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out cursor-pointer select-none ${
                isBackOfficeActive
                  ? 'bg-gradient-to-b from-[#0f4e56] to-[#005963] text-white font-extrabold shadow-[0_6px_0_#062a2f,0_10px_15px_rgba(15,78,86,0.35)] border border-teal-500/50 active:translate-y-1 active:shadow-[0_2px_0_#062a2f]'
                  : 'bg-white/80 dark:bg-slate-800/80 text-sky-900 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800/60 hover:text-sky-950 hover:bg-sky-200/70 dark:hover:bg-sky-900/60 font-semibold hover:-translate-y-0.5 hover:shadow-md'
              }`}
              aria-haspopup="true"
              aria-expanded={isBackOfficeDropdownOpen}
            >
              <Briefcase className="w-4 h-4 text-amber-300" />
              <span>BackOffice</span>
              {isBackOfficeActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono font-bold tracking-tight">
                  {activeTab === 'inventory'
                    ? 'Inventory'
                    : activeTab === 'customers'
                    ? 'Customer'
                    : 'Supplier'}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isBackOfficeDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Floating Dropdown Card */}
            {isBackOfficeDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2.5 z-50 text-slate-800 dark:text-slate-200 backdrop-blur-md animate-in fade-in duration-150"
                role="menu"
              >
                {/* Header Badge */}
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0f4e56] dark:text-teal-400 border-b border-slate-100 dark:border-slate-800 mb-1.5 flex items-center justify-between">
                  <span>BackOffice Modules</span>
                  <span className="text-[9px] font-mono bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded font-bold">
                    Master Data
                  </span>
                </div>

                {/* Item 1: Stock Inventory */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('inventory');
                    setIsBackOfficeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    activeTab === 'inventory'
                      ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 font-extrabold border border-teal-300/40 dark:border-teal-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Stock Inventory</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Solar panels, inverters, stock counts &amp; serial tracking
                      </div>
                    </div>
                  </div>
                  {activeTab === 'inventory' && (
                    <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  )}
                </button>

                {/* Item 2: Customer */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('customers');
                    setIsBackOfficeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-1 ${
                    activeTab === 'customers'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-extrabold border border-rose-300/40 dark:border-rose-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Customer</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Client directory, site details &amp; contact records
                      </div>
                    </div>
                  </div>
                  {activeTab === 'customers' && (
                    <Check className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                </button>

                {/* Item 3: Supplier */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('suppliers');
                    setIsBackOfficeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-1 ${
                    activeTab === 'suppliers'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold border border-amber-300/40 dark:border-amber-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Supplier</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Equipment vendors, KYC documents &amp; payable balances
                      </div>
                    </div>
                  </div>
                  {activeTab === 'suppliers' && (
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Finance Dropdown Menu (Debit & Credit Notes - Enterprise ERP) */}
          <div
            ref={financeDropdownRef}
            onMouseEnter={handleFinanceMouseEnter}
            onMouseLeave={handleFinanceMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setIsFinanceDropdownOpen((prev) => !prev)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out cursor-pointer select-none ${
                isFinanceActive
                  ? 'bg-gradient-to-b from-[#0f4e56] to-[#005963] text-white font-extrabold shadow-[0_6px_0_#062a2f,0_10px_15px_rgba(15,78,86,0.35)] border border-teal-500/50 active:translate-y-1 active:shadow-[0_2px_0_#062a2f]'
                  : 'bg-white/80 dark:bg-slate-800/80 text-sky-900 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800/60 hover:text-sky-950 hover:bg-sky-200/70 dark:hover:bg-sky-900/60 font-semibold hover:-translate-y-0.5 hover:shadow-md'
              }`}
              aria-haspopup="true"
              aria-expanded={isFinanceDropdownOpen}
            >
              <Landmark className="w-4 h-4 text-emerald-300" />
              <span>Finance</span>
              {isFinanceActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono font-bold tracking-tight">
                  {financeSubView === 'debit_entry'
                    ? 'DN Entry'
                    : financeSubView === 'debit_dashboard'
                    ? 'DN Reg'
                    : financeSubView === 'credit_entry'
                    ? 'CN Entry'
                    : 'CN Reg'}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isFinanceDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Floating Dropdown Card */}
            {isFinanceDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2.5 z-50 text-slate-800 dark:text-slate-200 backdrop-blur-md animate-in fade-in duration-150"
                role="menu"
              >
                {/* Header Badge */}
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0f4e56] dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Finance Modules</span>
                  <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                    {financeNotes.length} Notes
                  </span>
                </div>

                {/* Section 1: DEBIT NOTE SECTION */}
                <div className="px-2.5 pt-1 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Debit Note
                </div>

                {/* Item 1: Debit Note Entry */}
                <button
                  type="button"
                  onClick={() => {
                    setFinanceSubView('debit_entry');
                    setActiveTab('finance');
                    setIsFinanceDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isFinanceActive && financeSubView === 'debit_entry'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-extrabold border border-emerald-300/40 dark:border-emerald-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <FilePlus2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Debit Note Entry</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Create new buyer/supplier debit note
                      </div>
                    </div>
                  </div>
                  {isFinanceActive && financeSubView === 'debit_entry' && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </button>

                {/* Item 2: Debit Note Dashboard */}
                <button
                  type="button"
                  onClick={() => {
                    setFinanceSubView('debit_dashboard');
                    setActiveTab('finance');
                    setIsFinanceDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-0.5 ${
                    isFinanceActive && financeSubView === 'debit_dashboard'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-extrabold border border-emerald-300/40 dark:border-emerald-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
                      <LayoutList className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Debit Note Dashboard</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Search, edit &amp; view debit notes register
                      </div>
                    </div>
                  </div>
                  {isFinanceActive && financeSubView === 'debit_dashboard' && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </button>

                {/* Divider Line */}
                <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

                {/* Section 2: CREDIT NOTE SECTION */}
                <div className="px-2.5 pt-0.5 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Credit Note
                </div>

                {/* Item 3: Credit Note Entry */}
                <button
                  type="button"
                  onClick={() => {
                    setFinanceSubView('credit_entry');
                    setActiveTab('finance');
                    setIsFinanceDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isFinanceActive && financeSubView === 'credit_entry'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold border border-amber-300/40 dark:border-amber-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                      <FilePlus2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Credit Note Entry</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Issue buyer/supplier credit note
                      </div>
                    </div>
                  </div>
                  {isFinanceActive && financeSubView === 'credit_entry' && (
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                </button>

                {/* Item 4: Credit Note Dashboard */}
                <button
                  type="button"
                  onClick={() => {
                    setFinanceSubView('credit_dashboard');
                    setActiveTab('finance');
                    setIsFinanceDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-0.5 ${
                    isFinanceActive && financeSubView === 'credit_dashboard'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold border border-amber-300/40 dark:border-amber-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shrink-0">
                      <LayoutList className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Credit Note Dashboard</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Search, edit &amp; view credit notes register
                      </div>
                    </div>
                  </div>
                  {isFinanceActive && financeSubView === 'credit_dashboard' && (
                    <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Report Dropdown Menu (Purchase & Invoice Reports) */}
          <div
            ref={reportDropdownRef}
            onMouseEnter={handleReportMouseEnter}
            onMouseLeave={handleReportMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setIsReportDropdownOpen((prev) => !prev)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out cursor-pointer select-none ${
                isReportActive
                  ? 'bg-gradient-to-b from-[#0f4e56] to-[#005963] text-white font-extrabold shadow-[0_6px_0_#062a2f,0_10px_15px_rgba(15,78,86,0.35)] border border-teal-500/50 active:translate-y-1 active:shadow-[0_2px_0_#062a2f]'
                  : 'bg-white/80 dark:bg-slate-800/80 text-sky-900 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800/60 hover:text-sky-950 hover:bg-sky-200/70 dark:hover:bg-sky-900/60 font-semibold hover:-translate-y-0.5 hover:shadow-md'
              }`}
              aria-haspopup="true"
              aria-expanded={isReportDropdownOpen}
            >
              <BarChart3 className="w-4 h-4 text-cyan-300" />
              <span>Report</span>
              {isReportActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono font-bold tracking-tight">
                  {reportSubView === 'purchase' ? 'Purchase' : reportSubView === 'invoice' ? 'Invoice' : 'Non PO GRN'}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isReportDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Floating Dropdown Card */}
            {isReportDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2.5 z-50 text-slate-800 dark:text-slate-200 backdrop-blur-md animate-in fade-in duration-150"
                role="menu"
              >
                {/* Header Badge */}
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0f4e56] dark:text-cyan-400 border-b border-slate-100 dark:border-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Reports &amp; Registers</span>
                  <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded font-bold">
                    GST &amp; Audit
                  </span>
                </div>

                {/* Item 1: Purchase Report */}
                <button
                  type="button"
                  onClick={() => {
                    setReportSubView('purchase');
                    setActiveTab('reports');
                    setIsReportDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isReportActive && reportSubView === 'purchase'
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 font-extrabold border border-cyan-300/40 dark:border-cyan-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Purchase Report</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Supplier inward procurement &amp; GST register
                      </div>
                    </div>
                  </div>
                  {isReportActive && reportSubView === 'purchase' && (
                    <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  )}
                </button>

                {/* Item 2: Invoice Report */}
                <button
                  type="button"
                  onClick={() => {
                    setReportSubView('invoice');
                    setActiveTab('reports');
                    setIsReportDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-1 ${
                    isReportActive && reportSubView === 'invoice'
                      ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 font-extrabold border border-teal-300/40 dark:border-teal-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Invoice Report</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Customer sales invoices &amp; tax collection summary
                      </div>
                    </div>
                  </div>
                  {isReportActive && reportSubView === 'invoice' && (
                    <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  )}
                </button>

                {/* Item 3: Non PO GRN Report */}
                <button
                  type="button"
                  onClick={() => {
                    setReportSubView('non_po_grn');
                    setActiveTab('reports');
                    setIsReportDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mt-1 ${
                    isReportActive && reportSubView === 'non_po_grn'
                      ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 font-extrabold border border-teal-300/40 dark:border-teal-700/50'
                      : ''
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 dark:text-slate-100">Non PO GRN Report</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        Operational expense inward &amp; consumable register
                      </div>
                    </div>
                  </div>
                  {isReportActive && reportSubView === 'non_po_grn' && (
                    <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  )}
                </button>
              </div>
            )}
          </div>



          {/* 6. Profit Analysis Tab - Emerald Green */}
          <button
            onClick={() => setActiveTab('profit')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs transition-all duration-200 ease-out cursor-pointer ${
              activeTab === 'profit'
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white font-extrabold shadow-[0_6px_0_#047857,0_10px_15px_rgba(16,185,129,0.35)] border border-emerald-400/80 active:translate-y-1 active:shadow-[0_2px_0_#047857]'
                : 'bg-white/80 dark:bg-slate-800/80 text-sky-900 dark:text-sky-200 border border-sky-200/80 dark:border-sky-800/60 hover:text-sky-950 hover:bg-sky-200/70 dark:hover:bg-sky-900/60 font-semibold hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-100" />
            <span>{t.tabProfit}</span>
          </button>
        </div>
      </div>

      {/* Tab 0: Homepage / Command Center Dashboard */}
      {activeTab === 'dashboard' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">Loading Command Center...</div>}>
          <DashboardHome
            documents={documents}
            inventory={inventory}
            customers={customers}
            lang={lang}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onCreateDoc={(type, initialKw) => {
              setBuilderInitialDoc(initialKw ? ({ systemCapacityKw: initialKw } as any) : null);
              setCreateDocType(type);
              setActiveTab('create_doc');
            }}
            onOpenAddStockModal={() => {
              setActiveTab('inventory');
            }}
            onOpenAddCustomerModal={() => {
              setActiveTab('customers');
              setShowAddCustomerModal(true);
            }}
            onRecordPaymentForInvoice={(inv) => setRecordingPaymentDoc(inv)}
            stockLogs={stockLogs}
          />
        </Suspense>
      )}

      {/* Tab 1 & 2: Documents List (Quotations / Invoices) */}
      {(activeTab === 'quotations' || activeTab === 'invoices') && (
        <div className="space-y-4">
          {/* GST Sales Report Toolbar for Invoices Directory */}
          {activeTab === 'invoices' && (
            <div className="p-4 bg-emerald-900/5 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                    GST Sales &amp; Audit Report Export (GSTR-1)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Generate accountant-ready CSV/Excel files mapped to Indian GSTR-1 tax return specifications.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedGstPeriod}
                    onChange={(e) => setSelectedGstPeriod(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  >
                    <option value="2026-09">Current Month (Sep 2026)</option>
                    <option value="2026-08">Last Month (Aug 2026)</option>
                    <option value="FY-2026">Current Financial Year (2026-27)</option>
                    <option value="custom">Custom Date Range</option>
                    <option value="all">All Time (Full History)</option>
                  </select>

                  {selectedGstPeriod === 'custom' && (
                    <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">From:</span>
                        <input
                          type="date"
                          value={gstStartDate}
                          onChange={(e) => setGstStartDate(e.target.value)}
                          className="bg-transparent text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <span className="text-slate-400 text-xs">-</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">To:</span>
                        <input
                          type="date"
                          value={gstEndDate}
                          onChange={(e) => setGstEndDate(e.target.value)}
                          className="bg-transparent text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-start sm:items-end">
                  <button
                    onClick={handleExportGstReport}
                    title={`Exporting: ${getActiveDateRangeLabel()}`}
                    className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center shrink-0 active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Download GST Sales Report (Excel/CSV)</span>
                  </button>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold mt-1">
                    Exporting: {getActiveDateRangeLabel()} ({getFilteredGstInvoices().length} invoice{getFilteredGstInvoices().length === 1 ? '' : 's'})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Financial Overview Banner for Invoices Directory */}
          {activeTab === 'invoices' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase font-mono">
                  Total Tax Invoiced
                </span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1">
                  ₹{invoices.reduce((acc, i) => acc + i.grandTotal, 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 block uppercase font-mono">
                  Total Collections
                </span>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono mt-1">
                  ₹
                  {invoices
                    .reduce(
                      (acc, i) =>
                        acc +
                        ((i.payments || []).reduce((sum, p) => sum + p.amountPaid, 0) ||
                          i.totalPaid ||
                          0),
                      0
                    )
                    .toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-4 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-400 block uppercase font-mono">
                  Outstanding Balance Dues
                </span>
                <div className="text-xl font-extrabold text-rose-700 dark:text-rose-400 font-mono mt-1">
                  ₹
                  {invoices
                    .reduce((acc, i) => {
                      const paid =
                        (i.payments || []).reduce((sum, p) => sum + p.amountPaid, 0) ||
                        i.totalPaid ||
                        0;
                      return acc + Math.max(0, i.grandTotal - paid);
                    }, 0)
                    .toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left: Directory Title */}
              <div className="shrink-0">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span>{activeTab === 'quotations' ? 'Solar Quotations Directory' : 'Tax Invoices Directory'}</span>
                </h3>
              </div>

              {/* Center: Live Search Field */}
              <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md w-full">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={activeTab === 'quotations' ? quoteSearchQuery : invoiceSearchQuery}
                    onChange={(e) => {
                      if (activeTab === 'quotations') {
                        setQuoteSearchQuery(e.target.value);
                      } else {
                        setInvoiceSearchQuery(e.target.value);
                      }
                    }}
                    placeholder={
                      activeTab === 'quotations'
                        ? 'Search quote by doc #, client, phone, kW...'
                        : 'Search invoice by doc #, client, phone, kW...'
                    }
                    className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all shadow-xs"
                  />
                  {(activeTab === 'quotations' ? quoteSearchQuery : invoiceSearchQuery) && (
                    <button
                      onClick={() => {
                        if (activeTab === 'quotations') {
                          setQuoteSearchQuery('');
                        } else {
                          setInvoiceSearchQuery('');
                        }
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Action Button & User Info */}
              <div className="flex items-center gap-3 shrink-0">
                {activeTab === 'quotations' && (
                  <>
                    <button
                      type="button"
                      onClick={() => exportQuotationsToExcel(filteredQuotations.length > 0 ? filteredQuotations : quotations)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 shadow-xs hover:shadow active:scale-95 transition-all cursor-pointer shrink-0"
                      title={`Export ${filteredQuotations.length} Quotation${filteredQuotations.length === 1 ? '' : 's'} to Excel (.xlsx)`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Export Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBuilderInitialDoc(null);
                        setCreateDocType('Quotation');
                        setActiveTab('create_doc');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md hover:shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-950 stroke-[3]" />
                      <span>Create Solar Quote</span>
                    </button>
                  </>
                )}

                {activeTab === 'invoices' && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderInitialDoc(null);
                      setCreateDocType('Invoice');
                      setActiveTab('create_doc');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 shadow-md hover:shadow-lg active:scale-95 transition-all dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-600 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                    <span>Create Tax Invoice</span>
                  </button>
                )}

                <span className="text-xs text-slate-500 hidden lg:inline">
                  User: <strong className="text-slate-700 font-semibold">Haradhan Patra</strong> (Sun Light Electric)
                </span>
              </div>
            </div>

            {/* Status Filter Bar for Quotations */}
            {activeTab === 'quotations' && (
              <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Status Filter:</span>
                {(['All', 'Draft', 'Pending', 'Approved', 'Cancelled', 'Expired'] as const).map((st) => {
                  const count =
                    st === 'All'
                      ? quotations.length
                      : st === 'Pending'
                      ? quotations.filter((q) => q.status === 'Pending' || q.status === 'Sent').length
                      : quotations.filter((q) => q.status === st).length;

                  const isActive = quoteStatusFilter === st;

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setQuoteStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{st}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive
                            ? 'bg-amber-400 text-slate-950 dark:bg-slate-900 dark:text-amber-400 font-extrabold'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sky-950 text-white uppercase text-[10px] font-bold tracking-wider border-b border-sky-800">
                  <tr>
                    <th className="p-3.5">Doc Number</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Capacity</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Net Payable</th>
                    <th className="p-3.5 text-center">{activeTab === 'quotations' ? 'Quotation Status' : 'Payment Status'}</th>
                    <th className="p-3.5 text-right">Actions &amp; Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeTab === 'quotations'
                    ? filteredQuotations
                    : invoices
                  ).map((doc) => {
                    const paidAmt =
                      (doc.payments || []).reduce((s, p) => s + p.amountPaid, 0) ||
                      doc.totalPaid ||
                      0;
                    const dueAmt = Math.max(0, doc.grandTotal - paidAmt);
                    const pmtStatus =
                      doc.type === 'Invoice'
                        ? dueAmt === 0
                          ? 'Fully Paid'
                          : paidAmt > 0
                          ? 'Partially Paid'
                          : 'Unpaid'
                        : doc.status;

                    const totalQty = doc.items ? doc.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
                    const assignedSerials = doc.items ? doc.items.reduce((s, it) => s + (it.serialNumbers?.length || 0), 0) : 0;
                    const hsnCodes = Array.from(new Set((doc.items || []).map((it) => it.hsnCode || (it.itemCode?.startsWith('SP-') ? '85017200' : '850440')).filter(Boolean)));

                    return (
                      <tr key={doc.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="p-3.5 font-mono text-slate-900">
                          <div className="font-bold">{doc.documentNumber}</div>
                          {hsnCodes.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {hsnCodes.map((hsn, hIdx) => (
                                <span
                                  key={hIdx}
                                  className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                  title="GST HSN/SAC statutory classification code"
                                >
                                  HSN {hsn}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{doc.customerName}</div>
                          <div className="text-[11px] text-slate-500">{doc.customerPhone}</div>
                        </td>
                        <td className="p-3.5 font-bold text-amber-800">
                          {doc.systemCapacityKw || 5.0} kW
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono">{doc.date}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                          ₹{doc.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center space-y-1">
                            {doc.type === 'Invoice' ? (
                              <>
                                <span
                                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                    pmtStatus === 'Fully Paid' || pmtStatus === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : pmtStatus === 'Partially Paid'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : 'bg-rose-100 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  {pmtStatus}
                                </span>
                                {pmtStatus !== 'Fully Paid' && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Due: <strong className="text-rose-600">₹{dueAmt.toLocaleString('en-IN')}</strong>
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <select
                                  value={doc.status === 'Sent' ? 'Pending' : doc.status}
                                  onChange={(e) => handleQuickUpdateQuoteStatus(doc.id, e.target.value)}
                                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-all shadow-2xs ${
                                    doc.status === 'Approved'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                      : doc.status === 'Pending' || doc.status === 'Sent'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                      : doc.status === 'Cancelled'
                                      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                      : doc.status === 'Expired'
                                      ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  <option value="Draft">Draft</option>
                                  <option value="Pending">Pending / Sent</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Expired">Expired</option>
                                  <option value="Cancelled">Cancelled / Rejected</option>
                                </select>
                                {doc.status === 'Cancelled' && doc.cancellationReason && (
                                  <span
                                    className="text-[10px] text-rose-600 dark:text-rose-400 font-medium max-w-[130px] truncate block"
                                    title={`Cancellation Reason: ${doc.cancellationReason}`}
                                  >
                                    Reason: {doc.cancellationReason}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                            {doc.type === 'Quotation' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingQuoteDoc(doc)}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center transition-all shadow-2xs shrink-0 cursor-pointer"
                                  title="Edit Solar Quotation Details"
                                >
                                  <Edit3 className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => handleConvertQuotationToInvoice(doc)}
                                  disabled={doc.status === 'Cancelled'}
                                  className={`font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center transition-all shadow-xs shrink-0 ${
                                    doc.status === 'Cancelled'
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed opacity-60'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer'
                                  }`}
                                  title={doc.status === 'Cancelled' ? 'Cannot convert cancelled quotation to invoice' : 'Convert Quotation directly into Tax Invoice'}
                                >
                                  <FileCheck className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" />
                                  <span>Convert to Invoice</span>
                                </button>
                              </>
                            )}

                            {doc.type === 'Invoice' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingInvoiceDoc(doc)}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center transition-all shadow-2xs shrink-0 cursor-pointer"
                                  title="Edit Tax Invoice Details & Items"
                                >
                                  <Edit3 className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSerialScannerInvoice(doc)}
                                  className={`border font-bold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center transition-all shadow-xs shrink-0 cursor-pointer ${
                                    assignedSerials >= totalQty && totalQty > 0
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                      : assignedSerials > 0
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                      : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 dark:text-sky-300 dark:border-sky-800'
                                  }`}
                                  title="Scan or assign component serial numbers (Solar Panels, Inverters, Batteries)"
                                >
                                  <Scan className="w-3.5 h-3.5 mr-1" />
                                  <span>Serials ({assignedSerials}/{totalQty})</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setRecordingPaymentDoc(doc)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center transition-all shadow-sm shrink-0 cursor-pointer"
                                  title="Record New Payment"
                                >
                                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                                  <span>+ Record Payment</span>
                                </button>
                              </>
                            )}

                            {doc.type === 'Invoice' && doc.payments && doc.payments.length > 0 && (
                              <button
                                onClick={() => {
                                  if (doc.payments.length === 1) {
                                    setViewingReceiptData({
                                      receipt: doc.payments[0],
                                      invoice: doc,
                                    });
                                  } else {
                                    setShowReceiptsListForDoc(doc);
                                  }
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 flex items-center transition-all shrink-0 cursor-pointer"
                                title="View Money Receipt Vouchers"
                              >
                                <Receipt className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                <span>Receipts ({doc.payments.length})</span>
                              </button>
                            )}

                            {doc.type === 'Invoice' && (
                              <>
                                {/* Delivery Challan (Dispatch Slip & Dual Copy) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeliveryChallanDoc(doc);
                                  }}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:hover:bg-amber-900/70 dark:text-amber-300 rounded-lg transition-all border border-amber-300 dark:border-amber-700/80 cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                                  title="Delivery Challan (PDF Download & Dual-Copy Print)"
                                >
                                  <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </button>

                                {/* e-Way Bill (NIC Standard Format) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEwayBillDoc(doc);
                                  }}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/70 dark:text-emerald-300 rounded-lg transition-all border border-emerald-300 dark:border-emerald-700/80 cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                                  title="GST e-Way Bill (PDF Download & Official Print)"
                                >
                                  <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-200 cursor-pointer shrink-0"
                              title="View PDF"
                            >
                              <Eye className="w-4 h-4 text-amber-600" />
                            </button>

                            <button
                              onClick={() => downloadDocumentPdf(doc)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-200 cursor-pointer shrink-0"
                              title="Download PDF File"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {doc.type === 'Invoice' ? (
                              pmtStatus === 'Fully Paid' || dueAmt <= 0 ? (
                                <button
                                  type="button"
                                  disabled
                                  className="p-1.5 rounded-lg text-slate-500 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 cursor-not-allowed opacity-40 transition-all shrink-0"
                                  title="No payment pending (Fully Paid)"
                                >
                                  <Send className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    sendPaymentDueReminderWhatsApp(
                                      {
                                        invoiceNo: doc.documentNumber,
                                        date: doc.date,
                                        customerName: doc.customerName,
                                        customerPhone: doc.customerPhone,
                                        grandTotal: doc.grandTotal,
                                        totalPaid: paidAmt,
                                        dueAmount: dueAmt,
                                      },
                                      lang
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-sm transition-all cursor-pointer shrink-0"
                                  title={`Send Due Payment Reminder (Due: ₹${dueAmt.toLocaleString('en-IN')})`}
                                >
                                  <Send className="w-4 h-4 text-white" />
                                </button>
                              )
                            ) : (
                              <a
                                href={getWhatsAppDeepLinks(doc, lang).waMeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm shrink-0"
                                title="Share Quotation on WhatsApp"
                              >
                                <Send className="w-4 h-4" />
                              </a>
                            )}

                            {/* Delete Action (Owner Authorization Required) */}
                            <button
                              type="button"
                              onClick={() => setDeleteTargetDoc(doc)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/60 cursor-pointer shrink-0"
                              title={`Delete ${doc.type} (Requires Owner Approval)`}
                            >
                              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Inventory Manager */}
      {activeTab === 'inventory' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">Loading Inventory Manager...</div>}>
          <InventoryManager
            inventory={inventory}
            setInventory={setInventory}
            lang={lang}
            stockLogs={stockLogs}
            onAddStockLog={handleAddStockLog}
            onNavigateToChallans={() => setActiveTab('challans')}
          />
        </Suspense>
      )}

      {/* Tab 4: Customer Directory */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Customer Directory</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage solar client contact records, GSTIN tax details, and client status (Active / Inactive).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Hidden File Input for Excel Import */}
              <input
                type="file"
                ref={customerFileInputRef}
                onChange={handleCustomerExcelImport}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />

              {/* Bulk Upload Button */}
              <button
                type="button"
                onClick={() => customerFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-950/60 hover:bg-sky-900 border border-sky-600/40 text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Upload Excel with customer list for bulk creation"
              >
                <UploadCloud className="w-4 h-4 text-sky-400"/>
                <span>Import Excel</span>
              </button>

              {/* Export Directory Button */}
              <button
                type="button"
                onClick={handleCustomerExcelExport}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Download complete customer list to Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400"/>
                <span>Export Excel</span>
              </button>

              {/* Existing Add Customer Button */}
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-950 stroke-[3]"/>
                <span>{t.btnAddCustomer}</span>
              </button>
            </div>
          </div>

          {/* Search and Filter Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Search Input Field */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                placeholder="Search customer by name, phone number, GSTIN, or city..."
                className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
              {customerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCustomerSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Controls (Side-by-Side) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md">
                <span className="text-[11px] font-semibold text-slate-400 px-1 hidden sm:inline">Type:</span>
                {(['All', 'Domestic', 'Commercial'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCustomerCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ease-out ${
                      customerCategoryFilter === cat
                        ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-bold shadow-[0_4px_0_#b45309] border border-amber-300/80'
                        : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {cat === 'All' ? 'All Types' : cat}
                  </button>
                ))}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center space-x-1.5 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md">
                <span className="text-[11px] font-semibold text-slate-400 px-1 hidden sm:inline">Status:</span>
                {(['All', 'Active', 'Inactive'] as const).map((statusOpt) => {
                  const count =
                    statusOpt === 'All'
                      ? customers.length
                      : statusOpt === 'Active'
                      ? customers.filter((c) => c.status === 'active').length
                      : customers.filter((c) => c.status === 'inactive').length;
                  return (
                    <button
                      key={statusOpt}
                      type="button"
                      onClick={() => setCustomerStatusFilter(statusOpt)}
                      className={`px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ease-out ${
                        customerStatusFilter === statusOpt
                          ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-bold shadow-[0_4px_0_#b45309] border border-amber-300/80'
                          : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {statusOpt} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Customers Grid or Empty State */}
          {(() => {
            const query = customerSearchQuery.toLowerCase().trim();
            const filteredCustomers = customers.filter((client) => {
              // 1. Text Query Filter
              const matchesSearch =
                !query ||
                client.name.toLowerCase().includes(query) ||
                client.phone.includes(query) ||
                (client.gstin && client.gstin.toLowerCase().includes(query)) ||
                client.address.toLowerCase().includes(query) ||
                (client.state && client.state.toLowerCase().includes(query));

              // 2. Status Filter
              const matchesStatus =
                customerStatusFilter === 'All' ||
                (customerStatusFilter === 'Active' && client.status === 'active') ||
                (customerStatusFilter === 'Inactive' && client.status === 'inactive');

              // 3. Category Filter
              const matchesCategory =
                customerCategoryFilter === 'All' ||
                client.category.toLowerCase() === customerCategoryFilter.toLowerCase();

              return matchesSearch && matchesStatus && matchesCategory;
            });

            if (filteredCustomers.length === 0) {
              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No customers found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    No customer records match your current search query or filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearchQuery('');
                      setCustomerCategoryFilter('All');
                      setCustomerStatusFilter('All');
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-1"
                  >
                    <span>Clear all filters</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredCustomers.map((c) => {
                  const isActive = c.status === 'active';
                  return (
                    <div
                      key={c.id}
                      className={`border rounded-2xl p-5 shadow-sm space-y-3 transition-all duration-200 ${
                        isActive
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500'
                          : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-85'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{c.name}</h3>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400">{c.id}</span>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          {/* Category Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              c.category === 'Commercial'
                                ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                                : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {c.category}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center space-x-2">
                          <PhoneCall className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-slate-800 dark:text-slate-200 font-medium">{c.address}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {c.state} ({c.stateCode || '19'}) - {c.pinCode || c.pincode}
                            </div>
                          </div>
                        </div>
                        {c.gstin && (
                          <div className="flex items-center space-x-2">
                            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px]">GSTIN: {c.gstin}</span>
                          </div>
                        )}
                      </div>

                      {/* Direct One-Click Communication Action Buttons (Call & WhatsApp) */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDirectCall(c.phone)}
                          className="flex items-center justify-center gap-1.5 bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all duration-200 shadow-[0_3px_0_#0369a1,0_6px_10px_rgba(14,165,233,0.3)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none border border-sky-400/80 cursor-pointer"
                          title={`Direct phone call to ${c.name} (${c.phone})`}
                        >
                          <Phone className="w-3.5 h-3.5 text-sky-100" />
                          <span>Call</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDirectWhatsApp(c.phone, c.name)}
                          className="flex items-center justify-center gap-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all duration-200 shadow-[0_3px_0_#047857,0_6px_10px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none border border-emerald-400/80 cursor-pointer"
                          title={`Chat on WhatsApp with ${c.name}`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-100" />
                          <span>WhatsApp</span>
                        </button>
                      </div>

                      {/* Attached KYC & Site Documents Vault Button */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForDetails(c)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/40 font-bold text-xs transition-all cursor-pointer hover:shadow-xs"
                          title="View client profile and KYC supporting documents"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-extrabold text-[11px]">KYC &amp; Site Documents</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                            {(c.documents || []).length} Attached
                          </span>
                        </button>
                      </div>

                      {/* Active / Inactive Status Toggle Action */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Account Status</span>
                        <button
                          type="button"
                          onClick={() => toggleCustomerStatus(c.id)}
                          className={`text-[11px] font-bold px-3 py-1 rounded-xl transition-all duration-200 ease-out border ${
                            isActive
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800/80'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800/80'
                          }`}
                        >
                          {isActive ? 'Mark Inactive' : 'Set Active'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">Loading Solar Equipment Suppliers...</div>}>
          <SuppliersTab
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            lang={lang}
            onNavigateToChallans={() => setActiveTab('challans')}
          />
        </Suspense>
      )}

      {/* Tab: Inward Delivery Challans & GRN */}
      {activeTab === 'challans' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">Loading Goods Received Notes (GRN) Register...</div>}>
          <InwardChallansTab
            challans={challans}
            setChallans={setChallans}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            inventory={inventory}
            setInventory={setInventory}
            onAddStockLogInward={handleAddStockLogInward}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Tab: Non PO GRN (General Expense & Direct Inward - Non-Inventory) */}
      {activeTab === 'non_po_grn' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-teal-600 dark:text-teal-400 font-extrabold animate-pulse">Loading Non-PO Goods Received Notes Register...</div>}>
          <NonPoGrnTab
            records={nonPoGrnRecords}
            onSaveRecord={handleSaveNonPoGrnRecord}
            suppliers={suppliers}
            currentSubView={nonPoGrnSubView}
            onSubViewChange={(view) => setNonPoGrnSubView(view)}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Tab: Profit & Loss Analysis */}
      {activeTab === 'profit' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">Loading Financial &amp; Profit Analysis...</div>}>
          <ProfitAnalysis
            documents={documents}
            inventory={inventory}
            onUpdateInvoiceExpenses={handleUpdateInvoiceExpenses}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Tab: Finance Module (Debit Note & Credit Note) */}
      {activeTab === 'finance' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-emerald-500 font-extrabold animate-pulse">Loading Finance Management Module...</div>}>
          <FinanceTab
            notes={financeNotes}
            setNotes={setFinanceNotes}
            customers={customers}
            suppliers={suppliers}
            lang={lang}
            currentSubView={financeSubView}
            onSubViewChange={(view) => setFinanceSubView(view)}
          />
        </Suspense>
      )}

      {/* Tab: Reports Module (Purchase Report, Invoice Report & Non PO GRN Report) */}
      {(activeTab === 'reports' || (activeTab as any) === 'non-po-grn-report') && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-cyan-500 font-extrabold animate-pulse">Loading Reports &amp; GST Registers...</div>}>
          <ReportsTab
            challans={challans}
            documents={documents}
            suppliers={suppliers}
            customers={customers}
            financeNotes={financeNotes}
            nonPoGrnRecords={nonPoGrnRecords}
            lang={lang}
            currentSubView={(activeTab as any) === 'non-po-grn-report' ? 'non_po_grn' : reportSubView}
            onSubViewChange={(view) => setReportSubView(view as any)}
          />
        </Suspense>
      )}

      {/* Tab: Purchase Orders Module (Create PO & Search PO / Multi-Stage GRN) */}
      {activeTab === 'purchase_orders' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-cyan-500 font-extrabold animate-pulse">Loading Purchase Orders &amp; Procurement Register...</div>}>
          <PurchaseOrderTab
            purchaseOrders={purchaseOrders}
            onSavePO={handleSavePO}
            onInwardPO={handleInwardPO}
            suppliers={suppliers}
            inventory={inventory}
            customers={customers}
            challans={challans}
            currentSubView={poSubView}
            onSubViewChange={(view) => setPoSubView(view)}
            onAddNewInventoryItem={(newItem) => setInventory((prev) => [newItem, ...prev])}
          />
        </Suspense>
      )}

      {/* Tab 5: Create Document Builder */}
      {activeTab === 'create_doc' && (
        <Suspense fallback={<div className="p-12 text-center text-xs text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">Loading Document Builder...</div>}>
          <DocumentBuilder
            customers={customers}
            inventory={inventory}
            onSaveDocument={handleSaveDocument}
            onPreviewPdf={(doc) => setPreviewDoc(doc)}
            lang={lang}
            defaultType={createDocType}
            initialDoc={builderInitialDoc}
          />
        </Suspense>
      )}

      {/* PDF Viewer Modal */}
      {previewDoc && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-amber-400 font-bold">Rendering PDF document...</div>}>
          <PdfViewerModal
            doc={previewDoc}
            onClose={() => setPreviewDoc(null)}
            lang={lang}
            onConvertQuotation={handleConvertQuotationToInvoice}
          />
        </Suspense>
      )}

      {/* Add Customer Modal with Supporting Documents & KYC */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-400">Add New Solar Client</h3>
                  <p className="text-[11px] text-slate-400">Master details &amp; KYC onboarding</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setCustDocuments([]);
                  setCustDocUploadError(null);
                  setCustDocValidationError(false);
                  setShowCustDocWarningModal(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleAddCustomerSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sukanta Nandi / Mondal Enterprises"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={custCategory}
                    onChange={(e) => setCustCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Domestic">Domestic</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="19ABCDE1234F1Z5"
                    value={custGstin}
                    onChange={(e) => setCustGstin(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Status Selector Field */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Client Status</label>
                <select
                  value={custStatus}
                  onChange={(e) => setCustStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="active">Active Client</option>
                  <option value="inactive">Inactive Client</option>
                </select>
              </div>

              {/* Address Field */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Address / Street Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Holdings No. 45, College Road, Burdwan"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* State and Pin Code Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
                  <select
                    value={custStateCode}
                    onChange={handleStateChange}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.stateCode} value={s.stateCode}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pin Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 713101"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={custPinCode}
                    onChange={(e) => setCustPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* 1. Supporting Documents & KYC Section */}
              <div
                ref={custDocSectionRef}
                key={`cust-doc-section-${custShakeKey}`}
                className={`p-4 rounded-2xl space-y-3 transition-all duration-200 ${
                  custDocValidationError
                    ? 'border-2 border-rose-500 bg-rose-50/50 dark:bg-rose-950/25 ring-4 ring-rose-500/20 animate-shake'
                    : 'border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <label className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileText className={`w-4 h-4 ${custDocValidationError ? 'text-rose-500' : 'text-amber-500'}`} />
                      <span>Supporting Documents &amp; KYC</span>
                      <span className="text-rose-500 font-black text-sm leading-none">*</span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Discom electricity bills, KYC identity proof, land deed, or site photos
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {custDocValidationError ? (
                      <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-rose-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Mandatory Document Required *
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full font-mono ${
                          custDocuments.length > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {custDocuments.length} {custDocuments.length === 1 ? 'Doc Attached' : 'Docs Attached'}
                      </span>
                    )}

                    {/* Document Category Selector Dropdown */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-[10px] text-slate-500 font-semibold">Type:</span>
                      <select
                        value={custDocCategory}
                        onChange={(e) => setCustDocCategory(e.target.value as ClientDocumentCategory)}
                        className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      >
                        {KYC_DOCUMENT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Error Banner when zero documents attached on submit */}
                {custDocValidationError && (
                  <div className="p-3.5 rounded-2xl bg-rose-100/90 dark:bg-rose-950/70 border-2 border-rose-500 text-rose-900 dark:text-rose-100 shadow-sm flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-rose-500 text-white shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-black text-xs uppercase tracking-wide flex items-center gap-2 text-rose-800 dark:text-rose-200">
                        <span>Mandatory Document Required</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500 text-white rounded-full">
                          Blocking Error
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-semibold text-rose-900 dark:text-rose-100">
                        Cannot register customer without supporting records! Please attach at least one site KYC document (e.g., Electricity Bill, Aadhaar, PAN, or Roof/Site Photo).
                      </p>
                    </div>
                  </div>
                )}

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsCustDocDragging(true);
                  }}
                  onDragLeave={() => setIsCustDocDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsCustDocDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleCustFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => custDocFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
                    custDocValidationError
                      ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/30'
                      : isCustDocDragging
                      ? 'border-amber-500 bg-amber-100/50 dark:bg-amber-900/40'
                      : 'border-slate-300 dark:border-slate-700 hover:border-amber-400 bg-white/70 dark:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="file"
                    ref={custDocFileInputRef}
                    onChange={(e) => e.target.files && handleCustFiles(e.target.files)}
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                  />
                  <div
                    className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center mb-1.5 ${
                      custDocValidationError
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-bounce'
                        : 'bg-amber-500/15 text-amber-500'
                    }`}
                  >
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Click to browse or drag &amp; drop KYC files
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Attach <span className="font-semibold text-amber-600 dark:text-amber-400">{custDocCategory}</span> (PDF, JPG, PNG up to 10MB)
                  </p>
                </div>

                {custDocUploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{custDocUploadError}</span>
                  </div>
                )}

                {/* Itemized Uploaded Documents Cards */}
                {custDocuments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Attached Files ({custDocuments.length})</span>
                      <span className="text-emerald-500 font-bold">Saved with Client Record</span>
                    </div>
                    {custDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                            {doc.name.toLowerCase().endsWith('.pdf') ? (
                              <FileText className="w-4 h-4 text-rose-500" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-sky-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                {doc.category}
                              </span>
                              <span className="text-[9px] font-mono font-bold text-slate-400">
                                {typeof doc.size === 'number'
                                  ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB`
                                  : doc.size}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                              {doc.name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setViewingClientDoc(doc)}
                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                            title="View / Download Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustDoc(doc.id)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setCustDocuments([]);
                    setCustDocUploadError(null);
                    setCustDocValidationError(false);
                    setShowCustDocWarningModal(false);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 font-extrabold text-slate-950 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Mandatory Document Required Warning Modal Popup */}
      {showCustDocWarningModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-shake">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                <AlertTriangle className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-300 dark:border-rose-800 font-mono">
                  Site KYC Compliance
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Mandatory Document Required
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                  Cannot register customer without supporting records! Please attach at least one site KYC document (e.g., Electricity Bill, Aadhaar, PAN, or Roof/Site Photo).
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustDocWarningModal(false);
                    custDocSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    custDocFileInputRef.current?.click();
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Attach KYC Document Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustDocWarningModal(false)}
                  className="w-full sm:w-auto py-2.5 px-4 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {recordingPaymentDoc && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-emerald-400 font-bold">Loading payment entry module...</div>}>
          <RecordPaymentModal
            invoice={recordingPaymentDoc}
            onClose={() => setRecordingPaymentDoc(null)}
            onSavePayment={handleSavePayment}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Money Receipt Viewer Modal */}
      {viewingReceiptData && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-emerald-400 font-bold">Loading money receipt voucher...</div>}>
          <ReceiptViewerModal
            receipt={viewingReceiptData.receipt}
            invoice={viewingReceiptData.invoice}
            onClose={() => setViewingReceiptData(null)}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Multi-Receipt Selection Modal */}
      {showReceiptsListForDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Payment Vouchers &amp; Receipts ({showReceiptsListForDoc.payments?.length || 0})
                </h3>
                <p className="text-xs text-slate-500 font-mono">Invoice: {showReceiptsListForDoc.documentNumber}</p>
              </div>
              <button
                onClick={() => setShowReceiptsListForDoc(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(showReceiptsListForDoc.payments || []).map((receipt, idx) => {
                const amt = receipt.amount ?? receipt.amountPaid ?? 0;
                const rDate = receipt.receiptDate || receipt.date || '';
                const rNote = receipt.installmentNote || receipt.notes || `Installment #${idx + 1}`;
                return (
                  <div
                    key={receipt.receiptNo || idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-emerald-500 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{receipt.receiptNo}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                          {rNote}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                        Date: {rDate} | Mode: {receipt.paymentMode} {receipt.referenceNo ? `(Ref: ${receipt.referenceNo})` : ''}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{amt.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => {
                          setViewingReceiptData({
                            receipt,
                            invoice: showReceiptsListForDoc,
                          });
                          setShowReceiptsListForDoc(null);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        View Voucher
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Total Collected: <strong className="text-emerald-600 font-mono font-bold">₹{(showReceiptsListForDoc.payments || []).reduce((s, p) => s + (p.amount ?? p.amountPaid ?? 0), 0).toLocaleString('en-IN')}</strong>
              </span>
              <button
                onClick={() => setShowReceiptsListForDoc(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Solar Quotation Modal */}
      {editingQuoteDoc && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-amber-400 font-bold">Loading editor...</div>}>
          <EditQuoteModal
            quote={editingQuoteDoc}
            onClose={() => setEditingQuoteDoc(null)}
            onSave={handleSaveEditedQuote}
          />
        </Suspense>
      )}

      {/* Cancel Solar Quotation Modal */}
      {cancellingQuoteDoc && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-rose-400 font-bold">Loading dialog...</div>}>
          <CancelQuoteModal
            quote={cancellingQuoteDoc}
            onClose={() => setCancellingQuoteDoc(null)}
            onConfirmCancel={handleConfirmCancelQuote}
          />
        </Suspense>
      )}

      {/* Camera Barcode / QR Serial Scanner Modal */}
      {serialScannerInvoice && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-amber-400 font-bold">Initializing camera scanner module...</div>}>
          <SerialScannerModal
            isOpen={!!serialScannerInvoice}
            invoice={serialScannerInvoice}
            onClose={() => setSerialScannerInvoice(null)}
            onSaveSerialNumbers={handleSaveSerialNumbers}
          />
        </Suspense>
      )}

      {/* Edit Tax Invoice Modal */}
      {editingInvoiceDoc && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-amber-400 font-bold">Loading invoice editor...</div>}>
          <EditInvoiceModal
            invoice={editingInvoiceDoc}
            inventory={inventory}
            onClose={() => setEditingInvoiceDoc(null)}
            onSave={handleSaveEditedInvoice}
          />
        </Suspense>
      )}

      {/* Owner Authorization Deletion Modal */}
      {deleteTargetDoc && (
        <Suspense fallback={null}>
          <OwnerApprovalModal
            isOpen={Boolean(deleteTargetDoc)}
            onClose={() => setDeleteTargetDoc(null)}
            onConfirm={() => handleDeleteDocument(deleteTargetDoc)}
            itemTitle={`${deleteTargetDoc.type} #${deleteTargetDoc.documentNumber}`}
            itemSubtitle={`Customer: ${deleteTargetDoc.customerName} • Total: ₹${deleteTargetDoc.grandTotal.toLocaleString('en-IN')}`}
            itemType={deleteTargetDoc.type}
          />
        </Suspense>
      )}

      {/* Delivery Challan Modal (Dual Copy Print) */}
      {deliveryChallanDoc && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-amber-400 font-bold">Loading Delivery Challan...</div>}>
          <DeliveryChallanModal
            invoice={deliveryChallanDoc}
            onClose={() => setDeliveryChallanDoc(null)}
          />
        </Suspense>
      )}

      {/* e-Way Bill Modal (Standard NIC GST Format) */}
      {ewayBillDoc && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-amber-400 font-bold">Loading e-Way Bill...</div>}>
          <EWayBillModal
            invoice={ewayBillDoc}
            onClose={() => setEwayBillDoc(null)}
          />
        </Suspense>
      )}

      {/* Customer Details & KYC Document Vault Modal */}
      {selectedCustomerForDetails && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-amber-400 font-bold">Loading Customer Vault...</div>}>
          <CustomerDetailsModal
            customer={selectedCustomerForDetails}
            onClose={() => setSelectedCustomerForDetails(null)}
            onUpdateCustomer={handleUpdateCustomerProfile}
          />
        </Suspense>
      )}

      {/* Standalone Document Viewer Modal */}
      {viewingClientDoc && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs text-amber-400 font-bold">Loading Document Viewer...</div>}>
          <DocumentViewerModal
            document={viewingClientDoc}
            onClose={() => setViewingClientDoc(null)}
          />
        </Suspense>
      )}

    </div>
  );
};

export interface CompanyCredentials {
  companyName: string;
  tagline: string;
  address: string;
  mobile: string;
  pan: string;
  gstin: string;
  stateCode: string;
  email: string;
  ownerName: string;
}

export type Language = 'en' | 'bn';

export type AppThemeMode = 'auto' | 'light' | 'dark';

export type AppMode = 'blueprint' | 'app_demo';

export type ClientDocumentCategory =
  | 'Electricity Bill (Discom Consumer Copy)'
  | 'Aadhaar / Voter ID'
  | 'PAN Card'
  | 'Roof Ownership / Land Deed'
  | 'Site / Roof Photo'
  | 'Other Document';

export interface ClientDocument {
  id: string;
  category: ClientDocumentCategory;
  name: string;
  size: number | string;
  dataUrl: string;
  uploadedAt?: string;
  mimeType?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  state: string;
  stateCode: string;
  pinCode: string;
  pincode?: string;
  category: 'Domestic' | 'Commercial';
  gstin?: string;
  status: 'active' | 'inactive';
  documents?: ClientDocument[];
}

export type Client = Customer;

export interface StockLogEntry {
  id: string;
  itemCode: string;
  date: string; // ISO format or YYYY-MM-DD
  type: 'INWARD' | 'OUTWARD' | 'ADJUSTMENT' | 'INWARD_GRN' | 'OUTWARD_INVOICE'; // Inward (Purchase), Outward (Invoice Issued), Adjustment
  quantity: number; // Positive for INWARD, Negative for OUTWARD
  balanceAfter: number;
  referenceDocType?: 'TAX_INVOICE' | 'PURCHASE_RECEIPT' | 'INITIAL_STOCK' | 'MANUAL_CORRECTION' | 'INWARD_GRN' | 'OUTWARD_INVOICE';
  referenceDocNo?: string; // e.g. SLE/INV/2026/008 or GRN-2026-004
  partyName?: string; // Supplier name or Customer name (e.g. Mondal Cold Storage Pvt Ltd)
  remarks: string;
  recordedBy: string; // Haradhan Patra
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  description?: string;
  category: 'Solar Panel' | 'Inverter' | 'Battery' | 'Mounting Structure' | 'Cable & Wiring' | 'Accessories' | (string & {});
  unit: 'Pcs' | 'Meters' | 'Sets' | 'Watts';
  buyPrice?: number; // Purchase / Inward cost (e.g., ₹12,000)
  unitRate: number; // Selling / Quotation price (e.g., ₹14,500)
  gstPercent: number; // e.g. 12 or 18% GST default from stock
  gstRate?: number; // Total GST % (e.g. 18)
  cgstRate?: number; // e.g., 9%
  sgstRate?: number; // e.g., 9%
  igstRate?: number; // e.g., 18%
  stockLevel: number;
  currentStock?: number;
  minStockAlert: number;
  specifications?: string;
  hsnCode?: string; // HSN/SAC Code for GST compliance (e.g. 85017200, 850440)
  availableSerialNumbers?: string[]; // Equipment serial numbers in stock ready for allocation
}

export interface DocumentLineItem {
  id: string;
  itemId: string;
  itemCode: string;
  description: string;
  descriptionBn?: string;
  hsnCode?: string; // HSN/SAC Code (e.g. "85017200" for Panels, "850440" for Inverters)
  stockQty?: number; // Read-only stock level at selection time
  quantity: number; // Billed / Issued quantity
  unit: string;
  unitRate: number;
  taxRatePercent: number; // e.g. 12% or 18% GST for solar components
  amount: number;
  serialNumbers?: string[]; // Serial numbers scanned or assigned to this line item
}

export type DocumentType = 'Quotation' | 'Invoice';
export type QuotationStatus = 'Draft' | 'Pending' | 'Approved' | 'Cancelled' | 'Expired';
export type DocumentStatus = 'Draft' | 'Pending' | 'Sent' | 'Approved' | 'Paid' | 'Cancelled' | 'Expired';

export interface SolarQuotation {
  docNumber: string;         // e.g. SLE/QT/2026/369
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  capacityKw: number;
  date: string;              // YYYY-MM-DD
  validUntil: string;        // Validity date (e.g. +30 days)
  items: Array<{
    itemCode: string;
    description: string;
    quantity: number;
    unitRate: number;
    gstRate: number;
    amount: number;
  }>;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  discount: number;
  estimatedSubsidy: number;
  netPayable: number;
  status: QuotationStatus;   // 'Draft' | 'Pending' | 'Approved' | 'Cancelled' | 'Expired'
  cancellationReason?: string;
}

export interface PaymentReceipt {
  id?: string;
  receiptNo: string;        // e.g. SLE/REC/2026/676-1, SLE/REC/2026/676-2
  receiptDate: string;      // YYYY-MM-DD
  date?: string;            // Fallback / legacy alias
  amount: number;           // Amount paid in this specific installment
  amountPaid?: number;      // Fallback / legacy alias
  paymentMode: 'UPI / GPay' | 'NEFT / RTGS' | 'Cheque' | 'Cash' | 'Bank Transfer';
  referenceNo?: string;     // UTR No / Cheque No / Transaction ID
  installmentNote?: string; // e.g. "Advance 30%", "Material delivery dispatch", "Final balance"
  notes?: string;           // Fallback / legacy alias
  recordedBy: string;       // "Haradhan Patra"
  invoiceNo?: string;
}

export type PaymentRecord = PaymentReceipt;

export interface ProjectExpenses {
  transportationCost: number; // Freight, tempo, vehicle fuel
  laborCost: number;          // Technician, structure mounting & electrician wages
  otherCost: number;          // Net-metering liaisoning, discom paperwork, civil work
  expenseNotes?: string;
}

export interface InvoiceProfitSummary {
  invoiceNo: string;
  customerName: string;
  capacityKw: number;
  invoiceDate: string;
  taxableRevenue: number;     // Subtotal before GST
  productCost: number;        // ∑ (item.buyPrice * item.quantity)
  expenses: ProjectExpenses;
  totalExpenses: number;      // productCost + transportation + labor + other
  netProfit: number;          // taxableRevenue - totalExpenses
  marginPercentage: number;   // (netProfit / taxableRevenue) * 100
}

export interface QuotationInvoice {
  id: string;
  documentNumber: string; // e.g. SLE/QT/2026/089 or SLE/INV/2026/042
  invoiceNo?: string;     // Alias for documentNumber
  referenceQuotationNo?: string; // Link to original quotation e.g. SLE/QT/2026/089
  type: DocumentType;
  date: string;
  validUntilOrDueDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGstin?: string;
  customerCategory: 'Domestic' | 'Commercial';
  systemCapacityKw?: number; // Solar specific: e.g. 5.0 kW
  items: DocumentLineItem[];
  subtotal: number;
  taxTotal: number;
  taxableTotal?: number;
  totalGst?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  isWestBengal?: boolean;
  customerState?: string;
  customerStateCode?: string;
  discount: number;
  subsidyEstimate?: number; // Govt Solar Subsidy estimate (PM Surya Ghar / State)
  grandTotal: number;
  status: DocumentStatus;
  payments: PaymentReceipt[]; // Array of all payment installments
  totalPaid: number;          // Computed dynamically: ∑ (payments.map(p => p.amount))
  dueAmount: number;          // Computed dynamically: grandTotal - totalPaid
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'Paid';
  notes?: string;
  termsAndConditions?: string;
  createdByName: string; // Haradhan Patra
  cancellationReason?: string; // Reason when quotation or invoice is marked as Cancelled
  expenses?: ProjectExpenses;
}

export type Invoice = QuotationInvoice;

export interface TechStackItem {
  layer: string;
  recommended: string;
  alternatives: string[];
  justification: string;
  keyLibraries: string[];
}

export interface ApiEndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
  requestBody?: string;
  responseBody: string;
}

export interface TimelineMilestone {
  week: string;
  phase: string;
  title: string;
  deliverables: string[];
  status: 'Completed' | 'In Progress' | 'Planned';
}

export * from './types/supplier';
export * from './types/challan';
export * from './types/invoice';
export * from './types/finance';
export * from './types/nonPoGrn';


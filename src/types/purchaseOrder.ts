export type POStatus = 'Open' | 'Partially Inwarded' | 'Fully Inwarded' | 'Cancelled';

export type POType = 'Regular Procurement' | 'High Sea' | 'Job-Work';

export type POGroupName = 'Solar Modules' | 'Inverters' | 'Battery' | 'Structures' | 'Cables' | 'BOS';

export interface POItemAllocation {
  buyerName: string;
  quantity: number;
}

export interface POLineItem {
  id: string;
  itemCode: string;
  description: string;
  hsnCode: string;
  unit: string;
  quantity: number; // Ordered Qty
  freeBalance?: number;
  allocations?: POItemAllocation[];
  unitRate: number;
  totalTaxable: number;
  taxType: string; // GST
  taxSubType?: string;
  taxRatePercent: number; // 0, 5, 12, 18, 28
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalWithTax: number;
  dueOn: string;
  posVarPercent: number; // (+) Var %
  negVarPercent: number; // (-) Var %
  inwardedQty: number; // Cumulative inwarded so far
}

export interface POInwardLog {
  id: string;
  grnNo: string;
  date: string;
  itemId: string;
  itemDescription: string;
  quantity: number;
  poQty?: number;
  poRate?: number;
  recvRate?: number;
  addlCharge?: number;
  amount?: number;
  receivedBy: string;
  supplierInvoiceNo?: string;
  invoiceDate?: string;
  weighbridgeNo?: string;
  vehicleNo?: string;
  grnWeight?: string | number;
  notes?: string;
  serialNumbers?: string[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. SLE/PO/2026/001
  poDate: string; // YYYY-MM-DD
  buyerOrderNo?: string;
  invoiceTo: string;
  dispatchTo: string;
  poType: POType;
  groupName: POGroupName;
  shortCategory: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  supplierRef?: string;
  division: string;
  forFactory: string;
  items: POLineItem[];
  paymentTerms: string;
  dispatchThrough?: string;
  destination?: string;
  deliveryTerms?: string;
  remarks: string;
  accessoriesCartage: number;
  accessoriesOthersFor: string;
  accessoriesOthersAmount: number;
  discount: number;
  subtotalTaxable: number;
  totalTax: number;
  grandTotal: number;
  status: POStatus;
  createdBy: string;
  createdAt: string;
  inwardLogs: POInwardLog[];
}

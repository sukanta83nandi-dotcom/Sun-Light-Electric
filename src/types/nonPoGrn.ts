export interface NonPoGrnRecord {
  id: string;
  slNo?: number;
  grnNo: string; // e.g. "NP-GRN-2026-001"
  date: string; // YYYY-MM-DD
  place?: string;
  gateReceiptNo: string; // e.g. "GT-8941"
  invoiceNo: string; // e.g. "INV-EXP-4521"
  supplierName: string; // e.g. "Pursurah Industrial Hardware Store"
  supplierId?: string;
  itemName: string; // e.g. "Heavy Duty PVC Insulation Tape & Binding Wire"
  receivedQty: number; // e.g. 50
  uom: 'Bales' | 'PCS' | 'Sets' | 'Kgs' | 'Mtrs' | 'Rolls' | 'Box' | 'Nos' | string;
  currency: string; // 'INR (₹)'
  amount: number; // e.g. 3500
  weight: number; // in Kgs e.g. 15.0
  weightPerUnit: number; // weight / receivedQty e.g. 0.30
  qtyVerifiedBy?: string;
  mirStatus?: 'Required' | 'Not Required' | 'Req' | 'Not Req' | string;
  mirReq?: string;
  merchandiser?: string; // e.g. "Haradhan Patra", "Subrata Ghosh", "Amit Sen", "Rajib Das"
  vehicleNo: string; // e.g. "WB-15-E-4589"
  weighbridgeNo: string; // e.g. "WB-PURS-094"
  remarks: string;
  createdAt: string;
}

export interface NonPoGrnFilter {
  gateReceiptNo: string;
  invoiceNo: string;
  supplierName: string;
  itemName: string;
  dateFrom: string;
  dateTo: string;
}

export const INITIAL_NON_PO_GRN_RECORDS: NonPoGrnRecord[] = [];


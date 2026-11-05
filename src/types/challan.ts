export interface ChallanItem {
  id: string;
  itemDescription: string;     // e.g. "PHOTOVOLTAIC (PV) DC POWER HJT 730W"
  hsnCode: string;             // e.g. "85017200"
  category: string;            // e.g. "Solar Panel", "Inverter", etc.
  quantity: number;            // e.g. 6 PCS
  unit: string;                // "PCS", "SETS", "METERS", etc.
  unitPrice: number;           // e.g. 12702 (Taxable Rate)
  taxRate: number;             // e.g. 5 (2.5% CGST + 2.5% SGST)
  totalTaxableAmount: number;  // e.g. 76,212.00
  cgstAmount?: number;         // e.g. 1,905.30
  sgstAmount?: number;         // e.g. 1,905.30
  igstAmount?: number;
  totalWithTax?: number;       // e.g. 80,022.60
  matchingSkuCode?: string;    // If linked to existing inventory SKU e.g. "SP-HJT-730"
  serialNumbers?: string[];    // Captured serial numbers inwarded with this item
}

export interface SupplierChallan {
  id: string;
  challanCode?: string;        // e.g. "GRN-2026-001"
  supplierId: string;          // e.g. "SUP-007"
  supplierName: string;        // e.g. "LOOM SOLAR PRIVATE LIMITED"
  supplierGstin: string;       // e.g. "19AADCL6607J1Z9"
  supplierPhone?: string;
  challanInvoiceNo: string;    // e.g. "WB/SL/126/27"
  challanDate: string;         // e.g. "2026-05-06"
  eWayBillNo?: string;         // e.g. "881682871188"
  vehicleNo?: string;          // e.g. "WB18AP2877"
  dispatchFrom?: string;       // e.g. "Natibpur, NH-6, Howrah"
  destinationSite: string;     // e.g. "SOALUK, Pursurah, Hooghly"
  items: ChallanItem[];
  totalTaxable: number;        // ₹1,20,462.00
  totalTax: number;            // ₹6,023.10
  grandTotal: number;          // ₹1,26,485.00
  documentUrl?: string;        // Uploaded scan/PDF of Challan
  documentName?: string;
  status: 'Verified & Stock Inwarded' | 'Received (Pending Inflow)' | 'Verified';
  directInflowApplied: boolean;
  receivedBy: string;          // "Haradhan Patra"
  notes?: string;
  createdAt: string;
}

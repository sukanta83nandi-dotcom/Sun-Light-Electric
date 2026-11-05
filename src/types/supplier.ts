export interface SupplierDocument {
  id: string;
  name: string;
  size: string;
  type: string;
  category?: string;
  uploadedAt?: string;
  dataUrl?: string; // base64 representation
}

export interface Supplier {
  id: string;
  supplierCode: string;          // e.g. "SUP-2026-001"
  companyName: string;           // e.g. "Waaree Solar Distributors Pvt Ltd"
  contactPerson: string;         // e.g. "Amit Sharma"
  phone: string;                 // e.g. "+91 98300 12345"
  email: string;
  gstin: string;                 // 15-digit GSTIN
  address: string;
  state: string;
  categorySupplied: string;      // e.g. "Solar Panels", "Inverters", "Structures", "Cables & Wiring", "Batteries"
  paymentTermsDays?: number;     // e.g. 30 Days Credit
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifscCode: string;
  };
  balancePayable: number;        // ₹ Outstanding dues to supplier
  documents?: SupplierDocument[];
}


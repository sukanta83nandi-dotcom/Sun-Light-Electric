export type NoteType = 'Debit Note' | 'Credit Note';

export type NotePartyType = 'Buyer' | 'Supplier' | 'Tenant';

export type NoteStatus = 'Approved' | 'Open' | 'Pending' | 'Closed' | 'Cancelled';

export type NoteLocation = 'HO' | 'Kalyani' | 'Pursurah' | 'Falta';

export type NoteCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export type GstTaxType = 'IGST' | 'CGST + SGST' | 'Nil';

export interface NoteParticularItem {
  id: string;
  particulars: string;
  hsnNo: string;
  costCenter: string;
  currency: NoteCurrency;
  exchangeRate: number;
  amount: number;
}

export interface NoteGstDetails {
  taxType: GstTaxType;
  percentage: number; // 0, 5, 12, 18, 28
  costCenter: string;
  currency: NoteCurrency;
  amount: number;
}

export interface NoteHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  note?: string;
}

export interface FinanceNote {
  id: string;
  noteNumber: string; // e.g. DN-5596, CN-275
  noteType: NoteType;
  partyType: NotePartyType;
  location: NoteLocation;
  partyCode: string; // e.g. CUST-101, SUP-201
  partyName: string;
  contactEmail: string;
  date: string; // YYYY-MM-DD
  status: NoteStatus;
  particulars: NoteParticularItem[];
  gstDetails: NoteGstDetails;
  totalBaseAmount: number;
  totalGstAmount: number;
  grandTotal: number;
  currency: NoteCurrency;
  approvedBy: string; // e.g. Haradhan Patra, Anil Kariwala, Manish Todi
  approvedOn?: string;
  cancelledOn?: string;
  cancelledBy?: string;
  remarks: string;
  generatedBy: string;
  generatedOn: string; // e.g. 18-Oct-26
  requestSentOn?: string;
  admitDate?: string;
  referenceInvoiceNo?: string;
  history: NoteHistoryEntry[];
}

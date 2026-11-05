import { Customer, InventoryItem, QuotationInvoice, TechStackItem, ApiEndpointSpec, TimelineMilestone, CompanyCredentials, StockLogEntry } from '../types';

export const COMPANY_CREDENTIALS: CompanyCredentials = {
  companyName: 'SUN LIGHT ELECTRIC',
  tagline: 'Domestic & Commercial Solar Solutions',
  address: 'SOALUK, PURSURAH, HOOGHLY, WEST BENGAL, 712410',
  mobile: '7908798079',
  pan: 'AZEPP1218L',
  gstin: '19AZEPP1218L1Z5',
  stateCode: 'WB 19',
  email: 'sunlightelectric.1984@gmail.com',
  ownerName: 'Haradhan Patra',
};

export const OFFICIAL_BANK_DETAILS = {
  accountName: 'Sun Light Electric / Haradhan Patra',
  bankName: 'HDFC BANK',
  branch: 'DEHIBATPUR BRANCH',
  accountNumber: '50200058552107',
  ifscCode: 'HDFC0003506',
  upiId: '7908798079@upi',
};

export const INDIAN_STATES: { state: string; stateCode: string; label: string }[] = [
  { state: 'West Bengal', stateCode: '19', label: 'West Bengal (19)' },
  { state: 'Andaman and Nicobar Islands', stateCode: '35', label: 'Andaman and Nicobar Islands (35)' },
  { state: 'Andhra Pradesh', stateCode: '37', label: 'Andhra Pradesh (37)' },
  { state: 'Arunachal Pradesh', stateCode: '12', label: 'Arunachal Pradesh (12)' },
  { state: 'Assam', stateCode: '18', label: 'Assam (18)' },
  { state: 'Bihar', stateCode: '10', label: 'Bihar (10)' },
  { state: 'Chandigarh', stateCode: '04', label: 'Chandigarh (04)' },
  { state: 'Chhattisgarh', stateCode: '22', label: 'Chhattisgarh (22)' },
  { state: 'Dadra and Nagar Haveli and Daman and Diu', stateCode: '26', label: 'Dadra & Nagar Haveli and Daman & Diu (26)' },
  { state: 'Delhi', stateCode: '07', label: 'Delhi (07)' },
  { state: 'Goa', stateCode: '30', label: 'Goa (30)' },
  { state: 'Gujarat', stateCode: '24', label: 'Gujarat (24)' },
  { state: 'Haryana', stateCode: '06', label: 'Haryana (06)' },
  { state: 'Himachal Pradesh', stateCode: '02', label: 'Himachal Pradesh (02)' },
  { state: 'Jammu and Kashmir', stateCode: '01', label: 'Jammu & Kashmir (01)' },
  { state: 'Jharkhand', stateCode: '20', label: 'Jharkhand (20)' },
  { state: 'Karnataka', stateCode: '29', label: 'Karnataka (29)' },
  { state: 'Kerala', stateCode: '32', label: 'Kerala (32)' },
  { state: 'Ladakh', stateCode: '38', label: 'Ladakh (38)' },
  { state: 'Lakshadweep', stateCode: '31', label: 'Lakshadweep (31)' },
  { state: 'Madhya Pradesh', stateCode: '23', label: 'Madhya Pradesh (23)' },
  { state: 'Maharashtra', stateCode: '27', label: 'Maharashtra (27)' },
  { state: 'Manipur', stateCode: '14', label: 'Manipur (14)' },
  { state: 'Meghalaya', stateCode: '17', label: 'Meghalaya (17)' },
  { state: 'Mizoram', stateCode: '15', label: 'Mizoram (15)' },
  { state: 'Nagaland', stateCode: '13', label: 'Nagaland (13)' },
  { state: 'Odisha', stateCode: '21', label: 'Odisha (21)' },
  { state: 'Puducherry', stateCode: '34', label: 'Puducherry (34)' },
  { state: 'Punjab', stateCode: '03', label: 'Punjab (03)' },
  { state: 'Rajasthan', stateCode: '08', label: 'Rajasthan (08)' },
  { state: 'Sikkim', stateCode: '11', label: 'Sikkim (11)' },
  { state: 'Tamil Nadu', stateCode: '33', label: 'Tamil Nadu (33)' },
  { state: 'Telangana', stateCode: '36', label: 'Telangana (36)' },
  { state: 'Tripura', stateCode: '16', label: 'Tripura (16)' },
  { state: 'Uttar Pradesh', stateCode: '09', label: 'Uttar Pradesh (09)' },
  { state: 'Uttarakhand', stateCode: '05', label: 'Uttarakhand (05)' },
];

export const DEFAULT_TERMS_AND_CONDITIONS = `TERMS AND CONDITIONS
1. Please Pay By A/C Payee Cheque Only
2. seller's liability ceases with delivery tocarrier's godown or at workside.
3. Loading & Delivery Charges Extra At Actual.
4. MATERIAL VALUE FLUCTUATIONS BILL CHANGES.
5. QUOTATION Brand Materials not available Another Brand Company supply.
6. 100%ADVANCE PAYMENT, 7-15 DAY TO LATE Delivery.`;

// All demo transaction and master data cleared to empty arrays
export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_DOCUMENTS: QuotationInvoice[] = [];

export const INITIAL_STOCK_LOGS: StockLogEntry[] = [];

export const TECH_STACK_SUMMARY: TechStackItem[] = [];

export const API_ENDPOINTS: ApiEndpointSpec[] = [];

export const TIMELINE_ROADMAP: TimelineMilestone[] = [];

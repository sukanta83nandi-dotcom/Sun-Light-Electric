import { utils, read, writeFile } from 'xlsx';
import { Customer } from '../types';
import { INDIAN_STATES } from '../data/mockData';
import {
  createAuditEntry,
  diffCustomerFields,
  ensureInitialAuditHistory,
  DEFAULT_AUDIT_USER,
} from './auditHelper';

export const CUSTOMER_TEMPLATE_HEADERS = [
  'ID',
  'Customer Name *',
  'Contact Person',
  'Last Invoice Dt.',
  'Code',
  'Site Survey / Inspection',
  'Address *',
  'Location',
  'Currency',
  'Email',
  'SPOC Email ID',
  'Finance Email ID',
  'Phone / Mobile *',
  'Type',
  'Credit Period',
  'Terms of Payment',
  'Dispatch Through',
  'Terms of Delivery',
  'TDS',
  'GST No Reqd',
  'GSTIN',
  'State Code',
  'Status',
] as const;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Derive Within State / Out of State from State Code (19 = West Bengal) or State Name.
 */
export const deriveLocationType = (
  state?: string,
  stateCode?: string
): 'Within State' | 'Out of State' => {
  const code = (stateCode || '').trim();
  const st = (state || '').trim().toLowerCase();
  if (code === '19' || st.includes('west bengal')) {
    return 'Within State';
  }
  if (code || st) {
    return 'Out of State';
  }
  return 'Within State';
};

/**
 * Derive compact 4-letter client code if not provided.
 */
export const deriveClientCode = (name: string, providedCode?: string): string => {
  const clean = (providedCode || '').trim().toUpperCase();
  if (clean) return clean.slice(0, 8);
  const lettersOnly = (name || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  if (lettersOnly.length >= 4) return lettersOnly.slice(0, 4);
  if (lettersOnly.length > 0) return lettersOnly.padEnd(4, 'X');
  return 'CLNT';
};

/**
 * Generate compact sequential ID (C1, C2, C3...).
 */
export const generateNextCustomerId = (existingCustomers: Customer[]): string => {
  let maxSeq = 0;
  existingCustomers.forEach((c) => {
    const cMatch = c.id.match(/^C(\d+)$/i);
    if (cMatch) {
      const n = parseInt(cMatch[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
    const legacyMatch = c.id.match(/CUST-(\d+)/i);
    if (legacyMatch) {
      const n = parseInt(legacyMatch[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });
  return `C${maxSeq + 1}`;
};

/**
 * Normalize date input (Excel serial, YYYY-MM-DD, DD-MMM-YY, DD/MM/YYYY) into ISO YYYY-MM-DD for storage.
 */
export const normalizeIsoDate = (raw: unknown): string => {
  if (raw === undefined || raw === null || raw === '') return '';

  // Excel serial date number
  if (typeof raw === 'number' && raw > 20000 && raw < 100000) {
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  const str = String(raw).trim();
  if (!str) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD-MMM-YY or DD-MMM-YYYY (e.g., 28-Oct-26 or 28-Oct-2026)
  const ddMmmYy = str.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{2,4})$/);
  if (ddMmmYy) {
    const day = ddMmmYy[1].padStart(2, '0');
    const monthIdx = MONTHS_SHORT.findIndex(
      (m) => m.toLowerCase() === ddMmmYy[2].toLowerCase()
    );
    if (monthIdx >= 0) {
      const yrNum = parseInt(ddMmmYy[3], 10);
      const fullYear = ddMmmYy[3].length === 2 ? 2000 + yrNum : yrNum;
      return `${fullYear}-${String(monthIdx + 1).padStart(2, '0')}-${day}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddMmYyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (ddMmYyyy) {
    const day = ddMmYyyy[1].padStart(2, '0');
    const month = ddMmYyyy[2].padStart(2, '0');
    const yr = ddMmYyyy[3].length === 2 ? `20${ddMmYyyy[3]}` : ddMmYyyy[3];
    return `${yr}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return str;
};

/**
 * Format stored date as DD-MMM-YY (e.g., 28-Oct-26).
 */
export const formatErpDate = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return '—';
  const iso = normalizeIsoDate(dateStr);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const yr = match[1].slice(-2);
    const monthIdx = parseInt(match[2], 10) - 1;
    const day = match[3];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${MONTHS_SHORT[monthIdx]}-${yr}`;
    }
  }
  return dateStr;
};

/**
 * Build multi-line wrapped full address string without repeating already-included segments.
 */
export const formatFullAddress = (c: Customer): string => {
  const base = (c.address || '').trim();
  const baseLower = base.toLowerCase();
  const extras: string[] = [];

  if (c.city && !baseLower.includes(c.city.trim().toLowerCase())) {
    extras.push(c.city.trim());
  }
  if (c.district && !baseLower.includes(c.district.trim().toLowerCase())) {
    extras.push(c.district.trim());
  }
  if (c.state && !baseLower.includes(c.state.trim().toLowerCase())) {
    extras.push(c.state.trim());
  }
  const pin = (c.pinCode || c.pincode || '').trim();
  if (pin && !baseLower.includes(pin.toLowerCase())) {
    extras.push(pin);
  }

  if (!base && extras.length === 0) return '—';
  if (extras.length === 0) return base;
  return base ? `${base}, ${extras.join(', ')}` : extras.join(', ');
};

/**
 * Generate and download a standardized Excel Template (.xlsx) matching the 23-column ERP grid.
 */
export const downloadCustomerExcelTemplate = (
  filename = 'SunLight_Electric_Customer_Template.xlsx'
) => {
  const sampleRows = [
    {
      'ID': 'C1',
      'Customer Name *': 'Anirban Chatterjee',
      'Contact Person': 'Anirban Chatterjee',
      'Last Invoice Dt.': '28-Oct-26',
      'Code': 'ANIR',
      'Site Survey / Inspection': 'Required',
      'Address *': 'Station Road, Near Tarakeswar Bus Stand, Pursurah, Hooghly, West Bengal - 712410',
      'Location': 'Within State',
      'Currency': 'Rs.',
      'Email': 'anirban.chatterjee@example.in',
      'SPOC Email ID': 'anirban.site@example.in',
      'Finance Email ID': 'anirban.accounts@example.in',
      'Phone / Mobile *': '+91 98301 44512',
      'Type': 'Domestic',
      'Credit Period': '0',
      'Terms of Payment': 'Advance',
      'Dispatch Through': 'Company Vehicle',
      'Terms of Delivery': 'Site Delivery',
      'TDS': 'No',
      'GST No Reqd': 'No',
      'GSTIN': '',
      'State Code': '19',
      'Status': 'Active',
    },
    {
      'ID': 'C2',
      'Customer Name *': 'Bengal Agro Cold Storage Pvt Ltd',
      'Contact Person': 'Subhajit Mondal',
      'Last Invoice Dt.': '04-Nov-26',
      'Code': 'BENG',
      'Site Survey / Inspection': 'Required',
      'Address *': 'Plot 14, NH-2 Industrial Estate, Memari, Purba Bardhaman, West Bengal - 713146',
      'Location': 'Within State',
      'Currency': 'Rs.',
      'Email': 'info@bengalagro.example.in',
      'SPOC Email ID': 'projects@bengalagro.example.in',
      'Finance Email ID': 'accounts@bengalagro.example.in',
      'Phone / Mobile *': '+91 94340 77890',
      'Type': 'Commercial',
      'Credit Period': '15',
      'Terms of Payment': 'Net 15 Days',
      'Dispatch Through': 'By Road',
      'Terms of Delivery': 'Door Delivery',
      'TDS': '2%',
      'GST No Reqd': 'Yes',
      'GSTIN': '19AABCB4567D1Z8',
      'State Code': '19',
      'Status': 'Active',
    },
  ];

  const templateSheet = utils.json_to_sheet(sampleRows, {
    header: [...CUSTOMER_TEMPLATE_HEADERS],
  });

  templateSheet['!cols'] = [
    { wch: 8 },   // ID
    { wch: 30 },  // Customer Name *
    { wch: 22 },  // Contact Person
    { wch: 16 },  // Last Invoice Dt.
    { wch: 10 },  // Code
    { wch: 24 },  // Site Survey / Inspection
    { wch: 46 },  // Address *
    { wch: 16 },  // Location
    { wch: 10 },  // Currency
    { wch: 28 },  // Email
    { wch: 28 },  // SPOC Email ID
    { wch: 28 },  // Finance Email ID
    { wch: 18 },  // Phone / Mobile *
    { wch: 14 },  // Type
    { wch: 14 },  // Credit Period
    { wch: 26 },  // Terms of Payment
    { wch: 18 },  // Dispatch Through
    { wch: 18 },  // Terms of Delivery
    { wch: 10 },  // TDS
    { wch: 14 },  // GST No Reqd
    { wch: 20 },  // GSTIN
    { wch: 12 },  // State Code
    { wch: 12 },  // Status
  ];

  const instructionsData = [
    {
      'Column Name': 'Mandatory Fields (*)',
      'Requirement': 'Required',
      'Accepted Values & Formatting Rules':
        'Customer Name * and Phone / Mobile * are strictly mandatory for bulk upload; rows missing either will be skipped and reported. Address * should contain full street, city, district, state, and 6-digit PIN.',
    },
    {
      'Column Name': 'ID',
      'Requirement': 'Optional (Auto-generated)',
      'Accepted Values & Formatting Rules':
        'Compact client code (e.g., C1, C2, C3). Leave blank for new records to auto-generate the next ID.',
    },
    {
      'Column Name': 'Last Invoice Dt.',
      'Requirement': 'Optional',
      'Accepted Values & Formatting Rules':
        'DD-MMM-YY format (e.g., 28-Oct-26) or YYYY-MM-DD.',
    },
    {
      'Column Name': 'Code',
      'Requirement': 'Optional (Auto-derived)',
      'Accepted Values & Formatting Rules':
        'Short 4-letter client code (e.g., SUNL, BENG). Auto-derived from Customer Name if left blank.',
    },
    {
      'Column Name': 'Site Survey / Inspection',
      'Requirement': 'Optional (Defaults to Required)',
      'Accepted Values & Formatting Rules':
        'Accepted values: "Required" or "Not Required".',
    },
    {
      'Column Name': 'Location & State Code',
      'Requirement': 'Auto-derived / Optional',
      'Accepted Values & Formatting Rules':
        'State Code defaults to "19" (West Bengal), or is auto-extracted from the first 2 digits of GSTIN. Location is automatically set to "Within State" for State Code 19 and "Out of State" otherwise.',
    },
    {
      'Column Name': 'Currency',
      'Requirement': 'Optional (Defaults to Rs.)',
      'Accepted Values & Formatting Rules':
        'Default: "Rs."',
    },
    {
      'Column Name': 'Type',
      'Requirement': 'Optional (Defaults to Domestic)',
      'Accepted Values & Formatting Rules':
        'Accepted values: "Domestic" or "Commercial".',
    },
    {
      'Column Name': 'Credit Period, Terms of Payment, Dispatch Through, Terms of Delivery',
      'Requirement': 'Commercial Terms',
      'Accepted Values & Formatting Rules':
        'Credit Period in days (0, 7, 15, 30); Terms of Payment (e.g., Advance, Documents against Payment, Net 15 Days); Dispatch Through (By Road, Courier, Company Vehicle); Terms of Delivery (Ex-Works, Door Delivery, Site Delivery).',
    },
    {
      'Column Name': 'TDS, GST No Reqd, GSTIN',
      'Requirement': 'Tax & GST',
      'Accepted Values & Formatting Rules':
        'TDS: "Yes", "No", or percentage (e.g., "2%"). GST No Reqd: "Yes" or "No" (defaults to "Yes" if GSTIN is provided). GSTIN: 15-character GST number.',
    },
    {
      'Column Name': 'Status',
      'Requirement': 'Optional (Defaults to Active)',
      'Accepted Values & Formatting Rules':
        'Accepted values: "Active" or "Inactive".',
    },
  ];

  const instructionsSheet = utils.json_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 36 }, { wch: 28 }, { wch: 95 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, templateSheet, 'Customer Template');
  utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  writeFile(workbook, filename);
};

/**
 * Export customer list to Excel file (.xlsx) matching the 1-to-1 ERP grid columns.
 * Returns true if exported, false if list is empty.
 */
export const exportCustomersToExcel = (
  customers: Customer[],
  filename = 'SunLight_Customers_Directory.xlsx'
): boolean => {
  if (!customers || customers.length === 0) {
    return false;
  }

  const exportData = customers.map((c) => {
    const location = c.locationType || deriveLocationType(c.state, c.stateCode);
    const gstReq = c.gstNoRequired || (c.gstin ? 'Yes' : 'No');
    return {
      'ID': c.id,
      'Customer Name *': c.name,
      'Contact Person': c.contactPerson || '',
      'Last Invoice Dt.': c.lastInvoiceDate ? formatErpDate(c.lastInvoiceDate) : '',
      'Code': c.code || deriveClientCode(c.name),
      'Site Survey / Inspection': c.siteSurveyRequired || 'Required',
      'Address *': formatFullAddress(c),
      'Location': location,
      'Currency': c.currency || 'Rs.',
      'Email': c.email || '',
      'SPOC Email ID': c.spocEmail || '',
      'Finance Email ID': c.financeEmail || '',
      'Phone / Mobile *': c.phone,
      'Type': c.category,
      'Credit Period': c.creditPeriodDays ?? '0',
      'Terms of Payment': c.termsOfPayment || 'Advance',
      'Dispatch Through': c.dispatchThrough || 'Company Vehicle',
      'Terms of Delivery': c.termsOfDelivery || 'Site Delivery',
      'TDS': c.tds || 'No',
      'GST No Reqd': gstReq,
      'GSTIN': c.gstin || '',
      'State Code': c.stateCode || '19',
      'Status': c.status === 'inactive' ? 'Inactive' : 'Active',
    };
  });

  const worksheet = utils.json_to_sheet(exportData, {
    header: [...CUSTOMER_TEMPLATE_HEADERS],
  });

  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 22 },
    { wch: 16 },
    { wch: 10 },
    { wch: 24 },
    { wch: 46 },
    { wch: 16 },
    { wch: 10 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
  ];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Customers Directory');
  writeFile(workbook, filename);
  return true;
};

export interface ImportResult {
  updatedCustomers: Customer[];
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  totalParsed: number;
  errors: string[];
}

function normalizeHeaderKey(key: string): string {
  return key
    .replace(/\([^)]*\)/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Parse Excel (.xlsx, .xls, .csv) file buffer into Customer objects & merge with existing customer list
 */
export const importCustomersFromExcel = async (
  file: File,
  existingCustomers: Customer[]
): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRowsAll = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

        // Ignore completely empty rows
        const rawRows = rawRowsAll.filter((row) =>
          Object.values(row).some((val) => val !== undefined && val !== null && String(val).trim() !== '')
        );

        if (!rawRows || rawRows.length === 0) {
          return resolve({
            updatedCustomers: existingCustomers,
            addedCount: 0,
            updatedCount: 0,
            skippedCount: 0,
            totalParsed: 0,
            errors: ['Excel file is empty or contains no valid data rows.'],
          });
        }

        const updatedList = [...existingCustomers];
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        const getNextId = () => generateNextCustomerId(updatedList);

        rawRows.forEach((row, index) => {
          const rowNum = index + 2;

          const getRawVal = (...keys: string[]): unknown => {
            const rowEntries = Object.entries(row);
            for (const target of keys) {
              const targetLower = target.trim().toLowerCase();
              const targetNorm = normalizeHeaderKey(target);
              const matched = rowEntries.find(([k]) => {
                const kLower = k.trim().toLowerCase();
                return kLower === targetLower || normalizeHeaderKey(k) === targetNorm;
              });
              if (matched && matched[1] !== undefined && matched[1] !== null) {
                const str = String(matched[1]).trim();
                if (str !== '') return matched[1];
              }
            }
            return '';
          };

          const getVal = (...keys: string[]): string => {
            const val = getRawVal(...keys);
            return val !== undefined && val !== null ? String(val).trim() : '';
          };

          const name = getVal('Customer Name *', 'Customer Name', 'Name', 'Client Name', 'Customer');
          const phone = getVal(
            'Phone / Mobile *',
            'Phone / Mobile',
            'Phone Number *',
            'Phone Number',
            'Phone',
            'Mobile',
            'Contact Number',
            'Contact'
          );

          // Mandatory field validation: Customer Name & Phone
          if (!name || !phone) {
            skippedCount++;
            const missingParts: string[] = [];
            if (!name) missingParts.push('Customer Name');
            if (!phone) missingParts.push('Phone / Mobile');
            errors.push(`Row ${rowNum}: Missing ${missingParts.join(' & ')} (Skipped)`);
            return;
          }

          const idFromFile = getVal('ID', 'Customer ID', 'Cust ID');
          const contactPerson = getVal('Contact Person', 'SPOC Name', 'Contact Name');
          const lastInvoiceRaw = getRawVal('Last Invoice Dt.', 'Last Invoice Date', 'Last Invoice Dt');
          const lastInvoiceDate = normalizeIsoDate(lastInvoiceRaw);
          const rawCode = getVal('Code', 'Client Code', 'Customer Code');
          const code = deriveClientCode(name, rawCode);

          const siteSurveyRaw = getVal('Site Survey / Inspection', 'Site Survey', 'Inspection').toLowerCase();
          const siteSurveyRequired: 'Required' | 'Not Required' =
            siteSurveyRaw.includes('not') || siteSurveyRaw === 'no' ? 'Not Required' : 'Required';

          const address = getVal('Address *', 'Address', 'Street Address *', 'Street Address', 'Full Address') || 'West Bengal';
          const city = getVal('City *', 'City');
          const district = getVal('District');
          const gstin = getVal('GSTIN', 'GST Number', 'GST No', 'GST').toUpperCase();
          const panNumber = getVal('PAN Number', 'PAN', 'PAN No').toUpperCase();

          let stateCode = getVal('State Code', 'State Code (e.g. 19) *', 'StateCode');
          if (!stateCode && /^\d{2}/.test(gstin)) {
            stateCode = gstin.slice(0, 2);
          }
          if (!stateCode) {
            stateCode = '19';
          }

          const matchedState = INDIAN_STATES.find((s) => s.stateCode === stateCode.padStart(2, '0'));
          const state = getVal('State *', 'State') || matchedState?.state || 'West Bengal';

          const rawLocation = getVal('Location');
          const locationType: 'Within State' | 'Out of State' =
            rawLocation.toLowerCase().includes('out')
              ? 'Out of State'
              : rawLocation.toLowerCase().includes('within')
              ? 'Within State'
              : deriveLocationType(state, stateCode);

          // Extract 6-digit PIN from explicit column or address string
          const pinMatch = address.match(/\b(\d{6})\b/);
          const pinCode =
            getVal('PIN Code *', 'PIN Code', 'Pincode', 'Pin Code', 'Zip', 'ZIP Code') ||
            (pinMatch ? pinMatch[1] : '712410');

          const currency = getVal('Currency') || 'Rs.';
          const email = getVal('Email', 'Email Address', 'Primary Email');
          const spocEmail = getVal('SPOC Email ID', 'SPOC Email');
          const financeEmail = getVal('Finance Email ID', 'Finance Email');

          const categoryRaw = getVal(
            'Type',
            'Client Type (Domestic / Commercial) *',
            'Client Type',
            'Category',
            'Customer Category'
          );
          const category: 'Domestic' | 'Commercial' = categoryRaw.toLowerCase().includes('commercial')
            ? 'Commercial'
            : 'Domestic';

          const creditPeriodDays = getVal('Credit Period', 'Credit Period (Days)') || '0';
          const termsOfPayment = getVal('Terms of Payment', 'Payment Terms') || 'Advance';
          const dispatchThrough = getVal('Dispatch Through', 'Dispatch Mode') || 'Company Vehicle';
          const termsOfDelivery = getVal('Terms of Delivery', 'Delivery Terms') || 'Site Delivery';
          const tds = getVal('TDS', 'TDS Applicable') || 'No';

          const gstReqRaw = getVal('GST No Reqd', 'GST Required', 'GST No Required').toLowerCase();
          const gstNoRequired: 'Yes' | 'No' =
            gstReqRaw === 'yes' || (gstReqRaw !== 'no' && Boolean(gstin)) ? 'Yes' : 'No';

          const statusRaw = getVal('Status', 'Status (Active / Inactive)', 'Account Status').toLowerCase();
          const status: 'active' | 'inactive' = statusRaw === 'inactive' ? 'inactive' : 'active';

          // Check existing match by ID, normalized Phone, or GSTIN
          const cleanPhone = phone.replace(/\D/g, '');
          const existingIdx = updatedList.findIndex((c) => {
            if (idFromFile && c.id.toLowerCase() === idFromFile.toLowerCase()) return true;
            if (cleanPhone.length >= 8 && c.phone.replace(/\D/g, '') === cleanPhone) return true;
            if (gstin && c.gstin && c.gstin.toUpperCase() === gstin) return true;
            return false;
          });

          if (existingIdx >= 0) {
            const target = updatedList[existingIdx];
            const mergedCustomer: Customer = {
              ...target,
              name: name || target.name,
              contactPerson: contactPerson || target.contactPerson,
              lastInvoiceDate: lastInvoiceDate || target.lastInvoiceDate,
              code: code || target.code,
              siteSurveyRequired,
              phone: phone || target.phone,
              email: email || target.email,
              spocEmail: spocEmail || target.spocEmail,
              financeEmail: financeEmail || target.financeEmail,
              address: address || target.address,
              city: city || target.city,
              district: district || target.district,
              state: state || target.state,
              stateCode: stateCode || target.stateCode,
              pinCode: pinCode || target.pinCode,
              pincode: pinCode || target.pincode,
              locationType,
              currency,
              category,
              creditPeriodDays,
              termsOfPayment,
              dispatchThrough,
              termsOfDelivery,
              tds,
              gstNoRequired,
              gstin: gstin || target.gstin,
              panNumber: panNumber || target.panNumber,
              status,
            };
            const baseHistory = ensureInitialAuditHistory(target.auditHistory, DEFAULT_AUDIT_USER);
            const changes = diffCustomerFields(target, mergedCustomer);
            updatedList[existingIdx] = {
              ...mergedCustomer,
              auditHistory:
                changes.length > 0
                  ? [...baseHistory, createAuditEntry('UPDATED', DEFAULT_AUDIT_USER, changes)]
                  : baseHistory,
            };
            updatedCount++;
          } else {
            const newId = idFromFile || getNextId();
            const newCustomer: Customer = {
              id: newId,
              name,
              contactPerson: contactPerson || undefined,
              lastInvoiceDate: lastInvoiceDate || undefined,
              code,
              siteSurveyRequired,
              phone,
              email: email || undefined,
              spocEmail: spocEmail || undefined,
              financeEmail: financeEmail || undefined,
              address,
              city: city || district || undefined,
              district: district || undefined,
              state,
              stateCode,
              pinCode,
              pincode: pinCode,
              locationType,
              currency,
              category,
              creditPeriodDays,
              termsOfPayment,
              dispatchThrough,
              termsOfDelivery,
              tds,
              gstNoRequired,
              gstin: gstin || undefined,
              panNumber: panNumber || undefined,
              status,
              auditHistory: [createAuditEntry('IMPORTED', DEFAULT_AUDIT_USER)],
            };

            updatedList.push(newCustomer);
            addedCount++;
          }
        });

        resolve({
          updatedCustomers: updatedList,
          addedCount,
          updatedCount,
          skippedCount,
          totalParsed: rawRows.length,
          errors,
        });
      } catch (err: unknown) {
        reject(err instanceof Error ? err.message : 'Error processing Excel file');
      }
    };

    reader.onerror = () => reject('Failed to read Excel file');
    reader.readAsArrayBuffer(file);
  });
};

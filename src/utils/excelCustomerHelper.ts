import { utils, read, writeFile } from 'xlsx';
import { Customer } from '../types';

/**
 * Export customer list to Excel file (.xlsx)
 */
export const exportCustomersToExcel = (customers: Customer[], filename = 'SunLight_Customers_Directory.xlsx') => {
  if (!customers || customers.length === 0) {
    alert('No customer records available to export.');
    return;
  }

  const exportData = customers.map((c) => ({
    'Customer ID': c.id,
    'Customer Name': c.name,
    'Phone Number': c.phone,
    'Email': c.email || '',
    'Address': c.address,
    'City': c.city || '',
    'State': c.state || 'West Bengal',
    'State Code': c.stateCode || '19',
    'Pincode': c.pinCode || c.pincode || '',
    'Category': c.category,
    'GSTIN': c.gstin || '',
    'Status': c.status || 'active',
  }));

  const worksheet = utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 16 }, // Customer ID
    { wch: 26 }, // Customer Name
    { wch: 18 }, // Phone Number
    { wch: 25 }, // Email
    { wch: 38 }, // Address
    { wch: 18 }, // City
    { wch: 18 }, // State
    { wch: 12 }, // State Code
    { wch: 12 }, // Pincode
    { wch: 15 }, // Category
    { wch: 20 }, // GSTIN
    { wch: 12 }, // Status
  ];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Customers Directory');
  writeFile(workbook, filename);
};

export interface ImportResult {
  updatedCustomers: Customer[];
  addedCount: number;
  updatedCount: number;
  totalParsed: number;
  errors: string[];
}

/**
 * Parse Excel file buffer into Customer objects & merge with existing customer list
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

        const rawRows = utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          return resolve({
            updatedCustomers: existingCustomers,
            addedCount: 0,
            updatedCount: 0,
            totalParsed: 0,
            errors: ['Excel file is empty or has no data rows.'],
          });
        }

        const updatedList = [...existingCustomers];
        let addedCount = 0;
        let updatedCount = 0;
        const errors: string[] = [];

        // Determine max ID sequence for new customer IDs (CUST-xxx)
        let maxSeq = 0;
        existingCustomers.forEach((c) => {
          const match = c.id.match(/CUST-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          }
        });

        rawRows.forEach((row, index) => {
          // Normalize column keys (case-insensitive lookup)
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              const matchedKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === key.toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const name = getVal('Customer Name', 'Name', 'Client Name', 'Customer');
          const phone = getVal('Phone Number', 'Phone', 'Mobile', 'Contact Number', 'Contact');

          if (!name) {
            errors.push(`Row ${index + 2}: Missing Customer Name (Skipped)`);
            return;
          }

          const idFromFile = getVal('Customer ID', 'ID', 'Cust ID');
          const email = getVal('Email', 'Email Address');
          const address = getVal('Address', 'Street Address', 'Full Address') || 'West Bengal';
          const city = getVal('City', 'District') || 'Purba Bardhaman';
          const state = getVal('State') || 'West Bengal';
          const stateCode = getVal('State Code', 'StateCode') || '19';
          const pinCode = getVal('Pincode', 'Pin Code', 'Zip', 'ZIP Code') || '713101';
          const categoryRaw = getVal('Category', 'Customer Category', 'Type');
          const gstin = getVal('GSTIN', 'GST Number', 'GST No', 'GST').toUpperCase();
          const statusRaw = getVal('Status', 'Account Status').toLowerCase();

          const category: 'Domestic' | 'Commercial' =
            categoryRaw.toLowerCase().includes('commercial') ? 'Commercial' : 'Domestic';

          const status: 'active' | 'inactive' =
            statusRaw === 'inactive' ? 'inactive' : 'active';

          // Search if customer already exists (by ID, Phone, or GSTIN)
          const existingIdx = updatedList.findIndex((c) => {
            if (idFromFile && c.id.toLowerCase() === idFromFile.toLowerCase()) return true;
            if (phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '') && phone.length >= 8) return true;
            if (gstin && c.gstin && c.gstin.toUpperCase() === gstin) return true;
            return false;
          });

          if (existingIdx >= 0) {
            // Update existing customer record
            const target = updatedList[existingIdx];
            updatedList[existingIdx] = {
              ...target,
              name: name || target.name,
              phone: phone || target.phone,
              email: email || target.email,
              address: address || target.address,
              city: city || target.city,
              state: state || target.state,
              stateCode: stateCode || target.stateCode,
              pinCode: pinCode || target.pinCode,
              pincode: pinCode || target.pincode,
              category: category || target.category,
              gstin: gstin || target.gstin,
              status: status || target.status,
            };
            updatedCount++;
          } else {
            // Create new customer record
            maxSeq++;
            const newId = idFromFile || `CUST-${String(maxSeq).padStart(3, '0')}`;

            const newCustomer: Customer = {
              id: newId,
              name,
              phone: phone || '+91 98765 00000',
              email: email || undefined,
              address,
              city,
              state,
              stateCode,
              pinCode,
              pincode: pinCode,
              category,
              gstin: gstin || undefined,
              status,
            };

            updatedList.push(newCustomer);
            addedCount++;
          }
        });

        resolve({
          updatedCustomers: updatedList,
          addedCount,
          updatedCount,
          totalParsed: rawRows.length,
          errors,
        });
      } catch (err: any) {
        reject(err?.message || 'Error processing Excel file');
      }
    };

    reader.onerror = () => reject('Failed to read Excel file');
    reader.readAsArrayBuffer(file);
  });
};

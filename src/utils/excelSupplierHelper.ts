import { utils, read, writeFile } from 'xlsx';
import { Supplier } from '../types/supplier';

/**
 * Export supplier list to Excel file (.xlsx)
 */
export const exportSuppliersToExcel = (
  suppliers: Supplier[],
  filename = 'SunLight_Suppliers_Directory.xlsx'
) => {
  if (!suppliers || suppliers.length === 0) {
    alert('No supplier records available to export.');
    return;
  }

  const exportData = suppliers.map((s) => ({
    'Supplier Code': s.supplierCode,
    'Company Name': s.companyName,
    'Contact Person': s.contactPerson,
    'Phone Number': s.phone,
    'Email Address': s.email || '',
    'GSTIN': s.gstin || '',
    'Category Supplied': s.categorySupplied,
    'Address': s.address,
    'State': s.state || 'West Bengal',
    'Payment Terms (Days)': s.paymentTermsDays ?? 30,
    'Bank Name': s.bankDetails?.bankName || '',
    'Bank Account No': s.bankDetails?.accountNo || '',
    'Bank IFSC Code': s.bankDetails?.ifscCode || '',
    'Balance Payable (₹)': s.balancePayable ?? 0,
  }));

  const worksheet = utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 16 }, // Supplier Code
    { wch: 36 }, // Company Name
    { wch: 22 }, // Contact Person
    { wch: 18 }, // Phone Number
    { wch: 28 }, // Email Address
    { wch: 20 }, // GSTIN
    { wch: 22 }, // Category Supplied
    { wch: 38 }, // Address
    { wch: 16 }, // State
    { wch: 20 }, // Payment Terms (Days)
    { wch: 22 }, // Bank Name
    { wch: 22 }, // Bank Account No
    { wch: 16 }, // Bank IFSC Code
    { wch: 20 }, // Balance Payable (₹)
  ];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Suppliers Directory');
  writeFile(workbook, filename);
};

/**
 * Download a starter sample Excel template for bulk supplier upload
 */
export const downloadSupplierExcelTemplate = () => {
  const sampleData = [
    {
      'Supplier Code': 'SUP-2026-010',
      'Company Name': 'Tata Power Solar Modules East',
      'Contact Person': 'Ramesh Karmakar',
      'Phone Number': '+91 98310 99887',
      'Email Address': 'ramesh.k@tatapowerdist.com',
      'GSTIN': '19AAACT0011B1Z2',
      'Category Supplied': 'Solar Panels',
      'Address': 'Park Street Commercial Complex, Kolkata',
      'State': 'West Bengal',
      'Payment Terms (Days)': 30,
      'Bank Name': 'State Bank of India',
      'Bank Account No': '31098234561',
      'Bank IFSC Code': 'SBIN0000001',
      'Balance Payable (₹)': 50000,
    },
    {
      'Supplier Code': 'SUP-2026-011',
      'Company Name': 'Luminous Inverters & Batteries',
      'Contact Person': 'Sujit Das',
      'Phone Number': '+91 94331 22334',
      'Email Address': 'sujit@luminous-eastern.in',
      'GSTIN': '19AABCL2233K1ZQ',
      'Category Supplied': 'Inverters',
      'Address': 'NH-2 By-pass, Durgapur',
      'State': 'West Bengal',
      'Payment Terms (Days)': 21,
      'Bank Name': 'HDFC Bank',
      'Bank Account No': '50200012984512',
      'Bank IFSC Code': 'HDFC0000120',
      'Balance Payable (₹)': 0,
    },
  ];

  const worksheet = utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 34 },
    { wch: 20 },
    { wch: 18 },
    { wch: 28 },
    { wch: 20 },
    { wch: 20 },
    { wch: 38 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
  ];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Supplier Template');
  writeFile(workbook, 'SunLight_Suppliers_Bulk_Template.xlsx');
};

export interface SupplierImportResult {
  updatedSuppliers: Supplier[];
  addedCount: number;
  updatedCount: number;
  totalParsed: number;
  errors: string[];
}

/**
 * Parse Excel file buffer into Supplier objects & merge with existing supplier list
 */
export const importSuppliersFromExcel = async (
  file: File,
  existingSuppliers: Supplier[]
): Promise<SupplierImportResult> => {
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
            updatedSuppliers: existingSuppliers,
            addedCount: 0,
            updatedCount: 0,
            totalParsed: 0,
            errors: ['Excel file is empty or has no data rows.'],
          });
        }

        const updatedList = [...existingSuppliers];
        let addedCount = 0;
        let updatedCount = 0;
        const errors: string[] = [];

        // Determine max ID sequence for new supplier codes (SUP-2026-xxx)
        let maxSeq = 0;
        existingSuppliers.forEach((s) => {
          const match = s.supplierCode.match(/SUP-\d{4}-(\d+)/i) || s.supplierCode.match(/SUP-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          }
        });

        rawRows.forEach((row, index) => {
          const rowNumber = index + 2; // Accounting for 1-based index and header row

          // Helper to find case-insensitive column key
          const getVal = (aliases: string[]): string => {
            const keys = Object.keys(row);
            for (const alias of aliases) {
              const matchedKey = keys.find(
                (k) => k.trim().toLowerCase() === alias.trim().toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const companyName = getVal(['Company Name', 'Vendor Name', 'Supplier Name', 'Name', 'Company']);
          const contactPerson = getVal(['Contact Person', 'Contact', 'Representative', 'Person']);
          const phone = getVal(['Phone Number', 'Phone', 'Mobile', 'Mobile Number', 'Contact Number']);
          const email = getVal(['Email Address', 'Email', 'E-mail', 'Mail']);
          const gstin = getVal(['GSTIN', 'GST', 'GST Number', 'Tax ID']).toUpperCase();
          const address = getVal(['Address', 'Street', 'Location', 'Office Address']);
          const state = getVal(['State', 'Province']) || 'West Bengal';
          const categorySupplied = getVal(['Category Supplied', 'Category', 'Product Category', 'Supplies', 'Materials']) || 'Solar Panels';
          const paymentTermsRaw = getVal(['Payment Terms (Days)', 'Payment Terms', 'Credit Days', 'Terms']);
          const paymentTermsDays = paymentTermsRaw ? parseInt(paymentTermsRaw, 10) || 30 : 30;

          const bankName = getVal(['Bank Name', 'Bank', 'Beneficiary Bank']);
          const accountNo = getVal(['Bank Account No', 'Account Number', 'A/C No', 'Account No']);
          const ifscCode = getVal(['Bank IFSC Code', 'IFSC', 'IFSC Code']).toUpperCase();

          const balanceRaw = getVal(['Balance Payable (₹)', 'Balance Payable', 'Outstanding Dues', 'Balance', 'Payable', 'Due']);
          const balancePayable = balanceRaw ? parseFloat(balanceRaw.replace(/[^0-9.-]/g, '')) || 0 : 0;

          let supplierCode = getVal(['Supplier Code', 'Code', 'SUP Code', 'Vendor Code']);

          // Validation: Company name is required
          if (!companyName) {
            errors.push(`Row ${rowNumber}: Skipped because 'Company Name' is empty.`);
            return;
          }

          // Check for existing supplier by Code, GSTIN, or Company Name
          const existingIdx = updatedList.findIndex(
            (s) =>
              (supplierCode && s.supplierCode.toLowerCase() === supplierCode.toLowerCase()) ||
              (gstin && s.gstin && s.gstin.toLowerCase() === gstin.toLowerCase()) ||
              s.companyName.toLowerCase() === companyName.toLowerCase()
          );

          if (existingIdx !== -1) {
            // Update existing supplier record
            const current = updatedList[existingIdx];
            updatedList[existingIdx] = {
              ...current,
              companyName: companyName || current.companyName,
              contactPerson: contactPerson || current.contactPerson,
              phone: phone || current.phone,
              email: email || current.email,
              gstin: gstin || current.gstin,
              address: address || current.address,
              state: state || current.state,
              categorySupplied: categorySupplied || current.categorySupplied,
              paymentTermsDays: paymentTermsDays ?? current.paymentTermsDays,
              bankDetails: {
                bankName: bankName || current.bankDetails?.bankName || '',
                accountNo: accountNo || current.bankDetails?.accountNo || '',
                ifscCode: ifscCode || current.bankDetails?.ifscCode || '',
              },
              balancePayable: balancePayable !== undefined && !isNaN(balancePayable) ? balancePayable : current.balancePayable,
            };
            updatedCount += 1;
          } else {
            // Create new supplier
            maxSeq += 1;
            const seqStr = String(maxSeq).padStart(3, '0');
            const autoCode = supplierCode || `SUP-2026-${seqStr}`;

            const newSupplier: Supplier = {
              id: `SUP-${Date.now().toString().slice(-4)}-${seqStr}`,
              supplierCode: autoCode,
              companyName,
              contactPerson: contactPerson || 'Procurement In-charge',
              phone: phone || '+91 98000 00000',
              email: email || '',
              gstin,
              address: address || 'Kolkata, West Bengal',
              state,
              categorySupplied,
              paymentTermsDays,
              bankDetails: {
                bankName: bankName || 'HDFC Bank',
                accountNo: accountNo || '',
                ifscCode: ifscCode || '',
              },
              balancePayable,
            };

            updatedList.push(newSupplier);
            addedCount += 1;
          }
        });

        resolve({
          updatedSuppliers: updatedList,
          addedCount,
          updatedCount,
          totalParsed: rawRows.length,
          errors,
        });
      } catch (err: any) {
        reject(err?.message || 'Failed to read Excel spreadsheet.');
      }
    };

    reader.onerror = () => {
      reject('FileReader encountered an error reading the file.');
    };

    reader.readAsArrayBuffer(file);
  });
};

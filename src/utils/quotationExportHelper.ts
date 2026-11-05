import { utils, writeFile } from 'xlsx';
import { QuotationInvoice } from '../types';

/**
 * Exports Solar Quotations list to an Excel (.xlsx) file.
 */
export const exportQuotationsToExcel = (
  quotations: QuotationInvoice[],
  customFilename?: string
) => {
  if (!quotations || quotations.length === 0) {
    alert('No solar quotations available to export.');
    return;
  }

  const exportData = quotations.map((q, idx) => {
    // Collect distinct HSN codes
    const hsnList = Array.from(
      new Set(
        (q.items || [])
          .map((item) => item.hsnCode)
          .filter((code): code is string => Boolean(code && code.trim()))
      )
    );
    const hsnCodes = hsnList.length > 0 ? hsnList.join(', ') : '85017200';

    // Summary of equipment items
    const equipmentSummary =
      (q.items || [])
        .map((item) => `${item.quantity || 1} ${item.unit || 'PCS'} ${item.description}`)
        .join('; ') || 'Rooftop Solar EPC Installation';

    return {
      'SL No': idx + 1,
      'Quotation Doc No': q.documentNumber,
      'Date': q.date,
      'Customer Name & Contact Phone': `${q.customerName}${q.customerPhone ? ` (${q.customerPhone})` : ''}`,
      'System Capacity': q.systemCapacityKw ? `${q.systemCapacityKw} kW` : '5 kW',
      'HSN Codes': hsnCodes,
      'Net Payable Amount (₹)': q.grandTotal,
      'Status': q.status || 'Draft',
      'Equipment / Scope Summary': equipmentSummary,
    };
  });

  const worksheet = utils.json_to_sheet(exportData);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 8 },  // SL No
    { wch: 20 }, // Quotation Doc No
    { wch: 14 }, // Date
    { wch: 34 }, // Customer Name & Contact Phone
    { wch: 18 }, // System Capacity
    { wch: 20 }, // HSN Codes
    { wch: 22 }, // Net Payable Amount (₹)
    { wch: 14 }, // Status
    { wch: 55 }, // Equipment / Scope Summary
  ];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Solar Quotations');

  const currentDate = new Date().toISOString().split('T')[0];
  const filename = customFilename || `SunLight_Solar_Quotations_Register_${currentDate}.xlsx`;

  writeFile(workbook, filename);
};

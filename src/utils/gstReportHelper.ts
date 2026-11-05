import { QuotationInvoice } from '../types';

export interface GSTReportFilterOptions {
  periodKey: string; // 'all' | '2026-09' | '2026-08' | '2026-07' | 'Q2-2026' | 'custom'
  startDate?: string;
  endDate?: string;
}

/**
 * Filters invoices based on the selected period
 */
export function filterInvoicesByPeriod(
  invoices: QuotationInvoice[],
  periodKey: string,
  customStart?: string,
  customEnd?: string
): QuotationInvoice[] {
  return invoices.filter((inv) => {
    if (inv.type !== 'Invoice') return false;
    if (periodKey === 'all' || !periodKey) return true;

    if (periodKey === 'custom') {
      if (!customStart && !customEnd) return true;
      const invDate = new Date(inv.date).getTime();
      const start = customStart ? new Date(customStart).setHours(0, 0, 0, 0) : -Infinity;
      const end = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : Infinity;
      return invDate >= start && invDate <= end;
    }

    if (periodKey === 'FY-2026') {
      const invDate = new Date(inv.date).getTime();
      const start = new Date('2026-04-01').setHours(0, 0, 0, 0);
      const end = new Date('2027-03-31').setHours(23, 59, 59, 999);
      return invDate >= start && invDate <= end;
    }

    if (periodKey.startsWith('Q')) {
      // e.g., Q2-2026 (Jul-Sep)
      const year = periodKey.split('-')[1];
      const qNum = periodKey.split('-')[0];
      const invYear = inv.date.substring(0, 4);
      const invMonth = parseInt(inv.date.substring(5, 7), 10);

      if (invYear !== year) return false;
      if (qNum === 'Q1') return invMonth >= 4 && invMonth <= 6;
      if (qNum === 'Q2') return invMonth >= 7 && invMonth <= 9;
      if (qNum === 'Q3') return invMonth >= 10 && invMonth <= 12;
      if (qNum === 'Q4') return invMonth >= 1 && invMonth <= 3;
      return true;
    }

    // YYYY-MM match (e.g. 2026-09, 2026-08)
    return inv.date.startsWith(periodKey);
  });
}

/**
 * Generates and triggers download of a GSTR-1 Compliant CSV file
 */
export function exportGSTSalesCSV(
  invoices: QuotationInvoice[],
  periodLabel: string = 'All_Time'
): void {
  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Customer Name',
    'Customer GSTIN',
    'Customer State',
    'Place of Supply (State Code)',
    'Supply Type (Intra / Inter State)',
    'Taxable Value (₹)',
    'CGST Rate (%)',
    'CGST Amount (₹)',
    'SGST Rate (%)',
    'SGST Amount (₹)',
    'IGST Rate (%)',
    'IGST Amount (₹)',
    'Total Tax (₹)',
    'Discount / Subsidy (₹)',
    'Invoice Grand Total (₹)',
    'Total Paid (₹)',
    'Due Amount (₹)',
    'Payment Status',
  ];

  const rows = invoices.map((inv) => {
    const isWB =
      inv.customerStateCode === '19' ||
      inv.isWestBengal === true ||
      !inv.customerState ||
      inv.customerState.toLowerCase().includes('west bengal');

    const supplyType = isWB ? 'Intra-State' : 'Inter-State';
    const stateName = inv.customerState || 'West Bengal';
    const stateCode = inv.customerStateCode || (isWB ? '19' : '99');
    const pos = `${stateCode}-${stateName}`;

    const taxableValue = Math.max(0, inv.subtotal - (inv.discount || 0));
    const totalGst = inv.taxTotal || 0;

    const cgstAmt = isWB ? (inv.cgstAmount ?? totalGst / 2) : 0;
    const sgstAmt = isWB ? (inv.sgstAmount ?? totalGst / 2) : 0;
    const igstAmt = !isWB ? (inv.igstAmount ?? totalGst) : 0;

    const cgstRate = isWB && taxableValue > 0 ? ((cgstAmt / taxableValue) * 100).toFixed(1) : isWB ? '6.0' : '0.0';
    const sgstRate = isWB && taxableValue > 0 ? ((sgstAmt / taxableValue) * 100).toFixed(1) : isWB ? '6.0' : '0.0';
    const igstRate = !isWB && taxableValue > 0 ? ((igstAmt / taxableValue) * 100).toFixed(1) : !isWB ? '12.0' : '0.0';

    const paidAmt = (inv.payments || []).reduce((s, p) => s + p.amountPaid, 0) || inv.totalPaid || 0;
    const dueAmt = Math.max(0, inv.grandTotal - paidAmt);
    const pmtStatus = dueAmt === 0 ? 'Fully Paid' : paidAmt > 0 ? 'Partially Paid' : 'Unpaid';

    return [
      `"${inv.documentNumber}"`,
      `"${inv.date}"`,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      `"${inv.customerGstin || 'URP'}"`, // URP = Unregistered Person
      `"${stateName.replace(/"/g, '""')}"`,
      `"${pos.replace(/"/g, '""')}"`,
      `"${supplyType}"`,
      taxableValue.toFixed(2),
      isWB ? `"${cgstRate}%"` : '"0.0%"',
      cgstAmt.toFixed(2),
      isWB ? `"${sgstRate}%"` : '"0.0%"',
      sgstAmt.toFixed(2),
      !isWB ? `"${igstRate}%"` : '"0.0%"',
      igstAmt.toFixed(2),
      totalGst.toFixed(2),
      (inv.discount || 0).toFixed(2),
      inv.grandTotal.toFixed(2),
      paidAmt.toFixed(2),
      dueAmt.toFixed(2),
      `"${pmtStatus}"`,
    ];
  });

  // Calculate Column Summary Totals
  const totalTaxable = invoices.reduce((s, i) => s + Math.max(0, i.subtotal - (i.discount || 0)), 0);
  const totalCGST = invoices.reduce((s, i) => {
    const isWB =
      i.customerStateCode === '19' ||
      i.isWestBengal === true ||
      !i.customerState ||
      i.customerState.toLowerCase().includes('west bengal');
    return s + (isWB ? i.cgstAmount ?? i.taxTotal / 2 : 0);
  }, 0);

  const totalSGST = invoices.reduce((s, i) => {
    const isWB =
      i.customerStateCode === '19' ||
      i.isWestBengal === true ||
      !i.customerState ||
      i.customerState.toLowerCase().includes('west bengal');
    return s + (isWB ? i.sgstAmount ?? i.taxTotal / 2 : 0);
  }, 0);

  const totalIGST = invoices.reduce((s, i) => {
    const isWB =
      i.customerStateCode === '19' ||
      i.isWestBengal === true ||
      !i.customerState ||
      i.customerState.toLowerCase().includes('west bengal');
    return s + (!isWB ? i.igstAmount ?? i.taxTotal : 0);
  }, 0);

  const totalTaxAll = totalCGST + totalSGST + totalIGST;
  const totalDiscount = invoices.reduce((s, i) => s + (i.discount || 0), 0);
  const grandTotalAll = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaidAll = invoices.reduce(
    (s, i) => s + ((i.payments || []).reduce((sp, p) => sp + p.amountPaid, 0) || i.totalPaid || 0),
    0
  );
  const totalDueAll = Math.max(0, grandTotalAll - totalPaidAll);

  const summaryRow = [
    '"TOTAL SUMMARY"',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    totalTaxable.toFixed(2),
    '""',
    totalCGST.toFixed(2),
    '""',
    totalSGST.toFixed(2),
    '""',
    totalIGST.toFixed(2),
    totalTaxAll.toFixed(2),
    totalDiscount.toFixed(2),
    grandTotalAll.toFixed(2),
    totalPaidAll.toFixed(2),
    totalDueAll.toFixed(2),
    '""',
  ];

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');

  // Trigger instant browser file download with UTF-8 BOM byte order mark
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeFilename = `SunLightElectric_GST_Sales_Report_${periodLabel.replace(/[\s/\\:]+/g, '_')}.csv`;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

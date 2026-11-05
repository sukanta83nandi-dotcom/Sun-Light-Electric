import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuotationInvoice, PaymentRecord } from '../types';
import { COMPANY_CREDENTIALS } from '../data/mockData';
import { numberToWordsINR } from './numberToWords';
import { getUpiDetails, getQrDataUrlFromCache } from './upiHelper';

export const EXACT_IMAGE_TERMS = `TERMS AND CONDITIONS
1. Please Pay By A/C Payee Cheque Only
2. seller's liability ceases with delivery tocarrier's godown or at workside.
3. Loading & Delivery Charges Extra At Actual.
4. MATERIAL VALUE FLUCTUATIONS BILL CHANGES.
5. QUOTATION Brand Materials not available Another Brand Company supply.
6. 100%ADVANCE PAYMENT, 7-15 DAY TO LATE Delivery.`;

// Cache converted logo base64
let cachedLogoDataUrl: string | null = null;
let cachedEmblemDataUrl: string | null = null;

// Preload logo image and generate isolated emblem
if (typeof window !== 'undefined') {
  try {
    cachedLogoDataUrl = createBrandLogoPngFallback();
    cachedEmblemDataUrl = createBrandEmblemPngFallback();
  } catch (e) {
    console.warn('Init logo canvas fallback failed:', e);
  }
}

function createBrandLogoPngFallback(): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw Sun & Corona
    const sunGrad = ctx.createRadialGradient(45, 42, 4, 45, 42, 24);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.5, '#f59e0b');
    sunGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(45, 42, 20, 0, Math.PI * 2);
    ctx.fill();

    // Rays
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    angles.forEach((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 45 + Math.cos(rad) * 23;
      const y1 = 42 + Math.sin(rad) * 23;
      const x2 = 45 + Math.cos(rad) * 32;
      const y2 = 42 + Math.sin(rad) * 32;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Solar Panel Grid Base
    const panelGrad = ctx.createLinearGradient(15, 52, 75, 88);
    panelGrad.addColorStop(0, '#0284c7');
    panelGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.moveTo(15, 52);
    ctx.lineTo(75, 52);
    ctx.lineTo(85, 88);
    ctx.lineTo(5, 88);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Panel Grid Lines
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 68); ctx.lineTo(80, 68);
    ctx.moveTo(7, 78); ctx.lineTo(83, 78);
    ctx.moveTo(35, 52); ctx.lineTo(28, 88);
    ctx.moveTo(55, 52); ctx.lineTo(62, 88);
    ctx.stroke();

    // Lightning Bolt
    const boltGrad = ctx.createLinearGradient(50, 10, 40, 80);
    boltGrad.addColorStop(0, '#ffffff');
    boltGrad.addColorStop(0.5, '#f59e0b');
    boltGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = boltGrad;
    ctx.beginPath();
    ctx.moveTo(52, 8);
    ctx.lineTo(34, 44);
    ctx.lineTo(48, 44);
    ctx.lineTo(38, 80);
    ctx.lineTo(62, 40);
    ctx.lineTo(48, 40);
    ctx.closePath();
    ctx.fill();

    // Typography
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('SUN LIGHT ELECTRIC', 105, 42);

    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('DOMESTIC & COMMERCIAL SOLAR SOLUTIONS', 106, 62);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 8px system-ui, sans-serif';
    ctx.fillText('MNRE APPROVED • ISO 9001:2015 CERTIFIED • WBSEDCL ENLISTED', 106, 76);

    return canvas.toDataURL('image/png');
  } catch (err) {
    return '';
  }
}

function createBrandEmblemPngFallback(): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const sunGrad = ctx.createRadialGradient(50, 42, 4, 50, 42, 24);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.5, '#f59e0b');
    sunGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(50, 42, 21, 0, Math.PI * 2);
    ctx.fill();

    const panelGrad = ctx.createLinearGradient(16, 54, 84, 92);
    panelGrad.addColorStop(0, '#0284c7');
    panelGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.moveTo(16, 54);
    ctx.lineTo(84, 54);
    ctx.lineTo(96, 92);
    ctx.lineTo(4, 92);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const boltGrad = ctx.createLinearGradient(55, 6, 45, 86);
    boltGrad.addColorStop(0, '#ffffff');
    boltGrad.addColorStop(0.5, '#f59e0b');
    boltGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = boltGrad;
    ctx.beginPath();
    ctx.moveTo(58, 6);
    ctx.lineTo(36, 44);
    ctx.lineTo(52, 44);
    ctx.lineTo(40, 86);
    ctx.lineTo(67, 40);
    ctx.lineTo(51, 40);
    ctx.closePath();
    ctx.fill();

    return canvas.toDataURL('image/png');
  } catch (err) {
    return '';
  }
}

function getLogoDataUrlSync(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('sunlight_custom_brand_logo');
      if (custom) return custom;
    } catch (e) {
      // ignore
    }
  }
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof document !== 'undefined') {
    cachedLogoDataUrl = createBrandLogoPngFallback();
    return cachedLogoDataUrl;
  }
  return null;
}

function getEmblemDataUrlSync(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('sunlight_custom_brand_logo');
      if (custom) return custom;
    } catch (e) {
      // ignore
    }
  }
  if (cachedEmblemDataUrl) return cachedEmblemDataUrl;
  if (typeof document !== 'undefined') {
    cachedEmblemDataUrl = createBrandEmblemPngFallback();
    return cachedEmblemDataUrl;
  }
  return null;
}

/**
 * Dynamically generates an official PDF document for Sun Light Electric.
 * Can be downloaded directly or returned as a blob/base64 for preview and WhatsApp sharing.
 */
export function generateSunLightPdf(doc: QuotationInvoice): jsPDF {
  // Create jsPDF instance (A4 size, portrait, mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Header Colors (Solar Theme: Amber Gold & Deep Slate Navy)
  const primaryColor = [217, 119, 6]; // Amber Gold #D97706
  const secondaryColor = [30, 41, 59]; // Slate #1E293B
  const darkTextColor = [15, 23, 42]; // Slate-900

  // 1. Top Decorative Header Banner
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, pageWidth, 5, 'F');

  const logoData = getLogoDataUrlSync();
  const emblemData = getEmblemDataUrlSync() || logoData;

  // 2. Render Header Logo (Top-Left - Bold & Well Spaced)
  if (logoData) {
    try {
      // Top left logo prominent alongside business credentials
      pdf.addImage(logoData, 'PNG', 14, 8, 36, 28);
    } catch (e) {
      console.warn('Error adding header logo to PDF:', e);
    }
  }

  // Company Name & Credentials (Sufficient left margin x=53mm so NO text overlaps with logo)
  const textStartX = logoData ? 53 : 14;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text(COMPANY_CREDENTIALS.companyName, textStartX, 15);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text(COMPANY_CREDENTIALS.tagline, textStartX, 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Address: ${COMPANY_CREDENTIALS.address}`, textStartX, 25, { maxWidth: 85 });
  pdf.text(`Mobile: +91 ${COMPANY_CREDENTIALS.mobile} | Email: ${COMPANY_CREDENTIALS.email}`, textStartX, 30);
  pdf.text(`GSTIN: ${COMPANY_CREDENTIALS.gstin} | PAN: ${COMPANY_CREDENTIALS.pan} | State Code: ${COMPANY_CREDENTIALS.stateCode}`, textStartX, 35);

  // Document Title Badge (QUOTATION or TAX INVOICE)
  const isQuote = doc.type === 'Quotation';
  const badgeTitle = isQuote ? 'SOLAR QUOTATION' : 'TAX INVOICE';
  
  pdf.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  pdf.roundedRect(pageWidth - 62, 10, 48, 12, 2, 2, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text(badgeTitle, pageWidth - 38, 17.5, { align: 'center' });

  // Divider Line
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(14, 39, pageWidth - 14, 39);

  // 3. Render Centered Background Watermark (Isolated Emblem Symbol Directly Behind Writing Area)
  if (emblemData) {
    try {
      // @ts-expect-error jsPDF GState typing
      const gState = new pdf.GState({ opacity: 0.16 });
      pdf.setGState(gState);

      const watermarkSize = 100; // 100mm x 100mm emblem
      const watermarkX = (pageWidth - watermarkSize) / 2;
      const watermarkY = 55; // Positioned directly behind writing, client details & table

      pdf.addImage(emblemData, 'PNG', watermarkX, watermarkY, watermarkSize, watermarkSize);

      // Restore 100% opacity for content
      // @ts-expect-error jsPDF GState typing
      const resetGState = new pdf.GState({ opacity: 1.0 });
      pdf.setGState(resetGState);
    } catch (e) {
      console.warn('Error rendering PDF watermark:', e);
    }
  }

  // 4. Metadata Box & Customer Details
  // Left Box: Customer Info
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  pdf.text('CLIENT DETAILS:', 14, 45);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text(doc.customerName, 14, 50);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Category: ${doc.customerCategory} Solar Setup`, 14, 55);
  pdf.text(`Phone: ${doc.customerPhone}`, 14, 60);
  pdf.text(`Address: ${doc.customerAddress}`, 14, 65, { maxWidth: 85 });
  if (doc.customerGstin) {
    pdf.text(`GSTIN: ${doc.customerGstin}`, 14, 73);
  }

  // Right Box: Document Meta Info
  const rightX = pageWidth - 70;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  pdf.text('DOCUMENT INFO:', rightX, 45);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Doc No: ${doc.documentNumber}`, rightX, 50);
  if (doc.referenceQuotationNo) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(16, 185, 129);
    pdf.text(`Ref Quote: ${doc.referenceQuotationNo}`, rightX, 55);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Date: ${doc.date}`, rightX, 60);
    pdf.text(`Valid / Due: ${doc.validUntilOrDueDate}`, rightX, 65);
    if (doc.systemCapacityKw) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.text(`Solar Capacity: ${doc.systemCapacityKw} kW`, rightX, 71);
    }
  } else {
    pdf.text(`Date: ${doc.date}`, rightX, 55);
    pdf.text(`Valid / Due: ${doc.validUntilOrDueDate}`, rightX, 60);
    if (doc.systemCapacityKw) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.text(`Solar Capacity: ${doc.systemCapacityKw} kW`, rightX, 66);
    }
  }

  const isWestBengal = doc.isWestBengal ?? Boolean(
    doc.customerState?.toLowerCase().includes('west bengal') ||
    doc.customerStateCode === '19' ||
    doc.customerAddress?.toLowerCase().includes('west bengal') ||
    (doc.customerGstin && doc.customerGstin.startsWith('19'))
  );

  // 5. Line Items Table using autoTable (Rendered crisp on top of watermark)
  const tableData = doc.items.map((item, index) => {
    const itemHsn = item.hsnCode || (
      item.itemCode?.startsWith('SP-') ? '85017200' :
      item.itemCode?.startsWith('INV-') ? '850440' :
      item.itemCode?.startsWith('BAT-') ? '85076000' :
      item.itemCode?.startsWith('MNT-') ? '730890' :
      item.itemCode?.startsWith('CBL-') ? '854449' : '85017200'
    );
    let desc = `${item.description} (${item.itemCode})`;
    if (item.serialNumbers && item.serialNumbers.length > 0) {
      desc += `\nS/N: ${item.serialNumbers.join(', ')}`;
    }
    return [
      (index + 1).toString(),
      desc,
      itemHsn,
      `${item.quantity} ${item.unit}`,
      `INR ${item.unitRate.toLocaleString('en-IN')}`,
      isWestBengal
        ? `CGST ${item.taxRatePercent / 2}% + SGST ${item.taxRatePercent / 2}%`
        : `IGST ${item.taxRatePercent}%`,
      `INR ${item.amount.toLocaleString('en-IN')}`,
    ];
  });

  autoTable(pdf, {
    startY: 80,
    head: [['#', 'Equipment & Scope Description', 'HSN Code', 'Qty', 'Unit Rate', 'GST Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 62 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Get Y position after table
  // @ts-expect-error - autoTable attaches lastAutoTable to pdf
  const finalY = (pdf.lastAutoTable.finalY as number) || 135;

  // 4. Financial Calculations Summary Box
  const summaryStartX = pageWidth - 90;
  const summaryY = finalY + 6;

  const totalGst = doc.taxTotal;
  const cgstAmount = isWestBengal ? (doc.cgstAmount ?? totalGst / 2) : 0;
  const sgstAmount = isWestBengal ? (doc.sgstAmount ?? totalGst / 2) : 0;
  const igstAmount = !isWestBengal ? (doc.igstAmount ?? totalGst) : 0;

  const summaryBoxHeight = isWestBengal ? 58 : 54;

  pdf.setFillColor(248, 250, 252); // Light Slate background
  pdf.rect(summaryStartX - 5, summaryY - 3, 80, summaryBoxHeight, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(summaryStartX - 5, summaryY - 3, 80, summaryBoxHeight, 'S');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);

  let currentY = summaryY + 2;

  pdf.text('Subtotal:', summaryStartX, currentY);
  pdf.text(`INR ${doc.subtotal.toLocaleString('en-IN')}`, pageWidth - 16, currentY, { align: 'right' });
  currentY += 4.5;

  if (isWestBengal) {
    pdf.setFontSize(7.5);
    pdf.setTextColor(180, 83, 9); // Amber
    pdf.text('CGST (Central Tax):', summaryStartX, currentY);
    pdf.text(`INR ${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 16, currentY, { align: 'right' });
    currentY += 4.5;

    pdf.text('SGST (State Tax):', summaryStartX, currentY);
    pdf.text(`INR ${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 16, currentY, { align: 'right' });
    currentY += 4.5;
  } else {
    pdf.setFontSize(7.5);
    pdf.setTextColor(180, 83, 9); // Amber
    pdf.text('IGST (Integrated Tax):', summaryStartX, currentY);
    pdf.text(`INR ${igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 16, currentY, { align: 'right' });
    currentY += 4.5;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Total GST:', summaryStartX, currentY);
  pdf.text(`INR ${doc.taxTotal.toLocaleString('en-IN')}`, pageWidth - 16, currentY, { align: 'right' });
  currentY += 4.5;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);

  if (doc.discount > 0) {
    pdf.text('Discount:', summaryStartX, currentY);
    pdf.text(`- INR ${doc.discount.toLocaleString('en-IN')}`, pageWidth - 16, currentY, { align: 'right' });
    currentY += 4.5;
  }

  if (doc.subsidyEstimate && doc.subsidyEstimate > 0) {
    pdf.setTextColor(22, 101, 52); // Green
    pdf.text('Est. Govt. Subsidy:', summaryStartX, currentY);
    pdf.text(`- INR ${doc.subsidyEstimate.toLocaleString('en-IN')}`, pageWidth - 16, currentY, { align: 'right' });
    pdf.setTextColor(71, 85, 105);
    currentY += 4.5;
  }

  pdf.setLineWidth(0.4);
  pdf.line(summaryStartX, currentY, pageWidth - 16, currentY);
  currentY += 4.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text('Grand Total:', summaryStartX, currentY);
  pdf.text(`INR ${doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 16, currentY, { align: 'right' });
  currentY += 5.5;

  // Amount in Words directly below Grand Total inside summary zone
  const amountWords = numberToWordsINR(doc.grandTotal);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(180, 83, 9);
  pdf.text('AMOUNT IN WORDS:', summaryStartX, currentY);
  currentY += 3.5;

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  pdf.setTextColor(15, 23, 42);
  const splitWords = pdf.splitTextToSize(`(${amountWords})`, 76);
  pdf.text(splitWords, summaryStartX, currentY);

  // Left side Box for Bank Details for Payment
  const upiDetails = getUpiDetails(doc.type, doc.documentNumber, doc.grandTotal);
  const qrDataUrl = getQrDataUrlFromCache(upiDetails.qrCodeUrl);

  const bankBoxX = 14;
  const bankBoxW = summaryStartX - 22; // 120 - 22 = 98mm
  const bankBoxRight = bankBoxX + bankBoxW; // 112mm

  pdf.setFillColor(248, 250, 252); // Soft Light Slate background
  pdf.rect(bankBoxX, summaryY - 3, bankBoxW, summaryBoxHeight, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(bankBoxX, summaryY - 3, bankBoxW, summaryBoxHeight, 'S');

  // Place QR Code Sub-Box on the far RIGHT of the Bank Details Box
  const qrBoxW = 26;
  const qrBoxH = 34;
  const qrMarginRight = 3;
  const qrX = bankBoxRight - qrBoxW - qrMarginRight; // 112 - 26 - 3 = 83mm
  const qrY = summaryY + 1;

  // Maximum width available for text on the left of QR code
  const bankTextStartX = 17;
  const maxTextWidth = qrX - bankTextStartX - 3; // 83 - 17 - 3 = 63mm

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text('BANK & PAYMENT DETAILS', bankTextStartX, summaryY + 3);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(51, 65, 85);

  let currentBankY = summaryY + 8;

  const drawBankLine = (label: string, value: string) => {
    const line = `${label}: ${value}`;
    const splitLines = pdf.splitTextToSize(line, maxTextWidth);
    pdf.text(splitLines, bankTextStartX, currentBankY);
    currentBankY += splitLines.length * 4;
  };

  drawBankLine('Account Name', 'Sun Light Electric / Haradhan Patra');
  drawBankLine('Bank Name', 'HDFC BANK, DEHIBATPUR BRANCH');
  drawBankLine('A/c No', '50200058552107');
  drawBankLine('IFSC Code', 'HDFC0003506');

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(16, 185, 129); // Emerald Green
  const upiLine = `UPI Pay ID: ${upiDetails.upiId}`;
  const splitUpi = pdf.splitTextToSize(upiLine, maxTextWidth);
  pdf.text(splitUpi, bankTextStartX, currentBankY);

  // Draw QR Code Sub-Box
  pdf.setFillColor(255, 255, 255);
  pdf.rect(qrX, qrY, qrBoxW, qrBoxH, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(qrX, qrY, qrBoxW, qrBoxH, 'S');

  if (qrDataUrl) {
    try {
      pdf.addImage(qrDataUrl, 'PNG', qrX + 2, qrY + 2, qrBoxW - 4, qrBoxW - 4);
    } catch (e) {
      console.warn('Could not add QR image to PDF:', e);
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.5);
  pdf.setTextColor(16, 185, 129);
  pdf.text('SCAN TO PAY VIA UPI', qrX + qrBoxW / 2, qrY + qrBoxW + 1, { align: 'center' });
  pdf.setFontSize(6);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`INR ${doc.grandTotal.toLocaleString('en-IN')}`, qrX + qrBoxW / 2, qrY + qrBoxW + 5, { align: 'center' });

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(6.5);
  pdf.setTextColor(100, 116, 139);
  const thankYouText = 'Thank you for partnering with us for a cleaner, greener future.';
  const splitThankYou = pdf.splitTextToSize(thankYouText, bankBoxW - 6);
  pdf.text(splitThankYou, bankTextStartX, summaryY + summaryBoxHeight - 4);

  // 6. Terms & Conditions Box
  const wordsY = summaryY + 54;
  const termsBoxY = wordsY + 4;
  const termsContent = doc.termsAndConditions || EXACT_IMAGE_TERMS;

  pdf.setFillColor(248, 250, 252);
  pdf.rect(14, termsBoxY, pageWidth - 28, 48, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(14, termsBoxY, pageWidth - 28, 48, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text('TERMS AND CONDITIONS', 18, termsBoxY + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(51, 65, 85);

  const cleanTermsLines = termsContent
    .split('\n')
    .filter((l) => l.trim().length > 0 && !l.toLowerCase().includes('terms and conditions'));

  let currentLineY = termsBoxY + 12;
  cleanTermsLines.forEach((line) => {
    pdf.text(line.trim(), 18, currentLineY);
    currentLineY += 5.5;
  });

  // 7. Signature Block
  const signatureY = termsBoxY + 54;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  pdf.text('For SUN LIGHT ELECTRIC', pageWidth - 55, signatureY);

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Authorized Signatory: Haradhan Patra', pageWidth - 65, signatureY + 10);

  // Bottom Line & Page Footer
  pdf.setDrawColor(226, 232, 240);
  pdf.line(14, 280, pageWidth - 14, 280);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Sun Light Electric | Clean Green Energy for Bengal | Generated Digitally', pageWidth / 2, 285, { align: 'center' });

  return pdf;
}

/**
 * Downloads generated PDF directly in browser
 */
export function downloadDocumentPdf(doc: QuotationInvoice): void {
  const pdf = generateSunLightPdf(doc);
  const fileName = `${doc.documentNumber.replace(/\//g, '_')}_${doc.customerName.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
}

/**
 * Returns PDF as Data URL string for inline web iframe preview
 */
export function getPdfDataUrl(doc: QuotationInvoice): string {
  const pdf = generateSunLightPdf(doc);
  return pdf.output('datauristring');
}

/**
 * Returns PDF as a same-origin Blob URL for reliable browser iframe preview
 */
export function getPdfBlobUrl(doc: QuotationInvoice): string {
  const pdf = generateSunLightPdf(doc);
  const blob = pdf.output('blob');
  return URL.createObjectURL(blob);
}

/**
 * Generates a formal 1-page Money Receipt / Payment Voucher PDF
 */
export function generateMoneyReceiptPdf(receipt: PaymentRecord, doc: QuotationInvoice): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();

  // Outer Border & Header
  pdf.setDrawColor(16, 185, 129); // Emerald accent border
  pdf.setLineWidth(0.8);
  pdf.rect(10, 10, pageWidth - 20, 277);

  // Top Accent Banner
  pdf.setFillColor(16, 185, 129);
  pdf.rect(10, 10, pageWidth - 20, 4, 'F');

  const logoData = getLogoDataUrlSync();
  const emblemData = getEmblemDataUrlSync() || logoData;

  // Render Centered Background Watermark
  if (emblemData) {
    try {
      // @ts-expect-error jsPDF GState typing
      const gState = new pdf.GState({ opacity: 0.12 });
      pdf.setGState(gState);

      const watermarkSize = 100; // 100mm x 100mm emblem
      const watermarkX = (pageWidth - watermarkSize) / 2;
      const watermarkY = 85;

      pdf.addImage(emblemData, 'PNG', watermarkX, watermarkY, watermarkSize, watermarkSize);

      // Restore 100% opacity for content
      // @ts-expect-error jsPDF GState typing
      const resetGState = new pdf.GState({ opacity: 1.0 });
      pdf.setGState(resetGState);
    } catch (e) {
      console.warn('Error rendering receipt watermark:', e);
    }
  }

  // Header Logo
  if (logoData) {
    try {
      pdf.addImage(logoData, 'PNG', 15, 16, 28, 22);
    } catch (e) {
      console.warn('Error adding logo to receipt PDF:', e);
    }
  }

  const receiptHeaderX = logoData ? 47 : 15;

  // Header Title & Logo
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text(COMPANY_CREDENTIALS.companyName, receiptHeaderX, 22);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(217, 119, 6); // Amber Gold tagline
  pdf.text(COMPANY_CREDENTIALS.tagline, receiptHeaderX, 27);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`${COMPANY_CREDENTIALS.address}`, receiptHeaderX, 32);
  pdf.text(`GSTIN: ${COMPANY_CREDENTIALS.gstin} | PAN: ${COMPANY_CREDENTIALS.pan} | Mobile: +91 ${COMPANY_CREDENTIALS.mobile}`, receiptHeaderX, 37);

  // Title Box
  pdf.setFillColor(240, 253, 244); // Emerald 50
  pdf.setDrawColor(167, 243, 208); // Emerald 200
  pdf.rect(15, 45, pageWidth - 30, 12, 'F');
  pdf.rect(15, 45, pageWidth - 30, 12, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(6, 95, 70); // Emerald 800
  pdf.text('MONEY RECEIPT / PAYMENT VOUCHER', pageWidth / 2, 53, { align: 'center' });

  // Receipt Meta Grid
  let y = 63;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(15, y, pageWidth - 30, 24, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(15, y, pageWidth - 30, 24, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Receipt No : ${receipt.receiptNo}`, 20, y + 7);
  pdf.text(`Receipt Date : ${receipt.date}`, 120, y + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Invoice Ref No : ${doc.documentNumber}`, 20, y + 14);
  pdf.text(`Invoice Date   : ${doc.date}`, 120, y + 14);

  pdf.text(`Recorded By    : ${receipt.recordedBy || 'Haradhan Patra'}`, 20, y + 20);

  // Customer Details Box
  y += 30;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('RECEIVED WITH THANKS FROM:', 15, y);

  y += 4;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(15, y, pageWidth - 30, 22, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(doc.customerName, 20, y + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Mobile: ${doc.customerPhone} | Category: ${doc.customerCategory}`, 20, y + 13);
  pdf.text(`Address: ${doc.customerAddress}`, 20, y + 18);

  // Payment Breakdown Details
  y += 28;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('PAYMENT DETAILS:', 15, y);

  y += 4;
  autoTable(pdf, {
    startY: y,
    head: [['Description', 'Payment Mode', 'Reference / UTR No.', 'Amount Received (INR)']],
    body: [
      [
        `Payment against Invoice ${doc.documentNumber}`,
        receipt.paymentMode,
        receipt.referenceNo || 'N/A',
        `INR ${receipt.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 15, right: 15 },
  });

  // Amount in Words
  // @ts-expect-error autoTable lastAutoTable prop
  y = (pdf.lastAutoTable?.finalY || y + 25) + 8;
  const words = numberToWordsINR(receipt.amountPaid);
  pdf.setFillColor(240, 253, 244);
  pdf.rect(15, y, pageWidth - 30, 12, 'F');
  pdf.setDrawColor(167, 243, 208);
  pdf.rect(15, y, pageWidth - 30, 12, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(6, 95, 70);
  pdf.text(`AMOUNT IN WORDS: ${words}`, 20, y + 7);

  // Balance Account Summary Box
  y += 18;
  const totalPaid = (doc.payments || []).reduce((acc, p) => acc + p.amountPaid, 0);
  const dueAmount = Math.max(0, doc.grandTotal - totalPaid);

  pdf.setFillColor(248, 250, 252);
  pdf.rect(15, y, pageWidth - 30, 28, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(15, y, pageWidth - 30, 28, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('INVOICE ACCOUNT BALANCE SUMMARY', 20, y + 6);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Total Invoice Amount : INR ${doc.grandTotal.toLocaleString('en-IN')}`, 20, y + 13);
  pdf.text(`Total Amount Paid    : INR ${totalPaid.toLocaleString('en-IN')}`, 20, y + 19);

  pdf.setFont('helvetica', 'bold');
  if (dueAmount === 0) {
    pdf.setTextColor(16, 185, 129);
    pdf.text('Status: FULLY PAID (Zero Balance Due)', 115, y + 19);
  } else {
    pdf.setTextColor(225, 29, 72);
    pdf.text(`Remaining Balance Due: INR ${dueAmount.toLocaleString('en-IN')}`, 115, y + 19);
  }

  if (receipt.notes) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Notes / Remarks: ${receipt.notes}`, 20, y + 24);
  }

  // Signature Block
  y += 42;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text('For SUN LIGHT ELECTRIC', pageWidth - 60, y);

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Authorized Signatory: Haradhan Patra', pageWidth - 70, y + 12);

  // Footer Note
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('This is a computer-generated Money Receipt issued by Sun Light Electric.', pageWidth / 2, 280, { align: 'center' });

  return pdf;
}

/**
 * Downloads Money Receipt PDF file
 */
export function downloadReceiptPdf(receipt: PaymentRecord, doc: QuotationInvoice): void {
  const pdf = generateMoneyReceiptPdf(receipt, doc);
  const fileName = `${receipt.receiptNo.replace(/\//g, '_')}_${doc.customerName.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
}

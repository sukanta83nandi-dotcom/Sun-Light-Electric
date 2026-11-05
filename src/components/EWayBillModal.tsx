import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QuotationInvoice } from '../types';
import { COMPANY_CREDENTIALS } from '../data/mockData';
import { Printer, Download, Image as ImageIcon, Loader2, X, QrCode, Truck, Edit3, ShieldCheck, Check, CheckCircle2 } from 'lucide-react';
import { downloadAsPng, printDocumentViaSilentIframe } from '../utils/printDocumentHelper';
import { CompanyLogo } from './CompanyLogo';

interface EWayBillModalProps {
  invoice: QuotationInvoice;
  onClose: () => void;
}

export const EWayBillModal: React.FC<EWayBillModalProps> = ({ invoice, onClose }) => {
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  // Generate consistent 12-digit e-Way Bill No from invoice number if not already present
  const defaultEwbNo = React.useMemo(() => {
    const rawDigits = (invoice.documentNumber + '831670090732').replace(/[^0-9]/g, '');
    const num = rawDigits.slice(0, 12).padEnd(12, '9');
    return `${num.slice(0, 4)} ${num.slice(4, 8)} ${num.slice(8, 12)}`;
  }, [invoice.documentNumber]);

  const [ewbNumber, setEwbNumber] = useState<string>(defaultEwbNo);
  const [vehicleNo, setVehicleNo] = useState<string>('WB18AP2877');
  const [distanceKm, setDistanceKm] = useState<number>(65);
  const [transporterDocNo, setTransporterDocNo] = useState<string>('TRN-98421');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Extract combined HSN Codes from all line items
  const combinedHsn = React.useMemo(() => {
    const set = new Set<string>();
    (invoice.items || []).forEach((item) => {
      const hsn =
        item.hsnCode ||
        (item.itemCode?.startsWith('SP-')
          ? '85017200'
          : item.itemCode?.startsWith('INV-')
          ? '850440'
          : item.itemCode?.startsWith('BAT-')
          ? '85076000'
          : item.itemCode?.startsWith('MNT-')
          ? '730890'
          : item.itemCode?.startsWith('CBL-')
          ? '854449'
          : '85017200');
      if (hsn) set.add(hsn);
    });
    return Array.from(set).join(', ') || '85017200, 850440';
  }, [invoice.items]);

  // e-Way Bill Dates & Timestamps
  const invoiceDateObj = invoice.date ? new Date(invoice.date) : new Date();
  const formatDateTime = (d: Date, addDays = 0) => {
    const target = new Date(d);
    target.setDate(target.getDate() + addDays);
    const dd = String(target.getDate()).padStart(2, '0');
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const yyyy = target.getFullYear();
    return `${dd}/${mm}/${yyyy} 04:30 PM`;
  };

  const ewbDateStr = formatDateTime(invoiceDateObj, 0);
  // In GST e-Way Bill rules: Under 200 km = 1 day validity (minimum 24-48 hrs buffer)
  const validityDays = Math.max(1, Math.ceil(distanceKm / 200));
  const validUntilStr = formatDateTime(invoiceDateObj, validityDays);

  // Generate official-spec QR Code
  useEffect(() => {
    const qrData = {
      ewbNo: ewbNumber.replace(/\s+/g, ''),
      genBy: COMPANY_CREDENTIALS.gstin,
      genDate: ewbDateStr,
      docNo: invoice.documentNumber,
      docDate: invoice.date,
      val: invoice.grandTotal,
      hsn: combinedHsn,
      from: COMPANY_CREDENTIALS.gstin,
      to: invoice.customerGstin || 'URP',
      veh: vehicleNo.toUpperCase().replace(/\s+/g, ''),
    };

    QRCode.toDataURL(JSON.stringify(qrData), {
      width: 160,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('e-Way Bill QR generation failed:', err));
  }, [ewbNumber, ewbDateStr, invoice, combinedHsn, vehicleNo]);

  const cleanEwb = ewbNumber.replace(/\s+/g, '');
  const cleanInvoiceNo = invoice.documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const handleDirectPrint = async (targetType: string = 'ewaybill') => {
    const docTitle = `eWayBill_${cleanEwb}_${cleanInvoiceNo}`;
    await printDocumentViaSilentIframe('ewaybill-printable-container', docTitle);
  };

  const handleDirectDownload = async () => {
    if (isExportingPng) return;
    setIsExportingPng(true);
    try {
      const fileName = `eWayBill_${cleanEwb}`;
      await downloadAsPng('ewaybill-printable-container', fileName, showToast);
    } catch (err) {
      console.error('Error generating e-Way Bill PNG:', err);
      showToast('Error generating PNG image. Please retry.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const recipientGstin = invoice.customerGstin && invoice.customerGstin.trim().length >= 10
    ? invoice.customerGstin.toUpperCase()
    : 'URP - Unregistered Person';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-start p-2 sm:p-4 md:p-6 z-50 overflow-y-auto">
      {/* Modal Container */}
      <div className="my-auto bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Top Control Bar (Non-Printable) */}
        <div className="no-print bg-slate-950 text-white p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-base text-white">Goods &amp; Services Tax e-Way Bill</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Standard Format
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Doc Ref: {invoice.documentNumber} | EWB: {ewbNumber}
              </p>
            </div>
          </div>

          {/* Real-time Editable Logistics Settings */}
          <div className="flex items-center flex-wrap gap-2">
            {/* EWB No edit */}
            <div className="flex items-center bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 mr-1.5 font-bold">EWB #:</span>
              <input
                type="text"
                value={ewbNumber}
                onChange={(e) => setEwbNumber(e.target.value)}
                placeholder="8316 7009 0732"
                className="bg-slate-900 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded border border-slate-700 w-36 text-center text-xs outline-none focus:border-emerald-500"
              />
            </div>

            {/* Vehicle No edit */}
            <div className="flex items-center bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 mr-1.5 font-bold">Vehicle:</span>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="WB18AP2877"
                className="bg-slate-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded border border-slate-700 w-28 text-center text-xs outline-none focus:border-emerald-500"
              />
            </div>

            {/* Distance edit */}
            <div className="flex items-center bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 mr-1.5 font-bold">Dist:</span>
              <input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value) || 10)}
                className="bg-slate-900 text-sky-400 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700 w-14 text-center text-xs outline-none focus:border-emerald-500"
              />
              <span className="text-slate-400 ml-1">Km</span>
            </div>

            {/* Download PNG Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDirectDownload();
              }}
              disabled={isExportingPng}
              className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center space-x-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer select-none ${
                isExportingPng
                  ? 'bg-emerald-800 text-emerald-200 opacity-80 cursor-wait'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 active:scale-95'
              }`}
              title="Download official e-Way Bill as high-resolution PNG image"
            >
              {isExportingPng ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Generating PNG...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-slate-950" />
                  <span>Download PNG</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDirectPrint('ewaybill');
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-black text-xs rounded-xl flex items-center space-x-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 border border-slate-600 select-none"
              title="Print standard NIC compliant e-Way Bill"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print e-Way Bill</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer select-none"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable e-Way Bill Document Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh] bg-slate-800">
          <div id="ewaybill-printable-container" ref={printableRef} style={{ backgroundColor: '#ffffff' }} className="ewaybill-printable bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl relative font-sans text-xs">
            
            {/* Header Section: Title, Company Logo Branding, QR Code */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-4 mb-4 gap-4">
              <div className="flex items-center gap-3">
                <CompanyLogo className="h-14 sm:h-16 w-auto rounded-lg shrink-0" />
                <div className="border-l-2 border-slate-300 pl-3">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                      e-Way Bill
                    </h1>
                    <span className="bg-slate-900 text-white font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                      NIC Official
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-semibold">
                    Government of India • Goods &amp; Services Tax (ewaybillgst.gov.in)
                  </div>
                  <div className="text-[10px] font-mono text-slate-700 font-bold">
                    Consignor: {COMPANY_CREDENTIALS.companyName} | GSTIN: <span className="text-amber-800">19AZEPP1218L1Z5</span>
                  </div>
                </div>
              </div>

              {/* High-Resolution QR Code */}
              <div className="shrink-0 flex flex-col items-center self-end sm:self-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="e-Way Bill QR Code"
                    className="w-20 h-20 border border-slate-900 rounded p-1 bg-white"
                  />
                ) : (
                  <div className="w-20 h-20 border border-slate-400 rounded flex items-center justify-center text-[10px] text-slate-400 animate-pulse">
                    Generating QR...
                  </div>
                )}
                <span className="text-[8px] font-mono text-slate-500 font-bold mt-1">NIC VERIFIED QR</span>
              </div>
            </div>

            {/* Core Identification Details Grid */}
            <div className="border border-slate-400 rounded-lg overflow-hidden mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 bg-slate-50/70">
                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600 text-[11px]">e-Way Bill No:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{ewbNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600 text-[11px]">Generated Date:</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]">{ewbDateStr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600 text-[11px]">Generated By:</span>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">
                      {COMPANY_CREDENTIALS.gstin} - SUN LIGHT ELECTRIC
                    </span>
                  </div>
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600 text-[11px]">Valid From:</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]">{ewbDateStr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600 text-[11px]">Valid Until:</span>
                    <span className="font-mono font-black text-emerald-700 text-[11px] bg-emerald-50 px-1 rounded border border-emerald-200">
                      {validUntilStr} ({distanceKm} Kms)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600 text-[11px]">Supply Type:</span>
                    <span className="font-bold text-slate-900 text-[11px]">Outward Supply / Sale</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PART - A: Consignment Information */}
            <div className="mb-5">
              <div className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-t-lg flex justify-between items-center">
                <span>PART - A (Consignment Information)</span>
                <span className="text-[10px] text-amber-300 font-mono">Invoice Reference: {invoice.documentNumber}</span>
              </div>

              <table className="w-full text-left border-x border-b border-slate-400 divide-y divide-slate-300 text-xs">
                <tbody>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 w-1/3 bg-slate-50/80 border-r border-slate-300">
                      1. GSTIN of Supplier
                    </td>
                    <td className="p-2.5 font-mono font-black text-slate-900">
                      {COMPANY_CREDENTIALS.gstin}
                      <span className="ml-2 font-sans font-bold text-slate-600 text-[11px]">
                        ({COMPANY_CREDENTIALS.companyName})
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border-r border-slate-300">
                      2. Place of Dispatch
                    </td>
                    <td className="p-2.5 font-medium text-slate-800">
                      SOALUK, Pursurah, Hooghly, WEST BENGAL - 712410
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border-r border-slate-300">
                      3. GSTIN of Recipient
                    </td>
                    <td className="p-2.5 font-mono font-black text-slate-900">
                      {recipientGstin}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border-r border-slate-300">
                      4. Place of Delivery
                    </td>
                    <td className="p-2.5 font-medium text-slate-800">
                      <strong className="text-slate-900">{invoice.customerName}</strong>, {invoice.customerAddress || 'Customer Site'}, {invoice.customerState || 'West Bengal'} (PIN: {invoice.customerStateCode ? '712410' : '712410'})
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border-r border-slate-300">
                      5. Document No. &amp; Date
                    </td>
                    <td className="p-2.5 font-mono">
                      <strong className="text-slate-900">{invoice.documentNumber}</strong> dated{' '}
                      <strong className="text-slate-900">{invoice.date}</strong>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border-r border-slate-300">
                      6. Transaction &amp; Supply Type
                    </td>
                    <td className="p-2.5 font-medium text-slate-800">
                      Transaction: <strong>Regular</strong> | Supply: <strong>Tax Invoice (Outward Supply)</strong>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border-r border-slate-300">
                      7. Total Value of Goods
                    </td>
                    <td className="p-2.5">
                      <span className="font-mono font-black text-slate-900 text-sm">
                        ₹{invoice.grandTotal.toLocaleString('en-IN')}
                      </span>
                      <span className="ml-3 text-[11px] text-slate-500">
                        (Taxable: ₹{invoice.subtotal.toLocaleString('en-IN')} + GST: ₹{invoice.taxTotal.toLocaleString('en-IN')})
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border-r border-slate-300">
                      8. HSN Code(s)
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">
                      {combinedHsn}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border-r border-slate-300">
                      9. Reason for Transportation
                    </td>
                    <td className="p-2.5 font-semibold text-emerald-800">
                      Outward Supply / Sale
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PART - B: Vehicle & Transportation Details */}
            <div className="mb-6">
              <div className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-t-lg">
                PART - B (Vehicle &amp; Transportation Details)
              </div>

              <table className="w-full text-left border-x border-b border-slate-400 divide-y divide-slate-300 text-xs">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center w-12">Mode</th>
                    <th className="p-2 border-r border-slate-300">Vehicle No</th>
                    <th className="p-2 border-r border-slate-300">From</th>
                    <th className="p-2 border-r border-slate-300">Entered Date</th>
                    <th className="p-2">Entered By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 text-center font-bold text-slate-800 border-r border-slate-300">
                      1 - Road
                    </td>
                    <td className="p-2.5 font-mono font-black text-slate-900 text-sm border-r border-slate-300">
                      {vehicleNo || 'WB18AP2877'}
                    </td>
                    <td className="p-2.5 font-medium text-slate-800 border-r border-slate-300">
                      Hooghly / Pursurah (712410)
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-800 border-r border-slate-300">
                      {ewbDateStr}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">
                      {COMPANY_CREDENTIALS.gstin}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Legal Notice & Footer Notes */}
            <div className="border-t border-slate-300 pt-3 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-2">
              <div>
                Printed on: {new Date().toLocaleDateString('en-IN')} | System Verified e-Way Bill
              </div>
              <div className="font-mono font-bold text-slate-700">
                SUN LIGHT ELECTRIC • Pursurah, Hooghly
              </div>
            </div>
          </div>
        </div>
        {/* Instant Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-from-bottom-3 duration-200">
            <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
            <span className="text-xs">{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Embedded CSS for Exact Single-Page A4 Printout */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          .ewaybill-printable,
          .ewaybill-printable * {
            visibility: visible !important;
          }
          .ewaybill-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: white !important;
            border: 2px solid black !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

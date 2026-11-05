import React, { useState, useRef } from 'react';
import { QuotationInvoice } from '../types';
import { COMPANY_CREDENTIALS } from '../data/mockData';
import { numberToWordsINR } from '../utils/numberToWords';
import { Printer, Download, Image as ImageIcon, Loader2, X, Truck, Layers, CheckCircle2, ShieldCheck, FileDown } from 'lucide-react';
import { downloadDeliveryChallanCopiesAsPng, printDocumentViaSilentIframe } from '../utils/printDocumentHelper';
import { CompanyLogo } from './CompanyLogo';

interface DeliveryChallanModalProps {
  invoice: QuotationInvoice;
  onClose: () => void;
}

export const DeliveryChallanModal: React.FC<DeliveryChallanModalProps> = ({ invoice, onClose }) => {
  const [copyMode, setCopyMode] = useState<'both' | 'original' | 'duplicate'>('both');
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const printableContainerRef = useRef<HTMLDivElement>(null);
  const [challanNo, setChallanNo] = useState<string>(() => {
    // Generate clean Delivery Challan No from Invoice No (e.g. SLE/INV/2026/008 -> SLE/DC/2026/008)
    if (invoice.documentNumber.includes('/INV/')) {
      return invoice.documentNumber.replace('/INV/', '/DC/');
    }
    return `SLE/DC/2026/${invoice.documentNumber.replace(/[^0-9]/g, '').slice(-3) || '101'}`;
  });
  const [vehicleNo, setVehicleNo] = useState<string>('WB18AP2877');
  const [dispatchDate, setDispatchDate] = useState<string>(invoice.date || new Date().toISOString().split('T')[0]);

  // Aggregate quantity across all line items
  const totalQuantity = (invoice.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const grandTotalWords = numberToWordsINR(invoice.grandTotal);

  const cleanInvoiceNo = invoice.documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const handleDirectPrint = async (targetType: string = 'challan') => {
    const docTitle = `Delivery_Challan_${cleanInvoiceNo}`;
    await printDocumentViaSilentIframe('challan-printable-container', docTitle);
  };

  const handleDirectDownload = async () => {
    if (isExportingPng) return;
    setIsExportingPng(true);
    try {
      await downloadDeliveryChallanCopiesAsPng(
        'challan-printable-container',
        invoice.documentNumber,
        copyMode,
        showToast
      );
    } catch (err) {
      console.error('Error generating Delivery Challan PNG:', err);
      showToast('Error generating PNG image. Please retry.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const renderSingleChallanCopy = (copyType: 'ORIGINAL' | 'DUPLICATE') => {
    const isOriginal = copyType === 'ORIGINAL';
    const badgeTitle = isOriginal ? 'Delivery Challan - Original' : 'Delivery Challan - Duplicate';
    const badgeSubtitle = isOriginal
      ? 'Original for Consignee / Transport'
      : 'Duplicate for Supplier / Consignor';
    const badgeColor = isOriginal
      ? 'bg-amber-600 text-white border-amber-700'
      : 'bg-sky-700 text-white border-sky-800';

    return (
      <div
        key={copyType}
        data-challan-copy={copyType}
        style={{ backgroundColor: '#ffffff' }}
        className={`bg-white text-slate-900 border border-slate-300 rounded-xl p-6 sm:p-8 max-w-4xl mx-auto shadow-md relative overflow-hidden font-sans ${
          copyMode === 'both' ? 'challan-page-break html2pdf__page-break mb-8' : ''
        }`}
      >
        {/* Subtle Watermark Emblem behind content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden">
          <div className="relative w-80 h-80 opacity-10 overflow-hidden flex items-center justify-center">
            <CompanyLogo iconOnly variant="watermark" className="w-72 h-72 object-contain" />
          </div>
        </div>

        {/* Content Layer */}
        <div className="relative z-10 space-y-5">
          {/* Top Header & Branding Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
            <div className="flex items-start gap-4">
              <CompanyLogo className="h-14 sm:h-16 w-auto shadow-xs rounded-xl shrink-0" />
              <div>
                <h1 className="text-2xl font-black tracking-tight text-amber-600">
                  {COMPANY_CREDENTIALS.companyName}
                </h1>
                <p className="text-xs font-semibold text-slate-700">
                  {COMPANY_CREDENTIALS.tagline}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Address: {COMPANY_CREDENTIALS.address}
                </p>
                <p className="text-[11px] text-slate-600">
                  Mobile: +91 {COMPANY_CREDENTIALS.mobile} | Email: {COMPANY_CREDENTIALS.email}
                </p>
                <p className="text-[11px] font-mono font-medium text-slate-600">
                  GSTIN: <strong className="text-slate-900">{COMPANY_CREDENTIALS.gstin}</strong> | PAN: {COMPANY_CREDENTIALS.pan} | State: West Bengal (19)
                </p>
              </div>
            </div>

            {/* Document Badges */}
            <div className="text-right shrink-0 space-y-1.5">
              <div className={`inline-block px-3.5 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider shadow-xs border ${badgeColor}`}>
                {badgeTitle}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                {badgeSubtitle}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-right space-y-0.5 mt-2">
                <div className="text-xs font-mono font-black text-slate-900">
                  Challan #: <span className="text-amber-700">{challanNo}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-600">
                  Challan Date: <strong className="text-slate-800">{dispatchDate}</strong>
                </div>
                <div className="text-[11px] font-mono text-emerald-700 font-bold">
                  Against Tax Invoice: {invoice.documentNumber}
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Invoice Date: {invoice.date}
                </div>
              </div>
            </div>
          </div>

          {/* Consignee / Delivery Address & Logistics Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 text-xs">
            {/* Consignee Info */}
            <div className="space-y-1">
              <span className="font-extrabold text-amber-800 uppercase tracking-wider block text-[10px]">
                Consignee / Delivery Destination:
              </span>
              <div className="font-black text-slate-900 text-sm">{invoice.customerName}</div>
              <div className="text-slate-700">Phone: <strong>{invoice.customerPhone}</strong></div>
              <div className="text-slate-700 leading-relaxed">
                Site Address: {invoice.customerAddress || 'Local Installation Site, Hooghly'}
              </div>
              <div className="text-slate-700 font-mono">
                State: {invoice.customerState || 'West Bengal'} (Code: {invoice.customerStateCode || '19'})
              </div>
              <div className="text-slate-700 font-mono">
                GSTIN: <strong className="text-slate-900">{invoice.customerGstin || 'URP (Unregistered Person)'}</strong>
              </div>
            </div>

            {/* Logistics & Dispatch Info */}
            <div className="space-y-1.5 sm:text-right flex flex-col justify-between">
              <div>
                <span className="font-extrabold text-amber-800 uppercase tracking-wider block text-[10px]">
                  Transport &amp; Dispatch Details:
                </span>
                <div className="text-slate-700">
                  Dispatch Mode: <strong>Road Transport</strong>
                </div>
                <div className="text-slate-700">
                  Vehicle No: <strong className="font-mono text-slate-900 uppercase">{vehicleNo || 'WB18AP2877'}</strong>
                </div>
                <div className="text-slate-700">
                  Dispatch From: <strong>Pursurah, Hooghly, WB</strong>
                </div>
                <div className="text-slate-700">
                  Project Capacity: <strong className="text-amber-700">{invoice.systemCapacityKw || 5.0} kW Solar Plant</strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic">
                Rule 55: Goods dispatched for supply / installation in solar EPC contract.
              </div>
            </div>
          </div>

          {/* Items Table (Strictly NO Unit Rates, Line Amounts, or GST Rates) */}
          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5 border-b border-slate-300 text-center w-10">#</th>
                  <th className="p-2.5 border-b border-slate-300">Equipment &amp; Scope Description</th>
                  <th className="p-2.5 border-b border-slate-300 text-center w-28">HSN Code</th>
                  <th className="p-2.5 border-b border-slate-300 text-center w-24">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(invoice.items || []).map((item, index) => {
                  const itemHsn =
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

                  return (
                    <tr key={item.id || index} className="bg-white/90 hover:bg-slate-50/80">
                      <td className="p-3 text-center font-bold text-slate-500">{index + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-[13px]">{item.description}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">Item Code: {item.itemCode}</div>
                        {item.serialNumbers && item.serialNumbers.length > 0 && (
                          <div className="mt-1.5 text-[10px] font-mono text-slate-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 inline-block">
                            <span className="font-bold text-amber-900">Assigned S/N:</span>{' '}
                            <span className="font-semibold text-slate-900">{item.serialNumbers.join(', ')}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800 text-xs bg-slate-50/50">
                        {itemHsn}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-900 text-sm">
                        {item.quantity} {item.unit || 'Pcs'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Consolidated Bottom Summary Box (Strictly Consolidated Values ONLY) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs">
            <div className="space-y-1">
              <div className="text-slate-600">
                Amount in Words:
              </div>
              <div className="font-extrabold text-slate-900 text-[12px] italic capitalize leading-snug">
                {grandTotalWords}
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                Note: Delivered in sound condition for solar rooftop installation. No commercial value difference from invoice.
              </div>
            </div>

            <div className="bg-white border border-slate-300 rounded-lg p-3 space-y-1.5 md:text-right">
              <div className="flex justify-between md:justify-end md:gap-4 items-center text-xs">
                <span className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Total Quantity Dispatched:
                </span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {totalQuantity} Units / Pcs
                </span>
              </div>
              <div className="flex justify-between md:justify-end md:gap-4 items-center border-t border-slate-200 pt-1.5">
                <span className="text-amber-800 font-extrabold uppercase tracking-wider text-[11px]">
                  Total Consignment / Goods Value:
                </span>
                <span className="font-mono font-black text-amber-600 text-base">
                  ₹{invoice.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures Row */}
          <div className="grid grid-cols-2 gap-8 pt-8 pb-2">
            <div className="text-left space-y-12">
              <div className="text-xs text-slate-500 font-medium">
                Received the above mentioned goods in good condition &amp; count:
              </div>
              <div className="border-t-2 border-dashed border-slate-400 pt-2 w-56">
                <div className="font-bold text-xs text-slate-800">Receiver's Signature with Stamp</div>
                <div className="text-[10px] text-slate-500">Date: ________________________</div>
              </div>
            </div>

            <div className="text-right space-y-12 flex flex-col items-end">
              <div className="text-xs text-slate-700 font-bold">
                For {COMPANY_CREDENTIALS.companyName}
              </div>
              <div className="border-t-2 border-dashed border-slate-400 pt-2 w-56 text-right">
                <div className="font-bold text-xs text-slate-900">Authorized Signatory</div>
                <div className="text-[10px] text-slate-500">(Haradhan Patra, Proprietor)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-start p-2 sm:p-4 md:p-6 z-50 overflow-y-auto">
      {/* Modal Container */}
      <div className="my-auto bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Top Control Bar (Non-Printable) */}
        <div className="no-print bg-slate-950 text-white p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-base text-white">Delivery Challan (Dispatch Slip)</h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Dual Copy Print
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Invoice: {invoice.documentNumber} | Client: {invoice.customerName}
              </p>
            </div>
          </div>

          {/* Interactive Print Options */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Copy Selector Toggle */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCopyMode('both')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  copyMode === 'both'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Print both Original and Duplicate sequentially with page-break"
              >
                Both Copies
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('original')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  copyMode === 'original'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Original Only
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('duplicate')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  copyMode === 'duplicate'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Duplicate Only
              </button>
            </div>

            {/* Quick Vehicle No edit */}
            <div className="flex items-center bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 mr-1.5 font-bold">Vehicle:</span>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="WB18AP2877"
                className="bg-slate-900 text-amber-400 font-mono font-bold px-2 py-0.5 rounded border border-slate-700 w-28 text-center text-xs outline-none focus:border-amber-500"
              />
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
              title="Download Delivery Challan as high-resolution PNG image"
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
                handleDirectPrint('challan');
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 select-none"
              title="Print Challan (Dual Copy: Original for Consignee, Duplicate for Supplier)"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Print Challan</span>
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

        {/* Scrollable Document Area */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh] bg-slate-800">
          <div id="challan-printable-container" ref={printableContainerRef} className="delivery-challan-printable">
            {copyMode === 'both' ? (
              <>
                {renderSingleChallanCopy('ORIGINAL')}
                <div className="html2pdf__page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page' }} />
                {renderSingleChallanCopy('DUPLICATE')}
              </>
            ) : copyMode === 'original' ? (
              renderSingleChallanCopy('ORIGINAL')
            ) : (
              renderSingleChallanCopy('DUPLICATE')
            )}
          </div>
        </div>

        {/* Instant Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
            <span className="text-xs">{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Embedded CSS for Exact Clean Printout */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          .delivery-challan-printable,
          .delivery-challan-printable * {
            visibility: visible !important;
          }
          .delivery-challan-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .challan-page-break,
          .html2pdf__page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
};

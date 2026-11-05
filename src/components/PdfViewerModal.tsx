import React, { useState, useEffect } from 'react';
import { QuotationInvoice, Language } from '../types';
import { translations } from '../data/translations';
import { getPdfDataUrl, getPdfBlobUrl, downloadDocumentPdf, generateSunLightPdf, EXACT_IMAGE_TERMS } from '../utils/pdfGenerator';
import { getUpiDetails } from '../utils/upiHelper';
import { numberToWordsINR } from '../utils/numberToWords';
import { COMPANY_CREDENTIALS } from '../data/mockData';
import { getWhatsAppDeepLinks, sharePdfToWhatsApp } from '../utils/whatsappHelper';
import { X, Download, Share2, Send, Check, FileCheck2, Printer, Eye } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

interface PdfViewerModalProps {
  doc: QuotationInvoice;
  onClose: () => void;
  lang: Language;
  onConvertQuotation?: (doc: QuotationInvoice) => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ doc, onClose, lang, onConvertQuotation }) => {
  const t = translations[lang];
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'pdf' | 'html'>('pdf');

  useEffect(() => {
    let blobUrl = '';
    try {
      blobUrl = getPdfBlobUrl(doc);
      setPdfDataUrl(blobUrl);
    } catch (err) {
      console.warn('Blob URL generation failed, falling back to datauristring:', err);
      setPdfDataUrl(getPdfDataUrl(doc));
    }

    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [doc]);

  const handleDownload = () => {
    downloadDocumentPdf(doc);
  };

  const handlePrintHtml = () => {
    window.print();
  };

  const handleWhatsAppShare = async () => {
    const pdfInstance = generateSunLightPdf(doc);
    const pdfBlob = pdfInstance.output('blob');
    
    await sharePdfToWhatsApp(pdfBlob, doc, lang);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  const { waMeUrl } = getWhatsAppDeepLinks(doc, lang);
  const grandTotalWords = numberToWordsINR(doc.grandTotal);

  const isWestBengal = doc.isWestBengal ?? Boolean(
    doc.customerState?.toLowerCase().includes('west bengal') ||
    doc.customerStateCode === '19' ||
    doc.customerAddress?.toLowerCase().includes('west bengal') ||
    (doc.customerGstin && doc.customerGstin.startsWith('19'))
  );

  const totalGst = doc.taxTotal;
  const cgstAmount = isWestBengal ? (doc.cgstAmount ?? totalGst / 2) : 0;
  const sgstAmount = isWestBengal ? (doc.sgstAmount ?? totalGst / 2) : 0;
  const igstAmount = !isWestBengal ? (doc.igstAmount ?? totalGst) : 0;
  const upiDetails = getUpiDetails(doc.type, doc.documentNumber, doc.grandTotal);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-start p-2 sm:p-4 md:p-6 z-50 overflow-y-auto">
      <div className="my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>{doc.type === 'Quotation' ? 'Solar Quotation' : 'Tax Invoice'}</span>
                <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {doc.documentNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Customer: <strong className="text-slate-200">{doc.customerName}</strong> ({doc.customerPhone})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & View Switcher Toolbar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => setActiveView('pdf')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'pdf' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>PDF Render View</span>
            </button>

            <button
              onClick={() => setActiveView('html')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'html' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable Document Preview</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {doc.type === 'Quotation' && onConvertQuotation && (
              <button
                onClick={() => onConvertQuotation(doc)}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
                title="Convert this quotation directly into a Tax Invoice"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-100" />
                <span>Convert to Tax Invoice</span>
              </button>
            )}

            {activeView === 'html' && (
              <button
                onClick={handlePrintHtml}
                className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print Document</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-amber-600" />
              <span>{t.downloadPdf}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              {shareSuccess ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>{t.sendToWhatsapp}</span>
            </button>
          </div>
        </div>

        {/* Main Document Content View */}
        <div className="flex-1 bg-slate-800 p-2 overflow-y-auto relative">
          
          {activeView === 'pdf' ? (
            /* PDF Canvas Frame */
            pdfDataUrl ? (
              <div className="w-full h-[680px] relative rounded-xl overflow-hidden border border-slate-700 bg-white">
                <iframe
                  src={pdfDataUrl}
                  className="w-full h-full border-0 block"
                  title="Sun Light Electric PDF Document"
                />
                <div className="absolute bottom-3 right-3 bg-slate-900/90 text-slate-200 text-[11px] px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-2 shadow-lg backdrop-blur-sm">
                  <span>PDF frame empty?</span>
                  <button
                    onClick={() => setActiveView('html')}
                    className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    Switch to Printable Preview
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>Rendering dynamic PDF document...</span>
              </div>
            )
          ) : (
            /* HTML Printable Document View with Header Logo & Watermark directly over writing */
            <div className="printable-document bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto my-2 text-slate-900 shadow-xl relative overflow-hidden font-sans">
              
              {/* Header Row with Bold Top-Left Header Logo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b-2 border-slate-800 pb-4 relative z-10">
                <div className="flex items-center gap-5">
                  <CompanyLogo className="h-14 sm:h-16 w-auto shadow-xs rounded-xl shrink-0" />
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-amber-600">{COMPANY_CREDENTIALS.companyName}</h1>
                    <p className="text-xs font-semibold text-slate-700">{COMPANY_CREDENTIALS.tagline}</p>
                    <p className="text-[11px] text-slate-500">Address: {COMPANY_CREDENTIALS.address}</p>
                    <p className="text-[11px] text-slate-500">Mobile: +91 {COMPANY_CREDENTIALS.mobile} | Email: {COMPANY_CREDENTIALS.email}</p>
                    <p className="text-[11px] text-slate-500">GSTIN: {COMPANY_CREDENTIALS.gstin} | PAN: {COMPANY_CREDENTIALS.pan} | State Code: {COMPANY_CREDENTIALS.stateCode}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block bg-slate-900 text-amber-400 font-extrabold text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider shadow-sm">
                    {doc.type === 'Quotation' ? 'Solar Quotation' : 'Tax Invoice'}
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-2">
                    Doc #: {doc.documentNumber}
                  </div>
                  {doc.referenceQuotationNo && (
                    <div className="text-[11px] font-mono font-bold text-emerald-600">
                      Ref Quote #: {doc.referenceQuotationNo}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 font-mono">Date: {doc.date}</div>
                  <div className="text-[11px] text-slate-500 font-mono">Valid/Due: {doc.validUntilOrDueDate}</div>
                </div>
              </div>

              {/* Main Document Writing Area (Client Info, Table, Totals) with Watermark Directly Behind Writing */}
              <div className="relative pt-6">
                
                {/* Centered Watermark Emblem */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden">
                  <div className="relative w-80 h-80 opacity-10 overflow-hidden flex items-center justify-center">
                    <CompanyLogo iconOnly variant="watermark" className="w-72 h-72 object-contain" />
                  </div>
                </div>

                {/* Content Elements Layer (z-10 so all writing stays 100% crisp & readable) */}
                <div className="relative z-10 space-y-6">
                  
                  {/* Client Info Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50/90 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-amber-800 uppercase tracking-wider block text-[10px] mb-1">
                        Client Information:
                      </span>
                      <div className="font-bold text-slate-900 text-sm">{doc.customerName}</div>
                      <div className="text-slate-600">Category: {doc.customerCategory} Solar Setup</div>
                      <div className="text-slate-600">Phone: {doc.customerPhone}</div>
                      <div className="text-slate-600">Address: {doc.customerAddress}</div>
                      {doc.customerGstin && <div className="text-slate-600 font-mono">GSTIN: {doc.customerGstin}</div>}
                    </div>

                    <div className="text-right space-y-1">
                      <span className="font-bold text-amber-800 uppercase tracking-wider block text-[10px] mb-1">
                        System Specifications:
                      </span>
                      <div className="text-slate-700">
                        Capacity: <strong className="text-amber-700 font-bold text-sm">{doc.systemCapacityKw || 5.0} kW</strong>
                      </div>
                      <div className="text-slate-600">Status: <strong className="text-slate-900">{doc.status}</strong></div>
                      <div className="text-slate-600">Prepared By: <strong className="text-slate-900">Haradhan Patra</strong></div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-300">
                      <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-2.5 border-b border-slate-300 text-center w-8">#</th>
                          <th className="p-2.5 border-b border-slate-300">Equipment &amp; Scope Description</th>
                          <th className="p-2.5 border-b border-slate-300 text-center w-24">HSN Code</th>
                          <th className="p-2.5 border-b border-slate-300 text-center w-16">Qty</th>
                          <th className="p-2.5 border-b border-slate-300 text-right w-24">Unit Rate (₹)</th>
                          <th className="p-2.5 border-b border-slate-300 text-center w-28">GST Rate</th>
                          <th className="p-2.5 border-b border-slate-300 text-right w-28">Total Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {doc.items.map((item, index) => {
                          const itemHsn = item.hsnCode || (
                            item.itemCode?.startsWith('SP-') ? '85017200' :
                            item.itemCode?.startsWith('INV-') ? '850440' :
                            item.itemCode?.startsWith('BAT-') ? '85076000' :
                            item.itemCode?.startsWith('MNT-') ? '730890' :
                            item.itemCode?.startsWith('CBL-') ? '854449' : '85017200'
                          );

                          return (
                            <tr key={index} className="bg-white/90">
                              <td className="p-2.5 text-center font-bold text-slate-500">{index + 1}</td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900">{item.description}</div>
                                <div className="text-[10px] text-slate-500 font-mono">Code: {item.itemCode}</div>
                                {item.serialNumbers && item.serialNumbers.length > 0 && (
                                  <div className="mt-1 text-[10px] font-mono text-slate-800 bg-amber-50/80 border border-amber-200/90 rounded px-2 py-0.5 inline-block">
                                    <span className="font-bold text-amber-900">S/N:</span>{' '}
                                    <span className="font-semibold text-slate-900">{item.serialNumbers.join(', ')}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap bg-slate-50/50">
                                {itemHsn}
                              </td>
                              <td className="p-2.5 text-center font-mono">{item.quantity} {item.unit}</td>
                              <td className="p-2.5 text-right font-mono font-bold">₹{item.unitRate.toLocaleString('en-IN')}</td>
                              <td className="p-2.5 text-center font-mono text-[11px] whitespace-nowrap">
                                {isWestBengal
                                  ? `CGST ${item.taxRatePercent / 2}% + SGST ${item.taxRatePercent / 2}%`
                                  : `IGST ${item.taxRatePercent}%`}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹{item.amount.toLocaleString('en-IN')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Payment Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 flex items-center justify-between gap-3 [print-color-adjust:exact]">
                      <div className="flex-1 min-w-0 pr-2 space-y-1 text-[11px] text-slate-700">
                        <div className="font-bold text-xs text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-1.5 font-sans">
                          Bank &amp; Payment Details
                        </div>
                        <div className="truncate"><span className="font-semibold text-slate-900">Account Name:</span> Sun Light Electric / Haradhan Patra</div>
                        <div className="truncate"><span className="font-semibold text-slate-900">Bank Name:</span> HDFC BANK, DEHIBATPUR BRANCH</div>
                        <div><span className="font-semibold text-slate-900">A/c No:</span> 50200058552107</div>
                        <div><span className="font-semibold text-slate-900">IFSC Code:</span> HDFC0003506</div>
                        <div className="text-emerald-700 font-medium pt-0.5">
                          <span className="font-semibold">UPI Pay ID:</span> {upiDetails.upiId}
                        </div>
                        <div className="text-[9px] text-slate-500 italic pt-1 font-sans">
                          Thank you for partnering with us for a cleaner, greener future.
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-lg shadow-sm [print-color-adjust:exact]">
                        <img
                          src={upiDetails.qrCodeUrl}
                          alt="UPI Payment QR Code"
                          className="w-20 h-20 object-contain block"
                        />
                        <span className="text-[8px] font-bold text-emerald-700 tracking-tight mt-1 uppercase font-sans">
                          Scan to Pay via UPI
                        </span>
                        <span className="text-[9px] font-extrabold text-slate-900 font-mono">
                          ₹{doc.grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                  {/* Right Summary Card */}
                  <div className="p-4 bg-slate-900 text-white rounded-xl text-xs space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold">₹{doc.subtotal.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Dynamic GST Tax Segregation based on Customer State */}
                    {isWestBengal ? (
                      <>
                        <div className="flex justify-between text-amber-300/90 text-[11px] pl-2 border-l-2 border-amber-500/40">
                          <span>CGST (Central Tax):</span>
                          <span className="font-mono font-bold">
                            ₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-amber-300/90 text-[11px] pl-2 border-l-2 border-amber-500/40">
                          <span>SGST (State Tax):</span>
                          <span className="font-mono font-bold">
                            ₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-amber-300/90 text-[11px] pl-2 border-l-2 border-amber-500/40">
                        <span>IGST (Integrated Tax):</span>
                        <span className="font-mono font-bold">
                          ₹{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-200 font-semibold pt-1 border-t border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span>GST Tax Total:</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {isWestBengal ? 'WB Intra-State' : 'Inter-State'}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-amber-400">₹{doc.taxTotal.toLocaleString('en-IN')}</span>
                    </div>
                    {doc.discount > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Discount:</span>
                        <span className="font-mono font-bold">- ₹{doc.discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {doc.subsidyEstimate && doc.subsidyEstimate > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Est. Govt. Subsidy:</span>
                        <span className="font-mono font-bold">- ₹{doc.subsidyEstimate.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-800 pt-2">
                      <div className="flex justify-between items-baseline font-bold">
                        <span className="text-amber-400">Grand Total:</span>
                        <span className="font-mono text-lg text-amber-400">
                          INR {doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider">
                          AMOUNT IN WORDS:
                        </span>
                        <p className="text-[11px] font-bold text-slate-100 italic">
                          ({grandTotalWords})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions Box */}
                <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl text-[11px] text-slate-700 leading-relaxed">
                  <div className="font-bold text-slate-900 mb-1">TERMS AND CONDITIONS</div>
                  <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-600">
                    {doc.termsAndConditions || EXACT_IMAGE_TERMS}
                  </pre>
                </div>

                {/* Signature Block */}
                <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
                  <div className="text-slate-500 text-[10px]">
                    Computer generated document | Authorized for Sun Light Electric
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">For SUN LIGHT ELECTRIC</div>
                    <div className="text-slate-500 italic mt-6">Authorized Signatory: Haradhan Patra</div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Info */}
        <div className="bg-slate-900 text-slate-400 px-4 py-2.5 text-[11px] flex items-center justify-between border-t border-slate-800 shrink-0">
          <span>Prepared by: Haradhan Patra | Sun Light Electric</span>
          <a
            href={waMeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1"
          >
            <Share2 className="w-3 h-3" />
            <span>Open Direct wa.me Deep Link</span>
          </a>
        </div>

      </div>
    </div>
  );
};


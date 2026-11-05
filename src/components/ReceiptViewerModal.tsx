import React from 'react';
import { QuotationInvoice, PaymentRecord, Language } from '../types';
import { COMPANY_CREDENTIALS } from '../data/mockData';
import { numberToWordsINR } from '../utils/numberToWords';
import { getReceiptWhatsAppDeepLinks } from '../utils/whatsappHelper';
import { downloadReceiptPdf } from '../utils/pdfGenerator';
import { X, Send, Download, Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

interface ReceiptViewerModalProps {
  receipt: PaymentRecord;
  invoice: QuotationInvoice;
  onClose: () => void;
  lang: Language;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  receipt,
  invoice,
  onClose,
  lang,
}) => {
  const currentAmt = receipt.amount ?? receipt.amountPaid ?? 0;
  const currentDate = receipt.receiptDate || receipt.date || '';
  const currentNote = receipt.installmentNote || receipt.notes;

  const paymentsList = invoice.payments || [];
  const totalPaid = paymentsList.reduce((acc, p) => acc + (p.amount ?? p.amountPaid ?? 0), 0);
  const remainingDue = Math.max(0, invoice.grandTotal - totalPaid);
  const waLinks = getReceiptWhatsAppDeepLinks(receipt, invoice, lang);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-start p-2 sm:p-4 md:p-6 z-50 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl print:shadow-none print:border-none print:w-full print:max-w-none print:max-h-none">
        
        {/* Modal Top Actions Header (Hidden in Print) */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-20 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs sm:text-sm">Official Money Receipt / Payment Voucher</span>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={waLinks.waMeUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow-sm"
              title="Share Receipt on WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            <button
              onClick={() => downloadReceiptPdf(receipt, invoice)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 border border-slate-700 cursor-pointer"
              title="Download Receipt PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 border border-slate-700 cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Money Receipt Document Body */}
        <div className="p-4 sm:p-6 md:p-8 space-y-6 bg-white text-slate-900 border-t-4 border-emerald-500 overflow-y-auto flex-1 relative">
          
          {/* Centered Background Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.06] overflow-hidden z-0">
            <CompanyLogo iconOnly className="w-72 h-72 object-contain" />
          </div>

          <div className="relative z-10 space-y-6">
            {/* Company Branding Letterhead Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-4 gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <CompanyLogo className="h-12 w-auto object-contain shrink-0" />
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                      {COMPANY_CREDENTIALS.companyName}
                    </h1>
                    <p className="text-xs text-amber-700 font-semibold">{COMPANY_CREDENTIALS.tagline}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {COMPANY_CREDENTIALS.address}<br />
                  <strong className="text-slate-700">GSTIN:</strong> {COMPANY_CREDENTIALS.gstin} | <strong className="text-slate-700">Mobile:</strong> +91 {COMPANY_CREDENTIALS.mobile}
                </p>
              </div>

            <div className="text-left sm:text-right font-mono bg-emerald-50 border border-emerald-200 rounded-xl p-3 shrink-0">
              <span className="text-[10px] font-sans font-bold text-emerald-800 uppercase block tracking-wider mb-1">
                MONEY RECEIPT VOUCHER
              </span>
              <div className="text-sm font-extrabold text-slate-900">{receipt.receiptNo}</div>
              <div className="text-xs text-slate-600">Date: {currentDate}</div>
              <div className="text-[11px] text-slate-500 mt-1 pt-1 border-t border-emerald-200">
                Invoice Ref: <strong className="text-slate-800">{invoice.documentNumber || invoice.invoiceNo}</strong>
              </div>
            </div>
          </div>

          {/* Received From Block - Full Width Card */}
          <div className="w-full border border-slate-300 rounded-xl p-3.5 bg-slate-50/80 text-xs block space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block tracking-wider">
              Received With Thanks From
            </span>
            <div className="font-extrabold text-slate-900 text-base">{invoice.customerName}</div>
            <div className="text-xs text-slate-600 mt-1">
              Mobile: +91 {invoice.customerPhone} {invoice.customerCategory ? `| Category: ${invoice.customerCategory}` : ''}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Address: {invoice.customerAddress}{invoice.customerState ? `, ${invoice.customerState}` : ''}
            </div>
            {invoice.customerGstin && (
              <div className="text-xs text-slate-600 font-mono mt-0.5">GSTIN: {invoice.customerGstin}</div>
            )}
          </div>

          {/* Amount Box */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono block tracking-wider">
                Amount Received (INR)
              </span>
              <div className="text-2xl font-extrabold text-emerald-700 font-sans">
                INR {currentAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-xs text-emerald-900 font-bold italic sm:text-right max-w-sm">
              {numberToWordsINR(currentAmt)}
            </div>
          </div>

          {/* Payment Details Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Payment Mode</th>
                  <th className="p-2.5">Installment Note</th>
                  <th className="p-2.5">Reference / UTR / Cheque</th>
                  <th className="p-2.5">Recorded By</th>
                  <th className="p-2.5 text-right">Amount Received (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">{receipt.paymentMode}</td>
                  <td className="p-2.5 text-emerald-700 font-medium">{currentNote || 'Payment Installment'}</td>
                  <td className="p-2.5 text-slate-600 font-mono">{receipt.referenceNo || 'N/A'}</td>
                  <td className="p-2.5 text-slate-600">{receipt.recordedBy || 'Haradhan Patra'}</td>
                  <td className="p-2.5 text-right font-extrabold text-slate-900 font-mono">
                    {currentAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* All Installments Breakdown Table (If multiple payments exist) */}
          {paymentsList.length > 1 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block tracking-wider">
                Complete Payment History ({paymentsList.length} Installments)
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 text-[9px] uppercase font-bold">
                    <tr>
                      <th className="p-2">Receipt No</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2">Stage / Note</th>
                      <th className="p-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {paymentsList.map((p, idx) => {
                      const isCurrent = p.receiptNo === receipt.receiptNo;
                      const pAmt = p.amount ?? p.amountPaid ?? 0;
                      const pDate = p.receiptDate || p.date || '';
                      const pNote = p.installmentNote || p.notes || '-';
                      return (
                        <tr key={p.receiptNo || idx} className={isCurrent ? 'bg-emerald-50/80 font-bold' : ''}>
                          <td className="p-2 text-slate-900 font-bold">{p.receiptNo} {isCurrent ? '✓' : ''}</td>
                          <td className="p-2 text-slate-600 font-sans">{pDate}</td>
                          <td className="p-2 text-slate-700 font-sans">{p.paymentMode}</td>
                          <td className="p-2 text-slate-600 font-sans">{pNote}</td>
                          <td className="p-2 text-right font-bold text-emerald-700">₹{pAmt.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Account Balance Breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans space-y-2">
            <div className="font-sans font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <span>INVOICE ACCOUNT BALANCE SUMMARY</span>
              <span className="text-[10px] text-slate-500 font-mono">Invoice #{invoice.documentNumber || invoice.invoiceNo}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block mb-0.5">Invoice Net Total</span>
                <strong className="text-slate-900 text-sm font-mono">INR {invoice.grandTotal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block mb-0.5">Total Paid Till Date</span>
                <strong className="text-emerald-700 text-sm font-mono">INR {totalPaid.toLocaleString('en-IN')}</strong>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-sans block mb-0.5">Remaining Balance Due</span>
                {remainingDue === 0 ? (
                  <strong className="text-emerald-600 font-sans font-bold text-sm block">FULLY PAID ✓</strong>
                ) : (
                  <strong className="text-rose-600 text-sm font-mono">INR {remainingDue.toLocaleString('en-IN')}</strong>
                )}
              </div>
            </div>
            {currentNote && (
              <p className="text-[11px] text-slate-500 italic pt-1 font-sans">
                <strong>Installment Note:</strong> {currentNote}
              </p>
            )}
          </div>

          {/* Footer Signature */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Computer Generated Official Receipt</span>
            </div>

            <div className="text-right">
              <div className="font-extrabold text-slate-900">For SUN LIGHT ELECTRIC</div>
              <div className="text-slate-500 italic text-[11px] mt-4">Authorized Signatory: Haradhan Patra</div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { SupplierChallan } from '../types/challan';
import { Language } from '../types';
import {
  X,
  Truck,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Eye,
  ShieldCheck,
  Package,
  Layers,
  ArrowDownRight
} from 'lucide-react';

interface ChallanViewerModalProps {
  challan: SupplierChallan | null;
  onClose: () => void;
  lang?: Language;
}

export const ChallanViewerModal: React.FC<ChallanViewerModalProps> = ({
  challan,
  onClose,
  lang = 'en',
}) => {
  const [showScanLightbox, setShowScanLightbox] = useState<boolean>(false);

  if (!challan) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200 print:max-w-none print:m-0 print:border-none print:shadow-none">
        
        {/* Header - Hidden on Print */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-sky-800/60 shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Goods Received Note (GRN)
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {challan.challanCode || 'GRN Verified'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                GRN / Ref #{challan.challanInvoiceNo} • {challan.supplierName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {challan.documentUrl && (
              <button
                type="button"
                onClick={() => setShowScanLightbox(true)}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="View original scanned document copy"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View Scan Proof</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
              title="Print Goods Received Note"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Slip</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-800 dark:text-slate-200">
          
          {/* Top Banner & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Goods Inward Certificate</div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {challan.challanCode || challan.id}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Delivery Date: <strong className="text-slate-800 dark:text-slate-200">{challan.challanDate}</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{challan.status}</span>
              </span>

              {challan.directInflowApplied && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>Direct Stock Inflow Applied</span>
                </span>
              )}
            </div>
          </div>

          {/* Parties Grid (Consignor & Consignee) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Consignor (Supplier) */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Consignor (Supplier / Dispatcher)</span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {challan.supplierName}
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                <div>GSTIN: <strong className="font-mono text-slate-900 dark:text-slate-100">{challan.supplierGstin || 'Unregistered / Exempt'}</strong></div>
                {challan.dispatchFrom && (
                  <div>Dispatch Facility: <span className="text-slate-800 dark:text-slate-200">{challan.dispatchFrom}</span></div>
                )}
                {challan.supplierPhone && (
                  <div>Contact: <span className="font-mono">{challan.supplierPhone}</span></div>
                )}
              </div>
            </div>

            {/* Consignee (Sun Light Electric) */}
            <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/80 rounded-2xl space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Consignee &amp; Warehouse Location</span>
              </div>
              <div className="text-base font-black text-sky-950 dark:text-sky-100">
                SUN LIGHT ELECTRIC
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                <div>Proprietor: <strong className="text-slate-900 dark:text-slate-100">Haradhan Patra</strong></div>
                <div>GSTIN: <strong className="font-mono text-slate-900 dark:text-slate-100">19AZEPP1218L1Z5</strong></div>
                <div>Warehouse: <span className="text-slate-800 dark:text-slate-200">{challan.destinationSite}</span></div>
              </div>
            </div>
          </div>

          {/* Transport & Dispatch Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Invoice / Challan Ref</span>
              <strong className="text-slate-900 dark:text-slate-100 text-xs">{challan.challanInvoiceNo}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-sans">E-Way Bill Number</span>
              <strong className="text-sky-600 dark:text-sky-400 text-xs">{challan.eWayBillNo || 'N/A'}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Transport Vehicle No</span>
              <strong className="text-slate-900 dark:text-slate-100 text-xs uppercase">{challan.vehicleNo || 'N/A'}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Received By</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-xs">{challan.receivedBy || 'Haradhan Patra'}</strong>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-900 text-white p-3 font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Materials &amp; Equipment Inward Specification</span>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {challan.items.length} Item{challan.items.length > 1 ? 's' : ''}
              </span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 font-mono">HSN Code</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Taxable Rate</th>
                  <th className="py-2.5 px-3 text-center">GST %</th>
                  <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {challan.items.map((item, idx) => {
                  const taxAmount = (item.cgstAmount || 0) + (item.sgstAmount || 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {item.itemDescription}
                        </div>
                        <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2">
                          <span>Category: {item.category}</span>
                          {item.matchingSkuCode && (
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              • SKU: {item.matchingSkuCode}
                            </span>
                          )}
                          {item.serialNumbers && item.serialNumbers.length > 0 && (
                            <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">
                              • {item.serialNumbers.length} Serials Recorded
                            </span>
                          )}
                        </div>
                        {item.serialNumbers && item.serialNumbers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 max-h-16 overflow-y-auto">
                            {item.serialNumbers.map((sn, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                {sn}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {item.hsnCode}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white font-mono">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">
                          {item.taxRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{(item.totalWithTax || (item.totalTaxableAmount + taxAmount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Calculations Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500 max-w-sm space-y-1">
                {challan.notes && (
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Inspection Note: </span>
                    <span>{challan.notes}</span>
                  </div>
                )}
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Materials physically verified against E-Way Bill #{challan.eWayBillNo || '881682871188'}
                </div>
              </div>

              <div className="space-y-1.5 min-w-[240px] text-xs font-mono">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Taxable Total:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    ₹{challan.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total GST (CGST + SGST):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    ₹{challan.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-300 dark:border-slate-700 flex justify-between text-base font-black text-emerald-600 dark:text-emerald-400">
                  <span>Grand Total:</span>
                  <span>₹{challan.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Signatures & Stamp Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-6">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Dispatched By / Transporter Sign-Off
              </span>
              <div className="text-center pt-4 border-t border-dashed border-slate-300 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {challan.supplierName}
                </div>
                <div className="text-[10px] text-slate-400">Authorized Logistics Representative</div>
              </div>
            </div>

            <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-4 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-6">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                Warehouse Inward &amp; Physical Verification
              </span>
              <div className="text-center pt-4 border-t border-dashed border-emerald-300 dark:border-emerald-700">
                <div className="font-black text-slate-900 dark:text-slate-100 text-xs">
                  SUN LIGHT ELECTRIC (SOALUK WAREHOUSE)
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                  Verified by: {challan.receivedBy || 'Haradhan Patra'} (Proprietor)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox for Authentic Challan Scan */}
        {showScanLightbox && challan.documentUrl && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-[60]">
            <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs truncate max-w-sm sm:max-w-md">
                    {challan.documentName || 'Scanned_Challan_Document'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScanLightbox(false)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                <img
                  src={challan.documentUrl}
                  alt={challan.documentName || 'Challan Scan'}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono text-[11px]">
                  Challan #{challan.challanInvoiceNo} • Loom Solar / Consignor Copy
                </span>
                <a
                  href={challan.documentUrl}
                  download={challan.documentName || `Challan_${challan.challanInvoiceNo}.svg`}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

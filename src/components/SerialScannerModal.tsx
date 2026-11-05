import React, { useState, useEffect, useRef } from 'react';
import { QuotationInvoice, DocumentLineItem } from '../types';
import { Camera, QrCode, X, Check, Trash2, Plus, Zap, AlertCircle, Scan, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface SerialScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: QuotationInvoice | null;
  onSaveSerialNumbers: (invoiceId: string, updatedItems: DocumentLineItem[]) => void;
}

export const SerialScannerModal: React.FC<SerialScannerModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSaveSerialNumbers,
}) => {
  const [items, setItems] = useState<DocumentLineItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [manualInput, setManualInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (invoice && isOpen) {
      setItems(
        invoice.items.map((item) => ({
          ...item,
          serialNumbers: item.serialNumbers ? [...item.serialNumbers] : [],
        }))
      );
      setSelectedItemIndex(0);
      setIsScanning(false);
      setCameraError(null);
      setLastScanned(null);
    }
  }, [invoice, isOpen]);

  // Clean up camera scanner on unmount or close
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  if (!isOpen || !invoice) return null;

  const currentItem = items[selectedItemIndex];

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop warning:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      const html5Qrcode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 180 } },
        (decodedText) => {
          handleScannedSerial(decodedText);
        },
        () => {
          // Ignore frame decode errors
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera Scanner Error:', err);
      setCameraError(
        err?.message || 'Camera access denied or device not found. You can manually enter serial numbers below.'
      );
      setIsScanning(false);
    }
  };

  const handleToggleScan = () => {
    if (isScanning) {
      stopScanner();
    } else {
      startScanner();
    }
  };

  const handleScannedSerial = (serial: string) => {
    const cleanSerial = serial.trim().toUpperCase();
    if (!cleanSerial || !currentItem) return;

    // Check duplicate
    if (currentItem.serialNumbers?.includes(cleanSerial)) {
      setLastScanned(`Duplicate: ${cleanSerial}`);
      return;
    }

    // Add serial
    const updated = [...items];
    const targetItem = updated[selectedItemIndex];
    const currentSerials = targetItem.serialNumbers || [];

    if (currentSerials.length >= targetItem.quantity) {
      setLastScanned(`Max quantity (${targetItem.quantity}) reached for ${targetItem.itemCode}`);
      return;
    }

    targetItem.serialNumbers = [...currentSerials, cleanSerial];
    setItems(updated);
    setLastScanned(`Scanned: ${cleanSerial}`);
  };

  const handleAddManualSerial = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualInput.trim()) return;

    handleScannedSerial(manualInput);
    setManualInput('');
  };

  const handleRemoveSerial = (itemIdx: number, serialIdx: number) => {
    const updated = [...items];
    const target = updated[itemIdx];
    if (target.serialNumbers) {
      target.serialNumbers.splice(serialIdx, 1);
      setItems(updated);
    }
  };

  const handleAutoGenerateSerials = (itemIdx: number) => {
    const updated = [...items];
    const target = updated[itemIdx];
    const needed = target.quantity - (target.serialNumbers?.length || 0);

    if (needed <= 0) return;

    const prefix = target.itemCode.replace(/[^A-Z0-9]/gi, '').slice(0, 6) || 'SN';
    const newSerials: string[] = [];

    for (let i = 0; i < needed; i++) {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      newSerials.push(`${prefix}-${randomNum}`);
    }

    target.serialNumbers = [...(target.serialNumbers || []), ...newSerials];
    setItems(updated);
  };

  const handleSave = () => {
    stopScanner();
    onSaveSerialNumbers(invoice.id, items);
    onClose();
  };

  const totalRequiredSerials = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAssignedSerials = items.reduce(
    (sum, item) => sum + (item.serialNumbers?.length || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-sky-950 text-white flex items-center justify-between border-b border-sky-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-400 text-amber-950 rounded-xl font-bold shadow-xs">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Serial Number Scanner &amp; Assignment
              </h3>
              <p className="text-xs text-sky-200">
                Invoice #{invoice.documentNumber} • Customer: {invoice.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-xl text-sky-200 hover:text-white hover:bg-sky-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Progress Banner */}
          <div className="p-4 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wider block">
                Total Component Serials Assigned
              </span>
              <div className="text-xl font-mono font-extrabold text-slate-900 dark:text-white">
                {totalAssignedSerials} / {totalRequiredSerials} <span className="text-xs text-slate-500 font-normal">Serials Logged</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleScan}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                  isScanning
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-400 hover:bg-amber-500 text-amber-950'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{isScanning ? 'Stop Camera' : 'Start Camera Scanner'}</span>
              </button>
            </div>
          </div>

          {/* Scanner Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 min-h-[240px] flex flex-col items-center justify-center p-4">
                <div id="qr-reader" className="w-full h-full min-h-[220px]" />

                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-slate-950/90 text-slate-400 space-y-2">
                    <QrCode className="w-12 h-12 text-slate-600" />
                    <p className="text-xs">Camera scanner is idle.</p>
                    <button
                      onClick={startScanner}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-amber-950 hover:bg-amber-300 transition-all cursor-pointer"
                    >
                      Turn On Camera
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{cameraError}</span>
                </div>
              )}

              {lastScanned && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-mono font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>{lastScanned}</span>
                </div>
              )}

              {/* Manual Entry */}
              <form onSubmit={handleAddManualSerial} className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Manual Serial Entry (for {currentItem?.itemCode})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Type or paste barcode/serial..."
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Line Items & Serial List */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Invoice Components ({items.length})
              </h4>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const assignedCount = item.serialNumbers?.length || 0;
                  const isSelected = selectedItemIndex === idx;
                  const isComplete = assignedCount >= item.quantity;

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => setSelectedItemIndex(idx)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-slate-800/80 border-amber-400 ring-1 ring-amber-400/50 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white mr-1">
                            {item.itemCode}
                          </span>
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold px-1.5 py-0.2 rounded border border-slate-300 dark:border-slate-600">
                            HSN: {item.hsnCode || (item.itemCode.startsWith('SP-') ? '85017200' : '850440')}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {item.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {assignedCount} / {item.quantity} {item.unit}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoGenerateSerials(idx);
                            }}
                            className="px-2 py-1 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 hover:bg-sky-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                            title="Auto-fill sample mock serials for quick demo"
                          >
                            <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            <span>Auto-Fill</span>
                          </button>
                        </div>
                      </div>

                      {/* Serial Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.serialNumbers && item.serialNumbers.length > 0 ? (
                          item.serialNumbers.map((sn, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] rounded-lg shadow-2xs"
                            >
                              <span>#{sIdx + 1}: {sn}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSerial(idx, sIdx);
                                }}
                                className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            No serial numbers scanned yet.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Save &amp; Assign Serial Numbers</span>
          </button>
        </div>
      </div>
    </div>
  );
};

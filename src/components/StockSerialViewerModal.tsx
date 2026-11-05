import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import {
  Barcode,
  Search,
  Copy,
  Check,
  X,
  Plus,
  Trash2,
  Package,
  Layers,
  FileText,
  Boxes,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface StockSerialViewerModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSerials?: (itemCode: string, updatedSerials: string[]) => void;
}

export const StockSerialViewerModal: React.FC<StockSerialViewerModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateSerials,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);
  const [newSerialInput, setNewSerialInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Fallback to item serials or empty array
  const serials = useMemo(() => {
    return item?.availableSerialNumbers || [];
  }, [item?.availableSerialNumbers]);

  // Filtered serials
  const filteredSerials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return serials;
    return serials.filter((sn) => sn.toLowerCase().includes(q));
  }, [serials, searchQuery]);

  if (!isOpen || !item) return null;

  const handleCopyAll = async () => {
    if (filteredSerials.length === 0) return;
    const textToCopy = filteredSerials.join(', ');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2200);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2200);
    }
  };

  const handleCopySingle = async (serial: string) => {
    try {
      await navigator.clipboard.writeText(serial);
      setCopiedSerial(serial);
      setTimeout(() => setCopiedSerial(null), 1800);
    } catch {
      // fallback
      setCopiedSerial(serial);
      setTimeout(() => setCopiedSerial(null), 1800);
    }
  };

  const handleAddSerial = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    const input = newSerialInput.trim();
    if (!input) return;

    // Support comma or newline separated entries
    const candidates = input
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (candidates.length === 0) return;

    const existingSet = new Set(serials.map((s) => s.toUpperCase()));
    const duplicates: string[] = [];
    const validToAdd: string[] = [];

    for (const cand of candidates) {
      if (existingSet.has(cand.toUpperCase())) {
        duplicates.push(cand);
      } else {
        existingSet.add(cand.toUpperCase());
        validToAdd.push(cand);
      }
    }

    if (validToAdd.length === 0) {
      setAddError(`Serial ${duplicates.join(', ')} already exists in stock!`);
      return;
    }

    const updated = [...serials, ...validToAdd];
    if (onUpdateSerials) {
      onUpdateSerials(item.code, updated);
    }

    setNewSerialInput('');
    if (duplicates.length > 0) {
      setAddSuccess(`Added ${validToAdd.length} serials. (${duplicates.length} duplicate skipped)`);
    } else {
      setAddSuccess(`Successfully added ${validToAdd.length} serial ${validToAdd.length === 1 ? 'number' : 'numbers'}.`);
    }
    setTimeout(() => {
      setAddSuccess(null);
      setAddError(null);
    }, 3000);
  };

  const handleRemoveSerial = (serialToRemove: string) => {
    if (confirm(`Remove serial "${serialToRemove}" from available stock?`)) {
      const updated = serials.filter((s) => s !== serialToRemove);
      if (onUpdateSerials) {
        onUpdateSerials(item.code, updated);
      }
    }
  };

  const stockLevel = item.stockLevel ?? 0;
  const isReconciled = serials.length === stockLevel;
  const isSurplus = serials.length > stockLevel;
  const isDeficit = serials.length < stockLevel;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-60 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 text-white p-5 flex items-start justify-between border-b border-sky-800/80 shrink-0">
          <div className="flex items-start space-x-3.5 min-w-0">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/40 shrink-0 mt-0.5">
              <Barcode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow-2xs">
                  {item.code}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {item.category}
                </span>
                {item.hsnCode && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    HSN: {item.hsnCode}
                  </span>
                )}
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Stock: {stockLevel} {item.unit}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-white tracking-tight truncate max-w-xl" title={item.name}>
                Stock Serial Numbers - {item.name}
              </h3>
              <p className="text-xs text-sky-200/80 font-medium mt-0.5 flex items-center gap-1.5">
                <span>Pursurah Central Godown Equipment Ledger</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {serials.length} {serials.length === 1 ? 'Serial Registered' : 'Serials Registered'}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-3"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Toolbar: Search, Copy All, and Reconciliation Banner */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          {/* Reconciliation Status Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Serial Reconciliation:</span>
              {isReconciled ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Reconciled ({serials.length} serials match {stockLevel} {item.unit})</span>
                </span>
              ) : isDeficit ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{stockLevel - serials.length} more serials needed to match stock quantity</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  <Boxes className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{serials.length - stockLevel} serials recorded above counted stock</span>
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredSerials.length}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{serials.length}</strong> serials
            </div>
          </div>

          {/* Search bar & Copy All Button */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search serial number by keyword (e.g. 540W, TPC, 001)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyAll}
              disabled={filteredSerials.length === 0}
              className={`w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer ${
                copiedAll
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Copy all currently filtered serial numbers separated by commas"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>All Serials Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy {searchQuery.trim() ? 'Filtered' : 'All'} Serials</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Add Serial Form */}
          {onUpdateSerials && (
            <form onSubmit={handleAddSerial} className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Enter new serial number (e.g. SN-041 or comma-separated list)..."
                    value={newSerialInput}
                    onChange={(e) => setNewSerialInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newSerialInput.trim()}
                  className="w-full sm:w-auto px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Add Serial</span>
                </button>
              </div>

              {addError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{addError}</span>
                </p>
              )}
              {addSuccess && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{addSuccess}</span>
                </p>
              )}
            </form>
          )}
        </div>

        {/* Modal Scrollable Body: Serials Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 max-h-[50vh] bg-slate-100/60 dark:bg-slate-950/40">
          {filteredSerials.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <Barcode className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                {searchQuery ? 'No matching serial numbers found' : 'No serial numbers registered yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No serial numbers contain "${searchQuery}". Clear search keyword to view all registered serials.`
                  : 'Add serial numbers using the form above or register them during inward goods arrival (GRN).'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  Clear search filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredSerials.map((sn, idx) => {
                const isRecentlyCopied = copiedSerial === sn;

                return (
                  <div
                    key={`${sn}-${idx}`}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600/80 transition-all shadow-2xs hover:shadow-xs group flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0 w-6">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-mono font-extrabold text-xs text-slate-900 dark:text-slate-100 tracking-tight truncate" title={sn}>
                          {sn}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            Available in Godown
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopySingle(sn)}
                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isRecentlyCopied
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Copy serial number"
                      >
                        {isRecentlyCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {onUpdateSerials && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSerial(sn)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                          title="Remove serial from stock"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
            <Boxes className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium">
              Pursurah Storage Ledger • <strong>{serials.length}</strong> Available Serial Numbers in stock
            </span>
          </div>

          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

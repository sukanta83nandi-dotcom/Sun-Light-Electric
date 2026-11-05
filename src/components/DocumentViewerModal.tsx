import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { ClientDocument } from '../types';

interface DocumentViewerModalProps {
  document: ClientDocument | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  if (!document) return null;

  const isPdf =
    document.name.toLowerCase().endsWith('.pdf') ||
    (document.mimeType && document.mimeType.includes('pdf')) ||
    document.dataUrl.startsWith('data:application/pdf');

  const isImage =
    document.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ||
    (document.mimeType && document.mimeType.startsWith('image/')) ||
    document.dataUrl.startsWith('data:image/');

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = document.dataUrl;
    link.download = document.name;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    // Open in separate popup window or tab
    const win = window.open();
    if (win) {
      if (isPdf) {
        win.document.write(
          `<html><head><title>${document.name}</title></head><body style="margin:0;"><iframe src="${document.dataUrl}" style="width:100vw;height:100vh;border:none;"></iframe></body></html>`
        );
      } else {
        win.document.write(
          `<html><head><title>${document.name}</title></head><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${document.dataUrl}" style="max-width:95vw;max-height:95vh;object-fit:contain;box-shadow:0 10px 25px rgba(0,0,0,0.5);border-radius:8px;" /></body></html>`
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-[60] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100 truncate">{document.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 shrink-0 font-bold">
                  {typeof document.size === 'number'
                    ? `${(document.size / (1024 * 1024)).toFixed(2)} MB`
                    : document.size}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                Category: <span className="text-emerald-400 font-semibold">{document.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenExternal}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950/70 p-4 overflow-auto flex items-center justify-center min-h-[300px]">
          {isImage ? (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={document.dataUrl}
                alt={document.name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-white">
              <iframe
                src={document.dataUrl}
                title={document.name}
                className="w-full h-full border-none"
              />
            </div>
          ) : (
            <div className="text-center p-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {document.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Preview not directly renderable for this MIME type ({document.mimeType || 'binary'}). You can download the file directly.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Document</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Uploaded: <strong>{document.uploadedAt || 'Current Session'}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

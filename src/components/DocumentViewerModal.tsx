import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { ClientDocument } from '../types';
import { SupplierDocument } from '../types/supplier';
import {
  createSafeBlobUrl,
  revokeSafeBlobUrl,
  getRawFile,
  inferMimeTypeFromFileName,
} from '../utils/blobHelper';

export interface PreviewableDocument {
  id?: string;
  name?: string;
  fileName?: string;
  category?: string;
  docType?: string;
  size?: number | string;
  dataUrl?: string;
  fileDataUrl?: string;
  fileUrl?: string;
  uploadedAt?: string;
  mimeType?: string;
  type?: string;
}

interface DocumentViewerModalProps {
  document: ClientDocument | SupplierDocument | PreviewableDocument | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const docAny = doc as PreviewableDocument | null;
  const docId = docAny?.id;
  const fileName = docAny?.name || docAny?.fileName || 'Supporting_Document';
  const docCategory = docAny?.category || docAny?.docType || 'Supporting Document';
  const rawSourceUrl = docAny?.dataUrl || docAny?.fileDataUrl || docAny?.fileUrl || '';
  const resolvedMime =
    docAny?.mimeType || docAny?.type || inferMimeTypeFromFileName(fileName);

  useEffect(() => {
    setIsZoomed(false);

    if (!doc) {
      setBlobUrl('');
      return;
    }

    const rawFile = getRawFile(docId);
    const generatedUrl = createSafeBlobUrl(rawSourceUrl, resolvedMime, rawFile, fileName);
    setBlobUrl(generatedUrl);

    return () => {
      revokeSafeBlobUrl(generatedUrl, rawSourceUrl);
    };
  }, [doc, docId, rawSourceUrl, resolvedMime, fileName]);

  if (!doc) return null;

  const lowerName = fileName.toLowerCase();
  const isPdf =
    lowerName.endsWith('.pdf') ||
    resolvedMime.toLowerCase().includes('pdf') ||
    rawSourceUrl.startsWith('data:application/pdf');

  const isImage =
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lowerName) ||
    resolvedMime.toLowerCase().startsWith('image/') ||
    rawSourceUrl.startsWith('data:image/');

  const isExcel =
    /\.(xlsx?|csv)$/i.test(lowerName) ||
    resolvedMime.toLowerCase().includes('sheet') ||
    resolvedMime.toLowerCase().includes('excel');

  const isWord =
    /\.(docx?)$/i.test(lowerName) ||
    resolvedMime.toLowerCase().includes('word') ||
    resolvedMime.toLowerCase().includes('msword');

  const formattedSize =
    typeof docAny?.size === 'number'
      ? docAny.size < 1024 * 1024
        ? `${(docAny.size / 1024).toFixed(1)} KB`
        : `${(docAny.size / (1024 * 1024)).toFixed(2)} MB`
      : docAny?.size || 'Attached File';

  const activeUrl = blobUrl || rawSourceUrl;

  const handleOpenExternal = () => {
    if (!activeUrl) return;
    window.open(activeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-[70] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              {isExcel ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100 truncate">{fileName}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 shrink-0 font-bold">
                  {formattedSize}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                Category:{' '}
                <span className="text-emerald-400 font-semibold">{docCategory}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isImage && (
              <button
                type="button"
                onClick={() => setIsZoomed((prev) => !prev)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={isZoomed ? 'Fit to Screen' : 'Zoom In'}
              >
                {isZoomed ? (
                  <ZoomOut className="w-4 h-4" />
                ) : (
                  <ZoomIn className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenExternal}
              disabled={!activeUrl}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <a
              href={activeUrl || '#'}
              download={fileName}
              onClick={(e) => {
                if (!activeUrl) e.preventDefault();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer no-underline"
              title={`Download ${fileName}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

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
        <div className="flex-1 bg-slate-100 dark:bg-slate-950/70 p-4 overflow-auto flex flex-col items-center justify-center min-h-[320px]">
          {!activeUrl ? (
            <div className="text-center p-8 space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                File content is unavailable for preview.
              </p>
            </div>
          ) : isImage ? (
            <div
              onClick={() => setIsZoomed((prev) => !prev)}
              className={`w-full flex items-center justify-center ${
                isZoomed ? 'overflow-auto cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              title={isZoomed ? 'Click to reset zoom' : 'Click to zoom in'}
            >
              <img
                src={activeUrl}
                alt={fileName}
                className={
                  isZoomed
                    ? 'max-w-none w-[140%] sm:w-[125%] h-auto object-contain mx-auto rounded-lg shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    : 'max-h-[70vh] w-auto object-contain mx-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }
              />
            </div>
          ) : isPdf ? (
            <div className="w-full flex flex-col gap-3">
              <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800 bg-white shadow-inner">
                <object
                  data={activeUrl}
                  type="application/pdf"
                  className="w-full h-[70vh] rounded-lg"
                >
                  <iframe
                    src={activeUrl}
                    title={fileName}
                    className="w-full h-full border-0"
                  />
                </object>
              </div>

              {/* Clear Fallback Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-medium">
                  If preview is blocked by your browser, click{' '}
                  <strong>Open in New Tab</strong>.
                </span>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e4252] hover:bg-[#14586d] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div
                className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
                  isExcel
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : isWord
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                {isExcel ? (
                  <FileSpreadsheet className="w-8 h-8" />
                ) : (
                  <FileText className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 break-words">
                  {fileName}
                </h4>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>{formattedSize}</span>
                  {docAny?.uploadedAt && <span>• {docAny.uploadedAt}</span>}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  {isWord || isExcel
                    ? 'Browsers cannot natively preview Word or Excel documents inline. Download the file to open it locally.'
                    : `Preview is not directly renderable for this file format (${resolvedMime}).`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <a
                  href={activeUrl}
                  download={fileName}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors no-underline cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <span>
              Uploaded: <strong>{docAny?.uploadedAt || 'Current Session'}</strong>
            </span>
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

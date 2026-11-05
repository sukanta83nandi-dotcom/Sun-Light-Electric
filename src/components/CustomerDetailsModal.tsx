import React, { useState, useRef } from 'react';
import {
  X,
  Users,
  Phone,
  MessageCircle,
  MapPin,
  Tag,
  FileText,
  UploadCloud,
  Eye,
  Trash2,
  Download,
  Plus,
  AlertCircle,
  CheckCircle2,
  Building,
  Image as ImageIcon,
} from 'lucide-react';
import { Customer, ClientDocument, ClientDocumentCategory } from '../types';
import { DocumentViewerModal } from './DocumentViewerModal';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  onClose: () => void;
  onUpdateCustomer: (updated: Customer) => void;
}

export const KYC_DOCUMENT_CATEGORIES: ClientDocumentCategory[] = [
  'Electricity Bill (Discom Consumer Copy)',
  'Aadhaar / Voter ID',
  'PAN Card',
  'Roof Ownership / Land Deed',
  'Site / Roof Photo',
  'Other Document',
];

export const formatFileSize = (bytesOrStr: number | string): string => {
  if (typeof bytesOrStr === 'string') return bytesOrStr;
  if (!bytesOrStr || bytesOrStr === 0) return '0 KB';
  if (bytesOrStr < 1024 * 1024) {
    return `${(bytesOrStr / 1024).toFixed(1)} KB`;
  }
  return `${(bytesOrStr / (1024 * 1024)).toFixed(2)} MB`;
};

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customer,
  onClose,
  onUpdateCustomer,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<ClientDocumentCategory>('Electricity Bill (Discom Consumer Copy)');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ClientDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!customer) return null;

  const documents = customer.documents || [];

  const handleFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const newDocs: ClientDocument[] = [];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    Array.from(files).forEach((file) => {
      if (file.size > maxSizeBytes) {
        setUploadError(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }

      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
        setUploadError(`File "${file.name}" is not a supported format (PDF, JPG, PNG).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const doc: ClientDocument = {
          id: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          category: selectedCategory,
          name: file.name,
          size: formatFileSize(file.size),
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString().split('T')[0],
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        };

        const updatedCustomer: Customer = {
          ...customer,
          documents: [...(customer.documents || []), doc],
        };
        onUpdateCustomer(updatedCustomer);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (window.confirm('Are you sure you want to delete this attached document?')) {
      const updatedCustomer: Customer = {
        ...customer,
        documents: (customer.documents || []).filter((d) => d.id !== docId),
      };
      onUpdateCustomer(updatedCustomer);
    }
  };

  const handleDownloadDoc = (doc: ClientDocument) => {
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDocIcon = (doc: ClientDocument) => {
    if (doc.name.toLowerCase().endsWith('.pdf') || (doc.mimeType && doc.mimeType.includes('pdf'))) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (doc.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|svg)$/i) || (doc.mimeType && doc.mimeType.startsWith('image/'))) {
      return <ImageIcon className="w-5 h-5 text-sky-500" />;
    }
    return <FileText className="w-5 h-5 text-amber-500" />;
  };

  const getCategoryBadgeColor = (category: ClientDocumentCategory) => {
    switch (category) {
      case 'Electricity Bill (Discom Consumer Copy)':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'Aadhaar / Voter ID':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'PAN Card':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Roof Ownership / Land Deed':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'Site / Roof Photo':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const sanitizePhoneNumber = (phone: string) => phone.replace(/[^0-9]/g, '');

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Modal Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base text-slate-100 truncate">{customer.name}</h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {customer.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      customer.category === 'Commercial'
                        ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                        : 'bg-blue-950/60 text-blue-300 border-blue-800'
                    }`}
                  >
                    {customer.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Solar Client Master Profile &amp; KYC Vault
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
            {/* Quick Master Information Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Contact Number</span>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                  <span>{customer.phone}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">State &amp; Pincode</span>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{customer.state} ({customer.stateCode || '19'}) - {customer.pinCode || customer.pincode}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">GSTIN / Status</span>
                <div className="font-mono text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>{customer.gstin || 'Unregistered'}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${customer.status === 'active' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-500/20 text-slate-400'}`}>
                    {customer.status}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-start gap-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mt-0.5">Address:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{customer.address}</span>
              </div>
            </div>

            {/* Supporting Documents & KYC Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Supporting Documents &amp; KYC Vault</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Official Discom electricity bills, identity proofs, site photos &amp; land deeds ({documents.length})
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {documents.length} Files Attached
                </span>
              </div>

              {/* Upload New Document Box */}
              <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-400/30 dark:border-amber-800/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Upload Additional Document
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">Category:</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as ClientDocumentCategory)}
                      className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-amber-500"
                    >
                      {KYC_DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-amber-500 bg-amber-100/50 dark:bg-amber-900/40'
                      : 'border-slate-300 dark:border-slate-700 hover:border-amber-400 bg-white/60 dark:bg-slate-900/60'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                  />
                  <UploadCloud className="w-7 h-7 mx-auto text-amber-500 mb-1.5" />
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Click to browse or drag &amp; drop files here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports PDF, JPG, PNG up to 10MB per document
                  </p>
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Uploaded Documents List */}
              {documents.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No documents attached yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Attach customer electricity consumer bills, ID proofs, roof deeds, or photos above for easy audit compliance.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400/80 transition-all"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 mt-0.5">
                          {getDocIcon(doc)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(
                                doc.category
                              )}`}
                            >
                              {doc.category}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                              {typeof doc.size === 'number'
                                ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB`
                                : doc.size}
                            </span>
                            {doc.uploadedAt && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                • {doc.uploadedAt}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                            {doc.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold cursor-pointer transition-colors"
                          title="View / Preview Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold cursor-pointer transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">
              Sun Light Electric Client Document Manager
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewerModal
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </>
  );
};

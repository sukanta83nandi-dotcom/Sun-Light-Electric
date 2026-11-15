import React, { useState, useEffect, useRef } from 'react';
import { Supplier, SupplierDocument } from '../types/supplier';
import { INDIAN_STATES } from '../data/mockData';
import {
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  MapPin,
  CreditCard,
  Landmark,
  X,
  ArrowLeft,
  Plus,
  Check,
  CheckSquare,
  Square,
  Paperclip,
  UploadCloud,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  File,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { DocumentViewerModal } from './DocumentViewerModal';
import {
  registerRawFile,
  getRawFile,
  createSafeBlobUrl,
  revokeSafeBlobUrl,
} from '../utils/blobHelper';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  editingSupplier?: Supplier | null;
  existingSuppliersCount: number;
}

const COMMON_CATEGORIES = [
  'Solar Panels',
  'Inverters',
  'Battery',
  'Mounting Structure',
  'Cable & Wiring',
  'Accessories',
  'Hybrid Solar Systems',
  'Solar Water Pumps',
];

const KYC_DOCUMENT_TYPES = [
  'GST Certificate',
  'Cancelled Cheque',
  'MSME / Udyam Registration',
  'Trade License',
  'PAN Card',
  'Vendor Agreement / Contract',
  'ISO / BIS Solar Quality Certificate',
  'Other KYC Document',
];

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSupplier,
  existingSuppliersCount,
}) => {
  const [supplierCode, setSupplierCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('West Bengal');
  const [categorySupplied, setCategorySupplied] = useState('Solar Panels');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [balancePayable, setBalancePayable] = useState<number>(0);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Supporting Documents & KYC state
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<SupplierDocument[]>([]);
  const [draggingDocType, setDraggingDocType] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SupplierDocument | null>(null);
  const [docValidationError, setDocValidationError] = useState<boolean>(false);
  const [showDocWarningModal, setShowDocWarningModal] = useState<boolean>(false);
  const [shakeKey, setShakeKey] = useState<number>(0);
  const slotInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const docSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDocValidationError(false);
    setShowDocWarningModal(false);
    setDraggingDocType(null);
    if (editingSupplier) {
      setSupplierCode(editingSupplier.supplierCode);
      setCompanyName(editingSupplier.companyName);
      setContactPerson(editingSupplier.contactPerson);
      setPhone(editingSupplier.phone);
      setEmail(editingSupplier.email || '');
      setGstin(editingSupplier.gstin || '');
      setAddress(editingSupplier.address);
      setState(editingSupplier.state || 'West Bengal');
      setCategorySupplied(editingSupplier.categorySupplied);
      setIsCustomCategory(!COMMON_CATEGORIES.includes(editingSupplier.categorySupplied));
      setCustomCategoryText(editingSupplier.categorySupplied);
      setPaymentTermsDays(editingSupplier.paymentTermsDays ?? 30);
      setBalancePayable(editingSupplier.balancePayable ?? 0);
      setStatus(editingSupplier.status || 'active');
      setBankName(editingSupplier.bankDetails?.bankName || '');
      setAccountNo(editingSupplier.bankDetails?.accountNo || '');
      setIfscCode(editingSupplier.bankDetails?.ifscCode || '');

      const rawDocs: SupplierDocument[] =
        editingSupplier.documents && editingSupplier.documents.length > 0
          ? editingSupplier.documents
          : (editingSupplier.supportingDocuments || []).map((sd, idx) => ({
              id: sd.id || `DOC-${Date.now()}-${idx}`,
              name: sd.fileName,
              category: sd.docType,
              size: sd.size || 'Stored',
              type: sd.type || 'application/octet-stream',
              uploadedAt: sd.uploadedAt,
              dataUrl: sd.fileUrl,
            }));

      const normalizedDocs = rawDocs.map((d) => ({
        ...d,
        category:
          d.category && KYC_DOCUMENT_TYPES.includes(d.category)
            ? d.category
            : 'Other KYC Document',
      }));
      setUploadedDocs(normalizedDocs);
      const uniqueTypes = Array.from(
        new Set(normalizedDocs.map((d) => d.category || 'Other KYC Document'))
      );
      setSelectedDocTypes(uniqueTypes);
    } else {
      const nextNum = String(existingSuppliersCount + 1).padStart(3, '0');
      setSupplierCode(`SUP-2026-${nextNum}`);
      setCompanyName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setGstin('');
      setAddress('');
      setState('West Bengal');
      setCategorySupplied('Solar Panels');
      setIsCustomCategory(false);
      setCustomCategoryText('');
      setPaymentTermsDays(30);
      setBalancePayable(0);
      setStatus('active');
      setBankName('HDFC Bank');
      setAccountNo('');
      setIfscCode('');
      setUploadedDocs([]);
      setSelectedDocTypes([]);
    }
  }, [editingSupplier, existingSuppliersCount, isOpen]);

  if (!isOpen) return null;

  const handleToggleDocType = (docType: string) => {
    setSelectedDocTypes((prev) => {
      if (prev.includes(docType)) {
        // Unticking removes its upload slot and attached files for that docType cleanly
        setUploadedDocs((docs) => docs.filter((d) => d.category !== docType));
        return prev.filter((t) => t !== docType);
      }
      return [...prev, docType];
    });
  };

  const handleToggleSelectAllDocTypes = () => {
    if (selectedDocTypes.length === KYC_DOCUMENT_TYPES.length) {
      setSelectedDocTypes([]);
      setUploadedDocs([]);
    } else {
      setSelectedDocTypes([...KYC_DOCUMENT_TYPES]);
    }
  };

  const handleClearDocTypes = () => {
    setSelectedDocTypes([]);
    setUploadedDocs([]);
  };

  const handleFileUploadForDocType = (files: FileList | null, targetDocType: string) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const sizeFormatted =
          file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(0)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

        const newDocId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        registerRawFile(newDocId, file);

        const newDoc: SupplierDocument = {
          id: newDocId,
          name: `${targetDocType} - ${file.name}`,
          category: targetDocType,
          size: sizeFormatted,
          type: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString().split('T')[0],
          dataUrl: uploadEvent.target?.result as string,
        };

        setUploadedDocs((prev) => [...prev, newDoc]);
        setDocValidationError(false);
        setShowDocWarningModal(false);
      };
      reader.readAsDataURL(file);
    });

    const inputEl = slotInputRefs.current[targetDocType];
    if (inputEl) {
      inputEl.value = '';
    }
  };

  const handleRemoveDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDownloadDoc = (doc: SupplierDocument) => {
    if (!doc.dataUrl) {
      alert(`File content for "${doc.name}" is not locally stored.`);
      return;
    }
    const blobUrl = createSafeBlobUrl(
      doc.dataUrl,
      doc.type,
      getRawFile(doc.id),
      doc.name
    );
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => revokeSafeBlobUrl(blobUrl, doc.dataUrl), 1000);
  };

  const handleSlotDragOver = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setDraggingDocType(docType);
  };

  const handleSlotDragLeave = (docType: string) => {
    setDraggingDocType((prev) => (prev === docType ? null : prev));
  };

  const handleSlotDrop = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setDraggingDocType(null);
    if (e.dataTransfer.files) {
      handleFileUploadForDocType(e.dataTransfer.files, docType);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !phone.trim()) {
      alert('Please enter Company Name and Phone number.');
      return;
    }

    // Strictly mandatory supporting document validation
    if (uploadedDocs.length === 0) {
      setDocValidationError(true);
      setShakeKey((prev) => prev + 1);
      setShowDocWarningModal(true);
      docSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const finalCategory = isCustomCategory
      ? (customCategoryText.trim() || 'Solar Panels')
      : categorySupplied;

    const supportingDocuments = uploadedDocs.map((doc) => ({
      id: doc.id,
      docType: doc.category || 'Other KYC Document',
      fileName: doc.name,
      fileUrl: doc.dataUrl || '',
      uploadedAt: doc.uploadedAt || new Date().toISOString().split('T')[0],
      size: doc.size,
      type: doc.type,
    }));

    const supplierData: Supplier = {
      id: editingSupplier ? editingSupplier.id : `SUP-${Date.now().toString().slice(-4)}`,
      supplierCode: supplierCode.trim() || `SUP-2026-${String(existingSuppliersCount + 1).padStart(3, '0')}`,
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || 'Procurement In-charge',
      phone: phone.trim(),
      email: email.trim(),
      gstin: gstin.trim().toUpperCase(),
      address: address.trim() || 'West Bengal',
      state,
      categorySupplied: finalCategory,
      paymentTermsDays: Number(paymentTermsDays) || 30,
      bankDetails: {
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
      },
      balancePayable: Number(balancePayable) || 0,
      status,
      documents: uploadedDocs,
      supportingDocuments,
    };

    onSave(supplierData);
    onClose();
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-150">
      {/* Top Dark Teal Gradient Header Bar */}
      <div className="bg-gradient-to-r from-[#0b3b48] to-[#134e63] text-white px-6 py-4 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 border-b border-[#1b5d74]">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/40 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
              {editingSupplier ? 'Edit Supplier Details' : 'Register New Solar Equipment Supplier'}
            </h3>
            <p className="text-xs text-teal-100/80 font-medium">
              Sun Light Electric • Procurement &amp; Vendor Management
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs border border-teal-200/35 shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-teal-200" />
          <span>Back to Supplier Directory</span>
        </button>
      </div>

      {/* Full-Width Inline Form (No Nested Scrollbars) */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 text-xs text-slate-700 dark:text-slate-200">
        {/* Section 1: Basic, Contact & Tax Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Building2 className="w-4 h-4 text-[#134e63] dark:text-amber-400" />
              <span>Vendor Profile, Contact &amp; Tax Details</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Fields marked <span className="text-rose-500 font-bold">*</span> are required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Supplier Code / ID
              </label>
              <input
                type="text"
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Company / Vendor Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Waaree Solar Distributors Pvt Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Person
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Amit Sharma"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone / WhatsApp <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="e.g. +91 98300 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="amit@waareesolar.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                GSTIN (Tax ID)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 19AABCW1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Category Supplied
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                >
                  {isCustomCategory ? 'Pick Standard' : '+ Custom'}
                </button>
              </div>

              {isCustomCategory ? (
                <input
                  type="text"
                  placeholder="e.g. Solar Trackers, Combiner Boxes"
                  value={customCategoryText}
                  onChange={(e) => setCustomCategoryText(e.target.value)}
                  className="w-full p-2.5 bg-amber-50/50 dark:bg-slate-800 border border-amber-400 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                />
              ) : (
                <select
                  value={categorySupplied}
                  onChange={(e) => setCategorySupplied(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Credit Period (Days)
              </label>
              <select
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value={0}>Immediate / Advance</option>
                <option value={7}>7 Days Credit</option>
                <option value={15}>15 Days Credit</option>
                <option value={21}>21 Days Credit</option>
                <option value={30}>30 Days Credit (Standard)</option>
                <option value={45}>45 Days Credit</option>
                <option value={60}>60 Days Credit</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.stateCode} value={s.state}>
                    {s.state} ({s.stateCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Office / Godown Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Street address, Industrial area, City, Pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Supplier Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Supplier Settlement & Bank Transfer Details */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 font-bold text-sm text-slate-900 dark:text-white">
              <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Supplier Settlement &amp; Bank Transfer Details</span>
            </div>
            <span className="text-[10px] uppercase font-mono font-extrabold text-slate-500">
              NEFT / RTGS Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, SBI"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                placeholder="e.g. 50200089765432"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0000014"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Outstanding Balance Payable */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Current Balance Payable to Supplier (₹)
              </span>
              <p className="text-[11px] text-slate-500">
                Outstanding credit due for solar equipment dispatched to our Pursurah godown.
              </p>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-56">
              <span className="font-mono font-bold text-slate-500 text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="500"
                value={balancePayable}
                onChange={(e) => setBalancePayable(Number(e.target.value) || 0)}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Supporting Documents & KYC Verification */}
        <div
          ref={docSectionRef}
          key={`supplier-doc-section-${shakeKey}`}
          className={`p-5 rounded-2xl space-y-4 transition-all duration-200 ${
            docValidationError
              ? 'bg-rose-50/50 dark:bg-rose-950/25 border-2 border-rose-500 ring-4 ring-rose-500/20 animate-shake'
              : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80'
          }`}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2.5">
              <div
                className={`p-2 rounded-lg ${
                  docValidationError
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                <Paperclip className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <span>Supporting Documents &amp; KYC Verification</span>
                  <span className="text-rose-500 font-black text-sm leading-none">*</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tick required KYC categories below and attach PDF/JPG/PNG documents across each slot
                </p>
              </div>
            </div>

              {docValidationError ? (
                <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-rose-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Mandatory Document Required *
                </span>
              ) : (
                <span
                  className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full font-mono ${
                    uploadedDocs.length > 0
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {uploadedDocs.length} {uploadedDocs.length === 1 ? 'DOC ATTACHED' : 'DOCS ATTACHED'}
                </span>
              )}
            </div>

            {/* Error Banner when zero documents attached on submit */}
            {docValidationError && (
              <div className="p-3.5 rounded-2xl bg-rose-100/90 dark:bg-rose-950/70 border-2 border-rose-500 text-rose-900 dark:text-rose-100 shadow-sm flex items-start gap-3">
                <div className="p-1 rounded-lg bg-rose-500 text-white shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="font-black text-xs uppercase tracking-wide flex items-center gap-2 text-rose-800 dark:text-rose-200">
                    <span>Mandatory Document Required</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500 text-white rounded-full">
                      Blocking Error
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed font-semibold text-rose-900 dark:text-rose-100">
                    Cannot register supplier without KYC documentation! Please tick at least one document type below and attach a valid supporting file (e.g., GST Certificate, Cancelled Cheque, or PAN Card).
                  </p>
                </div>
              </div>
            )}

            {/* Multi-Select Tick Mark Checklist */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Select Document Types to Attach ({selectedDocTypes.length}/{KYC_DOCUMENT_TYPES.length} Selected):
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedDocTypes.length > 0 && selectedDocTypes.length < KYC_DOCUMENT_TYPES.length && (
                    <button
                      type="button"
                      onClick={handleClearDocTypes}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleSelectAllDocTypes}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-amber-700 dark:text-amber-400 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all cursor-pointer"
                  >
                    {selectedDocTypes.length === KYC_DOCUMENT_TYPES.length ? 'Clear All' : 'Select All / Clear'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {KYC_DOCUMENT_TYPES.map((docType) => {
                  const isChecked = selectedDocTypes.includes(docType);
                  const countForType = uploadedDocs.filter((d) => d.category === docType).length;

                  return (
                    <button
                      key={docType}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => handleToggleDocType(docType)}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'border-amber-500 bg-amber-50/60 dark:border-amber-500 dark:bg-amber-950/30 text-slate-900 dark:text-white shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={`text-xs truncate ${isChecked ? 'font-bold' : 'font-medium'}`}>
                          {docType}
                        </span>
                      </div>

                      {countForType > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
                          {countForType} {countForType === 1 ? 'file' : 'files'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dedicated Per-Document Upload Slots */}
            {selectedDocTypes.length === 0 ? (
              <div className="flex items-center space-x-2 p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Tick one or more document types above (e.g., GST Certificate, Cancelled Cheque, PAN Card) to open dedicated upload slots and attach multiple files.
                </span>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Upload Slots for Selected Document Types ({selectedDocTypes.length}):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Supports multiple PDF/JPG/PNG files per slot</span>
                </div>

                <div className={`grid gap-3.5 ${selectedDocTypes.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                  {selectedDocTypes.map((docType) => {
                    const slotDocs = uploadedDocs.filter((d) => d.category === docType);
                    const isSlotDragging = draggingDocType === docType;

                    return (
                      <div
                        key={docType}
                        onDragOver={(e) => handleSlotDragOver(e, docType)}
                        onDragLeave={() => handleSlotDragLeave(docType)}
                        onDrop={(e) => handleSlotDrop(e, docType)}
                        className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                          isSlotDragging
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-400/40'
                            : slotDocs.length > 0
                            ? 'border-emerald-300/80 dark:border-emerald-800/70 bg-white dark:bg-slate-900'
                            : 'border-dashed border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70'
                        }`}
                      >
                        {/* Hidden Multi-file Input per Document Type */}
                        <input
                          type="file"
                          ref={(el) => {
                            slotInputRefs.current[docType] = el;
                          }}
                          onChange={(e) => handleFileUploadForDocType(e.target.files, docType)}
                          multiple
                          accept=".pdf, .jpg, .jpeg, .png, .webp, image/*, application/pdf"
                          className="hidden"
                        />

                        {/* Slot Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                              <CheckSquare className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {docType}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {slotDocs.length > 0
                                  ? `${slotDocs.length} file${slotDocs.length === 1 ? '' : 's'} tagged as ${docType}`
                                  : 'Drag & drop or click browse to attach PDF/JPG/PNG (max 10MB)'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {slotDocs.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Attached
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => slotInputRefs.current[docType]?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/50 transition-all active:scale-95 cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>{slotDocs.length > 0 ? '+ Add More' : 'Attach File(s)'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Attached Files inside this Slot */}
                        {slotDocs.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                            {slotDocs.map((doc) => {
                              const isPdf = doc.type?.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
                              const isImage = doc.type?.includes('image') || /\.(jpg|jpeg|png|webp|svg)$/i.test(doc.name);

                              return (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl"
                                >
                                  <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                                    <div
                                      className={`p-1.5 rounded-lg shrink-0 ${
                                        isPdf
                                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                          : isImage
                                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                      }`}
                                    >
                                      {isPdf ? (
                                        <FileText className="w-3.5 h-3.5" />
                                      ) : isImage ? (
                                        <ImageIcon className="w-3.5 h-3.5" />
                                      ) : (
                                        <File className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate" title={doc.name}>
                                        {doc.name}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        {doc.size} {doc.uploadedAt && `• ${doc.uploadedAt}`}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1 shrink-0">
                                    {doc.dataUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDoc(doc)}
                                        className="p-1.5 text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                        title="Preview Document"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {doc.dataUrl && (
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadDoc(doc)}
                                        className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                        title="Download Document"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDoc(doc.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                      title="Remove File"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Fields marked * and at least 1 KYC supporting document are mandatory</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center space-x-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{editingSupplier ? 'Update Supplier' : 'Save & Register Supplier'}</span>
              </button>
            </div>
          </div>

        </form>

        {/* Safe Blob URL Document Lightbox Preview */}
        {previewDoc && (
          <DocumentViewerModal
            document={previewDoc}
            onClose={() => setPreviewDoc(null)}
          />
        )}

        {/* Mandatory Supporting Document Required Warning Modal Popup */}
        {showDocWarningModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-shake">
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                  <AlertTriangle className="w-9 h-9 stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-300 dark:border-rose-800 font-mono">
                    Compliance Verification
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Mandatory Document Required
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    Cannot register supplier without KYC documentation! Please attach at least one valid supporting document (e.g., GST Certificate, Cancelled Cheque, or MSME/Trade License).
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDocWarningModal(false);
                      const targetType = selectedDocTypes[0] || KYC_DOCUMENT_TYPES[0];
                      if (!selectedDocTypes.includes(targetType)) {
                        setSelectedDocTypes((prev) => [...prev, targetType]);
                      }
                      docSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setTimeout(() => {
                        slotInputRefs.current[targetType]?.click();
                      }, 120);
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Attach Document Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDocWarningModal(false)}
                    className="w-full sm:w-auto py-2.5 px-4 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
  );
};

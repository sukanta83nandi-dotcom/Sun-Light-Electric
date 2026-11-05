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
  Plus,
  Check,
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

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Supporting Documents & KYC state
  const [uploadedDocs, setUploadedDocs] = useState<SupplierDocument[]>([]);
  const [docCategory, setDocCategory] = useState<string>('GST Certificate');
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<SupplierDocument | null>(null);
  const [docValidationError, setDocValidationError] = useState<boolean>(false);
  const [showDocWarningModal, setShowDocWarningModal] = useState<boolean>(false);
  const [shakeKey, setShakeKey] = useState<number>(0);
  const docInputRef = useRef<HTMLInputElement>(null);
  const docSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDocValidationError(false);
    setShowDocWarningModal(false);
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
      setBankName(editingSupplier.bankDetails?.bankName || '');
      setAccountNo(editingSupplier.bankDetails?.accountNo || '');
      setIfscCode(editingSupplier.bankDetails?.ifscCode || '');
      setUploadedDocs(editingSupplier.documents ? [...editingSupplier.documents] : []);
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
      setBankName('HDFC Bank');
      setAccountNo('');
      setIfscCode('');
      setUploadedDocs([]);
    }
  }, [editingSupplier, existingSuppliersCount, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (files: FileList | null) => {
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

        const newDoc: SupplierDocument = {
          id: `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: `${docCategory} - ${file.name}`,
          category: docCategory,
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

    if (docInputRef.current) {
      docInputRef.current.value = '';
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
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
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
      documents: uploadedDocs,
    };

    onSave(supplierData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 text-white p-5 flex items-center justify-between border-b border-sky-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                {editingSupplier ? 'Edit Solar Equipment Supplier' : 'Register New Solar Equipment Supplier'}
              </h3>
              <p className="text-xs text-sky-200/80 font-medium">
                Sun Light Electric • Procurement &amp; Vendor Management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs text-slate-700 dark:text-slate-200 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: Company & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
          </div>

          {/* Section 2: Contact Person, Phone, Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
          </div>

          {/* Section 3: GSTIN, Category Supplied, Payment Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Category Supplied
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
          </div>

          {/* Section 4: Address & State */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Office / Godown Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  placeholder="Street address, Industrial area, City, Pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
          </div>

          {/* Section 5: Bank Details & Balance Payable Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
                <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Supplier Settlement &amp; Bank Transfer Details</span>
              </div>
              <span className="text-[10px] uppercase font-mono font-extrabold text-slate-500">
                NEFT / RTGS Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50200089765432"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0000014"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Outstanding Balance Payable */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Current Balance Payable to Supplier (₹)
                </span>
                <p className="text-[11px] text-slate-500">
                  Outstanding credit due for solar equipment dispatched to our Pursurah godown.
                </p>
              </div>
              <div className="flex items-center space-x-1.5 w-44">
                <span className="font-mono font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={balancePayable}
                  onChange={(e) => setBalancePayable(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Supporting Documents & KYC Verification */}
          <div
            ref={docSectionRef}
            key={`supplier-doc-section-${shakeKey}`}
            className={`p-4 rounded-2xl space-y-3.5 transition-all duration-200 ${
              docValidationError
                ? 'bg-rose-50/50 dark:bg-rose-950/25 border-2 border-rose-500 ring-4 ring-rose-500/20 animate-shake'
                : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    docValidationError
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <span>Supporting Documents &amp; KYC Verification</span>
                    <span className="text-rose-500 font-black text-sm leading-none">*</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Upload GST Certificate, MSME/Udyam, Cancelled Cheque, and Trade License
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
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full font-mono ${
                    uploadedDocs.length > 0
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {uploadedDocs.length} {uploadedDocs.length === 1 ? 'Doc Attached' : 'Docs Attached'}
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
                    Cannot register supplier without KYC documentation! Please attach at least one valid supporting document (e.g., GST Certificate, Cancelled Cheque, or MSME/Trade License).
                  </p>
                </div>
              </div>
            )}

            {/* Document Type Selector & Upload Zone */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  Document Type to Attach:
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  {KYC_DOCUMENT_TYPES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => docInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  docValidationError
                    ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/30'
                    : isDragging
                    ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-amber-400 bg-white/70 dark:bg-slate-900/50 hover:bg-amber-50/20'
                }`}
              >
                <input
                  type="file"
                  ref={docInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  multiple
                  accept=".pdf, .jpg, .jpeg, .png, .webp, image/*, application/pdf"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div
                    className={`p-2.5 rounded-full ${
                      docValidationError
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-bounce'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or drag &amp; drop files here
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Attach <span className="font-semibold text-amber-600 dark:text-amber-400">{docCategory}</span> (PDF, JPG, PNG up to 10MB each)
                  </p>
                </div>
              </div>
            </div>

            {/* Uploaded Documents List */}
            {uploadedDocs.length === 0 ? (
              <div className="flex items-center space-x-2 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  No documents attached yet. Uploading GST Certificate, Cancelled Cheque &amp; MSME ensures valid accounting audit trail.
                </span>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Attached Supplier Documents ({uploadedDocs.length}):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click preview to view</span>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {uploadedDocs.map((doc) => {
                    const isPdf = doc.type?.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
                    const isImage = doc.type?.includes('image') || /\.(jpg|jpeg|png|webp|svg)$/i.test(doc.name);

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-2xs group"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isPdf
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : isImage
                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isPdf ? (
                              <FileText className="w-4 h-4" />
                            ) : isImage ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : (
                              <File className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                {doc.category || 'KYC Doc'}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-xs" title={doc.name}>
                                {doc.name}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {doc.size} {doc.uploadedAt && `• Added on ${doc.uploadedAt}`}
                            </div>
                          </div>
                        </div>

                        {/* Document Actions */}
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
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{editingSupplier ? 'Update Supplier Profile' : 'Save & Register Supplier'}</span>
            </button>
          </div>

        </form>

        {/* In-Modal Document Lightbox Preview */}
        {previewDoc && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-60 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate max-w-md">
                      {previewDoc.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {previewDoc.category} • {previewDoc.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(previewDoc)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950 min-h-[300px]">
                {previewDoc.type?.includes('image') || /\.(jpg|jpeg|png|webp|svg)$/i.test(previewDoc.name) ? (
                  <img
                    src={previewDoc.dataUrl}
                    alt={previewDoc.name}
                    className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg"
                  />
                ) : previewDoc.type?.includes('pdf') || previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={previewDoc.dataUrl}
                    title={previewDoc.name}
                    className="w-full h-[65vh] rounded-xl border border-slate-300 dark:border-slate-800 bg-white"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      Direct preview is not supported for this file type.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(previewDoc)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                    >
                      Download to view file
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                      docSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      docInputRef.current?.click();
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
    </div>
  );
};

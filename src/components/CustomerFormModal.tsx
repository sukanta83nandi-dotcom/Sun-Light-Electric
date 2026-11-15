import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  MapPin,
  Briefcase,
  FileText,
  UploadCloud,
  AlertCircle,
  Eye,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  CheckSquare,
  Square,
  X,
  Plus,
} from 'lucide-react';
import {
  Customer,
  ClientDocument,
  ClientDocumentCategory,
  CustomerSupportingDocument,
} from '../types';
import { INDIAN_STATES } from '../data/mockData';
import { formatFileSize } from './CustomerDetailsModal';
import {
  deriveLocationType,
  deriveClientCode,
  generateNextCustomerId,
  normalizeIsoDate,
} from '../utils/excelCustomerHelper';
import { registerRawFile } from '../utils/blobHelper';

export type CustomerModalSection = 'basic' | 'address' | 'commercial' | 'tax';

interface CustomerFormModalProps {
  isOpen: boolean;
  initialCustomer: Customer | null;
  existingCustomers: Customer[];
  onClose: () => void;
  onSave: (customer: Customer, isEdit: boolean) => void;
  onPreviewDoc: (doc: ClientDocument) => void;
}

const PAYMENT_TERMS_OPTIONS = [
  'Advance',
  'Documents against Payment',
  'Net 7 Days',
  'Net 15 Days',
  'Net 30 Days',
  '50% Advance, 50% on Delivery',
];

const DISPATCH_OPTIONS = ['By Road', 'Courier', 'Company Vehicle', 'Transport', 'Self Pickup'];
const DELIVERY_OPTIONS = ['Ex-Works', 'Door Delivery', 'Site Delivery', 'FOR Destination'];
const TDS_OPTIONS = ['No', 'Yes', '1%', '2%', '5%', '10%'];

const CUSTOMER_KYC_CHECKLIST: ClientDocumentCategory[] = [
  'Aadhaar Card',
  'PAN Card',
  'GST Certificate',
  'Electricity Bill / Property Proof',
  'Cancelled Cheque',
  'Signed Solar Proposal / Agreement',
];

const ALL_CUSTOMER_DOC_CATEGORIES: ClientDocumentCategory[] = [
  ...CUSTOMER_KYC_CHECKLIST,
  'Other Supporting Document',
];

const ACCEPTED_DOC_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls,.webp';

const normalizeLegacyCustomerDocCategory = (category?: string): ClientDocumentCategory => {
  if (category && (CUSTOMER_KYC_CHECKLIST as string[]).includes(category)) {
    return category as ClientDocumentCategory;
  }
  if (category === 'Other Supporting Document' || category === 'Other Document') {
    return 'Other Supporting Document';
  }
  if (category === 'Aadhaar / Voter ID') return 'Aadhaar Card';
  if (
    category === 'Electricity Bill (Discom Consumer Copy)' ||
    category === 'Roof Ownership / Land Deed'
  ) {
    return 'Electricity Bill / Property Proof';
  }
  return 'Other Supporting Document';
};

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  initialCustomer,
  existingCustomers,
  onClose,
  onSave,
  onPreviewDoc,
}) => {
  const isEdit = Boolean(initialCustomer);
  const [validationError, setValidationError] = useState<string | null>(null);
  const topErrorRef = useRef<HTMLDivElement>(null);

  // Section 1: Basic & Contact Details
  const [custId, setCustId] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [code, setCode] = useState('');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [category, setCategory] = useState<'Domestic' | 'Commercial'>('Domestic');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [spocEmail, setSpocEmail] = useState('');
  const [financeEmail, setFinanceEmail] = useState('');
  const [siteSurveyRequired, setSiteSurveyRequired] = useState<'Required' | 'Not Required'>('Required');
  const [lastInvoiceDate, setLastInvoiceDate] = useState('');

  // Section 2: Address & Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('West Bengal');
  const [stateCode, setStateCode] = useState('19');
  const [pinCode, setPinCode] = useState('712410');
  const [locationType, setLocationType] = useState<'Within State' | 'Out of State'>('Within State');
  const [siteCoordinates, setSiteCoordinates] = useState('');

  // Section 3: Commercial & Payment Terms
  const [currency, setCurrency] = useState('Rs.');
  const [creditPeriodDays, setCreditPeriodDays] = useState('0');
  const [termsOfPayment, setTermsOfPayment] = useState('Advance');
  const [dispatchThrough, setDispatchThrough] = useState('Company Vehicle');
  const [termsOfDelivery, setTermsOfDelivery] = useState('Site Delivery');
  const [creditLimit, setCreditLimit] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // Section 4: Tax, GST & KYC Verification
  const [gstNoRequired, setGstNoRequired] = useState<'Yes' | 'No'>('No');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [tds, setTds] = useState('No');
  const [selectedDocTypes, setSelectedDocTypes] = useState<ClientDocumentCategory[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [draggingDocType, setDraggingDocType] = useState<ClientDocumentCategory | null>(null);
  const [isGeneralDragging, setIsGeneralDragging] = useState(false);
  const slotInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const generalFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    setDocUploadError(null);
    setDraggingDocType(null);

    if (initialCustomer) {
      setCustId(initialCustomer.id);
      setName(initialCustomer.name || '');
      setContactPerson(initialCustomer.contactPerson || '');
      setCode(initialCustomer.code || deriveClientCode(initialCustomer.name));
      setCodeManuallyEdited(Boolean(initialCustomer.code));
      setCategory(initialCustomer.category || 'Domestic');
      setStatus(initialCustomer.status || 'active');
      setPhone(initialCustomer.phone || '');
      setEmail(initialCustomer.email || '');
      setSpocEmail(initialCustomer.spocEmail || '');
      setFinanceEmail(initialCustomer.financeEmail || '');
      setSiteSurveyRequired(initialCustomer.siteSurveyRequired || 'Required');
      setLastInvoiceDate(normalizeIsoDate(initialCustomer.lastInvoiceDate || ''));

      setAddress(initialCustomer.address || '');
      setCity(initialCustomer.city || '');
      setDistrict(initialCustomer.district || '');
      const st = initialCustomer.state || 'West Bengal';
      const sc = initialCustomer.stateCode || '19';
      setState(st);
      setStateCode(sc);
      setPinCode(initialCustomer.pinCode || initialCustomer.pincode || '712410');
      setLocationType(initialCustomer.locationType || deriveLocationType(st, sc));
      setSiteCoordinates(initialCustomer.siteCoordinates || '');

      setCurrency(initialCustomer.currency || 'Rs.');
      setCreditPeriodDays(initialCustomer.creditPeriodDays ?? '0');
      setTermsOfPayment(initialCustomer.termsOfPayment || 'Advance');
      setDispatchThrough(initialCustomer.dispatchThrough || 'Company Vehicle');
      setTermsOfDelivery(initialCustomer.termsOfDelivery || 'Site Delivery');
      setCreditLimit(
        initialCustomer.creditLimit !== undefined ? String(initialCustomer.creditLimit) : ''
      );
      setOpeningBalance(
        initialCustomer.openingBalance !== undefined ? String(initialCustomer.openingBalance) : ''
      );

      const hasGst = Boolean(initialCustomer.gstin);
      setGstNoRequired(initialCustomer.gstNoRequired || (hasGst ? 'Yes' : 'No'));
      setGstin(initialCustomer.gstin || '');
      setPanNumber(initialCustomer.panNumber || '');
      setTds(initialCustomer.tds || 'No');

      const sourceDocs: ClientDocument[] =
        initialCustomer.supportingDocuments && initialCustomer.supportingDocuments.length > 0
          ? initialCustomer.supportingDocuments.map((sd) => ({
              id: sd.id,
              category: normalizeLegacyCustomerDocCategory(sd.docType),
              name: sd.fileName,
              size: sd.size ?? 'Attached',
              dataUrl: sd.fileDataUrl,
              uploadedAt: sd.uploadedAt,
              mimeType: sd.mimeType,
            }))
          : (initialCustomer.documents || []).map((doc) => ({
              ...doc,
              category: normalizeLegacyCustomerDocCategory(doc.category),
            }));
      setDocuments(sourceDocs);
      setSelectedDocTypes(
        Array.from(
          new Set(
            sourceDocs
              .map((d) => d.category)
              .filter((cat) => CUSTOMER_KYC_CHECKLIST.includes(cat))
          )
        )
      );
    } else {
      setCustId(generateNextCustomerId(existingCustomers));
      setName('');
      setContactPerson('');
      setCode('');
      setCodeManuallyEdited(false);
      setCategory('Domestic');
      setStatus('active');
      setPhone('');
      setEmail('');
      setSpocEmail('');
      setFinanceEmail('');
      setSiteSurveyRequired('Required');
      setLastInvoiceDate('');

      setAddress('');
      setCity('');
      setDistrict('');
      setState('West Bengal');
      setStateCode('19');
      setPinCode('712410');
      setLocationType('Within State');
      setSiteCoordinates('');

      setCurrency('Rs.');
      setCreditPeriodDays('0');
      setTermsOfPayment('Advance');
      setDispatchThrough('Company Vehicle');
      setTermsOfDelivery('Site Delivery');
      setCreditLimit('');
      setOpeningBalance('');

      setGstNoRequired('No');
      setGstin('');
      setPanNumber('');
      setTds('No');
      setDocuments([]);
      setSelectedDocTypes([]);
    }
  }, [isOpen, initialCustomer, existingCustomers]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!codeManuallyEdited) {
      setCode(val.trim() ? deriveClientCode(val) : '');
    }
  };

  const handleStateSelectChange = (newStateCode: string) => {
    const matched = INDIAN_STATES.find((s) => s.stateCode === newStateCode);
    const nextState = matched ? matched.state : state;
    setStateCode(newStateCode);
    setState(nextState);
    setLocationType(deriveLocationType(nextState, newStateCode));
  };

  const handleGstinChange = (raw: string) => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setGstin(clean);
    if (clean.length > 0) {
      setGstNoRequired('Yes');
    }
    if (/^\d{2}/.test(clean)) {
      const code2 = clean.slice(0, 2);
      const matched = INDIAN_STATES.find((s) => s.stateCode === code2);
      setStateCode(code2);
      if (matched) {
        setState(matched.state);
        setLocationType(deriveLocationType(matched.state, code2));
      } else {
        setLocationType(deriveLocationType(state, code2));
      }
    }
    if (clean.length >= 12 && !panNumber) {
      setPanNumber(clean.slice(2, 12));
    }
  };

  const handleToggleDocType = (docType: ClientDocumentCategory) => {
    setSelectedDocTypes((prev) =>
      prev.includes(docType) ? prev.filter((t) => t !== docType) : [...prev, docType]
    );
  };

  const handleToggleSelectAllDocTypes = () => {
    if (selectedDocTypes.length === CUSTOMER_KYC_CHECKLIST.length) {
      setSelectedDocTypes([]);
    } else {
      setSelectedDocTypes([...CUSTOMER_KYC_CHECKLIST]);
    }
  };

  const handleClearDocTypes = () => {
    setSelectedDocTypes([]);
  };

  const handleChangeDocCategory = (docId: string, nextCategory: ClientDocumentCategory) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, category: nextCategory } : d))
    );
    if (CUSTOMER_KYC_CHECKLIST.includes(nextCategory)) {
      setSelectedDocTypes((prev) =>
        prev.includes(nextCategory) ? prev : [...prev, nextCategory]
      );
    }
  };

  const handleFilesForDocType = (files: FileList | File[], targetCategory: ClientDocumentCategory) => {
    setDocUploadError(null);
    const maxSizeBytes = 10 * 1024 * 1024;
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    Array.from(files).forEach((file) => {
      if (file.size > maxSizeBytes) {
        setDocUploadError(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }
      if (
        !validTypes.includes(file.type) &&
        !file.name.match(/\.(pdf|jpe?g|png|webp|docx?|xlsx?)$/i)
      ) {
        setDocUploadError(
          `File "${file.name}" is not a supported format (PDF, JPG, PNG, DOC/DOCX, XLSX).`
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const docId = `DOC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        registerRawFile(docId, file);
        const doc: ClientDocument = {
          id: docId,
          category: targetCategory,
          name: file.name,
          size: formatFileSize(file.size),
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString().split('T')[0],
          mimeType:
            file.type ||
            (file.name.toLowerCase().endsWith('.pdf')
              ? 'application/pdf'
              : file.name.toLowerCase().match(/\.docx?$/)
              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : file.name.toLowerCase().match(/\.xlsx?$/)
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'image/jpeg'),
        };
        setDocuments((prev) => [...prev, doc]);
      };
      reader.readAsDataURL(file);
    });

    const inputEl = slotInputRefs.current[targetCategory];
    if (inputEl) {
      inputEl.value = '';
    }
    if (generalFileInputRef.current) {
      generalFileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim() || !phone.trim()) {
      setValidationError('Customer Name and Phone / Mobile are required.');
      topErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!address.trim() || !pinCode.trim()) {
      setValidationError('Billing / Site Address and 6-digit Pincode are required.');
      topErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const finalStateCode = stateCode.trim() || '19';
    const finalLocation = locationType || deriveLocationType(state, finalStateCode);
    const parsedCreditLimit = creditLimit.trim() !== '' ? Number(creditLimit) || 0 : undefined;
    const parsedOpeningBalance = openingBalance.trim() !== '' ? Number(openingBalance) || 0 : undefined;

    const today = new Date().toISOString().split('T')[0];
    const supportingDocuments: CustomerSupportingDocument[] = documents.map((d) => ({
      id: d.id,
      docType: d.category,
      fileName: d.name,
      fileDataUrl: d.dataUrl,
      uploadedAt: d.uploadedAt || today,
      size: d.size,
      mimeType: d.mimeType,
    }));

    const customerData: Customer = {
      id: custId.trim() || generateNextCustomerId(existingCustomers),
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      lastInvoiceDate: lastInvoiceDate.trim() || undefined,
      code: deriveClientCode(name, code),
      siteSurveyRequired,
      phone: phone.trim(),
      email: email.trim() || undefined,
      spocEmail: spocEmail.trim() || undefined,
      financeEmail: financeEmail.trim() || undefined,
      address: address.trim(),
      city: city.trim() || undefined,
      district: district.trim() || undefined,
      state: state.trim() || 'West Bengal',
      stateCode: finalStateCode,
      pinCode: pinCode.trim(),
      pincode: pinCode.trim(),
      siteCoordinates: siteCoordinates.trim() || undefined,
      locationType: finalLocation,
      currency: currency.trim() || 'Rs.',
      category,
      creditPeriodDays: creditPeriodDays.trim() || '0',
      creditLimit: parsedCreditLimit,
      openingBalance: parsedOpeningBalance,
      termsOfPayment: termsOfPayment.trim() || 'Advance',
      dispatchThrough: dispatchThrough.trim() || 'Company Vehicle',
      termsOfDelivery: termsOfDelivery.trim() || 'Site Delivery',
      tds: tds.trim() || 'No',
      gstNoRequired,
      gstin: gstin.trim() || undefined,
      panNumber: panNumber.trim() || undefined,
      status,
      documents,
      supportingDocuments,
    };

    onSave(customerData, isEdit);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-150">
      {/* Top Dark Teal Header Bar */}
      <div className="bg-[#0e4252] text-white px-6 py-4 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 border-b border-[#195a6e]">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-white/15 text-amber-300 border border-white/20 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                {isEdit ? `Edit Customer — ${initialCustomer?.name}` : 'Add New Customer'}
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/15 text-sky-100 border border-white/20">
                {custId}
              </span>
            </div>
            <p className="text-xs text-teal-100/80 font-medium">
              Complete ERP customer master, commercial terms, GSTIN &amp; KYC profile
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs border border-teal-200/35 shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-teal-200" />
          <span>Back to Customer Directory</span>
        </button>
      </div>

      {/* Single Continuous Scrollable Page Form */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 text-xs text-slate-700 dark:text-slate-200">
        {validationError && (
          <div
            ref={topErrorRef}
            className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2.5 font-semibold"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* SECTION 1: Basic & Contact Details */}
        <section className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-lg bg-[#0e4252]/10 dark:bg-sky-500/15 text-[#0e4252] dark:text-sky-300">
                <Users className="w-4 h-4" />
              </div>
              <span>Basic &amp; Contact Details</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Section 1 of 4
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Customer Name / Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Bengal Agro Cold Storage Pvt Ltd"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Client Code (4-Letter)
              </label>
              <input
                type="text"
                placeholder="e.g. SUNL"
                maxLength={8}
                value={code}
                onChange={(e) => {
                  setCodeManuallyEdited(true);
                  setCode(e.target.value.toUpperCase());
                }}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono uppercase focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Subhajit Mondal"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone / Mobile <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="+91 98301 44512"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Customer ID
              </label>
              <input
                type="text"
                value={custId}
                onChange={(e) => setCustId(e.target.value.toUpperCase())}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Primary Email ID
              </label>
              <input
                type="email"
                placeholder="client@company.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                SPOC Email ID
              </label>
              <input
                type="email"
                placeholder="spoc@company.in"
                value={spocEmail}
                onChange={(e) => setSpocEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Finance Email ID
              </label>
              <input
                type="email"
                placeholder="accounts@company.in"
                value={financeEmail}
                onChange={(e) => setFinanceEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Type
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'Domestic' | 'Commercial')}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                <option value="Domestic">Domestic</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Site Survey / Inspection
              </label>
              <select
                value={siteSurveyRequired}
                onChange={(e) =>
                  setSiteSurveyRequired(e.target.value as 'Required' | 'Not Required')
                }
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                <option value="Required">Required</option>
                <option value="Not Required">Not Required</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Last Invoice Dt.
              </label>
              <input
                type="date"
                value={lastInvoiceDate}
                onChange={(e) => setLastInvoiceDate(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </section>

        {/* SECTION 2: Address & Location */}
        <section className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-lg bg-[#0e4252]/10 dark:bg-sky-500/15 text-[#0e4252] dark:text-sky-300">
                <MapPin className="w-4 h-4" />
              </div>
              <span>Address &amp; Location</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Section 2 of 4
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Billing / Site Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Holding No. 45, Station Road, Near Tarakeswar Bus Stand"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                City
              </label>
              <input
                type="text"
                placeholder="e.g. Pursurah"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                District
              </label>
              <input
                type="text"
                placeholder="e.g. Hooghly"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={stateCode}
                onChange={(e) => handleStateSelectChange(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.stateCode} value={s.stateCode}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                State Code
              </label>
              <input
                type="text"
                maxLength={2}
                value={stateCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setStateCode(val);
                  const matched = INDIAN_STATES.find((s) => s.stateCode === val);
                  const nextState = matched ? matched.state : state;
                  if (matched) setState(matched.state);
                  setLocationType(deriveLocationType(nextState, val));
                }}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Pincode <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="712410"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Location (Auto-derived)
              </label>
              <select
                value={locationType}
                onChange={(e) =>
                  setLocationType(e.target.value as 'Within State' | 'Out of State')
                }
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
              >
                <option value="Within State">Within State</option>
                <option value="Out of State">Out of State</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Installation Site Coordinates / Landmark
              </label>
              <input
                type="text"
                placeholder="e.g. 22.8854° N, 87.9512° E • Near Pursurah High School Main Gate"
                value={siteCoordinates}
                onChange={(e) => setSiteCoordinates(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: Commercial & Payment Terms */}
        <section className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-lg bg-[#0e4252]/10 dark:bg-sky-500/15 text-[#0e4252] dark:text-sky-300">
                <Briefcase className="w-4 h-4" />
              </div>
              <span>Commercial &amp; Payment Terms</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Section 3 of 4
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Terms of Payment
              </label>
              <input
                type="text"
                list="sle-payment-terms-list"
                value={termsOfPayment}
                onChange={(e) => setTermsOfPayment(e.target.value)}
                placeholder="e.g. Advance, 15 Days, 30 Days"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <datalist id="sle-payment-terms-list">
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Dispatch Through
              </label>
              <input
                type="text"
                list="sle-dispatch-list"
                value={dispatchThrough}
                onChange={(e) => setDispatchThrough(e.target.value)}
                placeholder="e.g. Company Vehicle"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <datalist id="sle-dispatch-list">
                {DISPATCH_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Terms of Delivery
              </label>
              <input
                type="text"
                list="sle-delivery-list"
                value={termsOfDelivery}
                onChange={(e) => setTermsOfDelivery(e.target.value)}
                placeholder="e.g. Site Delivery"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <datalist id="sle-delivery-list">
                {DELIVERY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Credit Period (Days)
              </label>
              <div className="flex gap-2">
                <select
                  value={
                    ['0', '7', '15', '30', '45', '60'].includes(creditPeriodDays)
                      ? creditPeriodDays
                      : 'custom'
                  }
                  onChange={(e) => {
                    if (e.target.value !== 'custom') setCreditPeriodDays(e.target.value);
                  }}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="0">0 Days</option>
                  <option value="7">7 Days</option>
                  <option value="15">15 Days</option>
                  <option value="30">30 Days</option>
                  <option value="45">45 Days</option>
                  <option value="60">60 Days</option>
                  <option value="custom">Custom</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(e.target.value)}
                  className="w-20 p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-center"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min={0}
                step="500"
                placeholder="e.g. 200000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="100"
                placeholder="e.g. 0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="Rs."
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: Tax, GST & KYC Verification */}
        <section className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-lg bg-[#0e4252]/10 dark:bg-sky-500/15 text-[#0e4252] dark:text-sky-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span>Tax, GST &amp; KYC Verification</span>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full font-mono ${
                documents.length > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {documents.length} {documents.length === 1 ? 'DOC ATTACHED' : 'DOCS ATTACHED'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                GST No Reqd
              </label>
              <select
                value={gstNoRequired}
                onChange={(e) => setGstNoRequired(e.target.value as 'Yes' | 'No')}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                GSTIN (15-Digit)
              </label>
              <input
                type="text"
                placeholder="19AABCB4567D1Z8"
                maxLength={15}
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                PAN Number
              </label>
              <input
                type="text"
                placeholder="ABCDE1234F"
                maxLength={10}
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                TDS Applicable
              </label>
              <input
                type="text"
                list="sle-tds-list"
                value={tds}
                onChange={(e) => setTds(e.target.value)}
                placeholder="Yes / No / %"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <datalist id="sle-tds-list">
                {TDS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2 lg:col-span-2 flex items-end">
              <div className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Derived Tax Jurisdiction:
                </span>
                <span className="font-bold text-[#155370] dark:text-sky-300">
                  {locationType} (State Code: {stateCode || '19'})
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Select "Tick Mark" KYC Checklist + Direct Multi-File Uploader */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Supporting KYC Document Checklist ({selectedDocTypes.length}/{CUSTOMER_KYC_CHECKLIST.length} Selected):
              </span>
              <div className="flex items-center gap-1.5">
                {selectedDocTypes.length > 0 &&
                  selectedDocTypes.length < CUSTOMER_KYC_CHECKLIST.length && (
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
                  {selectedDocTypes.length === CUSTOMER_KYC_CHECKLIST.length
                    ? 'Clear All'
                    : 'Select All / Clear'}
                </button>
              </div>
            </div>

            {/* 6 Interactive Checkboxes with Dedicated "Choose File / Attach" Button When Ticked */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CUSTOMER_KYC_CHECKLIST.map((docType) => {
                const isChecked = selectedDocTypes.includes(docType);
                const countForType = documents.filter((d) => d.category === docType).length;
                const isSlotDragging = draggingDocType === docType;

                return (
                  <div
                    key={docType}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onClick={() => handleToggleDocType(docType)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleToggleDocType(docType);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggingDocType(docType);
                    }}
                    onDragLeave={() =>
                      setDraggingDocType((prev) => (prev === docType ? null : prev))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingDocType(null);
                      if (e.dataTransfer.files?.length) {
                        if (!selectedDocTypes.includes(docType)) {
                          setSelectedDocTypes((prev) => [...prev, docType]);
                        }
                        handleFilesForDocType(e.dataTransfer.files, docType);
                      }
                    }}
                    className={`flex flex-col justify-between gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer select-none ${
                      isSlotDragging
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 ring-2 ring-amber-400/50'
                        : isChecked
                        ? 'border-amber-500 bg-amber-50/70 dark:border-amber-500 dark:bg-amber-950/30 text-slate-900 dark:text-white shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="file"
                      ref={(el) => {
                        slotInputRefs.current[docType] = el;
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          handleFilesForDocType(e.target.files, docType);
                        }
                      }}
                      multiple
                      accept={ACCEPTED_DOC_EXTENSIONS}
                      className="hidden"
                    />

                    <div className="flex items-center justify-between gap-2">
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
                    </div>

                    {isChecked && (
                      <div
                        className="pt-2 border-t border-amber-200/70 dark:border-amber-800/50 flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium truncate">
                          {countForType > 0 ? 'Add more or drop files' : 'Attach for this item'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            slotInputRefs.current[docType]?.click();
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#0e4252] hover:bg-[#14586d] text-white shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-amber-300" />
                          <span>Choose File / Attach</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {docUploadError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{docUploadError}</span>
              </div>
            )}

            {/* Always-Visible Multi-Document Attachment Dropzone & Upload Button */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsGeneralDragging(true);
              }}
              onDragLeave={() => setIsGeneralDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsGeneralDragging(false);
                if (e.dataTransfer.files?.length) {
                  handleFilesForDocType(e.dataTransfer.files, 'Other Supporting Document');
                }
              }}
              onClick={() => generalFileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-5 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isGeneralDragging
                  ? 'border-[#0e4252] bg-teal-50/80 dark:bg-teal-950/30 ring-2 ring-teal-500/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-[#155370] bg-white dark:bg-slate-900/90'
              }`}
            >
              <input
                type="file"
                ref={generalFileInputRef}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleFilesForDocType(e.target.files, 'Other Supporting Document');
                  }
                }}
                multiple
                accept={ACCEPTED_DOC_EXTENSIONS}
                className="hidden"
              />

              <div className="flex items-center gap-3.5 text-center sm:text-left flex-col sm:flex-row">
                <div className="p-3 rounded-2xl bg-[#0e4252]/10 dark:bg-sky-500/15 text-[#0e4252] dark:text-sky-300 border border-[#0e4252]/15 dark:border-sky-500/20 shrink-0">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Direct Multi-File Supporting Document Uploader
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Drag &amp; drop or browse multiple files at once (PDF, JPG, PNG, DOC/DOCX, XLSX up to 10MB). Tag categories anytime below.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  generalFileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0e4252] hover:bg-[#14586d] text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>+ Attach Multiple Supporting Documents</span>
              </button>
            </div>

            {/* Unified Attached Supporting Documents List with Category Selector */}
            {documents.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Attached Supporting Documents ({documents.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Assigning a checklist type automatically ticks it above
                  </span>
                </div>

                <div className="space-y-2">
                  {documents.map((doc) => {
                    const lowerName = doc.name.toLowerCase();
                    const isPdf = lowerName.endsWith('.pdf') || doc.mimeType?.includes('pdf');
                    const isImage =
                      lowerName.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                      doc.mimeType?.startsWith('image/');

                    return (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                            {isPdf ? (
                              <FileText className="w-4 h-4 text-rose-500" />
                            ) : isImage ? (
                              <ImageIcon className="w-4 h-4 text-sky-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {doc.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {typeof doc.size === 'number' ? formatFileSize(doc.size) : doc.size}
                              </span>
                              {doc.uploadedAt && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Uploaded {doc.uploadedAt}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                          <select
                            aria-label={`Document category for ${doc.name}`}
                            value={doc.category}
                            onChange={(e) =>
                              handleChangeDocCategory(
                                doc.id,
                                e.target.value as ClientDocumentCategory
                              )
                            }
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-[#155370] focus:outline-none cursor-pointer max-w-[230px]"
                          >
                            {ALL_CUSTOMER_DOC_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => onPreviewDoc(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold cursor-pointer transition-colors"
                            title="Preview / View Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
                            }
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors"
                            title="Remove Document"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Bottom Action Bar */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Fields marked * are mandatory</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0e4252] hover:bg-[#14586d] font-bold text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isEdit ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

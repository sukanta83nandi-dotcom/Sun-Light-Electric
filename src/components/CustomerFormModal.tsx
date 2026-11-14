import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Users,
  MapPin,
  Briefcase,
  FileText,
  UploadCloud,
  AlertCircle,
  Eye,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Customer, ClientDocument, ClientDocumentCategory } from '../types';
import { INDIAN_STATES } from '../data/mockData';
import { KYC_DOCUMENT_CATEGORIES, formatFileSize } from './CustomerDetailsModal';
import {
  deriveLocationType,
  deriveClientCode,
  generateNextCustomerId,
  normalizeIsoDate,
} from '../utils/excelCustomerHelper';

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

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  initialCustomer,
  existingCustomers,
  onClose,
  onSave,
  onPreviewDoc,
}) => {
  const isEdit = Boolean(initialCustomer);
  const [activeSection, setActiveSection] = useState<CustomerModalSection>('basic');
  const [validationError, setValidationError] = useState<string | null>(null);

  // 1. Basic & Contact
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

  // 2. Address & Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('West Bengal');
  const [stateCode, setStateCode] = useState('19');
  const [pinCode, setPinCode] = useState('712410');
  const [locationType, setLocationType] = useState<'Within State' | 'Out of State'>('Within State');

  // 3. Commercial & Payment Terms
  const [currency, setCurrency] = useState('Rs.');
  const [creditPeriodDays, setCreditPeriodDays] = useState('0');
  const [termsOfPayment, setTermsOfPayment] = useState('Advance');
  const [dispatchThrough, setDispatchThrough] = useState('Company Vehicle');
  const [termsOfDelivery, setTermsOfDelivery] = useState('Site Delivery');

  // 4. Tax, GST & KYC
  const [gstNoRequired, setGstNoRequired] = useState<'Yes' | 'No'>('No');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [tds, setTds] = useState('No');
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [docCategory, setDocCategory] = useState<ClientDocumentCategory>(
    'Electricity Bill (Discom Consumer Copy)'
  );
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveSection('basic');
    setValidationError(null);
    setDocUploadError(null);

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

      setCurrency(initialCustomer.currency || 'Rs.');
      setCreditPeriodDays(initialCustomer.creditPeriodDays ?? '0');
      setTermsOfPayment(initialCustomer.termsOfPayment || 'Advance');
      setDispatchThrough(initialCustomer.dispatchThrough || 'Company Vehicle');
      setTermsOfDelivery(initialCustomer.termsOfDelivery || 'Site Delivery');

      const hasGst = Boolean(initialCustomer.gstin);
      setGstNoRequired(initialCustomer.gstNoRequired || (hasGst ? 'Yes' : 'No'));
      setGstin(initialCustomer.gstin || '');
      setPanNumber(initialCustomer.panNumber || '');
      setTds(initialCustomer.tds || 'No');
      setDocuments(initialCustomer.documents || []);
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

      setCurrency('Rs.');
      setCreditPeriodDays('0');
      setTermsOfPayment('Advance');
      setDispatchThrough('Company Vehicle');
      setTermsOfDelivery('Site Delivery');

      setGstNoRequired('No');
      setGstin('');
      setPanNumber('');
      setTds('No');
      setDocuments([]);
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

  const handleFiles = (files: FileList | File[]) => {
    setDocUploadError(null);
    const maxSizeBytes = 10 * 1024 * 1024;
    Array.from(files).forEach((file) => {
      if (file.size > maxSizeBytes) {
        setDocUploadError(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
        setDocUploadError(`File "${file.name}" is not a supported format (PDF, JPG, PNG).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const doc: ClientDocument = {
          id: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          category: docCategory,
          name: file.name,
          size: formatFileSize(file.size),
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString().split('T')[0],
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        };
        setDocuments((prev) => [...prev, doc]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim() || !phone.trim()) {
      setActiveSection('basic');
      setValidationError('Customer Name and Phone / Mobile are required.');
      return;
    }

    if (!address.trim() || !pinCode.trim()) {
      setActiveSection('address');
      setValidationError('Street Address and 6-digit PIN Code are required.');
      return;
    }

    const finalStateCode = stateCode.trim() || '19';
    const finalLocation = locationType || deriveLocationType(state, finalStateCode);

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
      locationType: finalLocation,
      currency: currency.trim() || 'Rs.',
      category,
      creditPeriodDays: creditPeriodDays.trim() || '0',
      termsOfPayment: termsOfPayment.trim() || 'Advance',
      dispatchThrough: dispatchThrough.trim() || 'Company Vehicle',
      termsOfDelivery: termsOfDelivery.trim() || 'Site Delivery',
      tds: tds.trim() || 'No',
      gstNoRequired,
      gstin: gstin.trim() || undefined,
      panNumber: panNumber.trim() || undefined,
      status,
      documents,
    };

    onSave(customerData, isEdit);
  };

  const tabs: { id: CustomerModalSection; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: 'Basic & Contact', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'address', label: 'Address & Location', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'commercial', label: 'Commercial & Payment', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'tax', label: 'Tax, GST & KYC', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-[#155370] text-white px-5 py-4 flex items-center justify-between border-b border-[#1d6587] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white/15 text-amber-300 border border-white/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {isEdit ? `Edit Customer — ${initialCustomer?.name}` : 'Add New Customer'}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/15 text-sky-100 border border-white/20">
                  {custId}
                </span>
              </div>
              <p className="text-[11px] text-sky-100/80">
                Complete ERP customer master, commercial terms, GSTIN &amp; KYC profile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-wrap gap-1.5 shrink-0">
          {tabs.map((tab) => {
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#155370] text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'tax' && documents.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-400 text-slate-950 font-black">
                    {documents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* TAB 1: Basic & Contact */}
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Name / Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengal Agro Cold Storage Pvt Ltd"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase focus:ring-2 focus:ring-[#155370]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Subhajit Mondal"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98301 44512"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-[#155370]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer ID
                  </label>
                  <input
                    type="text"
                    value={custId}
                    onChange={(e) => setCustId(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Email ID
                  </label>
                  <input
                    type="email"
                    placeholder="client@company.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SPOC Email ID
                  </label>
                  <input
                    type="email"
                    placeholder="spoc@company.in"
                    value={spocEmail}
                    onChange={(e) => setSpocEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Finance Email ID
                  </label>
                  <input
                    type="email"
                    placeholder="accounts@company.in"
                    value={financeEmail}
                    onChange={(e) => setFinanceEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'Domestic' | 'Commercial')}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="Domestic">Domestic</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Site Survey / Inspection
                  </label>
                  <select
                    value={siteSurveyRequired}
                    onChange={(e) =>
                      setSiteSurveyRequired(e.target.value as 'Required' | 'Not Required')
                    }
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="Required">Required</option>
                    <option value="Not Required">Not Required</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Last Invoice Dt.
                  </label>
                  <input
                    type="date"
                    value={lastInvoiceDate}
                    onChange={(e) => setLastInvoiceDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Address & Location */}
          {activeSection === 'address' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Street Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Holding No. 45, Station Road, Near Tarakeswar Bus Stand"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#155370]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pursurah"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hooghly"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PIN Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="712410"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={stateCode}
                    onChange={(e) => handleStateSelectChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.stateCode} value={s.stateCode}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location (Auto-derived)
                  </label>
                  <select
                    value={locationType}
                    onChange={(e) =>
                      setLocationType(e.target.value as 'Within State' | 'Out of State')
                    }
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="Within State">Within State</option>
                    <option value="Out of State">Out of State</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Commercial & Payment Terms */}
          {activeSection === 'commercial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="Rs."
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Credit Period (Days)
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={['0', '7', '15', '30', '45', '60'].includes(creditPeriodDays) ? creditPeriodDays : 'custom'}
                      onChange={(e) => {
                        if (e.target.value !== 'custom') setCreditPeriodDays(e.target.value);
                      }}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="0">0 Days (Immediate)</option>
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
                      className="w-20 p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Terms of Payment
                  </label>
                  <input
                    type="text"
                    list="sle-payment-terms-list"
                    value={termsOfPayment}
                    onChange={(e) => setTermsOfPayment(e.target.value)}
                    placeholder="e.g. Advance"
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <datalist id="sle-payment-terms-list">
                    {PAYMENT_TERMS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dispatch Through
                  </label>
                  <input
                    type="text"
                    list="sle-dispatch-list"
                    value={dispatchThrough}
                    onChange={(e) => setDispatchThrough(e.target.value)}
                    placeholder="e.g. By Road / Company Vehicle"
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <datalist id="sle-dispatch-list">
                    {DISPATCH_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Terms of Delivery
                  </label>
                  <input
                    type="text"
                    list="sle-delivery-list"
                    value={termsOfDelivery}
                    onChange={(e) => setTermsOfDelivery(e.target.value)}
                    placeholder="e.g. Ex-Works / Site Delivery"
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <datalist id="sle-delivery-list">
                    {DELIVERY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Tax, GST & KYC */}
          {activeSection === 'tax' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GST No Reqd
                  </label>
                  <select
                    value={gstNoRequired}
                    onChange={(e) => setGstNoRequired(e.target.value as 'Yes' | 'No')}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN (15-Digit)
                  </label>
                  <input
                    type="text"
                    placeholder="19AABCB4567D1Z8"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    TDS
                  </label>
                  <input
                    type="text"
                    list="sle-tds-list"
                    value={tds}
                    onChange={(e) => setTds(e.target.value)}
                    placeholder="Yes / No / %"
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <datalist id="sle-tds-list">
                    {TDS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PAN Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Derived Tax Jurisdiction:</span>
                    <span className="font-bold text-[#155370] dark:text-sky-300">
                      {locationType} (Code: {stateCode || '19'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Supporting Documents & KYC Vault */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <label className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#155370] dark:text-sky-400" />
                      <span>Supporting Documents &amp; KYC Vault</span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Discom electricity bills, Aadhaar/PAN, land deed, or rooftop site photos
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value as ClientDocumentCategory)}
                      className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      {KYC_DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#155370] bg-sky-50 dark:bg-sky-950/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-[#155370] bg-white dark:bg-slate-800/40'
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
                  <UploadCloud className="w-6 h-6 mx-auto text-[#155370] dark:text-sky-400 mb-1" />
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Click to browse or drag &amp; drop KYC files
                  </p>
                  <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
                </div>

                {docUploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{docUploadError}</span>
                  </div>
                )}

                {documents.length > 0 && (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 shrink-0">
                            {doc.name.toLowerCase().endsWith('.pdf') ? (
                              <FileText className="w-4 h-4 text-rose-500" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-sky-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {doc.category} • {typeof doc.size === 'number' ? formatFileSize(doc.size) : doc.size}
                            </div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {doc.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onPreviewDoc(doc)}
                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-pointer"
                            title="Remove File"
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
          )}

          {/* Footer Action Bar */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Fields marked * are mandatory</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#155370] hover:bg-[#1a668a] font-bold text-white rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {isEdit ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

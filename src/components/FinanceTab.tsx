import React, { useState, useEffect, useMemo } from 'react';
import {
  FinanceNote,
  NoteType,
  NotePartyType,
  NoteStatus,
  NoteLocation,
  NoteCurrency,
  GstTaxType,
  NoteParticularItem,
} from '../types/finance';
import { Customer, InventoryItem, Language } from '../types';
import { Supplier } from '../types/supplier';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Building,
  Calendar,
  DollarSign,
  Tag,
  User,
  History,
  BookOpen,
  Eye,
  Edit3,
  Trash2,
  Printer,
  X,
  ArrowRight,
  ShieldCheck,
  Check,
  Layers,
  Sparkles,
  ChevronRight,
  FileSpreadsheet,
  FilePlus2,
  LayoutList,
  Landmark,
} from 'lucide-react';
import { COMPANY_CREDENTIALS } from '../data/mockData';
import { numberToWordsINR } from '../utils/numberToWords';
import { CompanyLogo } from './CompanyLogo';

export type FinanceSubViewMode = 'debit_entry' | 'debit_dashboard' | 'credit_entry' | 'credit_dashboard';

interface FinanceTabProps {
  notes: FinanceNote[];
  setNotes: React.Dispatch<React.SetStateAction<FinanceNote[]>>;
  customers: Customer[];
  suppliers: Supplier[];
  lang: Language;
  currentSubView?: FinanceSubViewMode;
  onSubViewChange?: (view: FinanceSubViewMode) => void;
}

const COST_CENTERS = [
  'Solar EPC Pursurah',
  'Rooftop Kalyani',
  'Commercial O&M',
  'HO Operations',
  'Central Warehouse',
  'Falta SEZ Logistics',
];

const APPROVERS = [
  'Haradhan Patra',
  'Anil Kariwala',
  'Manish Todi',
];

export const FinanceTab: React.FC<FinanceTabProps> = ({
  notes,
  setNotes,
  customers,
  suppliers,
  lang,
  currentSubView = 'debit_dashboard',
  onSubViewChange,
}) => {
  // Primary sub-tab: 'debit' or 'credit'
  const [primaryTab, setPrimaryTab] = useState<'debit' | 'credit'>(() =>
    currentSubView.startsWith('credit') ? 'credit' : 'debit'
  );

  // Secondary sub-tab: 'entry' or 'dashboard'
  const [debitSubTab, setDebitSubTab] = useState<'entry' | 'dashboard'>(() =>
    currentSubView === 'debit_entry' ? 'entry' : 'dashboard'
  );
  const [creditSubTab, setCreditSubTab] = useState<'entry' | 'dashboard'>(() =>
    currentSubView === 'credit_entry' ? 'entry' : 'dashboard'
  );

  // Synchronize state when top navigation dropdown selection changes
  useEffect(() => {
    if (currentSubView) {
      if (currentSubView === 'debit_entry') {
        setPrimaryTab('debit');
        setDebitSubTab('entry');
      } else if (currentSubView === 'debit_dashboard') {
        setPrimaryTab('debit');
        setDebitSubTab('dashboard');
      } else if (currentSubView === 'credit_entry') {
        setPrimaryTab('credit');
        setCreditSubTab('entry');
      } else if (currentSubView === 'credit_dashboard') {
        setPrimaryTab('credit');
        setCreditSubTab('dashboard');
      }
    }
  }, [currentSubView]);

  const activeSecondaryTab = primaryTab === 'debit' ? debitSubTab : creditSubTab;

  const switchSubView = (tab: 'debit' | 'credit', sub: 'entry' | 'dashboard') => {
    setPrimaryTab(tab);
    if (tab === 'debit') {
      setDebitSubTab(sub);
    } else {
      setCreditSubTab(sub);
    }
    const view = `${tab}_${sub}` as FinanceSubViewMode;
    onSubViewChange?.(view);
  };

  // State for note being edited in Entry form (if null, creating new note)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Active modal states
  const [viewingHistoryNote, setViewingHistoryNote] = useState<FinanceNote | null>(null);
  const [viewingLedgerNote, setViewingLedgerNote] = useState<FinanceNote | null>(null);
  const [viewingVoucherNote, setViewingVoucherNote] = useState<FinanceNote | null>(null);

  // Success Notification Banner
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // -------------------------------------------------------------
  // ENTRY FORM STATE
  // -------------------------------------------------------------
  const [formPartyType, setFormPartyType] = useState<NotePartyType>('Buyer');
  const [formPartyCode, setFormPartyCode] = useState<string>('');
  const [formPartyName, setFormPartyName] = useState<string>('');
  const [formContactEmail, setFormContactEmail] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Particulars Draft Line Item
  const [draftParticularsText, setDraftParticularsText] = useState<string>('');
  const [draftHsnNo, setDraftHsnNo] = useState<string>('85017200');
  const [draftCostCenter, setDraftCostCenter] = useState<string>('Solar EPC Pursurah');
  const [draftCurrency, setDraftCurrency] = useState<NoteCurrency>('INR');
  const [draftExchangeRate, setDraftExchangeRate] = useState<number>(1);
  const [draftAmount, setDraftAmount] = useState<number | ''>('');

  // Table of added Particulars
  const [particularsList, setParticularsList] = useState<NoteParticularItem[]>([]);

  // GST Details
  const [formTaxType, setFormTaxType] = useState<GstTaxType>('CGST + SGST');
  const [formGstPercentage, setFormGstPercentage] = useState<number>(18);
  const [formGstCostCenter, setFormGstCostCenter] = useState<string>('Solar EPC Pursurah');
  const [formGstCurrency, setFormGstCurrency] = useState<NoteCurrency>('INR');

  // Footer & Approval
  const [formApprovedBy, setFormApprovedBy] = useState<string>('Haradhan Patra');
  const [formRemarks, setFormRemarks] = useState<string>('');

  // Auto-calculated totals
  const totalBaseAmount = useMemo(() => {
    return particularsList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [particularsList]);

  const calculatedGstAmount = useMemo(() => {
    if (formTaxType === 'Nil') return 0;
    return Number(((totalBaseAmount * formGstPercentage) / 100).toFixed(2));
  }, [totalBaseAmount, formTaxType, formGstPercentage]);

  const grandTotal = useMemo(() => {
    return Number((totalBaseAmount + calculatedGstAmount).toFixed(2));
  }, [totalBaseAmount, calculatedGstAmount]);

  // Next Auto-assigned Note Number
  const nextNoteNumber = useMemo(() => {
    const isDebit = primaryTab === 'debit';
    const prefix = isDebit ? 'DN-' : 'CN-';
    const existing = notes.filter((n) => n.noteType === (isDebit ? 'Debit Note' : 'Credit Note'));
    const numbers = existing
      .map((n) => parseInt(n.noteNumber.replace(/[^0-9]/g, ''), 10))
      .filter((n) => !isNaN(n));
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : (isDebit ? 5597 : 276);
    return `${prefix}${maxNum + 1}`;
  }, [notes, primaryTab]);

  // Handle party selection change
  const handlePartySelect = (code: string) => {
    setFormPartyCode(code);
    if (formPartyType === 'Buyer') {
      const cust = customers.find((c) => c.id === code || c.name === code);
      if (cust) {
        setFormPartyName(cust.name);
        setFormContactEmail(cust.email || `${cust.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`);
      }
    } else {
      const supp = suppliers.find((s) => s.id === code || s.companyName === code);
      if (supp) {
        setFormPartyName(supp.companyName);
        setFormContactEmail(supp.email || `accounts@${supp.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);
      }
    }
  };

  // Add line item to particulars
  const handleAddParticularItem = () => {
    if (!draftParticularsText.trim()) {
      alert('Please enter Particulars description before adding.');
      return;
    }
    if (!draftAmount || Number(draftAmount) <= 0) {
      alert('Please enter a valid Amount.');
      return;
    }

    const newItem: NoteParticularItem = {
      id: `PRT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      particulars: draftParticularsText.trim(),
      hsnNo: draftHsnNo.trim() || '85017200',
      costCenter: draftCostCenter,
      currency: draftCurrency,
      exchangeRate: Number(draftExchangeRate) || 1,
      amount: Number(draftAmount),
    };

    setParticularsList((prev) => [...prev, newItem]);
    setDraftParticularsText('');
    setDraftAmount('');
  };

  const handleRemoveParticularItem = (id: string) => {
    setParticularsList((prev) => prev.filter((p) => p.id !== id));
  };

  // Reset entry form
  const handleResetForm = () => {
    setEditingNoteId(null);
    setFormPartyType('Buyer');
    setFormPartyCode('');
    setFormPartyName('');
    setFormContactEmail('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setParticularsList([]);
    setDraftParticularsText('');
    setDraftHsnNo('85017200');
    setDraftAmount('');
    setFormRemarks('');
    setFormApprovedBy('Haradhan Patra');
  };

  // Load note for editing
  const handleEditNote = (note: FinanceNote) => {
    if (note.status === 'Cancelled') {
      alert('Cannot edit a cancelled Note.');
      return;
    }
    setEditingNoteId(note.id);
    if (note.noteType === 'Debit Note') {
      switchSubView('debit', 'entry');
    } else {
      switchSubView('credit', 'entry');
    }
    setFormPartyType(note.partyType);
    setFormPartyCode(note.partyCode);
    setFormPartyName(note.partyName);
    setFormContactEmail(note.contactEmail);
    setFormDate(note.date);
    setParticularsList(note.particulars || []);
    setFormTaxType(note.gstDetails.taxType);
    setFormGstPercentage(note.gstDetails.percentage);
    setFormGstCostCenter(note.gstDetails.costCenter);
    setFormGstCurrency(note.gstDetails.currency);
    setFormApprovedBy(note.approvedBy || 'Haradhan Patra');
    setFormRemarks(note.remarks);
  };

  // Cancel / Void Note
  const handleCancelNote = (note: FinanceNote) => {
    if (note.status === 'Cancelled') {
      alert('This Note is already cancelled.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to cancel this Note (${note.noteNumber})?`);
    if (!confirmed) return;

    const formattedDate = new Date();
    const dayStr = String(formattedDate.getDate()).padStart(2, '0');
    const monthShort = formattedDate.toLocaleString('en-US', { month: 'short' });
    const yearShort = String(formattedDate.getFullYear()).slice(-2);
    const cancelDateStr = `${dayStr}-${monthShort}-${yearShort}`;

    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === note.id) {
          return {
            ...n,
            status: 'Cancelled',
            cancelledOn: cancelDateStr,
            cancelledBy: 'Haradhan Patra',
            history: [
              ...(n.history || []),
              {
                id: `HIST-${Date.now()}`,
                timestamp: new Date().toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
                action: 'Note Cancelled',
                user: 'Haradhan Patra',
                note: `Note cancelled and voided. Reversal audit entry logged.`,
              },
            ],
          };
        }
        return n;
      })
    );

    showNotification(`${note.noteNumber} has been successfully cancelled and marked void.`);
  };

  // Save Entry Form
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPartyName.trim()) {
      alert('Please select or specify a Buyer / Supplier.');
      return;
    }
    if (particularsList.length === 0) {
      alert('Please add at least one line item in Particular Details before saving.');
      return;
    }

    const noteType: NoteType = primaryTab === 'debit' ? 'Debit Note' : 'Credit Note';
    const existing = editingNoteId ? notes.find((n) => n.id === editingNoteId) : null;
    const noteNum = existing?.noteNumber || nextNoteNumber;
    const noteLocation: NoteLocation = existing?.location || 'Pursurah';
    const noteStatus: NoteStatus = existing?.status || 'Approved';

    const formattedDate = new Date(formDate);
    const dayStr = String(formattedDate.getDate()).padStart(2, '0');
    const monthShort = formattedDate.toLocaleString('en-US', { month: 'short' });
    const yearShort = String(formattedDate.getFullYear()).slice(-2);
    const generatedOnStr = `${dayStr}-${monthShort}-${yearShort}`;

    const newNote: FinanceNote = {
      id: editingNoteId || `${primaryTab === 'debit' ? 'DN' : 'CN'}-${Date.now()}`,
      noteNumber: noteNum,
      noteType,
      partyType: formPartyType,
      location: noteLocation,
      partyCode: formPartyCode || (formPartyType === 'Buyer' ? 'CUST-109' : 'SUP-209'),
      partyName: formPartyName,
      contactEmail: formContactEmail || 'accounts@sunlightelectric.in',
      date: formDate,
      status: noteStatus,
      particulars: particularsList,
      gstDetails: {
        taxType: formTaxType,
        percentage: formGstPercentage,
        costCenter: formGstCostCenter,
        currency: formGstCurrency,
        amount: calculatedGstAmount,
      },
      totalBaseAmount,
      totalGstAmount: calculatedGstAmount,
      grandTotal,
      currency: draftCurrency,
      approvedBy: formApprovedBy,
      approvedOn: noteStatus === 'Approved' ? generatedOnStr : undefined,
      remarks: formRemarks.trim() || 'Recorded per ERP finance guidelines.',
      generatedBy: 'Haradhan Patra',
      generatedOn: generatedOnStr,
      requestSentOn: generatedOnStr,
      admitDate: noteStatus === 'Approved' ? generatedOnStr : undefined,
      history: [
        {
          id: `HIST-${Date.now()}`,
          timestamp: new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          action: editingNoteId ? 'Note Updated' : 'Note Created',
          user: 'Haradhan Patra',
          note: formRemarks || `${noteType} ${noteNum} saved with status ${noteStatus}.`,
        },
      ],
    };

    setNotes((prev) => {
      const existsIndex = prev.findIndex((n) => n.id === newNote.id);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = {
          ...newNote,
          history: [...(prev[existsIndex].history || []), ...newNote.history],
        };
        return copy;
      }
      return [newNote, ...prev];
    });

    showNotification(`${noteType} ${noteNum} successfully saved and posted to ledger.`);
    handleResetForm();
    switchSubView(primaryTab, 'dashboard');
  };

  // -------------------------------------------------------------
  // DASHBOARD SEARCH & FILTER STATE
  // -------------------------------------------------------------
  const [filterPartyRadio, setFilterPartyRadio] = useState<'all' | 'buyers' | 'suppliers'>('all');
  const [filterBuyer, setFilterBuyer] = useState<string>('Select');
  const [filterSupplier, setFilterSupplier] = useState<string>('Select');
  const [filterNoteNo, setFilterNoteNo] = useState<string>('');

  // Reset filters
  const handleResetFilters = () => {
    setFilterPartyRadio('all');
    setFilterBuyer('Select');
    setFilterSupplier('Select');
    setFilterNoteNo('');
  };

  // Filtered Notes for the active Dashboard
  const currentTypeNotes = useMemo(() => {
    const targetType: NoteType = primaryTab === 'debit' ? 'Debit Note' : 'Credit Note';
    return notes.filter((n) => n.noteType === targetType);
  }, [notes, primaryTab]);

  const filteredNotes = useMemo(() => {
    return currentTypeNotes.filter((note) => {
      // 1. Radio filter
      if (filterPartyRadio === 'buyers' && note.partyType !== 'Buyer') return false;
      if (filterPartyRadio === 'suppliers' && note.partyType !== 'Supplier') return false;

      // 2. Buyer filter
      if (filterBuyer !== 'Select' && note.partyName !== filterBuyer) return false;

      // 3. Supplier filter
      if (filterSupplier !== 'Select' && note.partyName !== filterSupplier) return false;

      // 4. Note No filter
      if (
        filterNoteNo.trim() &&
        !note.noteNumber.toLowerCase().includes(filterNoteNo.trim().toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [
    currentTypeNotes,
    filterPartyRadio,
    filterBuyer,
    filterSupplier,
    filterNoteNo,
  ]);

  // Status Badge Helper
  const getStatusBadge = (status: NoteStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-blue-600 text-white font-extrabold shadow-xs';
      case 'Open':
        return 'bg-[#16a34a] text-white font-extrabold shadow-xs';
      case 'Pending':
        return 'bg-[#ea580c] text-white font-extrabold shadow-xs';
      case 'Closed':
        return 'bg-[#15803d] text-white font-extrabold shadow-xs';
      case 'Cancelled':
        return 'bg-[#dc2626] text-white font-extrabold shadow-xs';
      default:
        return 'bg-slate-600 text-white font-bold';
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-600 text-white font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between border border-emerald-400 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-100" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-white hover:text-emerald-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 2-Level Nested Tab Header Card */}
      <div className="bg-gradient-to-r from-[#0f4e56] via-[#005963] to-[#0f4e56] text-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xl border border-[#164e63] space-y-4">
        {/* Module Title & Brand Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-black/25 border border-white/20 shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Finance Management
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  ERP Core
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Enterprise Debit Note &amp; Credit Note Accounting Registry • Sun Light Electric
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-200/90 bg-black/25 px-3 py-1 rounded-xl border border-white/10">
              Debit Notes: <strong className="text-white">{notes.filter(n => n.noteType === 'Debit Note').length}</strong>
            </span>
            <span className="text-[11px] font-mono text-amber-200/90 bg-black/25 px-3 py-1 rounded-xl border border-white/10">
              Credit Notes: <strong className="text-white">{notes.filter(n => n.noteType === 'Credit Note').length}</strong>
            </span>
          </div>
        </div>

        {/* Active Module Indicator (The top navbar dropdown is the primary switcher) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-black/25 p-3 px-4 rounded-xl border border-white/10 gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200/70">
              Active Module:
            </span>
            <span className="font-extrabold text-white bg-white/15 px-3 py-1 rounded-lg border border-white/20 flex items-center space-x-1.5 shadow-xs">
              {primaryTab === 'debit' ? (
                activeSecondaryTab === 'entry' ? (
                  <>
                    <FilePlus2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Debit Note Entry</span>
                  </>
                ) : (
                  <>
                    <LayoutList className="w-3.5 h-3.5 text-teal-300" />
                    <span>Debit Note Dashboard</span>
                  </>
                )
              ) : activeSecondaryTab === 'entry' ? (
                <>
                  <FilePlus2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Credit Note Entry</span>
                </>
              ) : (
                <>
                  <LayoutList className="w-3.5 h-3.5 text-orange-300" />
                  <span>Credit Note Dashboard</span>
                </>
              )}
            </span>
            {editingNoteId && (
              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded shadow-xs uppercase">
                Editing Mode
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-emerald-100/80">
            <span>Primary Switcher:</span>
            <span className="font-bold text-white bg-black/30 px-2 py-0.5 rounded border border-white/15 font-mono">
              Finance ▾ in Top Bar
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: ENTRY FORM (DEBIT NOTE OR CREDIT NOTE ENTRY)       */}
      {/* ------------------------------------------------------------- */}
      {activeSecondaryTab === 'entry' && (
        <form onSubmit={handleSaveNote} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
            {/* Entry Form Header Bar */}
            <div className="bg-[#0f4e56] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#005963]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white/15 border border-white/20">
                  <Edit3 className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {editingNoteId
                      ? `Edit ${primaryTab === 'debit' ? 'Debit Note' : 'Credit Note'}`
                      : `${primaryTab === 'debit' ? 'Debit Note' : 'Credit Note'} Entry`}
                  </h2>
                  <p className="text-xs text-emerald-100/80">
                    Next Note Reference: <strong className="font-mono text-white">{editingNoteId ? notes.find(n => n.id === editingNoteId)?.noteNumber : nextNoteNumber}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Clear Form
                </button>
                <button
                  type="button"
                  onClick={() => switchSubView(primaryTab, 'dashboard')}
                  className="px-3 py-1.5 bg-black/20 hover:bg-black/40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  View Dashboard
                </button>
              </div>
            </div>

            {/* Entry Form Body */}
            <div className="p-5 sm:p-7 space-y-7">
              {/* Top Master Fields */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0f4e56] dark:text-emerald-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                  Master Note Parameters
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Field 1: Note For (Radio) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {primaryTab === 'debit' ? 'Debit Note for:' : 'Credit Note for:'}
                    </label>
                    <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 h-[38px]">
                      <label className="inline-flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="noteFor"
                          checked={formPartyType === 'Buyer'}
                          onChange={() => {
                            setFormPartyType('Buyer');
                            setFormPartyCode('');
                            setFormPartyName('');
                            setFormContactEmail('');
                          }}
                          className="w-4 h-4 text-[#0f4e56] focus:ring-[#0f4e56]"
                        />
                        <span>Buyer</span>
                      </label>

                      <label className="inline-flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="radio"
                          name="noteFor"
                          checked={formPartyType === 'Supplier'}
                          onChange={() => {
                            setFormPartyType('Supplier');
                            setFormPartyCode('');
                            setFormPartyName('');
                            setFormContactEmail('');
                          }}
                          className="w-4 h-4 text-[#0f4e56] focus:ring-[#0f4e56]"
                        />
                        <span>Supplier</span>
                      </label>
                    </div>
                  </div>

                  {/* Field 2: Buyer / Supplier Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {formPartyType === 'Buyer' ? 'Buyer Code / Party' : 'Supplier Code / Party'} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formPartyCode}
                      onChange={(e) => handlePartySelect(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56] h-[38px]"
                    >
                      <option value="">-- Select Registered {formPartyType} --</option>
                      {formPartyType === 'Buyer'
                        ? customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id} - {c.name}
                            </option>
                          ))
                        : suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id} - {s.companyName}
                            </option>
                          ))}
                    </select>
                  </div>

                  {/* Field 3: Contact Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formContactEmail}
                      onChange={(e) => setFormContactEmail(e.target.value)}
                      placeholder="accounts@clientdomain.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56] h-[38px]"
                    />
                  </div>

                  {/* Field 4: Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Note Date
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56] h-[38px]"
                    />
                  </div>
                </div>
              </div>

              {/* Particular Details Group Box */}
              <div className="bg-slate-50/90 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0f4e56] dark:text-emerald-400">
                    Particular Details
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    Line Items Added: {particularsList.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Particulars Textarea */}
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      Particulars (Scope / Description) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={draftParticularsText}
                      onChange={(e) => setDraftParticularsText(e.target.value)}
                      placeholder="e.g. Transport rate difference / Inverter replacement claim"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    />
                  </div>

                  {/* HSN No */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      HSN No
                    </label>
                    <input
                      type="text"
                      value={draftHsnNo}
                      onChange={(e) => setDraftHsnNo(e.target.value)}
                      placeholder="85017200"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    />
                  </div>

                  {/* Cost Center */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      Cost Center
                    </label>
                    <select
                      value={draftCostCenter}
                      onChange={(e) => setDraftCostCenter(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      {COST_CENTERS.map((cc) => (
                        <option key={cc} value={cc}>
                          {cc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Currency & Exchange Rate */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      Currency (Exch Rate)
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={draftCurrency}
                        onChange={(e) => {
                          const curr = e.target.value as NoteCurrency;
                          setDraftCurrency(curr);
                          setDraftExchangeRate(curr === 'INR' ? 1 : curr === 'USD' ? 86.5 : curr === 'EUR' ? 91.5 : 110.0);
                        }}
                        className="w-1/2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <input
                        type="number"
                        step="any"
                        value={draftExchangeRate}
                        onChange={(e) => setDraftExchangeRate(Number(e.target.value))}
                        title="Exchange Rate"
                        className="w-1/2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-1.5 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none text-center"
                      />
                    </div>
                  </div>

                  {/* Amount & Add Button */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      Amount <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={draftAmount}
                        onChange={(e) => setDraftAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 dark:text-white outline-none focus:border-[#0f4e56]"
                      />
                      <button
                        type="button"
                        onClick={handleAddParticularItem}
                        className="px-3 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                        title="Add line item to particulars"
                      >
                        <Plus className="w-4 h-4 mr-0.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Draft Line Items Table */}
                {particularsList.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mt-3">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#164e63] text-white font-bold text-[11px] uppercase">
                        <tr>
                          <th className="p-2.5 text-center w-8">#</th>
                          <th className="p-2.5">Particulars Description</th>
                          <th className="p-2.5 text-center">HSN</th>
                          <th className="p-2.5">Cost Center</th>
                          <th className="p-2.5 text-center">Currency</th>
                          <th className="p-2.5 text-right">Amount</th>
                          <th className="p-2.5 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {particularsList.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">{item.particulars}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{item.hsnNo}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">{item.costCenter}</td>
                            <td className="p-2.5 text-center font-mono font-bold">{item.currency}</td>
                            <td className="p-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                              {item.currency} {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveParticularItem(item.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                title="Remove line item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* GST Details Group Box */}
              <div className="bg-slate-50/90 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0f4e56] dark:text-emerald-400">
                    GST Details
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    Base Subtotal: {draftCurrency} {totalBaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  {/* Tax Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      Tax Type
                    </label>
                    <select
                      value={formTaxType}
                      onChange={(e) => setFormTaxType(e.target.value as GstTaxType)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      <option value="CGST + SGST">CGST + SGST</option>
                      <option value="IGST">IGST</option>
                      <option value="Nil">Nil</option>
                    </select>
                  </div>

                  {/* Percentage */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      Percentage
                    </label>
                    <select
                      value={formGstPercentage}
                      disabled={formTaxType === 'Nil'}
                      onChange={(e) => setFormGstPercentage(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56] disabled:opacity-50"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>

                  {/* Cost Center */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      Cost Center
                    </label>
                    <select
                      value={formGstCostCenter}
                      onChange={(e) => setFormGstCostCenter(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      {COST_CENTERS.map((cc) => (
                        <option key={cc} value={cc}>
                          {cc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Currency */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      Currency
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={draftCurrency}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 text-center"
                    />
                  </div>

                  {/* Calculated Amount (Read-only) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      GST Calculated Amount
                    </label>
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-700 dark:text-emerald-300 text-right">
                      {draftCurrency} {calculatedGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Net Summary Box */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-3">
                  <div className="text-xs text-slate-500">
                    Grand Total Net Payable: Base ({draftCurrency} {totalBaseAmount.toLocaleString('en-IN')}) + GST ({draftCurrency} {calculatedGstAmount.toLocaleString('en-IN')})
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Note Value</span>
                    <span className="text-lg font-black text-[#0f4e56] dark:text-emerald-400 font-mono">
                      {draftCurrency} {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval & Submission Footer */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* To be Approved By */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      To be Approved By <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formApprovedBy}
                      onChange={(e) => setFormApprovedBy(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    >
                      {APPROVERS.map((appr) => (
                        <option key={appr} value={appr}>
                          {appr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Remarks / Justification
                    </label>
                    <textarea
                      rows={2}
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                      placeholder="Enter approval justification, reference notes, or ledger comments..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-[#0f4e56]"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#0f4e56] hover:bg-[#005963] text-white font-black text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Save {primaryTab === 'debit' ? 'Debit Note' : 'Credit Note'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: DASHBOARD (SEARCH & DATA TABLE VIEW)               */}
      {/* ------------------------------------------------------------- */}
      {activeSecondaryTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Search & Filter Header Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-5 shadow-lg space-y-4">
            {/* Top row: Radio filters & Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              {/* Radio Group */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {primaryTab === 'debit' ? 'Search Debit Note:' : 'Search Credit Note:'}
                </span>

                <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dashboardPartyFilter"
                    checked={filterPartyRadio === 'all'}
                    onChange={() => setFilterPartyRadio('all')}
                    className="w-4 h-4 text-[#0f4e56] focus:ring-[#0f4e56]"
                  />
                  <span>Select all</span>
                </label>

                <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dashboardPartyFilter"
                    checked={filterPartyRadio === 'buyers'}
                    onChange={() => setFilterPartyRadio('buyers')}
                    className="w-4 h-4 text-[#0f4e56] focus:ring-[#0f4e56]"
                  />
                  <span>Buyers all</span>
                </label>

                <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dashboardPartyFilter"
                    checked={filterPartyRadio === 'suppliers'}
                    onChange={() => setFilterPartyRadio('suppliers')}
                    className="w-4 h-4 text-[#0f4e56] focus:ring-[#0f4e56]"
                  />
                  <span>Suppliers all</span>
                </label>
              </div>

              {/* Action Button on Right */}
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    switchSubView(primaryTab, 'entry');
                  }}
                  className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Entry</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end text-xs">
              {/* Buyer */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400">Buyer</label>
                <select
                  value={filterBuyer}
                  onChange={(e) => setFilterBuyer(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="Select">Select Buyer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400">Supplier</label>
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="Select">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.companyName}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* DN No / CN No input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-400">
                  {primaryTab === 'debit' ? 'DN No' : 'CN No'}
                </label>
                <input
                  type="text"
                  value={filterNoteNo}
                  onChange={(e) => setFilterNoteNo(e.target.value)}
                  placeholder={primaryTab === 'debit' ? 'e.g. DN-5596' : 'e.g. CN-275'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              {/* Search & Reset Buttons */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {}}
                  className="w-full py-1.5 bg-[#0f4e56] hover:bg-[#005963] text-white font-black rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
                  title="Reset Filters"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Data Table View */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Dark Teal Table Header */}
                <thead className="bg-[#164e63] text-white font-black text-[11px] uppercase tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="py-3.5 px-4 text-center">
                      {primaryTab === 'debit' ? 'Debit Note No' : 'Credit Note No'}
                    </th>
                    <th className="py-3.5 px-4">Party Name</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4">Generated By</th>
                    <th className="py-3.5 px-4 text-center">Generated On</th>
                    <th className="py-3.5 px-4 text-center">Approved/Cancelled On</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredNotes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <div className="font-bold text-sm text-slate-600 dark:text-slate-400">
                          No {primaryTab === 'debit' ? 'Debit Notes' : 'Credit Notes'} Found
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Try adjusting your filter parameters or click "New Entry" to create a new record.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredNotes.map((note) => (
                      <tr
                        key={note.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          note.status === 'Cancelled' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        {/* 1. Note No */}
                        <td className="py-3.5 px-4 font-mono font-black text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={
                                note.status === 'Cancelled'
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-[#0f4e56] dark:text-emerald-400 font-bold'
                              }
                            >
                              {note.noteNumber}
                            </span>
                            {note.status === 'Cancelled' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                Cancelled
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Party Name */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 min-w-[220px]">
                          <div className={note.status === 'Cancelled' ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                            {note.partyName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal font-mono">
                            {note.partyType} • {note.partyCode}
                          </div>
                        </td>

                        {/* 3. Total Amount */}
                        <td className={`py-3.5 px-4 text-right font-mono font-black whitespace-nowrap ${
                          note.status === 'Cancelled'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {note.currency} {note.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* 4. Generated By */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {note.generatedBy}
                        </td>

                        {/* 5. Generated On */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {note.generatedOn}
                        </td>

                        {/* 6. Approved/Cancelled On */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {note.approvedOn || note.cancelledOn || '—'}
                        </td>

                        {/* 7. Action buttons */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* [History] Button (Slate/Grey) */}
                            <button
                              type="button"
                              onClick={() => setViewingHistoryNote(note)}
                              className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                              title="View Note Audit History"
                            >
                              <History className="w-3 h-3" />
                              <span>History</span>
                            </button>

                            {/* [DN Ledger] / [CN Ledger] Button (Emerald green) */}
                            <button
                              type="button"
                              onClick={() => setViewingLedgerNote(note)}
                              className="px-2.5 py-1 bg-[#10b981] hover:bg-[#059669] text-white font-black text-[10px] rounded-lg transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                              title={`View Accounting Ledger for ${note.noteNumber}`}
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>{primaryTab === 'debit' ? 'DN Ledger' : 'CN Ledger'}</span>
                            </button>

                            {/* [Edit] Button */}
                            {note.status !== 'Cancelled' ? (
                              <button
                                type="button"
                                onClick={() => handleEditNote(note)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-lg transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                                title="Edit Note Parameters"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold text-[10px] rounded-lg cursor-not-allowed flex items-center space-x-1 opacity-60"
                                title="Cancelled notes cannot be edited"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            )}

                            {/* [Cancel] Button */}
                            {note.status !== 'Cancelled' ? (
                              <button
                                type="button"
                                onClick={() => handleCancelNote(note)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] rounded-lg transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                                title={`Cancel and Void ${note.noteNumber}`}
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                            ) : (
                              <span className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 text-[10px] font-black rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center space-x-1">
                                <XCircle className="w-3 h-3" />
                                <span>Voided</span>
                              </span>
                            )}

                            {/* [View Voucher] Button */}
                            <button
                              type="button"
                              onClick={() => setViewingVoucherNote(note)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Print Official Note Voucher"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#0f4e56] dark:text-emerald-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Dashboard Footer info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
              <div>
                Showing <strong className="text-slate-800 dark:text-slate-200">{filteredNotes.length}</strong> of{' '}
                <strong className="text-slate-800 dark:text-slate-200">{currentTypeNotes.length}</strong> {primaryTab === 'debit' ? 'Debit Notes' : 'Credit Notes'}
              </div>
              <div className="font-mono text-[11px]">
                Total Disputed / Reconciled Value:{' '}
                <strong className="text-[#0f4e56] dark:text-emerald-400 font-bold">
                  INR {filteredNotes.reduce((s, n) => s + (n.currency === 'INR' ? n.grandTotal : n.grandTotal * 90), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: AUDIT HISTORY MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {viewingHistoryNote && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#0f4e56] dark:text-emerald-400" />
                  <span>Audit History - {viewingHistoryNote.noteNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Party: {viewingHistoryNote.partyName} | Total: {viewingHistoryNote.currency} {viewingHistoryNote.grandTotal.toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setViewingHistoryNote(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
              {(viewingHistoryNote.history || []).map((h, idx) => (
                <div
                  key={h.id || idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900 dark:text-slate-100">{h.action}</span>
                    <span className="text-[10px] font-mono text-slate-400">{h.timestamp}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    By: <strong className="text-slate-800 dark:text-slate-200">{h.user}</strong>
                  </div>
                  {h.note && (
                    <div className="text-slate-700 dark:text-slate-300 italic pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                      "{h.note}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingHistoryNote(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: LEDGER VOUCHER POSTING MODAL                         */}
      {/* ------------------------------------------------------------- */}
      {viewingLedgerNote && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <span>General Ledger Posting Voucher</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Document: {viewingLedgerNote.noteNumber} ({viewingLedgerNote.noteType}) • Date: {viewingLedgerNote.date}
                </p>
              </div>
              <button
                onClick={() => setViewingLedgerNote(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Double-Entry Ledger Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#164e63] text-white font-bold text-[11px] uppercase">
                  <tr>
                    <th className="p-2.5">Account Head / Ledger</th>
                    <th className="p-2.5 text-center">Cost Center</th>
                    <th className="p-2.5 text-right">Debit (Dr)</th>
                    <th className="p-2.5 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {viewingLedgerNote.noteType === 'Debit Note' ? (
                    <>
                      <tr>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          {viewingLedgerNote.partyName} ({viewingLedgerNote.partyType} A/c)
                        </td>
                        <td className="p-3 text-center text-slate-500">{viewingLedgerNote.location}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600">
                          {viewingLedgerNote.currency} {viewingLedgerNote.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400">—</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300 pl-6">
                          To Solar Sales Return / Freight Recovery A/c
                        </td>
                        <td className="p-3 text-center text-slate-500">{viewingLedgerNote.particulars[0]?.costCenter || 'HO'}</td>
                        <td className="p-3 text-right font-mono text-slate-400">—</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {viewingLedgerNote.currency} {viewingLedgerNote.totalBaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      {viewingLedgerNote.totalGstAmount > 0 && (
                        <tr>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300 pl-6">
                            To GST Output Liability Reversal A/c ({viewingLedgerNote.gstDetails.taxType})
                          </td>
                          <td className="p-3 text-center text-slate-500">{viewingLedgerNote.location}</td>
                          <td className="p-3 text-right font-mono text-slate-400">—</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {viewingLedgerNote.currency} {viewingLedgerNote.totalGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          Solar Rebate / Subsidy Discount Expense A/c
                        </td>
                        <td className="p-3 text-center text-slate-500">{viewingLedgerNote.particulars[0]?.costCenter || 'HO'}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600">
                          {viewingLedgerNote.currency} {viewingLedgerNote.totalBaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400">—</td>
                      </tr>
                      {viewingLedgerNote.totalGstAmount > 0 && (
                        <tr>
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                            GST Input Tax Credit / Output Adjustment A/c
                          </td>
                          <td className="p-3 text-center text-slate-500">{viewingLedgerNote.location}</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600">
                            {viewingLedgerNote.currency} {viewingLedgerNote.totalGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">—</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300 pl-6">
                          To {viewingLedgerNote.partyName} ({viewingLedgerNote.partyType} A/c)
                        </td>
                        <td className="p-3 text-center text-slate-500">{viewingLedgerNote.location}</td>
                        <td className="p-3 text-right font-mono text-slate-400">—</td>
                        <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          {viewingLedgerNote.currency} {viewingLedgerNote.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right uppercase text-[10px] text-slate-500">
                      Total Ledger Balance:
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-600 font-black">
                      {viewingLedgerNote.currency} {viewingLedgerNote.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-600 font-black">
                      {viewingLedgerNote.currency} {viewingLedgerNote.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Narration */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">Narration:</strong> Being {viewingLedgerNote.noteType.toLowerCase()} passed for {viewingLedgerNote.remarks}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingLedgerNote(null)}
                className="px-4 py-2 bg-[#0f4e56] hover:bg-[#005963] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: PRINTABLE VOUCHER PREVIEW MODAL                      */}
      {/* ------------------------------------------------------------- */}
      {viewingVoucherNote && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-start p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="my-auto bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl flex flex-col overflow-hidden shadow-2xl">
            {/* Top Toolbar (Non-Printable) */}
            <div className="no-print bg-slate-950 text-white p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    {viewingVoucherNote.noteType} Voucher Preview
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Ref: {viewingVoucherNote.noteNumber} | {viewingVoucherNote.partyName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingVoucherNote(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[82vh] bg-slate-800">
              <div className="finance-voucher-printable bg-white text-slate-900 border border-slate-300 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto shadow-xl relative font-sans text-xs">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-4 mb-4 gap-4">
                  <div className="flex items-center gap-4">
                    <CompanyLogo className="h-14 w-auto object-contain shrink-0" />
                    <div>
                      <h1 className="text-xl font-black text-amber-600 tracking-tight">
                        {COMPANY_CREDENTIALS.companyName}
                      </h1>
                      <p className="text-xs text-slate-600 font-semibold">{COMPANY_CREDENTIALS.tagline}</p>
                      <p className="text-[11px] text-slate-500">{COMPANY_CREDENTIALS.address}</p>
                      <p className="text-[11px] font-mono text-slate-600">
                        GSTIN: <strong>{COMPANY_CREDENTIALS.gstin}</strong> | PAN: {COMPANY_CREDENTIALS.pan}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-[#0f4e56] text-white font-black text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider">
                      {viewingVoucherNote.noteType}
                    </span>
                    <div className="text-xs font-mono font-black text-slate-900 mt-2">
                      Voucher #: {viewingVoucherNote.noteNumber}
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">Date: {viewingVoucherNote.date}</div>
                    <div className="text-[11px] font-bold text-blue-700">Status: {viewingVoucherNote.status}</div>
                  </div>
                </div>

                {/* Party Details */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                      Issued To ({viewingVoucherNote.partyType}):
                    </span>
                    <div className="font-black text-slate-900 text-sm">{viewingVoucherNote.partyName}</div>
                    <div className="text-slate-600">Code: {viewingVoucherNote.partyCode}</div>
                    <div className="text-slate-600">Email: {viewingVoucherNote.contactEmail}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                      Accounting Center:
                    </span>
                    <div className="text-slate-700 font-bold">{viewingVoucherNote.location} Branch</div>
                    <div className="text-slate-600">Cost Center: {viewingVoucherNote.particulars[0]?.costCenter || 'HO'}</div>
                    <div className="text-slate-600">Approved By: {viewingVoucherNote.approvedBy}</div>
                  </div>
                </div>

                {/* Particulars Table */}
                <div className="overflow-x-auto rounded-lg border border-slate-300 mb-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0f4e56] text-white uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">Particulars Description</th>
                        <th className="p-2.5 text-center w-24">HSN Code</th>
                        <th className="p-2.5 text-right w-32">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {viewingVoucherNote.particulars.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900">{it.particulars}</td>
                          <td className="p-2.5 text-center font-mono">{it.hsnNo}</td>
                          <td className="p-2.5 text-right font-mono font-black">
                            {it.currency} {it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-end mb-6">
                  <div className="w-64 space-y-1.5 border border-slate-300 bg-slate-50 rounded-xl p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-mono font-bold">
                        {viewingVoucherNote.currency} {viewingVoucherNote.totalBaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">GST ({viewingVoucherNote.gstDetails.percentage}%):</span>
                      <span className="font-mono font-bold">
                        {viewingVoucherNote.currency} {viewingVoucherNote.totalGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-black text-[#0f4e56]">
                      <span>Grand Total:</span>
                      <span className="font-mono">
                        {viewingVoucherNote.currency} {viewingVoucherNote.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300">
                  <div className="text-left space-y-10">
                    <div className="text-[11px] text-slate-500">Prepared &amp; Verified By:</div>
                    <div className="border-t border-dashed border-slate-400 pt-1 w-48 font-bold text-xs">
                      Haradhan Patra (Accounts)
                    </div>
                  </div>
                  <div className="text-right space-y-10 flex flex-col items-end">
                    <div className="text-[11px] text-slate-500">For Sun Light Electric</div>
                    <div className="border-t border-dashed border-slate-400 pt-1 w-48 text-right font-bold text-xs">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          .finance-voucher-printable,
          .finance-voucher-printable * {
            visibility: visible !important;
          }
          .finance-voucher-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

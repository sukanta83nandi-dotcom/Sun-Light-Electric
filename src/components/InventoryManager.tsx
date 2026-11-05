import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, Language, StockLogEntry } from '../types';
import { translations } from '../data/translations';
import { Package, AlertTriangle, CheckCircle2, Plus, Search, Edit3, Trash2, Boxes, TrendingUp, History, UploadCloud, FileSpreadsheet, Check, X, Truck, Barcode, Hash } from 'lucide-react';
import { StockLogModal } from './StockLogModal';
import { StockSerialViewerModal } from './StockSerialViewerModal';
import { exportInventoryToExcel, importInventoryFromExcel } from '../utils/excelStockHelper';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  lang: Language;
  stockLogs?: StockLogEntry[];
  onAddStockLog?: (newEntry: Omit<StockLogEntry, 'id'>) => void;
  onNavigateToChallans?: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory,
  setInventory,
  lang,
  stockLogs = [],
  onAddStockLog,
  onNavigateToChallans,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedLogItem, setSelectedLogItem] = useState<InventoryItem | null>(null);
  const [selectedSerialItem, setSelectedSerialItem] = useState<InventoryItem | null>(null);

  const handleUpdateItemSerials = (itemCode: string, updatedSerials: string[]) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.code === itemCode) {
          const updated = {
            ...item,
            availableSerialNumbers: updatedSerials,
          };
          if (selectedSerialItem && selectedSerialItem.code === itemCode) {
            setSelectedSerialItem(updated);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Bulk Excel Import & Export Ref & Handlers
  const stockFileInputRef = useRef<HTMLInputElement>(null);

  const handleStockExcelExport = () => {
    exportInventoryToExcel(inventory);
  };

  const handleStockExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importInventoryFromExcel(file, inventory);
      setInventory(result.updatedInventory);

      let msg = `Bulk Stock Excel Import Complete:\n• Total Parsed SKUs: ${result.totalParsed}\n• New SKUs Added: ${result.addedCount}\n• Existing SKUs Updated: ${result.updatedCount}`;
      if (result.errors.length > 0) {
        msg += `\n\nNotes/Skipped Rows:\n` + result.errors.join('\n');
      }
      alert(msg);
    } catch (err: any) {
      alert(`Import Error: ${err || 'Failed to process inventory Excel file'}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Dynamic Categories Management
  const DEFAULT_CATEGORIES = [
    'Solar Panel',
    'Inverter',
    'Battery',
    'Mounting Structure',
    'Cable & Wiring',
    'Accessories'
  ];

  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('sle_inventory_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
        }
      } catch {
        // ignore
      }
    }
    const fromInv = inventory.map((item) => item.category).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromInv]));
  });

  useEffect(() => {
    localStorage.setItem('sle_inventory_categories', JSON.stringify(categoriesList));
  }, [categoriesList]);

  // Sync any categories present in current inventory items
  useEffect(() => {
    const fromInv = inventory.map((item) => item.category).filter(Boolean);
    setCategoriesList((prev) => {
      const merged = Array.from(new Set([...prev, ...fromInv]));
      if (merged.length !== prev.length) {
        return merged;
      }
      return prev;
    });
  }, [inventory]);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [category, setCategory] = useState<string>('Solar Panel');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      if (!categoriesList.includes(trimmed)) {
        setCategoriesList((prev) => [...prev, trimmed]);
      }
      setCategory(trimmed);
      setNewCategoryName('');
      setIsAddingNewCategory(false);
    }
  };

  const [unit, setUnit] = useState<InventoryItem['unit']>('Pcs');
  const [hsnCode, setHsnCode] = useState<string>('85017200');
  const [buyPrice, setBuyPrice] = useState<number>(10000);
  const [unitRate, setUnitRate] = useState<number>(15000);
  const [gstPercent, setGstPercent] = useState<number>(12);
  const [cgstRate, setCgstRate] = useState<number>(6);
  const [sgstRate, setSgstRate] = useState<number>(6);
  const [igstRate, setIgstRate] = useState<number>(12);
  const [stockLevel, setStockLevel] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(3);
  const [specifications, setSpecifications] = useState('');

  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'VALUATION' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  const categories = ['All', ...categoriesList];

  const filteredItems = inventory.filter((item) => {
    const qty = item.currentStock ?? item.stockLevel ?? 0;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nameBn && item.nameBn.includes(searchTerm)) ||
      (item.hsnCode && item.hsnCode.includes(searchTerm));
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;

    let matchesStatus = true;
    if (stockStatusFilter === 'LOW_STOCK') {
      matchesStatus = qty <= item.minStockAlert && qty > 0;
    } else if (stockStatusFilter === 'OUT_OF_STOCK') {
      matchesStatus = qty === 0;
    } else if (stockStatusFilter === 'VALUATION') {
      matchesStatus = qty > 0;
    }

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Total physical units/items across inventory
  const totalStockQuantity = inventory.reduce((acc, item) => acc + (item.currentStock ?? item.stockLevel ?? 0), 0);

  // Total units inwarded & outwarded from stock ledger movements (single source of truth)
  const totalUnitsInwarded = stockLogs
    .filter((l) => l.type === 'INWARD' || l.type === 'INWARD_GRN')
    .reduce((acc, l) => acc + (l.quantity || 0), 0);

  const totalUnitsOutwarded = stockLogs
    .filter((l) => l.type === 'OUTWARD' || l.type === 'OUTWARD_INVOICE')
    .reduce((acc, l) => acc + Math.abs(l.quantity || 0), 0);

  // Total asset valuation (Unit Rate * Current Stock)
  const totalStockValuation = inventory.reduce((acc, item) => acc + ((item.unitRate || 0) * (item.currentStock ?? item.stockLevel ?? 0)), 0);

  // Low & Out of stock counts
  const lowStockCount = inventory.filter((item) => {
    const qty = item.currentStock ?? item.stockLevel ?? 0;
    return qty <= item.minStockAlert && qty > 0;
  }).length;

  const outOfStockCount = inventory.filter((item) => (item.currentStock ?? item.stockLevel ?? 0) === 0).length;

  // Filtered totals
  const filteredStockQuantity = filteredItems.reduce((acc, item) => acc + (item.currentStock ?? item.stockLevel ?? 0), 0);
  const filteredStockValuation = filteredItems.reduce((acc, item) => acc + ((item.unitRate || 0) * (item.currentStock ?? item.stockLevel ?? 0)), 0);
  const filteredStockCostValuation = filteredItems.reduce((acc, item) => acc + (((item.buyPrice ?? Math.round(item.unitRate * 0.8)) || 0) * (item.currentStock ?? item.stockLevel ?? 0)), 0);

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      setInventory((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleGstRateSelect = (rate: number) => {
    setGstPercent(rate);
    setCgstRate(rate / 2);
    setSgstRate(rate / 2);
    setIgstRate(rate);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setCode(`INV-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setNameBn('');
    setCategory(categoriesList[0] || 'Solar Panel');
    setUnit('Pcs');
    setHsnCode('85017200');
    setBuyPrice(10000);
    setUnitRate(12000);
    setGstPercent(12);
    setCgstRate(6);
    setSgstRate(6);
    setIgstRate(12);
    setStockLevel(0); // Physical stock starts at 0 (or opening balance) with empty serial array
    setMinStockAlert(4);
    setSpecifications('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setCode(item.code);
    setName(item.name);
    setNameBn(item.nameBn);
    setCategory(item.category);
    if (item.category && !categoriesList.includes(item.category)) {
      setCategoriesList((prev) => [...prev, item.category]);
    }
    setUnit(item.unit);
    setHsnCode(item.hsnCode || '85017200');
    setBuyPrice(item.buyPrice ?? Math.round(item.unitRate * 0.8));
    setUnitRate(item.unitRate);
    const totalGst = item.gstRate ?? item.gstPercent ?? 12;
    setGstPercent(totalGst);
    setCgstRate(item.cgstRate ?? totalGst / 2);
    setSgstRate(item.sgstRate ?? totalGst / 2);
    setIgstRate(item.igstRate ?? totalGst);
    setStockLevel(item.stockLevel ?? item.currentStock ?? 10);
    setMinStockAlert(item.minStockAlert);
    setSpecifications(item.specifications || '');
    setShowAddModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || unitRate <= 0) return;

    if (editingItem) {
      setInventory((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                code,
                name,
                nameBn: nameBn || name,
                description: name,
                category,
                unit,
                hsnCode: hsnCode || '85017200',
                buyPrice,
                unitRate,
                gstPercent,
                gstRate: gstPercent,
                cgstRate,
                sgstRate,
                igstRate,
                stockLevel,
                currentStock: stockLevel,
                minStockAlert,
                specifications,
              }
            : i
        )
      );
    } else {
      const newItem: InventoryItem = {
        id: `INV-${Date.now().toString().slice(-4)}`,
        code,
        name,
        nameBn: nameBn || name,
        description: name,
        category,
        unit,
        hsnCode: hsnCode || '85017200',
        buyPrice,
        unitRate,
        gstPercent,
        gstRate: gstPercent,
        cgstRate,
        sgstRate,
        igstRate,
        stockLevel,
        currentStock: stockLevel,
        minStockAlert,
        specifications,
        availableSerialNumbers: [], // Initial physical stock starts with an empty serial numbers array
      };
      setInventory((prev) => [newItem, ...prev]);

      // If initial opening balance > 0, record ledger entry
      if (stockLevel > 0 && onAddStockLog) {
        onAddStockLog({
          itemCode: code,
          date: new Date().toISOString().split('T')[0],
          type: 'INWARD',
          quantity: stockLevel,
          balanceAfter: stockLevel,
          referenceDocType: 'INITIAL_STOCK',
          referenceDocNo: 'OPENING-BAL',
          partyName: 'Opening Stock Balance',
          remarks: `Initial opening balance for SKU ${code}`,
          recordedBy: 'Haradhan Patra',
        });
      }
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <span>{t.tabInventory} (Sun Light Electric)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage solar equipment stock levels, unit rates, and GST % for automatic quotation calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input for SKU Excel Import */}
          <input
            type="file"
            ref={stockFileInputRef}
            onChange={handleStockExcelImport}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {/* Bulk Upload Button */}
          <button
            type="button"
            onClick={() => stockFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-950/60 hover:bg-sky-900 border border-sky-600/40 text-sky-300 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Upload Excel spreadsheet to bulk create or update inventory SKUs"
          >
            <UploadCloud className="w-4 h-4 text-sky-400"/>
            <span>Import Excel</span>
          </button>

          {/* Export Inventory Button */}
          <button
            type="button"
            onClick={handleStockExcelExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Export full inventory list to Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400"/>
            <span>Export Excel</span>
          </button>

          {/* Inward Challans & GRN Button */}
          {onNavigateToChallans && (
            <button
              type="button"
              onClick={onNavigateToChallans}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Open Supplier Goods Received Notes (GRN) Register"
            >
              <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400"/>
              <span>Inward GRN Register</span>
            </button>
          )}

          {/* Existing Add Item Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-950 stroke-[3]"/>
            <span>{t.btnAddItem}</span>
          </button>
        </div>
      </div>

      {/* Total Stock Summary & Inventory Valuation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Physical Stock */}
        <button
          type="button"
          onClick={() => setStockStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer relative overflow-hidden ${
            stockStatusFilter === 'ALL'
              ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-400/40 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs hover:-translate-y-0.5'
          }`}
        >
          {stockStatusFilter === 'ALL' && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 rounded-md">
              Active Filter
            </span>
          )}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Total Physical Stock
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {totalStockQuantity.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-sans font-semibold text-slate-500">Units</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Across <strong className="text-slate-800 dark:text-slate-200">{inventory.length}</strong> active SKUs
            </div>
          </div>
          <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </button>

        {/* Card 2: Total Units Inwarded */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Total Units Inwarded
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {totalUnitsInwarded.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-sans font-semibold text-slate-500">Units</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Ledger verified receipts ({totalUnitsOutwarded} Outwarded)
            </div>
          </div>
          <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Inventory Valuation */}
        <button
          type="button"
          onClick={() => setStockStatusFilter(stockStatusFilter === 'VALUATION' ? 'ALL' : 'VALUATION')}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer relative overflow-hidden ${
            stockStatusFilter === 'VALUATION'
              ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-400/40 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-xs hover:-translate-y-0.5'
          }`}
        >
          {stockStatusFilter === 'VALUATION' && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white rounded-md">
              Active Filter
            </span>
          )}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Inventory Asset Valuation
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              INR {totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Cumulative stock asset value
            </div>
          </div>
          <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </button>

        {/* Card 3: Low Stock Warning */}
        <button
          type="button"
          onClick={() => setStockStatusFilter(stockStatusFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer relative overflow-hidden ${
            stockStatusFilter === 'LOW_STOCK'
              ? 'bg-amber-500/15 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-400/50 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-xs hover:-translate-y-0.5'
          }`}
        >
          {stockStatusFilter === 'LOW_STOCK' && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white rounded-md">
              Active Filter
            </span>
          )}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Low Stock Warning
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {lowStockCount}{' '}
              <span className="text-xs font-sans font-semibold text-slate-500">SKUs</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Below reorder threshold
            </div>
          </div>
          <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </button>

        {/* Card 4: Out of Stock */}
        <button
          type="button"
          onClick={() => setStockStatusFilter(stockStatusFilter === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer relative overflow-hidden ${
            stockStatusFilter === 'OUT_OF_STOCK'
              ? 'bg-rose-500/15 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-400/50 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 hover:shadow-xs hover:-translate-y-0.5'
          }`}
        >
          {stockStatusFilter === 'OUT_OF_STOCK' && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white rounded-md">
              Active Filter
            </span>
          )}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Out of Stock
            </span>
            <div className={`text-2xl font-black font-mono ${outOfStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {outOfStockCount}{' '}
              <span className="text-xs font-sans font-semibold text-slate-500">SKUs</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Zero stock available
            </div>
          </div>
          <div className="p-3 bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </button>
      </div>

      {stockStatusFilter !== 'ALL' && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            Showing items filtered by: <strong className="font-bold">{stockStatusFilter.replace('_', ' ')}</strong> ({filteredItems.length} SKUs matched)
          </span>
          <button
            onClick={() => setStockStatusFilter('ALL')}
            className="px-2.5 py-1 bg-amber-200 dark:bg-amber-900 hover:bg-amber-300 rounded-lg text-[11px] font-bold text-amber-950 dark:text-amber-100 transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search equipment by name, code, or Bengali description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
          />
        </div>

        <div className="flex items-center space-x-1.5 p-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_20px_rgba(0,0,0,0.12)] backdrop-blur-md overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 ease-out ${
                selectedCategory === cat
                  ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-extrabold shadow-[0_5px_0_#b45309,0_8px_15px_rgba(245,158,11,0.35)] border border-amber-300/80 active:translate-y-1 active:shadow-[0_2px_0_#b45309]'
                  : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-sky-950 text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th rowSpan={2} className="px-4 py-3 align-middle">{t.itemCode}</th>
                <th rowSpan={2} className="px-4 py-3 align-middle">{t.itemName}</th>
                <th rowSpan={2} className="px-4 py-3 align-middle">{t.category}</th>
                <th rowSpan={2} className="px-4 py-3 text-right align-middle text-amber-300 font-bold">{t.buyPrice || 'BUY PRICE (₹)'}</th>
                <th rowSpan={2} className="px-4 py-3 text-right align-middle">{t.unitRate}</th>
                <th colSpan={3} className="px-2 py-2 text-center bg-sky-900/90 text-amber-300 border-b border-sky-800/80 font-bold">
                  TAX BREAKDOWN (GST)
                </th>
                <th rowSpan={2} className="px-4 py-3 text-center align-middle">{t.stockLevel}</th>
                <th rowSpan={2} className="px-4 py-3 text-center align-middle">{t.status}</th>
                <th rowSpan={2} className="px-4 py-3 text-right align-middle">{t.actions}</th>
              </tr>
              <tr>
                <th className="px-2 py-1.5 text-center text-[10px] bg-sky-900/90 text-slate-200 border-r border-sky-800/80">CGST (%)</th>
                <th className="px-2 py-1.5 text-center text-[10px] bg-sky-900/90 text-slate-200 border-r border-sky-800/80">SGST (%)</th>
                <th className="px-2 py-1.5 text-center text-[10px] bg-sky-900/90 text-amber-300">IGST (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isLow = item.stockLevel <= item.minStockAlert && item.stockLevel > 0;
                const isOut = item.stockLevel === 0;

                const totalGst = item.gstRate ?? item.gstPercent ?? 12;
                const cgst = item.cgstRate ?? (totalGst / 2);
                const sgst = item.sgstRate ?? (totalGst / 2);
                const igst = item.igstRate ?? totalGst;
                const itemBuyPrice = item.buyPrice ?? Math.round(item.unitRate * 0.8);

                return (
                  <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      <button
                        onClick={() => setSelectedLogItem(item)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/60 transition-all cursor-pointer font-mono font-extrabold group shadow-2xs"
                        title="Click to view Stock Movement Audit Log"
                      >
                        <History className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-[360deg] transition-transform duration-500" />
                        <span className="underline underline-offset-2 decoration-amber-500/40 group-hover:decoration-amber-500">{item.code}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      {lang === 'bn' && item.nameBn && (
                        <div className="text-[11px] text-amber-800 font-medium">{item.nameBn}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.hsnCode && (
                          <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-300 dark:border-slate-700">
                            HSN: {item.hsnCode}
                          </span>
                        )}
                        {item.availableSerialNumbers && item.availableSerialNumbers.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedSerialItem(item)}
                            className="inline-flex items-center space-x-1 text-[9px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:shadow-xs transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 group shadow-2xs"
                            title={`Click to view and manage all ${item.availableSerialNumbers.length} registered serial numbers`}
                          >
                            <Barcode className="w-3 h-3 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 transition-colors" />
                            <span>{item.availableSerialNumbers.length} Serials in Stock</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedSerialItem(item)}
                            className="inline-flex items-center space-x-1 text-[9px] font-mono font-medium bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/50 hover:shadow-2xs transition-all duration-150 cursor-pointer hover:scale-105"
                            title="Click to register serial numbers for this item"
                          >
                            <Barcode className="w-2.5 h-2.5 text-slate-400" />
                            <span>+ Serials (0)</span>
                          </button>
                        )}
                      </div>
                      {item.specifications && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                          {item.specifications}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-medium border border-slate-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-cyan-700 dark:text-cyan-400">
                      ₹{itemBuyPrice.toLocaleString('en-IN')} / {item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      ₹{item.unitRate.toLocaleString('en-IN')} / {item.unit}
                    </td>
                    <td className="px-2 py-3.5 text-center font-mono font-medium text-slate-700 bg-slate-50/50 border-r border-slate-100">
                      {cgst}%
                    </td>
                    <td className="px-2 py-3.5 text-center font-mono font-medium text-slate-700 bg-slate-50/50 border-r border-slate-100">
                      {sgst}%
                    </td>
                    <td className="px-2 py-3.5 text-center font-mono font-bold text-amber-800 bg-amber-50/30">
                      {igst}%
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-semibold">
                      {item.stockLevel} {item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {isOut ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{t.outOfStock}</span>
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{t.lowStock}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t.inStock}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right flex items-center justify-end space-x-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="inline-flex items-center space-x-1 text-slate-600 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Edit Item Rate & Stock"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="inline-flex items-center space-x-1 text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Equipment Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-sky-950 text-white font-bold text-xs border-t-2 border-sky-800">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-sans uppercase tracking-wider text-[11px] text-slate-300">
                  INVENTORY SUMMARY ({filteredItems.length} SKUs)
                </td>
                <td className="px-4 py-3 text-right font-mono text-cyan-300">
                  ₹{filteredStockCostValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-mono text-amber-400">
                  INR {filteredStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={3} className="px-2 py-3"></td>
                <td className="px-4 py-3 text-center font-mono text-emerald-400">
                  {filteredStockQuantity.toLocaleString('en-IN')} Units
                </td>
                <td colSpan={2} className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm text-amber-400">
                {editingItem ? 'Edit Equipment Stock & Rate' : 'Add Solar Equipment to Stock'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Item Code / SKU</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Category</label>
                    {!isAddingNewCategory && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCategory(true)}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>+ New Category</span>
                      </button>
                    )}
                  </div>

                  {isAddingNewCategory ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCategory();
                          } else if (e.key === 'Escape') {
                            setIsAddingNewCategory(false);
                            setNewCategoryName('');
                          }
                        }}
                        placeholder="e.g. Solar Pump, MC4 Connector"
                        className="flex-1 p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        disabled={!newCategoryName.trim()}
                        className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 disabled:opacity-50 transition-all cursor-pointer font-bold shrink-0"
                        title="Add Category"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCategory(false);
                          setNewCategoryName('');
                        }}
                        className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer shrink-0"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingNewCategory(true);
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="font-bold text-amber-600 dark:text-amber-400">
                        + Add Custom Category...
                      </option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (English)</label>
                <input
                  type="text"
                  placeholder="e.g. 540W Mono PERC Solar Panel (Waaree)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Bengali / বাংলা)</label>
                <input
                  type="text"
                  placeholder="যেমন: ৫৪০ ওয়াট মনোপার্ক সোলার প্যানেল"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    placeholder="e.g. 85017200"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit / UOM</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Sets">Sets</option>
                    <option value="Meters">Meters</option>
                    <option value="Watts">Watts</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Initial Physical Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockLevel}
                    onChange={(e) => setStockLevel(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400">0 starts with empty serials []</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Buy Price (Cost ₹)</label>
                  <input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(Number(e.target.value))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 font-bold text-cyan-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Rate (Sell ₹)</label>
                  <input
                    type="number"
                    value={unitRate}
                    onChange={(e) => setUnitRate(Number(e.target.value))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(Number(e.target.value))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* GST Tax Breakdown Card */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs">
                    GST Tax Breakdown Structure
                  </label>
                  <span className="text-[11px] text-amber-900 font-bold bg-amber-200/60 px-2 py-0.5 rounded-md">
                    Total GST: {gstPercent}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Primary Tier</label>
                    <select
                      value={gstPercent}
                      onChange={(e) => handleGstRateSelect(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 font-bold bg-white text-xs"
                    >
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                      <option value={28}>28% GST</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">CGST (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cgstRate}
                      onChange={(e) => setCgstRate(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono bg-white text-center font-bold text-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">SGST (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={sgstRate}
                      onChange={(e) => setSgstRate(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono bg-white text-center font-bold text-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-950 mb-0.5">IGST (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={igstRate}
                      onChange={(e) => setIgstRate(Number(e.target.value))}
                      className="w-full p-2 border border-amber-300 rounded-lg font-mono bg-amber-100 text-center font-bold text-amber-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technical Specifications</label>
                <input
                  type="text"
                  placeholder="e.g. 21.3% Efficiency, 25 Year Warranty"
                  value={specifications}
                  onChange={(e) => setSpecifications(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded-lg"
                >
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement & Audit Log Modal */}
      {selectedLogItem && (
        <StockLogModal
          item={selectedLogItem}
          onClose={() => setSelectedLogItem(null)}
          stockLogs={stockLogs}
          onAddStockLog={(entry) => {
            if (onAddStockLog) {
              onAddStockLog(entry);
            }
            // Sync local inventory currentStock & stockLevel
            setInventory((prev) =>
              prev.map((i) => {
                if (i.code === entry.itemCode) {
                  const updatedQty = Math.max(0, (i.currentStock ?? i.stockLevel ?? 0) + entry.quantity);
                  return {
                    ...i,
                    currentStock: updatedQty,
                    stockLevel: updatedQty,
                  };
                }
                return i;
              })
            );
          }}
          lang={lang}
        />
      )}

      {/* Stock Serial Numbers Popup Modal */}
      {selectedSerialItem && (
        <StockSerialViewerModal
          item={selectedSerialItem}
          isOpen={Boolean(selectedSerialItem)}
          onClose={() => setSelectedSerialItem(null)}
          onUpdateSerials={handleUpdateItemSerials}
        />
      )}
    </div>
  );
};

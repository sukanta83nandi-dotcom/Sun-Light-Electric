import { utils, read, writeFile } from 'xlsx';
import { InventoryItem } from '../types';

/**
 * Export full inventory list to Excel file (.xlsx)
 */
export const exportInventoryToExcel = (
  inventory: InventoryItem[],
  filename = 'SunLight_Stock_Inventory.xlsx'
) => {
  if (!inventory || inventory.length === 0) {
    alert('No inventory items available to export.');
    return;
  }

  const exportData = inventory.map((item) => {
    const stockQty = item.currentStock ?? item.stockLevel ?? 0;
    const gst = item.gstPercent ?? item.gstRate ?? 18;
    return {
      'SKU Code': item.code,
      'Item Name': item.name,
      'Bengali Name': item.nameBn || '',
      'Category': item.category,
      'Unit': item.unit,
      'Buy Price (₹)': item.buyPrice ?? Math.round(item.unitRate * 0.8),
      'Selling Rate (₹)': item.unitRate,
      'GST %': gst,
      'Current Stock': stockQty,
      'Min Stock Alert': item.minStockAlert ?? 3,
      'Specifications': item.specifications || item.description || '',
    };
  });

  const worksheet = utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 16 }, // SKU Code
    { wch: 32 }, // Item Name
    { wch: 30 }, // Bengali Name
    { wch: 20 }, // Category
    { wch: 10 }, // Unit
    { wch: 16 }, // Buy Price
    { wch: 16 }, // Selling Rate
    { wch: 10 }, // GST %
    { wch: 15 }, // Current Stock
    { wch: 16 }, // Min Stock Alert
    { wch: 45 }, // Specifications
  ];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Stock Inventory');
  writeFile(workbook, filename);
};

export interface StockImportResult {
  updatedInventory: InventoryItem[];
  addedCount: number;
  updatedCount: number;
  totalParsed: number;
  errors: string[];
}

/**
 * Parse Excel file buffer into InventoryItem objects & merge with existing inventory list
 */
export const importInventoryFromExcel = async (
  file: File,
  existingInventory: InventoryItem[]
): Promise<StockImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          return resolve({
            updatedInventory: existingInventory,
            addedCount: 0,
            updatedCount: 0,
            totalParsed: 0,
            errors: ['Excel file is empty or has no data rows.'],
          });
        }

        const updatedList = [...existingInventory];
        let addedCount = 0;
        let updatedCount = 0;
        const errors: string[] = [];

        // Determine max ID sequence for new item IDs (INV-xxx)
        let maxSeq = 100;
        existingInventory.forEach((item) => {
          const match = item.id.match(/INV-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          }
        });

        const validCategories: InventoryItem['category'][] = [
          'Solar Panel',
          'Inverter',
          'Battery',
          'Mounting Structure',
          'Cable & Wiring',
          'Accessories',
        ];

        const validUnits: InventoryItem['unit'][] = ['Pcs', 'Meters', 'Sets', 'Watts'];

        rawRows.forEach((row, index) => {
          // Normalize column keys (case-insensitive lookup)
          const getVal = (...keys: string[]) => {
            for (const key of keys) {
              const matchedKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === key.toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const getNum = (...keys: string[]) => {
            const val = getVal(...keys);
            if (!val) return undefined;
            const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ''));
            return isNaN(parsed) ? undefined : parsed;
          };

          const name = getVal('Item Name', 'Name', 'Equipment Name', 'Description', 'Item');
          let code = getVal('SKU Code', 'Code', 'SKU', 'Item Code', 'ID').toUpperCase();

          if (!name) {
            errors.push(`Row ${index + 2}: Missing Item Name (Skipped)`);
            return;
          }

          if (!code) {
            maxSeq++;
            code = `INV-${String(maxSeq).padStart(3, '0')}`;
          }

          const nameBn = getVal('Bengali Name', 'Name (Bengali)', 'Name Bengali') || name;
          const categoryRaw = getVal('Category', 'Type', 'Item Category');
          const unitRaw = getVal('Unit', 'UOM', 'Unit of Measure');

          // Match category
          let category: InventoryItem['category'] = 'Solar Panel';
          const catMatch = validCategories.find(
            (c) => c.toLowerCase() === categoryRaw.toLowerCase()
          );
          if (catMatch) {
            category = catMatch;
          } else if (categoryRaw.toLowerCase().includes('inverter')) {
            category = 'Inverter';
          } else if (categoryRaw.toLowerCase().includes('battery')) {
            category = 'Battery';
          } else if (categoryRaw.toLowerCase().includes('structure') || categoryRaw.toLowerCase().includes('mounting')) {
            category = 'Mounting Structure';
          } else if (categoryRaw.toLowerCase().includes('cable') || categoryRaw.toLowerCase().includes('wiring')) {
            category = 'Cable & Wiring';
          } else if (categoryRaw.toLowerCase().includes('access')) {
            category = 'Accessories';
          }

          // Match unit
          let unit: InventoryItem['unit'] = 'Pcs';
          const unitMatch = validUnits.find(
            (u) => u.toLowerCase() === unitRaw.toLowerCase()
          );
          if (unitMatch) {
            unit = unitMatch;
          } else if (unitRaw.toLowerCase().includes('meter')) {
            unit = 'Meters';
          } else if (unitRaw.toLowerCase().includes('set')) {
            unit = 'Sets';
          } else if (unitRaw.toLowerCase().includes('watt')) {
            unit = 'Watts';
          }

          const sellingRateInput = getNum('Selling Rate (₹)', 'Unit Rate (₹)', 'Selling Rate', 'Unit Rate', 'Price');
          const buyPriceInput = getNum('Buy Price (₹)', 'Buy Price', 'Purchase Price', 'Inward Cost', 'Cost');

          const buyPrice = buyPriceInput ?? (sellingRateInput ? Math.round(sellingRateInput * 0.8) : 10000);
          const unitRate = sellingRateInput ?? Math.round(buyPrice * 1.25);

          const gstPercent = getNum('GST %', 'GST Percent', 'GST Rate', 'GST') ?? 18;
          const cgstRate = gstPercent / 2;
          const sgstRate = gstPercent / 2;
          const igstRate = gstPercent;

          const stockQty = getNum('Current Stock', 'Stock Level', 'Quantity', 'Stock', 'Qty') ?? 10;
          const minStockAlert = getNum('Min Stock Alert', 'Reorder Level', 'Min Stock', 'Alert Level') ?? 3;
          const specifications = getVal('Specifications', 'Specs', 'Details', 'Notes');

          // Check if item already exists by Code
          const existingIdx = updatedList.findIndex(
            (i) => i.code.toUpperCase() === code.toUpperCase()
          );

          if (existingIdx >= 0) {
            // Update existing stock SKU
            const target = updatedList[existingIdx];
            updatedList[existingIdx] = {
              ...target,
              code: code || target.code,
              name: name || target.name,
              nameBn: nameBn || target.nameBn,
              category: category || target.category,
              unit: unit || target.unit,
              buyPrice: buyPrice ?? target.buyPrice,
              unitRate: unitRate ?? target.unitRate,
              gstPercent: gstPercent ?? target.gstPercent,
              gstRate: gstPercent ?? target.gstRate,
              cgstRate,
              sgstRate,
              igstRate,
              stockLevel: stockQty,
              currentStock: stockQty,
              minStockAlert: minStockAlert ?? target.minStockAlert,
              specifications: specifications || target.specifications,
              description: specifications || target.description,
            };
            updatedCount++;
          } else {
            // Create new stock SKU
            maxSeq++;
            const newItemId = `INV-${String(maxSeq).padStart(3, '0')}`;

            const newItem: InventoryItem = {
              id: newItemId,
              code,
              name,
              nameBn,
              category,
              unit,
              buyPrice,
              unitRate,
              gstPercent,
              gstRate: gstPercent,
              cgstRate,
              sgstRate,
              igstRate,
              stockLevel: stockQty,
              currentStock: stockQty,
              minStockAlert,
              specifications,
              description: specifications,
            };

            updatedList.push(newItem);
            addedCount++;
          }
        });

        resolve({
          updatedInventory: updatedList,
          addedCount,
          updatedCount,
          totalParsed: rawRows.length,
          errors,
        });
      } catch (err: any) {
        reject(err?.message || 'Error processing inventory Excel file');
      }
    };

    reader.onerror = () => reject('Failed to read Excel file');
    reader.readAsArrayBuffer(file);
  });
};

export interface InvoiceItem {
  id: string;
  description: string;
  hsnCode: string;             // e.g. "85017200" for Panels, "850440" for Inverters
  serialNumbers?: string[];    // e.g. ["VS-550-2026-001", "VS-550-2026-002", ...]
  quantity: number;
  unit: string;                // "Pcs", "Sets"
  unitRate: number;
  gstRate: number;             // e.g. 12 (6% CGST + 6% SGST)
  amount: number;
}

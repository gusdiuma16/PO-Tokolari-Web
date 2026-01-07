export interface RawOrderData {
  [key: string]: string;
}

export interface OrderItem {
  id: string;
  originalData: RawOrderData;
  poNumber: string;       // No PO
  date: string;           // Tanggal Order
  deadline: string;       // Deadline
  productName: string;    // Items Detail
  material: string;       // Bahan
  cutting: string;        // Cutting
  size: string;          // Size
  note: string;          // Catatan
  imageUrl: string;      // Foto Referensi (Link)
  qtyShort: number;      // Lengan Pendek
  qtyLong: number;       // Lengan Panjang
  qtySinglet: number;    // Singlet
  totalQty: number;      // Sum of variations
}

export interface ConsolidatedItem {
  key: string;
  productName: string;
  note: string;
  items: OrderItem[];
  totalQty: number;
}

export interface GroupedOrder {
  key: string;
  poNumber: string;
  date: string;
  deadline: string;
  material: string;
  cutting: string;
  imageUrl: string;
  items: OrderItem[];
  totalQty: number;
}

export interface CustomerGroup {
  name: string;
  orders: OrderItem[];
  groups: GroupedOrder[];
  totalItems: number;
  totalPOs: number;
  lastOrderDate: string;
  imageUrl?: string; // Representative image for the customer
}

export interface SheetConfig {
  sheetId: string;
  gid: string;
}
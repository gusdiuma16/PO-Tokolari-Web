import { RawOrderData, OrderItem, CustomerGroup, GroupedOrder, ConsolidatedItem } from './types';
import Papa from 'https://esm.sh/papaparse@5.4.1';

export const SHEET_ID = '1WRTkTo_Pc0SwOT5cSOCn9rgtN_0-bDEOTSK72B2iBGo';
export const GID = '0';

export const getSheetCsvUrl = (sheetId: string, gid: string) => 
  `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

/**
 * Mengonversi link Google Drive Sharing menjadi link preview yang lebih handal.
 * Menggunakan endpoint thumbnail dengan ukuran besar untuk menghindari paksaan login.
 */
export const toDirectDriveLink = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('drive.google.com')) return url;

  try {
    let fileId = '';
    
    // Pattern 1: /file/d/FILE_ID/view
    const fileDMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileDMatch) fileId = fileDMatch[1];
    
    // Pattern 2: id=FILE_ID
    if (!fileId) {
      const idMatch = url.match(/[?&]id=([^&]+)/);
      if (idMatch) fileId = idMatch[1];
    }

    if (fileId) {
      // Menggunakan link thumbnail dengan size besar (sz=w2000) 
      // Link ini biasanya lebih sukses melewati login screen untuk file publik
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
    }
  } catch (e) {
    console.warn("Gagal mengonversi link Drive:", url);
  }
  
  return url;
};

export const fetchAndParseSheet = async (sheetId: string, gid: string): Promise<RawOrderData[]> => {
  const url = getSheetCsvUrl(sheetId, gid);
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Gagal mengambil data dari Google Sheet');
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => resolve(results.data),
        error: (error: any) => reject(error),
      });
    });
  } catch (error) {
    console.error("Error fetching sheet:", error);
    throw error;
  }
};

const normalizeKey = (key: string) => key.toLowerCase().trim();

const getValueByFuzzyKey = (row: RawOrderData, candidates: string[]): string => {
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const foundKey = rowKeys.find(k => normalizeKey(k).includes(normalizeKey(candidate)));
    if (foundKey) return row[foundKey];
  }
  return '';
};

export const groupCustomerOrders = (orders: OrderItem[]): GroupedOrder[] => {
  const groups: { [key: string]: GroupedOrder } = {};

  orders.forEach(order => {
    const key = `${order.poNumber.toLowerCase()}-${order.material.toLowerCase()}-${order.cutting.toLowerCase()}-${order.date}`;

    if (!groups[key]) {
      groups[key] = {
        key,
        poNumber: order.poNumber,
        date: order.date,
        deadline: order.deadline,
        material: order.material,
        cutting: order.cutting,
        imageUrl: order.imageUrl,
        items: [],
        totalQty: 0
      };
    }

    groups[key].items.push(order);
    groups[key].totalQty += order.totalQty;
    
    if (!groups[key].imageUrl && order.imageUrl) {
      groups[key].imageUrl = order.imageUrl;
    }
  });

  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
};

export const consolidateGroupedItems = (items: OrderItem[]): ConsolidatedItem[] => {
  const groups: { [key: string]: ConsolidatedItem } = {};

  items.forEach(item => {
    const key = `${item.productName.toLowerCase()}-${item.note.toLowerCase()}`;
    
    if (!groups[key]) {
      groups[key] = {
        key,
        productName: item.productName,
        note: item.note,
        items: [],
        totalQty: 0
      };
    }
    
    groups[key].items.push(item);
    groups[key].totalQty += item.totalQty;
  });

  return Object.values(groups);
};

export const processOrders = (rawData: RawOrderData[]): CustomerGroup[] => {
  const groups: { [key: string]: CustomerGroup } = {};

  rawData.forEach((row, index) => {
    const name = getValueByFuzzyKey(row, ['pemesan', 'nama', 'customer']) || 'Tanpa Nama';
    const poNumber = getValueByFuzzyKey(row, ['no po', 'nomor po', 'po']) || `PO-${index}`;
    const dateStr = getValueByFuzzyKey(row, ['tanggal order', 'tgl order', 'date']) || new Date().toISOString();
    const deadline = getValueByFuzzyKey(row, ['deadline', 'tenggat']) || '-';
    
    const productName = getValueByFuzzyKey(row, ['items detail', 'item', 'produk', 'barang']) || 'Item Custom';
    const material = getValueByFuzzyKey(row, ['bahan', 'material']) || '-';
    const cutting = getValueByFuzzyKey(row, ['cutting', 'potongan']) || '-';
    const size = getValueByFuzzyKey(row, ['size', 'ukuran']) || '-';
    const note = getValueByFuzzyKey(row, ['catatan', 'note', 'keterangan']) || '-';
    
    // Raw image URL from sheet
    const rawImageUrl = getValueByFuzzyKey(row, ['foto referensi', 'link foto', 'image']) || '';
    // Konversi ke link yang lebih handal
    const imageUrl = toDirectDriveLink(rawImageUrl);

    const qtyShortStr = getValueByFuzzyKey(row, ['lengan pendek', 'pendek']);
    const qtyLongStr = getValueByFuzzyKey(row, ['lengan panjang', 'panjang']);
    const qtySingletStr = getValueByFuzzyKey(row, ['singlet']);

    const qtyShort = parseFloat(qtyShortStr.replace(/[^0-9.-]+/g, '')) || 0;
    const qtyLong = parseFloat(qtyLongStr.replace(/[^0-9.-]+/g, '')) || 0;
    const qtySinglet = parseFloat(qtySingletStr.replace(/[^0-9.-]+/g, '')) || 0;
    
    const totalQty = qtyShort + qtyLong + qtySinglet;

    if (!groups[name]) {
      groups[name] = {
        name,
        orders: [],
        groups: [],
        totalItems: 0,
        totalPOs: 0,
        lastOrderDate: dateStr,
        imageUrl: undefined
      };
    }

    if (!groups[name].imageUrl && imageUrl && imageUrl.startsWith('http')) {
      groups[name].imageUrl = imageUrl;
    }

    groups[name].orders.push({
      id: `order-${index}`,
      originalData: row,
      poNumber,
      date: dateStr,
      deadline,
      productName,
      material,
      cutting,
      size,
      note,
      imageUrl,
      qtyShort,
      qtyLong,
      qtySinglet,
      totalQty
    });

    groups[name].totalItems += totalQty;
    
    if (dateStr > groups[name].lastOrderDate) {
        groups[name].lastOrderDate = dateStr;
    }
  });

  Object.values(groups).forEach(group => {
    const uniquePOs = new Set(group.orders.map(o => o.poNumber));
    group.totalPOs = uniquePOs.size;
    group.groups = groupCustomerOrders(group.orders);
  });

  return Object.values(groups).sort((a, b) => b.totalItems - a.totalItems);
};
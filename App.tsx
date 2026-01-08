import React, { useEffect, useState, useMemo } from 'react';
import { fetchAndParseSheet, processOrders, consolidateGroupedItems, SHEET_ID, GID } from './utils';
import { CustomerGroup } from './types';
import GlassCard from './components/GlassCard';
import { 
  Users, 
  ShoppingBag, 
  Search, 
  Loader2, 
  Package, 
  CalendarDays,
  FileText,
  Scissors,
  AlertCircle,
  ImageIcon,
  ClipboardList,
  Layers,
  ChevronDown,
  ArrowUpDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'po_desc' | 'po_asc'>('po_desc'); 
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerGroup | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const raw = await fetchAndParseSheet(SHEET_ID, GID);
        const processed = processOrders(raw);
        setData(processed);
      } catch (err) {
        setError('Gagal memuat data. Pastikan Google Sheet bersifat publik.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const sortedData = useMemo(() => {
    const filtered = data.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.orders.some(o => o.poNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      group.orders.some(o => o.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filtered.sort((a, b) => {
        const getRepresentativePOVal = (group: CustomerGroup, type: 'min' | 'max') => {
            const vals = group.orders.map(o => {
                // Mengambil angka pertama yang ditemukan dalam string PO (tidak harus di awal string)
                const match = o.poNumber.match(/(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            });
            if (!vals.length) return 0;
            return type === 'max' ? Math.max(...vals) : Math.min(...vals);
        };

        if (sortOrder === 'po_asc') {
            return getRepresentativePOVal(a, 'min') - getRepresentativePOVal(b, 'min');
        } else {
            // Fix: Membandingkan b dengan a untuk urutan descending (Terbaru)
            return getRepresentativePOVal(b, 'max') - getRepresentativePOVal(a, 'max'); 
        }
    });
  }, [data, searchTerm, sortOrder]);

  const stats = useMemo(() => {
    const totalPOs = data.reduce((acc, curr) => acc + curr.totalPOs, 0);
    const totalItems = data.reduce((acc, curr) => acc + curr.totalItems, 0);
    const uniqueCustomers = data.length;
    return { totalPOs, totalItems, uniqueCustomers };
  }, [data]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b] text-white selection:bg-purple-500/30">
      
      {/* Navbar / Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/60 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between h-auto md:h-20 py-4 md:py-0 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-lg shadow-lg shadow-purple-500/20">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                PO Tokolari Web
              </span>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative group">
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-w-[180px] focus-within:bg-white/10 transition-colors">
                        <ArrowUpDown className="w-4 h-4 text-slate-400 mr-2" />
                        <select 
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'po_desc' | 'po_asc')}
                            className="bg-transparent border-none outline-none text-sm w-full text-slate-200 cursor-pointer appearance-none pr-4"
                        >
                            <option value="po_desc" className="bg-slate-800 text-slate-300">Urutan PO: Terbaru</option>
                            <option value="po_asc" className="bg-slate-800 text-slate-300">Urutan PO: Terlama</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-500 absolute right-3 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-4 py-2 w-full md:w-80 focus-within:bg-white/10 focus-within:border-purple-500/50 transition-all">
                    <Search className="w-4 h-4 text-slate-400 mr-2" />
                    <input 
                        type="text"
                        placeholder="Cari pemesan atau item..."
                        className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-500 text-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
          <GlassCard className="p-6 flex flex-col items-center justify-center text-center">
            <div className="mb-3 p-3 bg-blue-500/20 rounded-full text-blue-400">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total PO</h3>
            <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : stats.totalPOs}</p>
          </GlassCard>
          
          <GlassCard className="p-6 flex flex-col items-center justify-center text-center">
            <div className="mb-3 p-3 bg-purple-500/20 rounded-full text-purple-400">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Pcs</h3>
            <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : stats.totalItems}</p>
          </GlassCard>

          <GlassCard className="p-6 flex flex-col items-center justify-center text-center">
            <div className="mb-3 p-3 bg-pink-500/20 rounded-full text-pink-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Pemesan</h3>
            <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : stats.uniqueCustomers}</p>
          </GlassCard>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-white">Daftar Produksi</h2>
            <p className="text-slate-400 mt-1">
                {sortOrder === 'po_desc' ? "Menampilkan urutan PO terbaru" : "Menampilkan urutan PO terlama"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
            <p className="text-slate-400 animate-pulse">Mengambil data produksi...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
            <p className="text-red-400 mb-2 font-semibold">Terjadi Kesalahan</p>
            <p className="text-slate-400 text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <p className="text-xl">Tidak ada data ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            <AnimatePresence>
              {sortedData.map((customer, idx) => (
                <GlassCard 
                  key={customer.name + idx} 
                  className="p-6 h-full flex flex-col group/card"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-indigo-300">
                        <span className="text-lg font-bold">{getInitials(customer.name)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total</p>
                        <p className="text-xl font-bold text-emerald-400">{customer.totalItems} pcs</p>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 truncate" title={customer.name}>
                      {customer.name}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mb-6">
                      <FileText className="w-3 h-3" />
                      {customer.totalPOs} PO Aktif
                    </p>

                    <div className="space-y-3 mb-6">
                      {customer.groups.slice(0, 3).map((group, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex flex-col overflow-hidden mr-2">
                            <span className="text-xs text-purple-400 font-mono truncate">{group.poNumber}</span>
                            <span className="text-slate-300 truncate text-xs">
                              {group.material || "Produksi Custom"}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {group.totalQty}
                          </span>
                        </div>
                      ))}
                      {customer.groups.length > 3 && (
                        <p className="text-[10px] text-center text-slate-500 pt-2 border-t border-white/5">
                          + {customer.groups.length - 3} PO lainnya
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-slate-300 transition-all flex items-center justify-center gap-2 group-hover/card:text-white group-hover/card:border-purple-500/30">
                    Lihat Detail Produksi
                  </button>
                </GlassCard>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modal Detail Produksi */}
        <AnimatePresence>
          {selectedCustomer && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedCustomer(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                      {getInitials(selectedCustomer.name)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedCustomer.name}</h2>
                      <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                        <Package className="w-3 h-3" /> Total Produksi: <span className="text-emerald-400 font-bold">{selectedCustomer.totalItems} pcs</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/50">
                  <div className="grid grid-cols-1 gap-6">
                    {selectedCustomer.groups.map((group, idx) => {
                      const consolidatedItems = consolidateGroupedItems(group.items);

                      return (
                        <div key={group.key + idx} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.07] transition-colors shadow-lg">
                          
                          <div className="p-5 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-transparent">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div>
                                      <div className="flex items-center gap-3 mb-2">
                                          <span className="bg-purple-500 text-white px-2.5 py-1 rounded-md text-sm font-bold font-mono shadow-lg shadow-purple-500/20">
                                              {group.poNumber}
                                          </span>
                                          <span className="text-xs text-slate-400 flex items-center gap-1">
                                              <CalendarDays className="w-3 h-3" /> {group.date.split('T')[0]}
                                          </span>
                                          {group.deadline !== '-' && (
                                              <span className="text-xs text-red-300 bg-red-500/20 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                                  <AlertCircle className="w-3 h-3" /> {group.deadline}
                                              </span>
                                          )}
                                      </div>
                                      
                                      <div className="flex flex-wrap gap-2 text-sm">
                                          <div className="bg-black/30 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                              <Layers className="w-3.5 h-3.5 text-blue-400" />
                                              <span className="text-slate-400 text-xs uppercase">Bahan:</span>
                                              <span className="text-slate-200 font-medium">{group.material}</span>
                                          </div>
                                          <div className="bg-black/30 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                              <Scissors className="w-3.5 h-3.5 text-pink-400" />
                                              <span className="text-slate-400 text-xs uppercase">Cutting:</span>
                                              <span className="text-slate-200 font-medium">{group.cutting}</span>
                                          </div>
                                      </div>
                                  </div>

                                  {group.imageUrl && (
                                       <button 
                                          onClick={() => setPreviewImageUrl(group.imageUrl)}
                                          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 text-sm transition border border-blue-500/20 group/btn"
                                      >
                                          <ImageIcon className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                          Lihat Foto
                                      </button>
                                  )}
                              </div>
                          </div>

                          <div className="p-0">
                            {consolidatedItems.map((cItem, cIdx) => {
                                const totalShort = cItem.items.reduce((sum, i) => sum + i.qtyShort, 0);
                                const totalLong = cItem.items.reduce((sum, i) => sum + i.qtyLong, 0);
                                const totalSinglet = cItem.items.reduce((sum, i) => sum + i.qtySinglet, 0);

                                return (
                                  <div key={cItem.key + cIdx} className="border-b border-white/5 last:border-0">
                                    <div className="px-5 py-3 bg-white/5 flex items-center justify-between">
                                      <div>
                                        <h4 className="font-bold text-slate-200 text-sm md:text-base">{cItem.productName}</h4>
                                        {cItem.note && cItem.note !== '-' && (
                                           <p className="text-xs text-amber-200/70 italic">"{cItem.note}"</p>
                                        )}
                                      </div>
                                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                                        Subtotal: <span className="text-emerald-400 font-mono font-bold text-sm ml-1">{cItem.totalQty}</span>
                                      </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs md:text-sm">
                                        <thead className="bg-black/20 text-slate-500">
                                          <tr>
                                            <th className="px-5 py-2 font-medium w-24">Size</th>
                                            <th className="px-5 py-2 font-medium text-center">Short</th>
                                            <th className="px-5 py-2 font-medium text-center">Long</th>
                                            <th className="px-5 py-2 font-medium text-center">Singlet</th>
                                            <th className="px-5 py-2 font-medium text-right">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                          {cItem.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                              <td className="px-5 py-2 font-mono text-slate-300 font-bold bg-white/5">{item.size}</td>
                                              <td className="px-5 py-2 text-center text-slate-400">{item.qtyShort || '-'}</td>
                                              <td className="px-5 py-2 text-center text-slate-400">{item.qtyLong || '-'}</td>
                                              <td className="px-5 py-2 text-center text-slate-400">{item.qtySinglet || '-'}</td>
                                              <td className="px-5 py-2 text-right font-mono text-emerald-400 font-medium">{item.totalQty}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-white/5 border-t border-white/10 font-medium text-slate-300">
                                            <tr>
                                                <td className="px-5 py-2 text-xs uppercase tracking-wider text-slate-500">Total</td>
                                                <td className="px-5 py-2 text-center font-mono">{totalShort || '-'}</td>
                                                <td className="px-5 py-2 text-center font-mono">{totalLong || '-'}</td>
                                                <td className="px-5 py-2 text-center font-mono">{totalSinglet || '-'}</td>
                                                <td className="px-5 py-2 text-right text-emerald-300 font-mono font-bold">{cItem.totalQty}</td>
                                            </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                );
                            })}
                          </div>
                          
                           <div className="bg-white/5 p-3 flex justify-end items-center gap-3 border-t border-white/10">
                              <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Total Group</span>
                              <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded font-mono font-bold border border-emerald-500/30">
                                {group.totalQty} pcs
                              </span>
                           </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-white/5 border-t border-white/10 text-right">
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="px-6 py-2 bg-white text-slate-900 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Preview Foto */}
        <AnimatePresence>
          {previewImageUrl && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setPreviewImageUrl(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-[95vw] max-h-[90vh] group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute -top-12 right-0 flex items-center gap-4 text-white">
                  <p className="text-sm font-medium opacity-70">Klik dimana saja untuk tutup</p>
                  <button 
                    onClick={() => setPreviewImageUrl(null)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-800 flex items-center justify-center min-w-[300px] min-h-[300px]">
                  <img 
                    src={previewImageUrl} 
                    alt="Preview Produksi" 
                    className="max-w-full max-h-[80vh] object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1e293b/white?text=Gambar+Tidak+Dapat+Dimuat';
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
};

export default App;
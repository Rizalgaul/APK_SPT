import React, { useState, useRef, useEffect } from "react";
import { 
  FileSpreadsheet, 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Printer, 
  Database, 
  RefreshCw,
  Plus, 
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Sliders,
  DollarSign,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ==========================================
// INTERFACES & TYPES DEFINITION
// ==========================================
interface ParsedItem {
  id: string;
  sourceSheet: string;
  category: "penghasilan" | "harta" | "hutang";
  description: string;
  value: number;
  year?: number; // Terutama untuk harta/hutang tahun perolehan
  rowIdx: number;
  colIdx: number;
  included: boolean; // Dapat di-toggle aktif/non-aktif oleh pengguna
}

interface SheetOverview {
  name: string;
  rowCount: number;
  colCount: number;
  previewRows: any[][];
}

// ==========================================
// DATA SIMULASI CHANDRA WIMBA (STANDBY SEBELUM UPLOAD)
// ==========================================
const SIMULATED_WORKBOOK_NAME = "Draft SPT OP Chandra Wimba 2023 - 2024 (1).xlsx";

const SIMULATED_DATA: ParsedItem[] = [
  // Penghasilan Neto
  { id: "inc-1", sourceSheet: "Penghasilan Neto 2024", category: "penghasilan", description: "Gaji Pokok & Tunjangan Bulanan (PT Mahakam Karya)", value: 240000000, rowIdx: 4, colIdx: 3, included: true },
  { id: "inc-2", sourceSheet: "Penghasilan Neto 2024", category: "penghasilan", description: "Honorarium Pembicara Utama Jasa Konsultan Pajak", value: 45000000, rowIdx: 6, colIdx: 3, included: true },
  { id: "inc-3", sourceSheet: "Penghasilan Neto 2024", category: "penghasilan", description: "Penerimaan Dividen DN PT Semeru Utama (Bebas Pajak)", value: 15000000, rowIdx: 8, colIdx: 3, included: true },
  { id: "inc-4", sourceSheet: "Penghasilan Neto 2024", category: "penghasilan", description: "Keuntungan Sewa Bangunan Ruko Komersial", value: 60000000, rowIdx: 11, colIdx: 3, included: true },
  
  // Daftar Harta
  { id: "ast-1", sourceSheet: "Daftar Harta", category: "harta", description: "Uang Tunai & Tabungan Bank Mandiri", value: 50000000, year: 2020, rowIdx: 3, colIdx: 4, included: true },
  { id: "ast-2", sourceSheet: "Daftar Harta", category: "harta", description: "Tanah & Gedung Tempat Tinggal (Sektor Jaksel)", value: 1200000000, year: 2018, rowIdx: 4, colIdx: 4, included: true },
  { id: "ast-3", sourceSheet: "Daftar Harta", category: "harta", description: "Mobil SUV Baru (Tahun Perolehan 2024)", value: 180000000, year: 2024, rowIdx: 5, colIdx: 4, included: true },
  { id: "ast-4", sourceSheet: "Daftar Harta", category: "harta", description: "Laptop High-End Kerja & Gadget (Tahun Perolehan 2024)", value: 20000000, year: 2024, rowIdx: 6, colIdx: 4, included: true },
  { id: "ast-5", sourceSheet: "Daftar Harta", category: "harta", description: "Logam Mulia Antam (Kepingan Fisik)", value: 50000000, year: 2023, rowIdx: 7, colIdx: 4, included: true },

  // Daftar Hutang
  { id: "liab-1", sourceSheet: "Kewajiban & Utang", category: "hutang", description: "Kredit Pemilikan Rumah (KPR Bank Mandiri)", value: 250000000, year: 2018, rowIdx: 3, colIdx: 4, included: true },
  { id: "liab-2", sourceSheet: "Kewajiban & Utang", category: "hutang", description: "Utang Kartu Kredit Personal BCA Bank", value: 10000000, year: 2024, rowIdx: 4, colIdx: 4, included: true }
];

export default function App() {
  // State manajemen file & parser
  const [fileName, setFileName] = useState<string>("");
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [sheetsList, setSheetsList] = useState<SheetOverview[]>([]);
  const [activeSheetPreview, setActiveSheetPreview] = useState<string>("");
  
  // Model data aplikatif
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  
  // State konseptual kalkulasi cash flow (input dinamis pengguna)
  const [manualInitialCash, setManualInitialCash] = useState<number>(50000000); // Saldo kas awal tahun
  const [monthlyLivingCost, setMonthlyLivingCost] = useState<number>(10000000); // Rp 10jt / bulan
  const [additionalInflow, setAdditionalInflow] = useState<number>(0); // Pembagian warisan/hibah non-objek
  const [additionalOutflow, setAdditionalOutflow] = useState<number>(0); // Hutang lunas atau bayar bunga non-kapitalisasi
  
  // Filter & Toggle views
  const [collapsibles, setCollapsibles] = useState({
    penghasilan: true,
    harta: true,
    hutang: true,
    logs: false,
    mapping: false
  });

  // State untuk form manual entry
  const [newDesc, setNewDesc] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<"penghasilan" | "harta" | "hutang">("penghasilan");
  const [newYear, setNewYear] = useState("2024");

  // Drag over status
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper formatting mata uang Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Muat Demo Chandra Wimba secara instan
  const loadDemoData = () => {
    setFileName(SIMULATED_WORKBOOK_NAME);
    setIsDemo(true);
    setParsedItems(JSON.parse(JSON.stringify(SIMULATED_DATA)));
    setSelectedYear(2024);
    setManualInitialCash(50000000);
    setMonthlyLivingCost(10000000);
    setAdditionalInflow(0);
    setAdditionalOutflow(0);

    // Mock sheet overview untuk visualisasi data sheet explorer
    setSheetsList([
      {
        name: "Penghasilan Neto 2024",
        rowCount: 14,
        colCount: 5,
        previewRows: [
          ["No", "Sumber Penerimaan", "Pemberi Kerja", "Jumlah Bruto (Rp)", "Sisa Neto Wilayah (Rp)"],
          ["1", "Gaji Pokok & Tunjangan", "PT Mahakam Karya", "300.000.000", "240.000.000"],
          ["2", "Honorarium Jasa Konsultasi", "Klien Mandiri", "50.000.000", "45.000.000"],
          ["3", "Dividen DN (Bebas Pajak)", "PT Semeru Utama", "15.000.000", "15.000.000"],
          ["4", "Sewa Ruko Komersial Jabar", "Perseorangan", "70.000.000", "60.000.000"],
          ["Total Penghasilan Neto", "", "", "", "360.000.000"]
        ]
      },
      {
        name: "Daftar Harta",
        rowCount: 10,
        colCount: 6,
        previewRows: [
          ["Kode Harta", "Nama Harta/Aset", "Tahun Perolehan", "Rincian Lokasi", "Harga Perolehan (Rp)", "Status"],
          ["011", "Uang Tunai & Tabungan Bank", "2020", "Rekening Mandiri", "50.000.000", "Milik Sendiri"],
          ["061", "Tanah & Gedung Tempat Tinggal", "2018", "Jakarta Selatan", "1.200.000.000", "Milik Sendiri"],
          ["043", "Mobil SUV Baru", "2024", "Showroom Tebet", "180.000.000", "Milik Sendiri"],
          ["012", "Laptop High-End Kerja & Gadget", "2024", "Apple Store", "20.000.000", "Milik Sendiri"],
          ["051", "Logam Mulia Antam", "2023", "Brankas Rumah", "50.000.000", "Milik Sendiri"]
        ]
      },
      {
        name: "Kewajiban & Utang",
        rowCount: 6,
        colCount: 5,
        previewRows: [
          ["Kode Utang", "Nama Kreditur/Pemberi Pinjaman", "Tahun Peminjaman", "Alamat Kreditur", "Sisa Pokok Utang (Rp)"],
          ["101", "Kredit Pemilikan Rumah (KPR)", "2018", "Bank Mandiri KC JKT", "250.000.000"],
          ["102", "Utang Kartu Kredit Personal", "2024", "BCA Card Center", "10.000.000"]
        ]
      }
    ]);
    setActiveSheetPreview("Penghasilan Neto 2024");
  };

  // Trigger load demo di awal render agar screen tidak kosong (excellent user-experience)
  useEffect(() => {
    loadDemoData();
  }, []);

  // ==========================================
  // JAVASCRIPT EXCEL PARSING LOGIC (SHEETJS)
  // Pengguna bisa menyesuaikan nama Sheet / kata kunci di bawah ini!
  // ==========================================
  const executeExcelFileProcessing = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const XLSX = (window as any).XLSX;
        
        if (!XLSX) {
          alert("Gagal memuat library SheetJS (XLSX). Silakan pastikan Anda terhubung ke internet.");
          return;
        }

        // Membaca file workbook Excel secara riil
        const workbook = XLSX.read(data, { type: "array" });
        const sheetNames = workbook.SheetNames;
        
        let foundItems: ParsedItem[] = [];
        let createdSheetsMeta: SheetOverview[] = [];

        // Iterasi semua worksheet di dalam Excel
        sheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          // Mengubah sheet menjadi array bimbingan baris & kolom 2D
          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

          if (rawRows.length > 0) {
            createdSheetsMeta.push({
              name: sheetName,
              rowCount: rawRows.length,
              colCount: rawRows[0].length || 0,
              previewRows: rawRows.slice(0, 15) // Kita simpan 15 baris pertama untuk explorer UI
            });
          }

          // Normalisasi nama sheet menjadi huruf kecil untuk pelacakan pintar
          const lowSheetName = sheetName.toLowerCase();

          // ----------------------------------------------------
          // CATATAN UNTUK PENGGUNA:
          // Di bawah ini adalah KATA KUNCI pencocokan Sheet.
          // Jika nama sheet di Excel Anda berbeda, ubah teks berikut:
          // ----------------------------------------------------
          const isIncomeSheet = lowSheetName.includes("penghasilan") || lowSheetName.includes("gaji") || lowSheetName.includes("neto") || lowSheetName.includes("netto") || lowSheetName.includes("bukti potong") || lowSheetName.includes("income");
          const isAssetSheet = lowSheetName.includes("harta") || lowSheetName.includes("aset") || lowSheetName.includes("asset") || lowSheetName.includes("kepemilikan") || lowSheetName.includes("harta baru");
          const isDebtSheet = lowSheetName.includes("hutang") || lowSheetName.includes("utang") || lowSheetName.includes("kewajiban") || lowSheetName.includes("liability") || lowSheetName.includes("liabilities");

          // Telusuri sel baris demi baris di sheet yang dicurigai
          rawRows.forEach((row, rowIdx) => {
            row.forEach((cellValue, colIdx) => {
              if (!cellValue) return;
              const cellStr = String(cellValue).trim();
              const lowCellStr = cellStr.toLowerCase();

              // Heuristik parsing angka dari sel-sel berikutnya di baris yang sama
              const extractLastNumberInRow = (currentRow: any[], startColIndex: number): number => {
                // Cari angka terbesar di sebelah kanan sel keyword tersebut
                for (let i = currentRow.length - 1; i > startColIndex; i--) {
                  const val = currentRow[i];
                  if (typeof val === "number") return val;
                  if (val && !isNaN(Number(String(val).replace(/[^0-9.-]+/g, "")))) {
                    const parsed = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
                    if (parsed > 1000) return parsed; // Menghindari parsing indeks nomor 1, 2, dsb
                  }
                }
                return 0;
              };

              // -----------------------------------------------------------------------
              // LOGIKA KATA KUNCI 1: PENGHASILAN / GAJI / NETO
              // Jika sheet terindikasi sebagai tempat penghasilan atau sel mengandung kata kunci
              // -----------------------------------------------------------------------
              const matchesIncomeKeyword = 
                lowCellStr.includes("gaji") || 
                lowCellStr.includes("honorarium") || 
                lowCellStr.includes("neto") || 
                lowCellStr.includes("netto") || 
                lowCellStr.includes("dividen") || 
                lowCellStr.includes("tunjangan") ||
                lowCellStr.includes("sewa ruko") ||
                lowCellStr.includes("penghasilan bruto");

              if ((isIncomeSheet || matchesIncomeKeyword) && !lowCellStr.includes("jumlah") && !lowCellStr.includes("total") && !lowCellStr.includes("pajak")) {
                const matchedNum = extractLastNumberInRow(row, colIdx);
                // Hanya simpan jika angkanya masuk akal (> Rp 100.000)
                if (matchedNum > 100000) {
                  // Pastikan deskripsi tidak berupa angka saja atau kosong
                  const isCleanDesc = cellStr.length > 3 && isNaN(Number(cellStr));
                  if (isCleanDesc) {
                    foundItems.push({
                      id: `raw-inc-${rowIdx}-${colIdx}-${Math.random().toString(36).substr(2, 4)}`,
                      sourceSheet: sheetName,
                      category: "penghasilan",
                      description: `${cellStr} (Ditemukan di Baris ${rowIdx + 1})`,
                      value: matchedNum,
                      rowIdx,
                      colIdx,
                      included: true
                    });
                  }
                }
              }

              // -----------------------------------------------------------------------
              // LOGIKA KATA KUNCI 2: HARTA / ASET
              // Mencari aset yang dimiliki wajib pajak beserta tahun perolehan
              // -----------------------------------------------------------------------
              const matchesAssetKeyword = 
                lowCellStr.includes("mobil") || 
                lowCellStr.includes("motor") || 
                lowCellStr.includes("rumah") || 
                lowCellStr.includes("tanah") || 
                lowCellStr.includes("deposito") || 
                lowCellStr.includes("saham") || 
                lowCellStr.includes("tabungan") || 
                lowCellStr.includes("emas") || 
                lowCellStr.includes("barang") || 
                lowCellStr.includes("logam mulia");

              if (isAssetSheet || matchesAssetKeyword) {
                // Harta sering kali berada dalam format tabel: Nama Harta | Tahun Perolehan | Harga Perolehan
                if (!lowCellStr.includes("kode") && !lowCellStr.includes("harta") && !lowCellStr.includes("total") && !lowCellStr.includes("jumlah")) {
                  // Cari apakah ada tahun perolehan di dalam baris yang sama (biasanya antara 1980 - 2026)
                  let yearVal = 2020; // Default fallback year
                  let foundYear = false;
                  let assetValue = 0;

                  row.forEach((v, idx) => {
                    if (typeof v === "number" && v >= 1970 && v <= 2026) {
                      yearVal = v;
                      foundYear = true;
                    } else if (typeof v === "string" && /^(19|20)\d{2}$/.test(v.trim())) {
                      yearVal = parseInt(v.trim(), 10);
                      foundYear = true;
                    }
                  });

                  // Ambil nilai perolehan terbesar selain dari tahun
                  let highestNum = 0;
                  row.forEach((v) => {
                    let candidate = 0;
                    if (typeof v === "number") {
                      candidate = v;
                    } else if (v && !isNaN(Number(String(v).replace(/[^0-9.-]+/g, "")))) {
                      candidate = parseFloat(String(v).replace(/[^0-9.-]+/g, ""));
                    }
                    if (candidate > highestNum && candidate !== yearVal && candidate < 100000000000) {
                      highestNum = candidate;
                    }
                  });

                  assetValue = highestNum;

                  if (assetValue > 1000000) { // Harta biasanya dinilai di atas 1 juta rupiah
                    const isCleanAssetDesc = cellStr.length > 3 && isNaN(Number(cellStr));
                    if (isCleanAssetDesc && !foundItems.some(item => item.description.includes(cellStr))) {
                      foundItems.push({
                        id: `raw-ast-${rowIdx}-${colIdx}-${Math.random().toString(36).substr(2, 4)}`,
                        sourceSheet: sheetName,
                        category: "harta",
                        description: `${cellStr} (${foundYear ? 'Tahun ' + yearVal : 'Tahun Tidak Valid'})`,
                        value: assetValue,
                        year: yearVal,
                        rowIdx,
                        colIdx,
                        included: true
                      });
                    }
                  }
                }
              }

              // -----------------------------------------------------------------------
              // LOGIKA KATA KUNCI 3: HUTANG / KEWAJIBAN
              // -----------------------------------------------------------------------
              const matchesDebtKeyword = 
                lowCellStr.includes("kredit") || 
                lowCellStr.includes("kpr") || 
                lowCellStr.includes("pinjaman") || 
                lowCellStr.includes("utang") || 
                lowCellStr.includes("hutang") || 
                lowCellStr.includes("leasing");

              if (isDebtSheet || matchesDebtKeyword) {
                if (!lowCellStr.includes("kode") && !lowCellStr.includes("jumlah") && !lowCellStr.includes("total")) {
                  let debtYear = 2020;
                  row.forEach((v) => {
                    if (typeof v === "number" && v >= 2010 && v <= 2026) {
                      debtYear = v;
                    }
                  });

                  let debtValue = extractLastNumberInRow(row, colIdx);
                  if (debtValue > 1000000) {
                    const isCleanDebtDesc = cellStr.length > 3 && isNaN(Number(cellStr));
                    if (isCleanDebtDesc) {
                      foundItems.push({
                        id: `raw-liab-${rowIdx}-${colIdx}-${Math.random().toString(36).substr(2, 4)}`,
                        sourceSheet: sheetName,
                        category: "hutang",
                        description: `${cellStr} (Kreditur)`,
                        value: debtValue,
                        year: debtYear,
                        rowIdx,
                        colIdx,
                        included: true
                      });
                    }
                  }
                }
              }

            });
          });
        });

        // Jika tidak ada data yang terdeteksi, coba dengan pencarian yang lebih umum
        if (foundItems.length === 0) {
          // Cari sheet apapun yang memiliki baris dan kolom berisi numerik dan label string
          sheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
            rawRows.slice(0, 50).forEach((row, rowIdx) => {
              row.forEach((cellVal, colIdx) => {
                if (typeof cellVal === "string" && cellVal.length > 3 && isNaN(Number(cellVal))) {
                  // Jika disebelah kanannya ada angka besar
                  row.forEach((nextCell, nextIdx) => {
                    if (nextIdx > colIdx && typeof nextCell === "number" && nextCell > 500000) {
                      foundItems.push({
                        id: `raw-fallback-${rowIdx}-${colIdx}-${nextIdx}`,
                        sourceSheet: sheetName,
                        category: cellVal.toLowerCase().includes("harta") || cellVal.toLowerCase().includes("mobil") ? "harta" : "penghasilan",
                        description: `${cellVal} (${sheetName})`,
                        value: nextCell,
                        year: 2024,
                        rowIdx,
                        colIdx,
                        included: true
                      });
                    }
                  });
                }
              });
            });
          });
        }

        // Simpan hasil ke state utama
        if (foundItems.length > 0) {
          setParsedItems(foundItems);
          setFileName(file.name);
          setIsDemo(false);
          setSheetsList(createdSheetsMeta);
          if (createdSheetsMeta.length > 0) {
            setActiveSheetPreview(createdSheetsMeta[0].name);
          }
        } else {
          alert("Excel terbaca, namun kami tidak menemukan format data wajib pajak yang cocok. Kami telah memuat mode data interaktif simulasi sebagai panduan.");
          loadDemoData();
        }

      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan teknis saat membaca file Excel. Pastikan file tidak terenkripsi atau korup.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Menangani seleksi file drop/manual
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      executeExcelFileProcessing(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      executeExcelFileProcessing(file);
    }
  };

  // ==========================================
  // MANIPULASI DATA OLEH PENGGUNA (FINE-TUNING)
  // ==========================================
  const toggleItemInclusion = (id: string) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, included: !item.included } : item));
  };

  const deleteItem = (id: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || !newValue) return;

    const valNum = parseFloat(newValue.replace(/[^0-9]/g, ""));
    if (isNaN(valNum) || valNum <= 0) {
      alert("Masukkan nilai rupiah yang valid.");
      return;
    }

    const newItem: ParsedItem = {
      id: `manual-${Date.now()}`,
      sourceSheet: "Input Manual User",
      category: newCategory,
      description: newDesc,
      value: valNum,
      year: parseInt(newYear, 10) || selectedYear,
      rowIdx: -1,
      colIdx: -1,
      included: true
    };

    setParsedItems(prev => [...prev, newItem]);
    setNewDesc("");
    setNewValue("");
    alert("Item berhasil ditambahkan ke dashboard!");
  };

  // ==========================================
  // LOGIKA UTAMA RANGKUMAN & ARUS KAS (FORMULA PAJAK)
  // ==========================================
  
  // 1. Total Penghasilan Neto (Pemasukan)
  const totalPenghasilanNeto = parsedItems
    .filter(item => item.included && item.category === "penghasilan")
    .reduce((sum, item) => sum + item.value, 0);

  // 2. Filter Harta yang dibeli pada tahun pajak yang dipilih
  const totalHartaBaru = parsedItems
    .filter(item => item.included && item.category === "harta" && item.year === selectedYear)
    .reduce((sum, item) => sum + item.value, 0);

  // 3. Kas Awal (Konfigurasi atau Harta Kas Lama)
  // Secara default, jika ada kas/tabungan dengan Tahun Perolehan di bawah selectedYear, kita bisa mengasumsikannya sebagai Kas Awal
  const kasLamaTerdeteksi = parsedItems
    .filter(item => item.included && item.category === "harta" && item.year && item.year < selectedYear && (item.description.toLowerCase().includes("kas") || item.description.toLowerCase().includes("tabungan") || item.description.toLowerCase().includes("bank")))
    .reduce((sum, item) => sum + item.value, 0);

  // Hubungkan Kas Awal input manual dengan deteksi otomatis jika diinginkan
  const currentInitialCash = manualInitialCash;

  // 4. Pengeluaran Hidup (Tahunan)
  const annualLivingCost = monthlyLivingCost * 12;

  // 5. Total Utang Baru pada tahun pajak berjalan (biasanya menambah potensi kas masuk dari pinjaman)
  const totalUtangBaru = parsedItems
    .filter(item => item.included && item.category === "hutang" && item.year === selectedYear)
    .reduce((sum, item) => sum + item.value, 0);

  // 6. Estimasi Sisa Kas Akhir secara Teoretis
  // Formula: Kas Awal + Pemasukan Neto + Penerimaan Non-Objek + Utang Baru - Pengeluaran Hidup - Pembelian Harta Baru - Pengeluaran Lainnya
  const estimasiSisaKas = currentInitialCash + totalPenghasilanNeto + additionalInflow + totalUtangBaru - annualLivingCost - totalHartaBaru - additionalOutflow;

  // 7. Estimasi Hasil Kas Nyata yang dilaporkan di SPT (Harta Kas berjalan tahun terpilih)
  const totalKasBerjalanTerlapor = parsedItems
    .filter(item => item.included && item.category === "harta" && item.year === selectedYear && (item.description.toLowerCase().includes("kas") || item.description.toLowerCase().includes("tabungan") || item.description.toLowerCase().includes("bank")))
    .reduce((sum, item) => sum + item.value, 0);

  // ==========================================
  // DIAGNOSIS KELOGISAN ARUS KAS (RISIKO PEMERIKSAAN)
  // ==========================================
  const getTaxAuditRiskInfo = () => {
    const selisihNetoHarta = totalPenghasilanNeto - totalHartaBaru;
    
    if (estimasiSisaKas < 0) {
      return {
        status: "TIDAK LOGIS (RISIKO TINGGI)",
        color: "text-rose-700 bg-rose-50/80 border-rose-200",
        bgBadge: "bg-rose-100 text-rose-800",
        message: "Arus kas Anda bernilai NEGATIF. Total penambahan harta baru dan pengeluaran hidup melebihi penghasilan bersih yang dilaporkan beserta kas awal.",
        suggestion: "DJP dapat mengasumsikan adanya penghasilan tersembunyi yang belum dilaporkan. Disarankan untuk meninjau kembali kecocokan Harga Perolehan Harta Baru atau menambah data Penghasilan Neto yang belum terangkum."
      };
    } else if (selisihNetoHarta < 0) {
      return {
        status: "KURANG LOGIS (RISIKO SEDANG)",
        color: "text-amber-700 bg-amber-50/80 border-amber-200",
        bgBadge: "bg-amber-100 text-amber-800",
        message: "Kenaikan harta baru di tahun ini melebihi total penghasilan neto tahunan Anda. Sumber pendanaan harta harus didukung oleh kas awal atau utang baru yang logis.",
        suggestion: "Pastikan 'Saldo Kas Awal' Anda diinput dengan benar untuk menjustifikasi pembelian harta baru ini, atau cantumkan daftar hutang baru jika pembelian dilakukan secara kredit."
      };
    } else {
      return {
        status: "LOGIS-MEMADAI (RISIKO RENDAH)",
        color: "text-emerald-700 bg-emerald-50/80 border-emerald-200",
        bgBadge: "bg-emerald-100 text-emerald-800",
        message: "Arus kas Anda bernilai positif dan logis. Penghasilan neto tahun ini memadai untuk membiayai penambahan harta baru serta memenuhi standar kebutuhan hidup.",
        suggestion: "Rencana SPT Anda memiliki kecocokan kas yang aman dari deteksi dini kecurigaan analitik AR (Account Representative) KPP Pratama."
      };
    }
  };

  const diagnostic = getTaxAuditRiskInfo();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-[#1e3a8a] selection:text-white">
      {/* HEADER UTAMA */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50 no-print shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#1e3a8a] p-2 rounded-lg shadow-sm">
              <FileSpreadsheet className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold font-serif tracking-wider text-[#1e3a8a] uppercase">SPT-Flow</h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-tight">Automasi Rangkuman &amp; Rekonsiliasi Arus Kas</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isDemo && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                Mode Simulasi
              </span>
            )}
            <button
              onClick={loadDemoData}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
              title="Kembalikan ke data default Chandra Wimba"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Demo</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e3a8a] text-white hover:bg-[#152e72] transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* BANNER UTAMA & UPLOAD ZONE */}
        <section className="no-print">
          <div className="bg-[#1e3a8a] text-white rounded-2xl border border-blue-950 p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-955/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center position-relative z-10">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-950/30 border border-blue-800 text-blue-100 text-[10px] font-semibold tracking-wider uppercase font-mono">
                  <Database className="w-3 h-3 mr-1.5" />
                  Kepatuhan Perpajakan Mandiri
                </div>
                <h2 className="text-2xl md:text-3.5xl font-normal tracking-tight font-serif text-white text-left">
                  Analisis Rekonsiliasi Kas <span className="italic font-normal">SPT Tahunan Orang Pribadi</span>
                </h2>
                <p className="text-blue-100/90 text-xs md:text-sm leading-relaxed max-w-2xl font-light text-left">
                  Apakah penambahan aset baru Anda di SPT sudah selaras dengan penghasilan bersih tahunan?
                  Unggah draft SPT dalam format <span className="text-white font-medium">Excel (.xlsx / .xls)</span>, atau jalankan simulasi data <span className="text-white font-medium">Bp. Chandra Wimba</span> di bawah ini. Pengolahan file 100% aman serta dijalankan langsung di browser Anda.
                </p>
                
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="flex items-center space-x-2 text-xs text-blue-100 bg-blue-950/20 px-3.5 py-1.5 rounded-lg border border-blue-800/60 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>100% Client-Side Engine</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-blue-100 bg-blue-950/20 px-3.5 py-1.5 rounded-lg border border-blue-800/60 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span>Automated SheetJS Parser</span>
                  </div>
                </div>
              </div>

              {/* UPLOAD BOX */}
              <div className="lg:col-span-5">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] ${
                    isDragOver 
                      ? "border-emerald-400 bg-blue-950/40 scale-[1.01]" 
                      : "border-blue-800/60 bg-blue-950/20 hover:bg-blue-950/30 hover:border-blue-600"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  
                  <div className="w-11 h-11 rounded-full bg-blue-950 text-blue-300 flex items-center justify-center mb-4 border border-blue-800 shadow-inner">
                    <Upload className="w-5 h-5" />
                  </div>
                  
                  <h3 className="font-semibold text-xs text-white uppercase tracking-wider font-display">
                    {fileName ? "Ganti File Excel SPT" : "Unggah SPT Excel Anda"}
                  </h3>
                  <p className="text-[11px] text-blue-100/75 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                    Tarik dan lepaskan file di sini, atau klik untuk merujuk file dari media lokal (.xlsx, .xls)
                  </p>

                  {fileName && (
                    <div className="mt-4 px-3 py-1.5 rounded-lg bg-[#1e293b] border border-slate-700 inline-flex items-center space-x-2 text-[11px] text-emerald-400">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate max-w-[180px] font-mono">{fileName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRINTABLE HEADER (HANYA MUNCUL DI PRINT) */}
        <div className="hidden print:block text-slate-900 p-4 border-b border-slate-300">
          <h1 className="text-2xl font-bold text-slate-800">LAPORAN REKONSILIASI ARUS KAS &amp; KELOGISAN SPT</h1>
          <p className="text-sm text-slate-600">Terbaca dari: {fileName || "Data Input Manual"}</p>
          <p className="text-xs text-slate-500 mt-1">Dicetak pada tanggal: {new Date().toLocaleDateString("id-ID")}</p>
        </div>

        {/* ==========================================
            DASHBOARD UTAMA (3 KARTU INFORMASI)
            ========================================== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Total Penghasilan */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs transition hover:border-[#1e3a8a]/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-[#1e3a8a] uppercase tracking-widest font-display">TOTAL PENGHASILAN NETO</span>
              <div className="bg-blue-50 p-1.5 rounded text-[#1e3a8a]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2.5xl font-semibold tracking-tight text-slate-900 font-serif leading-none">
                {formatRupiah(totalPenghasilanNeto)}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center font-mono">
                <Info className="w-3 h-3 mr-1 text-slate-400" />
                Gabungan {parsedItems.filter(item => item.included && item.category === "penghasilan").length} baris pendapatan bersih
              </p>
            </div>
          </div>

          {/* Card 2: Total Harta Baru */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs transition hover:border-amber-500/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-display">BELANJA HARTA BARU ({selectedYear})</span>
              <div className="bg-amber-50 p-1.5 rounded text-amber-800">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2.5xl font-semibold tracking-tight text-slate-900 font-serif leading-none">
                {formatRupiah(totalHartaBaru)}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center font-mono">
                <Info className="w-3 h-3 mr-1 text-slate-400" />
                Diperoleh pada tahun pajak {selectedYear}
              </p>
            </div>
          </div>

          {/* Card 3: Estimasi Sisa Kas */}
          <div className={`rounded-xl border p-6 flex flex-col justify-between shadow-xs transition ${estimasiSisaKas >= 0 ? 'bg-white border-slate-200 hover:border-emerald-500/50' : 'bg-rose-50/20 border-rose-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-widest font-display ${estimasiSisaKas >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>ESTIMASI SISA KAS AKHIR</span>
              <div className={`p-1.5 rounded ${estimasiSisaKas >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className={`text-2.5xl font-semibold tracking-tight font-serif leading-none ${estimasiSisaKas >= 0 ? 'text-[#1e3a8a]' : 'text-rose-700'}`}>
                {formatRupiah(estimasiSisaKas)}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 flex items-center font-mono">
                <Info className="w-3 h-3 mr-1 text-slate-400" />
                Potensi sisa kas tersimpan tahun berjalan
              </p>
            </div>
          </div>

        </section>

        {/* RISK DIAGNOSTICS VIEW */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold font-serif text-slate-900">Analisis Kepatuhan &amp; Risiko Pajak</h2>
                <p className="text-xs text-slate-500">Kalkulasi teoretis kelogisan kas berdasarkan standar Direktorat Jenderal Pajak (DJP)</p>
              </div>
              <div className={`px-4 py-1.5 rounded border text-xs font-bold tracking-wider text-center uppercase font-mono ${diagnostic.color}`}>
                {diagnostic.status}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="lg:col-span-1 flex justify-center">
                <div className="bg-amber-100 text-amber-800 p-2.5 rounded border border-amber-200">
                  <AlertTriangle className="w-5.5 h-5.5" />
                </div>
              </div>
              <div className="lg:col-span-11 space-y-1">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">Evaluasi Konsistensi Keuangan:</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  {diagnostic.message}
                </p>
                <div className="text-xs text-slate-700 border-l-2 border-[#1e3a8a] pl-3 mt-2">
                  <strong className="text-[#1e3a8a] font-semibold">Saran Ahli Pajak Indonesia:</strong> {diagnostic.suggestion}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* METODE KEDUA: SIMULATOR ARUS KAS & PARAMETER DINAMIS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SISI KIRI (8 KOLOM): DETAIL SPREADSHEET ITEMS */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* PANEL EDIT DAN STRUKTUR EXCEL */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-[#1e3a8a]" />
                  <h3 className="font-semibold text-base font-serif text-slate-900">Rincian Data yang Terdeteksi</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Tahun Pajak SPT:</span>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-[#1e3a8a] outline-none font-medium"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                    <option value={2023}>2023</option>
                    <option value={2022}>2022</option>
                  </select>
                </div>
              </div>

              {/* TAB AKUMULATOR ITEM */}
              <div className="space-y-6 font-sans">

                {/* TAB 1: PENGHASILAN NETO */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                  <button 
                    onClick={() => setCollapsibles(p => ({ ...p, penghasilan: !p.penghasilan }))}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 text-xs font-bold hover:bg-slate-100/80 transition group text-slate-800 uppercase tracking-wider font-display border-b border-slate-150"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <span>Golongan Penerimaan / Penghasilan Neto</span>
                      <span className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px] text-slate-600 font-mono font-bold">
                        {parsedItems.filter(i => i.category === "penghasilan").length} item
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-500">
                      <span className="font-mono text-xs font-semibold text-[#1e3a8a]">{formatRupiah(totalPenghasilanNeto)}</span>
                      {collapsibles.penghasilan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {collapsibles.penghasilan && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-white"
                      >
                        <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                          {parsedItems.filter(i => i.category === "penghasilan").length === 0 ? (
                            <p className="text-xs text-slate-400 p-4 text-center">Tidak ada item penghasilan terdeteksi.</p>
                          ) : (
                            parsedItems.filter(i => i.category === "penghasilan").map((item) => (
                              <div 
                                key={item.id} 
                                className={`flex items-center justify-between p-3.5 rounded-lg border text-xs transition duration-150 ${
                                  item.included 
                                    ? "bg-slate-50/50 border-slate-200 hover:border-slate-350" 
                                    : "bg-slate-50/20 border-slate-100 text-slate-400"
                                }`}
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                                  <input 
                                    type="checkbox" 
                                    checked={item.included}
                                    onChange={() => toggleItemInclusion(item.id)}
                                    className="rounded border-slate-300 bg-white text-[#1e3a8a] focus:ring-0 cursor-pointer w-4 h-4"
                                  />
                                  <div className="truncate">
                                    <p className={`font-semibold ${item.included ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                      {item.description}
                                    </p>
                                    <p className="text-[10px] text-slate-400 tracking-wide mt-0.5 font-mono">
                                      Asal: {item.sourceSheet} (r:{item.rowIdx + 1}, c:{item.colIdx + 1})
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span className={`font-mono font-semibold ${item.included ? 'text-[#1e3a8a]' : 'text-slate-400 line-through'}`}>
                                    {formatRupiah(item.value)}
                                  </span>
                                  <button 
                                    onClick={() => deleteItem(item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* TAB 2: DAFTAR HARTA / ASSETS */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                  <button 
                    onClick={() => setCollapsibles(p => ({ ...p, harta: !p.harta }))}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 text-xs font-bold hover:bg-slate-100/80 transition group text-slate-800 uppercase tracking-wider font-display border-b border-slate-150"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-amber-600"></div>
                      <span>Golongan Harta / Aset yang Terdeteksi</span>
                      <span className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px] text-slate-600 font-mono font-bold">
                        {parsedItems.filter(i => i.category === "harta").length} item
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-400">
                      <span className="font-mono text-xs font-semibold text-amber-700">
                        Harta {selectedYear}: {formatRupiah(totalHartaBaru)}
                      </span>
                      {collapsibles.harta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {collapsibles.harta && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-white"
                      >
                        <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                          {parsedItems.filter(i => i.category === "harta").length === 0 ? (
                            <p className="text-xs text-slate-400 p-4 text-center">Tidak ada item harta terdeteksi.</p>
                          ) : (
                            parsedItems.filter(i => i.category === "harta").map((item) => {
                              const isNewAsset = item.year === selectedYear;
                              return (
                                <div 
                                  key={item.id} 
                                  className={`flex items-center justify-between p-3.5 rounded-lg border text-xs transition duration-150 ${
                                    item.included 
                                      ? "bg-slate-50/50 border-slate-200 hover:border-slate-350" 
                                      : "bg-slate-50/20 border-slate-100 text-slate-400"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                                    <input 
                                      type="checkbox" 
                                      checked={item.included}
                                      onChange={() => toggleItemInclusion(item.id)}
                                      className="rounded border-slate-300 bg-white text-emerald-700 focus:ring-0 cursor-pointer w-4 h-4"
                                    />
                                    <div className="truncate">
                                      <div className="flex items-center space-x-2">
                                        <p className={`font-semibold ${item.included ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                          {item.description}
                                        </p>
                                        {item.included && isNewAsset && (
                                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold">
                                            Baru di {selectedYear}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-400 tracking-wide mt-0.5 font-mono">
                                        Tahun Perolehan: {item.year || "Tidak Diketahui"} | Asal: {item.sourceSheet}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <span className={`font-mono font-semibold ${item.included ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                                      {formatRupiah(item.value)}
                                    </span>
                                    <button 
                                      onClick={() => deleteItem(item.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* TAB 3: HUTANG / LIABILITIES */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                  <button 
                    onClick={() => setCollapsibles(p => ({ ...p, hutang: !p.hutang }))}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 text-xs font-bold hover:bg-slate-100/80 transition group text-slate-800 uppercase tracking-wider font-display border-b border-slate-150"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                      <span>Golongan Kewajiban / Hutang</span>
                      <span className="bg-slate-200 px-2 py-0.5 rounded-full text-[10px] text-slate-600 font-mono font-bold">
                        {parsedItems.filter(i => i.category === "hutang").length} item
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-400">
                      <span className="font-mono text-xs font-semibold text-rose-700">
                        Utang Baru ({selectedYear}): {formatRupiah(totalUtangBaru)}
                      </span>
                      {collapsibles.hutang ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {collapsibles.hutang && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-white"
                      >
                        <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                          {parsedItems.filter(i => i.category === "hutang").length === 0 ? (
                            <p className="text-xs text-slate-400 p-4 text-center">Tidak ada item kewajiban/utang terdeteksi.</p>
                          ) : (
                            parsedItems.filter(i => i.category === "hutang").map((item) => (
                              <div 
                                key={item.id} 
                                className={`flex items-center justify-between p-3.5 rounded-lg border text-xs transition duration-150 ${
                                  item.included 
                                    ? "bg-slate-50/50 border-slate-200 hover:border-slate-350" 
                                    : "bg-slate-50/20 border-slate-100 text-slate-400"
                                }`}
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                                  <input 
                                    type="checkbox" 
                                    checked={item.included}
                                    onChange={() => toggleItemInclusion(item.id)}
                                    className="rounded border-slate-300 bg-white text-rose-700 focus:ring-0 cursor-pointer w-4 h-4"
                                  />
                                  <div className="truncate">
                                    <p className={`font-semibold ${item.included ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                      {item.description}
                                    </p>
                                    <p className="text-[10px] text-slate-400 tracking-wide mt-0.5 font-mono">
                                      Tahun Pinjaman: {item.year || "Tidak Diketahui"} | Asal: {item.sourceSheet}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span className={`font-mono font-semibold ${item.included ? 'text-rose-700' : 'text-slate-400 line-through'}`}>
                                    {formatRupiah(item.value)}
                                  </span>
                                  <button 
                                    onClick={() => deleteItem(item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* INPUT MANUAL UTILITY */}
              <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center space-x-1.5 font-display">
                  <Plus className="w-4 h-4 text-[#1e3a8a]" />
                  <span>Tambah Item Manual (Koreksi Belanja)</span>
                </h4>
                <form onSubmit={handleAddManualItem} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-tight">Nama/Deskripsi Item</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Logam Mulia Baru, Bonus Freelance"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#1e3a8a] outline-none transition"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-tight">Nilai Rupiah Nominal</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: 15.000.000"
                      value={newValue}
                      onChange={(e) => {
                        const numeric = e.target.value.replace(/[^0-9]/g, "");
                        setNewValue(numeric ? parseInt(numeric).toLocaleString("id-ID") : "");
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono placeholder-slate-400 focus:border-[#1e3a8a] outline-none transition"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-tight">Golongan</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:border-[#1e3a8a] outline-none transition"
                    >
                      <option value="penghasilan">Pemasukan</option>
                      <option value="harta">Harta Aset</option>
                      <option value="hutang">Hutang/Kredit</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-tight">Tahun</label>
                    <input 
                      type="number" 
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-1.5 py-1.5 text-xs text-slate-800 text-center font-mono focus:border-[#1e3a8a] outline-none transition"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button 
                      type="submit" 
                      className="w-full bg-[#1e3a8a] hover:bg-[#152e72] text-white font-bold text-xs py-2 rounded-lg transition shadow-xs"
                    >
                      Tambah
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* PREVIEW SHEET ORIGINAL (SHEETJS SPREADSHEET DISCOVERY) */}
            {sheetsList.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2.5">
                    <Database className="w-5 h-5 text-[#1e3a8a]" />
                    <h3 className="font-semibold text-base font-serif text-slate-900">Pratinjau Sel Workbook Excel</h3>
                  </div>
                  <p className="text-xs text-slate-400">Menampilkan isi sheet orisinal langsung dari browser</p>
                </div>

                {/* PILIHAN TAB SHEET */}
                <div className="flex flex-wrap gap-1.5">
                  {sheetsList.map((st) => (
                    <button
                      key={st.name}
                      onClick={() => setActiveSheetPreview(st.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                        activeSheetPreview === st.name
                          ? "bg-[#1e3a8a]/10 text-[#1e3a8a] border border-[#1e3a8a]/20"
                          : "bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {st.name} ({st.rowCount} baris)
                    </button>
                  ))}
                </div>

                {/* DAFTAR DATA SPREADSHEET BERBENTUK GRID TABEL */}
                <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600 tracking-wider font-mono font-bold">
                        <th className="p-2 text-center w-10">Brs</th>
                        {sheetsList.find(s => s.name === activeSheetPreview)?.previewRows[0]?.map((_, idx) => (
                          <th key={idx} className="p-2 min-w-[120px]">Kolom {String.fromCharCode(65 + idx)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                      {sheetsList.find(s => s.name === activeSheetPreview)?.previewRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          <td className="p-2 bg-slate-50 text-center text-[10px] text-slate-400 border-r border-slate-200 font-bold">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 truncate text-slate-700 border-r border-slate-200/50 max-w-[200px]" title={String(cell)}>
                              {String(cell || "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MANUAL ADJUSTER & COMMENTARY BOX */}
            <div className="bg-[#f0f4f8]/50 border-l-4 border-[#1e3a8a] p-5 rounded-r-xl space-y-2">
              <h4 className="text-sm font-bold font-serif text-[#1e3a8a] flex items-center space-x-1.5">
                <Info className="w-4 h-4" />
                <span>Petunjuk Penyesuaian Nama Sheet Excel</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-light">
                Logika JavaScript dalam program ini memindai lembaran secara otomatis. Jika nama sheet Excel Anda menggunakan struktur bahasa Inggris atau nama khusus, Anda dapat mengunggah file Anda langsung; heuristik cadangan kami akan melacak angka bernilai jutaan rupiah berikutnya untuk dipasangkan ke dalam dashboard.
              </p>
            </div>

          </div>

          {/* SISI KANAN (4 KOLOM): SIMULATOR PARAMETER ARUS KAS */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* CARD FORM PARAMETRIKS REKONSILIASI */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-[#1e3a8a]" />
                <h3 className="font-semibold text-xs text-slate-900 font-display uppercase tracking-wider">Adjustment Parameter Kas</h3>
              </div>

              {/* INPUT SALDO KAS AWAL */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest font-display">
                  Saldo Awal Kas &amp; Tabungan (1 Jan):
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-xs font-bold">Rp</span>
                  </div>
                  <input
                    type="text"
                    value={manualInitialCash.toLocaleString("id-ID")}
                    onChange={(e) => {
                      const numeric = e.target.value.replace(/[^0-9]/g, "");
                      setManualInitialCash(numeric ? parseInt(numeric) : 0);
                    }}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-800 font-mono font-semibold focus:border-[#1e3a8a] outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-right font-mono">
                  DJP melacak saldo buku rekening awal tahun
                </p>
              </div>

              {/* SLIDER BIAYA HIDUP BULANAN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-tight text-slate-700">
                  <span>Biaya Hidup (Konsumsi/Bulan):</span>
                  <span className="text-[#1e3a8a] font-mono font-bold text-sm">{formatRupiah(monthlyLivingCost)}</span>
                </div>
                <input
                  type="range"
                  min={1000000}
                  max={50000000}
                  step={500000}
                  value={monthlyLivingCost}
                  onChange={(e) => setMonthlyLivingCost(parseInt(e.target.value))}
                  className="w-full accent-[#1e3a8a] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold font-mono tracking-wider">
                  <span>1 JUTA (MINIMAL)</span>
                  <span>25 JUTA (MEDIUM)</span>
                  <span>50 JUTA (LUXURY)</span>
                </div>

                <div className="bg-[#f8fafc] p-3 rounded-lg border border-slate-100 text-[10px] text-slate-500 space-y-1">
                  <div className="flex justify-between text-slate-700 font-bold font-mono tracking-tight uppercase text-[9px]">
                    <span>Konsumsi Hidup Setahun:</span>
                    <span className="text-[#1e3a8a]">{formatRupiah(annualLivingCost)}</span>
                  </div>
                  <p className="leading-relaxed font-light text-[10px] text-slate-500 mt-1">
                    Seringkali wajib pajak melewatkan pelaporan konsumsi hidup sehingga tabungan dituduh bermutasi terlalu cepat tanpa dasar logis.
                  </p>
                </div>
              </div>

              {/* INPUT PENERIMAAN NON-OBJEK (HIBAH/WARISAN) */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest font-display">
                  Penerimaan Non-Objek Pajak (Warisan/Hibah/Klaim):
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-xs font-bold">Rp</span>
                  </div>
                  <input
                    type="text"
                    value={additionalInflow.toLocaleString("id-ID")}
                    onChange={(e) => {
                      const numeric = e.target.value.replace(/[^0-9]/g, "");
                      setAdditionalInflow(numeric ? parseInt(numeric) : 0);
                    }}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-800 font-mono focus:border-[#1e3a8a] outline-none"
                  />
                </div>
              </div>

              {/* INPUT OUTFLOW LAINNYA */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest font-display">
                  Angsuran Utang / Biaya Non-Harta Lain:
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-xs font-bold">Rp</span>
                  </div>
                  <input
                    type="text"
                    value={additionalOutflow.toLocaleString("id-ID")}
                    onChange={(e) => {
                      const numeric = e.target.value.replace(/[^0-9]/g, "");
                      setAdditionalOutflow(numeric ? parseInt(numeric) : 0);
                    }}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-800 font-mono focus:border-[#1e3a8a] outline-none"
                  />
                </div>
              </div>

            </div>

            {/* VISUAL COMPOSITE (BAR CHART DUA DIMENSI SVG) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest font-display">Proporsi Arus Kas Keluar vs Masuk</h4>
              
              {/* SVG SIMPLIFIED COMPACT COMPARISON BAR */}
              <div className="space-y-3 pt-1">
                {/* Visual Segmented Progress Bar */}
                {(() => {
                  const totalIn = totalPenghasilanNeto + additionalInflow + currentInitialCash;
                  const totalOut = totalHartaBaru + annualLivingCost + additionalOutflow;
                  const inPct = Math.min(100, Math.max(5, (totalIn / (totalIn + totalOut || 1)) * 100));
                  const outPct = 100 - inPct;

                  return (
                    <div className="space-y-4">
                      {/* Segment Bar */}
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-[#1e3a8a] h-full transition-all duration-550" 
                          style={{ width: `${inPct}%` }}
                          title={`Kas Masuk: ${Math.round(inPct)}%`}
                        ></div>
                        <div 
                          className="bg-rose-500 h-full transition-all duration-550" 
                          style={{ width: `${outPct}%` }}
                          title={`Belanja/Investasi: ${Math.round(outPct)}%`}
                        ></div>
                      </div>

                      {/* Legends */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                        <div className="flex items-start space-x-2 text-[#1e3a8a]">
                          <span className="w-2.5 h-2.5 bg-[#1e3a8a] rounded-xs mt-0.5"></span>
                          <div>
                            <p className="font-semibold text-slate-500 uppercase tracking-tight text-[9px]">Total Sumber Kas</p>
                            <p className="font-mono font-bold text-slate-800 mt-0.5">{formatRupiah(totalIn)}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 text-rose-600">
                          <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs mt-0.5"></span>
                          <div>
                            <p className="font-semibold text-slate-500 uppercase tracking-tight text-[9px]">Total Kebutuhan Kas</p>
                            <p className="font-mono font-bold text-slate-800 mt-0.5">{formatRupiah(totalOut)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="text-[10px] text-slate-400 italic text-center border-t border-slate-100 pt-3 font-light leading-relaxed">
                  Sisa kas teoretis seharusnya berada dalam tabungan tahun berjalan SPT Anda.
                </div>
              </div>
            </div>

            {/* TAX AUDIT ALERT CARD */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-[10px] text-[#1e3a8a] tracking-widest uppercase font-display border-b border-slate-100 pb-2">Perhitungan Arus Kas DJP</h3>
              <div className="divide-y divide-slate-100 text-xs font-mono">
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-sans">+ Saldo Awal</span>
                  <span className="text-slate-800 font-semibold">{formatRupiah(currentInitialCash)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-sans">+ Penghasilan Neto</span>
                  <span className="text-slate-800 font-semibold">{formatRupiah(totalPenghasilanNeto)}</span>
                </div>
                {additionalInflow > 0 && (
                  <div className="flex justify-between py-2.5 text-blue-700 font-semibold">
                    <span className="font-sans">+ Non-Objek</span>
                    <span>{formatRupiah(additionalInflow)}</span>
                  </div>
                )}
                {totalUtangBaru > 0 && (
                  <div className="flex justify-between py-2.5 text-emerald-700 font-semibold">
                    <span className="font-sans">+ Kredit Utang Baru</span>
                    <span>{formatRupiah(totalUtangBaru)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 text-rose-600 font-semibold">
                  <span className="text-slate-500 font-sans">- Belanja Hidup Tahunan</span>
                  <span>({formatRupiah(annualLivingCost)})</span>
                </div>
                <div className="flex justify-between py-2.5 text-rose-600 font-semibold">
                  <span className="text-slate-500 font-sans">- Pembelian Harta Baru</span>
                  <span>({formatRupiah(totalHartaBaru)})</span>
                </div>
                {additionalOutflow > 0 && (
                  <div className="flex justify-between py-2.5 text-rose-650 font-semibold">
                    <span className="text-slate-500 font-sans">- Outflow Lain</span>
                    <span>({formatRupiah(additionalOutflow)})</span>
                  </div>
                )}
                <div className="flex justify-between py-3 text-sm font-bold border-t border-slate-200 bg-slate-50/50 px-3 rounded-lg mt-1.5">
                  <span className="text-slate-800 font-sans">Estimasi Sisa Kas</span>
                  <span className={estimasiSisaKas >= 0 ? "text-[#1e3a8a]" : "text-rose-600"}>
                    {formatRupiah(estimasiSisaKas)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#e2e8f0] py-12 text-center text-[11px] text-slate-400 no-print mt-24">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium">© {new Date().getFullYear()} SPT-Flow. Semua proses pengolahan file Excel 100% dilakukan secara lokal di peramban Anda.</p>
          <p className="font-light text-slate-400 text-[10px]">Alat ini diproduksi untuk tujuan kepatuhan perpajakan mandiri secara sehat, logis, dan transparan.</p>
        </div>
      </footer>
    </div>
  );
}

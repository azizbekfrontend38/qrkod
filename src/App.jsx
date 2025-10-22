import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Tesseract from "tesseract.js";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Toaster, toast } from "react-hot-toast";

export default function App() {
  const [files, setFiles] = useState([]); // har bir fayl: {file, numbers: []}
  const [activeIndex, setActiveIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // 📂 Faylni tanlash va o‘qish
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const ext = file.name.split(".").pop().toLowerCase();
    let numbers = [];

    try {
      if (["png", "jpg", "jpeg"].includes(ext)) {
        // 📸 OCR orqali rasmni o‘qish
        const { data } = await Tesseract.recognize(file, "eng", {
          tessedit_char_whitelist: "0123456789",
          tessedit_pageseg_mode: 6,
        });
        numbers = extractNumbers(data.text);
      } else if (["xlsx", "xls", "csv"].includes(ext)) {
        // 📊 Excel yoki CSV faylni o‘qish
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }).flat();
        numbers = extractNumbers(json.join(" "));
      } else {
        // 📄 Oddiy matn fayl
        const text = await file.text();
        numbers = extractNumbers(text);
      }

      const newFile = { file, numbers };
      setFiles((prev) => [...prev, newFile]);
      setActiveIndex(files.length); // yangi yuklangan faylni faollashtirish
      toast.success(`${numbers.length} ta raqam topildi!`);
    } catch (err) {
      console.error(err);
      toast.error("❌ Faylni o‘qishda xato yuz berdi!");
    }

    setLoading(false);
  };

  // 🔢 Matndan raqamlarni ajratish
  const extractNumbers = (text) => {
    const found = text.match(/\b\d{3,}\b/g) || [];
    return [...new Set(found)].sort((a, b) => a - b);
  };

  // ❌ Faylni o‘chirish
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (index === activeIndex) setActiveIndex(null);
    toast("🗑️ Fayl o‘chirildi");
  };

  // ⬇️ QR kodni yuklab olish
  const downloadQR = (num) => {
    const canvas = document.getElementById(`qr-${num}`);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${num}.png`;
    a.click();
  };

  // 📦 Barcha QR kodlarni ZIP qilib yuklab olish
  const downloadAllQRs = async () => {
    const currentFile = files[activeIndex];
    if (!currentFile || currentFile.numbers.length === 0)
      return toast.error("QR kodlar mavjud emas!");

    const zip = new JSZip();
    for (const num of currentFile.numbers) {
      const canvas = document.getElementById(`qr-${num}`);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      zip.file(`QR_${num}.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${currentFile.file.name}_QR_Codes.zip`);
    toast.success("✅ Barcha QR kodlar ZIP faylda yuklab olindi!");
  };

  // 📋 Raqamni nusxalash
  const copyNumber = (num) => {
    navigator.clipboard.writeText(num);
    toast("📋 Raqam nusxalandi!", { icon: "✅" });
  };

  const activeFile = files[activeIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center py-10 px-4 transition">
      <Toaster position="top-center" />

      <h1 className="text-4xl font-extrabold mb-3 text-center text-blue-700">
        📷 QR Kod Generator
      </h1>

      <p className="text-gray-600 mb-6 text-center max-w-lg">
        Rasm, Excel, CSV yoki matn fayl yuklang — ichidagi raqamlar uchun QR
        kodlar avtomatik yaratiladi.
      </p>

      {/* Fayl yuklash */}
      <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition mb-6">
        📂 Fayl yoki skrinshot qo‘shish
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.txt,.xlsx,.xls,.csv"
          onChange={handleFile}
          className="hidden"
        />
      </label>

      {/* Fayllar ro‘yxati */}
      {files.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow mb-6 w-full max-w-md">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            📁 Yuklangan fayllar:
          </h2>
          <ul className="space-y-2">
            {files.map(({ file, numbers }, i) => (
              <li
                key={i}
                className={`flex justify-between items-center p-2 rounded cursor-pointer transition ${
                  i === activeIndex ? "bg-blue-100" : "bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => setActiveIndex(i)}
              >
                <span className="text-sm text-gray-700 truncate">
                  {file.name.length > 25 ? file.name.slice(0, 25) + "..." : file.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {numbers.length} ta QR
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ❌
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Yuklanmoqda */}
      {loading && (
        <p className="text-blue-500 mb-4 font-medium animate-pulse">
          ⏳ Fayl tahlil qilinmoqda...
        </p>
      )}

      {/* Natijalar */}
      {activeFile ? (
        activeFile.numbers.length > 0 ? (
          <>
            <button
              onClick={downloadAllQRs}
              className="mb-6 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow"
            >
              📦 {activeFile.file.name} uchun barcha QR-larni ZIP qilib yuklab olish
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
              {activeFile.numbers.map((num, i) => (
                <div
                  key={i}
                  className="relative bg-white p-4 rounded-xl shadow flex flex-col items-center transform hover:scale-105 transition"
                >
                  <span className="absolute top-2 left-3 text-2xl font-bold text-gray-800">
                    {i + 1}
                  </span>
                  <QRCodeCanvas id={`qr-${num}`} value={num} size={160} />
                  <p className="mt-3 text-lg font-semibold text-black">{num}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => copyNumber(num)}
                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      📋 Nusxa olish
                    </button>
                    <button
                      onClick={() => downloadQR(num)}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                    >
                      ⬇️ Yuklab olish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-center">
            {activeFile.file.name} faylida raqam topilmadi.
          </p>
        )
      ) : (
        !loading && (
          <p className="text-gray-600 text-center">
            Faylni tanlang — QR kodlar shu yerda chiqadi.
          </p>
        )
      )}
    </div>
  );
}

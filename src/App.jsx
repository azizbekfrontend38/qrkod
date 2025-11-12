import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Tesseract from "tesseract.js";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Toaster, toast } from "react-hot-toast";
import { Instagram, Github, Send, Globe } from "lucide-react"; // 🌍 Portfolio logosi uchun Globe

export default function App() {
  const [files, setFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualTexts, setManualTexts] = useState([]);
  const [inputValue, setInputValue] = useState("");

  // 🔁 LocalStorage orqali saqlash
  useEffect(() => {
    const savedFiles = localStorage.getItem("qr_files");
    const savedManual = localStorage.getItem("qr_manual_texts");
    const savedIndex = localStorage.getItem("qr_active_index");

    if (savedFiles) setFiles(JSON.parse(savedFiles));
    if (savedManual) setManualTexts(JSON.parse(savedManual));
    if (savedIndex) setActiveIndex(JSON.parse(savedIndex));
  }, []);

  useEffect(() => {
    localStorage.setItem("qr_files", JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem("qr_manual_texts", JSON.stringify(manualTexts));
  }, [manualTexts]);

  useEffect(() => {
    localStorage.setItem("qr_active_index", JSON.stringify(activeIndex));
  }, [activeIndex]);

  // 📂 Faylni o‘qish
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const ext = file.name.split(".").pop().toLowerCase();
    let items = [];

    try {
      if (["png", "jpg", "jpeg"].includes(ext)) {
        const { data } = await Tesseract.recognize(file, "eng");
        items = extractTexts(data.text);
      } else if (["xlsx", "xls", "csv"].includes(ext)) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }).flat();
        items = extractTexts(json.join("\n"));
      } else {
        const text = await file.text();
        items = extractTexts(text);
      }

      const newFile = { file: { name: file.name }, items };
      const updated = [...files, newFile];
      setFiles(updated);
      setActiveIndex(updated.length - 1);
      toast.success(`${items.length} ta QR kod tayyor!`);
    } catch (err) {
      console.error(err);
      toast.error("❌ Faylni o‘qishda xato yuz berdi!");
    }

    setLoading(false);
  };

  // 🔤 Matndan satrlarni ajratish
  const extractTexts = (text) => {
    const lines = text
      .split(/[\n\r]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return [...new Set(lines)];
  };

  // ❌ Faylni o‘chirish
  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (index === activeIndex) setActiveIndex(null);
    toast("🗑️ Fayl o‘chirildi");
  };

  // ⬇️ QR yuklab olish
  const downloadQR = (text, prefix = "") => {
    const canvas = document.getElementById(`${prefix}qr-${btoa(text)}`);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${text.slice(0, 15)}.png`;
    a.click();
  };

  // 📦 ZIP qilib yuklab olish
  const downloadAllQRs = async () => {
    const currentFile = files[activeIndex];
    if (!currentFile || currentFile.items.length === 0)
      return toast.error("QR kodlar mavjud emas!");

    const zip = new JSZip();
    for (const text of currentFile.items) {
      const canvas = document.getElementById(`qr-${btoa(text)}`);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      zip.file(`QR_${text.slice(0, 15)}.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${currentFile.file.name}_QR_Codes.zip`);
    toast.success("✅ ZIP fayl tayyor!");
  };

  // 📋 Nusxalash
  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast("📋 Matn nusxalandi!", { icon: "✅" });
  };

  // ➕ Qo‘lda matn kiritish
  const addManualText = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return toast.error("Bo‘sh matn kiritib bo‘lmaydi!");
    if (manualTexts.includes(trimmed))
      return toast.error("Bu matn allaqachon mavjud!");
    setManualTexts((prev) => [...prev, trimmed]);
    setInputValue("");
    toast.success("✅ Matn qo‘shildi!");
  };

  // ❌ Qo‘lda QR o‘chirish
  const removeManualQR = (text) => {
    setManualTexts((prev) => prev.filter((t) => t !== text));
    toast("🗑️ QR kod o‘chirildi");
  };

  const activeFile = files[activeIndex];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-blue-100">
      <Toaster position="top-center" />

      {/* 🧭 Navbar */}
      <nav className="w-full bg-blue-700 text-white shadow-md py-4 mb-6">
        <div className="max-w-6xl mx-auto flex justify-center items-center">
          <h1 className="text-2xl font-bold tracking-wide">📷 QR Kod Generator</h1>
        </div>
      </nav>

      {/* 📄 Asosiy qism */}
      <main className="flex-1 flex flex-col items-center px-4 pb-10">
        <p className="text-gray-700 mb-6 text-center max-w-lg">
          Fayl yuklang yoki matn/link/raqam kiriting — har biri uchun QR kod
          hosil bo‘ladi.
        </p>

        {/* 📂 Fayl yuklash */}
        <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition mb-6">
          📂 Fayl yoki rasm yuklash
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.txt,.xlsx,.xls,.csv"
            onChange={handleFile}
            className="hidden"
          />
        </label>

        {/* ✏️ Qo‘lda kiritish */}
        <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow mb-6 w-full max-w-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            ✏️ Qo‘lda matn yoki link kiritish
          </h2>
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Masalan: https://t.me/azizbek"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={addManualText}
              className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-lg"
            >
              ➕
            </button>
          </div>
        </div>

        {/* 📁 Fayllar */}
        {files.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow mb-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">
              📁 Yuklangan fayllar:
            </h2>
            <ul className="space-y-2">
              {files.map(({ file, items }, i) => (
                <li
                  key={i}
                  className={`flex justify-between items-center p-2 rounded cursor-pointer transition ${
                    i === activeIndex
                      ? "bg-blue-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveIndex(i)}
                >
                  <span className="text-sm text-gray-700 truncate">
                    {file.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {items.length} ta
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

        {loading && (
          <p className="text-blue-500 mb-4 font-medium animate-pulse">
            ⏳ Tahlil qilinmoqda...
          </p>
        )}

        {/* 📦 Natijalar */}
        {activeFile ? (
          activeFile.items.length > 0 ? (
            <>
              <button
                onClick={downloadAllQRs}
                className="mb-6 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow"
              >
                📦 Barcha QR-larni ZIP qilib yuklash
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
                {activeFile.items.map((text, i) => (
                  <div
                    key={i}
                    className="relative bg-white p-4 rounded-xl shadow flex flex-col items-center transform hover:scale-105 transition"
                  >
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-lg font-extrabold rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                      {i + 1}
                    </div>

                    <QRCodeCanvas id={`qr-${btoa(text)}`} value={text} size={160} />
                    <p className="mt-3 text-sm text-center break-all font-bold text-black">
                      {text}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => copyText(text)}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        📋 Nusxa olish
                      </button>
                      <button
                        onClick={() => downloadQR(text)}
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
              {activeFile.file.name} faylida ma’lumot topilmadi.
            </p>
          )
        ) : (
          manualTexts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl mt-6">
              {manualTexts.map((text, i) => (
                <div
                  key={i}
                  className="relative bg-white p-4 rounded-xl shadow flex flex-col items-center transform hover:scale-105 transition"
                >
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-lg font-extrabold rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                    {i + 1}
                  </div>

                  <button
                    onClick={() => removeManualQR(text)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg"
                  >
                    ❌
                  </button>

                  <QRCodeCanvas id={`manualqr-${btoa(text)}`} value={text} size={160} />
                  <p className="mt-3 text-sm text-center break-all font-bold text-black">
                    {text}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => copyText(text)}
                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      📋 Nusxa olish
                    </button>
                    <button
                      onClick={() => downloadQR(text, "manual")}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                    >
                      ⬇️ Yuklab olish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* 🔻 Footer */}
      <footer className="bg-blue-700 text-white py-5 mt-auto">
        <div className="flex justify-center items-center gap-8">
          <a
            href="https://t.me/rahimberdiyevv"
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-200"
          >
            <Send size={24} />
          </a>
          <a
            href="https://www.instagram.com/rahimberdiyev_1224/?next=%2F"
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-200"
          >
            <Instagram size={24} />
          </a>
          <a
            href="https://github.com/azizbekfrontend38"
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-200"
          >
            <Github size={24} />
          </a>
          <a
            href="https://portfolio-topaz-theta-83.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-200"
          >
            <Globe size={24} />
          </a>
        </div>
        <p className="text-center text-sm mt-2 text-blue-100">
          © {new Date().getFullYear()} QR Generator | Developed by Azizbek Rahimberdiyev
        </p>
      </footer>
    </div>
  );
}

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import api from "../api";

const CAT_COLORS = {
  produce: "bg-green-100 text-green-700",
  dairy: "bg-blue-100 text-blue-700",
  meat: "bg-red-100 text-red-700",
  seafood: "bg-cyan-100 text-cyan-700",
  grains: "bg-amber-100 text-amber-700",
  condiments: "bg-purple-100 text-purple-700",
  beverages: "bg-teal-100 text-teal-700",
  leftovers: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

export default function ScanPage({ onComplete }) {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const processFile = async (file) => {
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post("/api/scan", form);
      setResult(data);
      toast.success(`Found ${data.added} new + ${data.merged} updated items`);
      onComplete();
    } catch {
      // error handled by interceptor
    } finally {
      setScanning(false);
    }
  };

  const onDrop = useCallback((files) => {
    if (files[0]) processFile(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: false,
    disabled: scanning,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Scan Fridge</h1>
        <p className="text-sm text-slate-500 mt-1">AI detects ingredients and reads expiry dates from your photo</p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragActive ? "border-green-400 bg-green-50" : "border-slate-200 hover:border-green-300 hover:bg-slate-50"
        } ${scanning ? "pointer-events-none opacity-70" : ""}`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="fridge" className="max-h-64 max-w-full mx-auto rounded-xl object-contain mb-4 shadow-md" />
        ) : (
          <div className="text-5xl mb-3">📷</div>
        )}
        {scanning ? (
          <div>
            <div className="inline-block w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-green-600 font-semibold">Analyzing with AI...</p>
            <p className="text-slate-400 text-sm mt-1">Detecting ingredients and reading expiry dates</p>
          </div>
        ) : (
          <>
            <p className="font-medium text-slate-600">
              {isDragActive ? "Drop it here!" : preview ? "Drop another photo to re-scan" : "Drag & drop a fridge photo, or click to browse"}
            </p>
            <p className="text-slate-400 text-sm mt-1">JPG, PNG, WebP supported</p>
          </>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 fade-in">
          {/* Summary */}
          <div className="flex gap-3">
            <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{result.added}</div>
              <div className="text-sm text-slate-600">New items added</div>
            </div>
            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{result.merged}</div>
              <div className="text-sm text-slate-600">Existing updated</div>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-600">{result.detected.length}</div>
              <div className="text-sm text-slate-600">Total detected</div>
            </div>
          </div>

          {result.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800 flex gap-2">
              <span>💡</span> {result.notes}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Detected Items</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {result.detected.map((item, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-slate-800 text-sm leading-tight">{item.name}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${CAT_COLORS[item.category] || CAT_COLORS.other}`}>
                      {item.category}
                    </span>
                  </div>
                  {item.quantity && (
                    <p className="text-xs text-slate-500">{item.quantity} {item.unit}</p>
                  )}
                  {item.expiry_date && (
                    <p className="text-xs text-amber-600 mt-1">📅 {item.expiry_date}</p>
                  )}
                  <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(item.confidence * 100)}% confidence</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {!result && !scanning && (
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">Tips for best results</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              "📸 Good lighting — open the fridge door fully",
              "🔍 Capture labels clearly for expiry date reading",
              "📦 Include packaged goods (AI reads printed text)",
              "🔄 Scan multiple angles for a full inventory",
              "✏️ You can manually edit any detected item after scanning",
            ].map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

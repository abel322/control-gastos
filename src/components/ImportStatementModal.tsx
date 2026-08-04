"use client";

import React, { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2, FileCheck } from "lucide-react";

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  importedCount: number;
  existingCount: number;
  ignoredCount: number;
  totalParsed: number;
  message: string;
}

export default function ImportStatementModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportStatementModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleReset() {
    setFile(null);
    setError(null);
    setResult(null);
    setIsLoading(false);
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }

  function validateAndSetFile(f: File) {
    setError(null);
    setResult(null);
    const name = f.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".csv") && !name.endsWith(".txt")) {
      setError("Solo se admiten archivos en formato PDF o CSV descargados de Mercantil.");
      return;
    }
    setFile(f);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Por favor selecciona un archivo PDF o CSV.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/expenses/import-statement", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || "Error al procesar el archivo.");
      }

      setResult({
        importedCount: data.importedCount,
        existingCount: data.existingCount,
        ignoredCount: data.ignoredCount || 0,
        totalParsed: data.totalParsed || 0,
        message: data.message,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all border border-gray-100 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Importar Estado de Cuenta
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Banco Mercantil (PDF / CSV)
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        {result ? (
          /* Success Screen */
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-emerald-900">
                  ¡Importación completada!
                </h3>
                <p className="text-xs text-emerald-700 mt-1 font-medium">
                  {result.message}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-left">
                <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Nuevos Gastos
                  </span>
                  <span className="text-xl font-black text-emerald-600">
                    +{result.importedCount}
                  </span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Ya Existían
                  </span>
                  <span className="text-xl font-black text-amber-600">
                    {result.existingCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleReset}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Importar otro archivo
              </button>
              <button
                onClick={handleClose}
                className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition-all"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          /* Upload Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-purple-600 bg-purple-50/50"
                  : file
                  ? "border-purple-300 bg-purple-50/20"
                  : "border-gray-200 bg-gray-50/50 hover:bg-purple-50/10 hover:border-purple-300"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-2xl bg-purple-100 p-3 text-purple-700">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-600 underline hover:text-purple-800 mt-1">
                    Cambiar archivo
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-2xl bg-gray-100 p-3 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      Haz clic para seleccionar o arrastra el archivo aquí
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Soporta estados de cuenta en formato PDF o CSV de Mercantil
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!file || isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Procesar e Importar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

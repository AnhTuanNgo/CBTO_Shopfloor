'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ProductionProgress } from '@/lib/types';
import { formatDateVN } from '@/lib/date-utils';
import {
  TrendingUp,
  Plus,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

export function ProductionProgressModule() {
  const {
    currentUser,
    selectedLineId,
    selectedProductionDate,
    lines,
    skus,
    productionProgress,
    upsertProgress,
    importProgressBatch,
  } = useAppStore();

  const activeLine = lines.find((l) => l.id === selectedLineId);

  // Manual entry modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSkuId, setManualSkuId] = useState(skus[0]?.id || '');
  const [plannedQtyInput, setPlannedQtyInput] = useState<number>(30);
  const [actualQtyInput, setActualQtyInput] = useState<number>(24);
  const [unitInput, setUnitInput] = useState('Tấn');

  // CSV Import modal
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<{ count: number; errors: string[] } | null>(null);

  const filteredProgress = useMemo(() => {
    return productionProgress.filter((p) => p.productionDate === selectedProductionDate);
  }, [productionProgress, selectedProductionDate]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertProgress({
      lineId: selectedLineId,
      skuId: manualSkuId,
      productionDate: selectedProductionDate,
      plannedQty: Number(plannedQtyInput),
      actualQty: Number(actualQtyInput),
      unit: unitInput,
    });
    setIsManualModalOpen(false);
  };

  const sampleCsvContent = `production_date,line_code,sku_code,planned_qty,actual_qty,unit
${selectedProductionDate},L01,TO-CORE-01,36.0,32.0,Tấn
${selectedProductionDate},L02,WASABI-03,20.0,18.5,Tấn
${selectedProductionDate},L03,SRIRACHA-06,24.0,24.0,Tấn
${selectedProductionDate},L04,TO-CORE-01,30.0,28.0,Tấn`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CBTO_SanLuong_Mau_${selectedProductionDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleProcessCsv = () => {
    if (!csvText.trim()) return;

    const linesRaw = csvText.trim().split('\n');
    const parsedRows: Array<{
      productionDate: string;
      lineCode: string;
      skuCode: string;
      plannedQty: number;
      actualQty: number;
      unit: string;
    }> = [];

    // Header row skip
    const startIndex = linesRaw[0].includes('production_date') ? 1 : 0;
    for (let i = startIndex; i < linesRaw.length; i++) {
      const line = linesRaw[i].trim();
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 5) {
        parsedRows.push({
          productionDate: parts[0] || selectedProductionDate,
          lineCode: parts[1],
          skuCode: parts[2],
          plannedQty: parseFloat(parts[3]) || 0,
          actualQty: parseFloat(parts[4]) || 0,
          unit: parts[5] || 'Tấn',
        });
      }
    }

    const res = importProgressBatch(parsedRows);
    setImportResult({ count: res.count, errors: res.errors });
    if (res.errors.length === 0) {
      setTimeout(() => {
        setIsCsvModalOpen(false);
        setImportResult(null);
        setCsvText('');
      }, 1500);
    }
  };

  // Calculations for summary
  const totalPlannedTons = filteredProgress.reduce((acc, p) => acc + (p.unit === 'Tấn' ? p.plannedQty : 0), 0);
  const totalActualTons = filteredProgress.reduce((acc, p) => acc + (p.unit === 'Tấn' ? p.actualQty : 0), 0);
  const totalVarianceTons = +(totalActualTons - totalPlannedTons).toFixed(2);
  const overallRate = totalPlannedTons > 0 ? +((totalActualTons / totalPlannedTons) * 100).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Tiến độ Sản xuất (Kế hoạch vs Thực hiện)</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Theo dõi sản lượng (tấn) theo ngày & line. Cập nhật lũy kế không cộng dồn trùng (AC-12).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvText(sampleCsvContent);
              setImportResult(null);
              setIsCsvModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={() => {
              setManualSkuId(skus[0]?.id || '');
              setIsManualModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-950/40 hover:bg-orange-500 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nhập Sản lượng</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400 font-medium">Kế hoạch toàn nhà máy</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{totalPlannedTons.toFixed(1)}</span>
            <span className="text-xs text-slate-400">Tấn</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Ngày {formatDateVN(selectedProductionDate)}</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400 font-medium">Thực hiện lũy kế</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400 font-mono">{totalActualTons.toFixed(1)}</span>
            <span className="text-xs text-slate-400">Tấn</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Đã ghi nhận đến hiện tại</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400 font-medium">Tỷ lệ hoàn thành (AC-11)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono ${
                overallRate === null
                  ? 'text-slate-400'
                  : overallRate >= 95
                  ? 'text-emerald-400'
                  : overallRate >= 80
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {overallRate !== null ? `${overallRate}%` : 'Không áp dụng'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Thực hiện / Kế hoạch</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400 font-medium">Chênh lệch sản lượng</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono ${
                totalVarianceTons >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalVarianceTons >= 0 ? `+${totalVarianceTons}` : totalVarianceTons}
            </span>
            <span className="text-xs text-slate-400">Tấn</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Thực hiện − Kế hoạch</span>
        </div>
      </div>

      {/* Progress Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm">
            Chi tiết Kế hoạch vs Thực hiện theo Line & SKU ({filteredProgress.length})
          </h3>
          <span className="text-xs text-slate-400">Ngày sản xuất: {formatDateVN(selectedProductionDate)}</span>
        </div>

        {filteredProgress.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Chưa có dữ liệu tiến độ sản xuất cho ngày {formatDateVN(selectedProductionDate)}. Nhập tay hoặc Upload file CSV.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Line</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5 text-right">Kế hoạch</th>
                  <th className="px-4 py-2.5 text-right">Thực hiện</th>
                  <th className="px-4 py-2.5 text-center">Tỷ lệ % (AC-11)</th>
                  <th className="px-4 py-2.5 text-right">Chênh lệch</th>
                  <th className="px-4 py-2.5">Nguồn dữ liệu</th>
                  <th className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProgress.map((p) => {
                  const line = lines.find((l) => l.id === p.lineId);
                  const sku = skus.find((s) => s.id === p.skuId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-slate-200">{line?.name || p.lineId}</td>
                      <td className="px-4 py-3 font-medium text-white">{sku?.name || p.skuId}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {p.plannedQty.toFixed(1)} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        {p.actualQty.toFixed(1)} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.plannedQty === 0 || p.completionRate === null ? (
                          <span className="text-slate-400 italic">Không áp dụng</span>
                        ) : (
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              p.completionRate >= 100
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                                : p.completionRate >= 80
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                            }`}
                          >
                            {p.completionRate}%
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold ${
                          p.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {p.variance >= 0 ? `+${p.variance}` : p.variance} {p.unit}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700">
                          {p.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setManualSkuId(p.skuId);
                            setPlannedQtyInput(p.plannedQty);
                            setActualQtyInput(p.actualQty);
                            setUnitInput(p.unit);
                            setIsManualModalOpen(true);
                          }}
                          className="text-orange-400 hover:underline font-semibold"
                        >
                          Sửa lũy kế
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white text-base">Cập nhật Số liệu Sản lượng Hiện trường</h3>
            <p className="text-slate-400">
              Line: {activeLine?.name} · Ngày {formatDateVN(selectedProductionDate)}. Số liệu thực hiện là lũy kế (AC-12).
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">SKU Sản phẩm</label>
                <select
                  value={manualSkuId}
                  onChange={(e) => setManualSkuId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-medium focus:border-orange-500 focus:outline-none"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kế hoạch (Planned)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={plannedQtyInput}
                    onChange={(e) => setPlannedQtyInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Thực hiện lũy kế (Actual)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actualQtyInput}
                    onChange={(e) => setActualQtyInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-emerald-400 font-bold font-mono focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Đơn vị đo lường</label>
                <input
                  type="text"
                  value={unitInput}
                  onChange={(e) => setUnitInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-1.5 font-bold text-white hover:bg-orange-500 shadow cursor-pointer"
                >
                  Lưu số liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Upload File Dữ liệu Sản lượng CSV</h3>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-white rounded p-1">
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-850 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-300">
                Tải file mẫu chuẩn: <code className="text-orange-400 font-mono">production_date,line_code,sku_code...</code>
              </span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 border border-slate-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải file CSV mẫu</span>
              </button>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Dán hoặc chỉnh sửa nội dung CSV vào ô dưới đây:
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full font-mono text-[11px] rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {importResult && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  importResult.errors.length === 0
                    ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-600/50 text-rose-300'
                }`}
              >
                {importResult.errors.length === 0 ? (
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle className="h-4 w-4" />
                    <span>Thành công! Đã cập nhật lũy kế {importResult.count} bản ghi mà không nhân đôi.</span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold block mb-1">Phát hiện {importResult.errors.length} lỗi:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {importResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-800 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleProcessCsv}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-500 shadow cursor-pointer"
              >
                Xác thực & Import dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

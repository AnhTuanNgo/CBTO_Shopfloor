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
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  X,
  FileText,
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
    setImportResult(res);
  };

  const totalPlannedTons = useMemo(() => {
    return filteredProgress.reduce((sum, p) => sum + p.plannedQty, 0);
  }, [filteredProgress]);

  const totalActualTons = useMemo(() => {
    return filteredProgress.reduce((sum, p) => sum + p.actualQty, 0);
  }, [filteredProgress]);

  const overallRate = totalPlannedTons > 0 ? +((totalActualTons / totalPlannedTons) * 100).toFixed(1) : null;
  const totalVarianceTons = +(totalActualTons - totalPlannedTons).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124]">Tiến độ Sản xuất (Kế hoạch vs Thực hiện)</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Theo dõi sản lượng (tấn) theo ngày & line. Cập nhật lũy kế liên tục, không cộng trùng.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setCsvText(sampleCsvContent);
              setImportResult(null);
              setIsCsvModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-xs transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-gray-500" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={() => {
              setManualSkuId(skus[0]?.id || '');
              setIsManualModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-[#E31837] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Nhập Sản lượng</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold block">Kế hoạch toàn nhà máy</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#202124] font-mono">{totalPlannedTons.toFixed(1)}</span>
            <span className="text-xs font-bold text-gray-500">Tấn</span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Ngày {formatDateVN(selectedProductionDate)}</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold block">Thực hiện lũy kế</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#16865B] font-mono">{totalActualTons.toFixed(1)}</span>
            <span className="text-xs font-bold text-gray-500">Tấn</span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Đã ghi nhận đến hiện tại</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold block">Tỷ lệ hoàn thành</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono ${
                overallRate === null
                  ? 'text-gray-400'
                  : overallRate >= 95
                  ? 'text-[#16865B]'
                  : overallRate >= 80
                  ? 'text-[#D97706]'
                  : 'text-[#C62828]'
              }`}
            >
              {overallRate !== null ? `${overallRate}%` : 'Không áp dụng'}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Thực hiện / Kế hoạch</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold block">Chênh lệch sản lượng</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono ${
                totalVarianceTons >= 0 ? 'text-[#16865B]' : 'text-[#C62828]'
              }`}
            >
              {totalVarianceTons >= 0 ? `+${totalVarianceTons}` : totalVarianceTons}
            </span>
            <span className="text-xs font-bold text-gray-500">Tấn</span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Thực hiện − Kế hoạch</span>
        </div>
      </div>

      {/* Progress Table */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h3 className="font-bold text-[#202124] text-sm">
            Chi tiết Kế hoạch vs Thực hiện theo Line & SKU ({filteredProgress.length})
          </h3>
          <span className="text-xs text-gray-500 font-medium">Ngày sản xuất: {formatDateVN(selectedProductionDate)}</span>
        </div>

        {filteredProgress.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400">
            Chưa có dữ liệu tiến độ sản xuất cho ngày {formatDateVN(selectedProductionDate)}. Nhập trực tiếp hoặc Tải lên file CSV.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold">
                <tr>
                  <th className="px-5 py-3">Line</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3 text-right">Kế hoạch</th>
                  <th className="px-5 py-3 text-right">Thực hiện</th>
                  <th className="px-5 py-3 text-center">Tỷ lệ %</th>
                  <th className="px-5 py-3 text-right">Chênh lệch</th>
                  <th className="px-5 py-3">Nguồn</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProgress.map((p) => {
                  const line = lines.find((l) => l.id === p.lineId);
                  const sku = skus.find((s) => s.id === p.skuId);

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-[#202124]">{line?.name || p.lineId}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{sku?.name || p.skuId}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-600">
                        {p.plannedQty.toFixed(1)} {p.unit}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-[#16865B]">
                        {p.actualQty.toFixed(1)} {p.unit}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.plannedQty === 0 || p.completionRate === null ? (
                          <span className="text-gray-400 italic">Không áp dụng</span>
                        ) : (
                          <span
                            className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                              p.completionRate >= 100
                                ? 'bg-emerald-50 text-[#16865B] border border-emerald-200'
                                : p.completionRate >= 80
                                ? 'bg-amber-50 text-[#D97706] border border-amber-200'
                                : 'bg-red-50 text-[#C62828] border border-red-200'
                            }`}
                          >
                            {p.completionRate}%
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-mono font-bold ${
                          p.variance >= 0 ? 'text-[#16865B]' : 'text-[#C62828]'
                        }`}
                      >
                        {p.variance >= 0 ? `+${p.variance}` : p.variance} {p.unit}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 border border-gray-200">
                          {p.source}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setManualSkuId(p.skuId);
                            setPlannedQtyInput(p.plannedQty);
                            setActualQtyInput(p.actualQty);
                            setUnitInput(p.unit);
                            setIsManualModalOpen(true);
                          }}
                          className="text-[#E31837] hover:underline font-bold cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-[#202124] text-base">Cập nhật Số liệu Sản lượng Hiện trường</h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 rounded-full p-1 cursor-pointer hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-500">
              Line: {activeLine?.name} · Ngày {formatDateVN(selectedProductionDate)}. Số liệu nhập là tổng lũy kế đến hiện tại.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">SKU Sản phẩm</label>
                <select
                  value={manualSkuId}
                  onChange={(e) => setManualSkuId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold focus:border-[#E31837] focus:outline-none"
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
                  <label className="block text-gray-700 font-bold mb-1.5">Kế hoạch (Planned)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={plannedQtyInput}
                    onChange={(e) => setPlannedQtyInput(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-mono font-bold focus:border-[#E31837] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Thực hiện lũy kế (Actual)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actualQtyInput}
                    onChange={(e) => setActualQtyInput(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#16865B] font-bold font-mono focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Đơn vị đo lường</label>
                <input
                  type="text"
                  value={unitInput}
                  onChange={(e) => setUnitInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold"
                  required
                />
              </div>

              <div className="border-t border-gray-100 pt-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#E31837] px-5 py-2 font-bold text-white hover:bg-red-700 shadow-sm cursor-pointer active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#16865B]" />
                <h3 className="font-bold text-[#202124] text-base">Tải lên File Sản lượng CSV</h3>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 rounded-full p-1 cursor-pointer hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <span className="text-gray-700 font-medium">
                Tải file mẫu chuẩn: <code className="text-[#E31837] font-mono">production_date,line_code,sku_code...</code>
              </span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-100 border border-gray-200 font-bold shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải file mẫu</span>
              </button>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1.5">
                Dán hoặc chỉnh sửa nội dung CSV vào ô dưới đây:
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full font-mono text-[11px] rounded-xl border border-gray-200 bg-white p-3 text-[#202124] focus:border-[#E31837] focus:outline-none"
              />
            </div>

            {importResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs ${
                  importResult.errors.length === 0
                    ? 'bg-emerald-50 border-emerald-200 text-[#16865B]'
                    : 'bg-red-50 border-red-200 text-[#C62828]'
                }`}
              >
                {importResult.errors.length === 0 ? (
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Thành công! Đã cập nhật lũy kế {importResult.count} bản ghi.</span>
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

            <div className="border-t border-gray-100 pt-3.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleProcessCsv}
                className="rounded-xl bg-[#E31837] px-5 py-2 font-bold text-white hover:bg-red-700 shadow-sm cursor-pointer active:scale-95"
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

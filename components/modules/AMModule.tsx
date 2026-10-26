'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { AM_STANDARD_ITEMS } from '@/lib/mock-data';
import { AMChecklistItem, AMResult } from '@/lib/types';
import { formatDateTime, formatDateVN } from '@/lib/date-utils';
import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  ShieldCheck,
  Wrench,
  Gauge,
  Zap,
  Info,
} from 'lucide-react';

export function AMModule() {
  const {
    currentUser,
    selectedLineId,
    selectedShiftId,
    selectedProductionDate,
    lines,
    getEquipmentsByLine,
    amChecklists,
    saveAMChecklist,
  } = useAppStore();

  const lineEquipments = useMemo(() => getEquipmentsByLine(selectedLineId), [getEquipmentsByLine, selectedLineId]);
  const activeLine = lines.find((l) => l.id === selectedLineId);

  // New AM Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetEquipmentId, setTargetEquipmentId] = useState<string>(lineEquipments[0]?.id || '');
  const [formItems, setFormItems] = useState<AMChecklistItem[]>(() =>
    AM_STANDARD_ITEMS.map((item) => ({
      itemId: item.id,
      group: item.group,
      title: item.title,
      result: null,
      note: '',
    }))
  );
  const [formError, setFormError] = useState<string>('');
  const [selectedAmDetail, setSelectedAmDetail] = useState<string | null>(null);

  const resetForm = (eqId?: string) => {
    setTargetEquipmentId(eqId || lineEquipments[0]?.id || '');
    setFormItems(
      AM_STANDARD_ITEMS.map((item) => ({
        itemId: item.id,
        group: item.group,
        title: item.title,
        result: null,
        note: '',
      }))
    );
    setFormError('');
  };

  const handleOpenModal = (eqId?: string) => {
    resetForm(eqId);
    setIsModalOpen(true);
  };

  const setItemResult = (itemId: string, result: AMResult) => {
    setFormItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, result } : item))
    );
  };

  const setItemNote = (itemId: string, note: string) => {
    setFormItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, note } : item))
    );
  };

  const handleQuickPassAll = () => {
    setFormItems((prev) =>
      prev.map((item) => ({
        ...item,
        result: item.result || 'PASS',
      }))
    );
  };

  const handleSubmitAM = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!targetEquipmentId) {
      setFormError('Vui lòng chọn thiết bị thực hiện AM!');
      return;
    }

    const res = saveAMChecklist({
      plantId: 'CBTO_PLANT',
      lineId: selectedLineId,
      equipmentId: targetEquipmentId,
      productionDate: selectedProductionDate,
      shiftId: selectedShiftId,
      items: formItems,
      status: 'COMPLETED',
      hasFailOrTag: formItems.some((i) => i.result === 'FAIL' || i.result === 'PASS_TAG'),
      performedBy: currentUser.uid,
      performedByName: currentUser.displayName,
    });

    if (!res.success) {
      setFormError(res.message || 'Lỗi lưu biên bản AM');
      return;
    }

    setIsModalOpen(false);
  };

  // Filter checklists for current line
  const filteredChecklists = useMemo(() => {
    return amChecklists.filter((c) => c.lineId === selectedLineId);
  }, [amChecklists, selectedLineId]);

  const getGroupIcon = (group: string) => {
    switch (group) {
      case 'Cơ khí':
        return <Wrench className="h-4 w-4 text-sky-400" />;
      case 'Utility':
        return <Zap className="h-4 w-4 text-amber-400" />;
      case 'Instrument':
        return <Gauge className="h-4 w-4 text-emerald-400" />;
      case 'An toàn':
        return <ShieldCheck className="h-4 w-4 text-rose-400" />;
      default:
        return <Info className="h-4 w-4 text-slate-400" />;
    }
  };

  const detailReport = amChecklists.find((c) => c.id === selectedAmDetail);

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-400" />
            <h2 className="text-base font-bold text-white">Kiểm tra thiết bị trước sản xuất (AM)</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Kiểm tra 14 hạng mục (Cơ khí, Utility, Instrument, An toàn) trên {activeLine?.name || 'Line'}
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-950/40 hover:bg-orange-500 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Lập Biên bản AM mới</span>
        </button>
      </div>

      {/* Line Equipment Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {lineEquipments.map((eq) => {
          // Check if this equipment has an AM completed for today and current shift
          const existing = amChecklists.find(
            (c) =>
              c.equipmentId === eq.id &&
              c.productionDate === selectedProductionDate &&
              c.shiftId === selectedShiftId
          );

          return (
            <div
              key={eq.id}
              className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                existing
                  ? existing.hasFailOrTag
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-emerald-500/40 bg-emerald-950/20'
                  : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-400">{eq.code}</span>
                  <span className="text-[10px] text-slate-400">{eq.category}</span>
                </div>
                <h4 className="mt-1 font-bold text-slate-200 text-sm">{eq.name}</h4>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                {existing ? (
                  <div className="flex items-center gap-1.5">
                    {existing.hasFailOrTag ? (
                      <span className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5" /> Có lưu ý / FAIL
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle className="h-3.5 w-3.5" /> Đạt (PASS)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-[11px]">Chưa kiểm tra ca này</span>
                )}

                <button
                  onClick={() => {
                    if (existing) {
                      setSelectedAmDetail(existing.id);
                    } else {
                      handleOpenModal(eq.id);
                    }
                  }}
                  className={`text-[11px] font-semibold underline cursor-pointer ${
                    existing ? 'text-slate-300 hover:text-white' : 'text-orange-400 hover:text-orange-300'
                  }`}
                >
                  {existing ? 'Xem biên bản' : 'Thực hiện ngay →'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AM Checklists History Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm">Lịch sử biên bản AM ({filteredChecklists.length})</h3>
          <span className="text-xs text-slate-400">Ngày {formatDateVN(selectedProductionDate)}</span>
        </div>

        {filteredChecklists.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Chưa có biên bản AM nào trên {activeLine?.name}. Bấm &quot;Lập Biên bản AM mới&quot; để bắt đầu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Thời điểm</th>
                  <th className="px-4 py-2.5">Ca / Ngày</th>
                  <th className="px-4 py-2.5">Thiết bị</th>
                  <th className="px-4 py-2.5">Kết quả tổng thể</th>
                  <th className="px-4 py-2.5">Người thực hiện</th>
                  <th className="px-4 py-2.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredChecklists.map((c) => {
                  const eq = lineEquipments.find((e) => e.id === c.equipmentId);
                  const passCount = c.items.filter((i) => i.result === 'PASS').length;
                  const tagCount = c.items.filter((i) => i.result === 'PASS_TAG').length;
                  const failCount = c.items.filter((i) => i.result === 'FAIL').length;

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{formatDateTime(c.performedAt)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-200">{c.shiftId.replace('SHIFT_', 'Ca ')}</span>
                        <span className="text-slate-400 text-[11px] block">{formatDateVN(c.productionDate)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {eq?.name || c.equipmentId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${
                              failCount > 0
                                ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                                : tagCount > 0
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            }`}
                          >
                            {failCount > 0 ? 'FAIL' : tagCount > 0 ? 'PASS + TAG' : 'PASS'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {passCount} đạt / {tagCount} tag / {failCount} fail
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{c.performedByName}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedAmDetail(c.id)}
                          className="text-orange-400 hover:text-orange-300 font-medium underline"
                        >
                          Xem chi tiết
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

      {/* AM Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-850">
              <div>
                <h3 className="font-bold text-white text-base">Biên bản Kiểm tra Thiết bị trước Sản xuất (AM)</h3>
                <p className="text-xs text-slate-400">
                  {activeLine?.name} · {selectedShiftId.replace('SHIFT_', 'Ca ')} · Ngày {selectedProductionDate}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAM} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="rounded-lg border border-rose-500/50 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Equipment selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chọn thiết bị kiểm tra <span className="text-rose-400">*</span>
                </label>
                <select
                  value={targetEquipmentId}
                  onChange={(e) => setTargetEquipmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-white focus:border-orange-500 focus:outline-none"
                  required
                >
                  {lineEquipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.code}] {eq.name} ({eq.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Fill Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-200">Danh mục 14 hạng mục kiểm tra</span>
                <button
                  type="button"
                  onClick={handleQuickPassAll}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium underline cursor-pointer"
                >
                  Đánh dấu PASS tất cả
                </button>
              </div>

              {/* Checklist Items Grouped */}
              <div className="space-y-4">
                {(['Cơ khí', 'Utility', 'Instrument', 'An toàn'] as const).map((groupName) => {
                  const groupItems = formItems.filter((i) => i.group === groupName);
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={groupName} className="rounded-xl border border-slate-800 bg-slate-850/60 p-3.5 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-slate-200 text-xs border-b border-slate-800/80 pb-2">
                        {getGroupIcon(groupName)}
                        <span>Nhóm {groupName}</span>
                      </div>

                      <div className="space-y-3">
                        {groupItems.map((item) => (
                          <div key={item.itemId} className="space-y-2 rounded-lg bg-slate-900/60 p-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-xs text-slate-300 font-medium">{item.title}</span>

                              {/* 3 Result Buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setItemResult(item.itemId, 'PASS')}
                                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                                    item.result === 'PASS'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  PASS
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemResult(item.itemId, 'PASS_TAG')}
                                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                                    item.result === 'PASS_TAG'
                                      ? 'bg-amber-600 text-white shadow-sm'
                                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  PASS + TAG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemResult(item.itemId, 'FAIL')}
                                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                                    item.result === 'FAIL'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  FAIL
                                </button>
                              </div>
                            </div>

                            {/* Note input required if FAIL or PASS_TAG */}
                            {(item.result === 'PASS_TAG' || item.result === 'FAIL') && (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  value={item.note}
                                  onChange={(e) => setItemNote(item.itemId, e.target.value)}
                                  placeholder={
                                    item.result === 'FAIL'
                                      ? 'Bắt buộc ghi chú lý do FAIL và cảnh báo hiện trường...'
                                      : 'Bắt buộc ghi chú dấu hiệu bất thường lưu ý (TAG)...'
                                  }
                                  className="w-full rounded border border-amber-600/50 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                                  required
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer info & Buttons */}
              <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Người thực hiện: <strong className="text-slate-200">{currentUser.displayName}</strong>
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-initial rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial rounded-lg bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-500 shadow-md shadow-orange-950/40 cursor-pointer"
                  >
                    Lưu & Hoàn thành AM
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AM Detail Modal */}
      {detailReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Chi tiết Biên bản AM</h3>
                <p className="text-xs text-slate-400">Mã biên bản: {detailReport.id}</p>
              </div>
              <button
                onClick={() => setSelectedAmDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400">Line:</span>{' '}
                <span className="font-semibold text-white">{detailReport.lineId}</span>
              </div>
              <div>
                <span className="text-slate-400">Ca / Ngày:</span>{' '}
                <span className="font-semibold text-white">
                  {detailReport.shiftId.replace('SHIFT_', 'Ca ')} · {formatDateVN(detailReport.productionDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Người thực hiện:</span>{' '}
                <span className="font-semibold text-white">{detailReport.performedByName}</span>
              </div>
              <div>
                <span className="text-slate-400">Thời điểm:</span>{' '}
                <span className="font-semibold text-white">{formatDateTime(detailReport.performedAt)}</span>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 pr-1 text-xs">
              {detailReport.items.map((item) => (
                <div key={item.itemId} className="py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">
                      [{item.group}] {item.title}
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                        item.result === 'PASS'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : item.result === 'PASS_TAG'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                          : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                      }`}
                    >
                      {item.result === 'PASS_TAG' ? 'PASS + TAG' : item.result}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-amber-300/90 bg-amber-950/30 p-1.5 rounded text-[11px] border border-amber-900/30">
                      <strong>Ghi chú:</strong> {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedAmDetail(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

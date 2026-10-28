'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { AM_STANDARD_ITEMS } from '@/lib/mock-data';
import { AMChecklistItem, AMResult } from '@/lib/types';
import { formatDateTime, formatDateVN } from '@/lib/date-utils';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ShieldCheck,
  Wrench,
  Gauge,
  Zap,
  Info,
  X,
  FileText,
  Search,
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

  const handleOpenModal = (equipmentId?: string) => {
    resetForm(equipmentId);
    setIsModalOpen(true);
  };

  const handleQuickPassAll = () => {
    setFormItems((prev) =>
      prev.map((i) => ({
        ...i,
        result: 'PASS',
        note: '',
      }))
    );
  };

  const setItemResult = (itemId: string, result: AMResult) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          return {
            ...item,
            result,
            note: result === 'PASS' ? '' : item.note,
          };
        }
        return item;
      })
    );
  };

  const setItemNote = (itemId: string, note: string) => {
    setFormItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, note } : item))
    );
  };

  const handleSubmitAM = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const uncompleted = formItems.filter((i) => !i.result);
    if (uncompleted.length > 0) {
      setFormError(`Còn ${uncompleted.length} hạng mục chưa được đánh giá! Vui lòng hoàn thành tất cả 14 mục.`);
      return;
    }

    const unnotedIssues = formItems.filter(
      (i) => (i.result === 'PASS_TAG' || i.result === 'FAIL') && !i.note.trim()
    );
    if (unnotedIssues.length > 0) {
      setFormError(
        `Các mục đánh dấu "PASS + TAG" hoặc "FAIL" bắt buộc phải điền mô tả hiện trường để đội bảo trì xử lý!`
      );
      return;
    }

    const hasFailOrTag = formItems.some((i) => i.result === 'PASS_TAG' || i.result === 'FAIL');

    saveAMChecklist({
      plantId: 'CBTO_PLANT',
      lineId: selectedLineId,
      shiftId: selectedShiftId,
      productionDate: selectedProductionDate,
      equipmentId: targetEquipmentId,
      items: formItems,
      status: 'COMPLETED',
      hasFailOrTag,
      performedBy: currentUser.uid,
      performedByName: currentUser.displayName,
    });

    setIsModalOpen(false);
  };

  // Filter checklists for active line
  const filteredChecklists = useMemo(() => {
    return amChecklists.filter((c) => c.lineId === selectedLineId);
  }, [amChecklists, selectedLineId]);

  const getGroupIcon = (group: string) => {
    switch (group) {
      case 'Cơ khí':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'Utility':
        return <Zap className="h-4 w-4 text-amber-600" />;
      case 'Instrument':
        return <Gauge className="h-4 w-4 text-emerald-600" />;
      case 'An toàn':
        return <ShieldCheck className="h-4 w-4 text-[#E31837]" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const detailReport = amChecklists.find((c) => c.id === selectedAmDetail);

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124]">Kiểm tra Thiết bị trước Sản xuất (AM)</h2>
              <p className="text-xs text-gray-500">
                Kiểm tra 14 hạng mục (Cơ khí, Utility, Đo lường, An toàn) trên {activeLine?.name || 'Line'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-xl bg-[#E31837] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Lập Biên bản AM mới</span>
        </button>
      </div>

      {/* Line Equipment Status Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Tình trạng kiểm tra thiết bị {activeLine?.name}
          </h3>
          <span className="text-xs text-gray-400">
            Ca {selectedShiftId.replace('SHIFT_', '')} · Ngày {formatDateVN(selectedProductionDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {lineEquipments.map((eq) => {
            const existing = amChecklists.find(
              (c) =>
                c.equipmentId === eq.id &&
                c.productionDate === selectedProductionDate &&
                c.shiftId === selectedShiftId
            );

            return (
              <div
                key={eq.id}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between bg-white ${
                  existing
                    ? existing.hasFailOrTag
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-emerald-300 bg-emerald-50/20'
                    : 'border-gray-200/80 hover:border-gray-300'
                } shadow-xs`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {eq.code}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">{eq.category}</span>
                  </div>
                  <h4 className="mt-2 font-bold text-[#202124] text-sm leading-snug">{eq.name}</h4>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  {existing ? (
                    <div className="flex items-center gap-1.5">
                      {existing.hasFailOrTag ? (
                        <span className="flex items-center gap-1 text-[#D97706] font-semibold text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5" /> Có lưu ý / FAIL
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#16865B] font-semibold text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Đạt (PASS)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-[11px] font-medium">Chưa kiểm tra ca này</span>
                  )}

                  <button
                    onClick={() => {
                      if (existing) {
                        setSelectedAmDetail(existing.id);
                      } else {
                        handleOpenModal(eq.id);
                      }
                    }}
                    className={`text-[11px] font-bold cursor-pointer transition-colors ${
                      existing ? 'text-gray-600 hover:text-[#202124]' : 'text-[#E31837] hover:underline'
                    }`}
                  >
                    {existing ? 'Xem biên bản →' : 'Kiểm tra ngay →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AM Checklists History Table */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#E31837]" />
            <h3 className="font-bold text-[#202124] text-sm">Lịch sử biên bản AM ({filteredChecklists.length})</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">Hôm nay: {formatDateVN(selectedProductionDate)}</span>
        </div>

        {filteredChecklists.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-xs">
            Chưa có biên bản AM nào trên {activeLine?.name}. Bấm &quot;Lập Biên bản AM mới&quot; để bắt đầu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold">
                <tr>
                  <th className="px-5 py-3">Thời điểm</th>
                  <th className="px-5 py-3">Ca / Ngày</th>
                  <th className="px-5 py-3">Thiết bị</th>
                  <th className="px-5 py-3">Kết quả</th>
                  <th className="px-5 py-3">Người thực hiện</th>
                  <th className="px-5 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredChecklists.map((c) => {
                  const eq = lineEquipments.find((e) => e.id === c.equipmentId);
                  const passCount = c.items.filter((i) => i.result === 'PASS').length;
                  const tagCount = c.items.filter((i) => i.result === 'PASS_TAG').length;
                  const failCount = c.items.filter((i) => i.result === 'FAIL').length;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-gray-500">{formatDateTime(c.performedAt)}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[#202124]">{c.shiftId.replace('SHIFT_', 'Ca ')}</span>
                        <span className="text-gray-400 text-[11px] block">{formatDateVN(c.productionDate)}</span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#202124]">
                        {eq?.name || c.equipmentId}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              failCount > 0
                                ? 'bg-red-50 text-[#C62828] border border-red-200'
                                : tagCount > 0
                                ? 'bg-amber-50 text-[#D97706] border border-amber-200'
                                : 'bg-emerald-50 text-[#16865B] border border-emerald-200'
                            }`}
                          >
                            {failCount > 0 ? (
                              <XCircle className="h-3 w-3" />
                            ) : tagCount > 0 ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            {failCount > 0 ? 'FAIL' : tagCount > 0 ? 'PASS + TAG' : 'PASS'}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {passCount} đạt · {tagCount} tag · {failCount} fail
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{c.performedByName}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedAmDetail(c.id)}
                          className="text-[#E31837] hover:underline font-semibold cursor-pointer"
                        >
                          Chi tiết
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
              <div>
                <h3 className="font-bold text-[#202124] text-base">Biên bản Kiểm tra Thiết bị (AM)</h3>
                <p className="text-xs text-gray-500">
                  {activeLine?.name} · {selectedShiftId.replace('SHIFT_', 'Ca ')} · Ngày {selectedProductionDate}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAM} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#C62828]" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Equipment selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Chọn thiết bị kiểm tra <span className="text-[#E31837]">*</span>
                </label>
                <select
                  value={targetEquipmentId}
                  onChange={(e) => setTargetEquipmentId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#202124] focus:border-[#E31837] focus:outline-none"
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
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-800">Danh mục 14 hạng mục tiêu chuẩn</span>
                <button
                  type="button"
                  onClick={handleQuickPassAll}
                  className="text-xs text-[#E31837] hover:underline font-bold cursor-pointer"
                >
                  ✓ Đánh dấu PASS tất cả
                </button>
              </div>

              {/* Checklist Items Grouped */}
              <div className="space-y-4">
                {(['Cơ khí', 'Utility', 'Instrument', 'An toàn'] as const).map((groupName) => {
                  const groupItems = formItems.filter((i) => i.group === groupName);
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={groupName} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-[#202124] text-xs border-b border-gray-200/70 pb-2.5">
                        {getGroupIcon(groupName)}
                        <span>Nhóm {groupName}</span>
                      </div>

                      <div className="space-y-3">
                        {groupItems.map((item) => (
                          <div key={item.itemId} className="space-y-2 rounded-xl bg-white p-3 border border-gray-200/70">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-xs text-gray-800 font-semibold">{item.title}</span>

                              {/* 3 Result Buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setItemResult(item.itemId, 'PASS')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[36px] ${
                                    item.result === 'PASS'
                                      ? 'bg-[#16865B] text-white shadow-xs'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  PASS
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemResult(item.itemId, 'PASS_TAG')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[36px] ${
                                    item.result === 'PASS_TAG'
                                      ? 'bg-[#D97706] text-white shadow-xs'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  PASS + TAG
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemResult(item.itemId, 'FAIL')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer min-h-[36px] ${
                                    item.result === 'FAIL'
                                      ? 'bg-[#C62828] text-white shadow-xs'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  FAIL
                                </button>
                              </div>
                            </div>

                            {/* Note input required if FAIL or PASS_TAG */}
                            {(item.result === 'PASS_TAG' || item.result === 'FAIL') && (
                              <div className="mt-1.5">
                                <input
                                  type="text"
                                  value={item.note}
                                  onChange={(e) => setItemNote(item.itemId, e.target.value)}
                                  placeholder={
                                    item.result === 'FAIL'
                                      ? 'Bắt buộc ghi chú lý do FAIL và cảnh báo hiện trường...'
                                      : 'Bắt buộc ghi chú dấu hiệu bất thường lưu ý (TAG)...'
                                  }
                                  className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-xs text-[#202124] placeholder-gray-400 focus:border-[#D97706] focus:outline-none"
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
              <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  Người thực hiện: <strong className="text-[#202124]">{currentUser.displayName}</strong>
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-initial rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial rounded-xl bg-[#E31837] px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-[#202124] text-base">Chi tiết Biên bản AM</h3>
                <p className="text-xs text-gray-500">Mã biên bản: {detailReport.id}</p>
              </div>
              <button
                onClick={() => setSelectedAmDetail(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <div>
                <span className="text-gray-500">Line:</span>{' '}
                <span className="font-bold text-[#202124]">{detailReport.lineId}</span>
              </div>
              <div>
                <span className="text-gray-500">Ca / Ngày:</span>{' '}
                <span className="font-bold text-[#202124]">
                  {detailReport.shiftId.replace('SHIFT_', 'Ca ')} · {formatDateVN(detailReport.productionDate)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Người thực hiện:</span>{' '}
                <span className="font-bold text-[#202124]">{detailReport.performedByName}</span>
              </div>
              <div>
                <span className="text-gray-500">Thời điểm:</span>{' '}
                <span className="font-bold text-[#202124]">{formatDateTime(detailReport.performedAt)}</span>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 pr-1 text-xs">
              {detailReport.items.map((item) => (
                <div key={item.itemId} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">
                      [{item.group}] {item.title}
                    </span>
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${
                        item.result === 'PASS'
                          ? 'bg-emerald-50 text-[#16865B] border-emerald-200'
                          : item.result === 'PASS_TAG'
                          ? 'bg-amber-50 text-[#D97706] border-amber-200'
                          : 'bg-red-50 text-[#C62828] border-red-200'
                      }`}
                    >
                      {item.result === 'PASS_TAG' ? 'PASS + TAG' : item.result}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-amber-800 bg-amber-50 p-2 rounded-lg text-[11px] border border-amber-200">
                      <strong>Ghi chú:</strong> {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedAmDetail(null)}
                className="rounded-xl bg-gray-100 px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-200 cursor-pointer"
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

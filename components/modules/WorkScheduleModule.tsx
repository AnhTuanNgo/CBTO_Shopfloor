'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ShiftId, WorkSchedule } from '@/lib/types';
import { SHIFTS, formatDateTime, formatDateVN } from '@/lib/date-utils';
import {
  CalendarDays,
  Upload,
  Plus,
  Eye,
  FileImage,
  FileText,
  Clock,
  Layers,
  ZoomIn,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react';

export function WorkScheduleModule() {
  const {
    currentUser,
    selectedLineId,
    lines,
    workSchedules,
    publishWorkSchedule,
  } = useAppStore();

  const activeLine = lines.find((l) => l.id === selectedLineId);

  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weekNumber, setWeekNumber] = useState<number>(45);
  const [weekStartDate, setWeekStartDate] = useState('2026-11-02');
  const [title, setTitle] = useState('Lịch làm việc tuần 45 — Đầy đủ Ca A, Ca B, Ca C');
  const [selectedShifts, setSelectedShifts] = useState<ShiftId[]>(['SHIFT_A', 'SHIFT_B', 'SHIFT_C']);
  const [selectedLines, setSelectedLines] = useState<string[]>(['LINE_01', 'LINE_02', 'LINE_03', 'LINE_04']);
  const [notes, setNotes] = useState('Đề nghị các Tổ trưởng thông báo cho công nhân vận hành.');

  // Zoom / View modal
  const [viewingSchedule, setViewingSchedule] = useState<WorkSchedule | null>(null);

  // Filter schedules that match current line
  const matchingSchedules = useMemo(() => {
    return workSchedules.filter((s) => s.lineIds.includes(selectedLineId));
  }, [workSchedules, selectedLineId]);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedShifts.length === 0 || selectedLines.length === 0) {
      alert('Vui lòng điền đầy đủ tiêu đề, ca và line áp dụng!');
      return;
    }

    publishWorkSchedule({
      plantId: 'CBTO_PLANT',
      weekStartDate,
      weekNumber: Number(weekNumber),
      title: title.trim(),
      shiftIds: selectedShifts,
      lineIds: selectedLines,
      fileUrl: '/assets/sample-schedule.png',
      fileName: `Lich_Lam_Viec_T${weekNumber}.png`,
      mimeType: 'image/png',
      fileSizeKb: 380,
      notes: notes.trim(),
    });

    setIsModalOpen(false);
  };

  const toggleShift = (shiftId: ShiftId) => {
    setSelectedShifts((prev) =>
      prev.includes(shiftId) ? prev.filter((s) => s !== shiftId) : [...prev, shiftId]
    );
  };

  const toggleLine = (lineId: string) => {
    setSelectedLines((prev) =>
      prev.includes(lineId) ? prev.filter((l) => l !== lineId) : [...prev, lineId]
    );
  };

  const canPublish = currentUser.role === 'LINE_LEADER' || currentUser.role === 'SUPERVISOR';

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124]">Lịch Làm Việc Hiện Trường</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Nơi xem lịch phân ca tập trung, hỗ trợ xem hình ảnh và phóng to trực quan trên điện thoại & máy tính.
              </p>
            </div>
          </div>
        </div>

        {canPublish && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#E31837] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all cursor-pointer active:scale-95"
          >
            <Upload className="h-4 w-4" />
            <span>Phát hành Lịch Tuần Mới</span>
          </button>
        )}
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {matchingSchedules.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-10 text-center text-xs text-gray-400">
            Chưa có lịch làm việc nào được công bố cho {activeLine?.name}.
          </div>
        ) : (
          matchingSchedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`rounded-2xl border p-5 transition-all bg-white shadow-xs ${
                schedule.current
                  ? 'border-red-200 ring-2 ring-red-50'
                  : 'border-gray-200/80 hover:border-gray-300 opacity-90'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-black text-[#E31837]">
                      TUẦN {schedule.weekNumber}
                    </span>
                    <h3 className="font-bold text-[#202124] text-sm">{schedule.title}</h3>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block font-medium">
                    Bắt đầu từ thứ Hai, ngày {formatDateVN(schedule.weekStartDate)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {schedule.current ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[#16865B] font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Bản hiện hành
                    </span>
                  ) : (
                    <span className="text-gray-400 font-medium">Bản lưu trữ (v{schedule.version})</span>
                  )}
                </div>
              </div>

              {/* Scope & metadata */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-500">Ca áp dụng:</span>{' '}
                  <span className="text-[#202124] font-bold">
                    {schedule.shiftIds.map((s) => s.replace('SHIFT_', 'Ca ')).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Line áp dụng:</span>{' '}
                  <span className="text-[#202124] font-bold">
                    {schedule.lineIds.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Người phát hành:</span>{' '}
                  <span className="text-[#202124] font-bold">{schedule.publishedByName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Thời điểm công bố:</span>{' '}
                  <span className="text-[#202124] font-bold">{formatDateTime(schedule.publishedAt)}</span>
                </div>
              </div>

              {schedule.notes && (
                <p className="mt-3 text-xs text-gray-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 font-medium">
                  <strong>Ghi chú:</strong> {schedule.notes}
                </p>
              )}

              {/* Preview & Open Card */}
              <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileImage className="h-4 w-4 text-[#E31837]" />
                  <span className="font-medium">{schedule.fileName} ({schedule.fileSizeKb} KB)</span>
                </div>

                <button
                  onClick={() => setViewingSchedule(schedule)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#E31837] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 cursor-pointer shadow-xs transition-colors active:scale-95"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Xem & Phóng to Lịch</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Zoom / Viewer Modal */}
      {viewingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-[#202124] text-base">{viewingSchedule.title}</h3>
                <p className="text-xs text-gray-500">
                  Tuần {viewingSchedule.weekNumber} · {viewingSchedule.fileName}
                </p>
              </div>
              <button
                onClick={() => setViewingSchedule(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* High-Res Factory Shift Schedule Sheet */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 overflow-x-auto">
              <div className="min-w-[620px] bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                  <div>
                    <h2 className="text-base font-black text-[#202124] uppercase tracking-wider">
                      LỊCH PHÂN CA SẢN XUẤT NHÀ MÁY CBTO
                    </h2>
                    <span className="text-xs text-[#E31837] font-bold">
                      TUẦN {viewingSchedule.weekNumber} (Từ {formatDateVN(viewingSchedule.weekStartDate)})
                    </span>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Người lập: <strong className="text-[#202124]">{viewingSchedule.publishedByName}</strong></div>
                    <div>Phê duyệt: <strong className="text-[#202124]">Giám Đốc Sản Xuất</strong></div>
                  </div>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full border-collapse border border-gray-200 text-center">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold">
                        <th className="border border-gray-200 p-2.5 text-left">Line / Vị trí</th>
                        <th className="border border-gray-200 p-2.5">Thứ 2</th>
                        <th className="border border-gray-200 p-2.5">Thứ 3</th>
                        <th className="border border-gray-200 p-2.5">Thứ 4</th>
                        <th className="border border-gray-200 p-2.5">Thứ 5</th>
                        <th className="border border-gray-200 p-2.5">Thứ 6</th>
                        <th className="border border-gray-200 p-2.5">Thứ 7</th>
                        <th className="border border-gray-200 p-2.5">Chủ Nhật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-800">
                      <tr>
                        <td className="border border-gray-200 p-2.5 font-bold text-left bg-gray-50">
                          Line 1 (TO Core)
                        </td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-amber-50 text-[#D97706] font-semibold">Ca A (CIP)</td>
                        <td className="border border-gray-200 p-2.5 text-gray-400">Nghỉ</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 p-2.5 font-bold text-left bg-gray-50">
                          Line 2 (Wasabi)
                        </td>
                        <td className="border border-gray-200 p-2.5 bg-blue-50 text-blue-700 font-semibold">Ca A</td>
                        <td className="border border-gray-200 p-2.5 bg-blue-50 text-blue-700 font-semibold">Ca A</td>
                        <td className="border border-gray-200 p-2.5 bg-amber-50 text-[#D97706] font-semibold">CIP L2</td>
                        <td className="border border-gray-200 p-2.5 bg-blue-50 text-blue-700 font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-blue-50 text-blue-700 font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-blue-50 text-blue-700 font-semibold">Ca A</td>
                        <td className="border border-gray-200 p-2.5 text-gray-400">Nghỉ</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 p-2.5 font-bold text-left bg-gray-50">
                          Line 3 (Sriracha)
                        </td>
                        <td className="border border-gray-200 p-2.5 bg-purple-50 text-purple-700 font-semibold">Ủ Men</td>
                        <td className="border border-gray-200 p-2.5 bg-purple-50 text-purple-700 font-semibold">Ủ Men</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A</td>
                        <td className="border border-gray-200 p-2.5 bg-amber-50 text-[#D97706] font-semibold">CIP L3</td>
                        <td className="border border-gray-200 p-2.5 text-gray-400">Nghỉ</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 p-2.5 font-bold text-left bg-gray-50">
                          Line 4 (Đóng gói)
                        </td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A + B</td>
                        <td className="border border-gray-200 p-2.5 bg-emerald-50 text-[#16865B] font-semibold">Ca A</td>
                        <td className="border border-gray-200 p-2.5 text-gray-400">Nghỉ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs">
              <span className="text-gray-500">Hình ảnh hiển thị trực quan rõ nét trên cả mobile & desktop.</span>
              <button
                onClick={() => setViewingSchedule(null)}
                className="rounded-xl bg-gray-100 px-5 py-2 font-bold text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 my-6 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-[#202124] text-base">Phát hành Lịch Làm Việc Tuần Mới</h3>
                <p className="text-gray-500 text-xs">
                  Công bố lịch mới sẽ hiển thị trực quan cho toàn bộ công nhân và tổ trưởng.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Số tuần</label>
                  <input
                    type="number"
                    min="1"
                    max="53"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-bold font-mono focus:border-[#E31837] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Thứ Hai đầu tuần</label>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-mono focus:border-[#E31837] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Tiêu đề lịch làm việc</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold focus:border-[#E31837] focus:outline-none"
                  required
                />
              </div>

              {/* Shifts selection */}
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Ca áp dụng</label>
                <div className="flex gap-2">
                  {SHIFTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleShift(s.id)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold border transition-colors cursor-pointer ${
                        selectedShifts.includes(s.id)
                          ? 'bg-[#E31837] text-white border-[#E31837] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lines selection */}
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Line áp dụng</label>
                <div className="grid grid-cols-2 gap-2">
                  {lines.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLine(l.id)}
                      className={`p-2.5 rounded-xl text-left text-xs font-bold border transition-colors cursor-pointer ${
                        selectedLines.includes(l.id)
                          ? 'bg-red-50 text-[#E31837] border-red-300'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {l.code} - {l.name.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Ghi chú vận hành</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-[#202124] placeholder-gray-400 focus:border-[#E31837] focus:outline-none"
                />
              </div>

              <div className="border-t border-gray-100 pt-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#E31837] px-5 py-2 font-bold text-white hover:bg-red-700 shadow-sm cursor-pointer active:scale-95"
                >
                  Công bố lịch & Gửi thông báo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
  CheckCircle,
  ExternalLink,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-orange-400" />
            <h2 className="text-base font-bold text-white">Lịch Làm Việc Hiện Trường</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Nơi xem lịch chung thay thế gửi Zalo rời rạc. Hỗ trợ xem hình ảnh, phóng to trên điện thoại & máy tính (AC-13).
          </p>
        </div>

        {canPublish && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-950/40 hover:bg-orange-500 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Phát hành Lịch Tuần Mới</span>
          </button>
        )}
      </div>

      {/* Schedules List */}
      <div className="space-y-4">
        {matchingSchedules.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-500">
            Chưa có lịch làm việc nào được công bố cho {activeLine?.name}.
          </div>
        ) : (
          matchingSchedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`rounded-2xl border p-5 transition-all ${
                schedule.current
                  ? 'border-orange-500/50 bg-slate-900 shadow-xl'
                  : 'border-slate-800 bg-slate-900/40 opacity-75'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-orange-600/20 border border-orange-500/40 px-2 py-0.5 text-xs font-black text-orange-400">
                      TUẦN {schedule.weekNumber}
                    </span>
                    <h3 className="font-bold text-white text-sm">{schedule.title}</h3>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Bắt đầu từ thứ Hai, ngày {formatDateVN(schedule.weekStartDate)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {schedule.current ? (
                    <span className="rounded bg-emerald-950/80 border border-emerald-600/60 px-2.5 py-1 text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Bản hiện hành
                    </span>
                  ) : (
                    <span className="text-slate-500">Bản lưu trữ (v{schedule.version})</span>
                  )}
                </div>
              </div>

              {/* Scope & metadata */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-850 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Ca áp dụng:</span>{' '}
                  <span className="text-slate-200 font-semibold">
                    {schedule.shiftIds.map((s) => s.replace('SHIFT_', 'Ca ')).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Line áp dụng:</span>{' '}
                  <span className="text-slate-200 font-semibold">
                    {schedule.lineIds.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Người phát hành:</span>{' '}
                  <span className="text-slate-200 font-semibold">{schedule.publishedByName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Thời điểm công bố:</span>{' '}
                  <span className="text-slate-200 font-semibold">{formatDateTime(schedule.publishedAt)}</span>
                </div>
              </div>

              {schedule.notes && (
                <p className="mt-3 text-xs text-slate-300 bg-slate-850/60 p-2.5 rounded-lg border border-slate-800 italic">
                  <strong>Ghi chú:</strong> {schedule.notes}
                </p>
              )}

              {/* Preview & Open Card */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FileImage className="h-4 w-4 text-orange-400" />
                  <span>{schedule.fileName} ({schedule.fileSizeKb} KB)</span>
                </div>

                <button
                  onClick={() => setViewingSchedule(schedule)}
                  className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-500 cursor-pointer shadow"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Xem & Phóng to Lịch</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Zoom / Viewer Modal (AC-13) */}
      {viewingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">{viewingSchedule.title}</h3>
                <p className="text-xs text-slate-400">
                  Tuần {viewingSchedule.weekNumber} · {viewingSchedule.fileName}
                </p>
              </div>
              <button
                onClick={() => setViewingSchedule(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Simulated High-Res Factory Shift Schedule Sheet */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 overflow-x-auto">
              <div className="min-w-[600px] bg-slate-900 rounded-lg p-5 border border-slate-800 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">
                      LỊCH PHÂN CA SẢN XUẤT NHÀ MÁY CBTO
                    </h2>
                    <span className="text-xs text-orange-400 font-bold">
                      TUẦN {viewingSchedule.weekNumber} (Từ {formatDateVN(viewingSchedule.weekStartDate)})
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>Người lập: {viewingSchedule.publishedByName}</div>
                    <div>Phê duyệt: Giám Đốc Sản Xuất</div>
                  </div>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full border-collapse border border-slate-700 text-center">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300">
                        <th className="border border-slate-700 p-2 text-left">Line / Vị trí</th>
                        <th className="border border-slate-700 p-2">Thứ 2</th>
                        <th className="border border-slate-700 p-2">Thứ 3</th>
                        <th className="border border-slate-700 p-2">Thứ 4</th>
                        <th className="border border-slate-700 p-2">Thứ 5</th>
                        <th className="border border-slate-700 p-2">Thứ 6</th>
                        <th className="border border-slate-700 p-2">Thứ 7</th>
                        <th className="border border-slate-700 p-2">Chủ Nhật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      <tr>
                        <td className="border border-slate-700 p-2 font-bold text-left bg-slate-850">
                          Line 1 (TO Core)
                        </td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-amber-950/30 text-amber-300">Ca A (CIP)</td>
                        <td className="border border-slate-700 p-2 text-slate-500">Nghỉ</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-700 p-2 font-bold text-left bg-slate-850">
                          Line 2 (Wasabi)
                        </td>
                        <td className="border border-slate-700 p-2 bg-sky-950/30 text-sky-300">Ca A</td>
                        <td className="border border-slate-700 p-2 bg-sky-950/30 text-sky-300">Ca A</td>
                        <td className="border border-slate-700 p-2 bg-amber-950/30 text-amber-300">CIP L2</td>
                        <td className="border border-slate-700 p-2 bg-sky-950/30 text-sky-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-sky-950/30 text-sky-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-sky-950/30 text-sky-300">Ca A</td>
                        <td className="border border-slate-700 p-2 text-slate-500">Nghỉ</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-700 p-2 font-bold text-left bg-slate-850">
                          Line 3 (Sriracha)
                        </td>
                        <td className="border border-slate-700 p-2 bg-purple-950/30 text-purple-300">Ủ Men</td>
                        <td className="border border-slate-700 p-2 bg-purple-950/30 text-purple-300">Ủ Men</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A</td>
                        <td className="border border-slate-700 p-2 bg-amber-950/30 text-amber-300">CIP L3</td>
                        <td className="border border-slate-700 p-2 text-slate-500">Nghỉ</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-700 p-2 font-bold text-left bg-slate-850">
                          Line 4 (Đóng gói)
                        </td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A + B</td>
                        <td className="border border-slate-700 p-2 bg-emerald-950/30 text-emerald-300">Ca A</td>
                        <td className="border border-slate-700 p-2 text-slate-500">Nghỉ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs">
              <span className="text-slate-400">Hình ảnh hiển thị trực quan rõ nét trên cả mobile & desktop.</span>
              <button
                onClick={() => setViewingSchedule(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4 my-6 text-xs">
            <h3 className="font-bold text-white text-base">Phát hành Lịch Làm Việc Tuần Mới (AC-14)</h3>
            <p className="text-slate-400">
              Công bố lịch mới sẽ gửi thông báo trong ứng dụng cho toàn bộ công nhân và tổ trưởng.
            </p>

            <form onSubmit={handlePublish} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Số tuần</label>
                  <input
                    type="number"
                    min="1"
                    max="53"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-bold font-mono focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Thứ Hai đầu tuần</label>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tiêu đề lịch làm việc</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              {/* Shifts selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ca áp dụng</label>
                <div className="flex gap-2">
                  {SHIFTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleShift(s.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                        selectedShifts.includes(s.id)
                          ? 'bg-orange-600 text-white border-orange-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lines selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Line áp dụng</label>
                <div className="grid grid-cols-2 gap-2">
                  {lines.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLine(l.id)}
                      className={`p-2 rounded-lg text-left text-xs font-semibold border transition-colors ${
                        selectedLines.includes(l.id)
                          ? 'bg-orange-600/30 text-orange-300 border-orange-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {l.code} - {l.name.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ghi chú vận hành</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-1.5 font-bold text-white hover:bg-orange-500 shadow cursor-pointer"
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

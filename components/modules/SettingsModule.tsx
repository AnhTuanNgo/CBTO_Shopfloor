'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Line, ShiftInfo, Equipment, DowntimeReasonItem, LossGroup } from '@/lib/types';
import {
  Layers,
  Clock,
  Cpu,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Filter,
  Info,
  Wrench,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

type SettingsTab = 'line' | 'shift' | 'equipment' | 'reason';

const EQUIPMENT_CATEGORIES = ['Cơ khí', 'Utility', 'Instrument', 'An toàn', 'Chế biến'];

const LOSS_GROUPS: LossGroup[] = [
  'Breakdown',
  'Chờ NVL',
  'Utility',
  'CIP',
  'Hóa lý',
  'Chờ tương',
  'Changeover',
  'Vệ sinh',
  'Khác',
];

const COMMON_STAGES = [
  'Chuẩn bị & Nạp NVL',
  'Gia nhiệt & Nấu tương',
  'Phối trộn & Cánh khuấy',
  'Đồng hóa áp lực cao (Homogenizer)',
  'Trao đổi nhiệt Pasteur & Làm nguội',
  'Bồn ủ men sinh học (Sriracha)',
  'Bồn đệm trung gian & Chờ tương',
  'Trạm rửa CIP & Tiệt trùng',
  'Chiết rót định lượng 16 đầu',
  'Máy vặn nắp & Dán nhãn chai',
  'Đóng thùng & Hoàn thiện',
  'Hệ thống Utility (Steam / Khí nén / Cooling)',
  'Toàn chuyền (Chung)',
];

export function SettingsModule() {
  const {
    lines,
    addLine,
    updateLine,
    deleteLine,
    shifts,
    addShift,
    updateShift,
    deleteShift,
    equipments,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    downtimeReasons,
    addDowntimeReason,
    updateDowntimeReason,
    deleteDowntimeReason,
    selectedLineId,
    setSelectedLineId,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('line');
  const [filterLineId, setFilterLineId] = useState<string>('ALL');
  const [filterLossGroup, setFilterLossGroup] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Form edit states
  const [editingId, setEditingId] = useState<string | null>(null);

  // Line form
  const [lineTitle, setLineTitle] = useState('');
  const [lineCode, setLineCode] = useState('');
  const [lineDesc, setLineDesc] = useState('');

  // Shift form
  const [shiftTitle, setShiftTitle] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  const [shiftDisplayTime, setShiftDisplayTime] = useState('');
  const [shiftStartHour, setShiftStartHour] = useState<number>(6);
  const [shiftEndHour, setShiftEndHour] = useState<number>(14);

  // Equipment form
  const [eqLineId, setEqLineId] = useState(selectedLineId || 'LINE_01');
  const [eqCode, setEqCode] = useState('');
  const [eqTitle, setEqTitle] = useState('');
  const [eqCategory, setEqCategory] = useState<Equipment['category']>('Cơ khí');

  // Downtime reason form
  const [reasonCategory, setReasonCategory] = useState<LossGroup>('Breakdown');
  const [reasonTitle, setReasonTitle] = useState('');
  const [reasonStage, setReasonStage] = useState('Chuẩn bị & Nạp NVL');
  const [reasonDesc, setReasonDesc] = useState('');

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const resetForm = () => {
    setEditingId(null);
    setLineTitle('');
    setLineCode('');
    setLineDesc('');

    setShiftTitle('');
    setShiftCode('');
    setShiftDisplayTime('');
    setShiftStartHour(6);
    setShiftEndHour(14);

    setEqLineId(selectedLineId || 'LINE_01');
    setEqCode('');
    setEqTitle('');
    setEqCategory('Cơ khí');

    setReasonCategory('Breakdown');
    setReasonTitle('');
    setReasonStage('Chuẩn bị & Nạp NVL');
    setReasonDesc('');
  };

  const handleEditLine = (item: Line) => {
    setEditingId(item.id);
    setLineTitle(item.name);
    setLineCode(item.code);
    setLineDesc(item.description || '');
  };

  const handleEditShift = (item: ShiftInfo) => {
    setEditingId(item.id);
    setShiftTitle(item.name);
    setShiftCode(item.code || String(item.id));
    setShiftDisplayTime(item.displayTime);
    setShiftStartHour(item.startHour);
    setShiftEndHour(item.endHour);
  };

  const handleEditEquipment = (item: Equipment) => {
    setEditingId(item.id);
    setEqLineId(item.lineId);
    setEqCode(item.code);
    setEqTitle(item.name);
    setEqCategory(item.category);
  };

  const handleEditReason = (item: DowntimeReasonItem) => {
    setEditingId(item.id);
    setReasonCategory(item.category);
    setReasonTitle(item.reason);
    setReasonStage(item.stage || 'Toàn chuyền (Chung)');
    setReasonDesc(item.description || '');
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'line') {
      if (!lineTitle.trim() || !lineCode.trim()) {
        showToast('Vui lòng nhập đầy đủ Tên Line và Mã Line!', 'error');
        return;
      }
      if (editingId) {
        updateLine({
          id: editingId,
          plantId: 'PLANT_01',
          name: lineTitle.trim(),
          code: lineCode.trim().toUpperCase(),
          description: lineDesc.trim(),
        });
        showToast(`Đã cập nhật Line: ${lineTitle}`);
      } else {
        addLine({
          name: lineTitle.trim(),
          code: lineCode.trim().toUpperCase(),
          description: lineDesc.trim(),
        });
        showToast(`Đã thêm mới Line: ${lineTitle}`);
      }
      resetForm();
    } else if (activeTab === 'shift') {
      if (!shiftTitle.trim() || !shiftCode.trim() || !shiftDisplayTime.trim()) {
        showToast('Vui lòng nhập tên ca, mã ca và khung giờ!', 'error');
        return;
      }
      if (editingId) {
        updateShift({
          id: editingId,
          name: shiftTitle.trim(),
          code: shiftCode.trim().toUpperCase(),
          displayTime: shiftDisplayTime.trim(),
          startHour: Number(shiftStartHour),
          endHour: Number(shiftEndHour),
        });
        showToast(`Đã cập nhật Ca: ${shiftTitle}`);
      } else {
        addShift({
          name: shiftTitle.trim(),
          code: shiftCode.trim().toUpperCase(),
          displayTime: shiftDisplayTime.trim(),
          startHour: Number(shiftStartHour),
          endHour: Number(shiftEndHour),
        });
        showToast(`Đã thêm mới Ca: ${shiftTitle}`);
      }
      resetForm();
    } else if (activeTab === 'equipment') {
      if (!eqTitle.trim() || !eqCode.trim()) {
        showToast('Vui lòng nhập đầy đủ Tên và Mã thiết bị!', 'error');
        return;
      }
      if (editingId) {
        updateEquipment({
          id: editingId,
          lineId: eqLineId,
          code: eqCode.trim().toUpperCase(),
          name: eqTitle.trim(),
          category: eqCategory,
        });
        showToast(`Đã cập nhật Thiết bị: ${eqTitle}`);
      } else {
        addEquipment({
          lineId: eqLineId,
          code: eqCode.trim().toUpperCase(),
          name: eqTitle.trim(),
          category: eqCategory,
        });
        showToast(`Đã thêm mới Thiết bị: ${eqTitle}`);
      }
      resetForm();
    } else if (activeTab === 'reason') {
      if (!reasonTitle.trim()) {
        showToast('Vui lòng nhập Tên lý do dừng máy!', 'error');
        return;
      }
      if (editingId) {
        updateDowntimeReason({
          id: editingId,
          category: reasonCategory,
          reason: reasonTitle.trim(),
          stage: reasonStage,
          description: reasonDesc.trim(),
        });
        showToast(`Đã cập nhật Lý do lỗi: ${reasonTitle}`);
      } else {
        addDowntimeReason({
          category: reasonCategory,
          reason: reasonTitle.trim(),
          stage: reasonStage,
          description: reasonDesc.trim(),
        });
        showToast(`Đã thêm mới Lý do lỗi: ${reasonTitle}`);
      }
      resetForm();
    }
  };

  // Filtered lists
  const filteredEquipments = equipments.filter((eq) =>
    filterLineId === 'ALL' ? true : eq.lineId === filterLineId
  );

  const filteredReasons = downtimeReasons.filter((r) =>
    filterLossGroup === 'ALL' ? true : r.category === filterLossGroup
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-3 text-sm rounded-lg border shadow-lg transition-all ${
            statusMessage.type === 'error'
              ? 'bg-rose-950/80 text-rose-200 border-rose-600'
              : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-[#210936] via-[#160726] to-[#0d0417] p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Wrench className="h-5 w-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
                Cài đặt chi tiết
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 lowercase">
                  tùy biến line & danh mục
                </span>
              </h1>
            </div>
            <p className="mt-1 text-xs md:text-sm text-slate-300 max-w-3xl">
              Cấu hình trực tiếp danh sách Dây chuyền (Line), Ca làm việc, Thiết bị máy móc và Danh mục lý do dừng máy (Down Time) theo tiêu chuẩn nhà máy CBTO.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-300 font-medium">Line mặc định:</span>
            <select
              value={selectedLineId}
              onChange={(e) => setSelectedLineId(e.target.value)}
              className="bg-slate-900/90 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4 Tabs Menu matching the image style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {/* Tab 1: Line */}
        <button
          onClick={() => {
            setActiveTab('line');
            resetForm();
          }}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'line'
              ? 'bg-gradient-to-br from-indigo-950/80 to-purple-900/50 border-amber-400/80 shadow-md shadow-indigo-950/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                activeTab === 'line' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${activeTab === 'line' ? 'text-white' : 'text-slate-300'}`}>
                Line sản xuất
              </div>
              <div className="text-[11px] text-slate-400">Dây chuyền chế biến</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'line' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {lines.length}
          </span>
        </button>

        {/* Tab 2: Ca */}
        <button
          onClick={() => {
            setActiveTab('shift');
            resetForm();
          }}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'shift'
              ? 'bg-gradient-to-br from-indigo-950/80 to-purple-900/50 border-amber-400/80 shadow-md shadow-indigo-950/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                activeTab === 'shift' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${activeTab === 'shift' ? 'text-white' : 'text-slate-300'}`}>
                Ca làm việc
              </div>
              <div className="text-[11px] text-slate-400">Khung giờ giao nhận</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'shift' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {shifts.length}
          </span>
        </button>

        {/* Tab 3: Máy */}
        <button
          onClick={() => {
            setActiveTab('equipment');
            resetForm();
          }}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'equipment'
              ? 'bg-gradient-to-br from-indigo-950/80 to-purple-900/50 border-amber-400/80 shadow-md shadow-indigo-950/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                activeTab === 'equipment' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${activeTab === 'equipment' ? 'text-white' : 'text-slate-300'}`}>
                Thiết bị máy
              </div>
              <div className="text-[11px] text-slate-400">Máy móc theo từng Line</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'equipment' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {equipments.length}
          </span>
        </button>

        {/* Tab 4: Lý do lỗi */}
        <button
          onClick={() => {
            setActiveTab('reason');
            resetForm();
          }}
          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'reason'
              ? 'bg-gradient-to-br from-indigo-950/80 to-purple-900/50 border-amber-400/80 shadow-md shadow-indigo-950/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                activeTab === 'reason' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${activeTab === 'reason' ? 'text-white' : 'text-slate-300'}`}>
                Lý do lỗi
              </div>
              <div className="text-[11px] text-slate-400">9 Nhóm Down Time</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'reason' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {downtimeReasons.length}
          </span>
        </button>
      </div>

      {/* Filter toolbar if Equipment or Reason tab */}
      {activeTab === 'equipment' && (
        <div className="flex items-center gap-2 flex-wrap bg-slate-900/70 p-3 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-amber-400" />
            Lọc theo Line:
          </span>
          <button
            onClick={() => setFilterLineId('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filterLineId === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Tất cả ({equipments.length})
          </button>
          {lines.map((l) => (
            <button
              key={l.id}
              onClick={() => setFilterLineId(l.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterLineId === l.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {l.name} ({equipments.filter((e) => e.lineId === l.id).length})
            </button>
          ))}
        </div>
      )}

      {activeTab === 'reason' && (
        <div className="flex items-center gap-2 flex-wrap bg-slate-900/70 p-3 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-amber-400" />
            Lọc theo nhóm Loss:
          </span>
          <button
            onClick={() => setFilterLossGroup('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filterLossGroup === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Tất cả ({downtimeReasons.length})
          </button>
          {LOSS_GROUPS.map((g) => {
            const count = downtimeReasons.filter((r) => r.category === g).length;
            if (count === 0) return null;
            return (
              <button
                key={g}
                onClick={() => setFilterLossGroup(g)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterLossGroup === g
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Cards List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            Danh sách{' '}
            {activeTab === 'line'
              ? 'Dây chuyền'
              : activeTab === 'shift'
              ? 'Ca sản xuất'
              : activeTab === 'equipment'
              ? `Thiết bị máy (${filteredEquipments.length})`
              : `Lý do dừng máy (${filteredReasons.length})`}
          </span>
          <span className="text-[11px] text-amber-400">Bấm [Sửa] để chỉnh sửa bên dưới hoặc [Xóa]</span>
        </div>

        {/* LINE CARDS */}
        {activeTab === 'line' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lines.map((l) => {
              const eqCount = equipments.filter((e) => e.lineId === l.id).length;
              const isEditing = editingId === l.id;
              return (
                <div
                  key={l.id}
                  className={`rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                    isEditing
                      ? 'bg-indigo-950/60 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          {l.code}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{l.name}</h3>
                      </div>
                      <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        {eqCount} thiết bị
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                      {l.description || 'Chưa có thông tin mô tả chi tiết cho dây chuyền này.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa Line "${l.name}"?`)) {
                          deleteLine(l.id);
                          showToast(`Đã xóa Line: ${l.name}`, 'info');
                          if (editingId === l.id) resetForm();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditLine(l)}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-sky-500/40 text-sky-400 hover:bg-sky-500/15 font-medium transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Sửa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SHIFT CARDS */}
        {activeTab === 'shift' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {shifts.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                    isEditing
                      ? 'bg-indigo-950/60 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                          {s.code || s.id}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{s.name}</h3>
                      </div>
                      <span className="text-[11px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {s.displayTime}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-4 space-y-1">
                      <div>Giờ bắt đầu: <span className="text-slate-200 font-medium">{s.startHour}:00</span></div>
                      <div>Giờ kết thúc: <span className="text-slate-200 font-medium">{s.endHour}:00</span></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa Ca "${s.name}"?`)) {
                          deleteShift(s.id);
                          showToast(`Đã xóa Ca: ${s.name}`, 'info');
                          if (editingId === s.id) resetForm();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditShift(s)}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-sky-500/40 text-sky-400 hover:bg-sky-500/15 font-medium transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Sửa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* EQUIPMENT CARDS */}
        {activeTab === 'equipment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEquipments.map((eq) => {
              const lineObj = lines.find((l) => l.id === eq.lineId);
              const isEditing = editingId === eq.id;
              return (
                <div
                  key={eq.id}
                  className={`rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                    isEditing
                      ? 'bg-indigo-950/60 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            {eq.code}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {eq.category}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">{eq.name}</h3>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mb-3">
                      Thuộc: <span className="text-amber-400 font-semibold">{lineObj ? lineObj.name : eq.lineId}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa thiết bị "${eq.name}"?`)) {
                          deleteEquipment(eq.id);
                          showToast(`Đã xóa thiết bị: ${eq.name}`, 'info');
                          if (editingId === eq.id) resetForm();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditEquipment(eq)}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-sky-500/40 text-sky-400 hover:bg-sky-500/15 font-medium transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Sửa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DOWNTIME REASONS CARDS */}
        {activeTab === 'reason' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredReasons.map((r) => {
              const isEditing = editingId === r.id;
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                    isEditing
                      ? 'bg-indigo-950/60 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {r.category}
                      </span>
                      {r.stage && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {r.stage}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-white mb-1.5">{r.reason}</h3>
                    {r.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{r.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa lý do "${r.reason}"?`)) {
                          deleteDowntimeReason(r.id);
                          showToast(`Đã xóa lý do dừng máy`, 'info');
                          if (editingId === r.id) resetForm();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditReason(r)}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-sky-500/40 text-sky-400 hover:bg-sky-500/15 font-medium transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Sửa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Section: Form for Create / Edit (Matching image bottom design) */}
      <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-[#1a0c2c] via-[#12081f] to-[#0a0412] p-5 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300">
              {editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </span>
            <h2 className="text-sm md:text-base font-bold text-white uppercase tracking-wide">
              {editingId ? 'Chỉnh sửa thông tin' : 'Nhập mới thông tin'}
              <span className="ml-2 text-xs font-medium text-amber-300 lowercase">
                (mục:{' '}
                {activeTab === 'line'
                  ? 'Line sản xuất'
                  : activeTab === 'shift'
                  ? 'Ca làm việc'
                  : activeTab === 'equipment'
                  ? 'Thiết bị máy móc'
                  : 'Lý do lỗi Down Time'}
                )
              </span>
            </h2>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              <span>Hủy sửa (Thêm mới)</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TAB 1: LINE FORM */}
          {activeTab === 'line' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Title (Tên Line sản xuất) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={lineTitle}
                  onChange={(e) => setLineTitle(e.target.value)}
                  placeholder="Ví dụ: Dây chuyền Chế biến Bia 02"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Code (Mã Line) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={lineCode}
                  onChange={(e) => setLineCode(e.target.value)}
                  placeholder="Ví dụ: LINE_02"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-amber-400 font-mono"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Description (Mô tả chi tiết nhiệm vụ của Line)
                </label>
                <textarea
                  rows={2}
                  value={lineDesc}
                  onChange={(e) => setLineDesc(e.target.value)}
                  placeholder="Nhập mô tả quy trình công nghệ, loại sản phẩm phụ trách của Line này..."
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SHIFT FORM */}
          {activeTab === 'shift' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Title (Tên Ca làm việc) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={shiftTitle}
                  onChange={(e) => setShiftTitle(e.target.value)}
                  placeholder="Ví dụ: Ca 3 - Ca Đêm"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Code (Mã Ca) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={shiftCode}
                  onChange={(e) => setShiftCode(e.target.value)}
                  placeholder="Ví dụ: SHIFT_3"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-amber-400 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Khung giờ hiển thị (Display Time) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={shiftDisplayTime}
                  onChange={(e) => setShiftDisplayTime(e.target.value)}
                  placeholder="Ví dụ: 22:00 - 06:00"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Giờ bắt đầu (0 - 23h)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={shiftStartHour}
                  onChange={(e) => setShiftStartHour(Number(e.target.value))}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Giờ kết thúc (0 - 23h)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={shiftEndHour}
                  onChange={(e) => setShiftEndHour(Number(e.target.value))}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* TAB 3: EQUIPMENT FORM */}
          {activeTab === 'equipment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Line áp dụng <span className="text-rose-400">*</span>
                </label>
                <select
                  value={eqLineId}
                  onChange={(e) => setEqLineId(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Mã thiết bị (Code) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={eqCode}
                  onChange={(e) => setEqCode(e.target.value)}
                  placeholder="Ví dụ: EQ_L1_08"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-amber-400 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Tên thiết bị (Title) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={eqTitle}
                  onChange={(e) => setEqTitle(e.target.value)}
                  placeholder="Ví dụ: Máy Đóng Thùng Carton Tự Động"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Phân nhóm thiết bị
                </label>
                <select
                  value={eqCategory}
                  onChange={(e) => setEqCategory(e.target.value as Equipment['category'])}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: REASON FORM */}
          {activeTab === 'reason' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Nhóm Loss (9 Loss Groups) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as LossGroup)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {LOSS_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Tên lý do dừng máy (Title) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={reasonTitle}
                  onChange={(e) => setReasonTitle(e.target.value)}
                  placeholder="Ví dụ: Rò rỉ gioăng mặt bích hơi bồn nấu"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Công đoạn áp dụng (Stage)
                </label>
                <select
                  value={reasonStage}
                  onChange={(e) => setReasonStage(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {COMMON_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Mô tả & Hướng dẫn xử lý sự cố (Description)
                </label>
                <textarea
                  rows={2}
                  value={reasonDesc}
                  onChange={(e) => setReasonDesc(e.target.value)}
                  placeholder="Ghi chú thêm về hiện tượng, cách khắc phục nhanh hoặc tiêu chuẩn kiểm tra an toàn..."
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* Action buttons (matching Confirm/Cancel in screenshot) */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-all cursor-pointer shadow-md"
            >
              <X className="h-4 w-4" />
              <span>⊘ Hủy</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white transition-all cursor-pointer shadow-lg shadow-blue-900/30"
            >
              <Check className="h-4 w-4" />
              <span>✓ Xác nhận</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

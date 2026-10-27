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
  Settings,
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

  // Reason form
  const [reasonCategory, setReasonCategory] = useState<LossGroup>('Breakdown');
  const [reasonTitle, setReasonTitle] = useState('');
  const [reasonStage, setReasonStage] = useState('Chuẩn bị & Nạp NVL');
  const [reasonDesc, setReasonDesc] = useState('');

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
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
          className={`flex items-center gap-2.5 p-4 text-xs font-bold rounded-2xl border shadow-xs transition-all ${
            statusMessage.type === 'error'
              ? 'bg-red-50 text-[#C62828] border-red-200'
              : 'bg-emerald-50 text-[#16865B] border-emerald-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#202124] flex items-center gap-2">
                Cài đặt & Danh mục Shopfloor
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-[#E31837] border border-red-200">
                  tùy biến line
                </span>
              </h1>
              <p className="mt-0.5 text-xs text-gray-500">
                Cấu hình trực tiếp danh sách Line, Ca làm việc, Thiết bị và Danh mục nguyên nhân dừng máy theo tiêu chuẩn nhà máy CBTO.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-semibold">Line mặc định:</span>
          <select
            value={selectedLineId}
            onChange={(e) => setSelectedLineId(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#202124] focus:outline-none focus:border-[#E31837]"
          >
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Tabs Menu */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Tab 1: Line */}
        <button
          onClick={() => {
            setActiveTab('line');
            resetForm();
          }}
          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer bg-white shadow-xs ${
            activeTab === 'line'
              ? 'border-[#E31837] ring-2 ring-red-100'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                activeTab === 'line' ? 'bg-red-50 text-[#E31837]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${activeTab === 'line' ? 'text-[#E31837]' : 'text-[#202124]'}`}>
                Line sản xuất
              </div>
              <div className="text-[11px] text-gray-400 font-medium">Dây chuyền chế biến</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              activeTab === 'line' ? 'bg-[#E31837] text-white' : 'bg-gray-100 text-gray-600'
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
          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer bg-white shadow-xs ${
            activeTab === 'shift'
              ? 'border-[#E31837] ring-2 ring-red-100'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                activeTab === 'shift' ? 'bg-red-50 text-[#E31837]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${activeTab === 'shift' ? 'text-[#E31837]' : 'text-[#202124]'}`}>
                Ca làm việc
              </div>
              <div className="text-[11px] text-gray-400 font-medium">Khung giờ giao nhận</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              activeTab === 'shift' ? 'bg-[#E31837] text-white' : 'bg-gray-100 text-gray-600'
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
          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer bg-white shadow-xs ${
            activeTab === 'equipment'
              ? 'border-[#E31837] ring-2 ring-red-100'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                activeTab === 'equipment' ? 'bg-red-50 text-[#E31837]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${activeTab === 'equipment' ? 'text-[#E31837]' : 'text-[#202124]'}`}>
                Thiết bị máy
              </div>
              <div className="text-[11px] text-gray-400 font-medium">Máy móc theo từng Line</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              activeTab === 'equipment' ? 'bg-[#E31837] text-white' : 'bg-gray-100 text-gray-600'
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
          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer bg-white shadow-xs ${
            activeTab === 'reason'
              ? 'border-[#E31837] ring-2 ring-red-100'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                activeTab === 'reason' ? 'bg-red-50 text-[#E31837]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${activeTab === 'reason' ? 'text-[#E31837]' : 'text-[#202124]'}`}>
                Lý do lỗi
              </div>
              <div className="text-[11px] text-gray-400 font-medium">9 Nhóm nguyên nhân</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              activeTab === 'reason' ? 'bg-[#E31837] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {downtimeReasons.length}
          </span>
        </button>
      </div>

      {/* Filter toolbar if Equipment or Reason tab */}
      {activeTab === 'equipment' && (
        <div className="flex items-center gap-2 flex-wrap bg-white p-4 rounded-2xl border border-gray-200/80 text-xs shadow-xs">
          <span className="text-gray-500 font-bold flex items-center gap-1.5 mr-1">
            <Filter className="h-3.5 w-3.5 text-[#E31837]" />
            Lọc theo Line:
          </span>
          <button
            onClick={() => setFilterLineId('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterLineId === 'ALL'
                ? 'bg-[#E31837] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tất cả ({equipments.length})
          </button>
          {lines.map((l) => (
            <button
              key={l.id}
              onClick={() => setFilterLineId(l.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterLineId === l.id
                  ? 'bg-[#E31837] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {l.name} ({equipments.filter((e) => e.lineId === l.id).length})
            </button>
          ))}
        </div>
      )}

      {activeTab === 'reason' && (
        <div className="flex items-center gap-2 flex-wrap bg-white p-4 rounded-2xl border border-gray-200/80 text-xs shadow-xs">
          <span className="text-gray-500 font-bold flex items-center gap-1.5 mr-1">
            <Filter className="h-3.5 w-3.5 text-[#E31837]" />
            Lọc theo nhóm Loss:
          </span>
          <button
            onClick={() => setFilterLossGroup('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterLossGroup === 'ALL'
                ? 'bg-[#E31837] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  filterLossGroup === g
                    ? 'bg-[#E31837] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold uppercase tracking-wider text-gray-500">
            Danh sách{' '}
            {activeTab === 'line'
              ? 'Dây chuyền'
              : activeTab === 'shift'
              ? 'Ca sản xuất'
              : activeTab === 'equipment'
              ? `Thiết bị máy (${filteredEquipments.length})`
              : `Lý do dừng máy (${filteredReasons.length})`}
          </span>
          <span className="text-[11px] text-gray-400 font-medium">Bấm [Sửa] để chỉnh sửa bên dưới hoặc [Xóa]</span>
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
                  className={`rounded-2xl border p-5 transition-all bg-white flex flex-col justify-between shadow-xs ${
                    isEditing
                      ? 'border-[#E31837] ring-2 ring-red-100'
                      : 'border-gray-200/80 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-bold">
                          {l.code}
                        </span>
                        <h3 className="text-sm font-bold text-[#202124] mt-2">{l.name}</h3>
                      </div>
                      <span className="text-[11px] text-gray-500 font-semibold bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {eqCount} thiết bị
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 font-medium">
                      {l.description || 'Chưa có thông tin mô tả chi tiết cho dây chuyền này.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa Line "${l.name}"?`)) {
                          deleteLine(l.id);
                          showToast(`Đã xóa Line: ${l.name}`, 'info');
                          if (editingId === l.id) resetForm();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-[#C62828] hover:bg-red-50 font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditLine(l)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-[#202124] hover:bg-gray-100 font-bold transition-colors cursor-pointer"
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
                  className={`rounded-2xl border p-5 transition-all bg-white flex flex-col justify-between shadow-xs ${
                    isEditing
                      ? 'border-[#E31837] ring-2 ring-red-100'
                      : 'border-gray-200/80 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-bold">
                          {s.code || s.id}
                        </span>
                        <h3 className="text-sm font-bold text-[#202124] mt-2">{s.name}</h3>
                      </div>
                      <span className="text-[11px] text-[#E31837] font-bold bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                        {s.displayTime}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-4 space-y-1 font-medium">
                      <div>Giờ bắt đầu: <span className="text-[#202124] font-bold">{s.startHour}:00</span></div>
                      <div>Giờ kết thúc: <span className="text-[#202124] font-bold">{s.endHour}:00</span></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa Ca "${s.name}"?`)) {
                          deleteShift(s.id);
                          showToast(`Đã xóa Ca: ${s.name}`, 'info');
                          if (editingId === s.id) resetForm();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-[#C62828] hover:bg-red-50 font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditShift(s)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-[#202124] hover:bg-gray-100 font-bold transition-colors cursor-pointer"
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
                  className={`rounded-2xl border p-5 transition-all bg-white flex flex-col justify-between shadow-xs ${
                    isEditing
                      ? 'border-[#E31837] ring-2 ring-red-100'
                      : 'border-gray-200/80 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-bold">
                            {eq.code}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                            {eq.category}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#202124]">{eq.name}</h3>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-3 font-medium">
                      Thuộc: <span className="text-[#202124] font-bold">{lineObj ? lineObj.name : eq.lineId}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa thiết bị "${eq.name}"?`)) {
                          deleteEquipment(eq.id);
                          showToast(`Đã xóa thiết bị: ${eq.name}`, 'info');
                          if (editingId === eq.id) resetForm();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-[#C62828] hover:bg-red-50 font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditEquipment(eq)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-[#202124] hover:bg-gray-100 font-bold transition-colors cursor-pointer"
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
                  className={`rounded-2xl border p-5 transition-all bg-white flex flex-col justify-between shadow-xs ${
                    isEditing
                      ? 'border-[#E31837] ring-2 ring-red-100'
                      : 'border-gray-200/80 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-[#E31837] border border-red-200">
                        {r.category}
                      </span>
                      {r.stage && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                          {r.stage}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-[#202124] mb-1.5">{r.reason}</h3>
                    {r.description && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 mb-3">{r.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa lý do "${r.reason}"?`)) {
                          deleteDowntimeReason(r.id);
                          showToast(`Đã xóa lý do dừng máy`, 'info');
                          if (editingId === r.id) resetForm();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-[#C62828] hover:bg-red-50 font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditReason(r)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-[#202124] hover:bg-gray-100 font-bold transition-colors cursor-pointer"
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

      {/* Bottom Section: Form for Create / Edit */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-50 text-[#E31837]">
              {editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </span>
            <h2 className="text-sm md:text-base font-bold text-[#202124]">
              {editingId ? 'Chỉnh sửa thông tin' : 'Nhập mới thông tin'}
              <span className="ml-2 text-xs font-semibold text-gray-500 lowercase">
                (mục:{' '}
                {activeTab === 'line'
                  ? 'Line sản xuất'
                  : activeTab === 'shift'
                  ? 'Ca làm việc'
                  : activeTab === 'equipment'
                  ? 'Thiết bị máy móc'
                  : 'Lý do dừng máy'}
                )
              </span>
            </h2>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-gray-600 hover:text-[#202124] flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 font-bold cursor-pointer"
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
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Tên Line sản xuất <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  value={lineTitle}
                  onChange={(e) => setLineTitle(e.target.value)}
                  placeholder="Ví dụ: Dây chuyền Chế biến Nấu 02"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mã Line (Code) <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  value={lineCode}
                  onChange={(e) => setLineCode(e.target.value)}
                  placeholder="Ví dụ: LINE_02"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] uppercase focus:outline-none focus:border-[#E31837] font-mono font-bold"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mô tả chi tiết nhiệm vụ của Line
                </label>
                <textarea
                  rows={2}
                  value={lineDesc}
                  onChange={(e) => setLineDesc(e.target.value)}
                  placeholder="Nhập mô tả quy trình công nghệ, loại sản phẩm phụ trách của Line này..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] focus:outline-none focus:border-[#E31837]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SHIFT FORM */}
          {activeTab === 'shift' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Tên Ca làm việc <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  value={shiftTitle}
                  onChange={(e) => setShiftTitle(e.target.value)}
                  placeholder="Ví dụ: Ca 3 - Ca Đêm"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mã Ca (Code) <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  value={shiftCode}
                  onChange={(e) => setShiftCode(e.target.value)}
                  placeholder="Ví dụ: SHIFT_C"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] uppercase focus:outline-none focus:border-[#E31837] font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Khung giờ hiển thị <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  value={shiftDisplayTime}
                  onChange={(e) => setShiftDisplayTime(e.target.value)}
                  placeholder="Ví dụ: 22:00 - 06:00"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Giờ bắt đầu (0 - 23h)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={shiftStartHour}
                  onChange={(e) => setShiftStartHour(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-bold focus:outline-none focus:border-[#E31837]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Giờ kết thúc (0 - 23h)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={shiftEndHour}
                  onChange={(e) => setShiftEndHour(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-bold focus:outline-none focus:border-[#E31837]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: EQUIPMENT FORM */}
          {activeTab === 'equipment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Line áp dụng <span className="text-[#E31837]">*</span>
                </label>
                <select
                  value={eqLineId}
                  onChange={(e) => setEqLineId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mã thiết bị (Code) <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  value={eqCode}
                  onChange={(e) => setEqCode(e.target.value)}
                  placeholder="Ví dụ: EQ_L1_08"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] uppercase focus:outline-none focus:border-[#E31837] font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Tên thiết bị (Title) <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  value={eqTitle}
                  onChange={(e) => setEqTitle(e.target.value)}
                  placeholder="Ví dụ: Máy Đóng Thùng Carton Tự Động"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Phân nhóm thiết bị
                </label>
                <select
                  value={eqCategory}
                  onChange={(e) => setEqCategory(e.target.value as Equipment['category'])}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
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
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Nhóm Loss (9 Loss Groups) <span className="text-[#E31837]">*</span>
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as LossGroup)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
                >
                  {LOSS_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Tên lý do dừng máy (Title) <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  value={reasonTitle}
                  onChange={(e) => setReasonTitle(e.target.value)}
                  placeholder="Ví dụ: Rò rỉ gioăng mặt bích hơi bồn nấu"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Công đoạn áp dụng (Stage)
                </label>
                <select
                  value={reasonStage}
                  onChange={(e) => setReasonStage(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] font-semibold focus:outline-none focus:border-[#E31837]"
                >
                  {COMMON_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mô tả & Hướng dẫn xử lý sự cố (Description)
                </label>
                <textarea
                  rows={2}
                  value={reasonDesc}
                  onChange={(e) => setReasonDesc(e.target.value)}
                  placeholder="Ghi chú thêm về hiện tượng, cách khắc phục nhanh hoặc tiêu chuẩn kiểm tra an toàn..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#202124] focus:outline-none focus:border-[#E31837]"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>Hủy</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold rounded-xl bg-[#E31837] hover:bg-red-700 text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Check className="h-4 w-4" />
              <span>Xác nhận Lưu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

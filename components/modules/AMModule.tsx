'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  ReadinessConclusion,
  ChecklistItemConfig,
  EquipmentReadinessItemResult,
  EquipmentReadinessLog,
} from '@/lib/types';
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
  Check,
  AlertCircle,
  Clock,
  UserCheck,
  ArrowRight,
  Sliders,
  History,
  Calendar,
  Copy,
  Save,
} from 'lucide-react';

interface LineReceptionFormProps {
  lineId: string;
  lineName: string;
  productionDate: string;
  shiftId: string;
  defaultReceiver: string;
  existingReception?: {
    receiverName: string;
    receivedAt: string;
    lineConditionsNote?: string;
  };
  onSave: (data: { receiverName: string; receivedAt: string; lineConditionsNote?: string }) => void;
  onOpenCopy: () => void;
}

function LineReceptionForm({
  lineId,
  lineName,
  productionDate,
  shiftId,
  defaultReceiver,
  existingReception,
  onSave,
  onOpenCopy,
}: LineReceptionFormProps) {
  const [receiver, setReceiver] = useState(existingReception?.receiverName || defaultReceiver);
  const [receivedAt, setReceivedAt] = useState(() => {
    if (existingReception?.receivedAt) {
      return existingReception.receivedAt.slice(0, 16);
    }
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [conditions, setConditions] = useState(existingReception?.lineConditionsNote || '');
  const [savedNotice, setSavedNotice] = useState('');

  const handleSave = () => {
    if (!receiver.trim()) return;
    const d = receivedAt ? new Date(receivedAt) : new Date();
    const iso = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
    onSave({
      receiverName: receiver.trim(),
      receivedAt: iso,
      lineConditionsNote: conditions.trim() || undefined,
    });
    setSavedNotice('Đã lưu thông tin tiếp nhận ca & điều kiện theo dõi Line thành công!');
    setTimeout(() => setSavedNotice(''), 3500);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Nhận ca & Điều kiện bàn giao cấp Line</h3>
            <p className="text-[11px] text-gray-500">
              Lưu 1 lần duy nhất cho toàn bộ Chuyền {lineName} ({productionDate} • Ca {shiftId}). Không phải nhập lặp lại từng máy.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
              ✓ {savedNotice}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-gray-500" />
            <span>Sao chép mẫu Checklist</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#E31837] hover:bg-red-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Lưu thông tin nhận ca Line</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-600">
            Người nhận ca Chuyền <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            placeholder="VD: Nguyễn Văn A (Tổ trưởng)"
            className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-600">
            Thời gian nhận ca thực tế <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-600">
            Điều kiện / Lưu ý theo dõi trong ca
          </label>
          <input
            type="text"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="VD: Cần theo dõi nhiệt độ tiệt trùng bồn B02..."
            className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export function AMModule() {
  const {
    currentUser,
    selectedLineId,
    selectedShiftId,
    selectedProductionDate,
    lines,
    equipments,
    getEquipmentsByLine,
    checklistConfigs,
    readinessLogs,
    saveReadinessLog,
    getEquipmentReadiness,
    getLineReadinessStatus,
    copyChecklistTemplate,
    saveLineShiftReception,
    getLineShiftReception,
    addAbnormalLog,
  } = useAppStore();

  const lineEquipments = useMemo(() => getEquipmentsByLine(selectedLineId), [getEquipmentsByLine, selectedLineId]);
  const activeLine = lines.find((l) => l.id === selectedLineId);

  // Line overall status
  const lineStatus = useMemo(
    () => getLineReadinessStatus(selectedLineId, selectedProductionDate, selectedShiftId),
    [getLineReadinessStatus, selectedLineId, selectedProductionDate, selectedShiftId]
  );

  // Line Shift Reception Header State (Requirement 2)
  const currentLineReception = useMemo(
    () => getLineShiftReception(selectedLineId, selectedProductionDate, selectedShiftId),
    [getLineShiftReception, selectedLineId, selectedProductionDate, selectedShiftId]
  );

  // Copy Checklist Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceEqId, setCopySourceEqId] = useState<string>('');
  const [copyTargetEqIds, setCopyTargetEqIds] = useState<string[]>([]);
  const [copyStatusMsg, setCopyStatusMsg] = useState('');

  // Modal inspection state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('');
  const [inspectedTime, setInspectedTime] = useState<string>('');
  const [conditionsNote, setConditionsNote] = useState<string>('');
  const [approverName, setApproverName] = useState<string>('');
  const [itemResults, setItemResults] = useState<EquipmentReadinessItemResult[]>([]);
  const [formError, setFormError] = useState<string>('');

  // Detail view state
  const [viewLogDetail, setViewLogDetail] = useState<EquipmentReadinessLog | null>(null);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConclusion, setFilterConclusion] = useState<string>('ALL');

  // Open inspection modal for equipment
  const handleOpenInspection = (eqId: string) => {
    setSelectedEqId(eqId);
    const existingLog = getEquipmentReadiness(eqId, selectedProductionDate, selectedShiftId);
    const configs = checklistConfigs.filter((c) => c.equipmentId === eqId && c.active);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Receiver defaults to Line-level reception receiver; Inspector is the person filling this check!
    setReceiverName(existingLog?.receiverName || currentLineReception?.receiverName || `${currentUser.displayName}`);
    setInspectorName(existingLog?.inspectorName || `${currentUser.displayName}`);
    setInspectedTime(existingLog?.inspectedAt ? existingLog.inspectedAt.slice(0, 16) : localNow);
    setConditionsNote(existingLog?.conditionsNote || '');
    setApproverName(existingLog?.approverName || (currentUser.role === 'SUPERVISOR' ? currentUser.displayName : ''));
    setFormError('');

    if (existingLog) {
      setItemResults(existingLog.items);
    } else {
      const initialItems: EquipmentReadinessItemResult[] = configs.map((cfg) => ({
        itemId: cfg.id,
        code: cfg.code,
        title: cfg.title,
        group: cfg.group,
        responseType: cfg.responseType,
        booleanVal: null,
        measuredVal: null,
        textVal: '',
        isNA: false,
        naReason: '',
        unit: cfg.unit,
        minVal: cfg.minVal,
        maxVal: cfg.maxVal,
        isOutOfRange: false,
        failureImpact: cfg.failureImpact,
        note: '',
      }));
      setItemResults(initialItems);
    }

    setIsModalOpen(true);
  };

  // Quick Pass all items
  const handlePassAll = () => {
    setItemResults((prev) =>
      prev.map((it) => {
        if (it.responseType === 'BOOLEAN') {
          return { ...it, booleanVal: 'PASS', isNA: false, note: '' };
        }
        if (it.responseType === 'MEASUREMENT' && it.minVal !== undefined && it.maxVal !== undefined) {
          const mid = Number(((it.minVal + it.maxVal) / 2).toFixed(1));
          return { ...it, measuredVal: mid, isOutOfRange: false, isNA: false, note: '' };
        }
        if (it.responseType === 'TEXT') {
          return { ...it, textVal: 'Bình thường', isNA: false, note: '' };
        }
        return it;
      })
    );
  };

  // Live evaluated conclusion
  const evaluatedConclusion: ReadinessConclusion = useMemo(() => {
    if (itemResults.length === 0) return 'NOT_CONFIGURED';
    const hasUnfilled = itemResults.some((it) => {
      const cfg = checklistConfigs.find((c) => c.id === it.itemId);
      const isMandatory = cfg ? cfg.isMandatory : true;
      if (it.isNA) return !it.naReason?.trim();
      if (!isMandatory) return false;
      if (it.responseType === 'BOOLEAN' && (it.booleanVal === null || it.booleanVal === undefined)) return true;
      if (it.responseType === 'MEASUREMENT' && (it.measuredVal === null || it.measuredVal === undefined)) return true;
      if (it.responseType === 'TEXT' && (!it.textVal || !it.textVal.trim())) return true;
      return false;
    });
    if (hasUnfilled) return 'UNCHECKED';

    const hasNotReady = itemResults.some((it) => {
      if (it.isNA) return false;
      return it.failureImpact === 'NOT_READY' && (it.booleanVal === 'FAIL' || it.isOutOfRange === true);
    });
    if (hasNotReady) return 'NOT_READY';

    const hasConditional = itemResults.some((it) => {
      if (it.isNA) return false;
      return it.failureImpact === 'CONDITIONAL_PRODUCTION' && (it.booleanVal === 'FAIL' || it.isOutOfRange === true);
    });
    if (hasConditional) return 'CONDITIONAL';

    return 'READY';
  }, [itemResults, checklistConfigs]);

  // Update item result
  const handleUpdateBoolean = (itemId: string, val: 'PASS' | 'FAIL') => {
    setItemResults((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, booleanVal: val, isNA: false } : it))
    );
  };

  const handleUpdateMeasurement = (itemId: string, valStr: string) => {
    setItemResults((prev) =>
      prev.map((it) => {
        if (it.itemId !== itemId) return it;
        if (valStr.trim() === '') {
          return { ...it, measuredVal: null, isOutOfRange: false };
        }
        const val = parseFloat(valStr);
        let outOfRange = false;
        if (!isNaN(val)) {
          if (it.minVal !== undefined && val < it.minVal) outOfRange = true;
          if (it.maxVal !== undefined && val > it.maxVal) outOfRange = true;
        }
        return {
          ...it,
          measuredVal: isNaN(val) ? null : val,
          isOutOfRange: outOfRange,
          isNA: false,
        };
      })
    );
  };

  const handleUpdateText = (itemId: string, val: string) => {
    setItemResults((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, textVal: val, isNA: false } : it))
    );
  };

  const handleToggleNA = (itemId: string, isNA: boolean) => {
    setItemResults((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, isNA, booleanVal: null, measuredVal: null, textVal: '' } : it))
    );
  };

  const handleUpdateNote = (itemId: string, note: string) => {
    setItemResults((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, note } : it))
    );
  };

  const handleUpdateNaReason = (itemId: string, naReason: string) => {
    setItemResults((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, naReason } : it))
    );
  };

  // 1-Click Create Abnormality from failed item
  const handleCreateAbnormalityFromItem = (item: EquipmentReadinessItemResult) => {
    const eq = equipments.find((e) => e.id === selectedEqId);
    const desc = `Phát hiện lỗi khi kiểm tra đầu ca ${eq?.name || ''}: Hạng mục "${item.title}". Giá trị: ${
      item.responseType === 'MEASUREMENT'
        ? `${item.measuredVal} ${item.unit || ''} (Chuẩn: ${item.minVal}-${item.maxVal})`
        : item.responseType === 'TEXT'
        ? item.textVal
        : 'FAIL'
    }. Ghi chú: ${item.note || 'Cần kiểm tra ngay'}`;

    const newAbn = addAbnormalLog({
      lineId: selectedLineId,
      equipmentId: selectedEqId,
      abnormalType: 'Kiểm tra đầu ca không đạt',
      description: desc,
    });

    setItemResults((prev) =>
      prev.map((it) => (it.itemId === item.itemId ? { ...it, linkedAbnormalId: newAbn.id } : it))
    );
  };

  // Submit inspection form
  const handleSubmitInspection = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!receiverName.trim()) {
      setFormError('Vui lòng nhập tên người nhận ca!');
      return;
    }
    if (!inspectorName.trim()) {
      setFormError('Vui lòng nhập tên người thực hiện kiểm tra!');
      return;
    }

    const unfilled = itemResults.filter((it) => {
      const cfg = checklistConfigs.find((c) => c.id === it.itemId);
      const isMandatory = cfg ? cfg.isMandatory : true;
      if (it.isNA) {
        return !it.naReason?.trim();
      }
      if (!isMandatory) return false;
      if (it.responseType === 'BOOLEAN') return it.booleanVal === null;
      if (it.responseType === 'MEASUREMENT') return it.measuredVal === null;
      if (it.responseType === 'TEXT') return !it.textVal || !it.textVal.trim();
      return false;
    });

    if (unfilled.length > 0) {
      setFormError(`Còn ${unfilled.length} hạng mục bắt buộc chưa hoàn thành hoặc chưa nêu lý do N/A!`);
      return;
    }

    if (evaluatedConclusion === 'CONDITIONAL' && !conditionsNote.trim()) {
      setFormError('Sản xuất có điều kiện bắt buộc phải ghi rõ điều kiện theo dõi và biện pháp giám sát!');
      return;
    }

    const res = saveReadinessLog({
      plantId: 'CBTO_PLANT',
      lineId: selectedLineId,
      equipmentId: selectedEqId,
      productionDate: selectedProductionDate,
      shiftId: selectedShiftId,
      conclusion: evaluatedConclusion,
      receiverName: receiverName.trim(),
      inspectorName: inspectorName.trim(),
      inspectedAt: inspectedTime || new Date().toISOString(),
      approverName: approverName.trim() || undefined,
      conditionsNote: conditionsNote.trim() || undefined,
      items: itemResults,
    });

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setFormError(res.message || 'Lỗi khi lưu kết quả kiểm tra!');
    }
  };

  // Helper for conclusion badge
  const renderConclusionBadge = (conclusion: ReadinessConclusion) => {
    switch (conclusion) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Sẵn sàng sản xuất
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Sản xuất có điều kiện
          </span>
        );
      case 'NOT_READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
            <XCircle className="h-3.5 w-3.5 text-red-600" />
            Chưa sẵn sàng sản xuất
          </span>
        );
      case 'UNCHECKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
            <Clock className="h-3.5 w-3.5 text-yellow-600" />
            Chưa kiểm tra
          </span>
        );
      case 'NOT_CONFIGURED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            <Info className="h-3.5 w-3.5 text-gray-400" />
            Chưa cấu hình checklist
          </span>
        );
    }
  };

  // Filtered equipment list
  const filteredEquipments = useMemo(() => {
    return lineEquipments.filter((eq) => {
      const matchSearch =
        eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterConclusion === 'ALL') return true;

      const hasConfigs = checklistConfigs.some((c) => c.equipmentId === eq.id && c.active);
      if (!hasConfigs) return filterConclusion === 'NOT_CONFIGURED';

      const log = getEquipmentReadiness(eq.id, selectedProductionDate, selectedShiftId);
      if (!log) return filterConclusion === 'UNCHECKED';

      return log.conclusion === filterConclusion;
    });
  }, [lineEquipments, searchTerm, filterConclusion, checklistConfigs, getEquipmentReadiness, selectedProductionDate, selectedShiftId]);

  return (
    <div className="space-y-6 pb-20">
      {/* Techcombank Light Hero / Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-[#E31837] p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse"></span>
              <p className="text-xs font-semibold tracking-wider uppercase text-red-100">
                Shopfloor Fact-Based Readiness
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Kiểm tra đầu ca & Xác nhận sẵn sàng sản xuất
            </h1>
            <p className="mt-1 text-xs md:text-sm text-red-100 max-w-2xl">
              Xác nhận thực tế người nhận ca, người kiểm tra, thời điểm kiểm tra và điều kiện vận hành từng thiết bị trước khi chạy máy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/20">
            <div className="text-right px-2">
              <div className="text-[10px] uppercase text-red-200">Chuyền hiện tại</div>
              <div className="text-sm font-bold text-white">{activeLine?.name || selectedLineId}</div>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="text-right px-2">
              <div className="text-[10px] uppercase text-red-200">Ngày / Ca</div>
              <div className="text-sm font-bold text-white">
                {selectedProductionDate} • {selectedShiftId}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Health & Readiness KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Toàn line</span>
            <ShieldCheck className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-gray-900">
            {lineStatus.checkedEquipments}/{lineStatus.totalEquipments}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Thiết bị đã kiểm tra</div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-medium">Sẵn sàng</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-800">{lineStatus.readyEquipments}</div>
          <div className="mt-1 text-[11px] text-emerald-600">Đạt tiêu chuẩn 100%</div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-medium">Có điều kiện</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-800">{lineStatus.conditionalEquipments}</div>
          <div className="mt-1 text-[11px] text-amber-600">Cần theo dõi sát</div>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-xs font-medium">Chưa sẵn sàng</span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-red-800">{lineStatus.notReadyEquipments}</div>
          <div className="mt-1 text-[11px] text-red-600">Chặn chạy máy</div>
        </div>

        <div className="col-span-2 md:col-span-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Chưa kiểm / Chưa cấu hình</span>
            <Clock className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-gray-800">
            {lineStatus.uncheckedEquipments + lineStatus.notConfiguredEquipments}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {lineStatus.uncheckedEquipments} chờ kiểm • {lineStatus.notConfiguredEquipments} chưa mẫu
          </div>
        </div>
      </div>

      {/* LINE SHIFT RECEPTION CARD (Nhận ca cấp Chuyền & Điều kiện theo dõi) */}
      <LineReceptionForm
        key={`${selectedLineId}-${selectedProductionDate}-${selectedShiftId}`}
        lineId={selectedLineId}
        lineName={activeLine?.name || selectedLineId}
        productionDate={selectedProductionDate}
        shiftId={selectedShiftId}
        defaultReceiver={currentUser.displayName}
        existingReception={currentLineReception}
        onSave={(data) => {
          saveLineShiftReception({
            lineId: selectedLineId,
            productionDate: selectedProductionDate,
            shiftId: selectedShiftId,
            receiverName: data.receiverName,
            receivedAt: data.receivedAt,
            lineConditionsNote: data.lineConditionsNote,
          });
        }}
        onOpenCopy={() => setIsCopyModalOpen(true)}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm thiết bị theo tên, mã hoặc nhóm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'READY', label: 'Sẵn sàng' },
            { id: 'CONDITIONAL', label: 'Có điều kiện' },
            { id: 'NOT_READY', label: 'Chưa sẵn sàng' },
            { id: 'UNCHECKED', label: 'Chưa kiểm tra' },
            { id: 'NOT_CONFIGURED', label: 'Chưa cấu hình' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterConclusion(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                filterConclusion === tab.id
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Readiness Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipments.map((eq) => {
          const log = getEquipmentReadiness(eq.id, selectedProductionDate, selectedShiftId);
          const configs = checklistConfigs.filter((c) => c.equipmentId === eq.id && c.active);
          const hasConfigs = configs.length > 0;
          const conclusion: ReadinessConclusion = !hasConfigs ? 'NOT_CONFIGURED' : log ? log.conclusion : 'UNCHECKED';

          const failedItems = log?.items.filter((i) => !i.isNA && (i.booleanVal === 'FAIL' || i.isOutOfRange)) || [];

          return (
            <div
              key={eq.id}
              className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs transition-all hover:shadow-md ${
                conclusion === 'NOT_READY'
                  ? 'border-red-300 ring-1 ring-red-100'
                  : conclusion === 'CONDITIONAL'
                  ? 'border-amber-300 ring-1 ring-amber-100'
                  : conclusion === 'READY'
                  ? 'border-emerald-200'
                  : 'border-gray-200'
              }`}
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-700">
                      {eq.code}
                    </span>
                    <span className="ml-2 text-[10px] font-medium text-gray-500">{eq.category}</span>
                    <h3 className="mt-1 text-sm font-bold text-gray-900 line-clamp-1">{eq.name}</h3>
                  </div>
                  <div>{renderConclusionBadge(conclusion)}</div>
                </div>

                {/* Body details */}
                <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-gray-400" />
                    <span>
                      Checklist:{' '}
                      <strong className="text-gray-900">
                        {configs.length > 0 ? `${configs.length} hạng mục` : 'Chưa cấu hình câu hỏi'}
                      </strong>
                    </span>
                  </div>

                  {log ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                        <span>
                          Người nhận:{' '}
                          <strong className="text-gray-900">{log.receiverName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5 text-gray-400" />
                        <span>
                          Người kiểm tra:{' '}
                          <strong className="text-gray-900">{log.inspectorName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>
                          Lúc:{' '}
                          <span className="text-gray-700">{formatDateTime(log.inspectedAt)}</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Chưa có nhân viên thực hiện kiểm tra cho ca này</span>
                    </div>
                  )}

                  {/* Conditions or issues banner */}
                  {conclusion === 'CONDITIONAL' && log?.conditionsNote && (
                    <div className="mt-2 rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-[11px] text-amber-800">
                      <div className="font-bold flex items-center gap-1 text-amber-900">
                        <AlertTriangle className="h-3 w-3 text-amber-700" />
                        Điều kiện theo dõi:
                      </div>
                      <div className="mt-0.5">{log.conditionsNote}</div>
                      {log.approverName && (
                        <div className="mt-1 text-[10px] text-amber-700">Duyệt bởi: {log.approverName}</div>
                      )}
                    </div>
                  )}

                  {conclusion === 'NOT_READY' && failedItems.length > 0 && (
                    <div className="mt-2 rounded-xl bg-red-50 p-2.5 border border-red-200 text-[11px] text-red-800">
                      <div className="font-bold flex items-center gap-1 text-red-900">
                        <XCircle className="h-3 w-3 text-red-700" />
                        Hạng mục vi phạm chặn chạy máy:
                      </div>
                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                        {failedItems.map((fi, idx) => (
                          <li key={idx} className="line-clamp-1">
                            {fi.title} {fi.measuredVal !== null && `(${fi.measuredVal} ${fi.unit})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => handleOpenInspection(eq.id)}
                  disabled={!hasConfigs}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                    !hasConfigs
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : log
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer'
                      : 'bg-[#E31837] hover:bg-red-700 text-white shadow-xs cursor-pointer'
                  }`}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>{log ? 'Kiểm tra lại / Cập nhật' : 'Bắt đầu kiểm tra'}</span>
                </button>

                {log && (
                  <button
                    onClick={() => setViewLogDetail(log)}
                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                    title="Xem chi tiết phiếu kiểm tra"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEquipments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Info className="h-8 w-8 text-gray-400 mx-auto" />
          <h3 className="mt-2 text-sm font-bold text-gray-800">Không tìm thấy thiết bị phù hợp</h3>
          <p className="text-xs text-gray-500 mt-1">Hãy thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm</p>
        </div>
      )}

      {/* MODAL: Perform Equipment Inspection */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur-md">
              <div>
                <span className="text-xs font-bold text-[#E31837] uppercase tracking-wider">
                  Biên bản kiểm tra đầu ca
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  {equipments.find((e) => e.id === selectedEqId)?.name} (
                  {equipments.find((e) => e.id === selectedEqId)?.code})
                </h2>
                <p className="text-xs text-gray-500">
                  {activeLine?.name} • Ngày: {selectedProductionDate} • Ca: {selectedShiftId}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="p-6 space-y-6">
              {/* Error Banner */}
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs font-medium text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Handover & Inspector Info Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-gray-50/80 p-4 border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Người nhận ca <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Tên công nhân nhận ca..."
                    required
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[#E31837] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Người kiểm tra thiết bị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="Tên người kiểm tra..."
                    required
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-[#E31837] focus:outline-none"
                  />
                </div>
              </div>

              {/* Checklist Items Controls */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Danh sách hạng mục kiểm tra</h3>
                  <p className="text-xs text-gray-500">
                    Đánh giá PASS/FAIL hoặc nhập giá trị đo lường thực tế hiện trường.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePassAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Điền nhanh: Đạt tất cả</span>
                </button>
              </div>

              {/* Item List */}
              <div className="space-y-3">
                {itemResults.map((item, idx) => (
                  <div
                    key={item.itemId || idx}
                    className={`rounded-2xl border p-4 transition-all ${
                      item.isNA
                        ? 'bg-gray-50/60 border-gray-200 opacity-80'
                        : item.booleanVal === 'FAIL' || item.isOutOfRange
                        ? 'bg-red-50/40 border-red-300'
                        : item.booleanVal === 'PASS' || (item.measuredVal !== null && !item.isOutOfRange)
                        ? 'bg-white border-emerald-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                            {item.code}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-500">{item.group}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              item.failureImpact === 'NOT_READY'
                                ? 'bg-red-100 text-red-700'
                                : item.failureImpact === 'CONDITIONAL_PRODUCTION'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {item.failureImpact === 'NOT_READY'
                              ? 'Chặn chạy máy'
                              : item.failureImpact === 'CONDITIONAL_PRODUCTION'
                              ? 'Chạy có điều kiện'
                              : 'Chỉ ghi nhận'}
                          </span>
                        </div>
                        <h4 className="mt-1 text-xs font-bold text-gray-900">{item.title}</h4>
                      </div>

                      {/* Response Inputs */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.responseType === 'BOOLEAN' && !item.isNA && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateBoolean(item.itemId, 'PASS')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                item.booleanVal === 'PASS'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              ĐẠT (PASS)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateBoolean(item.itemId, 'FAIL')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                item.booleanVal === 'FAIL'
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              LỖI (FAIL)
                            </button>
                          </div>
                        )}

                        {item.responseType === 'MEASUREMENT' && !item.isNA && (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                placeholder={`Chuẩn: ${item.minVal ?? '—'} đến ${item.maxVal ?? '—'}`}
                                value={item.measuredVal ?? ''}
                                onChange={(e) => handleUpdateMeasurement(item.itemId, e.target.value)}
                                className={`w-32 px-3 py-1.5 text-xs font-bold rounded-xl border focus:outline-none ${
                                  item.isOutOfRange
                                    ? 'border-red-500 bg-red-50 text-red-900'
                                    : item.measuredVal !== null
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-500">{item.unit}</span>
                            {item.isOutOfRange && (
                              <span className="text-[10px] font-bold text-red-600">Vượt chuẩn!</span>
                            )}
                          </div>
                        )}

                        {item.responseType === 'TEXT' && !item.isNA && (
                          <div className="flex-1 max-w-xs">
                            <input
                              type="text"
                              placeholder="Nhập ghi nhận thực tế..."
                              value={item.textVal || ''}
                              onChange={(e) => handleUpdateText(item.itemId, e.target.value)}
                              className="w-full text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                            />
                          </div>
                        )}

                        {/* N/A checkbox */}
                        <label className="flex items-center gap-1 text-[11px] font-medium text-gray-500 cursor-pointer ml-2">
                          <input
                            type="checkbox"
                            checked={item.isNA || false}
                            onChange={(e) => handleToggleNA(item.itemId, e.target.checked)}
                            className="rounded text-[#E31837] focus:ring-[#E31837]"
                          />
                          <span>N/A</span>
                        </label>
                      </div>
                    </div>

                    {/* N/A Reason input */}
                    {item.isNA && (
                      <div className="mt-2.5">
                        <input
                          type="text"
                          placeholder="Bắt buộc nêu lý do N/A (ví dụ: Chế độ rửa chưa hoạt động)..."
                          value={item.naReason || ''}
                          onChange={(e) => handleUpdateNaReason(item.itemId, e.target.value)}
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50/50 text-amber-900 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Note input and Quick Abnormality trigger */}
                    {(!item.isNA && (item.booleanVal === 'FAIL' || item.isOutOfRange)) && (
                      <div className="mt-3 pt-2.5 border-t border-red-200 flex flex-col md:flex-row items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Mô tả hiện trường lỗi phát hiện..."
                          value={item.note || ''}
                          onChange={(e) => handleUpdateNote(item.itemId, e.target.value)}
                          className="flex-1 w-full text-xs px-3 py-1.5 rounded-lg border border-red-300 bg-white text-gray-900 focus:outline-none"
                        />
                        {item.linkedAbnormalId ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 whitespace-nowrap">
                            ✓ Đã tạo phiếu Bất thường
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCreateAbnormalityFromItem(item)}
                            className="text-[10px] font-bold text-red-700 bg-red-100 hover:bg-red-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                          >
                            + Tạo Bất thường 1-chạm
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dynamic Conclusion Box */}
              <div
                className={`rounded-2xl p-4 border ${
                  evaluatedConclusion === 'READY'
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : evaluatedConclusion === 'CONDITIONAL'
                    ? 'bg-amber-50/70 border-amber-300'
                    : evaluatedConclusion === 'NOT_READY'
                    ? 'bg-red-50/70 border-red-300'
                    : 'bg-gray-100 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {evaluatedConclusion === 'READY' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                    {evaluatedConclusion === 'CONDITIONAL' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                    {evaluatedConclusion === 'NOT_READY' && <XCircle className="h-5 w-5 text-red-600" />}
                    {evaluatedConclusion === 'UNCHECKED' && <Clock className="h-5 w-5 text-gray-500" />}

                    <div>
                      <div className="text-xs font-bold uppercase text-gray-500">Kết luận đánh giá hệ thống:</div>
                      <div className="text-base font-extrabold text-gray-900">
                        {evaluatedConclusion === 'READY' && 'SẴN SÀNG SẢN XUẤT'}
                        {evaluatedConclusion === 'CONDITIONAL' && 'SẢN XUẤT CÓ ĐIỀU KIỆN'}
                        {evaluatedConclusion === 'NOT_READY' && 'CHƯA SẴN SÀNG SẢN XUẤT'}
                        {evaluatedConclusion === 'UNCHECKED' && 'CHƯA HOÀN THÀNH ĐỦ CÁC MỤC'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Production fields */}
                {evaluatedConclusion === 'CONDITIONAL' && (
                  <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                    <div>
                      <label className="block text-xs font-bold text-amber-900">
                        Điều kiện theo dõi & biện pháp kiểm soát <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={conditionsNote}
                        onChange={(e) => setConditionsNote(e.target.value)}
                        placeholder="Ghi rõ điều kiện cho phép chạy máy (ví dụ: Quan sát rò rỉ mỗi 2h, hạ áp suất hơi...)"
                        className="mt-1 w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-900">
                        Người phê duyệt cho phép chạy có điều kiện (Supervisor / Quản lý)
                      </label>
                      <input
                        type="text"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        placeholder="Tên Supervisor phê duyệt..."
                        className="mt-1 w-full text-xs p-2 rounded-xl border border-amber-300 bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#E31837] hover:bg-red-700 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Xác nhận & Lưu kết quả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: View past inspection details */}
      {viewLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Phiếu kiểm tra đầu ca</span>
                  {renderConclusionBadge(viewLogDetail.conclusion)}
                </div>
                <h3 className="mt-1 text-base font-bold text-gray-900">
                  {equipments.find((e) => e.id === viewLogDetail.equipmentId)?.name}
                </h3>
                <p className="text-xs text-gray-500">
                  Ngày: {viewLogDetail.productionDate} • Ca: {viewLogDetail.shiftId} • Lúc:{' '}
                  {formatDateTime(viewLogDetail.inspectedAt)}
                </p>
              </div>
              <button
                onClick={() => setViewLogDetail(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-500">Người nhận ca:</span>{' '}
                  <strong className="text-gray-900">{viewLogDetail.receiverName}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Người kiểm tra:</span>{' '}
                  <strong className="text-gray-900">{viewLogDetail.inspectorName}</strong>
                </div>
                {viewLogDetail.approverName && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Người duyệt điều kiện:</span>{' '}
                    <strong className="text-gray-900">{viewLogDetail.approverName}</strong>
                  </div>
                )}
              </div>

              {viewLogDetail.conditionsNote && (
                <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900">
                  <strong className="block font-bold">Điều kiện sản xuất cần theo dõi:</strong>
                  <p className="mt-0.5">{viewLogDetail.conditionsNote}</p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700">Chi tiết từng hạng mục ({viewLogDetail.items.length})</h4>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs">
                  {viewLogDetail.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white">
                      <div>
                        <div className="font-semibold text-gray-800">{it.title}</div>
                        <div className="text-[10px] text-gray-400">
                          {it.code} • {it.group}
                        </div>
                      </div>
                      <div className="text-right">
                        {it.isNA ? (
                          <span className="text-gray-400 font-bold">N/A</span>
                        ) : it.responseType === 'BOOLEAN' ? (
                          <span
                            className={`font-bold ${
                              it.booleanVal === 'PASS' ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {it.booleanVal}
                          </span>
                        ) : (
                          <span
                            className={`font-bold ${
                              it.isOutOfRange ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {it.measuredVal} {it.unit}
                          </span>
                        )}
                        {it.note && <div className="text-[10px] text-gray-500 italic">{it.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewLogDetail(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Copy Checklist Template */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-[#E31837]" />
                <h3 className="text-base font-bold text-gray-900">Sao chép mẫu Checklist giữa thiết bị</h3>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-gray-500">
                Sao chép cấu hình câu hỏi kiểm tra từ thiết bị nguồn sang các thiết bị đích cùng chủng loại. Lịch sử kiểm tra trước đó được bảo toàn nguyên vẹn.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700">Thiết bị nguồn có cấu hình:</label>
                <select
                  value={copySourceEqId}
                  onChange={(e) => setCopySourceEqId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
                >
                  <option value="">-- Chọn thiết bị nguồn --</option>
                  {lineEquipments
                    .filter((eq) => checklistConfigs.some((c) => c.equipmentId === eq.id && c.active))
                    .map((eq) => {
                      const count = checklistConfigs.filter((c) => c.equipmentId === eq.id && c.active).length;
                      return (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} ({eq.code}) - {count} hạng mục
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chọn các thiết bị đích cần áp dụng:
                </label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1.5 divide-y divide-gray-50">
                  {lineEquipments
                    .filter((eq) => eq.id !== copySourceEqId)
                    .map((eq) => {
                      const isChecked = copyTargetEqIds.includes(eq.id);
                      return (
                        <label
                          key={eq.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCopyTargetEqIds((prev) => [...prev, eq.id]);
                              } else {
                                setCopyTargetEqIds((prev) => prev.filter((id) => id !== eq.id));
                              }
                            }}
                            className="rounded text-[#E31837] focus:ring-[#E31837]"
                          />
                          <span className="font-semibold text-gray-800">{eq.name}</span>
                          <span className="text-[10px] text-gray-400">({eq.code})</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!copySourceEqId) {
                    alert('Vui lòng chọn thiết bị nguồn!');
                    return;
                  }
                  if (copyTargetEqIds.length === 0) {
                    alert('Vui lòng chọn ít nhất một thiết bị đích!');
                    return;
                  }
                  const res = copyChecklistTemplate(copySourceEqId, copyTargetEqIds);
                  if (res.success) {
                    alert(res.message);
                    setIsCopyModalOpen(false);
                    setCopyTargetEqIds([]);
                  } else {
                    alert(res.message);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#E31837] hover:bg-red-700 rounded-xl shadow-xs cursor-pointer"
              >
                Tiến hành sao chép
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  LossGroup,
  LossLog,
  ShiftId,
  Line,
  LossEventSource,
  LossOriginStage,
  ImpactType,
  EventImpactItem,
  ImpactConfirmationStatus,
} from '@/lib/types';
import {
  formatDateTime,
  formatTime,
  formatDateVN,
  calculateNonOverlappingMinutes,
  calculateImpactMetrics,
  calculateScopeLossMetrics,
  getImpactLabel,
  getImpactScope,
  getImpactStatusBadge,
  IMPACT_TYPE_DEFINITIONS,
  SHIFTS,
} from '@/lib/date-utils';
import { evaluateRuleSuggestions, RuleSuggestion } from '@/lib/rule-engine';
import { useCurrentTimestamp } from '@/hooks/use-current-time';
import {
  ClockAlert,
  Plus,
  Square,
  AlertCircle,
  BarChart3,
  Layers,
  CheckCircle2,
  Check,
  Clock,
  Sparkles,
  Wrench,
  Search,
  Eye,
  Trash2,
  Calendar,
  Filter,
  Info,
  X,
  ListFilter,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Activity,
  Edit3,
} from 'lucide-react';

const OFFICIAL_LOSS_GROUPS: LossGroup[] = [
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

const LOSS_SOURCES: LossEventSource[] = ['CBTO', 'Đóng gói', 'Utility', 'QA', 'Kho', 'Khác'];

const ORIGIN_STAGES: LossOriginStage[] = ['HTPG', 'Xay', 'Nấu', 'Làm nguội', 'Buffer', 'CIP', 'Đóng gói'];

const IMPACT_TYPES: ImpactType[] = [
  'NONE',
  'REDUCE_COOK_CAPACITY',
  'STOP_COOK',
  'STOP_FEED_PACKING',
  'COOLING_BUFFER_CONGESTION',
  'STOP_PACKING',
  'REDUCE_PACKING_SPEED',
];

const QUICK_PERCENTS = [25, 50, 75, 100];

const PRODUCTION_STAGES = [
  'Chuẩn bị & Nạp NVL (HTPG)',
  'Xay & Nghiền ớt cốt',
  'Gia nhiệt & Nồi nấu tương (Nấu)',
  'Phối trộn & Cánh khuấy',
  'Đồng hóa áp lực cao (Homogenizer)',
  'Trao đổi nhiệt Pasteur & Làm nguội (Làm nguội)',
  'Bồn đệm trung gian & Chờ tương (Buffer)',
  'Trạm rửa CIP & Tiệt trùng nước nóng (CIP)',
  'Chiết rót định lượng & Đóng nắp (Đóng gói)',
  'Máy vặn nắp & Dán nhãn chai',
  'Đóng thùng & Hoàn thiện',
  'Hệ thống Utility (Steam / Khí nén / Chân không / Cooling)',
  'Khu vực kiểm nghiệm QA / Hóa lý',
];

const DOWNTIME_REASONS: Record<LossGroup, string[]> = {
  Breakdown: [
    'Kẹt van xả máy đồng hóa áp lực cao',
    'Rò rỉ phốt cơ khí bồn nấu khi gia nhiệt',
    'Hỏng motor cánh khuấy / bạc đạn rung lắc',
    'Lỗi cảm biến nhiệt độ / áp suất màng',
    'Kẹt đầu vòi chiết rót định lượng',
    'Đứt xích truyền động / kẹt băng tải chai',
    'Lỗi chiller',
    'Sự cố cơ khí khác',
  ],
  'Chờ NVL': [
    'Chờ kho xuất ớt tươi / cốt ớt',
    'Chờ xuất gia vị, đường, muối, tỏi, tinh dầu',
    'Chờ bao bì vỏ chai, nắp chai, thùng carton',
    'Chờ kết quả kiểm nghiệm nguyên liệu đầu vào',
    'Chờ phụ gia chống oxy hóa / chất làm dày',
  ],
  Utility: [
    'Sụt áp suất hơi Steam (< 3.5 bar)',
    'Mất áp suất chân không Vacuum (< -0.7 bar)',
    'Sụt áp lực khí nén điều khiển hệ thống',
    'Nước làm mát giải nhiệt quá nhiệt (> 12°C)',
    'Mất điện nguồn / sụt điện lưới nhà máy',
  ],
  CIP: [
    'CIP Full',
    'CIP tuần hoàn bồn nấu định kỳ',
    'CIP đường ống chuyển tương',
    'CIP máy đồng hóa áp lực cao',
    'Xả tráng tiệt trùng nước nóng 90°C',
    'Vệ sinh CIP sau đổi mẻ sản xuất',
  ],
  'Hóa lý': [
    'Chờ HL BK',
    'Độ nhớt Brookfield lệch ngoài dải chuẩn',
    'Độ Brix chưa đạt yêu cầu công nghệ',
    'Chờ QA kiểm nghiệm vi sinh / cảm quan',
    'Hiệu chỉnh nồng độ pH axit mẻ tương',
    'Màu sắc tương chưa đạt chuẩn',
  ],
  'Chờ tương': [
    'Dừng nấu (ứ bồn ĐG)',
    'Buffer làm nguội',
    'Bồn đệm trung gian đầy (nghẽn downstream)',
    'Thiếu tương cấp vào máy chiết rót',
    'Tắc đường ống bơm chuyển tương',
    'Chờ giải phóng bồn chứa thành phẩm',
  ],
  Changeover: [
    'Chuyển đổi SKU sản phẩm trên Line',
    'Thay khuôn chiết và cữ chai mới',
    'Điều chỉnh kích thước nhãn chai tự động',
    'Cài đặt lại thông số chương trình PLC',
  ],
  'Vệ sinh': [
    'Vệ sinh sàn khu vực bồn nấu',
    'Vệ sinh ngoại quan máy móc thiết bị',
    'Vệ sinh định kỳ giữa ca sản xuất',
    'Thu gom phế phẩm và làm sạch đầu chiết',
  ],
  Khác: [
    'Họp an toàn 5S / giao việc đột xuất',
    'Đào tạo thao tác vận hành hiện trường',
    'Sự cố môi trường / kiểm tra định kỳ',
    'Lý do khác (ghi rõ ở phần Ghi chú)',
  ],
};

// Color badge helper for Lines to match shopfloor display exactly
const getLineBadgeStyle = (lineId: string, lines: Line[]) => {
  const line = lines.find((l) => l.id === lineId);
  const code = line?.code || lineId;
  const isLine2 = lineId === 'LINE_02' || code === 'L02';
  const isLine3 = lineId === 'LINE_03' || code === 'L03';
  const isLine1 = lineId === 'LINE_01' || code === 'L01';

  if (isLine2) {
    return {
      label: 'Auto 2',
      fullLabel: line?.name || 'Line Chiết 2',
      badgeClass: 'bg-teal-500 text-white font-bold',
      pillClass: 'bg-teal-700/90 text-white font-medium hover:bg-teal-600',
      timeClass: 'bg-teal-800 text-teal-100',
      durClass: 'bg-teal-600 text-white font-black',
      accentColor: '#14b8a6',
    };
  }
  if (isLine3) {
    return {
      label: 'Auto 3',
      fullLabel: line?.name || 'Line Chế biến 3',
      badgeClass: 'bg-amber-500 text-white font-bold',
      pillClass: 'bg-amber-600/90 text-white font-medium hover:bg-amber-500',
      timeClass: 'bg-amber-700 text-amber-100',
      durClass: 'bg-amber-500 text-slate-950 font-black',
      accentColor: '#f59e0b',
    };
  }
  if (isLine1) {
    return {
      label: 'Auto 1',
      fullLabel: line?.name || 'Line Chế biến 1',
      badgeClass: 'bg-orange-500 text-white font-bold',
      pillClass: 'bg-orange-600/90 text-white font-medium hover:bg-orange-500',
      timeClass: 'bg-orange-800 text-orange-100',
      durClass: 'bg-orange-500 text-white font-black',
      accentColor: '#f97316',
    };
  }
  return {
    label: code || 'Line',
    fullLabel: line?.name || 'Line Sản Xuất',
    badgeClass: 'bg-purple-600 text-white font-bold',
    pillClass: 'bg-purple-700/90 text-white font-medium hover:bg-purple-600',
    timeClass: 'bg-purple-800 text-purple-100',
    durClass: 'bg-purple-600 text-white font-black',
    accentColor: '#a855f7',
  };
};

const getShiftBadgeStyle = (shiftId: ShiftId) => {
  switch (shiftId) {
    case 'SHIFT_A':
      return { label: 'Ca 1', class: 'bg-teal-600/90 text-white font-bold' };
    case 'SHIFT_B':
      return { label: 'Ca 2', class: 'bg-sky-600/90 text-white font-bold' };
    case 'SHIFT_C':
      return { label: 'Ca 3', class: 'bg-indigo-600/90 text-white font-bold' };
    default:
      return { label: shiftId, class: 'bg-slate-700 text-slate-200' };
  }
};

interface ImpactIntervalDraft {
  tempId: string;
  impactType: ImpactType;
  affectedLineId: string;
  affectedStage: string;
  impactStartedAt: string;
  impactEndedAt: string | null;
  impactPercent: number | null; // null if insufficient data
  isInsufficientData: boolean;
  note: string;
  suggestedByRule?: string;
  userModifiedRule?: boolean;
}

export function LossModule() {
  const {
    currentUser,
    selectedLineId,
    selectedShiftId,
    selectedProductionDate,
    lines,
    skus,
    getEquipmentsByLine,
    downtimeReasons,
    lossLogs,
    startLossLog,
    endLossLog,
    updateLossLog,
    deleteLossLog,
    addImpactToEvent,
    confirmImpact,
    deleteImpact,
  } = useAppStore();

  const nowMs = useCurrentTimestamp();

  const [viewMode, setViewMode] = useState<'list' | 'entry' | 'analytics'>('list');

  // Filter states
  const [filterLineId, setFilterLineId] = useState<string>('ALL');
  const [filterShiftId, setFilterShiftId] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>(selectedProductionDate);
  const [isFilterAllDates, setIsFilterAllDates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [detailModalLog, setDetailModalLog] = useState<LossLog | null>(null);
  const [endingLogId, setEndingLogId] = useState<string | null>(null);
  const [endDateTimeInput, setEndDateTimeInput] = useState('');

  // Inline Quick Confirm for insufficient data / legacy in modal
  const [quickConfirmImpactId, setQuickConfirmImpactId] = useState<string | null>(null);
  const [quickConfirmPercent, setQuickConfirmPercent] = useState<number>(50);
  const [quickConfirmNote, setQuickConfirmNote] = useState<string>('');

  // ----------------------------------------------------
  // Form State: Event & Cause (Step 1)
  // ----------------------------------------------------
  const [formProdDay, setFormProdDay] = useState(selectedProductionDate);
  const [formSkuId, setFormSkuId] = useState(skus[0]?.id || '');
  const [formShiftId, setFormShiftId] = useState<ShiftId>(selectedShiftId);
  const [formLineId, setFormLineId] = useState(selectedLineId);
  const [formSource, setFormSource] = useState<LossEventSource>('CBTO');
  const [formOriginStage, setFormOriginStage] = useState<LossOriginStage>('Nấu');

  const lineEquipments = useMemo(() => getEquipmentsByLine(formLineId), [getEquipmentsByLine, formLineId]);
  const [formEquipmentId, setFormEquipmentId] = useState(lineEquipments[0]?.id || '');
  const [formStageDetail, setFormStageDetail] = useState(PRODUCTION_STAGES[2]);

  const [formCategory, setFormCategory] = useState<LossGroup>('Breakdown');
  const reasonsForCategory = useMemo(() => {
    const base = DOWNTIME_REASONS[formCategory] || [];
    const custom = (downtimeReasons || [])
      .filter((r) => r.category === formCategory)
      .map((r) => r.reason);
    return Array.from(new Set([...base, ...custom]));
  }, [formCategory, downtimeReasons]);
  const [formReason, setFormReason] = useState(reasonsForCategory[0] || '');
  const [formCauseCode, setFormCauseCode] = useState('BD-01');
  const [formDescription, setFormDescription] = useState('');
  const [formNote, setFormNote] = useState('');

  // Event Time
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const curHour = String(now.getHours()).padStart(2, '0');
  const curMin = String(now.getMinutes()).padStart(2, '0');

  const [startDay, setStartDay] = useState(todayStr);
  const [startHour, setStartHour] = useState(curHour);
  const [startMin, setStartMin] = useState(curMin);

  const [isOngoing, setIsOngoing] = useState(false);
  const [endDay, setEndDay] = useState(todayStr);
  const [endHour, setEndHour] = useState(curHour);
  const [endMin, setEndMin] = useState(curMin);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Event Duration
  const calculatedDuration = useMemo(() => {
    if (isOngoing) return 0;
    const startStr = `${startDay}T${startHour}:${startMin}:00`;
    const endStr = `${endDay}T${endHour}:${endMin}:00`;
    const s = new Date(startStr).getTime();
    const e = new Date(endStr).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.max(0, Math.round((e - s) / 60000));
  }, [isOngoing, startDay, startHour, startMin, endDay, endHour, endMin]);

  // ----------------------------------------------------
  // Step 2 & 3: Operational Impact Intervals Draft
  // ----------------------------------------------------
  const startIsoString = useMemo(() => {
    try {
      return new Date(`${startDay}T${startHour}:${startMin}:00`).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }, [startDay, startHour, startMin]);

  const endIsoString = useMemo(() => {
    if (isOngoing) return null;
    try {
      return new Date(`${endDay}T${endHour}:${endMin}:00`).toISOString();
    } catch {
      return null;
    }
  }, [isOngoing, endDay, endHour, endMin]);

  const [draftImpacts, setDraftImpacts] = useState<ImpactIntervalDraft[]>([
    {
      tempId: 'DRAFT_1',
      impactType: 'REDUCE_COOK_CAPACITY',
      affectedLineId: formLineId,
      affectedStage: 'Nấu',
      impactStartedAt: startIsoString,
      impactEndedAt: endIsoString,
      impactPercent: 50,
      isInsufficientData: false,
      note: 'Giảm năng lực nấu do sự cố cụm nồi',
    },
  ]);

  // Keep draft start/end in sync with master event if user hasn't created custom sub-intervals
  const syncDraftTimestamps = (newStart: string, newEnd: string | null) => {
    setDraftImpacts((prev) =>
      prev.map((imp, idx) => {
        if (idx === 0 && prev.length === 1) {
          return {
            ...imp,
            impactStartedAt: newStart,
            impactEndedAt: newEnd,
          };
        }
        return imp;
      })
    );
  };

  // Evaluate Rule Engine Suggestions based on current form context
  const ruleSuggestions: RuleSuggestion[] = useMemo(() => {
    const eq = lineEquipments.find((e) => e.id === formEquipmentId);
    return evaluateRuleSuggestions({
      source: formSource,
      originStage: formOriginStage,
      lineId: formLineId,
      equipmentId: formEquipmentId,
      equipmentName: eq?.name,
      lossGroup: formCategory,
      downtimeReason: formReason,
      description: formDescription,
      line2ActiveKettlesCount: 1, // Line 2 1 out of 2 kettle running
      totalKettles: 2,
    });
  }, [formSource, formOriginStage, formLineId, formEquipmentId, lineEquipments, formCategory, formReason, formDescription]);

  // Apply a Rule Engine suggestion to the draft
  const handleApplyRuleSuggestion = (sug: RuleSuggestion) => {
    const isNone = sug.suggestedImpactType === 'NONE';
    const isCongestion = sug.suggestedImpactType === 'COOLING_BUFFER_CONGESTION';
    const percent = isNone ? 0 : isCongestion ? null : sug.suggestedPercent ?? 100;

    const newDraft: ImpactIntervalDraft = {
      tempId: `SUG_${sug.ruleId}`,
      impactType: sug.suggestedImpactType,
      affectedLineId: formLineId,
      affectedStage: formOriginStage,
      impactStartedAt: startIsoString,
      impactEndedAt: endIsoString,
      impactPercent: percent,
      isInsufficientData: isCongestion && percent === null,
      note: `Áp dụng theo gợi ý từ Rule Engine: ${sug.title}`,
      suggestedByRule: sug.ruleId,
      userModifiedRule: false,
    };

    setDraftImpacts([newDraft]);
  };

  // Add another impact interval for multi-interval events
  const handleAddDraftInterval = () => {
    // If current draft has "NONE", cannot add multi-impacts
    if (draftImpacts.some((d) => d.impactType === 'NONE')) {
      alert('Sự kiện đang chọn "Không ảnh hưởng vận hành" (tùy chọn loại trừ). Hãy đổi loại ảnh hưởng trước khi thêm khoảng mới.');
      return;
    }

    const newInterval: ImpactIntervalDraft = {
      tempId: `DRAFT_${draftImpacts.length + 1}`,
      impactType: 'STOP_COOK',
      affectedLineId: formLineId,
      affectedStage: formOriginStage,
      impactStartedAt: startIsoString,
      impactEndedAt: endIsoString,
      impactPercent: 100,
      isInsufficientData: false,
      note: 'Khoảng ảnh hưởng tiếp theo',
      userModifiedRule: true,
    };
    setDraftImpacts((prev) => [...prev, newInterval]);
  };

  const handleUpdateDraftInterval = (tempId: string, updates: Partial<ImpactIntervalDraft>) => {
    setDraftImpacts((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const merged = { ...item, ...updates, userModifiedRule: true };

        // Mutual exclusivity: If NONE is selected, percent becomes 0
        if (merged.impactType === 'NONE') {
          merged.impactPercent = 0;
          merged.isInsufficientData = false;
        } else if (merged.impactType === 'COOLING_BUFFER_CONGESTION' && merged.isInsufficientData) {
          merged.impactPercent = null;
        }

        return merged;
      })
    );
  };

  const handleDeleteDraftInterval = (tempId: string) => {
    if (draftImpacts.length <= 1) {
      alert('Sự kiện phải có ít nhất một khai báo ảnh hưởng vận hành!');
      return;
    }
    setDraftImpacts((prev) => prev.filter((d) => d.tempId !== tempId));
  };

  // Calculate live preview metrics for draft impacts
  const draftMetricsSummary = useMemo(() => {
    let totalConvertedLoss = 0;
    let hasInsufficientData = false;

    draftImpacts.forEach((imp) => {
      const metrics = calculateImpactMetrics(
        {
          impactType: imp.impactType,
          impactStartedAt: imp.impactStartedAt,
          impactEndedAt: imp.impactEndedAt,
          impactPercent: imp.isInsufficientData ? null : imp.impactPercent,
        },
        nowMs
      );

      if (metrics.convertedLossMinutes !== null) {
        totalConvertedLoss += metrics.convertedLossMinutes;
      } else {
        hasInsufficientData = true;
      }
    });

    return {
      totalConvertedLoss,
      hasInsufficientData,
    };
  }, [draftImpacts, nowMs]);

  // Form submission
  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (formCategory === 'Khác' && !formNote.trim()) {
      setFormError('Nhóm Loss "Khác" bắt buộc phải nhập ghi chú giải trình!');
      return;
    }

    if (!isOngoing) {
      const eDate = new Date(endIsoString || '');
      const sDate = new Date(startIsoString);
      if (eDate.getTime() < sDate.getTime()) {
        setFormError('Thời gian kết thúc không được nhỏ hơn thời gian bắt đầu (AC-07)!');
        return;
      }
    }

    // Convert draft impacts to EventImpactItem
    const finalImpacts: EventImpactItem[] = draftImpacts.map((d, idx) => {
      const metrics = calculateImpactMetrics(
        {
          impactType: d.impactType,
          impactStartedAt: d.impactStartedAt,
          impactEndedAt: d.impactEndedAt,
          impactPercent: d.isInsufficientData ? null : d.impactPercent,
        },
        nowMs || Date.now()
      );

      return {
        impactId: `IMP_${Date.now()}_${idx}`,
        eventId: '',
        impactType: d.impactType,
        impactScope: getImpactScope(d.impactType),
        affectedLineId: d.affectedLineId || formLineId,
        affectedStage: d.affectedStage || formOriginStage,
        affectedEquipmentId: formEquipmentId,
        impactStartedAt: d.impactStartedAt,
        impactEndedAt: d.impactEndedAt,
        impactPercent: d.isInsufficientData ? null : d.impactPercent,
        convertedLossMinutes: metrics.convertedLossMinutes,
        confirmationStatus: d.isInsufficientData
          ? 'INSUFFICIENT_DATA'
          : d.impactEndedAt === null
          ? 'PROVISIONAL'
          : 'CONFIRMED',
        suggestedByRule: d.suggestedByRule,
        userModifiedRule: d.userModifiedRule,
        confirmedBy: currentUser.uid,
        confirmedByName: currentUser.displayName,
        confirmedAt: new Date().toISOString(),
        note: d.note,
      };
    });

    const res = startLossLog({
      lineId: formLineId,
      skuId: formSkuId,
      equipmentId: formEquipmentId,
      lossGroup: formCategory,
      causeCode: formCauseCode,
      source: formSource,
      originStage: formOriginStage,
      description: formDescription,
      productionStage: formStageDetail,
      downtimeReason: formReason,
      note: formNote.trim(),
      affectsLineStop: draftImpacts.some((d) => d.impactType !== 'NONE'),
      productionDate: formProdDay,
      shiftId: formShiftId,
      startedAt: startIsoString,
      endedAt: endIsoString,
      durationMinutes: calculatedDuration,
      impacts: finalImpacts,
    });

    if (!res.success) {
      setFormError(res.message || 'Lỗi lưu thông tin sự cố');
      return;
    }

    setFormSuccess('✓ Đã ghi nhận Sự cố & Ảnh hưởng vận hành thành công!');
    setFormDescription('');
    setFormNote('');
    setTimeout(() => {
      setFormSuccess('');
      setFilterLineId(formLineId);
      setViewMode('list');
    }, 1000);
  };

  // Close ongoing stop
  const handleOpenEndModal = (id: string) => {
    setEndingLogId(id);
    const d = new Date();
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEndDateTimeInput(localIso);
  };

  const handleConfirmEndLoss = () => {
    if (!endingLogId) return;
    const endIso = endDateTimeInput ? new Date(endDateTimeInput).toISOString() : new Date().toISOString();
    const res = endLossLog(endingLogId, endIso);
    if (!res.success) {
      alert(res.message);
      return;
    }
    setEndingLogId(null);
    if (detailModalLog && detailModalLog.id === endingLogId) {
      setDetailModalLog(null);
    }
  };

  const handleDeleteLog = (id: string, reasonTitle?: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bản ghi dừng máy "${reasonTitle || id}"?`)) {
      deleteLossLog(id);
      if (detailModalLog && detailModalLog.id === id) {
        setDetailModalLog(null);
      }
    }
  };

  // Quick confirm unreviewed/insufficient impact in modal
  const handleQuickConfirmImpact = (eventId: string, impactId: string) => {
    confirmImpact(eventId, impactId, quickConfirmPercent, quickConfirmNote || 'Đã xác nhận mức ảnh hưởng thực tế.');
    setQuickConfirmImpactId(null);
    setQuickConfirmNote('');
    // Refresh detail modal view
    const updatedLog = lossLogs.find((l) => l.id === eventId);
    if (updatedLog) setDetailModalLog(updatedLog);
  };

  // Filtered loss logs
  const filteredLossLogs = useMemo(() => {
    return lossLogs.filter((log) => {
      if (filterLineId !== 'ALL' && log.lineId !== filterLineId) return false;
      if (filterShiftId !== 'ALL' && log.shiftId !== filterShiftId) return false;
      if (!isFilterAllDates && log.productionDate !== filterDate) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const reason = (log.downtimeReason || '').toLowerCase();
        const note = (log.note || '').toLowerCase();
        const group = (log.lossGroup || '').toLowerCase();
        const src = (log.source || '').toLowerCase();
        const orgStage = (log.originStage || '').toLowerCase();
        const reported = (log.reportedByName || '').toLowerCase();
        const eq = (log.equipmentId || '').toLowerCase();
        const impactsMatch = (log.impacts || []).some((imp) =>
          getImpactLabel(imp.impactType).toLowerCase().includes(term)
        );
        return (
          reason.includes(term) ||
          note.includes(term) ||
          group.includes(term) ||
          src.includes(term) ||
          orgStage.includes(term) ||
          reported.includes(term) ||
          eq.includes(term) ||
          impactsMatch
        );
      }
      return true;
    });
  }, [lossLogs, filterLineId, filterShiftId, filterDate, isFilterAllDates, searchTerm]);

  // Aggregate scope-based loss metrics across filtered logs
  const scopeLossMetrics = useMemo(() => {
    const allImpacts = filteredLossLogs.flatMap((l) => l.impacts || []);
    return calculateScopeLossMetrics(allImpacts, nowMs);
  }, [filteredLossLogs, nowMs]);

  // Top active ongoing losses
  const activeLossesOnLine = useMemo(() => {
    return lossLogs.filter((l) => l.lineId === selectedLineId && l.endedAt === null);
  }, [lossLogs, selectedLineId]);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* TOP HEADER: TITLE & 3 VIEW MODES                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-950/60 shrink-0">
            <ClockAlert className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                QUẢN LÝ DỪNG MÁY & LOSS CBTO
              </h1>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                Mô Hình Ảnh Hưởng Vận Hành
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tách biệt: Nguồn · Nguyên nhân · Công đoạn · Ảnh hưởng vận hành · Mức độ % · Loss quy đổi
            </p>
          </div>
        </div>

        {/* 3 Main View Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-800/90 p-1 border border-slate-700/80 self-start sm:self-center">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Nhật ký Loss theo Line</span>
            <span className="ml-1 rounded-full bg-slate-900/40 px-1.5 py-0.2 text-[10px] font-mono">
              {filteredLossLogs.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('entry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'entry'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nhập Down Time Mới</span>
          </button>

          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Phân bổ 9 Nhóm & Phạm vi</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: NHẬT KÝ LOSS CHI TIẾT THEO LINE                                     */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Quick Filter Bar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Line Selector Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Line:
                </span>
                <button
                  onClick={() => setFilterLineId('ALL')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filterLineId === 'ALL'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tất cả các Line ({lossLogs.length})
                </button>
                {lines.map((l) => {
                  const b = getLineBadgeStyle(l.id, lines);
                  const isSel = filterLineId === l.id;
                  const count = lossLogs.filter((x) => x.lineId === l.id).length;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setFilterLineId(l.id)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        isSel
                          ? `${b.badgeClass} shadow-md`
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{b.label}</span>
                      <span className="text-[10px] opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Button: Nhập Loss Mới */}
              <button
                onClick={() => setViewMode('entry')}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 text-xs font-black text-indigo-950 shadow-lg shadow-amber-950/40 transition-all cursor-pointer active:scale-95 ml-auto"
              >
                <Plus className="h-4 w-4" />
                <span>+ Ghi Nhận Sự Cố & Ảnh Hưởng</span>
              </button>
            </div>

            {/* Bottom row: Shift Pills + Date Filter + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 mr-1">Ca SX:</span>
                <button
                  onClick={() => setFilterShiftId('ALL')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                    filterShiftId === 'ALL'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tất cả Ca
                </button>
                {SHIFTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterShiftId(s.id)}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                      filterShiftId === s.id
                        ? 'bg-orange-600 text-white font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-800/90 rounded-lg px-2 py-1 border border-slate-700 text-xs">
                  <Calendar className="h-3 w-3 text-amber-400" />
                  <input
                    type="date"
                    disabled={isFilterAllDates}
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setIsFilterAllDates(false);
                    }}
                    className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer disabled:opacity-40"
                  />
                  <button
                    onClick={() => {
                      setFilterDate(todayStr);
                      setIsFilterAllDates(false);
                    }}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      !isFilterAllDates && filterDate === todayStr
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    onClick={() => setIsFilterAllDates(!isFilterAllDates)}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isFilterAllDates
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tất cả ngày
                  </button>
                </div>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm sự cố, ảnh hưởng, nguồn..."
                    className="rounded-lg border border-slate-700 bg-slate-800/90 pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-400 focus:outline-none w-48 sm:w-60"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scope-separated Loss Metrics Bar (Anti-Duplication Principle) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {/* Scope 1: Nấu */}
            <div className="rounded-xl border border-sky-800/60 bg-sky-950/20 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-sky-400 font-bold uppercase tracking-wider">
                <span>Phạm Vi Cụm Nấu</span>
                <span className="text-[10px] text-sky-300/80">Công đoạn Nấu</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white font-mono">
                  {scopeLossMetrics['Nấu'].totalConvertedLossMinutes}m
                </span>
                <span className="text-xs text-sky-300">
                  sự cố: {scopeLossMetrics['Nấu'].totalDurationMinutes}m
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Tổn thất quy đổi tương đương độc lập công đoạn Nấu
              </p>
            </div>

            {/* Scope 2: Cấp tương */}
            <div className="rounded-xl border border-teal-800/60 bg-teal-950/20 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-teal-400 font-bold uppercase tracking-wider">
                <span>Phạm Vi Cấp Tương</span>
                <span className="text-[10px] text-teal-300/80">Buffer / Làm nguội</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white font-mono">
                  {scopeLossMetrics['Cấp tương'].totalConvertedLossMinutes}m
                </span>
                {scopeLossMetrics['Cấp tương'].hasInsufficientData && (
                  <span className="text-[10px] rounded px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Chưa đủ dữ liệu ứ bồn
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Dừng cấp tương hoặc ứ bồn trung gian
              </p>
            </div>

            {/* Scope 3: Đóng gói */}
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                <span>Phạm Vi Đóng Gói</span>
                <span className="text-[10px] text-amber-300/80">Chiết rót / Đóng thùng</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white font-mono">
                  {scopeLossMetrics['Đóng gói'].totalConvertedLossMinutes}m
                </span>
                <span className="text-xs text-amber-300">
                  sự cố: {scopeLossMetrics['Đóng gói'].totalDurationMinutes}m
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Không cộng mù quáng vào tổng giờ của toàn xưởng
              </p>
            </div>

            {/* Scope 4: Status overview */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                Theo Dõi Sự Cố Đang Mở
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-rose-400 font-mono">
                  {filteredLossLogs.filter((l) => l.endedAt === null).length} sự cố
                </span>
                <span className="text-xs text-amber-300">
                  {filteredLossLogs.length} tổng sự kiện
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Tạm tính thời gian thực tế đến thời điểm hiện tại
              </p>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* THE SHOPFLOOR LOSS LIST TABLE                                         */}
          {/* ===================================================================== */}
          <div className="rounded-2xl border-2 border-amber-500/70 bg-gradient-to-b from-[#24083d] via-[#1a052e] to-[#0f031b] p-2.5 sm:p-4 shadow-2xl space-y-2">
            {/* Header Box */}
            <div className="rounded-xl border-2 border-amber-400/90 bg-amber-400/10 px-3 py-2 text-amber-300 font-black text-xs shadow-md">
              <div className="grid grid-cols-12 gap-2 items-center text-center">
                <div className="col-span-1">Line</div>
                <div className="col-span-1">Ca / Nguồn</div>
                <div className="col-span-4 text-left pl-2">Sự kiện & Nguyên nhân gốc</div>
                <div className="col-span-4 text-left pl-2">Ảnh hưởng vận hành thực tế & Loss quy đổi</div>
                <div className="col-span-1">Thời gian</div>
                <div className="col-span-1 text-center">Rà soát</div>
              </div>
            </div>

            {/* Rows List */}
            {filteredLossLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-3">
                <p className="text-sm font-semibold">Chưa có sự cố nào thỏa mãn bộ lọc hiện tại.</p>
                <button
                  onClick={() => setViewMode('entry')}
                  className="rounded-lg bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-indigo-950 shadow transition-colors cursor-pointer"
                >
                  + Ghi Nhận Sự Cố Mới
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLossLogs.map((log) => {
                  const lineBadge = getLineBadgeStyle(log.lineId, lines);
                  const shiftBadge = getShiftBadgeStyle(log.shiftId);
                  const isLogOngoing = log.endedAt === null;
                  const impacts = log.impacts || [];

                  return (
                    <div
                      key={log.id}
                      className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 hover:border-amber-500/50 transition-all text-xs"
                    >
                      <div className="grid grid-cols-12 gap-2 items-start">
                        {/* 1. Line Pill */}
                        <div className="col-span-1 flex flex-col items-center gap-1">
                          <span className={`w-full py-1 px-1 rounded-full text-[11px] font-bold shadow text-center truncate ${lineBadge.badgeClass}`}>
                            {lineBadge.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateVN(log.productionDate).slice(0, 5)}
                          </span>
                        </div>

                        {/* 2. Shift & Origin Source */}
                        <div className="col-span-1 flex flex-col items-center gap-1">
                          <span className={`w-full py-0.5 px-1 rounded-full text-[10px] text-center font-bold shadow ${shiftBadge.class}`}>
                            {shiftBadge.label}
                          </span>
                          <span className="rounded px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold truncate w-full text-center" title={`Nguồn: ${log.source}`}>
                            {log.source || 'CBTO'}
                          </span>
                        </div>

                        {/* 3. Cause & Origin Stage */}
                        <div className="col-span-4 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100 text-sm">
                              {log.downtimeReason || log.lossGroup}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                              {log.lossGroup}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                            <span>Công đoạn gốc: <strong className="text-amber-300">{log.originStage || 'Nấu'}</strong></span>
                            <span>·</span>
                            <span>Mô tả: {log.description || log.note || 'Không có mô tả chi tiết'}</span>
                          </div>

                          <div className="text-[10px] text-slate-500 flex items-center gap-2">
                            <span>Sự cố: {formatTime(log.startedAt)} - {log.endedAt ? formatTime(log.endedAt) : 'Đang xảy ra'} ({log.durationMinutes}m)</span>
                            <span>·</span>
                            <span>Người ghi: {log.reportedByName || 'NV'}</span>
                          </div>
                        </div>

                        {/* 4. Confirmed Operational Impacts (Child blocks) */}
                        <div className="col-span-4 space-y-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                          {impacts.length === 0 ? (
                            <div className="text-slate-500 italic text-[11px]">
                              Chưa gắn khoảng ảnh hưởng vận hành nào
                            </div>
                          ) : (
                            impacts.map((imp) => {
                              const badge = getImpactStatusBadge(imp.confirmationStatus);
                              return (
                                <div
                                  key={imp.impactId}
                                  className="flex items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1 last:border-b-0 last:pb-0"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-200 truncate">
                                        {getImpactLabel(imp.impactType)}
                                      </span>
                                      {imp.impactPercent !== null ? (
                                        <span className="text-[10px] font-mono font-bold text-amber-400">
                                          ({imp.impactPercent}%)
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-purple-400 font-bold">
                                          (Chưa định %)
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Phạm vi: <strong>{imp.impactScope}</strong> · {formatTime(imp.impactStartedAt)} - {imp.impactEndedAt ? formatTime(imp.impactEndedAt) : 'Đang tiếp diễn'}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {imp.convertedLossMinutes !== null ? (
                                      <span className="font-mono font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 text-xs">
                                        {imp.convertedLossMinutes}m quy đổi
                                      </span>
                                    ) : (
                                      <span className="font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 text-[10px]">
                                        Chưa đủ dữ liệu
                                      </span>
                                    )}

                                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${badge.badgeClass}`}>
                                      {badge.label}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* 5. Total Duration & Ongoing action */}
                        <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                          <span className={`px-2 py-1 rounded-full font-mono font-bold text-xs shadow ${lineBadge.durClass}`}>
                            {log.durationMinutes}m
                          </span>
                          {isLogOngoing && (
                            <button
                              onClick={() => handleOpenEndModal(log.id)}
                              className="w-full text-[10px] py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold animate-pulse cursor-pointer shadow text-center"
                            >
                              Đang dừng
                            </button>
                          )}
                        </div>

                        {/* 6. View & Review Actions */}
                        <div className="col-span-1 flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setDetailModalLog(log)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Xem chi tiết & Rà soát ảnh hưởng"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id, log.downtimeReason)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Xóa sự cố"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: GHI NHẬN SỰ CỐ & KHAI BÁO ẢNH HƯỞNG VẬN HÀNH (3 BƯỚC)              */}
      {/* ========================================================================= */}
      {viewMode === 'entry' && (
        <form onSubmit={handleConfirmSubmit} className="space-y-6">
          {formError && (
            <div className="rounded-xl border border-rose-500 bg-rose-950/50 p-3.5 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="rounded-xl border border-emerald-500 bg-emerald-950/50 p-3.5 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* BƯỚC 1: KHAI BÁO SỰ KIỆN & NGUYÊN NHÂN PHÁT SINH                      */}
          {/* --------------------------------------------------------------------- */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                  1
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Thông Tin Sự Kiện & Nguyên Nhân Phát Sinh
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Tách độc lập: Nguồn · Nguyên nhân · Công đoạn</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Nguồn phát sinh */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nguồn phát sinh <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value as LossEventSource)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                >
                  {LOSS_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Công đoạn phát sinh */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Công đoạn phát sinh <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formOriginStage}
                  onChange={(e) => setFormOriginStage(e.target.value as LossOriginStage)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                >
                  {ORIGIN_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dây chuyền */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dây chuyền</label>
                <select
                  value={formLineId}
                  onChange={(e) => {
                    setFormLineId(e.target.value);
                    const eqs = getEquipmentsByLine(e.target.value);
                    if (eqs.length > 0) setFormEquipmentId(eqs[0].id);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Thiết bị phát sinh */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Thiết bị phát sinh</label>
                <select
                  value={formEquipmentId}
                  onChange={(e) => setFormEquipmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                >
                  {lineEquipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nhóm nguyên nhân MVP (9 nhóm) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nhóm nguyên nhân (9 nhóm MVP) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => {
                    const grp = e.target.value as LossGroup;
                    setFormCategory(grp);
                    const base = DOWNTIME_REASONS[grp] || [];
                    if (base.length > 0) setFormReason(base[0]);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                >
                  {OFFICIAL_LOSS_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nguyên nhân chi tiết */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nguyên nhân chi tiết</label>
                <select
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                >
                  {reasonsForCategory.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mã nguyên nhân (Cause code) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mã nguyên nhân</label>
                <input
                  type="text"
                  value={formCauseCode}
                  onChange={(e) => setFormCauseCode(e.target.value)}
                  placeholder="Ví dụ: BD-MECH-01"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Ca sản xuất */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ca sản xuất</label>
                <select
                  value={formShiftId}
                  onChange={(e) => setFormShiftId(e.target.value as ShiftId)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                >
                  {SHIFTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.displayTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mô tả sự kiện */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                <label className="block text-slate-300 font-semibold mb-1">
                  Mô tả sự kiện chi tiết <span className="text-slate-400 font-normal">(Hiện trường ghi nhận)</span>
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả hiện tượng: rung motor, sụt áp steam, rò rỉ phốt, tắc bơm..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white focus:border-amber-400 focus:outline-none text-xs"
                />
              </div>

              {/* Thời điểm bắt đầu sự cố */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Thời điểm bắt đầu sự cố</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={startDay}
                    onChange={(e) => {
                      setStartDay(e.target.value);
                      const s = new Date(`${e.target.value}T${startHour}:${startMin}:00`).toISOString();
                      syncDraftTimestamps(s, endIsoString);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={startHour}
                    onChange={(e) => {
                      setStartHour(e.target.value);
                      const s = new Date(`${startDay}T${e.target.value}:${startMin}:00`).toISOString();
                      syncDraftTimestamps(s, endIsoString);
                    }}
                    placeholder="HH (0-23)"
                    className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-mono text-center focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={startMin}
                    onChange={(e) => {
                      setStartMin(e.target.value);
                      const s = new Date(`${startDay}T${startHour}:${e.target.value}:00`).toISOString();
                      syncDraftTimestamps(s, endIsoString);
                    }}
                    placeholder="MM (0-59)"
                    className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-mono text-center focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Thời điểm kết thúc hoặc Đang diễn ra */}
              <div className="col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Thời điểm kết thúc sự cố</label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-rose-300 font-bold">
                    <input
                      type="checkbox"
                      checked={isOngoing}
                      onChange={(e) => {
                        setIsOngoing(e.target.checked);
                        syncDraftTimestamps(startIsoString, e.target.checked ? null : endIsoString);
                      }}
                      className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Sự cố đang diễn ra (Tạm tính)</span>
                  </label>
                </div>

                {!isOngoing ? (
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={endDay}
                      onChange={(e) => {
                        setEndDay(e.target.value);
                        const end = new Date(`${e.target.value}T${endHour}:${endMin}:00`).toISOString();
                        syncDraftTimestamps(startIsoString, end);
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={endHour}
                      onChange={(e) => {
                        setEndHour(e.target.value);
                        const end = new Date(`${endDay}T${e.target.value}:${endMin}:00`).toISOString();
                        syncDraftTimestamps(startIsoString, end);
                      }}
                      placeholder="HH (0-23)"
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-mono text-center focus:border-amber-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={endMin}
                      onChange={(e) => {
                        setEndMin(e.target.value);
                        const end = new Date(`${endDay}T${endHour}:${e.target.value}:00`).toISOString();
                        syncDraftTimestamps(startIsoString, end);
                      }}
                      placeholder="MM (0-59)"
                      className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-mono text-center focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2 text-center text-rose-300 text-xs font-semibold">
                    Đang tính toán tạm thời theo thời gian thực hiện trường...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* BƯỚC 2: RULE ENGINE GỢI Ý THÔNG MINH (CBTO ADVISORY)                  */}
          {/* --------------------------------------------------------------------- */}
          {ruleSuggestions.length > 0 && (
            <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Rule Engine: Gợi Ý Đánh Giá Ảnh Hưởng Vận Hành (Advisory Only)</span>
                </div>
                <span className="text-[10px] text-slate-400 italic">
                  Không tự động áp dụng — Người dùng luôn xác nhận hoặc chỉnh sửa
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ruleSuggestions.map((sug) => (
                  <div
                    key={sug.ruleId}
                    className="rounded-xl border border-amber-500/30 bg-slate-900/90 p-3 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{sug.title}</span>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                          {getImpactLabel(sug.suggestedImpactType)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{sug.rationale}</p>
                      {sug.warningNote && (
                        <p className="text-[10px] text-amber-300/90 bg-amber-950/40 p-1.5 rounded mt-1.5 border border-amber-800/40">
                          ⚠ {sug.warningNote}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                      <span className="text-[10px] font-mono text-slate-400">
                        Mức gợi ý: <strong>{sug.suggestedPercent !== null ? `${sug.suggestedPercent}%` : 'Chưa định %'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyRuleSuggestion(sug)}
                        className="rounded-lg bg-amber-400 hover:bg-amber-300 px-3 py-1 font-bold text-[11px] text-indigo-950 shadow transition-colors cursor-pointer"
                      >
                        Áp Dụng Gợi Ý
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* BƯỚC 3: KHAI BÁO CÁC KHOẢNG ẢNH HƯỞNG VẬN HÀNH THỰC TẾ               */}
          {/* --------------------------------------------------------------------- */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Khai Báo Ảnh Hưởng Vận Hành Thực Tế
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Công thức: <strong>Loss quy đổi (phút) = Thời gian ảnh hưởng (phút) × Mức ảnh hưởng (%) / 100</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddDraftInterval}
                  className="flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-900/60 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Thêm Khoảng Mức Độ Khác</span>
                </button>
              </div>
            </div>

            {/* Intervals List */}
            <div className="space-y-3">
              {draftImpacts.map((draft, idx) => {
                const isNone = draft.impactType === 'NONE';
                const isCongestion = draft.impactType === 'COOLING_BUFFER_CONGESTION';
                const metrics = calculateImpactMetrics(
                  {
                    impactType: draft.impactType,
                    impactStartedAt: draft.impactStartedAt,
                    impactEndedAt: draft.impactEndedAt,
                    impactPercent: draft.isInsufficientData ? null : draft.impactPercent,
                  },
                  nowMs
                );

                return (
                  <div
                    key={draft.tempId}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                          Khoảng {idx + 1}
                        </span>
                        <span className="text-slate-300 font-semibold">
                          Phạm vi: <strong className="text-amber-400">{getImpactScope(draft.impactType)}</strong>
                        </span>
                      </div>

                      {draftImpacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDraftInterval(draft.tempId)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Xóa khoảng này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Loại ảnh hưởng */}
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          Loại ảnh hưởng <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={draft.impactType}
                          onChange={(e) => {
                            const val = e.target.value as ImpactType;
                            handleUpdateDraftInterval(draft.tempId, {
                              impactType: val,
                              impactPercent: val === 'NONE' ? 0 : val === 'COOLING_BUFFER_CONGESTION' ? null : 100,
                              isInsufficientData: val === 'COOLING_BUFFER_CONGESTION',
                            });
                          }}
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                        >
                          {IMPACT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {getImpactLabel(t)} {t === 'NONE' ? '(Loại trừ, 0% Loss)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Công đoạn chịu ảnh hưởng */}
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Công đoạn chịu ảnh hưởng</label>
                        <select
                          value={draft.affectedStage}
                          onChange={(e) => handleUpdateDraftInterval(draft.tempId, { affectedStage: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-medium focus:border-amber-400 focus:outline-none"
                        >
                          {ORIGIN_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Mức độ ảnh hưởng (%) */}
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-slate-300 font-semibold mb-1">
                          Mức độ ảnh hưởng (%) {isNone && '— 0% (Loại trừ)'}
                        </label>
                        {isNone ? (
                          <div className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 italic">
                            Không ảnh hưởng vận hành: Mức ảnh hưởng 0%, Loss quy đổi bằng 0.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {QUICK_PERCENTS.map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => handleUpdateDraftInterval(draft.tempId, { impactPercent: pct, isInsufficientData: false })}
                                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                    draft.impactPercent === pct && !draft.isInsufficientData
                                      ? 'bg-amber-400 text-slate-950 font-black shadow'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}

                              {/* Manual Input */}
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[11px] text-slate-400">Tùy chỉnh:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={draft.impactPercent ?? ''}
                                  disabled={draft.isInsufficientData}
                                  onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : null;
                                    handleUpdateDraftInterval(draft.tempId, { impactPercent: val, isInsufficientData: false });
                                  }}
                                  placeholder="1-100"
                                  className="w-16 rounded border border-slate-700 bg-slate-800 p-1 text-white font-mono text-center focus:border-amber-400 focus:outline-none"
                                />
                                <span className="text-slate-400">%</span>
                              </div>
                            </div>

                            {/* Insufficient data checkbox for cooling congestion */}
                            {isCongestion && (
                              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-purple-300">
                                <input
                                  type="checkbox"
                                  checked={draft.isInsufficientData}
                                  onChange={(e) =>
                                    handleUpdateDraftInterval(draft.tempId, {
                                      isInsufficientData: e.target.checked,
                                      impactPercent: e.target.checked ? null : 50,
                                    })
                                  }
                                  className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                                />
                                <span>Chưa xác định được tỷ lệ % (Gắn cờ &quot;Chưa đủ dữ liệu&quot; — không mặc định 0% hoặc 100%)</span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ghi chú / Căn cứ xác nhận */}
                      <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                        <label className="block text-slate-300 font-semibold mb-1">Căn cứ / Ghi chú ảnh hưởng</label>
                        <input
                          type="text"
                          value={draft.note}
                          onChange={(e) => handleUpdateDraftInterval(draft.tempId, { note: e.target.value })}
                          placeholder="Ví dụ: Nồi 1 dừng motor, nồi 2 chạy bình thường -> giảm tải 50%"
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      {/* Live Computed Card */}
                      <div className="col-span-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Loss Quy Đổi Khoảng Này</span>
                        <div className="mt-1 flex items-baseline gap-1">
                          {metrics.convertedLossMinutes !== null ? (
                            <>
                              <span className="text-xl font-black text-rose-400 font-mono">
                                {metrics.convertedLossMinutes}
                              </span>
                              <span className="text-xs text-slate-400">phút ({metrics.durationMinutes}p thực tế)</span>
                            </>
                          ) : (
                            <span className="text-xs text-purple-400 font-bold">Chưa đủ dữ liệu</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Converted Loss Banner */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Tổng Hợp Loss Quy Đổi Của Sự Kiện
                </span>
                <p className="text-[11px] text-slate-400">
                  Cộng chính xác các khoảng thời gian trước khi hiển thị; không làm tròn từng khoảng lẻ
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black text-rose-400 font-mono">
                    {draftMetricsSummary.totalConvertedLoss} phút
                  </div>
                  {draftMetricsSummary.hasInsufficientData && (
                    <span className="text-[10px] text-purple-300 italic">
                      + Có khoảng đang ở trạng thái Chưa đủ dữ liệu
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 px-6 py-2.5 text-xs font-black text-indigo-950 shadow-lg shadow-orange-950/50 transition-all cursor-pointer active:scale-95"
                >
                  XÁC NHẬN & LƯU SỰ CỐ
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: PHÂN BỔ 9 NHÓM LOSS & TỔNG HỢP THEO PHẠM VI                         */}
      {/* ========================================================================= */}
      {viewMode === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-sky-800 bg-sky-950/30 p-4 space-y-2">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                1. Phạm Vi Nấu (Cooking Scope)
              </h3>
              <p className="text-xs text-slate-300">
                Các sự cố làm dừng nồi nấu hoặc giảm năng lực nấu cụm bồn.
              </p>
              <div className="pt-2 text-2xl font-black text-white font-mono">
                {scopeLossMetrics['Nấu'].totalConvertedLossMinutes} phút Loss
              </div>
            </div>

            <div className="rounded-xl border border-teal-800 bg-teal-950/30 p-4 space-y-2">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                2. Phạm Vi Cấp Tương (Feed Scope)
              </h3>
              <p className="text-xs text-slate-300">
                Dừng cấp tương cho ĐG hoặc tương tích lũy tại bồn làm nguội.
              </p>
              <div className="pt-2 text-2xl font-black text-white font-mono">
                {scopeLossMetrics['Cấp tương'].totalConvertedLossMinutes} phút Loss
              </div>
            </div>

            <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-4 space-y-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                3. Phạm Vi Đóng Gói (Packing Scope)
              </h3>
              <p className="text-xs text-slate-300">
                Dừng máy chiết rót, dán nhãn, đóng thùng hoặc giảm tốc độ đóng gói.
              </p>
              <div className="pt-2 text-2xl font-black text-white font-mono">
                {scopeLossMetrics['Đóng gói'].totalConvertedLossMinutes} phút Loss
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: XEM CHI TIẾT SỰ KIỆN & RÀ SOÁT ẢNH HƯỞNG                           */}
      {/* ========================================================================= */}
      {detailModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-5 space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    getLineBadgeStyle(detailModalLog.lineId, lines).badgeClass
                  }`}
                >
                  {getLineBadgeStyle(detailModalLog.lineId, lines).label}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Chi Tiết Sự Cố & Rà Soát Ảnh Hưởng</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Event ID: {detailModalLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDetailModalLog(null);
                  setQuickConfirmImpactId(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Event Info Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Nguồn phát sinh</span>
                <p className="font-bold text-indigo-300 mt-0.5">{detailModalLog.source || 'CBTO'}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase">Công đoạn gốc</span>
                <p className="font-bold text-amber-300 mt-0.5">{detailModalLog.originStage || 'Nấu'}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase">Nhóm nguyên nhân</span>
                <p className="font-semibold text-slate-200 mt-0.5">{detailModalLog.lossGroup}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase">Ca & Ngày SX</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {getShiftBadgeStyle(detailModalLog.shiftId).label} · {detailModalLog.productionDate}
                </p>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 uppercase">Nguyên nhân chi tiết</span>
                <p className="font-bold text-amber-400 text-sm mt-0.5">
                  {detailModalLog.downtimeReason || detailModalLog.lossGroup}
                </p>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 uppercase">Thời gian sự cố</span>
                <p className="font-mono font-semibold text-slate-200 mt-0.5">
                  {formatTime(detailModalLog.startedAt)} - {detailModalLog.endedAt ? formatTime(detailModalLog.endedAt) : 'Đang xảy ra'} ({detailModalLog.durationMinutes} phút)
                </p>
              </div>

              <div className="col-span-2 sm:col-span-4">
                <span className="text-[10px] text-slate-400 uppercase">Mô tả hiện trường</span>
                <p className="text-slate-300 mt-0.5 italic bg-slate-900/60 p-2 rounded border border-slate-700/50">
                  {detailModalLog.description || detailModalLog.note || 'Không có mô tả thêm.'}
                </p>
              </div>
            </div>

            {/* Child Impacts Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Các Khoảng Ảnh Hưởng Vận Hành Được Xác Nhận ({detailModalLog.impacts?.length || 0})</span>
                </h4>
              </div>

              <div className="space-y-2">
                {(detailModalLog.impacts || []).map((imp) => {
                  const badge = getImpactStatusBadge(imp.confirmationStatus);
                  const isPendingReview =
                    imp.confirmationStatus === 'INSUFFICIENT_DATA' ||
                    imp.confirmationStatus === 'UNREVIEWED' ||
                    detailModalLog.isLegacyUnreviewed;

                  return (
                    <div
                      key={imp.impactId}
                      className="rounded-xl border border-slate-700 bg-slate-900/90 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{getImpactLabel(imp.impactType)}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {imp.convertedLossMinutes !== null ? (
                            <span className="font-mono font-black text-rose-400 text-sm">
                              {imp.convertedLossMinutes}m Loss quy đổi
                            </span>
                          ) : (
                            <span className="text-purple-300 font-bold text-xs">Chưa đủ dữ liệu</span>
                          )}

                          {isPendingReview && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickConfirmImpactId(imp.impactId);
                                setQuickConfirmPercent(imp.impactPercent || 50);
                              }}
                              className="rounded bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                            >
                              Xác nhận %
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded">
                        <div>
                          <span>Phạm vi:</span> <strong className="text-slate-200">{imp.impactScope}</strong>
                        </div>
                        <div>
                          <span>Công đoạn:</span> <strong className="text-slate-200">{imp.affectedStage}</strong>
                        </div>
                        <div>
                          <span>Mức độ:</span> <strong className="text-amber-300">{imp.impactPercent !== null ? `${imp.impactPercent}%` : 'Chưa xác định'}</strong>
                        </div>
                        <div>
                          <span>Thời gian:</span> <strong className="text-slate-200">{formatTime(imp.impactStartedAt)} - {imp.impactEndedAt ? formatTime(imp.impactEndedAt) : 'Đang tiếp diễn'}</strong>
                        </div>
                      </div>

                      {imp.note && (
                        <p className="text-[10px] text-slate-400 italic">
                          Căn cứ: &quot;{imp.note}&quot;
                        </p>
                      )}

                      {/* Quick Confirm Box */}
                      {quickConfirmImpactId === imp.impactId && (
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-2.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-300">Xác nhận mức độ ảnh hưởng thực tế:</span>
                            <button
                              type="button"
                              onClick={() => setQuickConfirmImpactId(null)}
                              className="text-slate-400 hover:text-white text-xs"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {QUICK_PERCENTS.map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setQuickConfirmPercent(p)}
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    quickConfirmPercent === p
                                      ? 'bg-emerald-400 text-slate-950'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {p}%
                                </button>
                              ))}
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={quickConfirmPercent}
                              onChange={(e) => setQuickConfirmPercent(Number(e.target.value))}
                              className="w-14 rounded border border-slate-700 bg-slate-800 p-1 text-center text-white font-mono"
                            />
                            <span className="text-slate-400">%</span>
                            <button
                              type="button"
                              onClick={() => handleQuickConfirmImpact(detailModalLog.id, imp.impactId)}
                              className="ml-auto rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1 cursor-pointer"
                            >
                              Lưu xác nhận
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteLog(detailModalLog.id, detailModalLog.downtimeReason)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa sự cố</span>
              </button>

              <div className="flex items-center gap-2">
                {detailModalLog.endedAt === null && (
                  <button
                    type="button"
                    onClick={() => handleOpenEndModal(detailModalLog.id)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    <span>Đóng sự cố</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalLog(null);
                    setQuickConfirmImpactId(null);
                  }}
                  className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: XÁC NHẬN KẾT THÚC SỰ CỐ (END LOSS MODAL)                           */}
      {/* ========================================================================= */}
      {endingLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white text-base">Xác nhận Kết Thúc Sự Cố</h3>
            <p className="text-slate-400">
              Nhập thời điểm kết thúc sự cố (các khoảng ảnh hưởng đang mở sẽ tự động được đóng và tính toán Loss quy đổi):
            </p>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Thời gian kết thúc</label>
              <input
                type="datetime-local"
                value={endDateTimeInput}
                onChange={(e) => setEndDateTimeInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEndingLogId(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmEndLoss}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-500 cursor-pointer"
              >
                Đóng sự cố & Cập nhật Loss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* TOP HEADER: TITLE & 3 VIEW MODES                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-600 text-white shrink-0 shadow-sm">
            <ClockAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Quản Lý Dừng Máy & Loss CBTO
              </h1>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                Mô hình Ảnh hưởng Vận hành
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tách biệt độc lập: Nguồn · Nguyên nhân · Công đoạn · Ảnh hưởng vận hành · Mức % · Loss quy đổi tương đương
            </p>
          </div>
        </div>

        {/* 3 Main View Tabs - Segmented Control */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-800/90 p-1 border border-slate-700/70 self-start md:self-center">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'list'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Nhật ký sự cố & Loss</span>
            <span className="ml-0.5 rounded bg-black/20 px-1.5 py-0.5 text-[11px] font-mono tabular-nums">
              {filteredLossLogs.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('entry')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'entry'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ghi nhận sự cố mới</span>
          </button>

          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'analytics'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Phân bổ 9 nhóm Loss</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: NHẬT KÝ LOSS CHI TIẾT THEO LINE                                     */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-5">
          {/* 4 Scope-separated Loss Metrics (Anti-Duplication Principle) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Scope 1: Nấu */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-sky-400 font-semibold">
                <span>Phạm vi Cụm Nấu</span>
                <span className="text-[11px] text-slate-500 font-normal">Công đoạn Nấu</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-white font-mono tabular-nums">
                  {scopeLossMetrics['Nấu'].totalConvertedLossMinutes}
                  <span className="text-sm font-sans font-normal text-slate-400 ml-1">phút</span>
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  sự cố: {scopeLossMetrics['Nấu'].totalDurationMinutes}m
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                Tổn thất quy đổi thực tế cụm nồi nấu
              </p>
            </div>

            {/* Scope 2: Cấp tương */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-teal-400 font-semibold">
                <span>Phạm vi Cấp Tương</span>
                <span className="text-[11px] text-slate-500 font-normal">Buffer / Làm nguội</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-white font-mono tabular-nums">
                  {scopeLossMetrics['Cấp tương'].totalConvertedLossMinutes}
                  <span className="text-sm font-sans font-normal text-slate-400 ml-1">phút</span>
                </span>
                {scopeLossMetrics['Cấp tương'].hasInsufficientData && (
                  <span className="text-[11px] font-medium text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                    Chưa đủ dữ liệu ứ bồn
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                Dừng cấp hoặc ứ bồn làm nguội
              </p>
            </div>

            {/* Scope 3: Đóng gói */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                <span>Phạm vi Đóng Gói</span>
                <span className="text-[11px] text-slate-500 font-normal">Chiết rót / Đóng thùng</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-white font-mono tabular-nums">
                  {scopeLossMetrics['Đóng gói'].totalConvertedLossMinutes}
                  <span className="text-sm font-sans font-normal text-slate-400 ml-1">phút</span>
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  sự cố: {scopeLossMetrics['Đóng gói'].totalDurationMinutes}m
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                Không cộng mù quáng vào tổng toàn xưởng
              </p>
            </div>

            {/* Scope 4: Ongoing tracking */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Sự Cố Đang Tiếp Diễn</span>
                <span className="text-[11px] text-slate-500 font-normal">Real-time</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-rose-400 font-mono tabular-nums">
                  {filteredLossLogs.filter((l) => l.endedAt === null).length}
                  <span className="text-sm font-sans font-normal text-slate-400 ml-1">sự cố</span>
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {filteredLossLogs.length} sự kiện lọc
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                Tạm tính thời gian thực tế đến hiện tại
              </p>
            </div>
          </div>

          {/* Clean Segmented Filter Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3.5">
            {/* Row 1: Line Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
                  <Filter className="h-3.5 w-3.5" />
                  Dây chuyền:
                </span>
                <button
                  onClick={() => setFilterLineId('ALL')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    filterLineId === 'ALL'
                      ? 'bg-orange-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Tất cả Line ({lossLogs.length})
                </button>
                {lines.map((l) => {
                  const isSel = filterLineId === l.id;
                  const count = lossLogs.filter((x) => x.lineId === l.id).length;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setFilterLineId(l.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-orange-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <span>{l.code}</span>
                      <span className="text-[11px] opacity-75 tabular-nums font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Primary Action Button */}
              <button
                onClick={() => setViewMode('entry')}
                className="flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Ghi nhận sự cố & ảnh hưởng</span>
              </button>
            </div>

            {/* Row 2: Shift, Date & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 shrink-0">Ca làm việc:</span>
                <button
                  onClick={() => setFilterShiftId('ALL')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    filterShiftId === 'ALL'
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tất cả Ca
                </button>
                {SHIFTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterShiftId(s.id)}
                    className={`px-2.5 py-1 text-xs rounded transition-colors ${
                      filterShiftId === s.id
                        ? 'bg-orange-600 text-white font-semibold'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-slate-800/90 rounded-lg px-2.5 py-1.5 border border-slate-700 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
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
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                      !isFilterAllDates && filterDate === todayStr
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    onClick={() => setIsFilterAllDates(!isFilterAllDates)}
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                      isFilterAllDates
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tất cả
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm sự cố, nguyên nhân, thiết bị..."
                    className="rounded-lg border border-slate-700 bg-slate-800/90 pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none w-56 sm:w-64"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* THE SHOPFLOOR LOSS EVENT LIST (SPACIOUS ERGONOMIC CARDS)               */}
          {/* ===================================================================== */}
          <div className="space-y-3">
            {filteredLossLogs.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400 space-y-3">
                <ClockAlert className="h-8 w-8 mx-auto text-slate-500" />
                <p className="text-sm font-medium text-slate-300">
                  Không tìm thấy sự cố dừng máy nào phù hợp với bộ lọc hiện tại.
                </p>
                <p className="text-xs text-slate-500">
                  Hãy thử chọn lại Line, Ca sản xuất hoặc nhấn vào nút bên dưới để ghi nhận sự cố mới.
                </p>
                <button
                  onClick={() => setViewMode('entry')}
                  className="rounded-lg bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
                >
                  + Ghi nhận sự cố mới
                </button>
              </div>
            ) : (
              filteredLossLogs.map((log) => {
                const lineObj = lines.find((l) => l.id === log.lineId);
                const shiftObj = SHIFTS.find((s) => s.id === log.shiftId);
                const isLogOngoing = log.endedAt === null;
                const impacts = log.impacts || [];

                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 hover:border-slate-700 transition-colors space-y-3.5"
                  >
                    {/* Top Row: Context Kicker & Duration Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">
                          {lineObj ? `${lineObj.code} - ${lineObj.name.split(' (')[0]}` : log.lineId}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{shiftObj?.name || log.shiftId}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatDateVN(log.productionDate)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-300">
                          {formatTime(log.startedAt)} - {log.endedAt ? formatTime(log.endedAt) : 'Đang tiếp diễn'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded">
                          Sự cố {log.durationMinutes} phút
                        </span>
                        {isLogOngoing ? (
                          <button
                            onClick={() => handleOpenEndModal(log.id)}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors shadow-sm"
                          >
                            Đang dừng máy · Đóng sự cố
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/40">
                            Đã kết thúc
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Cause & Description */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-base font-bold text-white tracking-tight">
                            {log.downtimeReason || log.lossGroup}
                          </h2>
                          <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded font-mono">
                            {log.lossGroup}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                          <span>Nguồn: <strong className="text-slate-200">{log.source || 'CBTO'}</strong></span>
                          <span aria-hidden="true">·</span>
                          <span>Công đoạn gốc: <strong className="text-slate-200">{log.originStage || 'Nấu'}</strong></span>
                          {log.equipmentId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Thiết bị: <span className="font-mono text-slate-300">{log.equipmentId}</span></span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>Người ghi: {log.reportedByName || 'NV'}</span>
                        </div>

                        {(log.description || log.note) && (
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {log.description || log.note}
                          </p>
                        )}
                      </div>

                      {/* Right Actions: View details & Delete */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        <button
                          onClick={() => setDetailModalLog(log)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Chi tiết & Rà soát</span>
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id, log.downtimeReason)}
                          className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Xóa sự cố này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Operational Impacts Block (The 6-Dimension Model) */}
                    <div className="rounded-lg bg-slate-950/60 p-3.5 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                          Ảnh hưởng vận hành thực tế ({impacts.length})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Loss quy đổi (phút) = Thời gian ảnh hưởng × Mức % / 100
                        </span>
                      </div>

                      {impacts.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-1">
                          Chưa có ảnh hưởng vận hành nào được gắn cho sự kiện này.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-800/70">
                          {impacts.map((imp) => {
                            const isPending =
                              imp.confirmationStatus === 'UNREVIEWED' ||
                              imp.confirmationStatus === 'INSUFFICIENT_DATA';

                            return (
                              <div
                                key={imp.impactId}
                                className="py-2.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-200">
                                      {getImpactLabel(imp.impactType)}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-amber-400">
                                      {imp.impactPercent !== null ? `${imp.impactPercent}%` : 'Chưa định %'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      (Phạm vi: <strong className="text-slate-300">{imp.impactScope}</strong>)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                    <span>Công đoạn: {imp.affectedStage}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono">
                                      {formatTime(imp.impactStartedAt)} - {imp.impactEndedAt ? formatTime(imp.impactEndedAt) : 'Đang tiếp diễn'}
                                    </span>
                                    {imp.note && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="italic text-slate-400 truncate max-w-xs">{imp.note}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                                  {imp.convertedLossMinutes !== null ? (
                                    <div className="text-right">
                                      <span className="text-sm font-bold font-mono tabular-nums text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded border border-rose-800/40">
                                        {imp.convertedLossMinutes}m Loss quy đổi
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-medium text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded border border-amber-800/40">
                                      Chưa đủ dữ liệu
                                    </span>
                                  )}

                                  {isPending && (
                                    <button
                                      onClick={() => {
                                        setDetailModalLog(log);
                                        setQuickConfirmImpactId(imp.impactId);
                                        setQuickConfirmPercent(imp.impactPercent || 50);
                                      }}
                                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-800/40 transition-colors cursor-pointer"
                                    >
                                      Xác nhận %
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
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
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  01. Thông tin sự cố & nguyên nhân phát sinh
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tách biệt độc lập: Nguồn gốc · Nguyên nhân kỹ thuật · Công đoạn vật lý
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">Bước 1/3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Nguồn phát sinh */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Nguồn phát sinh <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value as LossEventSource)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                >
                  {LOSS_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Công đoạn phát sinh */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Công đoạn phát sinh <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formOriginStage}
                  onChange={(e) => setFormOriginStage(e.target.value as LossOriginStage)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                >
                  {ORIGIN_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dây chuyền */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Dây chuyền</label>
                <select
                  value={formLineId}
                  onChange={(e) => {
                    setFormLineId(e.target.value);
                    const eqs = getEquipmentsByLine(e.target.value);
                    if (eqs.length > 0) setFormEquipmentId(eqs[0].id);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thiết bị phát sinh */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Thiết bị phát sinh</label>
                <select
                  value={formEquipmentId}
                  onChange={(e) => setFormEquipmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                >
                  {lineEquipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nhóm nguyên nhân MVP (9 nhóm) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                >
                  {OFFICIAL_LOSS_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nguyên nhân chi tiết */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Nguyên nhân chi tiết</label>
                <select
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                >
                  {reasonsForCategory.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mã nguyên nhân (Cause code) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Mã nguyên nhân</label>
                <input
                  type="text"
                  value={formCauseCode}
                  onChange={(e) => setFormCauseCode(e.target.value)}
                  placeholder="Ví dụ: BD-MECH-01"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-mono focus:border-orange-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Ca sản xuất */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Ca sản xuất</label>
                <select
                  value={formShiftId}
                  onChange={(e) => setFormShiftId(e.target.value as ShiftId)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                >
                  {SHIFTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.displayTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mô tả sự kiện */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Mô tả sự kiện chi tiết <span className="text-slate-500 font-normal">(Hiện trường ghi nhận)</span>
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả hiện tượng: kẹt van bồn nấu, rò rỉ cơ khí, sụt áp steam nguồn cấp..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-white focus:border-orange-500 focus:outline-none leading-relaxed transition-colors"
                />
              </div>

              {/* Thời điểm bắt đầu sự cố */}
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">Thời điểm bắt đầu sự cố</label>
                  {/* Convenient Presets for Operators */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        setStartDay(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
                        setStartHour(pad(now.getHours()));
                        setStartMin(pad(now.getMinutes()));
                        syncDraftTimestamps(now.toISOString(), isOngoing ? null : endIsoString);
                      }}
                      className="text-[11px] text-orange-400 hover:text-orange-300 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Bây giờ
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const past = new Date(Date.now() - 30 * 60000);
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        setStartDay(`${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`);
                        setStartHour(pad(past.getHours()));
                        setStartMin(pad(past.getMinutes()));
                        syncDraftTimestamps(past.toISOString(), isOngoing ? null : endIsoString);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      30p trước
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={startDay}
                    onChange={(e) => {
                      setStartDay(e.target.value);
                      const s = new Date(`${e.target.value}T${startHour}:${startMin}:00`).toISOString();
                      syncDraftTimestamps(s, isOngoing ? null : endIsoString);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={startHour}
                    onChange={(e) => {
                      setStartHour(e.target.value);
                      const s = new Date(`${startDay}T${e.target.value}:${startMin}:00`).toISOString();
                      syncDraftTimestamps(s, isOngoing ? null : endIsoString);
                    }}
                    placeholder="HH (0-23)"
                    className="rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-mono text-center focus:border-orange-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={startMin}
                    onChange={(e) => {
                      setStartMin(e.target.value);
                      const s = new Date(`${startDay}T${startHour}:${e.target.value}:00`).toISOString();
                      syncDraftTimestamps(s, isOngoing ? null : endIsoString);
                    }}
                    placeholder="MM (0-59)"
                    className="rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-mono text-center focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Thời điểm kết thúc hoặc Đang diễn ra */}
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Thời điểm kết thúc sự cố</label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-300 font-medium">
                    <input
                      type="checkbox"
                      checked={isOngoing}
                      onChange={(e) => {
                        setIsOngoing(e.target.checked);
                        syncDraftTimestamps(startIsoString, e.target.checked ? null : endIsoString);
                      }}
                      className="rounded border-slate-700 text-rose-600 focus:ring-rose-500 h-4 w-4"
                    />
                    <span>Sự cố đang tiếp diễn (Tạm tính)</span>
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
                      className="rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-mono focus:border-orange-500 focus:outline-none"
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
                      className="rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-mono text-center focus:border-orange-500 focus:outline-none"
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
                      className="rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-mono text-center focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-rose-800/40 bg-rose-950/20 py-2.5 px-4 text-center text-rose-300 text-xs font-medium">
                    Sự cố đang tiếp diễn — hệ thống tự động tạm tính Loss quy đổi đến thời điểm hiện tại
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* BƯỚC 2: RULE ENGINE GỢI Ý THÔNG MINH (CBTO ADVISORY)                  */}
          {/* --------------------------------------------------------------------- */}
          {ruleSuggestions.length > 0 && (
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-800/40 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300 tracking-tight">
                    02. Gợi ý từ Rule Engine CBTO (Chỉ mang tính chất tham khảo)
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Không tự áp dụng — Người dùng luôn chủ động xác nhận hoặc chỉnh sửa
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {ruleSuggestions.map((sug) => (
                  <div
                    key={sug.ruleId}
                    className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white text-xs">{sug.title}</span>
                        <span className="text-xs font-semibold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                          {getImpactLabel(sug.suggestedImpactType)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{sug.rationale}</p>
                      {sug.warningNote && (
                        <p className="text-xs text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-800/30">
                          {sug.warningNote}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                      <span className="text-xs font-mono text-slate-400">
                        Gợi ý: <strong>{sug.suggestedPercent !== null ? `${sug.suggestedPercent}%` : 'Chưa định %'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyRuleSuggestion(sug)}
                        className="rounded-md bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 font-semibold text-xs text-white shadow-sm transition-colors cursor-pointer"
                      >
                        Áp dụng gợi ý
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
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  03. Khai báo ảnh hưởng vận hành thực tế
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Công thức chuẩn: <strong>Loss quy đổi (phút) = Thời gian ảnh hưởng thực tế (phút) × Mức ảnh hưởng (%) / 100</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddDraftInterval}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Thêm khoảng ảnh hưởng</span>
              </button>
            </div>

            {/* Intervals List */}
            <div className="space-y-4">
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
                    className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-white">
                          Khoảng thời gian #{idx + 1}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-400">
                          Phạm vi: <strong className="text-slate-200">{getImpactScope(draft.impactType)}</strong>
                        </span>
                      </div>

                      {draftImpacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDraftInterval(draft.tempId)}
                          className="text-xs text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          title="Xóa khoảng này"
                        >
                          Xóa khoảng
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Loại ảnh hưởng */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
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
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                        >
                          {IMPACT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {getImpactLabel(t)} {t === 'NONE' ? '(Loại trừ, 0% Loss)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Công đoạn chịu ảnh hưởng */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">Công đoạn chịu ảnh hưởng</label>
                        <select
                          value={draft.affectedStage}
                          onChange={(e) => handleUpdateDraftInterval(draft.tempId, { affectedStage: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-medium focus:border-orange-500 focus:outline-none transition-colors"
                        >
                          {ORIGIN_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Mức độ ảnh hưởng (%) */}
                      <div className="col-span-1 sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          Mức độ ảnh hưởng (%) {isNone && '— 0% (Loại trừ)'}
                        </label>
                        {isNone ? (
                          <div className="rounded-lg border border-slate-800 bg-slate-900 py-2.5 px-3 text-slate-400 text-xs italic">
                            Không ảnh hưởng vận hành: Mức ảnh hưởng 0%, Loss quy đổi bằng 0.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {QUICK_PERCENTS.map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => handleUpdateDraftInterval(draft.tempId, { impactPercent: pct, isInsufficientData: false })}
                                  className={`h-10 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                    draft.impactPercent === pct && !draft.isInsufficientData
                                      ? 'bg-orange-600 text-white shadow-sm'
                                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}

                              {/* Manual Input */}
                              <div className="flex items-center gap-1.5 ml-auto">
                                <span className="text-xs text-slate-400">Tùy chỉnh:</span>
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
                                  className="w-16 h-10 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white font-mono text-center focus:border-orange-500 focus:outline-none text-sm"
                                />
                                <span className="text-slate-400 text-xs">%</span>
                              </div>
                            </div>

                            {/* Insufficient data checkbox for cooling congestion */}
                            {isCongestion && (
                              <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300">
                                <input
                                  type="checkbox"
                                  checked={draft.isInsufficientData}
                                  onChange={(e) =>
                                    handleUpdateDraftInterval(draft.tempId, {
                                      isInsufficientData: e.target.checked,
                                      impactPercent: e.target.checked ? null : 50,
                                    })
                                  }
                                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 h-4 w-4"
                                />
                                <span>Chưa xác định tỷ lệ % (Gắn cờ &quot;Chưa đủ dữ liệu&quot; — không mặc định 0% hoặc 100%)</span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ghi chú / Căn cứ xác nhận */}
                      <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">Căn cứ / Ghi chú ảnh hưởng</label>
                        <input
                          type="text"
                          value={draft.note}
                          onChange={(e) => handleUpdateDraftInterval(draft.tempId, { note: e.target.value })}
                          placeholder="Ví dụ: Nồi 1 dừng motor, nồi 2 chạy bình thường -> giảm tải 50%"
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white focus:border-orange-500 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Live Computed Card */}
                      <div className="col-span-1 bg-slate-900/90 p-3 rounded-lg border border-slate-800 flex flex-col justify-center">
                        <span className="text-[11px] text-slate-400 font-medium">Loss quy đổi khoảng này</span>
                        <div className="mt-1 flex items-baseline gap-1">
                          {metrics.convertedLossMinutes !== null ? (
                            <>
                              <span className="text-2xl font-bold text-rose-400 font-mono tabular-nums">
                                {metrics.convertedLossMinutes}
                              </span>
                              <span className="text-xs text-slate-400">phút ({metrics.durationMinutes}m thực tế)</span>
                            </>
                          ) : (
                            <span className="text-xs text-amber-300 font-semibold">Chưa đủ dữ liệu</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Converted Loss Banner */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-white">
                  Tổng hợp Loss quy đổi của sự kiện
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cộng chính xác các khoảng thời gian trước khi hiển thị; không làm tròn từng khoảng lẻ
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-3xl font-bold text-rose-400 font-mono tabular-nums">
                    {draftMetricsSummary.totalConvertedLoss}
                    <span className="text-base font-sans font-normal text-slate-400 ml-1">phút</span>
                  </div>
                  {draftMetricsSummary.hasInsufficientData && (
                    <span className="text-xs text-amber-400 font-medium">
                      + Có khoảng chưa đủ dữ liệu
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 hover:bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Xác nhận & Lưu sự cố
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
        <div className="space-y-6">
          {/* 3 Scope Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-400">
                <span>01. Phạm vi Cụm Nấu (Cooking Scope)</span>
                <span className="text-slate-500 font-normal">Nồi nấu N01/N02</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Các sự cố làm dừng nồi nấu hoặc giảm năng lực nấu cụm bồn. Không suy diễn làm dừng đóng gói nếu ĐG vẫn chạy từ buffer.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-white font-mono tabular-nums">
                  {scopeLossMetrics['Nấu'].totalConvertedLossMinutes}
                  <span className="text-sm font-sans font-normal text-slate-400 ml-1">phút Loss</span>
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  sự cố: {scopeLossMetrics['Nấu'].totalDurationMinutes}m
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-teal-400">
                <span>02. Phạm vi Cấp Tương (Feed Scope)</span>
                <span className="text-slate-500 font-normal">Buffer / Làm nguội</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dừng cấp tương cho ĐG hoặc tương tích lũy tại bồn làm nguội. Ghi nhận thời gian tồn tại và rà soát tỷ lệ % thực tế.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-white font-mono tabular-nums">
                  {scopeLossMetrics['Cấp tương'].totalConvertedLossMinutes}
                  <span className="text-sm font-sans font-normal text-slate-400 ml-1">phút Loss</span>
                </span>
                {scopeLossMetrics['Cấp tương'].hasInsufficientData && (
                  <span className="text-xs text-amber-400 font-medium">
                    Có sự cố chờ xác nhận %
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                <span>03. Phạm vi Đóng Gói (Packing Scope)</span>
                <span className="text-slate-500 font-normal">Chiết / Dán / Thùng</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dừng máy chiết rót, vặn nắp, dán nhãn hoặc giảm tốc đóng gói. Phạm vi độc lập, không cộng dồn vào tổng toàn xưởng.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-white font-mono tabular-nums">
                  {scopeLossMetrics['Đóng gói'].totalConvertedLossMinutes}
                  <span className="text-sm font-sans font-normal text-slate-400 ml-1">phút Loss</span>
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  sự cố: {scopeLossMetrics['Đóng gói'].totalDurationMinutes}m
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown by 9 Loss Groups Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Phân bổ Loss theo 9 Nhóm Nguyên Nhân MVP CBTO
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tổng hợp thời lượng sự cố thực tế và các tác động vận hành liên đới đã ghi nhận
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Nhóm nguyên nhân</th>
                    <th className="py-2.5 px-3 text-right">Số sự kiện</th>
                    <th className="py-2.5 px-3 text-right">Tổng thời gian sự cố</th>
                    <th className="py-2.5 px-3 text-right">Loss quy đổi (Nấu)</th>
                    <th className="py-2.5 px-3 text-right">Loss quy đổi (Cấp tương)</th>
                    <th className="py-2.5 px-3 text-right">Loss quy đổi (Đóng gói)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {OFFICIAL_LOSS_GROUPS.map((grp) => {
                    const logs = filteredLossLogs.filter((l) => l.lossGroup === grp);
                    const totalDur = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
                    const cookLoss = logs
                      .flatMap((l) => l.impacts || [])
                      .filter((imp) => imp.impactScope === 'Nấu' && imp.convertedLossMinutes !== null)
                      .reduce((acc, imp) => acc + (imp.convertedLossMinutes || 0), 0);
                    const feedLoss = logs
                      .flatMap((l) => l.impacts || [])
                      .filter((imp) => imp.impactScope === 'Cấp tương' && imp.convertedLossMinutes !== null)
                      .reduce((acc, imp) => acc + (imp.convertedLossMinutes || 0), 0);
                    const packLoss = logs
                      .flatMap((l) => l.impacts || [])
                      .filter((imp) => imp.impactScope === 'Đóng gói' && imp.convertedLossMinutes !== null)
                      .reduce((acc, imp) => acc + (imp.convertedLossMinutes || 0), 0);

                    return (
                      <tr key={grp} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-200">{grp}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">{logs.length}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">{totalDur}m</td>
                        <td className="py-2.5 px-3 text-right text-sky-400 font-semibold tabular-nums">
                          {cookLoss > 0 ? `${cookLoss}m` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-teal-400 font-semibold tabular-nums">
                          {feedLoss > 0 ? `${feedLoss}m` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-400 font-semibold tabular-nums">
                          {packLoss > 0 ? `${packLoss}m` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: XEM CHI TIẾT SỰ KIỆN & RÀ SOÁT ẢNH HƯỞNG                           */}
      {/* ========================================================================= */}
      {detailModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 space-y-5 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Chi tiết sự cố & rà soát ảnh hưởng</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-200">
                    {lines.find((l) => l.id === detailModalLog.lineId)?.code || detailModalLog.lineId}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{detailModalLog.productionDate}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[11px] text-slate-500">ID: {detailModalLog.id}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setDetailModalLog(null);
                  setQuickConfirmImpactId(null);
                }}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Event Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Nguồn phát sinh</span>
                <p className="font-semibold text-slate-200">{detailModalLog.source || 'CBTO'}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Công đoạn gốc</span>
                <p className="font-semibold text-slate-200">{detailModalLog.originStage || 'Nấu'}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Nhóm nguyên nhân</span>
                <p className="font-semibold text-slate-200">{detailModalLog.lossGroup}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Ca làm việc</span>
                <p className="font-semibold text-slate-200">
                  {SHIFTS.find((s) => s.id === detailModalLog.shiftId)?.name || detailModalLog.shiftId}
                </p>
              </div>

              <div className="col-span-2 space-y-0.5 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Nguyên nhân chi tiết</span>
                <p className="font-bold text-white text-sm">
                  {detailModalLog.downtimeReason || detailModalLog.lossGroup}
                </p>
              </div>

              <div className="col-span-2 space-y-0.5 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Thời gian sự cố</span>
                <p className="font-mono font-semibold text-slate-200">
                  {formatTime(detailModalLog.startedAt)} - {detailModalLog.endedAt ? formatTime(detailModalLog.endedAt) : 'Đang tiếp diễn'} ({detailModalLog.durationMinutes} phút)
                </p>
              </div>

              {(detailModalLog.description || detailModalLog.note) && (
                <div className="col-span-2 sm:col-span-4 space-y-0.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Mô tả hiện trường</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {detailModalLog.description || detailModalLog.note}
                  </p>
                </div>
              )}
            </div>

            {/* Child Impacts Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-400" />
                <span>Các khoảng ảnh hưởng vận hành ({detailModalLog.impacts?.length || 0})</span>
              </h4>

              <div className="space-y-2.5">
                {(detailModalLog.impacts || []).map((imp) => {
                  const badge = getImpactStatusBadge(imp.confirmationStatus);
                  const isPendingReview =
                    imp.confirmationStatus === 'INSUFFICIENT_DATA' ||
                    imp.confirmationStatus === 'UNREVIEWED' ||
                    detailModalLog.isLegacyUnreviewed;

                  return (
                    <div
                      key={imp.impactId}
                      className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-xs">{getImpactLabel(imp.impactType)}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {imp.convertedLossMinutes !== null ? (
                            <span className="font-mono font-bold tabular-nums text-rose-400 text-sm bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                              {imp.convertedLossMinutes}m Loss quy đổi
                            </span>
                          ) : (
                            <span className="text-amber-300 font-medium text-xs bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                              Chưa đủ dữ liệu
                            </span>
                          )}

                          {isPendingReview && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickConfirmImpactId(imp.impactId);
                                setQuickConfirmPercent(imp.impactPercent || 50);
                              }}
                              className="rounded bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Xác nhận %
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded">
                        <div>
                          <span>Phạm vi:</span> <strong className="text-slate-200 ml-1">{imp.impactScope}</strong>
                        </div>
                        <div>
                          <span>Công đoạn:</span> <strong className="text-slate-200 ml-1">{imp.affectedStage}</strong>
                        </div>
                        <div>
                          <span>Mức độ:</span> <strong className="text-amber-300 ml-1">{imp.impactPercent !== null ? `${imp.impactPercent}%` : 'Chưa định %'}</strong>
                        </div>
                        <div>
                          <span>Thời gian:</span> <strong className="text-slate-200 ml-1">{formatTime(imp.impactStartedAt)} - {imp.impactEndedAt ? formatTime(imp.impactEndedAt) : 'Đang tiếp diễn'}</strong>
                        </div>
                      </div>

                      {imp.note && (
                        <p className="text-xs text-slate-400 italic">
                          Căn cứ xác nhận: &quot;{imp.note}&quot;
                        </p>
                      )}

                      {/* Quick Confirm Box */}
                      {quickConfirmImpactId === imp.impactId && (
                        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-3 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-300">Xác nhận mức độ ảnh hưởng thực tế:</span>
                            <button
                              type="button"
                              onClick={() => setQuickConfirmImpactId(null)}
                              className="text-slate-400 hover:text-white text-xs p-1"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              {QUICK_PERCENTS.map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setQuickConfirmPercent(p)}
                                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                    quickConfirmPercent === p
                                      ? 'bg-emerald-500 text-slate-950 font-bold'
                                      : 'bg-slate-800 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {p}%
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={quickConfirmPercent}
                                onChange={(e) => setQuickConfirmPercent(Number(e.target.value))}
                                className="w-16 rounded border border-slate-700 bg-slate-800 p-1.5 text-center text-white font-mono text-xs"
                              />
                              <span className="text-slate-400">%</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleQuickConfirmImpact(detailModalLog.id, imp.impactId)}
                              className="ml-auto rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 text-xs cursor-pointer transition-colors"
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
            <div className="border-t border-slate-800 pt-3.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteLog(detailModalLog.id, detailModalLog.downtimeReason)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-800/50 bg-rose-950/20 px-3.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-900/40 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Xóa sự cố</span>
              </button>

              <div className="flex items-center gap-2.5">
                {detailModalLog.endedAt === null && (
                  <button
                    type="button"
                    onClick={() => handleOpenEndModal(detailModalLog.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Square className="h-4 w-4 fill-white" />
                    <span>Đóng sự cố</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalLog(null);
                    setQuickConfirmImpactId(null);
                  }}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
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
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-6 space-y-4 text-xs">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">Xác nhận kết thúc sự cố</h3>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Nhập thời điểm máy hoạt động trở lại bình thường. Hệ thống sẽ tự động chốt thời lượng sự cố và tính toán Loss quy đổi theo tỷ lệ ảnh hưởng:
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Thời gian kết thúc sự cố</label>
              <input
                type="datetime-local"
                value={endDateTimeInput}
                onChange={(e) => setEndDateTimeInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 px-3 text-sm text-white font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="border-t border-slate-800 pt-3.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEndingLogId(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmEndLoss}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
              >
                Chốt kết thúc & Cập nhật Loss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

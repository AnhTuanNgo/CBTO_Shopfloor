'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  calculateImpactMetrics,
  calculateScopeLossMetrics,
  getImpactLabel,
  getImpactScope,
  getImpactStatusBadge,
  splitIntervalByShiftBoundaries,
  IMPACT_TYPE_DEFINITIONS,
  SHIFTS,
} from '@/lib/date-utils';
import { evaluateRuleSuggestions, RuleSuggestion } from '@/lib/rule-engine';
import { useCurrentTimestamp } from '@/hooks/use-current-time';
import {
  ClockAlert,
  ShieldAlert,
  Plus,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Layers,
  CheckCircle2,
  Check,
  Clock,
  Sparkles,
  Search,
  Eye,
  Trash2,
  Calendar,
  Filter,
  X,
  Activity,
  Edit3,
  Flame,
  RotateCw,
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
  ],
  'Chờ tương': [
    'Đóng gói chờ tương do bồn nấu chưa xong',
    'Nấu xong nhưng bồn làm nguội chưa giải phóng',
    'Chờ kiểm nghiệm cảm quan đạt chuẩn trước khi chiết',
    'Chờ đồng hóa mẻ tương tiếp theo',
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
    runtimes,
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
  const [formShiftId, setFormShiftId] = useState<ShiftId>(selectedShiftId);
  const [formLineId, setFormLineId] = useState(selectedLineId);
  const [formSource, setFormSource] = useState<LossEventSource>('CBTO');
  const [formOriginStage, setFormOriginStage] = useState<LossOriginStage>('Nấu');

  const currentRunningSession = useMemo(() => {
    return runtimes.find((r) => r.lineId === formLineId && r.status === 'RUNNING');
  }, [runtimes, formLineId]);

  const [manuallySelectedSkuId, setManuallySelectedSkuId] = useState<string | null>(null);
  const [manuallySelectedSessionId, setManuallySelectedSessionId] = useState<string | null>(null);

  const formSkuId = manuallySelectedSkuId !== null ? manuallySelectedSkuId : (currentRunningSession?.skuId || '');
  const formRuntimeSessionId = manuallySelectedSessionId !== null ? manuallySelectedSessionId : (currentRunningSession?.id || '');

  const lineEquipments = useMemo(() => getEquipmentsByLine(formLineId), [getEquipmentsByLine, formLineId]);
  const [formEquipmentId, setFormEquipmentId] = useState(lineEquipments[0]?.id || '');

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

  // Event Time Helpers
  const todayStr = new Date().toISOString().slice(0, 10);
  const toLocalInputValue = (d: Date = new Date()): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toSafeIso = (val: string, fallback: string | null = null): string | null => {
    if (!val || !val.trim()) return fallback;
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d.toISOString();
  };

  const [startDateTime, setStartDateTime] = useState<string>(() => toLocalInputValue(new Date()));
  const [endDateTime, setEndDateTime] = useState<string>(() => toLocalInputValue(new Date()));
  const [isOngoing, setIsOngoing] = useState(false);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Event Duration (minutes)
  const calculatedDuration = useMemo(() => {
    if (isOngoing || !startDateTime || !endDateTime) return 0;
    const s = new Date(startDateTime).getTime();
    const e = new Date(endDateTime).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.max(0, Math.round((e - s) / 60000));
  }, [isOngoing, startDateTime, endDateTime]);

  const startIsoString = useMemo(() => {
    const iso = toSafeIso(startDateTime);
    return iso || new Date().toISOString();
  }, [startDateTime]);

  const endIsoString = useMemo(() => {
    if (isOngoing) return null;
    return toSafeIso(endDateTime);
  }, [isOngoing, endDateTime]);

  // Requirement: Do NOT assume "STOP_COOK 100%" by default! User must actively select and confirm actual impact.
  const [draftImpacts, setDraftImpacts] = useState<ImpactIntervalDraft[]>([]);

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

  // User actively selects initial operational impact
  const handleSelectInitialImpact = (impactType: ImpactType) => {
    const isNone = impactType === 'NONE';
    const isCongestion = impactType === 'COOLING_BUFFER_CONGESTION';
    const isFullStop = impactType === 'STOP_COOK' || impactType === 'STOP_PACKING';
    const percent = isNone ? 0 : isCongestion ? null : isFullStop ? 100 : 50;

    const newDraft: ImpactIntervalDraft = {
      tempId: `DRAFT_1`,
      impactType,
      affectedLineId: formLineId,
      affectedStage:
        impactType === 'STOP_PACKING' || impactType === 'REDUCE_PACKING_SPEED'
          ? 'Đóng gói'
          : impactType === 'STOP_FEED_PACKING' || impactType === 'COOLING_BUFFER_CONGESTION'
          ? 'Buffer'
          : formOriginStage,
      impactStartedAt: startIsoString,
      impactEndedAt: isOngoing ? null : endIsoString,
      impactPercent: percent,
      isInsufficientData: isCongestion,
      note: '',
      userModifiedRule: true,
    };

    setDraftImpacts([newDraft]);
    setFormError('');
  };

  // Evaluate Rule Suggestions based on current form context
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
      line2ActiveKettlesCount: 1,
      totalKettles: 2,
    });
  }, [formSource, formOriginStage, formLineId, formEquipmentId, lineEquipments, formCategory, formReason, formDescription]);

  // Apply a Rule suggestion to the draft
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
      note: `Gợi ý theo bối cảnh: ${sug.title}`,
      suggestedByRule: sug.ruleId,
      userModifiedRule: false,
    };

    setDraftImpacts([newDraft]);
  };

  // Add another impact interval for multi-interval events
  const handleAddDraftInterval = (specificType?: ImpactType) => {
    if (draftImpacts.some((d) => d.impactType === 'NONE')) {
      setFormError('Sự kiện đang chọn "Không ảnh hưởng vận hành" (tùy chọn loại trừ). Hãy xóa hoặc đổi loại ảnh hưởng trước khi thêm khoảng mới.');
      return;
    }

    const typeToAdd = specificType || 'REDUCE_COOK_CAPACITY';
    const isFullStop = typeToAdd === 'STOP_COOK' || typeToAdd === 'STOP_PACKING';
    const isCongestion = typeToAdd === 'COOLING_BUFFER_CONGESTION';
    const percent = isCongestion ? null : isFullStop ? 100 : 50;

    const newInterval: ImpactIntervalDraft = {
      tempId: `DRAFT_${draftImpacts.length + 1}`,
      impactType: typeToAdd,
      affectedLineId: formLineId,
      affectedStage:
        typeToAdd === 'STOP_PACKING' || typeToAdd === 'REDUCE_PACKING_SPEED'
          ? 'Đóng gói'
          : typeToAdd === 'STOP_FEED_PACKING' || typeToAdd === 'COOLING_BUFFER_CONGESTION'
          ? 'Buffer'
          : formOriginStage,
      impactStartedAt: startIsoString,
      impactEndedAt: isOngoing ? null : endIsoString,
      impactPercent: percent,
      isInsufficientData: isCongestion,
      note: '',
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

    if (draftImpacts.length === 0) {
      setFormError('Sự kiện chưa có ảnh hưởng vận hành! Vui lòng chủ động chọn loại ảnh hưởng thực tế tại Phần 3 (không mặc định Dừng nấu 100%).');
      return;
    }

    if (formCategory === 'Khác' && !formNote.trim()) {
      setFormError('Nhóm Loss "Khác" bắt buộc phải nhập ghi chú giải trình!');
      return;
    }

    if (!isOngoing) {
      const eDate = new Date(endIsoString || '');
      const sDate = new Date(startIsoString);
      if (eDate.getTime() < sDate.getTime()) {
        setFormError('Thời gian kết thúc không được nhỏ hơn thời gian bắt đầu!');
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
        affectedLineId: d.affectedLineId,
        affectedStage: d.affectedStage,
        impactStartedAt: d.impactStartedAt,
        impactEndedAt: d.impactEndedAt,
        impactPercent: d.isInsufficientData ? null : d.impactPercent,
        convertedLossMinutes: metrics.convertedLossMinutes,
        confirmationStatus: (metrics.status === 'PROVISIONAL'
          ? 'CONFIRMED'
          : metrics.status) as ImpactConfirmationStatus,
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
      skuId: formSkuId || undefined,
      runtimeSessionId: formRuntimeSessionId || undefined,
      equipmentId: formEquipmentId,
      lossGroup: formCategory,
      causeCode: formCauseCode,
      source: formSource,
      originStage: formOriginStage,
      description: formDescription,
      downtimeReason: formReason,
      note: formNote,
      affectsLineStop: draftImpacts.some((d) => d.impactType === 'STOP_COOK' || d.impactType === 'STOP_PACKING'),
      productionDate: formProdDay,
      shiftId: formShiftId,
      startedAt: startIsoString,
      endedAt: isOngoing ? null : endIsoString,
      durationMinutes: calculatedDuration,
      impacts: finalImpacts,
    });

    if (!res.success) {
      setFormError(res.message || 'Lỗi khi lưu sự cố!');
      return;
    }

    setFormSuccess('Đã ghi nhận sự cố và ảnh hưởng vận hành thành công!');
    setTimeout(() => {
      setViewMode('list');
      setFormSuccess('');
    }, 1000);
  };

  // Close ongoing loss log
  const handleOpenEndModal = (id: string) => {
    setEndingLogId(id);
    const now = new Date();
    setEndDateTimeInput(now.toISOString().slice(0, 16));
  };

  const handleConfirmEndLog = () => {
    if (!endingLogId) return;
    const d = endDateTimeInput ? new Date(endDateTimeInput) : new Date();
    const endIso = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
    const res = endLossLog(endingLogId, endIso);
    if (!res.success) {
      setFormError(res.message || 'Lỗi khi kết thúc sự cố!');
      return;
    }
    setEndingLogId(null);
    if (detailModalLog && detailModalLog.id === endingLogId) {
      setDetailModalLog(null);
    }
  };

  const handleDeleteLog = (id: string) => {
    deleteLossLog(id);
    if (detailModalLog && detailModalLog.id === id) {
      setDetailModalLog(null);
    }
  };

  // Quick confirm unreviewed/insufficient impact in modal
  const handleQuickConfirmImpact = (eventId: string, impactId: string) => {
    confirmImpact(eventId, impactId, quickConfirmPercent, quickConfirmNote || 'Đã xác nhận mức ảnh hưởng thực tế.');
    setQuickConfirmImpactId(null);
    setQuickConfirmNote('');
  };

  // Filtered logs
  const filteredLossLogs = useMemo(() => {
    return lossLogs.filter((l) => {
      if (filterLineId !== 'ALL' && l.lineId !== filterLineId) return false;
      if (filterShiftId !== 'ALL' && l.shiftId !== filterShiftId) return false;
      if (!isFilterAllDates && l.productionDate !== filterDate) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = l.description?.toLowerCase().includes(term);
        const matchReason = l.downtimeReason?.toLowerCase().includes(term);
        const matchGroup = l.lossGroup?.toLowerCase().includes(term);
        const matchEq = l.equipmentId?.toLowerCase().includes(term);
        if (!matchDesc && !matchReason && !matchGroup && !matchEq) return false;
      }
      return true;
    });
  }, [lossLogs, filterLineId, filterShiftId, filterDate, isFilterAllDates, searchTerm]);

  // Scope summary for active filter view
  const currentViewScopeMetrics = useMemo(() => {
    const allImpacts = filteredLossLogs.flatMap((l) => l.impacts || []);
    return calculateScopeLossMetrics(allImpacts, nowMs);
  }, [filteredLossLogs, nowMs]);

  const ongoingLossLogs = useMemo(() => {
    return filteredLossLogs.filter((l) => l.endedAt === null);
  }, [filteredLossLogs]);

  return (
    <div className="space-y-6">
      {/* Module Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white border border-gray-200/80 p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-[#E31837]">
              <ClockAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight">
                Quản Lý Dừng Máy & Loss Time CBTO
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Mô hình quy đổi ảnh hưởng: Nguyên nhân gốc → Ảnh hưởng thực tế → Loss tương đương
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher: List vs Entry vs Analytics */}
        <div className="flex items-center gap-1 rounded-2xl bg-gray-100 p-1 border border-gray-200/60 self-start sm:self-center shadow-inner">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Danh sách sự cố ({filteredLossLogs.length})
          </button>
          <button
            onClick={() => setViewMode('entry')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'entry'
                ? 'bg-[#E31837] text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ghi nhận sự cố mới</span>
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              viewMode === 'analytics'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Báo cáo phân tích
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {formError && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#E31837]" />
            <span>{formError}</span>
          </div>
          <button onClick={() => setFormError('')} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* VIEW MODE 1: ENTRY FORM */}
      {viewMode === 'entry' && (
        <form onSubmit={handleConfirmSubmit} className="space-y-6">
          {formSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* PART 1: THÔNG TIN SỰ KIỆN VÀ NGUYÊN NHÂN PHÁT SINH */}
          <div className="rounded-3xl bg-white border border-gray-200/80 p-5 sm:p-7 space-y-5 shadow-xs">
            <div className="border-b border-gray-100 pb-3.5">
              <span className="text-xs font-bold text-[#E31837] uppercase tracking-wider block">Phần 1/4</span>
              <h2 className="text-base font-black text-gray-900 tracking-tight mt-0.5">
                01. Thông tin sự kiện và nguyên nhân phát sinh
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Khai báo nguồn, công đoạn và nhóm nguyên nhân gốc phát sinh sự cố tại hiện trường.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Nguồn phát sinh */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Nguồn phát sinh <span className="text-red-500">*</span>
                </label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value as LossEventSource)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
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
                <label className="block text-xs font-bold text-gray-700">
                  Công đoạn phát sinh <span className="text-red-500">*</span>
                </label>
                <select
                  value={formOriginStage}
                  onChange={(e) => setFormOriginStage(e.target.value as LossOriginStage)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
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
                <label className="block text-xs font-bold text-gray-700">Dây chuyền</label>
                <select
                  value={formLineId}
                  onChange={(e) => {
                    setFormLineId(e.target.value);
                    setManuallySelectedSkuId(null);
                    setManuallySelectedSessionId(null);
                    const eqs = getEquipmentsByLine(e.target.value);
                    if (eqs.length > 0) setFormEquipmentId(eqs[0].id);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
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
                <label className="block text-xs font-bold text-gray-700">Thiết bị phát sinh</label>
                <select
                  value={formEquipmentId}
                  onChange={(e) => setFormEquipmentId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
                >
                  {lineEquipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Phiên sản xuất & SKU */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">Phiên SKU sản xuất</label>
                  {currentRunningSession && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ● Đang chạy
                    </span>
                  )}
                </div>
                <select
                  value={formSkuId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManuallySelectedSkuId(val);
                    if (currentRunningSession && val === currentRunningSession.skuId) {
                      setManuallySelectedSessionId(currentRunningSession.id);
                    } else {
                      setManuallySelectedSessionId('');
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
                >
                  <option value="">-- Không gắn SKU / Ngoài phiên --</option>
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} {currentRunningSession?.skuId === s.id ? '(Đang chạy trên Line)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nhóm nguyên nhân MVP (9 nhóm) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Nhóm nguyên nhân (9 nhóm MVP) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => {
                    const grp = e.target.value as LossGroup;
                    setFormCategory(grp);
                    const base = DOWNTIME_REASONS[grp] || [];
                    if (base.length > 0) setFormReason(base[0]);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
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
                <label className="block text-xs font-bold text-gray-700">Nguyên nhân chi tiết</label>
                <select
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
                >
                  {reasonsForCategory.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ca sản xuất */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">Ca sản xuất</label>
                <select
                  value={formShiftId}
                  onChange={(e) => setFormShiftId(e.target.value as ShiftId)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
                >
                  {SHIFTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.displayTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày sản xuất */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">Ngày sản xuất</label>
                <input
                  type="date"
                  value={formProdDay}
                  onChange={(e) => setFormProdDay(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-bold text-gray-800 font-mono focus:border-[#E31837] focus:outline-none transition-colors"
                />
              </div>

              {/* Mô tả sự kiện */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Mô tả sự kiện chi tiết <span className="text-gray-400 font-normal">(Hiện trường ghi nhận)</span>
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả hiện tượng: kẹt van bồn nấu, rò rỉ cơ khí, sụt áp steam nguồn cấp..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 p-3 text-xs text-gray-900 focus:border-[#E31837] focus:outline-none leading-relaxed transition-colors"
                />
              </div>

              {/* Thời điểm bắt đầu sự cố */}
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">Thời điểm bắt đầu sự cố</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const nowVal = toLocalInputValue(new Date());
                        setStartDateTime(nowVal);
                        const iso = toSafeIso(nowVal);
                        if (iso) syncDraftTimestamps(iso, isOngoing ? null : endIsoString);
                      }}
                      className="text-[11px] font-bold text-[#E31837] hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Bây giờ
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const pastVal = toLocalInputValue(new Date(Date.now() - 15 * 60000));
                        setStartDateTime(pastVal);
                        const iso = toSafeIso(pastVal);
                        if (iso) syncDraftTimestamps(iso, isOngoing ? null : endIsoString);
                      }}
                      className="text-[11px] font-medium text-gray-600 hover:text-gray-900 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      -15p
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const pastVal = toLocalInputValue(new Date(Date.now() - 30 * 60000));
                        setStartDateTime(pastVal);
                        const iso = toSafeIso(pastVal);
                        if (iso) syncDraftTimestamps(iso, isOngoing ? null : endIsoString);
                      }}
                      className="text-[11px] font-medium text-gray-600 hover:text-gray-900 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      -30p
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const pastVal = toLocalInputValue(new Date(Date.now() - 60 * 60000));
                        setStartDateTime(pastVal);
                        const iso = toSafeIso(pastVal);
                        if (iso) syncDraftTimestamps(iso, isOngoing ? null : endIsoString);
                      }}
                      className="text-[11px] font-medium text-gray-600 hover:text-gray-900 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      -1h
                    </button>
                  </div>
                </div>

                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartDateTime(val);
                    const iso = toSafeIso(val);
                    if (iso) {
                      syncDraftTimestamps(iso, isOngoing ? null : endIsoString);
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-mono font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
                />
              </div>

              {/* Thời điểm kết thúc sự cố */}
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">Thời điểm kết thúc sự cố</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOngoing}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsOngoing(checked);
                        syncDraftTimestamps(startIsoString, checked ? null : endIsoString);
                      }}
                      className="rounded border-gray-300 text-[#E31837] focus:ring-[#E31837] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-rose-600">Đang tiếp diễn (Chưa kết thúc)</span>
                  </label>
                </div>

                {!isOngoing ? (
                  <div className="space-y-1.5">
                    <input
                      type="datetime-local"
                      value={endDateTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEndDateTime(val);
                        const iso = toSafeIso(val);
                        if (iso) {
                          syncDraftTimestamps(startIsoString, iso);
                        }
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 px-3 text-xs font-mono font-bold text-gray-800 focus:border-[#E31837] focus:outline-none transition-colors"
                    />
                    <div className="flex items-center justify-end gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const nowVal = toLocalInputValue(new Date());
                          setEndDateTime(nowVal);
                          const iso = toSafeIso(nowVal);
                          if (iso) syncDraftTimestamps(startIsoString, iso);
                        }}
                        className="text-[11px] font-bold text-[#E31837] hover:underline px-1 py-0.5 cursor-pointer"
                      >
                        Đặt bằng Hiện tại
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50/50 py-2.5 px-4 text-center text-red-700 text-xs font-bold">
                    Sự cố đang tiếp diễn — Tự động tạm tính Loss quy đổi đến hiện tại
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PART 2: GỢI Ý BỐI CẢNH MÁY (THAM KHẢO) */}
          {ruleSuggestions.length > 0 && (
            <div className="rounded-3xl bg-amber-50/40 border border-amber-200/80 p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-black text-amber-900 tracking-tight">
                    02. Gợi ý bối cảnh vận hành (Chỉ mang tính chất tham khảo)
                  </h3>
                </div>
                <span className="text-xs text-amber-700">
                  Người dùng luôn chủ động xác nhận hoặc chỉnh sửa theo thực tế
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {ruleSuggestions.map((sug) => (
                  <div
                    key={sug.ruleId}
                    className="rounded-2xl border border-amber-200 bg-white p-4 space-y-3 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900 text-xs">{sug.title}</span>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                          {getImpactLabel(sug.suggestedImpactType)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{sug.rationale}</p>
                      {sug.warningNote && (
                        <p className="text-xs text-amber-800 bg-amber-50/70 p-2 rounded-xl border border-amber-200/60">
                          {sug.warningNote}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-gray-100">
                      <span className="text-xs font-mono text-gray-500">
                        Gợi ý mức: <strong>{sug.suggestedPercent !== null ? `${sug.suggestedPercent}%` : 'Chưa định %'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyRuleSuggestion(sug)}
                        className="rounded-xl bg-[#E31837] hover:bg-red-700 px-3.5 py-1.5 font-bold text-xs text-white shadow-xs transition-colors cursor-pointer"
                      >
                        Áp dụng gợi ý
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PART 3: KHAI BÁO ẢNH HƯỞNG VẬN HÀNH THỰC TẾ & MỨC ĐỘ % */}
          <div className="rounded-3xl bg-white border border-gray-200/80 p-5 sm:p-7 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
              <div>
                <span className="text-xs font-bold text-[#E31837] uppercase tracking-wider block">Phần 3/4</span>
                <h3 className="text-base font-black text-gray-900 tracking-tight mt-0.5">
                  03. Khai báo ảnh hưởng vận hành thực tế
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Công thức: <strong>Loss quy đổi (phút) = Thời gian ảnh hưởng thực tế (phút) × Mức ảnh hưởng (%) / 100</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAddDraftInterval()}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <Plus className="h-4 w-4 text-[#E31837]" />
                <span>Thêm khoảng ảnh hưởng</span>
              </button>
            </div>

            {/* Intervals List */}
            {draftImpacts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/20 p-5 sm:p-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-[#E31837] shadow-xs">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-gray-900 tracking-tight">
                    Chưa chọn ảnh hưởng vận hành thực tế
                  </h4>
                  <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
                    Hệ thống <strong>không mặc định dừng nấu 100%</strong>. Vui lòng bấm chọn ảnh hưởng thực tế diễn ra tại hiện trường theo một trong các lựa chọn bên dưới:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 text-left">
                  {IMPACT_TYPES.map((t) => {
                    const isNone = t === 'NONE';
                    const isStop = t === 'STOP_COOK' || t === 'STOP_PACKING';
                    const isFeed = t === 'STOP_FEED_PACKING';
                    const isCongestion = t === 'COOLING_BUFFER_CONGESTION';

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectInitialImpact(t)}
                        className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col justify-between text-left group hover:scale-[1.01] active:scale-[0.99] ${
                          isNone
                            ? 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700'
                            : isStop
                            ? 'bg-white border-red-200 hover:border-red-400 hover:bg-red-50/50 text-gray-900 shadow-2xs'
                            : isFeed || isCongestion
                            ? 'bg-white border-teal-200 hover:border-teal-400 hover:bg-teal-50/50 text-gray-900 shadow-2xs'
                            : 'bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 text-gray-900 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-gray-900 group-hover:text-[#E31837] transition-colors">
                            {getImpactLabel(t)}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {getImpactScope(t)}
                          </span>
                        </div>
                        <span className="text-[11px] font-normal text-gray-500 mt-1.5 leading-snug line-clamp-2">
                          {IMPACT_TYPE_DEFINITIONS[t]?.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
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
                      className="rounded-2xl border border-gray-200 bg-gray-50/40 p-4 sm:p-5 space-y-4 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-extrabold text-gray-900">
                            Khoảng thời gian ảnh hưởng #{idx + 1}
                          </span>
                          <span aria-hidden="true" className="text-gray-300">·</span>
                          <span className="text-gray-500">
                            Phạm vi: <strong className="text-gray-800">{getImpactScope(draft.impactType)}</strong>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteDraftInterval(draft.tempId)}
                          className="text-xs text-gray-400 hover:text-red-600 p-1 transition-colors cursor-pointer font-medium"
                          title="Xóa khoảng này"
                        >
                          Xóa khoảng
                        </button>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Loại ảnh hưởng */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700">Loại ảnh hưởng vận hành</label>
                        <select
                          value={draft.impactType}
                          onChange={(e) => {
                            const newType = e.target.value as ImpactType;
                            handleUpdateDraftInterval(draft.tempId, {
                              impactType: newType,
                              impactPercent: newType === 'NONE' ? 0 : newType === 'STOP_COOK' || newType === 'STOP_PACKING' ? 100 : draft.impactPercent,
                              isInsufficientData: newType === 'COOLING_BUFFER_CONGESTION' && draft.isInsufficientData,
                            });
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs font-bold text-gray-900 focus:border-[#E31837] focus:outline-none"
                        >
                          {IMPACT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {getImpactLabel(t)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Công đoạn chịu ảnh hưởng */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700">Công đoạn chịu ảnh hưởng</label>
                        <select
                          value={draft.affectedStage}
                          onChange={(e) => handleUpdateDraftInterval(draft.tempId, { affectedStage: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs font-bold text-gray-900 focus:border-[#E31837] focus:outline-none"
                        >
                          {ORIGIN_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Mức ảnh hưởng % */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-gray-700">Mức ảnh hưởng (%)</label>
                          {isCongestion && (
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={draft.isInsufficientData}
                                onChange={(e) =>
                                  handleUpdateDraftInterval(draft.tempId, {
                                    isInsufficientData: e.target.checked,
                                    impactPercent: e.target.checked ? null : 50,
                                  })
                                }
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-bold text-purple-700">Chưa đủ dữ liệu %</span>
                            </label>
                          )}
                        </div>

                        {draft.isInsufficientData ? (
                          <div className="rounded-xl bg-purple-50 p-2 text-center text-xs text-purple-700 font-bold border border-purple-200">
                            Chưa đủ dữ liệu (Ghi nhận thời gian tồn tại)
                          </div>
                        ) : isNone ? (
                          <div className="rounded-xl bg-gray-100 p-2 text-center text-xs text-gray-600 font-bold">
                            0% (Không ảnh hưởng vận hành)
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {QUICK_PERCENTS.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleUpdateDraftInterval(draft.tempId, { impactPercent: p })}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                  draft.impactPercent === p
                                    ? 'bg-[#E31837] text-white border-[#E31837] shadow-2xs'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {p}%
                              </button>
                            ))}
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={draft.impactPercent || ''}
                              onChange={(e) =>
                                handleUpdateDraftInterval(draft.tempId, { impactPercent: Number(e.target.value) })
                              }
                              placeholder="1-100"
                              className="w-16 rounded-lg border border-gray-200 bg-white p-1.5 text-center font-mono font-bold text-xs text-gray-900 focus:border-[#E31837] focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calculated live metric for this interval */}
                    <div className="rounded-xl bg-white p-3 border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Thời lượng ảnh hưởng:</span>
                        <strong className="font-mono text-gray-900 font-bold">{metrics.durationMinutes} phút</strong>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-500">Mức %:</span>
                        <strong className="font-mono text-gray-900 font-bold">
                          {draft.isInsufficientData ? 'Chưa đủ dữ liệu' : `${draft.impactPercent}%`}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-gray-500">Loss quy đổi:</span>
                        <span className="font-mono text-rose-600 text-sm">
                          {metrics.convertedLossMinutes !== null ? `${metrics.convertedLossMinutes} phút` : 'Chưa định %'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

          {/* PART 4: XEM LẠI THÔNG TIN VÀ XÁC NHẬN LƯU */}
          <div className="rounded-3xl bg-white border border-gray-200/80 p-5 sm:p-7 space-y-4 shadow-xs">
            <div className="border-b border-gray-100 pb-3">
              <span className="text-xs font-bold text-[#E31837] uppercase tracking-wider block">Phần 4/4</span>
              <h3 className="text-base font-black text-gray-900 tracking-tight mt-0.5">
                04. Xem lại thông tin trước khi lưu
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200/60">
                <span className="text-xs text-gray-500 font-medium block">Thời gian sự cố gốc</span>
                <span className="text-2xl font-black text-gray-900 font-mono tabular-nums mt-1 block">
                  {calculatedDuration} phút
                </span>
                <span className="text-[11px] text-gray-400">Từ thời điểm bắt đầu - kết thúc</span>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200/60">
                <span className="text-xs text-gray-500 font-medium block">Số khoảng ảnh hưởng</span>
                <span className="text-2xl font-black text-gray-900 font-mono tabular-nums mt-1 block">
                  {draftImpacts.length} khoảng
                </span>
                <span className="text-[11px] text-gray-400">Khai báo độc lập từng công đoạn</span>
              </div>

              <div className="rounded-2xl bg-red-50 p-4 border border-red-200/80">
                <span className="text-xs text-red-700 font-bold block">Tổng Loss quy đổi tương đương</span>
                <span className="text-2xl font-black text-[#E31837] font-mono tabular-nums mt-1 block">
                  {draftMetricsSummary.totalConvertedLoss} phút
                </span>
                <span className="text-[11px] text-red-600 font-medium">
                  {draftMetricsSummary.hasInsufficientData ? 'Có khoảng gắn cờ Chưa đủ dữ liệu' : 'Đã xác nhận đầy đủ'}
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row justify-end items-center gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E31837] hover:bg-red-700 font-black text-xs text-white shadow-md shadow-red-200 transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Check className="h-4 w-4" />
                <span>Xác nhận & Lưu sự cố vào hệ thống</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* VIEW MODE 2: EVENT LIST */}
      {viewMode === 'list' && (
        <div className="space-y-5">
          {/* 4 Scope Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-2xl bg-white border border-gray-200/80 p-4 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium block">Phạm vi Nấu</span>
              <span className="text-3xl font-black text-rose-600 font-mono tabular-nums mt-1 block">
                {currentViewScopeMetrics['Nấu'].totalConvertedLossMinutes}m
              </span>
              <span className="text-[11px] text-gray-400">Dừng hoặc giảm tải nấu</span>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200/80 p-4 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium block">Phạm vi Cấp Tương</span>
              <span className="text-3xl font-black text-teal-700 font-mono tabular-nums mt-1 block">
                {currentViewScopeMetrics['Cấp tương'].totalConvertedLossMinutes}m
              </span>
              <span className="text-[11px] text-gray-400">Dừng cấp tương cho ĐG</span>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200/80 p-4 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium block">Phạm vi Đóng Gói</span>
              <span className="text-3xl font-black text-amber-600 font-mono tabular-nums mt-1 block">
                {currentViewScopeMetrics['Đóng gói'].totalConvertedLossMinutes}m
              </span>
              <span className="text-[11px] text-gray-400">Dừng hoặc giảm tốc ĐG</span>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200/80 p-4 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium block">Sự cố đang mở</span>
              <span className="text-3xl font-black text-red-600 font-mono tabular-nums mt-1 block">
                {ongoingLossLogs.length}
              </span>
              <span className="text-[11px] text-gray-400">Đang tiếp diễn tại máy</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rounded-3xl bg-white border border-gray-200/80 p-5 space-y-4 shadow-xs">
            {/* Row 1: Line Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Line:
                </span>
                <button
                  onClick={() => setFilterLineId('ALL')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    filterLineId === 'ALL'
                      ? 'bg-[#E31837] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tất cả ({lossLogs.length})
                </button>
                {lines.map((l) => {
                  const isSel = filterLineId === l.id;
                  const count = lossLogs.filter((x) => x.lineId === l.id).length;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setFilterLineId(l.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                        isSel
                          ? 'bg-[#E31837] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{l.code}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setViewMode('entry')}
                className="flex items-center gap-1.5 rounded-xl bg-[#E31837] hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer self-start sm:self-auto min-h-[40px]"
              >
                <Plus className="h-4 w-4" />
                <span>Ghi nhận sự cố mới</span>
              </button>
            </div>

            {/* Row 2: Shift, Date & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-gray-500 mr-1">Ca:</span>
                <button
                  onClick={() => setFilterShiftId('ALL')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    filterShiftId === 'ALL'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tất cả
                </button>
                {SHIFTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterShiftId(s.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                      filterShiftId === s.id
                        ? 'bg-[#E31837] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-2.5 py-1.5 border border-gray-200 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-[#E31837]" />
                  <input
                    type="date"
                    disabled={isFilterAllDates}
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setIsFilterAllDates(false);
                    }}
                    className="bg-transparent text-gray-800 font-mono text-xs font-bold focus:outline-none cursor-pointer disabled:opacity-40"
                  />
                  <button
                    onClick={() => {
                      setFilterDate(todayStr);
                      setIsFilterAllDates(false);
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                      !isFilterAllDates && filterDate === todayStr
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    onClick={() => setIsFilterAllDates(!isFilterAllDates)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                      isFilterAllDates ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Tất cả
                  </button>
                </div>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm sự cố, nguyên nhân, thiết bị..."
                    className="rounded-xl border border-gray-200 bg-white pl-8 pr-7 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-[#E31837] focus:outline-none w-56"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Event Cards List */}
          <div className="space-y-3.5">
            {filteredLossLogs.length === 0 ? (
              <div className="rounded-3xl bg-white border border-gray-200 p-12 text-center text-gray-400 space-y-3">
                <ClockAlert className="h-10 w-10 mx-auto text-gray-300" />
                <p className="text-sm font-bold text-gray-700">
                  Không tìm thấy sự cố dừng máy nào phù hợp với bộ lọc hiện tại.
                </p>
                <button
                  onClick={() => setViewMode('entry')}
                  className="rounded-xl bg-[#E31837] hover:bg-red-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
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
                    className="rounded-3xl bg-white border border-gray-200/80 p-5 hover:border-gray-300 transition-all shadow-xs space-y-3.5"
                  >
                    {/* Top Row: Context & Duration */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                        <span className="font-bold text-gray-900">
                          {lineObj ? `${lineObj.code} - ${lineObj.name.split(' (')[0]}` : log.lineId}
                        </span>
                        <span aria-hidden="true" className="text-gray-300">·</span>
                        <span>{shiftObj?.name || log.shiftId}</span>
                        <span aria-hidden="true" className="text-gray-300">·</span>
                        <span className="font-mono text-gray-700">{formatDateVN(log.productionDate)}</span>
                        <span aria-hidden="true" className="text-gray-300">·</span>
                        <span className="font-mono text-gray-700 font-medium">
                          {formatTime(log.startedAt)} - {log.endedAt ? formatTime(log.endedAt) : 'Đang tiếp diễn'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {log.durationMinutes} phút sự cố
                        </span>
                        {isLogOngoing ? (
                          <button
                            onClick={() => handleOpenEndModal(log.id)}
                            className="text-xs font-bold px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-colors shadow-2xs"
                          >
                            Đang dừng · Đóng sự cố
                          </button>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">
                            Đã kết thúc
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Cause & Description */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-lg bg-red-50 text-[#E31837] border border-red-200 px-2.5 py-0.5 text-xs font-bold">
                            {log.lossGroup}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900">
                            {log.downtimeReason || 'Sự cố dừng máy'}
                          </h4>
                          <span className="text-xs text-gray-400">({log.equipmentId})</span>
                        </div>
                        {log.description && (
                          <p className="text-xs text-gray-600 leading-relaxed">{log.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-0.5">
                          <span>Nguồn: <strong>{log.source || 'CBTO'}</strong></span>
                          <span>·</span>
                          <span>Công đoạn gốc: <strong>{log.originStage || 'Nấu'}</strong></span>
                          <span>·</span>
                          <span>Người ghi nhận: <strong>{log.reportedByName}</strong></span>
                        </div>
                      </div>

                      {/* Impacts Mini List on Right */}
                      <div className="md:w-80 bg-gray-50/80 rounded-2xl p-3 border border-gray-200/60 space-y-2 shrink-0">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 border-b border-gray-200/50 pb-1.5">
                          <span>Ảnh hưởng vận hành ({impacts.length}):</span>
                          <span className="text-[#E31837]">Loss quy đổi</span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {impacts.length === 0 ? (
                            <span className="text-[11px] text-gray-400 italic">Chưa khai báo ảnh hưởng</span>
                          ) : (
                            impacts.map((imp, i) => (
                              <div
                                key={imp.impactId || i}
                                className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-gray-200/70"
                              >
                                <div className="truncate mr-2">
                                  <span className="font-bold text-gray-800 text-[11px] block truncate">
                                    {getImpactLabel(imp.impactType)}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {imp.impactPercent !== null ? `${imp.impactPercent}%` : 'Chưa định %'} · {imp.affectedStage}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-xs text-rose-600 shrink-0">
                                  {imp.convertedLossMinutes !== null ? `${imp.convertedLossMinutes}m` : '--'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Action bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setDetailModalLog(log)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
                        <span>Xem chi tiết & Xác nhận</span>
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                        title="Xóa sự cố này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: ANALYTICS TABLE */}
      {viewMode === 'analytics' && (
        <div className="rounded-3xl bg-white border border-gray-200/80 p-5 sm:p-7 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight">
                Ma Trận Phân Bổ 9 Nhóm Nguyên Nhân Theo 3 Phạm Vi Vận Hành
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Độc lập 3 phạm vi: Nấu · Cấp Tương · Đóng Gói (Anti-Duplication Principle)
              </p>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="text-xs font-bold text-[#E31837] hover:underline cursor-pointer"
            >
              ← Quay lại danh sách
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <th className="p-3">Nhóm nguyên nhân (9 nhóm MVP)</th>
                  <th className="p-3 text-right">Số sự cố</th>
                  <th className="p-3 text-right">Thời gian sự cố (phút)</th>
                  <th className="p-3 text-right text-rose-600">Loss Nấu (phút)</th>
                  <th className="p-3 text-right text-teal-700">Loss Cấp Tương (phút)</th>
                  <th className="p-3 text-right text-amber-600">Loss Đóng Gói (phút)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {OFFICIAL_LOSS_GROUPS.map((grp) => {
                  const grpLogs = filteredLossLogs.filter((l) => l.lossGroup === grp);
                  const grpDuration = grpLogs.reduce((acc, cur) => acc + (cur.durationMinutes || 0), 0);
                  const grpImpacts = grpLogs.flatMap((l) => l.impacts || []);

                  let cookLoss = 0;
                  let feedLoss = 0;
                  let packLoss = 0;

                  grpImpacts.forEach((imp) => {
                    const m = calculateImpactMetrics(imp, nowMs);
                    const mins = m.convertedLossMinutes || 0;
                    if (imp.impactScope === 'Nấu') cookLoss += mins;
                    else if (imp.impactScope === 'Cấp tương') feedLoss += mins;
                    else if (imp.impactScope === 'Đóng gói') packLoss += mins;
                  });

                  return (
                    <tr key={grp} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3 font-bold text-gray-900">{grp}</td>
                      <td className="p-3 text-right font-mono text-gray-600">{grpLogs.length}</td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">{grpDuration}m</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{cookLoss}m</td>
                      <td className="p-3 text-right font-mono font-bold text-teal-700">{feedLoss}m</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600">{packLoss}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ClockAlert className="h-5 w-5 text-[#E31837]" />
                <h3 className="font-black text-gray-900 text-base">
                  Chi Tiết Sự Cố: {detailModalLog.downtimeReason || detailModalLog.lossGroup}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalLog(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
              <div>
                <span className="text-gray-400 block text-[11px]">Dây chuyền</span>
                <span className="font-bold text-gray-800">{detailModalLog.lineId}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Nhóm nguyên nhân</span>
                <span className="font-bold text-[#E31837]">{detailModalLog.lossGroup}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Thời gian sự cố</span>
                <span className="font-bold text-gray-800 font-mono">{detailModalLog.durationMinutes} phút</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Trạng thái</span>
                <span className="font-bold text-gray-800">
                  {detailModalLog.endedAt ? 'Đã kết thúc' : 'Đang tiếp diễn'}
                </span>
              </div>
            </div>

            {/* Impacts Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-sm">Danh Sách Ảnh Hưởng Vận Hành Đã Khai Báo</h4>
              <div className="space-y-2">
                {(detailModalLog.impacts || []).map((imp, idx) => {
                  const m = calculateImpactMetrics(imp, nowMs);
                  return (
                    <div
                      key={imp.impactId || idx}
                      className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{getImpactLabel(imp.impactType)}</span>
                        <span className="font-mono font-bold text-rose-600">
                          {m.convertedLossMinutes !== null ? `${m.convertedLossMinutes}m quy đổi` : 'Chưa định %'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500 text-[11px]">
                        <span>Phạm vi: <strong>{imp.impactScope}</strong></span>
                        <span>·</span>
                        <span>Mức: <strong>{imp.impactPercent !== null ? `${imp.impactPercent}%` : 'Chưa đủ dữ liệu'}</strong></span>
                        <span>·</span>
                        <span>Trạng thái: <strong className="text-gray-700">{imp.confirmationStatus}</strong></span>
                      </div>
                      {imp.note && <p className="text-gray-600 text-[11px] italic">{imp.note}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalLog(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* END LOSS MODAL */}
      {endingLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-black text-base border-b border-gray-100 pb-3">
              <Clock className="h-5 w-5" />
              <span>Chốt Kết Thúc Sự Cố Dừng Máy</span>
            </div>

            <p className="text-gray-600">
              Nhập thời điểm máy bắt đầu chạy lại hoặc hoàn tất xử lý sự cố:
            </p>

            <input
              type="datetime-local"
              value={endDateTimeInput}
              onChange={(e) => setEndDateTimeInput(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs font-mono font-bold text-gray-900 focus:border-[#E31837] focus:outline-none"
            />

            <div className="border-t border-gray-100 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEndingLogId(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmEndLog}
                className="px-5 py-2 rounded-xl bg-[#E31837] hover:bg-red-700 font-bold text-white shadow-xs cursor-pointer"
              >
                Xác nhận kết thúc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

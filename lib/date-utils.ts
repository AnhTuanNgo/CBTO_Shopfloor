import {
  ShiftId,
  ShiftInfo,
  ImpactType,
  ImpactScope,
  ImpactConfirmationStatus,
  EventImpactItem,
  ReadinessConclusion,
  Equipment,
  ChecklistItemConfig,
  EquipmentReadinessLog,
} from './types';

export const SHIFTS: ShiftInfo[] = [
  { id: 'SHIFT_A', name: 'Ca A', startHour: 6, endHour: 14, displayTime: '06:00 - 14:00' },
  { id: 'SHIFT_B', name: 'Ca B', startHour: 14, endHour: 22, displayTime: '14:00 - 22:00' },
  { id: 'SHIFT_C', name: 'Ca C', startHour: 22, endHour: 6, displayTime: '22:00 - 06:00 (hôm sau)' },
];

/**
 * Calculates CBTO Production Date (Ngày sản xuất):
 * Từ 06:00 ngày D đến trước 06:00 ngày D+1.
 * Trả về chuỗi YYYY-MM-DD.
 */
export function getProductionDate(dateInput: Date | string = new Date()): string {
  const d = new Date(dateInput);
  // Subtract 6 hours to shift the cut-off from midnight to 06:00
  const adjusted = new Date(d.getTime() - 6 * 60 * 60 * 1000);
  const year = adjusted.getFullYear();
  const month = String(adjusted.getMonth() + 1).padStart(2, '0');
  const day = String(adjusted.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determines current Shift based on hour of day
 */
export function getCurrentShift(dateInput: Date | string = new Date()): ShiftId {
  const d = new Date(dateInput);
  const hour = d.getHours();
  if (hour >= 6 && hour < 14) return 'SHIFT_A';
  if (hour >= 14 && hour < 22) return 'SHIFT_B';
  return 'SHIFT_C';
}

/**
 * Formats ISO string or Date to Vietnamese readable format
 */
export function formatTime(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateTime(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '--:-- --/--';
  return `${formatTime(d)} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDateVN(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '--/--/----';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Split interval over 06:00 boundary for AC-05
 * Returns map of productionDate -> minutes
 */
export function splitLossByProductionDate(
  startIso: string,
  endIso: string
): { [prodDate: string]: number } {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (end <= start) return {};

  const result: { [prodDate: string]: number } = {};
  
  // Step in 1-minute increments or boundary jumps
  let current = start;
  while (current < end) {
    const prodDate = getProductionDate(new Date(current));
    // Determine the next 06:00 boundary in ms
    const curDateObj = new Date(current);
    // Find next 06:00
    const boundary = new Date(curDateObj);
    if (boundary.getHours() < 6) {
      boundary.setHours(6, 0, 0, 0);
    } else {
      boundary.setDate(boundary.getDate() + 1);
      boundary.setHours(6, 0, 0, 0);
    }
    const boundaryTime = boundary.getTime();
    const nextHop = Math.min(end, boundaryTime);
    const durationMinutes = (nextHop - current) / (1000 * 60);

    result[prodDate] = (result[prodDate] || 0) + durationMinutes;
    current = nextHop;
  }

  return result;
}

/**
 * Calculates non-overlapping line stoppage minutes for AC-06
 * Merges overlapping intervals [start, end]
 */
export function calculateNonOverlappingMinutes(
  intervals: { start: string; end: string | null }[],
  nowMs: number = Date.now()
): number {
  if (intervals.length === 0) return 0;

  // Convert to [startMs, endMs]
  const validIntervals: [number, number][] = intervals
    .map((item) => {
      const s = new Date(item.start).getTime();
      const e = item.end ? new Date(item.end).getTime() : nowMs;
      return [s, Math.max(s, e)] as [number, number];
    })
    .filter(([s, e]) => !isNaN(s) && !isNaN(e) && e >= s)
    .sort((a, b) => a[0] - b[0]);

  if (validIntervals.length === 0) return 0;

  // Merge overlapping
  const merged: [number, number][] = [];
  let [currStart, currEnd] = validIntervals[0];

  for (let i = 1; i < validIntervals.length; i++) {
    const [nextStart, nextEnd] = validIntervals[i];
    if (nextStart <= currEnd) {
      // Overlapping or adjacent
      currEnd = Math.max(currEnd, nextEnd);
    } else {
      merged.push([currStart, currEnd]);
      currStart = nextStart;
      currEnd = nextEnd;
    }
  }
  merged.push([currStart, currEnd]);

  // Sum merged durations in minutes
  const totalMs = merged.reduce((acc, [s, e]) => acc + (e - s), 0);
  return Math.round(totalMs / (1000 * 60));
}

/**
 * Runtime threshold calculation
 */
export interface RuntimeStatusInfo {
  elapsedHours: number;
  remainingHours: number;
  usagePercent: number;
  expectedCipTime: string;
  badgeLevel: 'NORMAL' | 'NOTICE' | 'WARNING' | 'DUE' | 'OVERDUE' | 'INSUFFICIENT';
  badgeLabel: string;
  badgeColorClass: string;
}

export function computeRuntimeStatus(
  startedAt?: string | null,
  limitHours?: number | null,
  stoppedAt?: string | null,
  nowInput: Date | number = Date.now()
): RuntimeStatusInfo {
  if (!startedAt || !limitHours || limitHours <= 0) {
    return {
      elapsedHours: 0,
      remainingHours: 0,
      usagePercent: 0,
      expectedCipTime: '--',
      badgeLevel: 'INSUFFICIENT',
      badgeLabel: 'Chưa đủ dữ liệu',
      badgeColorClass: 'text-slate-400 bg-slate-800/80 border-slate-700',
    };
  }

  const startMs = new Date(startedAt).getTime();
  const endMs = stoppedAt ? new Date(stoppedAt).getTime() : (typeof nowInput === 'number' ? nowInput : nowInput.getTime());
  const elapsedMs = Math.max(0, endMs - startMs);
  const elapsedHours = +(elapsedMs / (1000 * 60 * 60)).toFixed(1);
  const remainingHours = +(limitHours - elapsedHours).toFixed(1);
  const usagePercent = +((elapsedHours / limitHours) * 100).toFixed(1);

  const expCipDate = new Date(startMs + limitHours * 3600 * 1000);
  const expectedCipTime = formatDateTime(expCipDate);

  if (usagePercent > 100) {
    return {
      elapsedHours,
      remainingHours,
      usagePercent,
      expectedCipTime,
      badgeLevel: 'OVERDUE',
      badgeLabel: `Quá hạn CIP (+${Math.abs(remainingHours)}h)`,
      badgeColorClass: 'text-rose-400 bg-rose-500/15 border-rose-500/40',
    };
  }

  if (usagePercent === 100 || remainingHours === 0) {
    return {
      elapsedHours,
      remainingHours: 0,
      usagePercent: 100,
      expectedCipTime,
      badgeLevel: 'DUE',
      badgeLabel: 'Đến hạn CIP — còn 0 giờ',
      badgeColorClass: 'text-orange-400 bg-orange-500/15 border-orange-500/40',
    };
  }

  if (usagePercent >= 90) {
    return {
      elapsedHours,
      remainingHours,
      usagePercent,
      expectedCipTime,
      badgeLevel: 'WARNING',
      badgeLabel: `Sắp đến hạn CIP (${usagePercent}%)`,
      badgeColorClass: 'text-orange-400 bg-orange-500/15 border-orange-500/40',
    };
  }

  if (usagePercent >= 80) {
    return {
      elapsedHours,
      remainingHours,
      usagePercent,
      expectedCipTime,
      badgeLevel: 'NOTICE',
      badgeLabel: `Lưu ý Runtime (${usagePercent}%)`,
      badgeColorClass: 'text-amber-400 bg-amber-500/15 border-amber-500/40',
    };
  }

  return {
    elapsedHours,
    remainingHours,
    usagePercent,
    expectedCipTime,
    badgeLevel: 'NORMAL',
    badgeLabel: `Bình thường (${usagePercent}%)`,
    badgeColorClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
  };
}

// ----------------------------------------------------
// Operational Impact & Converted Loss Helpers
// ----------------------------------------------------

export const IMPACT_TYPE_DEFINITIONS: Record<
  ImpactType,
  { label: string; defaultScope: ImpactScope; description: string }
> = {
  NONE: {
    label: 'Không ảnh hưởng vận hành',
    defaultScope: 'Khác',
    description: 'Sự cố ghi nhận để phân tích nguyên nhân, mức ảnh hưởng 0%, Loss quy đổi 0 phút',
  },
  REDUCE_COOK_CAPACITY: {
    label: 'Giảm năng lực nấu',
    defaultScope: 'Nấu',
    description: 'Một phần thiết bị nấu dừng hoặc giảm tốc độ gia nhiệt/phối trộn',
  },
  STOP_COOK: {
    label: 'Dừng nấu',
    defaultScope: 'Nấu',
    description: 'Toàn bộ cụm bồn nấu dừng hoạt động hoàn toàn (100%)',
  },
  STOP_FEED_PACKING: {
    label: 'Dừng cấp tương cho ĐG',
    defaultScope: 'Cấp tương',
    description: 'Nghẽn bơm/đường ống chuyển tương, không tự suy diễn dừng Đóng gói',
  },
  COOLING_BUFFER_CONGESTION: {
    label: 'Ứ bồn làm nguội',
    defaultScope: 'Cấp tương',
    description: 'Tương tích lũy tại làm nguội; nếu chưa có tỷ lệ ảnh hưởng thì chưa đủ dữ liệu tính Loss',
  },
  STOP_PACKING: {
    label: 'Dừng đóng gói',
    defaultScope: 'Đóng gói',
    description: 'Máy chiết rót, đóng nắp, dán nhãn hoặc đóng thùng dừng hoàn toàn',
  },
  REDUCE_PACKING_SPEED: {
    label: 'Giảm tốc đóng gói',
    defaultScope: 'Đóng gói',
    description: 'Dây chuyền đóng gói chạy chậm hơn định mức thiết kế',
  },
};

export function getImpactLabel(type: ImpactType): string {
  return IMPACT_TYPE_DEFINITIONS[type]?.label || type;
}

export function getImpactScope(type: ImpactType): ImpactScope {
  return IMPACT_TYPE_DEFINITIONS[type]?.defaultScope || 'Khác';
}

export function getImpactStatusBadge(status: ImpactConfirmationStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Đã xác nhận',
        badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      };
    case 'PROVISIONAL':
      return {
        label: 'Tạm tính (Đang diễn ra)',
        badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'Chưa đủ dữ liệu',
        badgeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      };
    case 'UNREVIEWED':
      return {
        label: 'Chưa rà soát',
        badgeClass: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
      };
    default:
      return {
        label: status,
        badgeClass: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
      };
  }
}

/**
 * Calculates Duration and Converted Loss (Loss quy đổi) for an impact item
 * Formula: Converted Loss (phút) = Actual Duration (phút) * Impact Percent (%) / 100
 */
export function calculateImpactMetrics(
  impact: {
    impactType: ImpactType;
    impactStartedAt: string;
    impactEndedAt: string | null;
    impactPercent: number | null;
    confirmationStatus?: ImpactConfirmationStatus;
  },
  nowMs: number = Date.now()
): {
  durationMinutes: number;
  convertedLossMinutes: number | null;
  status: ImpactConfirmationStatus;
} {
  const startMs = new Date(impact.impactStartedAt).getTime();
  const isOngoing = !impact.impactEndedAt;
  const endMs = isOngoing ? nowMs : new Date(impact.impactEndedAt!).getTime();
  const rawDuration = Math.max(0, (endMs - startMs) / 60000);
  const durationMinutes = Math.round(rawDuration);

  // Status deduction
  let status: ImpactConfirmationStatus = impact.confirmationStatus || (isOngoing ? 'PROVISIONAL' : 'CONFIRMED');

  if (impact.impactType === 'NONE') {
    return {
      durationMinutes,
      convertedLossMinutes: 0,
      status: isOngoing ? 'PROVISIONAL' : 'CONFIRMED',
    };
  }

  if (impact.impactType === 'COOLING_BUFFER_CONGESTION' && (impact.impactPercent === null || impact.impactPercent === undefined)) {
    return {
      durationMinutes,
      convertedLossMinutes: null, // "Chưa đủ dữ liệu"
      status: 'INSUFFICIENT_DATA',
    };
  }

  if (impact.impactPercent === null || impact.impactPercent === undefined) {
    return {
      durationMinutes,
      convertedLossMinutes: null,
      status: 'INSUFFICIENT_DATA',
    };
  }

  // Exact converted loss (floating point before rounded display)
  const convertedLossExact = (rawDuration * impact.impactPercent) / 100;
  const convertedLossMinutes = Math.round(convertedLossExact);

  return {
    durationMinutes,
    convertedLossMinutes,
    status,
  };
}

export interface ScopeMetricItem {
  totalDurationMinutes: number;
  totalConvertedLossMinutes: number;
  rawSumConvertedLossMinutes: number;
  overlapSavedMinutes: number;
  hasInsufficientData: boolean;
  impactCount: number;
}

/**
 * Calculates sum of converted loss for a list of impacts, grouped by scope.
 * Prevents naive cross-scope summation.
 * Accurately handles time-overlapping impacts on the same line to avoid double-counting
 * capacity loss in the same timeframe (capped at 100% operational capacity per line).
 */
export function calculateScopeLossMetrics(
  impacts: EventImpactItem[],
  nowMs: number = Date.now()
): Record<ImpactScope, ScopeMetricItem> {
  const scopes: Record<ImpactScope, ScopeMetricItem> = {
    'Nấu': { totalDurationMinutes: 0, totalConvertedLossMinutes: 0, rawSumConvertedLossMinutes: 0, overlapSavedMinutes: 0, hasInsufficientData: false, impactCount: 0 },
    'Cấp tương': { totalDurationMinutes: 0, totalConvertedLossMinutes: 0, rawSumConvertedLossMinutes: 0, overlapSavedMinutes: 0, hasInsufficientData: false, impactCount: 0 },
    'Đóng gói': { totalDurationMinutes: 0, totalConvertedLossMinutes: 0, rawSumConvertedLossMinutes: 0, overlapSavedMinutes: 0, hasInsufficientData: false, impactCount: 0 },
    'Khác': { totalDurationMinutes: 0, totalConvertedLossMinutes: 0, rawSumConvertedLossMinutes: 0, overlapSavedMinutes: 0, hasInsufficientData: false, impactCount: 0 },
  };

  const scopeKeys: ImpactScope[] = ['Nấu', 'Cấp tương', 'Đóng gói', 'Khác'];

  scopeKeys.forEach((scope) => {
    const scopeImpacts = impacts.filter((imp) => (imp.impactScope || getImpactScope(imp.impactType)) === scope);
    scopes[scope].impactCount = scopeImpacts.length;

    if (scopeImpacts.length === 0) return;

    // Group impacts by line to respect physical production boundaries
    const lineGroupMap: Record<string, EventImpactItem[]> = {};
    let rawSumLoss = 0;
    let hasInsufficient = false;

    scopeImpacts.forEach((imp) => {
      const lineKey = imp.affectedLineId || 'DEFAULT_LINE';
      if (!lineGroupMap[lineKey]) lineGroupMap[lineKey] = [];
      lineGroupMap[lineKey].push(imp);

      const m = calculateImpactMetrics(imp, nowMs);
      if (m.convertedLossMinutes !== null) {
        rawSumLoss += m.convertedLossMinutes;
      } else {
        hasInsufficient = true;
      }
    });

    scopes[scope].rawSumConvertedLossMinutes = Math.round(rawSumLoss);
    scopes[scope].hasInsufficientData = hasInsufficient;

    let totalScopeDedupConvertedLoss = 0;
    let totalScopeDedupDuration = 0;

    // Process each line independently with time-slice deduplication
    Object.values(lineGroupMap).forEach((lineImpacts) => {
      interface IntervalItem {
        startMs: number;
        endMs: number;
        percent: number;
      }

      const validIntervals: IntervalItem[] = [];

      lineImpacts.forEach((imp) => {
        if (imp.impactType === 'NONE') return;
        const startMs = new Date(imp.impactStartedAt).getTime();
        const endMs = imp.impactEndedAt ? new Date(imp.impactEndedAt).getTime() : nowMs;
        if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return;

        const percent = imp.impactPercent !== null && imp.impactPercent !== undefined ? imp.impactPercent : 0;
        validIntervals.push({ startMs, endMs, percent });
      });

      if (validIntervals.length === 0) return;

      // Extract unique boundary timestamps
      const pointsSet = new Set<number>();
      validIntervals.forEach((inv) => {
        pointsSet.add(inv.startMs);
        pointsSet.add(inv.endMs);
      });
      const sortedPoints = Array.from(pointsSet).sort((a, b) => a - b);

      let lineDedupLoss = 0;
      let lineDedupDuration = 0;

      // Slice through contiguous timeline chunks
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const segStart = sortedPoints[i];
        const segEnd = sortedPoints[i + 1];
        const segMinutes = (segEnd - segStart) / 60000;
        if (segMinutes <= 0) continue;

        // Find intervals covering this chunk
        const covering = validIntervals.filter((inv) => inv.startMs <= segStart && inv.endMs >= segEnd);
        if (covering.length === 0) continue;

        // If at least one impact was active, duration adds up without double-counting elapsed time
        lineDedupDuration += segMinutes;

        // Effective capacity loss capped at 100% of line capacity
        const combinedPercent = covering.reduce((sum, inv) => sum + inv.percent, 0);
        const effectivePercent = Math.min(100, Math.max(0, combinedPercent));

        lineDedupLoss += (segMinutes * effectivePercent) / 100;
      }

      totalScopeDedupConvertedLoss += lineDedupLoss;
      totalScopeDedupDuration += lineDedupDuration;
    });

    const finalConverted = Math.round(totalScopeDedupConvertedLoss);
    scopes[scope].totalConvertedLossMinutes = finalConverted;
    scopes[scope].totalDurationMinutes = Math.round(totalScopeDedupDuration);
    scopes[scope].overlapSavedMinutes = Math.max(0, scopes[scope].rawSumConvertedLossMinutes - finalConverted);
  });

  return scopes;
}

/**
 * Splits an event/impact time interval into shift-bounded segments:
 * Slices cleanly at 06:00, 14:00, 22:00.
 * Preserves the exact same event / impact identity while attributing duration to respective shifts.
 */
export interface ShiftAllocatedSegment {
  productionDate: string;
  shiftId: ShiftId;
  startIso: string;
  endIso: string;
  durationMinutes: number;
}

export function splitIntervalByShiftBoundaries(
  startIso: string,
  endIso: string | null,
  nowMs: number = Date.now()
): ShiftAllocatedSegment[] {
  const startMs = new Date(startIso).getTime();
  const endMs = endIso ? new Date(endIso).getTime() : nowMs;
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return [];

  const segments: ShiftAllocatedSegment[] = [];
  let cur = startMs;

  while (cur < endMs) {
    const d = new Date(cur);
    const h = d.getHours();

    // Determine the next upcoming boundary (06:00, 14:00, 22:00)
    const nextBoundary = new Date(d);
    if (h < 6) {
      nextBoundary.setHours(6, 0, 0, 0);
    } else if (h < 14) {
      nextBoundary.setHours(14, 0, 0, 0);
    } else if (h < 22) {
      nextBoundary.setHours(22, 0, 0, 0);
    } else {
      nextBoundary.setDate(nextBoundary.getDate() + 1);
      nextBoundary.setHours(6, 0, 0, 0);
    }

    const nextHop = Math.min(endMs, nextBoundary.getTime());
    const durationMinutes = Math.max(0, (nextHop - cur) / 60000);

    if (durationMinutes > 0) {
      // Middle of segment to reliably calculate production date & shift
      const midDate = new Date(cur + (nextHop - cur) / 2);
      segments.push({
        productionDate: getProductionDate(midDate),
        shiftId: getCurrentShift(midDate),
        startIso: new Date(cur).toISOString(),
        endIso: new Date(nextHop).toISOString(),
        durationMinutes: Math.round(durationMinutes),
      });
    }

    cur = nextHop;
  }

  return segments;
}

/**
 * Calculates duration and converted loss minutes of an impact allocated strictly
 * within a target production date and shift.
 */
export function calculateShiftAllocatedImpact(
  impact: EventImpactItem,
  targetProductionDate: string,
  targetShiftId: ShiftId,
  nowMs: number = Date.now()
): { durationMinutes: number; convertedLossMinutes: number | null } {
  if (impact.impactType === 'NONE') {
    return { durationMinutes: 0, convertedLossMinutes: 0 };
  }

  const segments = splitIntervalByShiftBoundaries(impact.impactStartedAt, impact.impactEndedAt, nowMs);
  const matched = segments.filter(
    (s) => s.productionDate === targetProductionDate && s.shiftId === targetShiftId
  );

  const durationMinutes = matched.reduce((sum, s) => sum + s.durationMinutes, 0);

  if (impact.confirmationStatus === 'INSUFFICIENT_DATA' || impact.impactPercent === null) {
    return { durationMinutes, convertedLossMinutes: null };
  }

  const percent = Math.min(100, Math.max(0, impact.impactPercent));
  const convertedLossMinutes = Math.round((durationMinutes * percent) / 100);

  return { durationMinutes, convertedLossMinutes };
}

/**
 * Evaluates line readiness conclusion strictly based on equipment checklist configs and logs:
 * NEVER concludes READY if any mandatory equipment is unchecked, not configured, or missing data.
 */
export function evaluateLineReadinessConclusion(
  lineEquipments: Equipment[],
  checklistConfigs: ChecklistItemConfig[],
  lineReadinessLogs: EquipmentReadinessLog[],
  targetDate: string,
  targetShift: ShiftId
): {
  conclusion: ReadinessConclusion;
  totalEquipments: number;
  readyCount: number;
  conditionalCount: number;
  notReadyCount: number;
  uncheckedCount: number;
  notConfiguredCount: number;
  unreadyEquipmentNames: string[];
} {
  if (lineEquipments.length === 0) {
    return {
      conclusion: 'NOT_CONFIGURED',
      totalEquipments: 0,
      readyCount: 0,
      conditionalCount: 0,
      notReadyCount: 0,
      uncheckedCount: 0,
      notConfiguredCount: 0,
      unreadyEquipmentNames: [],
    };
  }

  let readyCount = 0;
  let conditionalCount = 0;
  let notReadyCount = 0;
  let uncheckedCount = 0;
  let notConfiguredCount = 0;
  const unreadyEquipmentNames: string[] = [];

  lineEquipments.forEach((eq) => {
    const hasConfig = checklistConfigs.some((c) => c.equipmentId === eq.id && c.active);
    if (!hasConfig) {
      notConfiguredCount++;
      unreadyEquipmentNames.push(`${eq.name} (Chưa cấu hình câu hỏi)`);
      return;
    }

    const log = lineReadinessLogs.find(
      (l) => l.equipmentId === eq.id && l.productionDate === targetDate && l.shiftId === targetShift
    );

    if (!log) {
      uncheckedCount++;
      unreadyEquipmentNames.push(`${eq.name} (Chưa kiểm tra đầu ca)`);
      return;
    }

    if (log.conclusion === 'READY') {
      readyCount++;
    } else if (log.conclusion === 'CONDITIONAL') {
      conditionalCount++;
      unreadyEquipmentNames.push(`${eq.name} (Có điều kiện theo dõi)`);
    } else if (log.conclusion === 'NOT_READY') {
      notReadyCount++;
      unreadyEquipmentNames.push(`${eq.name} (Không đạt - Cần xử lý)`);
    } else if (log.conclusion === 'UNCHECKED') {
      uncheckedCount++;
      unreadyEquipmentNames.push(`${eq.name} (Chưa hoàn thành kiểm tra)`);
    } else {
      notConfiguredCount++;
      unreadyEquipmentNames.push(`${eq.name} (Chưa cấu hình đầy đủ)`);
    }
  });

  let conclusion: ReadinessConclusion = 'READY';
  if (notReadyCount > 0) {
    conclusion = 'NOT_READY';
  } else if (conditionalCount > 0) {
    conclusion = 'CONDITIONAL';
  } else if (uncheckedCount > 0) {
    conclusion = 'UNCHECKED';
  } else if (notConfiguredCount > 0) {
    conclusion = 'NOT_CONFIGURED';
  } else if (readyCount === lineEquipments.length) {
    conclusion = 'READY';
  } else {
    conclusion = 'UNCHECKED';
  }

  return {
    conclusion,
    totalEquipments: lineEquipments.length,
    readyCount,
    conditionalCount,
    notReadyCount,
    uncheckedCount,
    notConfiguredCount,
    unreadyEquipmentNames,
  };
}


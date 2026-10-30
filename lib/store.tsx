'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  Line,
  Equipment,
  SKU,
  AMChecklist,
  AbnormalLog,
  LossLog,
  OperationLog,
  RuntimeTracking,
  CIPTracking,
  ShiftHandover,
  ProductionProgress,
  WorkSchedule,
  ShiftId,
  LossGroup,
  OperationEventGroup,
  AMResult,
  DowntimeReasonItem,
  ShiftInfo,
  EventImpactItem,
  ImpactType,
  ImpactConfirmationStatus,
  LossEventSource,
  LossOriginStage,
  ChecklistItemConfig,
  EquipmentReadinessLog,
  ReadinessConclusion,
  ForcedCIPRule,
  CIPTypeMaster,
  PostCipInspection,
  EquipmentReadinessItemResult,
  LineShiftReception,
  AbnormalCategory,
} from './types';
import {
  CBTO_PLANT_ID,
  INITIAL_USERS,
  INITIAL_LINES,
  INITIAL_SKUS,
  INITIAL_EQUIPMENTS,
  INITIAL_RUNTIMES,
  INITIAL_CIPS,
  INITIAL_AM_CHECKLISTS,
  INITIAL_ABNORMALITIES,
  INITIAL_LOSS_LOGS,
  INITIAL_OPERATION_LOGS,
  INITIAL_PRODUCTION_PROGRESS,
  INITIAL_WORK_SCHEDULES,
  INITIAL_HANDOVERS,
  INITIAL_SHIFTS,
  INITIAL_DOWNTIME_REASONS,
  INITIAL_CHECKLIST_CONFIGS,
  INITIAL_READINESS_LOGS,
  INITIAL_CIP_TYPES,
  INITIAL_FORCED_CIP_RULES,
  INITIAL_POST_CIP_INSPECTIONS,
  INITIAL_LINE_RECEPTIONS,
} from './mock-data';
import { getProductionDate, getCurrentShift, calculateImpactMetrics, getImpactScope, evaluateLineReadinessConclusion, formatTime } from './date-utils';

interface AppNotification {
  id: string;
  type: 'SCHEDULE_UPDATE' | 'CIP_ALERT' | 'AM_REQUIRED' | 'ABNORMALITY';
  title: string;
  message: string;
  linkTab?: string;
  createdAt: string;
  read: boolean;
}

interface AppStoreContextType {
  // Current session & auth
  currentUser: User;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];

  // Global selections
  selectedPlantId: string;
  selectedLineId: string;
  setSelectedLineId: (lineId: string) => void;
  selectedShiftId: ShiftId;
  setSelectedShiftId: (shiftId: ShiftId) => void;
  selectedProductionDate: string;
  setSelectedProductionDate: (date: string) => void;

  // Metadata & Customization
  lines: Line[];
  addLine: (data: Omit<Line, 'id' | 'plantId'>) => Line;
  updateLine: (line: Line) => void;
  deleteLine: (id: string) => void;

  shifts: ShiftInfo[];
  addShift: (data: Omit<ShiftInfo, 'id'>) => ShiftInfo;
  updateShift: (shift: ShiftInfo) => void;
  deleteShift: (id: string) => void;

  skus: SKU[];

  equipments: Equipment[];
  getEquipmentsByLine: (lineId: string) => Equipment[];
  addEquipment: (data: Omit<Equipment, 'id'>) => Equipment;
  updateEquipment: (eq: Equipment) => void;
  deleteEquipment: (id: string) => void;

  downtimeReasons: DowntimeReasonItem[];
  addDowntimeReason: (data: Omit<DowntimeReasonItem, 'id'>) => DowntimeReasonItem;
  updateDowntimeReason: (item: DowntimeReasonItem) => void;
  deleteDowntimeReason: (id: string) => void;

  // Module 1: Kiểm tra đầu ca & Sẵn sàng sản xuất (Readiness & Checklists)
  checklistConfigs: ChecklistItemConfig[];
  addChecklistConfig: (data: Omit<ChecklistItemConfig, 'id'>) => ChecklistItemConfig;
  updateChecklistConfig: (item: ChecklistItemConfig) => void;
  deleteChecklistConfig: (id: string) => void;
  getChecklistConfigsByEquipment: (equipmentId: string) => ChecklistItemConfig[];

  readinessLogs: EquipmentReadinessLog[];
  saveReadinessLog: (data: Omit<EquipmentReadinessLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    success: boolean;
    log: EquipmentReadinessLog;
    message?: string;
  };
  getEquipmentReadiness: (equipmentId: string, date: string, shiftId: ShiftId) => EquipmentReadinessLog | undefined;
  getLineReadinessStatus: (lineId: string, date: string, shiftId: ShiftId) => {
    conclusion: ReadinessConclusion;
    totalEquipments: number;
    checkedEquipments: number;
    readyEquipments: number;
    conditionalEquipments: number;
    notReadyEquipments: number;
    uncheckedEquipments: number;
    notConfiguredEquipments: number;
  };
  copyChecklistTemplate: (sourceEquipmentId: string, targetEquipmentIds: string[]) => { success: boolean; count: number; message?: string };

  // Line-level Shift Reception
  lineShiftReceptions: LineShiftReception[];
  saveLineShiftReception: (reception: {
    lineId: string;
    productionDate: string;
    shiftId: ShiftId;
    receiverName: string;
    receivedAt: string;
    lineConditionsNote?: string;
  }) => { success: boolean; data: LineShiftReception };
  getLineShiftReception: (lineId: string, date: string, shiftId: ShiftId) => LineShiftReception | undefined;

  // Legacy AM Checklists
  amChecklists: AMChecklist[];
  saveAMChecklist: (checklist: Omit<AMChecklist, 'id' | 'createdAt' | 'performedAt'>) => { success: boolean; message?: string };

  // Module 2: Abnormalities
  abnormalLogs: AbnormalLog[];
  addAbnormalLog: (data: {
    lineId: string;
    equipmentId: string;
    category?: AbnormalCategory;
    abnormalType: string;
    factDescription?: string;
    assessmentNote?: string;
    description?: string;
    occurredAt?: string;
    sourceAmId?: string;
  }) => AbnormalLog;
  acknowledgeAbnormalLog: (id: string) => void;

  // Module 3: Loss Logs - Operational Impact Model
  lossLogs: LossLog[];
  startLossLog: (data: {
    lineId: string;
    skuId?: string;
    runtimeSessionId?: string;
    equipmentId: string;
    lossGroup: LossGroup;
    causeCode?: string;
    source?: LossEventSource;
    originStage?: LossOriginStage;
    description?: string;
    productionStage?: string;
    downtimeReason?: string;
    note: string;
    affectsLineStop: boolean;
    productionDate?: string;
    shiftId?: ShiftId;
    startedAt?: string;
    endedAt?: string | null;
    durationMinutes?: number;
    impacts?: EventImpactItem[];
  }) => { success: boolean; log?: LossLog; message?: string };
  endLossLog: (id: string, endIso?: string) => { success: boolean; message?: string };
  updateLossLog: (log: LossLog) => { success: boolean; message?: string };
  deleteLossLog: (id: string) => { success: boolean; message?: string };
  addImpactToEvent: (
    eventId: string,
    impact: Omit<EventImpactItem, 'impactId' | 'eventId'>
  ) => { success: boolean; impact?: EventImpactItem; message?: string };
  updateImpact: (eventId: string, impact: EventImpactItem) => { success: boolean; message?: string };
  confirmImpact: (
    eventId: string,
    impactId: string,
    percent: number | null,
    note?: string,
    newImpactType?: ImpactType
  ) => { success: boolean; message?: string };
  deleteImpact: (eventId: string, impactId: string) => { success: boolean; message?: string };

  // Module 4: Operation Logs
  operationLogs: OperationLog[];
  addOperationLog: (data: {
    lineId: string;
    skuId?: string;
    eventGroup: OperationEventGroup;
    content: string;
    factDescription?: string;
    assessmentNote?: string;
    parameterName?: string;
    parameterValue?: number | string;
    parameterUnit?: string;
    occurredAt?: string;
    sourceType?: string;
    sourceId?: string;
  }) => OperationLog;

  // Module 5: Runtime & CIP
  runtimes: RuntimeTracking[];
  cips: CIPTracking[];
  startProductionRun: (lineId: string, skuId: string) => { success: boolean; message?: string };
  stopForCIP: (
    lineId: string,
    note?: string,
    options?: { autoRecordLoss?: boolean; cipType?: string }
  ) => { success: boolean; message?: string; cipId?: string; linkedLossId?: string };
  completeCIPCycle: (lineId: string) => { success: boolean; message?: string };
  verifyAndSetReady: (lineId: string) => { success: boolean; message?: string };
  updateSkuLimit: (skuId: string, newHours: number) => void;

  // Module 5+: CIP Types, Forced CIP Rules, Post-CIP Sampling & QC
  cipTypes: CIPTypeMaster[];
  addCipType: (cipType: CIPTypeMaster) => void;
  updateCipType: (cipType: CIPTypeMaster) => void;
  deleteCipType: (code: string) => void;

  forcedCipRules: ForcedCIPRule[];
  addForcedCipRule: (rule: Omit<ForcedCIPRule, 'id'>) => ForcedCIPRule;
  updateForcedCipRule: (rule: ForcedCIPRule) => void;
  deleteForcedCipRule: (id: string) => void;

  postCipInspections: PostCipInspection[];
  startPostCipSampling: (cipTrackingId: string, lineId: string, expectedMins?: number, inspectorName?: string) => PostCipInspection;
  updatePostCipQc: (inspectionId: string, result: 'PENDING' | 'PASSED' | 'FAILED', notes?: string, inspectorName?: string) => void;
  grantProductionPermission: (inspectionId: string, approverName: string) => { success: boolean; message?: string };

  // Module 6: Shift Handover
  handovers: ShiftHandover[];
  createHandover: (data: {
    lineId: string;
    outgoingShiftId: ShiftId;
    incomingShiftId: ShiftId;
    content: string;
    pendingTasks: { id: string; task: string; isCompleted: boolean }[];
  }) => ShiftHandover;
  confirmReceiveHandover: (id: string) => void;

  // Module 7: Production Progress
  productionProgress: ProductionProgress[];
  upsertProgress: (data: {
    lineId: string;
    skuId: string;
    productionDate: string;
    plannedQty: number;
    actualQty: number;
    unit: string;
  }) => void;
  importProgressBatch: (items: Array<{
    productionDate: string;
    lineCode: string;
    skuCode: string;
    plannedQty: number;
    actualQty: number;
    unit: string;
  }>) => { success: boolean; count: number; errors: string[] };

  // Module 8: Work Schedules
  workSchedules: WorkSchedule[];
  publishWorkSchedule: (schedule: Omit<WorkSchedule, 'id' | 'publishedAt' | 'publishedBy' | 'publishedByName' | 'current' | 'version'>) => void;

  // In-app notifications
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  clearNotification: (id: string) => void;

  // Module 14: Settings & Multi-Sheet Excel Import
  importFullConfiguration: (data: {
    lines?: Line[];
    equipments?: Equipment[];
    skus?: SKU[];
    shifts?: ShiftInfo[];
    checklists?: ChecklistItemConfig[];
    cipTypes?: CIPTypeMaster[];
    forcedCipRules?: ForcedCIPRule[];
    downtimeReasons?: DowntimeReasonItem[];
  }) => { success: boolean; message: string; summary: Record<string, number> };

  // Data reset & export
  resetToSampleData: () => void;
}

const AppStoreContext = createContext<AppStoreContextType | null>(null);

const STORAGE_KEY = 'CBTO_SHOPFLOOR_STORAGE_V1';

// Normalize legacy logs to operational impact structure
function normalizeLossLogs(rawLogs: unknown[]): LossLog[] {
  if (!Array.isArray(rawLogs)) return [];
  return rawLogs.map((item) => {
    const l = item as Partial<LossLog> & { productionStage?: string };
    let impacts = l.impacts;
    if (!Array.isArray(impacts) || impacts.length === 0) {
      const isLegacy = l.isLegacyUnreviewed !== false;
      const duration = l.durationMinutes || 0;
      const legacyImpact: EventImpactItem = {
        impactId: `IMP_LEGACY_${l.id || Date.now()}`,
        eventId: l.id || '',
        impactType: l.affectsLineStop ? 'STOP_COOK' : 'NONE',
        impactScope: 'Nấu',
        affectedLineId: l.lineId || 'LINE_01',
        affectedStage: l.originStage || l.productionStage || 'Nấu',
        affectedEquipmentId: l.equipmentId,
        impactStartedAt: l.startedAt || new Date().toISOString(),
        impactEndedAt: l.endedAt !== undefined ? l.endedAt : null,
        impactPercent: l.affectsLineStop ? 100 : 0,
        convertedLossMinutes: l.affectsLineStop ? duration : 0,
        confirmationStatus: 'UNREVIEWED',
        note: 'Bản ghi lịch sử (Chưa rà soát)',
      };
      impacts = [legacyImpact];
    } else {
      impacts = impacts.map((imp: EventImpactItem) => {
        const metrics = calculateImpactMetrics(imp);
        return {
          ...imp,
          impactScope: imp.impactScope || getImpactScope(imp.impactType),
          convertedLossMinutes: metrics.convertedLossMinutes,
          confirmationStatus: imp.confirmationStatus || metrics.status,
        };
      });
    }

    return {
      ...(l as LossLog),
      source: l.source || 'CBTO',
      originStage: l.originStage || 'Nấu',
      impacts,
    };
  });
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer helper from localStorage
  const getStored = () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const s = getStored();
    if (s?.currentUserUid) {
      const found = INITIAL_USERS.find((u) => u.uid === s.currentUserUid);
      if (found) return found;
    }
    return INITIAL_USERS[0];
  });
  const [selectedPlantId] = useState<string>(CBTO_PLANT_ID);
  const [selectedLineId, setSelectedLineId] = useState<string>('LINE_01');
  const [selectedShiftId, setSelectedShiftId] = useState<ShiftId>(() => getCurrentShift());
  const [selectedProductionDate, setSelectedProductionDate] = useState<string>(() => getProductionDate());

  // Collections state
  const [lines, setLines] = useState<Line[]>(() => getStored()?.lines || INITIAL_LINES);
  const [skus, setSkus] = useState<SKU[]>(() => getStored()?.skus || INITIAL_SKUS);
  const [equipments, setEquipments] = useState<Equipment[]>(() => getStored()?.equipments || INITIAL_EQUIPMENTS);
  const [shifts, setShifts] = useState<ShiftInfo[]>(() => getStored()?.shifts || INITIAL_SHIFTS);
  const [downtimeReasons, setDowntimeReasons] = useState<DowntimeReasonItem[]>(() => getStored()?.downtimeReasons || INITIAL_DOWNTIME_REASONS);

  const [amChecklists, setAmChecklists] = useState<AMChecklist[]>(() => getStored()?.amChecklists || INITIAL_AM_CHECKLISTS);
  const [checklistConfigs, setChecklistConfigs] = useState<ChecklistItemConfig[]>(
    () => getStored()?.checklistConfigs || INITIAL_CHECKLIST_CONFIGS
  );
  const [readinessLogs, setReadinessLogs] = useState<EquipmentReadinessLog[]>(
    () => getStored()?.readinessLogs || INITIAL_READINESS_LOGS
  );
  const [cipTypes, setCipTypes] = useState<CIPTypeMaster[]>(
    () => getStored()?.cipTypes || INITIAL_CIP_TYPES
  );
  const [forcedCipRules, setForcedCipRules] = useState<ForcedCIPRule[]>(
    () => getStored()?.forcedCipRules || INITIAL_FORCED_CIP_RULES
  );
  const [postCipInspections, setPostCipInspections] = useState<PostCipInspection[]>(
    () => getStored()?.postCipInspections || INITIAL_POST_CIP_INSPECTIONS
  );
  const [abnormalLogs, setAbnormalLogs] = useState<AbnormalLog[]>(() => getStored()?.abnormalLogs || INITIAL_ABNORMALITIES);
  const [lossLogs, setLossLogs] = useState<LossLog[]>(() => normalizeLossLogs(getStored()?.lossLogs || INITIAL_LOSS_LOGS));
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>(() => getStored()?.operationLogs || INITIAL_OPERATION_LOGS);
  const [runtimes, setRuntimes] = useState<RuntimeTracking[]>(() => getStored()?.runtimes || INITIAL_RUNTIMES);
  const [cips, setCips] = useState<CIPTracking[]>(() => getStored()?.cips || INITIAL_CIPS);
  const [handovers, setHandovers] = useState<ShiftHandover[]>(() => getStored()?.handovers || INITIAL_HANDOVERS);
  const [productionProgress, setProductionProgress] = useState<ProductionProgress[]>(() => getStored()?.productionProgress || INITIAL_PRODUCTION_PROGRESS);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>(() => getStored()?.workSchedules || INITIAL_WORK_SCHEDULES);
  const [lineShiftReceptions, setLineShiftReceptions] = useState<LineShiftReception[]>(
    () => getStored()?.lineShiftReceptions || INITIAL_LINE_RECEPTIONS
  );

  const [notifications, setNotifications] = useState<AppNotification[]>(() => getStored()?.notifications || [
    {
      id: 'NOTIF_SCHED_01',
      type: 'SCHEDULE_UPDATE',
      title: 'Kế hoạch làm việc tuần mới đã được cập nhật',
      message: 'Lịch làm việc tuần 44 đã được phát hành bởi Supervisor Lê Hoàng Thanh.',
      linkTab: 'schedules',
      createdAt: '2026-10-25T20:00:00.000Z',
      read: false,
    },
  ]);

  // Save changes to localStorage
  const saveStateToStorage = useCallback(
    (overrides?: Record<string, unknown>) => {
      try {
        const payload = {
          lines,
          shifts,
          equipments,
          downtimeReasons,
          checklistConfigs,
          readinessLogs,
          lineShiftReceptions,
          cipTypes,
          forcedCipRules,
          postCipInspections,
          amChecklists,
          abnormalLogs,
          lossLogs,
          operationLogs,
          runtimes,
          cips,
          handovers,
          productionProgress,
          workSchedules,
          skus,
          notifications,
          currentUserUid: currentUser.uid,
          ...overrides,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    [
      lines,
      shifts,
      equipments,
      downtimeReasons,
      checklistConfigs,
      readinessLogs,
      lineShiftReceptions,
      cipTypes,
      forcedCipRules,
      postCipInspections,
      amChecklists,
      abnormalLogs,
      lossLogs,
      operationLogs,
      runtimes,
      cips,
      handovers,
      productionProgress,
      workSchedules,
      skus,
      notifications,
      currentUser.uid,
    ]
  );

  // Settings / Master Data CRUD Handlers
  const addLine = useCallback(
    (data: Omit<Line, 'id' | 'plantId'>) => {
      const newLine: Line = {
        id: `LINE_${Date.now()}`,
        plantId: selectedPlantId,
        code: data.code,
        name: data.name,
        description: data.description,
      };
      setLines((prev) => {
        const next = [...prev, newLine];
        saveStateToStorage({ lines: next });
        return next;
      });
      return newLine;
    },
    [selectedPlantId, saveStateToStorage]
  );

  const updateLine = useCallback(
    (line: Line) => {
      setLines((prev) => {
        const next = prev.map((l) => (l.id === line.id ? line : l));
        saveStateToStorage({ lines: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const deleteLine = useCallback(
    (id: string) => {
      setLines((prev) => {
        const next = prev.filter((l) => l.id !== id);
        saveStateToStorage({ lines: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const addShift = useCallback(
    (data: Omit<ShiftInfo, 'id'>) => {
      const newShift: ShiftInfo = {
        id: `SHIFT_${Date.now()}`,
        name: data.name,
        code: data.code,
        startHour: data.startHour,
        endHour: data.endHour,
        displayTime: data.displayTime,
      };
      setShifts((prev) => {
        const next = [...prev, newShift];
        saveStateToStorage({ shifts: next });
        return next;
      });
      return newShift;
    },
    [saveStateToStorage]
  );

  const updateShift = useCallback(
    (shift: ShiftInfo) => {
      setShifts((prev) => {
        const next = prev.map((s) => (s.id === shift.id ? shift : s));
        saveStateToStorage({ shifts: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const deleteShift = useCallback(
    (id: string) => {
      setShifts((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveStateToStorage({ shifts: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const addEquipment = useCallback(
    (data: Omit<Equipment, 'id'>) => {
      const newEq: Equipment = {
        id: `EQ_${Date.now()}`,
        lineId: data.lineId,
        code: data.code,
        name: data.name,
        category: data.category,
      };
      setEquipments((prev) => {
        const next = [...prev, newEq];
        saveStateToStorage({ equipments: next });
        return next;
      });
      return newEq;
    },
    [saveStateToStorage]
  );

  const updateEquipment = useCallback(
    (eq: Equipment) => {
      setEquipments((prev) => {
        const next = prev.map((e) => (e.id === eq.id ? eq : e));
        saveStateToStorage({ equipments: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const deleteEquipment = useCallback(
    (id: string) => {
      setEquipments((prev) => {
        const next = prev.filter((e) => e.id !== id);
        saveStateToStorage({ equipments: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const addDowntimeReason = useCallback(
    (data: Omit<DowntimeReasonItem, 'id'>) => {
      const newReason: DowntimeReasonItem = {
        id: `REASON_${Date.now()}`,
        category: data.category,
        reason: data.reason,
        stage: data.stage,
        description: data.description,
      };
      setDowntimeReasons((prev) => {
        const next = [...prev, newReason];
        saveStateToStorage({ downtimeReasons: next });
        return next;
      });
      return newReason;
    },
    [saveStateToStorage]
  );

  const updateDowntimeReason = useCallback(
    (item: DowntimeReasonItem) => {
      setDowntimeReasons((prev) => {
        const next = prev.map((r) => (r.id === item.id ? item : r));
        saveStateToStorage({ downtimeReasons: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const deleteDowntimeReason = useCallback(
    (id: string) => {
      setDowntimeReasons((prev) => {
        const next = prev.filter((r) => r.id !== id);
        saveStateToStorage({ downtimeReasons: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const setCurrentUser = useCallback(
    (user: User) => {
      setCurrentUserState(user);
      // Auto-set line if user role is operator and line not in scope
      if (user.role === 'OPERATOR' && !user.lineIds.includes(selectedLineId)) {
        if (user.lineIds[0]) setSelectedLineId(user.lineIds[0]);
      }
      saveStateToStorage({ currentUserUid: user.uid });
    },
    [selectedLineId, saveStateToStorage]
  );

  const getEquipmentsByLine = useCallback(
    (lineId: string) => {
      return equipments.filter((eq) => eq.lineId === lineId);
    },
    [equipments]
  );

  // ----------------------------------------------------
  // Module 1: AM Checklists
  // ----------------------------------------------------
  const saveAMChecklist = useCallback(
    (checklistData: Omit<AMChecklist, 'id' | 'createdAt' | 'performedAt'>) => {
      // Validate all items completed
      const incomplete = checklistData.items.some((item) => item.result === null);
      if (incomplete) {
        return { success: false, message: 'Tất cả các hạng mục bắt buộc phải được đánh giá (PASS, PASS + TAG hoặc FAIL)!' };
      }

      // Check for FAIL or PASS_TAG notes
      const missingNotes = checklistData.items.filter(
        (item) => (item.result === 'PASS_TAG' || item.result === 'FAIL') && !item.note?.trim()
      );
      if (missingNotes.length > 0) {
        return { success: false, message: 'Các hạng mục PASS + TAG hoặc FAIL bắt buộc phải có ghi chú hiện trường!' };
      }

      const nowIso = new Date().toISOString();
      const newId = `AM_${Date.now()}`;
      const hasFailOrTag = checklistData.items.some((item) => item.result === 'FAIL' || item.result === 'PASS_TAG');

      const newRecord: AMChecklist = {
        ...checklistData,
        id: newId,
        hasFailOrTag,
        status: 'COMPLETED',
        performedAt: nowIso,
        completedAt: nowIso,
        createdAt: nowIso,
      };

      setAmChecklists((prev) => {
        const next = [newRecord, ...prev];
        saveStateToStorage({ amChecklists: next });
        return next;
      });

      // Auto-create abnormality logs for any FAIL or PASS_TAG items to prevent double entry
      const eq = equipments.find((e) => e.id === checklistData.equipmentId);
      const abnormalItems = checklistData.items.filter((item) => item.result === 'FAIL' || item.result === 'PASS_TAG');

      if (abnormalItems.length > 0) {
        const newAbnormals: AbnormalLog[] = abnormalItems.map((item, idx) => ({
          id: `ABN_AM_${Date.now()}_${idx}`,
          plantId: checklistData.plantId,
          lineId: checklistData.lineId,
          equipmentId: checklistData.equipmentId,
          equipmentName: eq?.name || 'Thiết bị',
          productionDate: checklistData.productionDate,
          shiftId: checklistData.shiftId,
          occurredAt: nowIso,
          abnormalType: item.result === 'FAIL' ? 'Lỗi nghiêm trọng (AM FAIL)' : 'Dấu hiệu lưu ý (AM TAG)',
          description: `Từ kiểm tra AM (${item.group} - ${item.title}): ${item.note}`,
          reportedBy: checklistData.performedBy,
          reportedByName: checklistData.performedByName,
          sourceAmId: newId,
          createdAt: nowIso,
        }));

        setAbnormalLogs((prev) => {
          const next = [...newAbnormals, ...prev];
          saveStateToStorage({ abnormalLogs: next });
          return next;
        });

        // Add in-app notification
        setNotifications((prev) => [
          {
            id: `NOTIF_AM_${Date.now()}`,
            type: 'ABNORMALITY',
            title: `Cảnh báo AM: ${eq?.name || 'Thiết bị'} có bất thường`,
            message: `Phát hiện ${abnormalItems.length} hạng mục cần lưu ý tại ${checklistData.lineId}.`,
            linkTab: 'abnormals',
            createdAt: nowIso,
            read: false,
          },
          ...prev,
        ]);
      }

      return { success: true };
    },
    [equipments, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 1: Kiểm tra đầu ca & Xác nhận sẵn sàng sản xuất
  // ----------------------------------------------------
  const addChecklistConfig = useCallback(
    (data: Omit<ChecklistItemConfig, 'id'>) => {
      const newItem: ChecklistItemConfig = {
        ...data,
        id: `CHK_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      setChecklistConfigs((prev) => {
        const next = [...prev, newItem];
        saveStateToStorage({ checklistConfigs: next });
        return next;
      });
      return newItem;
    },
    [saveStateToStorage]
  );

  const updateChecklistConfig = useCallback(
    (item: ChecklistItemConfig) => {
      setChecklistConfigs((prev) => {
        const next = prev.map((c) => (c.id === item.id ? item : c));
        saveStateToStorage({ checklistConfigs: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const deleteChecklistConfig = useCallback(
    (id: string) => {
      setChecklistConfigs((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveStateToStorage({ checklistConfigs: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const getChecklistConfigsByEquipment = useCallback(
    (equipmentId: string) => {
      return checklistConfigs.filter((c) => c.equipmentId === equipmentId && c.active);
    },
    [checklistConfigs]
  );

  const getEquipmentReadiness = useCallback(
    (equipmentId: string, date: string, shiftId: ShiftId) => {
      return readinessLogs.find(
        (log) => log.equipmentId === equipmentId && log.productionDate === date && log.shiftId === shiftId
      );
    },
    [readinessLogs]
  );

  const getLineReadinessStatus = useCallback(
    (lineId: string, date: string, shiftId: ShiftId) => {
      const lineEquipments = equipments.filter((eq) => eq.lineId === lineId);
      const evalRes = evaluateLineReadinessConclusion(lineEquipments, checklistConfigs, readinessLogs, date, shiftId);
      return {
        conclusion: evalRes.conclusion,
        totalEquipments: evalRes.totalEquipments,
        checkedEquipments: evalRes.readyCount + evalRes.conditionalCount + evalRes.notReadyCount,
        readyEquipments: evalRes.readyCount,
        conditionalEquipments: evalRes.conditionalCount,
        notReadyEquipments: evalRes.notReadyCount,
        uncheckedEquipments: evalRes.uncheckedCount,
        notConfiguredEquipments: evalRes.notConfiguredCount,
      };
    },
    [equipments, checklistConfigs, readinessLogs]
  );

  const copyChecklistTemplate = useCallback(
    (sourceEquipmentId: string, targetEquipmentIds: string[]) => {
      const sourceConfigs = checklistConfigs.filter((c) => c.equipmentId === sourceEquipmentId && c.active);
      if (sourceConfigs.length === 0) {
        return { success: false, count: 0, message: 'Thiết bị nguồn chưa có câu hỏi kiểm tra nào!' };
      }

      let addedCount = 0;
      setChecklistConfigs((prev) => {
        const newConfigs: ChecklistItemConfig[] = [];
        targetEquipmentIds.forEach((targetEqId) => {
          const targetEq = equipments.find((e) => e.id === targetEqId);
          sourceConfigs.forEach((src, idx) => {
            const exists = prev.some((p) => p.equipmentId === targetEqId && p.code === src.code);
            if (!exists) {
              newConfigs.push({
                ...src,
                id: `CHK_CP_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
                equipmentId: targetEqId,
                lineId: targetEq?.lineId || src.lineId,
              });
              addedCount++;
            }
          });
        });
        const next = [...prev, ...newConfigs];
        saveStateToStorage({ checklistConfigs: next });
        return next;
      });

      return { success: true, count: addedCount, message: `Đã sao chép thành công ${addedCount} hạng mục kiểm tra!` };
    },
    [checklistConfigs, equipments, saveStateToStorage]
  );

  const saveLineShiftReception = useCallback(
    (data: {
      lineId: string;
      productionDate: string;
      shiftId: ShiftId;
      receiverName: string;
      receivedAt: string;
      lineConditionsNote?: string;
    }) => {
      const key = `${data.productionDate}_${data.shiftId}_${data.lineId}`;
      const nowIso = new Date().toISOString();
      const newRec: LineShiftReception = {
        id: key,
        plantId: selectedPlantId,
        lineId: data.lineId,
        productionDate: data.productionDate,
        shiftId: data.shiftId,
        receiverName: data.receiverName,
        receivedAt: data.receivedAt || nowIso,
        lineConditionsNote: data.lineConditionsNote,
        updatedAt: nowIso,
      };

      setLineShiftReceptions((prev) => {
        const next = [newRec, ...prev.filter((r) => r.id !== key)];
        saveStateToStorage({ lineShiftReceptions: next });
        return next;
      });

      return { success: true, data: newRec };
    },
    [selectedPlantId, saveStateToStorage]
  );

  const getLineShiftReception = useCallback(
    (lineId: string, date: string, shiftId: ShiftId) => {
      const key = `${date}_${shiftId}_${lineId}`;
      return lineShiftReceptions.find((r) => r.id === key);
    },
    [lineShiftReceptions]
  );

  const saveReadinessLog = useCallback(
    (data: Omit<EquipmentReadinessLog, 'id' | 'createdAt' | 'updatedAt'>) => {
      let finalConclusion = data.conclusion;
      const hasNotReady = data.items.some(
        (it) => it.failureImpact === 'NOT_READY' && (it.booleanVal === 'FAIL' || it.isOutOfRange === true)
      );
      const hasConditional = data.items.some(
        (it) => it.failureImpact === 'CONDITIONAL_PRODUCTION' && (it.booleanVal === 'FAIL' || it.isOutOfRange === true)
      );

      if (hasNotReady) {
        finalConclusion = 'NOT_READY';
      } else if (hasConditional) {
        finalConclusion = 'CONDITIONAL';
      } else if (!data.items.some((it) => it.booleanVal === 'FAIL' || it.isOutOfRange)) {
        finalConclusion = 'READY';
      }

      const nowIso = new Date().toISOString();
      const existing = readinessLogs.find(
        (l) => l.equipmentId === data.equipmentId && l.productionDate === data.productionDate && l.shiftId === data.shiftId
      );

      const logRecord: EquipmentReadinessLog = {
        ...data,
        conclusion: finalConclusion,
        id: existing?.id || `RD_${Date.now()}`,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      setReadinessLogs((prev) => {
        const next = prev.some((l) => l.id === logRecord.id)
          ? prev.map((l) => (l.id === logRecord.id ? logRecord : l))
          : [logRecord, ...prev];
        saveStateToStorage({ readinessLogs: next });
        return next;
      });

      // Auto-log into OperationLog
      const eq = equipments.find((e) => e.id === data.equipmentId);
      const eqName = eq ? `${eq.name} (${eq.code})` : data.equipmentId;
      const conclusionText =
        finalConclusion === 'READY'
          ? 'Sẵn sàng sản xuất'
          : finalConclusion === 'CONDITIONAL'
          ? `Sản xuất có điều kiện (${data.conditionsNote || 'Cần theo dõi sát'})`
          : 'Chưa sẵn sàng sản xuất (Phát hiện lỗi/vượt ngưỡng)';

      const autoOpLog: OperationLog = {
        id: `OP_RD_${Date.now()}`,
        plantId: data.plantId,
        lineId: data.lineId,
        productionDate: data.productionDate,
        shiftId: data.shiftId,
        occurredAt: data.inspectedAt,
        eventGroup: 'Sản xuất',
        content: `[Kiểm tra đầu ca] Thiết bị ${eqName}: ${conclusionText}. Người nhận ca: ${data.receiverName}. Người kiểm tra: ${data.inspectorName}.`,
        sourceType: 'READINESS_CHECK',
        sourceId: logRecord.id,
        reportedBy: currentUser.uid,
        reportedByName: currentUser.displayName,
        createdAt: nowIso,
      };

      setOperationLogs((prev) => {
        const next = [autoOpLog, ...prev];
        saveStateToStorage({ operationLogs: next });
        return next;
      });

      return { success: true, log: logRecord, message: 'Đã lưu kết quả kiểm tra đầu ca & xác nhận sẵn sàng!' };
    },
    [readinessLogs, equipments, currentUser, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 5+: CIP Types, Forced CIP Rules & Post-CIP Inspections
  // ----------------------------------------------------
  const addCipType = useCallback(
    (cipType: CIPTypeMaster) => {
      setCipTypes((prev) => {
        const next = [...prev.filter((c) => c.code !== cipType.code), cipType];
        saveStateToStorage({ cipTypes: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const updateCipType = useCallback(
    (cipType: CIPTypeMaster) => {
      setCipTypes((prev) => {
        const next = prev.map((c) => (c.code === cipType.code ? cipType : c));
        saveStateToStorage({ cipTypes: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const deleteCipType = useCallback(
    (code: string) => {
      setCipTypes((prev) => {
        const next = prev.filter((c) => c.code !== code);
        saveStateToStorage({ cipTypes: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const addForcedCipRule = useCallback(
    (rule: Omit<ForcedCIPRule, 'id'>) => {
      const newRule: ForcedCIPRule = {
        ...rule,
        id: `FCR_${Date.now()}`,
      };
      setForcedCipRules((prev) => {
        const next = [...prev, newRule];
        saveStateToStorage({ forcedCipRules: next });
        return next;
      });
      return newRule;
    },
    [saveStateToStorage]
  );

  const updateForcedCipRule = useCallback(
    (rule: ForcedCIPRule) => {
      setForcedCipRules((prev) => {
        const next = prev.map((r) => (r.id === rule.id ? rule : r));
        saveStateToStorage({ forcedCipRules: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const deleteForcedCipRule = useCallback(
    (id: string) => {
      setForcedCipRules((prev) => {
        const next = prev.filter((r) => r.id !== id);
        saveStateToStorage({ forcedCipRules: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const startPostCipSampling = useCallback(
    (cipTrackingId: string, lineId: string, expectedMins: number = 60, inspectorName?: string) => {
      const nowIso = new Date().toISOString();
      const newInspection: PostCipInspection = {
        id: `PCI_${Date.now()}`,
        cipTrackingId,
        lineId,
        samplingStartedAt: nowIso,
        expectedDurationMinutes: expectedMins,
        actualDurationMinutes: 0,
        qcResult: 'PENDING',
        qcNotes: 'Đang nuôi cấy test nhanh vi sinh & hóa lý nước tráng.',
        inspectorName: inspectorName || currentUser.displayName,
        approvedBy: '',
        approvedAt: '',
        permissionGranted: false,
      };
      setPostCipInspections((prev) => {
        const next = [newInspection, ...prev];
        saveStateToStorage({ postCipInspections: next });
        return next;
      });
      setCips((prev) => {
        const next = prev.map((c) =>
          c.id === cipTrackingId
            ? {
                ...c,
                samplingStartedAt: nowIso,
                status: 'POST_CIP_SAMPLING' as const,
                updatedAt: nowIso,
              }
            : c
        );
        saveStateToStorage({ cips: next });
        return next;
      });
      return newInspection;
    },
    [currentUser.displayName, saveStateToStorage]
  );

  const updatePostCipQc = useCallback(
    (inspectionId: string, result: 'PENDING' | 'PASSED' | 'FAILED', notes?: string, inspectorName?: string) => {
      setPostCipInspections((prev) => {
        const next = prev.map((ins) =>
          ins.id === inspectionId
            ? {
                ...ins,
                qcResult: result,
                qcNotes: notes !== undefined ? notes : ins.qcNotes,
                inspectorName: inspectorName || ins.inspectorName,
              }
            : ins
        );
        saveStateToStorage({ postCipInspections: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const grantProductionPermission = useCallback(
    (inspectionId: string, approverName: string) => {
      const inspection = postCipInspections.find((i) => i.id === inspectionId);
      if (!inspection) return { success: false, message: 'Không tìm thấy phiếu kiểm tra sau CIP!' };
      if (inspection.qcResult !== 'PASSED') {
        return { success: false, message: 'Kết quả kiểm nghiệm QC bắt buộc phải ĐẠT mới được cấp phép sản xuất!' };
      }
      const nowIso = new Date().toISOString();
      setPostCipInspections((prev) => {
        const next = prev.map((ins) =>
          ins.id === inspectionId
            ? {
                ...ins,
                approvedBy: approverName,
                approvedAt: nowIso,
                permissionGranted: true,
              }
            : ins
        );
        saveStateToStorage({ postCipInspections: next });
        return next;
      });
      setCips((prev) => {
        const next = prev.map((c) =>
          c.id === inspection.cipTrackingId
            ? {
                ...c,
                status: 'READY' as const,
                readyAt: nowIso,
                verifiedBy: currentUser.uid,
                verifiedByName: approverName,
                updatedAt: nowIso,
              }
            : c
        );
        saveStateToStorage({ cips: next });
        return next;
      });
      return { success: true, message: 'Đã cấp phép sản xuất thành công!' };
    },
    [postCipInspections, currentUser.uid, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 14: Settings & Multi-Sheet Excel Import
  // ----------------------------------------------------
  const importFullConfiguration = useCallback(
    (data: {
      lines?: Line[];
      equipments?: Equipment[];
      skus?: SKU[];
      shifts?: ShiftInfo[];
      checklists?: ChecklistItemConfig[];
      cipTypes?: CIPTypeMaster[];
      forcedCipRules?: ForcedCIPRule[];
      downtimeReasons?: DowntimeReasonItem[];
    }) => {
      const summary: Record<string, number> = {};

      let finalLines = lines;
      if (data.lines && data.lines.length > 0) {
        finalLines = [...lines];
        data.lines.forEach((inL) => {
          const idx = finalLines.findIndex((l) => l.code === inL.code);
          if (idx >= 0) {
            finalLines[idx] = { ...finalLines[idx], name: inL.name, description: inL.description };
          } else {
            finalLines.push(inL);
          }
        });
        setLines(finalLines);
        summary['Lines'] = data.lines.length;
      }

      let finalEqs = equipments;
      if (data.equipments && data.equipments.length > 0) {
        finalEqs = [...equipments];
        data.equipments.forEach((inE) => {
          const idx = finalEqs.findIndex((e) => e.code === inE.code);
          if (idx >= 0) {
            finalEqs[idx] = { ...finalEqs[idx], name: inE.name, category: inE.category, lineId: inE.lineId || finalEqs[idx].lineId };
          } else {
            finalEqs.push(inE);
          }
        });
        setEquipments(finalEqs);
        summary['Thiết bị'] = data.equipments.length;
      }

      let finalSkus = skus;
      if (data.skus && data.skus.length > 0) {
        finalSkus = [...skus];
        data.skus.forEach((inS) => {
          const idx = finalSkus.findIndex((s) => s.code === inS.code);
          if (idx >= 0) {
            finalSkus[idx] = { ...finalSkus[idx], name: inS.name, limitHours: inS.limitHours };
          } else {
            finalSkus.push(inS);
          }
        });
        setSkus(finalSkus);
        summary['SKU'] = data.skus.length;
      }

      if (data.shifts && data.shifts.length > 0) {
        setShifts(data.shifts);
        summary['Ca làm việc'] = data.shifts.length;
      }

      let finalChecklists = checklistConfigs;
      if (data.checklists && data.checklists.length > 0) {
        finalChecklists = [...checklistConfigs];
        data.checklists.forEach((inC) => {
          const idx = finalChecklists.findIndex((c) => c.equipmentId === inC.equipmentId && c.code === inC.code);
          if (idx >= 0) {
            finalChecklists[idx] = { ...finalChecklists[idx], ...inC, id: finalChecklists[idx].id };
          } else {
            finalChecklists.push(inC);
          }
        });
        setChecklistConfigs(finalChecklists);
        summary['Hạng mục kiểm tra'] = data.checklists.length;
      }

      if (data.cipTypes && data.cipTypes.length > 0) {
        setCipTypes(data.cipTypes);
        summary['Loại CIP'] = data.cipTypes.length;
      }

      let finalForcedRules = forcedCipRules;
      if (data.forcedCipRules && data.forcedCipRules.length > 0) {
        finalForcedRules = [...forcedCipRules];
        data.forcedCipRules.forEach((inR) => {
          const idx = finalForcedRules.findIndex(
            (r) => r.equipmentCode === inR.equipmentCode && r.requiredCipType === inR.requiredCipType
          );
          if (idx >= 0) {
            finalForcedRules[idx] = {
              ...finalForcedRules[idx],
              maxDaysSinceLastCip: inR.maxDaysSinceLastCip,
              maxIdleDaysWithoutCip: inR.maxIdleDaysWithoutCip,
              active: inR.active,
              notes: inR.notes,
            };
          } else {
            finalForcedRules.push(inR);
          }
        });
        setForcedCipRules(finalForcedRules);
        summary['Quy tắc CIP'] = data.forcedCipRules.length;
      }

      if (data.downtimeReasons && data.downtimeReasons.length > 0) {
        setDowntimeReasons(data.downtimeReasons);
        summary['Lý do dừng máy'] = data.downtimeReasons.length;
      }

      saveStateToStorage({
        ...(data.lines ? { lines: finalLines } : {}),
        ...(data.equipments ? { equipments: finalEqs } : {}),
        ...(data.skus ? { skus: finalSkus } : {}),
        ...(data.shifts ? { shifts: data.shifts } : {}),
        ...(data.checklists ? { checklistConfigs: finalChecklists } : {}),
        ...(data.cipTypes ? { cipTypes: data.cipTypes } : {}),
        ...(data.forcedCipRules ? { forcedCipRules: finalForcedRules } : {}),
        ...(data.downtimeReasons ? { downtimeReasons: data.downtimeReasons } : {}),
      });

      return {
        success: true,
        message: 'Cập nhật cấu hình hệ thống từ file Excel thành công!',
        summary,
      };
    },
    [lines, equipments, skus, checklistConfigs, forcedCipRules, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 2: Abnormalities
  // ----------------------------------------------------
  const addAbnormalLog = useCallback(
    (data: {
      lineId: string;
      equipmentId: string;
      category?: AbnormalCategory;
      abnormalType: string;
      factDescription?: string;
      assessmentNote?: string;
      description?: string;
      occurredAt?: string;
      sourceAmId?: string;
    }) => {
      const nowIso = new Date().toISOString();
      const eq = equipments.find((e) => e.id === data.equipmentId);
      const factText = data.factDescription || data.description || 'Ghi nhận bất thường hiện trường';
      const record: AbnormalLog = {
        id: `ABN_${Date.now()}`,
        plantId: selectedPlantId,
        lineId: data.lineId,
        equipmentId: data.equipmentId,
        equipmentName: eq?.name || 'Thiết bị',
        category: data.category || 'Thiết bị',
        productionDate: getProductionDate(),
        shiftId: getCurrentShift(),
        occurredAt: data.occurredAt || nowIso,
        abnormalType: data.abnormalType,
        factDescription: factText,
        assessmentNote: data.assessmentNote,
        description: factText,
        reportedBy: currentUser.uid,
        reportedByName: currentUser.displayName,
        sourceAmId: data.sourceAmId,
        createdAt: nowIso,
      };

      setAbnormalLogs((prev) => {
        const next = [record, ...prev];
        saveStateToStorage({ abnormalLogs: next });
        return next;
      });

      return record;
    },
    [selectedPlantId, currentUser, equipments, saveStateToStorage]
  );

  const acknowledgeAbnormalLog = useCallback(
    (id: string) => {
      setAbnormalLogs((prev) => {
        const next = prev.map((item) =>
          item.id === id
            ? {
                ...item,
                acknowledgedAt: new Date().toISOString(),
                acknowledgedBy: currentUser.uid,
                acknowledgedByName: currentUser.displayName,
              }
            : item
        );
        saveStateToStorage({ abnormalLogs: next });
        return next;
      });
    },
    [currentUser, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 3: Loss Logs - Operational Impact Model
  // ----------------------------------------------------
  const startLossLog = useCallback(
    (data: {
      lineId: string;
      skuId?: string;
      runtimeSessionId?: string;
      equipmentId: string;
      lossGroup: LossGroup;
      causeCode?: string;
      source?: LossEventSource;
      originStage?: LossOriginStage;
      description?: string;
      productionStage?: string;
      downtimeReason?: string;
      note: string;
      affectsLineStop: boolean;
      productionDate?: string;
      shiftId?: ShiftId;
      startedAt?: string;
      endedAt?: string | null;
      durationMinutes?: number;
      impacts?: EventImpactItem[];
    }) => {
      if (data.lossGroup === 'Khác' && !data.note.trim()) {
        return { success: false, message: 'Nhóm Loss "Khác" bắt buộc phải nhập ghi chú giải trình!' };
      }

      const nowIso = new Date().toISOString();
      const startedAt = data.startedAt || nowIso;
      const endedAt = data.endedAt !== undefined ? data.endedAt : null;
      let durationMinutes = data.durationMinutes || 0;
      if (endedAt && startedAt) {
        const s = new Date(startedAt).getTime();
        const e = new Date(endedAt).getTime();
        if (e < s) {
          return { success: false, message: 'Thời gian kết thúc không được nhỏ hơn thời gian bắt đầu!' };
        }
        durationMinutes = Math.max(1, Math.round((e - s) / 60000));
      }

      const eventId = `LOSS_${Date.now()}`;
      const source = data.source || 'CBTO';
      const originStage = data.originStage || (data.productionStage?.includes('Đóng gói') ? 'Đóng gói' : 'Nấu');

      // Process or generate initial impacts
      let impacts: EventImpactItem[] = [];
      if (data.impacts && data.impacts.length > 0) {
        impacts = data.impacts.map((imp, idx) => {
          const impactId = imp.impactId || `IMP_${Date.now()}_${idx}`;
          const metrics = calculateImpactMetrics(imp);
          return {
            ...imp,
            impactId,
            eventId,
            impactScope: imp.impactScope || getImpactScope(imp.impactType),
            convertedLossMinutes: metrics.convertedLossMinutes,
            confirmationStatus: imp.confirmationStatus || metrics.status,
          };
        });
      } else {
        // Fallback default impact
        const defaultImpactType = !data.affectsLineStop
          ? 'NONE'
          : originStage === 'Đóng gói'
          ? 'STOP_PACKING'
          : originStage === 'Làm nguội'
          ? 'COOLING_BUFFER_CONGESTION'
          : 'STOP_COOK';
        const defaultPercent = defaultImpactType === 'NONE' ? 0 : defaultImpactType === 'COOLING_BUFFER_CONGESTION' ? null : 100;
        const initialImpact: EventImpactItem = {
          impactId: `IMP_${Date.now()}_0`,
          eventId,
          impactType: defaultImpactType,
          impactScope: getImpactScope(defaultImpactType),
          affectedLineId: data.lineId,
          affectedStage: originStage,
          affectedEquipmentId: data.equipmentId,
          impactStartedAt: startedAt,
          impactEndedAt: endedAt,
          impactPercent: defaultPercent,
          convertedLossMinutes: defaultImpactType === 'NONE' ? 0 : defaultPercent === null ? null : durationMinutes,
          confirmationStatus: defaultPercent === null ? 'INSUFFICIENT_DATA' : endedAt ? 'CONFIRMED' : 'PROVISIONAL',
          note: data.note,
        };
        impacts = [initialImpact];
      }

      const record: LossLog = {
        id: eventId,
        plantId: selectedPlantId,
        lineId: data.lineId,
        skuId: data.skuId || undefined,
        runtimeSessionId: data.runtimeSessionId,
        equipmentId: data.equipmentId,
        lossGroup: data.lossGroup,
        causeCode: data.causeCode || '',
        source,
        originStage,
        description: data.description || '',
        downtimeReason: data.downtimeReason,
        startedAt,
        endedAt,
        durationMinutes,
        impacts,
        note: data.note,
        lineStopEventId: `STOP_${Date.now()}`,
        affectsLineStop: data.affectsLineStop,
        productionDate: data.productionDate || getProductionDate(),
        shiftId: data.shiftId || getCurrentShift(),
        reportedBy: currentUser.uid,
        reportedByName: currentUser.displayName,
        auditTrail: [
          {
            changedAt: nowIso,
            changedBy: currentUser.uid,
            changedByName: currentUser.displayName,
            action: 'CREATE',
            note: `Ghi nhận sự cố mới nhóm ${data.lossGroup}: ${data.note || 'Không có ghi chú'}`,
          },
        ],
        createdAt: nowIso,
      };

      setLossLogs((prev) => {
        const next = [record, ...prev];
        saveStateToStorage({ lossLogs: next });
        return next;
      });

      return { success: true, log: record };
    },
    [selectedPlantId, currentUser, saveStateToStorage]
  );

  const endLossLog = useCallback(
    (id: string, endIso?: string) => {
      const nowIso = endIso || new Date().toISOString();

      let errorMsg = '';
      setLossLogs((prev) => {
        const target = prev.find((item) => item.id === id);
        if (!target) {
          errorMsg = 'Không tìm thấy bản ghi Loss!';
          return prev;
        }

        const startMs = new Date(target.startedAt).getTime();
        const endMs = new Date(nowIso).getTime();

        if (endMs < startMs) {
          errorMsg = 'Thời gian kết thúc không được nhỏ hơn thời gian bắt đầu!';
          return prev;
        }

        const durationMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));

        // Also end any ongoing child impacts
        const nextImpacts = (target.impacts || []).map((imp) => {
          if (!imp.impactEndedAt) {
            const updated = {
              ...imp,
              impactEndedAt: nowIso,
            };
            const metrics = calculateImpactMetrics(updated, endMs);
            return {
              ...updated,
              convertedLossMinutes: metrics.convertedLossMinutes,
              confirmationStatus: (metrics.status === 'PROVISIONAL' ? 'CONFIRMED' : metrics.status) as ImpactConfirmationStatus,
            };
          }
          return imp;
        });

        const auditTrail = [
          ...(target.auditTrail || []),
          {
            changedAt: nowIso,
            changedBy: currentUser.uid,
            changedByName: currentUser.displayName,
            action: 'CLOSE_EVENT' as const,
            note: `Đóng sự cố vào thời điểm ${nowIso}`,
          },
        ];

        const next = prev.map((item) =>
          item.id === id
            ? {
                ...item,
                endedAt: nowIso,
                durationMinutes,
                impacts: nextImpacts,
                auditTrail,
                updatedAt: new Date().toISOString(),
              }
            : item
        );
        saveStateToStorage({ lossLogs: next });
        return next;
      });

      if (errorMsg) return { success: false, message: errorMsg };
      return { success: true };
    },
    [currentUser, saveStateToStorage]
  );

  const updateLossLog = useCallback(
    (log: LossLog) => {
      if (log.lossGroup === 'Khác' && !log.note?.trim()) {
        return { success: false, message: 'Nhóm Loss "Khác" bắt buộc phải nhập ghi chú!' };
      }

      if (log.endedAt) {
        const s = new Date(log.startedAt).getTime();
        const e = new Date(log.endedAt).getTime();
        if (e < s) {
          return { success: false, message: 'Thời điểm kết thúc không được nhỏ hơn thời điểm bắt đầu!' };
        }
        log.durationMinutes = Math.max(1, Math.round((e - s) / (1000 * 60)));
      }

      // Recompute metrics for impacts
      const updatedImpacts = (log.impacts || []).map((imp) => {
        const metrics = calculateImpactMetrics(imp);
        return {
          ...imp,
          convertedLossMinutes: metrics.convertedLossMinutes,
          confirmationStatus: imp.confirmationStatus || metrics.status,
        };
      });

      const auditTrail = [
        ...(log.auditTrail || []),
        {
          changedAt: new Date().toISOString(),
          changedBy: currentUser.uid,
          changedByName: currentUser.displayName,
          action: 'UPDATE_EVENT' as const,
          note: 'Cập nhật thông tin sự cố / tác động vận hành',
        },
      ];

      setLossLogs((prev) => {
        const next = prev.map((item) =>
          item.id === log.id
            ? { ...log, impacts: updatedImpacts, auditTrail, updatedAt: new Date().toISOString() }
            : item
        );
        saveStateToStorage({ lossLogs: next });
        return next;
      });

      return { success: true };
    },
    [currentUser, saveStateToStorage]
  );

  const deleteLossLog = useCallback(
    (id: string) => {
      setLossLogs((prev) => {
        const next = prev.filter((item) => item.id !== id);
        saveStateToStorage({ lossLogs: next });
        return next;
      });
      return { success: true };
    },
    [saveStateToStorage]
  );

  const addImpactToEvent = useCallback(
    (eventId: string, impactData: Omit<EventImpactItem, 'impactId' | 'eventId'>) => {
      const impactId = `IMP_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const metrics = calculateImpactMetrics(impactData);
      const newImpact: EventImpactItem = {
        ...impactData,
        impactId,
        eventId,
        impactScope: impactData.impactScope || getImpactScope(impactData.impactType),
        convertedLossMinutes: metrics.convertedLossMinutes,
        confirmationStatus: impactData.confirmationStatus || metrics.status,
      };

      setLossLogs((prev) => {
        const next = prev.map((item) => {
          if (item.id === eventId) {
            return {
              ...item,
              impacts: [...(item.impacts || []), newImpact],
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });
        saveStateToStorage({ lossLogs: next });
        return next;
      });

      return { success: true, impact: newImpact };
    },
    [saveStateToStorage]
  );

  const updateImpact = useCallback(
    (eventId: string, impact: EventImpactItem) => {
      const metrics = calculateImpactMetrics(impact);
      const updatedItem: EventImpactItem = {
        ...impact,
        impactScope: impact.impactScope || getImpactScope(impact.impactType),
        convertedLossMinutes: metrics.convertedLossMinutes,
        confirmationStatus: impact.confirmationStatus || metrics.status,
      };

      setLossLogs((prev) => {
        const next = prev.map((item) => {
          if (item.id === eventId) {
            const nextImpacts = (item.impacts || []).map((imp) =>
              imp.impactId === impact.impactId ? updatedItem : imp
            );
            return {
              ...item,
              impacts: nextImpacts,
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });
        saveStateToStorage({ lossLogs: next });
        return next;
      });

      return { success: true };
    },
    [saveStateToStorage]
  );

  const confirmImpact = useCallback(
    (eventId: string, impactId: string, percent: number | null, note?: string, newImpactType?: ImpactType) => {
      setLossLogs((prev) => {
        const next = prev.map((item) => {
          if (item.id === eventId) {
            const nextImpacts = (item.impacts || []).map((imp) => {
              if (imp.impactId === impactId) {
                const updatedType = newImpactType || imp.impactType;
                const updated = {
                  ...imp,
                  impactType: updatedType,
                  impactScope: getImpactScope(updatedType),
                  impactPercent: percent,
                  note: note !== undefined ? note : imp.note,
                  confirmedBy: currentUser.uid,
                  confirmedByName: currentUser.displayName,
                  confirmedAt: new Date().toISOString(),
                };
                const metrics = calculateImpactMetrics(updated);
                return {
                  ...updated,
                  convertedLossMinutes: metrics.convertedLossMinutes,
                  confirmationStatus: metrics.status,
                };
              }
              return imp;
            });
            return {
              ...item,
              impacts: nextImpacts,
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });
        saveStateToStorage({ lossLogs: next });
        return next;
      });

      return { success: true };
    },
    [currentUser, saveStateToStorage]
  );

  const deleteImpact = useCallback(
    (eventId: string, impactId: string) => {
      setLossLogs((prev) => {
        const next = prev.map((item) => {
          if (item.id === eventId) {
            return {
              ...item,
              impacts: (item.impacts || []).filter((imp) => imp.impactId !== impactId),
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });
        saveStateToStorage({ lossLogs: next });
        return next;
      });

      return { success: true };
    },
    [saveStateToStorage]
  );


  // ----------------------------------------------------
  // Module 4: Operation Logs
  // ----------------------------------------------------
  const addOperationLog = useCallback(
    (data: {
      lineId: string;
      skuId?: string;
      eventGroup: OperationEventGroup;
      content: string;
      factDescription?: string;
      assessmentNote?: string;
      parameterName?: string;
      parameterValue?: number | string;
      parameterUnit?: string;
      occurredAt?: string;
      sourceType?: string;
      sourceId?: string;
    }) => {
      const nowIso = new Date().toISOString();
      const factText = data.factDescription || data.content;
      const record: OperationLog = {
        id: `LOG_${Date.now()}`,
        plantId: selectedPlantId,
        lineId: data.lineId,
        skuId: data.skuId,
        productionDate: getProductionDate(),
        shiftId: getCurrentShift(),
        occurredAt: data.occurredAt || nowIso,
        eventGroup: data.eventGroup,
        factDescription: factText,
        assessmentNote: data.assessmentNote,
        parameterName: data.parameterName,
        parameterValue: data.parameterValue,
        parameterUnit: data.parameterUnit,
        content: data.content || factText,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        reportedBy: currentUser.uid,
        reportedByName: currentUser.displayName,
        createdAt: nowIso,
      };

      setOperationLogs((prev) => {
        const next = [record, ...prev];
        saveStateToStorage({ operationLogs: next });
        return next;
      });

      return record;
    },
    [selectedPlantId, currentUser, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 5: Runtime & CIP
  // ----------------------------------------------------
  const startProductionRun = useCallback(
    (lineId: string, skuId: string) => {
      const sku = skus.find((s) => s.id === skuId);
      if (!sku) return { success: false, message: 'SKU không hợp lệ!' };

      // 1. Condition check: Is line currently in active CIP?
      const activeCip = cips.find(
        (c) => c.lineId === lineId && (c.status === 'IN_CIP' || c.status === 'POST_CIP_SAMPLING')
      );
      if (activeCip) {
        if (activeCip.status === 'IN_CIP') {
          return {
            success: false,
            message: `Line đang trong chu trình CIP (${activeCip.note || 'Đang rửa'}). Không thể bắt đầu phiên sản xuất mới!`,
          };
        }
        if (activeCip.status === 'POST_CIP_SAMPLING') {
          const inspection = postCipInspections.find((i) => i.cipTrackingId === activeCip.id);
          if (!inspection || inspection.qcResult !== 'PASSED' || !inspection.permissionGranted) {
            return {
              success: false,
              message: 'Line đang trong giai đoạn lấy mẫu Post-CIP và chưa có xác nhận QC ĐẠT hoặc chưa được cấp phép sản xuất tiếp!',
            };
          }
        }
      }

      // 2. Condition check: Forced CIP rules for this line's equipment
      const nowTime = Date.now();
      const lineRules = forcedCipRules.filter((r) => r.lineId === lineId && r.active);
      for (const rule of lineRules) {
        if (!rule.lastCipAt) {
          // Missing data indicator
          continue;
        }
        const lastCipMs = new Date(rule.lastCipAt).getTime();
        const daysSinceCip = (nowTime - lastCipMs) / (24 * 3600 * 1000);
        if (daysSinceCip >= rule.maxDaysSinceLastCip) {
          return {
            success: false,
            message: `Thiết bị ${rule.equipmentCode} đã vượt quá ${rule.maxDaysSinceLastCip} ngày chưa CIP (thực tế: ${daysSinceCip.toFixed(1)} ngày). Bắt buộc phải thực hiện ${rule.requiredCipType} trước khi chạy!`,
          };
        }

        if (rule.lastRunAt) {
          const lastRunMs = new Date(rule.lastRunAt).getTime();
          const idleDays = (nowTime - lastRunMs) / (24 * 3600 * 1000);
          if (idleDays >= rule.maxIdleDaysWithoutCip) {
            return {
              success: false,
              message: `Thiết bị ${rule.equipmentCode} đã dừng máy quá ${rule.maxIdleDaysWithoutCip} ngày không CIP (thực tế: ${idleDays.toFixed(1)} ngày). Bắt buộc phải thực hiện ${rule.requiredCipType} trước khi sản xuất lại!`,
            };
          }
        }
      }

      // 3. Condition check: Line Readiness status
      const readiness = getLineReadinessStatus(lineId, getProductionDate(), getCurrentShift());
      if (readiness.conclusion === 'NOT_READY') {
        return {
          success: false,
          message: 'Line có thiết bị kiểm tra đầu ca KHÔNG ĐẠT (NOT READY). Vui lòng khắc phục sự cố trước khi chạy sản xuất!',
        };
      }

      const nowIso = new Date().toISOString();
      const newRuntime: RuntimeTracking = {
        id: `RT_${lineId}_${Date.now()}`,
        plantId: selectedPlantId,
        lineId,
        skuId,
        startedAt: nowIso,
        stoppedAt: null,
        limitHoursSnapshot: sku.limitHours,
        status: 'RUNNING',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Set prior running runtimes for this line to COMPLETED
      setRuntimes((prev) => {
        const next = [
          newRuntime,
          ...prev.map((r) =>
            r.lineId === lineId && r.status === 'RUNNING' ? { ...r, status: 'COMPLETED' as const, stoppedAt: nowIso } : r
          ),
        ];
        saveStateToStorage({ runtimes: next });
        return next;
      });

      // Update equipment lastRunAt - BUT DO NOT RESET lastCipAt!
      setForcedCipRules((prev) => {
        const next = prev.map((r) => (r.lineId === lineId ? { ...r, lastRunAt: nowIso } : r));
        saveStateToStorage({ forcedCipRules: next });
        return next;
      });

      // Also log to Operation Log
      addOperationLog({
        lineId,
        skuId,
        eventGroup: 'Sản xuất',
        content: `Bắt đầu phiên sản xuất mới SKU ${sku.name} (giới hạn Runtime ${sku.limitHours}h).`,
      });

      return { success: true };
    },
    [skus, cips, postCipInspections, forcedCipRules, getLineReadinessStatus, selectedPlantId, saveStateToStorage, addOperationLog]
  );

  const stopForCIP = useCallback(
    (
      lineId: string,
      note: string = 'Dừng máy chuyển sang chu trình vệ sinh CIP',
      options?: { autoRecordLoss?: boolean; cipType?: string }
    ) => {
      const nowIso = new Date().toISOString();
      const activeRt = runtimes.find((r) => r.lineId === lineId && r.status === 'RUNNING');
      const cipType = options?.cipType || 'CIP Full';

      // Auto record Loss log if requested (default: true)
      let linkedLossId: string | undefined;
      const shouldRecordLoss = options?.autoRecordLoss !== false;

      if (shouldRecordLoss) {
        const lineEqs = equipments.filter((e) => e.lineId === lineId);
        const cipEquip =
          lineEqs.find((e) => e.name.toLowerCase().includes('cip') || e.category === 'Utility') ||
          lineEqs[0];

        const lossRes = startLossLog({
          lineId,
          skuId: activeRt?.skuId || undefined, // No auto fallback to skus[0]!
          runtimeSessionId: activeRt?.id,
          equipmentId: cipEquip?.id || 'EQ_CIP',
          lossGroup: 'CIP',
          causeCode: cipType,
          source: 'CBTO',
          originStage: 'CIP',
          description: note,
          downtimeReason: `Dừng máy thực hiện ${cipType}`,
          note: `Ghi nhận từ quy trình Dừng máy chuyển sang CIP: ${note}`,
          affectsLineStop: true,
          startedAt: nowIso,
          endedAt: null,
          impacts: [
            {
              impactId: `IMP_${Date.now()}_0`,
              eventId: '',
              impactType: 'NONE', // Bỏ mặc định dừng nấu 100%!
              impactScope: 'Khác',
              affectedLineId: lineId,
              affectedStage: 'CIP',
              impactStartedAt: nowIso,
              impactEndedAt: null,
              impactPercent: null,
              convertedLossMinutes: null,
              confirmationStatus: 'INSUFFICIENT_DATA',
              note: `Chờ người vận hành xác nhận mức ảnh hưởng thực tế cho chu trình ${cipType}`,
            },
          ],
        });

        if (lossRes.success && lossRes.log) {
          linkedLossId = lossRes.log.id;
        }
      }

      const cipId = `CIP_${lineId}_${Date.now()}`;
      const newCip: CIPTracking = {
        id: cipId,
        plantId: selectedPlantId,
        lineId,
        runtimeId: activeRt ? activeRt.id : '',
        linkedLossId,
        cipStartedAt: nowIso,
        cipCompletedAt: null,
        samplingStartedAt: null,
        samplingMinutes: 60,
        readyAt: null,
        status: 'IN_CIP',
        note,
        performedBy: currentUser.uid,
        performedByName: currentUser.displayName,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setCips((prev) => {
        // Place new active CIP first, and ensure prior non-completed CIPs for this line are settled
        const next = [
          newCip,
          ...prev.filter((c) => !(c.lineId === lineId && (c.status === 'IN_CIP' || c.status === 'POST_CIP_SAMPLING'))),
        ];
        saveStateToStorage({ cips: next });
        return next;
      });

      // Update runtime status
      if (activeRt) {
        setRuntimes((prev) => {
          const next = prev.map((r) =>
            r.id === activeRt.id
              ? {
                  ...r,
                  status: 'STOPPED_FOR_CIP' as const,
                  stoppedAt: nowIso,
                  linkedCipId: cipId,
                  updatedAt: nowIso,
                }
              : r
          );
          saveStateToStorage({ runtimes: next });
          return next;
        });
      }

      // Add to Operation Log
      addOperationLog({
        lineId,
        skuId: activeRt?.skuId,
        eventGroup: 'CIP',
        content: `Bắt đầu chu trình CIP (${cipType}): ${note}`,
      });

      return { success: true, cipId, linkedLossId };
    },
    [runtimes, equipments, selectedPlantId, currentUser, startLossLog, saveStateToStorage, addOperationLog]
  );

  const completeCIPCycle = useCallback(
    (lineId: string) => {
      const nowIso = new Date().toISOString();
      const targetCip = cips.find((c) => c.lineId === lineId && c.status === 'IN_CIP');
      if (!targetCip) return { success: false, message: 'Không có chu trình CIP nào đang chạy trên line này!' };

      // Look up CIP type configuration
      const activeRt = runtimes.find((r) => r.id === targetCip.runtimeId);
      const matchedCipType =
        cipTypes.find((c) => c.code === targetCip.note || targetCip.note.includes(c.name)) ||
        cipTypes[0];
      const samplingWaitMinutes = matchedCipType?.samplingWaitMinutes || 60;

      // Transition to POST_CIP_SAMPLING with actual sampling wait from CIP Master
      setCips((prev) => {
        const next = prev.map((c) =>
          c.id === targetCip.id
            ? {
                ...c,
                cipCompletedAt: nowIso, // Independent timestamp: CIP completed
                samplingStartedAt: nowIso,
                samplingMinutes: samplingWaitMinutes,
                status: 'POST_CIP_SAMPLING' as const,
                updatedAt: nowIso,
              }
            : c
        );
        saveStateToStorage({ cips: next });
        return next;
      });

      // Apply CIP resetRules strictly:
      if (matchedCipType?.resetRules?.resetsEquipmentDays) {
        setForcedCipRules((prev) => {
          const next = prev.map((r) =>
            r.lineId === lineId &&
            (r.requiredCipType === matchedCipType.code || matchedCipType.code === 'CIP_AV')
              ? { ...r, lastCipAt: nowIso }
              : r
          );
          saveStateToStorage({ forcedCipRules: next });
          return next;
        });
      }

      if (matchedCipType?.resetRules?.resetsSkuRuntime && activeRt) {
        setRuntimes((prev) => {
          const next = prev.map((r) => (r.id === activeRt.id ? { ...r, startedAt: nowIso } : r));
          saveStateToStorage({ runtimes: next });
          return next;
        });
      }

      // Automatically end linked Loss log if any
      if (targetCip.linkedLossId) {
        endLossLog(targetCip.linkedLossId, nowIso);
      }

      addOperationLog({
        lineId,
        eventGroup: 'CIP',
        content: `CIP (${matchedCipType?.name || 'Vệ sinh'}) hoàn tất lúc ${formatTime(nowIso)}. Chuyển sang lấy mẫu Post-CIP (${samplingWaitMinutes} phút). Chờ kết quả QC ĐẠT.`,
      });

      return { success: true };
    },
    [cips, runtimes, cipTypes, endLossLog, saveStateToStorage, addOperationLog]
  );

  const verifyAndSetReady = useCallback(
    (lineId: string) => {
      // Must be Supervisor role according to specs
      if (currentUser.role !== 'SUPERVISOR') {
        return { success: false, message: 'Chỉ Supervisor mới có quyền xác nhận chuyển trạng thái Sẵn sàng sản xuất!' };
      }

      const nowIso = new Date().toISOString();
      const targetCip = cips.find((c) => c.lineId === lineId && c.status === 'POST_CIP_SAMPLING');
      if (!targetCip) return { success: false, message: 'Không tìm thấy chu trình Post-CIP hợp lệ!' };

      setCips((prev) => {
        const next = prev.map((c) =>
          c.id === targetCip.id
            ? {
                ...c,
                readyAt: nowIso,
                status: 'READY' as const,
                verifiedBy: currentUser.uid,
                verifiedByName: currentUser.displayName,
                updatedAt: nowIso,
              }
            : c
        );
        saveStateToStorage({ cips: next });
        return next;
      });

      addOperationLog({
        lineId,
        eventGroup: 'CIP',
        content: `Supervisor xác nhận kết quả xét nghiệm đạt chuẩn, Line chuyển sang trạng thái Sẵn sàng sản xuất.`,
      });

      return { success: true };
    },
    [currentUser, cips, saveStateToStorage, addOperationLog]
  );

  const updateSkuLimit = useCallback(
    (skuId: string, newHours: number) => {
      if (currentUser.role !== 'SUPERVISOR') return;
      setSkus((prev) => {
        const next = prev.map((s) => (s.id === skuId ? { ...s, limitHours: newHours } : s));
        saveStateToStorage({ skus: next });
        return next;
      });
    },
    [currentUser.role, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 6: Shift Handover
  // ----------------------------------------------------
  const createHandover = useCallback(
    (data: {
      lineId: string;
      outgoingShiftId: ShiftId;
      incomingShiftId: ShiftId;
      content: string;
      pendingTasks: { id: string; task: string; isCompleted: boolean }[];
    }) => {
      const nowIso = new Date().toISOString();
      // Calculate snapshot
      const activeRt = runtimes.find((r) => r.lineId === data.lineId && r.status === 'RUNNING');
      const activeCip = cips.find((c) => c.lineId === data.lineId);
      const sku = skus.find((s) => s.id === activeRt?.skuId);

      const openAbnormals = abnormalLogs.filter((a) => a.lineId === data.lineId && !a.acknowledgedAt);
      const ongoingLosses = lossLogs.filter((l) => l.lineId === data.lineId && l.endedAt === null);

      let remainingHours = 0;
      if (activeRt) {
        const elapsed = (Date.now() - new Date(activeRt.startedAt).getTime()) / (3600 * 1000);
        remainingHours = Math.max(0, +(activeRt.limitHoursSnapshot - elapsed).toFixed(1));
      }

      const handover: ShiftHandover = {
        id: `HO_${Date.now()}`,
        plantId: selectedPlantId,
        lineId: data.lineId,
        productionDate: getProductionDate(),
        outgoingShiftId: data.outgoingShiftId,
        incomingShiftId: data.incomingShiftId,
        content: data.content,
        pendingTasks: data.pendingTasks,
        snapshot: {
          activeAbnormalitiesCount: openAbnormals.length,
          ongoingLossCount: ongoingLosses.length,
          remainingRuntimeHours: remainingHours,
          cipStatus: activeCip ? activeCip.status : 'READY',
          skuName: sku?.name || 'Chưa chạy SKU',
        },
        outgoingUserId: currentUser.uid,
        outgoingUserName: currentUser.displayName,
        handedAt: nowIso,
        createdAt: nowIso,
      };

      setHandovers((prev) => {
        const next = [handover, ...prev];
        saveStateToStorage({ handovers: next });
        return next;
      });

      return handover;
    },
    [runtimes, cips, skus, abnormalLogs, lossLogs, selectedPlantId, currentUser, saveStateToStorage]
  );

  const confirmReceiveHandover = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      setHandovers((prev) => {
        const next = prev.map((h) =>
          h.id === id
            ? {
                ...h,
                incomingUserId: currentUser.uid,
                incomingUserName: currentUser.displayName,
                receivedAt: nowIso,
              }
            : h
        );
        saveStateToStorage({ handovers: next });
        return next;
      });
    },
    [currentUser, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 7: Production Progress
  // ----------------------------------------------------
  const upsertProgress = useCallback(
    (data: {
      lineId: string;
      skuId: string;
      productionDate: string;
      plannedQty: number;
      actualQty: number;
      unit: string;
    }) => {
      const key = `${data.productionDate}-${data.lineId}-${data.skuId}-${data.unit}`;
      const completionRate = data.plannedQty > 0 ? +((data.actualQty / data.plannedQty) * 100).toFixed(1) : null;
      const variance = +(data.actualQty - data.plannedQty).toFixed(2);

      const record: ProductionProgress = {
        id: key,
        plantId: selectedPlantId,
        lineId: data.lineId,
        skuId: data.skuId,
        productionDate: data.productionDate,
        plannedQty: data.plannedQty,
        actualQty: data.actualQty,
        unit: data.unit,
        completionRate,
        variance,
        source: 'MANUAL',
        updatedAt: new Date().toISOString(),
      };

      setProductionProgress((prev) => {
        const filtered = prev.filter((item) => item.id !== key);
        const next = [record, ...filtered];
        saveStateToStorage({ productionProgress: next });
        return next;
      });
    },
    [selectedPlantId, saveStateToStorage]
  );

  const importProgressBatch = useCallback(
    (
      items: Array<{
        productionDate: string;
        lineCode: string;
        skuCode: string;
        plannedQty: number;
        actualQty: number;
        unit: string;
      }>
    ) => {
      const errors: string[] = [];
      let successCount = 0;
      const newItems: ProductionProgress[] = [];

      items.forEach((row, idx) => {
        const matchedLine = lines.find((l) => l.code === row.lineCode || l.id === row.lineCode);
        const matchedSku = skus.find((s) => s.code === row.skuCode || s.id === row.skuCode);

        if (!matchedLine) {
          errors.push(`Dòng ${idx + 1}: Không tìm thấy mã Line "${row.lineCode}"`);
          return;
        }
        if (!matchedSku) {
          errors.push(`Dòng ${idx + 1}: Không tìm thấy mã SKU "${row.skuCode}"`);
          return;
        }
        if (row.plannedQty < 0 || row.actualQty < 0) {
          errors.push(`Dòng ${idx + 1}: Sản lượng không được là số âm`);
          return;
        }

        const key = `${row.productionDate}-${matchedLine.id}-${matchedSku.id}-${row.unit}`;
        const completionRate = row.plannedQty > 0 ? +((row.actualQty / row.plannedQty) * 100).toFixed(1) : null;
        const variance = +(row.actualQty - row.plannedQty).toFixed(2);

        newItems.push({
          id: key,
          plantId: selectedPlantId,
          lineId: matchedLine.id,
          skuId: matchedSku.id,
          productionDate: row.productionDate,
          plannedQty: row.plannedQty,
          actualQty: row.actualQty,
          unit: row.unit || 'Tấn',
          completionRate,
          variance,
          source: 'CSV_IMPORT',
          importedAt: new Date().toISOString(),
          importedBy: currentUser.uid,
          importedByName: currentUser.displayName,
          updatedAt: new Date().toISOString(),
        });
        successCount++;
      });

      if (newItems.length > 0) {
        setProductionProgress((prev) => {
          // Replace matching keys so we don't duplicate (AC-12)
          const newKeys = new Set(newItems.map((n) => n.id));
          const filtered = prev.filter((p) => !newKeys.has(p.id));
          const next = [...newItems, ...filtered];
          saveStateToStorage({ productionProgress: next });
          return next;
        });
      }

      return { success: errors.length === 0, count: successCount, errors };
    },
    [lines, skus, selectedPlantId, currentUser, saveStateToStorage]
  );

  // ----------------------------------------------------
  // Module 8: Work Schedules
  // ----------------------------------------------------
  const publishWorkSchedule = useCallback(
    (scheduleData: Omit<WorkSchedule, 'id' | 'publishedAt' | 'publishedBy' | 'publishedByName' | 'current' | 'version'>) => {
      const nowIso = new Date().toISOString();
      const newVersion = 1;
      const newId = `SCH_${Date.now()}`;

      const newRecord: WorkSchedule = {
        ...scheduleData,
        id: newId,
        version: newVersion,
        current: true,
        publishedAt: nowIso,
        publishedBy: currentUser.uid,
        publishedByName: `${currentUser.displayName} (${currentUser.role})`,
      };

      setWorkSchedules((prev) => {
        // Set older schedules for the same week to current = false
        const updated = prev.map((s) => (s.weekStartDate === scheduleData.weekStartDate ? { ...s, current: false } : s));
        const next = [newRecord, ...updated];
        saveStateToStorage({ workSchedules: next });
        return next;
      });

      // Add in-app notification (AC-14)
      setNotifications((prev) => [
        {
          id: `NOTIF_SCHED_${Date.now()}`,
          type: 'SCHEDULE_UPDATE',
          title: 'Kế hoạch làm việc tuần mới đã được cập nhật',
          message: `${scheduleData.title} đã được ban hành.`,
          linkTab: 'schedules',
          createdAt: nowIso,
          read: false,
        },
        ...prev,
      ]);
    },
    [currentUser, saveStateToStorage]
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        saveStateToStorage({ notifications: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const clearNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const next = prev.filter((n) => n.id !== id);
        saveStateToStorage({ notifications: next });
        return next;
      });
    },
    [saveStateToStorage]
  );

  const resetToSampleData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLines(INITIAL_LINES);
    setShifts(INITIAL_SHIFTS);
    setEquipments(INITIAL_EQUIPMENTS);
    setDowntimeReasons(INITIAL_DOWNTIME_REASONS);
    setAmChecklists(INITIAL_AM_CHECKLISTS);
    setAbnormalLogs(INITIAL_ABNORMALITIES);
    setLossLogs(INITIAL_LOSS_LOGS);
    setOperationLogs(INITIAL_OPERATION_LOGS);
    setRuntimes(INITIAL_RUNTIMES);
    setCips(INITIAL_CIPS);
    setHandovers(INITIAL_HANDOVERS);
    setProductionProgress(INITIAL_PRODUCTION_PROGRESS);
    setWorkSchedules(INITIAL_WORK_SCHEDULES);
    setSkus(INITIAL_SKUS);
    setCurrentUserState(INITIAL_USERS[0]);
    setSelectedLineId('LINE_01');
    setSelectedShiftId(getCurrentShift());
    setSelectedProductionDate(getProductionDate());
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      availableUsers: INITIAL_USERS,
      selectedPlantId,
      selectedLineId,
      setSelectedLineId,
      selectedShiftId,
      setSelectedShiftId,
      selectedProductionDate,
      setSelectedProductionDate,
      lines,
      addLine,
      updateLine,
      deleteLine,
      shifts,
      addShift,
      updateShift,
      deleteShift,
      skus,
      equipments,
      getEquipmentsByLine,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      downtimeReasons,
      addDowntimeReason,
      updateDowntimeReason,
      deleteDowntimeReason,
      checklistConfigs,
      addChecklistConfig,
      updateChecklistConfig,
      deleteChecklistConfig,
      getChecklistConfigsByEquipment,
      readinessLogs,
      saveReadinessLog,
      getEquipmentReadiness,
      getLineReadinessStatus,
      copyChecklistTemplate,
      lineShiftReceptions,
      saveLineShiftReception,
      getLineShiftReception,
      cipTypes,
      addCipType,
      updateCipType,
      deleteCipType,
      forcedCipRules,
      addForcedCipRule,
      updateForcedCipRule,
      deleteForcedCipRule,
      postCipInspections,
      startPostCipSampling,
      updatePostCipQc,
      grantProductionPermission,
      importFullConfiguration,
      amChecklists,
      saveAMChecklist,
      abnormalLogs,
      addAbnormalLog,
      acknowledgeAbnormalLog,
      lossLogs,
      startLossLog,
      endLossLog,
      updateLossLog,
      deleteLossLog,
      addImpactToEvent,
      updateImpact,
      confirmImpact,
      deleteImpact,
      operationLogs,
      addOperationLog,
      runtimes,
      cips,
      startProductionRun,
      stopForCIP,
      completeCIPCycle,
      verifyAndSetReady,
      updateSkuLimit,
      handovers,
      createHandover,
      confirmReceiveHandover,
      productionProgress,
      upsertProgress,
      importProgressBatch,
      workSchedules,
      publishWorkSchedule,
      notifications,
      markNotificationRead,
      clearNotification,
      resetToSampleData,
    }),
    [
      currentUser,
      setCurrentUser,
      selectedPlantId,
      selectedLineId,
      selectedShiftId,
      selectedProductionDate,
      lines,
      addLine,
      updateLine,
      deleteLine,
      shifts,
      addShift,
      updateShift,
      deleteShift,
      skus,
      equipments,
      getEquipmentsByLine,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      downtimeReasons,
      addDowntimeReason,
      updateDowntimeReason,
      deleteDowntimeReason,
      checklistConfigs,
      addChecklistConfig,
      updateChecklistConfig,
      deleteChecklistConfig,
      getChecklistConfigsByEquipment,
      readinessLogs,
      saveReadinessLog,
      getEquipmentReadiness,
      getLineReadinessStatus,
      copyChecklistTemplate,
      lineShiftReceptions,
      saveLineShiftReception,
      getLineShiftReception,
      cipTypes,
      addCipType,
      updateCipType,
      deleteCipType,
      forcedCipRules,
      addForcedCipRule,
      updateForcedCipRule,
      deleteForcedCipRule,
      postCipInspections,
      startPostCipSampling,
      updatePostCipQc,
      grantProductionPermission,
      importFullConfiguration,
      amChecklists,
      saveAMChecklist,
      abnormalLogs,
      addAbnormalLog,
      acknowledgeAbnormalLog,
      lossLogs,
      startLossLog,
      endLossLog,
      updateLossLog,
      deleteLossLog,
      addImpactToEvent,
      updateImpact,
      confirmImpact,
      deleteImpact,
      operationLogs,
      addOperationLog,
      runtimes,
      cips,
      startProductionRun,
      stopForCIP,
      completeCIPCycle,
      verifyAndSetReady,
      updateSkuLimit,
      handovers,
      createHandover,
      confirmReceiveHandover,
      productionProgress,
      upsertProgress,
      importProgressBatch,
      workSchedules,
      publishWorkSchedule,
      notifications,
      markNotificationRead,
      clearNotification,
      resetToSampleData,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return context;
}

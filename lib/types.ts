export type UserRole = 'OPERATOR' | 'LINE_LEADER' | 'SUPERVISOR';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  employeeCode: string;
  role: UserRole;
  plantIds: string[];
  lineIds: string[];
  active: boolean;
}

export type ShiftId = 'SHIFT_A' | 'SHIFT_B' | 'SHIFT_C' | (string & {});

export interface ShiftInfo {
  id: ShiftId | string;
  name: string;
  code?: string;
  startHour: number; // 6, 14, 22
  endHour: number;   // 14, 22, 6
  displayTime: string;
}

export interface Line {
  id: string;
  code: string;
  name: string;
  plantId: string;
  description: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  lineId: string;
  category: 'Cơ khí' | 'Utility' | 'Instrument' | 'An toàn' | 'Chế biến';
}

export interface DowntimeReasonItem {
  id: string;
  category: LossGroup;
  reason: string;
  stage?: string;
  description?: string;
}

export interface SKU {
  id: string;
  code: string;
  name: string;
  limitHours: number; // 72 or 48
  description: string;
}

export type AMResult = 'PASS' | 'PASS_TAG' | 'FAIL';

export interface AMChecklistItem {
  itemId: string;
  group: 'Cơ khí' | 'Utility' | 'Instrument' | 'An toàn';
  title: string;
  result: AMResult | null;
  note: string;
}

export interface AMChecklist {
  id: string;
  plantId: string;
  lineId: string;
  equipmentId: string;
  productionDate: string; // YYYY-MM-DD (CBTO production date 06:00 cut-off)
  shiftId: ShiftId;
  items: AMChecklistItem[];
  status: 'DRAFT' | 'COMPLETED';
  hasFailOrTag: boolean;
  performedBy: string;
  performedByName: string;
  performedAt: string; // ISO
  completedAt?: string;
  createdAt: string;
}

export interface AbnormalLog {
  id: string;
  plantId: string;
  lineId: string;
  equipmentId: string;
  equipmentName?: string;
  productionDate: string;
  shiftId: ShiftId;
  occurredAt: string; // ISO
  abnormalType: string;
  description: string;
  reportedBy: string;
  reportedByName: string;
  sourceAmId?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
  createdAt: string;
}

export type LossEventSource = 'CBTO' | 'Đóng gói' | 'Utility' | 'QA' | 'Kho' | 'Khác';

export type LossOriginStage = 'HTPG' | 'Xay' | 'Nấu' | 'Làm nguội' | 'Buffer' | 'CIP' | 'Đóng gói';

export type ImpactType =
  | 'NONE'                       // Không ảnh hưởng vận hành (loại trừ)
  | 'REDUCE_COOK_CAPACITY'       // Giảm năng lực nấu
  | 'STOP_COOK'                  // Dừng nấu
  | 'STOP_FEED_PACKING'          // Dừng cấp tương cho ĐG
  | 'COOLING_BUFFER_CONGESTION'  // Ứ bồn làm nguội
  | 'STOP_PACKING'               // Dừng đóng gói
  | 'REDUCE_PACKING_SPEED';      // Giảm tốc đóng gói

export type ImpactScope = 'Nấu' | 'Cấp tương' | 'Đóng gói' | 'Khác';

export type ImpactConfirmationStatus =
  | 'CONFIRMED'          // Đã xác nhận
  | 'PROVISIONAL'        // Tạm tính (sự cố đang diễn ra)
  | 'INSUFFICIENT_DATA'   // Chưa đủ dữ liệu (e.g. Ứ bồn làm nguội chưa xác định %)
  | 'UNREVIEWED';        // Chưa rà soát (dữ liệu cũ/legacy)

export interface EventImpactItem {
  impactId: string;
  eventId: string;
  impactType: ImpactType;
  impactScope: ImpactScope;
  affectedLineId: string;
  affectedStage: string;
  affectedEquipmentId?: string;
  impactStartedAt: string;
  impactEndedAt: string | null;
  impactPercent: number | null; // null if INSUFFICIENT_DATA, 0 if NONE, 1-100
  convertedLossMinutes: number | null; // null if INSUFFICIENT_DATA, 0 if NONE, >0
  confirmationStatus: ImpactConfirmationStatus;
  suggestedByRule?: string; // Tên gợi ý từ Rule Engine nếu có
  userModifiedRule?: boolean;
  confirmedBy?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  note?: string;
}

export type LossGroup =
  | 'Breakdown'
  | 'Chờ NVL'
  | 'Utility'
  | 'CIP'
  | 'Hóa lý'
  | 'Chờ tương'
  | 'Changeover'
  | 'Vệ sinh'
  | 'Khác';

export interface LossLog {
  id: string; // eventId
  plantId: string;
  lineId: string;
  skuId: string;
  equipmentId: string;
  lossGroup: LossGroup; // 9 nhóm nguyên nhân MVP
  causeCode?: string;
  downtimeReason?: string;
  description?: string;
  note: string;
  source: LossEventSource; // Nguồn phát sinh
  originStage: LossOriginStage; // Công đoạn phát sinh
  startedAt: string; // eventStartedAt
  endedAt: string | null; // eventEndedAt (null nếu đang diễn ra)
  durationMinutes: number; // Thời gian sự cố (phút)
  impacts: EventImpactItem[]; // Danh sách các khoảng ảnh hưởng vận hành thực tế
  isLegacyUnreviewed?: boolean; // Cờ đánh dấu bản ghi cũ chưa rà soát
  lineStopEventId: string;
  affectsLineStop: boolean;
  productionDate: string;
  shiftId: ShiftId;
  reportedBy: string;
  reportedByName: string;
  createdAt: string;
  updatedAt?: string;
}

export type OperationEventGroup =
  | 'Sản xuất'
  | 'Hóa lý'
  | 'QA'
  | 'CIP'
  | 'Utility'
  | 'Bảo trì'
  | 'Điều chỉnh công nghệ'
  | 'Khác';

export interface OperationLog {
  id: string;
  plantId: string;
  lineId: string;
  skuId?: string;
  productionDate: string;
  shiftId: ShiftId;
  occurredAt: string; // ISO
  eventGroup: OperationEventGroup;
  content: string;
  sourceType?: string;
  sourceId?: string;
  reportedBy: string;
  reportedByName: string;
  createdAt: string;
}

export type CIPStatus = 'IN_CIP' | 'CIP_COMPLETED' | 'POST_CIP_SAMPLING' | 'READY';

export interface RuntimeTracking {
  id: string;
  plantId: string;
  lineId: string;
  skuId: string;
  startedAt: string; // ISO
  stoppedAt: string | null;
  limitHoursSnapshot: number; // 72 or 48
  status: 'RUNNING' | 'STOPPED_FOR_CIP' | 'COMPLETED';
  linkedCipId?: string;
  threshold90ReachedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CIPTracking {
  id: string;
  plantId: string;
  lineId: string;
  runtimeId: string;
  cipStartedAt: string; // ISO
  cipCompletedAt: string | null;
  samplingStartedAt: string | null;
  samplingMinutes: number; // default 60
  readyAt: string | null;
  status: CIPStatus;
  note: string;
  performedBy: string;
  performedByName: string;
  verifiedBy?: string;
  verifiedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingTaskItem {
  id: string;
  task: string;
  isCompleted: boolean;
}

export interface ShiftHandover {
  id: string;
  plantId: string;
  lineId: string;
  productionDate: string;
  outgoingShiftId: ShiftId;
  incomingShiftId: ShiftId;
  content: string;
  pendingTasks: PendingTaskItem[];
  snapshot: {
    activeAbnormalitiesCount: number;
    ongoingLossCount: number;
    remainingRuntimeHours: number;
    cipStatus: CIPStatus;
    skuName: string;
  };
  outgoingUserId: string;
  outgoingUserName: string;
  incomingUserId?: string;
  incomingUserName?: string;
  handedAt: string;
  receivedAt?: string;
  createdAt: string;
}

export interface ProductionProgress {
  id: string; // key: date-lineId-skuId-unit
  plantId: string;
  lineId: string;
  skuId: string;
  productionDate: string;
  plannedQty: number; // tons
  actualQty: number;  // tons
  unit: string;       // "Tấn"
  completionRate: number | null; // null if plan is 0
  variance: number;   // actual - plan
  source: 'MANUAL' | 'CSV_IMPORT' | 'MES_READY';
  sourceRef?: string;
  importedAt?: string;
  importedBy?: string;
  importedByName?: string;
  updatedAt: string;
}

export interface WorkSchedule {
  id: string;
  plantId: string;
  weekStartDate: string; // YYYY-MM-DD
  weekNumber: number;
  title: string;
  shiftIds: ShiftId[];
  lineIds: string[];
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeKb: number;
  version: number;
  current: boolean;
  publishedAt: string;
  publishedBy: string;
  publishedByName: string;
  notes?: string;
}

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

export type ReadinessConclusion =
  | 'READY'             // Sẵn sàng sản xuất
  | 'CONDITIONAL'       // Sản xuất có điều kiện
  | 'NOT_READY'         // Chưa sẵn sàng sản xuất
  | 'UNCHECKED'         // Chưa kiểm tra
  | 'NOT_CONFIGURED';   // Chưa cấu hình checklist

export type ChecklistResponseType = 'BOOLEAN' | 'MEASUREMENT' | 'TEXT';
export type ChecklistFailureImpact = 'RECORD_ONLY' | 'CONDITIONAL_PRODUCTION' | 'NOT_READY';

export interface ChecklistItemConfig {
  id: string;
  equipmentId?: string;
  lineId?: string;
  code: string;
  title: string;
  group: 'Cơ khí' | 'Utility' | 'Instrument' | 'An toàn' | 'Vệ sinh' | 'Chế biến';
  responseType: ChecklistResponseType;
  unit?: string;
  minVal?: number;
  maxVal?: number;
  isMandatory: boolean;
  allowNA: boolean;
  failureImpact: ChecklistFailureImpact;
  active: boolean;
  description?: string;
}

export interface EquipmentChecklistTemplate {
  equipmentId: string;
  lineId: string;
  items: ChecklistItemConfig[];
  version: number;
  updatedAt: string;
}

export interface EquipmentReadinessItemResult {
  itemId: string;
  code: string;
  title: string;
  group: string;
  responseType: ChecklistResponseType;
  booleanVal?: 'PASS' | 'FAIL' | null;
  measuredVal?: number | null;
  textVal?: string;
  isNA?: boolean;
  naReason?: string;
  unit?: string;
  minVal?: number;
  maxVal?: number;
  isOutOfRange?: boolean;
  failureImpact: ChecklistFailureImpact;
  note?: string;
  linkedAbnormalId?: string;
}

export interface EquipmentReadinessLog {
  id: string;
  plantId: string;
  lineId: string;
  equipmentId: string;
  productionDate: string; // YYYY-MM-DD
  shiftId: ShiftId;
  conclusion: ReadinessConclusion;
  receiverName: string;      // Ai nhận ca
  inspectorName: string;     // Ai kiểm tra thiết bị
  inspectedAt: string;       // Kiểm tra lúc nào (ISO)
  approverName?: string;     // Người duyệt (nếu có điều kiện / giám sát)
  conditionsNote?: string;   // Điều kiện cần theo dõi nếu có
  items: EquipmentReadinessItemResult[];
  createdAt: string;
  updatedAt: string;
}

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

export interface LineShiftReception {
  id: string; // key: `${productionDate}_${shiftId}_${lineId}`
  plantId: string;
  lineId: string;
  productionDate: string; // YYYY-MM-DD
  shiftId: ShiftId;
  receiverName: string;   // Người nhận ca
  receivedAt: string;     // Thời gian nhận ca thực tế (ISO)
  lineConditionsNote?: string; // Điều kiện theo dõi chung toàn line
  overallConclusion?: ReadinessConclusion;
  updatedAt: string;
}

export type AbnormalCategory = 'Thiết bị' | 'Công nghệ' | 'Sản xuất';

export interface AbnormalLog {
  id: string;
  plantId: string;
  lineId: string;
  equipmentId: string;
  equipmentName?: string;
  category?: AbnormalCategory; // 'Thiết bị' | 'Công nghệ' | 'Sản xuất'
  abnormalType: string;
  factDescription?: string;   // FACT: Sự việc/hiện tượng quan sát thực tế
  assessmentNote?: string;    // ĐÁNH GIÁ: Nhận định ban đầu (tùy chọn)
  description?: string;       // Legacy display fallback
  occurredAt: string;         // ISO - Thời điểm xảy ra thực tế
  productionDate: string;
  shiftId: ShiftId;
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

export interface LossAuditEntry {
  changedAt: string;
  changedBy: string;
  changedByName: string;
  action: 'CREATE' | 'UPDATE_EVENT' | 'CONFIRM_IMPACT' | 'CLOSE_EVENT' | 'DELETE_IMPACT' | 'ADD_IMPACT';
  note: string;
}

export interface LossLog {
  id: string; // eventId
  plantId: string;
  lineId: string;
  skuId?: string; // Không tự gán SKU khi chưa xác định
  runtimeSessionId?: string; // Phiên runtime đang chạy nếu có
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
  auditTrail?: LossAuditEntry[];
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
  occurredAt: string; // ISO - Cho phép chọn thời điểm xảy ra thực tế
  eventGroup: OperationEventGroup;
  factDescription?: string; // FACT: Diễn biến sự việc thực tế
  assessmentNote?: string;  // ĐÁNH GIÁ: Nhận định ban đầu hoặc dự đoán (tùy chọn)
  parameterName?: string;   // Tên chỉ số theo dõi (tùy chọn)
  parameterValue?: number | string; // Giá trị định lượng (tùy chọn)
  parameterUnit?: string;   // Đơn vị đo (tùy chọn)
  content: string;          // Nội dung hiển thị tóm tắt
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
  linkedLossId?: string;
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
  fileData?: string; // Base64 data URL for uploaded image/PDF
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

export interface ForcedCIPRule {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  lineId: string;
  maxDaysSinceLastCip: number; // Ngày tối đa sau CIP
  maxIdleDaysWithoutCip: number; // Ngày dừng máy tối đa
  requiredCipType: string; // e.g. 'CIP_AV', 'CIP_ACID_NAOH', 'CIP_C'
  active: boolean;
  notes?: string;
  lastCipAt?: string;
  lastRunAt?: string;
}

export interface CIPChemical {
  id: string;
  cipTypeCode: string;
  chemicalName: string; // e.g. NaOH, HNO3, P3-Oxonia
  concentration: string; // e.g. 1.5 - 2.0%
  unit: string;
}

export interface CIPTypeMaster {
  code: string; // 'CIP_AV', 'CIP_ACID_NAOH', 'CIP_C', 'CIP_D', 'CIP_SEMI'
  name: string; // Tên hiển thị
  standardDurationMin: number; // Phút min (e.g. 90)
  standardDurationMax: number; // Phút max (e.g. 150)
  requiredSampling: boolean; // Có lấy mẫu sau CIP không
  samplingWaitMinutes: number; // Thời gian chờ lấy mẫu dự kiến (default 60m)
  resetRules: {
    resetsSkuRuntime: boolean;
    resetsIdleDays: boolean;
    resetsEquipmentDays: boolean;
  };
  applicableEquipments: string[];
  chemicals: CIPChemical[];
  active: boolean;
  description?: string;
}

export interface PostCipInspection {
  id: string;
  cipTrackingId: string;
  lineId: string;
  equipmentId?: string;
  samplingStartedAt: string; // ISO
  expectedDurationMinutes: number; // default 60
  actualDurationMinutes?: number;
  qcResult: 'PENDING' | 'PASSED' | 'FAILED'; // Chưa có | Đạt | Không đạt
  qcNotes?: string;
  inspectorName?: string;
  approvedBy?: string;
  approvedAt?: string;
  permissionGranted: boolean; // Cấp phép sản xuất lại
}

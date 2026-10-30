'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '@/lib/store';
import {
  Line,
  ShiftInfo,
  Equipment,
  SKU,
  DowntimeReasonItem,
  LossGroup,
  ChecklistItemConfig,
  CIPTypeMaster,
  ForcedCIPRule,
} from '@/lib/types';
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
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  FlaskConical,
  AlertOctagon,
  ClipboardList,
} from 'lucide-react';

type SettingsTab = 'line' | 'shift' | 'equipment' | 'checklist' | 'ciptype' | 'forcedcip' | 'reason' | 'excel';

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
    skus,
    equipments,
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
    cipTypes,
    addCipType,
    updateCipType,
    deleteCipType,
    forcedCipRules,
    addForcedCipRule,
    updateForcedCipRule,
    deleteForcedCipRule,
    importFullConfiguration,
    selectedLineId,
    setSelectedLineId,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('checklist');
  const [filterLineId, setFilterLineId] = useState<string>('ALL');
  const [filterEqId, setFilterEqId] = useState<string>('ALL');
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
  const [eqName, setEqName] = useState('');
  const [eqCategory, setEqCategory] = useState<'Cơ khí' | 'Utility' | 'Instrument' | 'An toàn' | 'Chế biến'>('Cơ khí');

  // Checklist Item Form
  const [chkEqId, setChkEqId] = useState<string>(equipments[0]?.id || '');
  const [chkCode, setChkCode] = useState('');
  const [chkTitle, setChkTitle] = useState('');
  const [chkGroup, setChkGroup] = useState<'Cơ khí' | 'Utility' | 'Instrument' | 'An toàn' | 'Vệ sinh' | 'Chế biến'>('Cơ khí');
  const [chkType, setChkType] = useState<'BOOLEAN' | 'MEASUREMENT' | 'TEXT'>('BOOLEAN');
  const [chkUnit, setChkUnit] = useState('');
  const [chkMin, setChkMin] = useState<string>('');
  const [chkMax, setChkMax] = useState<string>('');
  const [chkMandatory, setChkMandatory] = useState(true);
  const [chkAllowNA, setChkAllowNA] = useState(false);
  const [chkFailureImpact, setChkFailureImpact] = useState<'RECORD_ONLY' | 'CONDITIONAL_PRODUCTION' | 'NOT_READY'>('NOT_READY');

  // Reason form
  const [reasonCategory, setReasonCategory] = useState<LossGroup>('Breakdown');
  const [reasonText, setReasonText] = useState('');
  const [reasonStage, setReasonStage] = useState(COMMON_STAGES[0]);
  const [reasonDesc, setReasonDesc] = useState('');

  // Excel Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    sheetsCount: number;
    parsedData: {
      lines?: Line[];
      equipments?: Equipment[];
      skus?: SKU[];
      shifts?: ShiftInfo[];
      checklists?: ChecklistItemConfig[];
      cipTypes?: CIPTypeMaster[];
      forcedCipRules?: ForcedCIPRule[];
      downtimeReasons?: DowntimeReasonItem[];
    };
    summary: Record<string, number>;
  } | null>(null);

  // Helper notice
  const notify = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // --------------------------------------------------------------------------
  // CHECKLIST FORM HANDLERS
  // --------------------------------------------------------------------------
  const handleSaveChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chkCode.trim() || !chkTitle.trim()) {
      notify('Vui lòng nhập mã và tiêu đề hạng mục kiểm tra!', 'error');
      return;
    }

    const minNum = chkMin !== '' ? parseFloat(chkMin) : undefined;
    const maxNum = chkMax !== '' ? parseFloat(chkMax) : undefined;
    const selectedEq = equipments.find((e) => e.id === chkEqId);

    if (editingId) {
      const existing = checklistConfigs.find((c) => c.id === editingId);
      if (existing) {
        updateChecklistConfig({
          ...existing,
          equipmentId: chkEqId,
          lineId: selectedEq?.lineId,
          code: chkCode.trim(),
          title: chkTitle.trim(),
          group: chkGroup,
          responseType: chkType,
          unit: chkType === 'MEASUREMENT' ? chkUnit.trim() : undefined,
          minVal: minNum,
          maxVal: maxNum,
          isMandatory: chkMandatory,
          allowNA: chkAllowNA,
          failureImpact: chkFailureImpact,
        });
        notify('Đã cập nhật câu hỏi kiểm tra thành công!');
      }
    } else {
      addChecklistConfig({
        equipmentId: chkEqId,
        lineId: selectedEq?.lineId,
        code: chkCode.trim(),
        title: chkTitle.trim(),
        group: chkGroup,
        responseType: chkType,
        unit: chkType === 'MEASUREMENT' ? chkUnit.trim() : undefined,
        minVal: minNum,
        maxVal: maxNum,
        isMandatory: chkMandatory,
        allowNA: chkAllowNA,
        failureImpact: chkFailureImpact,
        active: true,
      });
      notify('Đã thêm mới hạng mục kiểm tra đầu ca!');
    }

    // Reset form
    setEditingId(null);
    setChkCode('');
    setChkTitle('');
    setChkUnit('');
    setChkMin('');
    setChkMax('');
  };

  const handleEditChecklist = (item: ChecklistItemConfig) => {
    setEditingId(item.id);
    setChkEqId(item.equipmentId || equipments[0]?.id || '');
    setChkCode(item.code);
    setChkTitle(item.title);
    setChkGroup(item.group);
    setChkType(item.responseType);
    setChkUnit(item.unit || '');
    setChkMin(item.minVal !== undefined ? String(item.minVal) : '');
    setChkMax(item.maxVal !== undefined ? String(item.maxVal) : '');
    setChkMandatory(item.isMandatory);
    setChkAllowNA(item.allowNA);
    setChkFailureImpact(item.failureImpact);
  };

  // --------------------------------------------------------------------------
  // EXCEL IMPORT / EXPORT (14 SHEETS WORKBOOK)
  // --------------------------------------------------------------------------
  const handleExportFullExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: HuongDan
      const huongDanData = [
        ['MẪU CẤU HÌNH HỆ THỐNG CBTO SHOPFLOOR (14 SHEETS WORKBOOK)'],
        ['Phiên bản', 'MVP 2.0'],
        ['Ngày xuất', new Date().toISOString()],
        [''],
        ['HƯỚNG DẪN SỬ DỤNG:'],
        ['1. Sheet "Lines": Danh mục chuyền chế biến & đóng gói'],
        ['2. Sheet "Devices": Danh mục thiết bị thuộc từng chuyền'],
        ['3. Sheet "SKUs": Danh mục sản phẩm và giới hạn Runtime'],
        ['4. Sheet "Shifts": Các ca sản xuất (Ca A, Ca B, Ca C)'],
        ['5. Sheet "Checklists": Danh mục câu hỏi kiểm tra đầu ca theo từng thiết bị'],
        ['6. Sheet "RuntimeRules": Quy tắc cảnh báo runtime theo % ngưỡng'],
        ['7. Sheet "CIPTypes": Danh mục các quy trình CIP (AV, Axit/Kiềm, C, D, Semi)'],
        ['8. Sheet "CIPChemicals": Nồng độ hóa chất chuẩn cho từng loại CIP'],
        ['9. Sheet "CIPDevices": Thiết bị áp dụng cho từng chu trình CIP'],
        ['10. Sheet "ForcedCIPRules": Quy tắc CIP cưỡng bức (số ngày tối đa sau CIP, số ngày dừng)'],
        ['11. Sheet "PostCIPRules": Quy định lấy mẫu sau CIP (thời gian chờ 60m, kết quả QC)'],
        ['12. Sheet "LossReasons": Danh mục nguyên nhân dừng máy (9 nhóm MVP)'],
        ['13. Sheet "EventGroups": Các nhóm sự kiện nhật ký vận hành'],
      ];
      const wsHuongDan = XLSX.utils.aoa_to_sheet(huongDanData);
      XLSX.utils.book_append_sheet(wb, wsHuongDan, 'HuongDan');

      // Sheet 2: Lines
      const linesData = [
        ['LineCode', 'LineName', 'Description'],
        ...lines.map((l) => [l.code, l.name, l.description || '']),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linesData), 'Lines');

      // Sheet 3: Devices
      const devicesData = [
        ['DeviceCode', 'DeviceName', 'LineCode', 'Category'],
        ...equipments.map((e) => {
          const l = lines.find((line) => line.id === e.lineId);
          return [e.code, e.name, l?.code || e.lineId, e.category];
        }),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(devicesData), 'Devices');

      // Sheet 4: SKUs
      const skusData = [
        ['SKUCode', 'SKUName', 'LimitHours', 'Description'],
        ...skus.map((s) => [s.code, s.name, s.limitHours, s.description || '']),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(skusData), 'SKUs');

      // Sheet 5: Shifts
      const shiftsData = [
        ['ShiftCode', 'ShiftName', 'StartHour', 'EndHour', 'DisplayTime'],
        ...shifts.map((s) => [s.code || s.id, s.name, s.startHour, s.endHour, s.displayTime]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(shiftsData), 'Shifts');

      // Sheet 6: Checklists
      const checklistsData = [
        ['DeviceCode', 'ItemCode', 'Title', 'Group', 'ResponseType', 'Unit', 'MinVal', 'MaxVal', 'IsMandatory', 'AllowNA', 'FailureImpact', 'Active'],
        ...checklistConfigs.map((c) => {
          const eq = equipments.find((e) => e.id === c.equipmentId);
          return [
            eq?.code || c.equipmentId || '',
            c.code,
            c.title,
            c.group,
            c.responseType,
            c.unit || '',
            c.minVal ?? '',
            c.maxVal ?? '',
            c.isMandatory ? 'YES' : 'NO',
            c.allowNA ? 'YES' : 'NO',
            c.failureImpact,
            c.active ? 'YES' : 'NO',
          ];
        }),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(checklistsData), 'Checklists');

      // Sheet 7: RuntimeRules
      const runtimeRulesData = [
        ['RuleName', 'ThresholdPercent', 'BadgeLevel', 'Description'],
        ['An toàn', 80, 'NOTICE', 'Dưới 80% thời gian chạy cho phép'],
        ['Cảnh báo sắp đến hạn', 90, 'WARNING', 'Đạt 90% thời gian chạy, tổ trưởng chuẩn bị CIP'],
        ['Đến hạn CIP', 100, 'DUE', 'Đạt 100% thời gian chạy, bắt buộc chuyển CIP'],
        ['Quá hạn nghiêm trọng', 105, 'OVERDUE', 'Vượt quá hạn SKU, vi phạm tiêu chuẩn vi sinh'],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(runtimeRulesData), 'RuntimeRules');

      // Sheet 8: CIPTypes
      const cipTypesData = [
        ['CIPCode', 'CIPName', 'MinDuration', 'MaxDuration', 'ResetsSku', 'ResetsIdle', 'RequiredSampling', 'SamplingWaitMinutes'],
        ...cipTypes.map((c) => [
          c.code,
          c.name,
          c.standardDurationMin,
          c.standardDurationMax,
          c.resetRules.resetsSkuRuntime ? 'YES' : 'NO',
          c.resetRules.resetsIdleDays ? 'YES' : 'NO',
          c.requiredSampling ? 'YES' : 'NO',
          c.samplingWaitMinutes,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cipTypesData), 'CIPTypes');

      // Sheet 9: CIPChemicals
      const cipChemicalsData = [
        ['CIPCode', 'ChemicalName', 'Concentration', 'Unit'],
        ...cipTypes.flatMap((c) =>
          c.chemicals.map((ch) => [c.code, ch.chemicalName, ch.concentration, ch.unit])
        ),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cipChemicalsData), 'CIPChemicals');

      // Sheet 10: CIPDevices
      const cipDevicesData = [
        ['CIPCode', 'DeviceCode'],
        ...cipTypes.flatMap((c) =>
          c.applicableEquipments.map((eqId) => {
            const eq = equipments.find((e) => e.id === eqId);
            return [c.code, eq?.code || eqId];
          })
        ),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cipDevicesData), 'CIPDevices');

      // Sheet 11: ForcedCIPRules
      const forcedCipRulesData = [
        ['DeviceCode', 'MaxDaysSinceCIP', 'MaxIdleDays', 'RequiredCIPType', 'Active', 'Notes'],
        ...forcedCipRules.map((r) => [
          r.equipmentCode,
          r.maxDaysSinceLastCip,
          r.maxIdleDaysWithoutCip,
          r.requiredCipType,
          r.active ? 'YES' : 'NO',
          r.notes || '',
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(forcedCipRulesData), 'ForcedCIPRules');

      // Sheet 12: PostCIPRules
      const postCipRulesData = [
        ['RuleName', 'ExpectedWaitMinutes', 'MinWaitMinutes', 'RequireQCApproval', 'Description'],
        ['Quy chuẩn lấy mẫu vi sinh', 60, 45, 'YES', 'Thời gian chờ 60m là hướng dẫn lấy mẫu, bắt buộc có phê duyệt QC mới được sản xuất.'],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(postCipRulesData), 'PostCIPRules');

      // Sheet 13: LossReasons
      const lossReasonsData = [
        ['Category', 'Reason', 'Stage', 'Description'],
        ...downtimeReasons.map((r) => [r.category, r.reason, r.stage || '', r.description || '']),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lossReasonsData), 'LossReasons');

      // Sheet 14: EventGroups
      const eventGroupsData = [
        ['GroupCode', 'GroupName', 'Description'],
        ['SX', 'Sản xuất', 'Sự kiện điều hành ca sản xuất'],
        ['HL', 'Hóa lý', 'Đo đạc độ nhớt, brix, cảm quan'],
        ['QA', 'QA', 'Lấy mẫu kiểm tra chất lượng vi sinh'],
        ['CIP', 'CIP', 'Vệ sinh đường ống & bồn chứa'],
        ['UT', 'Utility', 'Sự cố hơi nước, khí nén, cooling'],
        ['BT', 'Bảo trì', 'Kiểm tra bảo dưỡng định kỳ'],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eventGroupsData), 'EventGroups');

      // Write file
      XLSX.writeFile(wb, `CBTO_Shopfloor_Config_${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify('Đã tải xuống file cấu hình Excel (14 sheets) thành công!');
    } catch {
      notify('Lỗi khi xuất file Excel!', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const summary: Record<string, number> = {};
        const parsedData: {
          lines?: Line[];
          equipments?: Equipment[];
          skus?: SKU[];
          shifts?: ShiftInfo[];
          checklists?: ChecklistItemConfig[];
          cipTypes?: CIPTypeMaster[];
          forcedCipRules?: ForcedCIPRule[];
          downtimeReasons?: DowntimeReasonItem[];
        } = {};

        // 1. Lines
        if (wb.SheetNames.includes('Lines')) {
          const ws = wb.Sheets['Lines'];
          const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          if (raw.length > 0) {
            parsedData.lines = raw.map((r, idx) => ({
              id: `LINE_IMPORT_${idx + 1}`,
              plantId: 'CBTO_PLANT',
              code: String(r['LineCode'] || `L${idx + 1}`),
              name: String(r['LineName'] || `Line ${idx + 1}`),
              description: String(r['Description'] || ''),
            }));
            summary['Lines'] = parsedData.lines.length;
          }
        }

        // 2. Devices
        if (wb.SheetNames.includes('Devices')) {
          const ws = wb.Sheets['Devices'];
          const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          if (raw.length > 0) {
            parsedData.equipments = raw.map((r, idx) => {
              const lineCode = String(r['LineCode'] || '');
              const matchedLine = (parsedData.lines || lines).find((l) => l.code === lineCode);
              return {
                id: `EQ_IMPORT_${idx + 1}`,
                code: String(r['DeviceCode'] || `EQ-${idx + 1}`),
                name: String(r['DeviceName'] || `Thiết bị ${idx + 1}`),
                lineId: matchedLine ? matchedLine.id : 'LINE_01',
                category: (r['Category'] as Equipment['category']) || 'Cơ khí',
              };
            });
            summary['Thiết bị'] = parsedData.equipments.length;
          }
        }

        // 3. Checklists
        if (wb.SheetNames.includes('Checklists')) {
          const ws = wb.Sheets['Checklists'];
          const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          if (raw.length > 0) {
            parsedData.checklists = raw.map((r, idx) => {
              const devCode = String(r['DeviceCode'] || '');
              const matchedEq = (parsedData.equipments || equipments).find((e) => e.code === devCode);
              return {
                id: `CHK_IMPORT_${idx + 1}`,
                equipmentId: matchedEq ? matchedEq.id : 'EQ_MIX_01',
                lineId: matchedEq?.lineId || 'LINE_01',
                code: String(r['ItemCode'] || `CHK-${idx + 1}`),
                title: String(r['Title'] || 'Kiểm tra thiết bị'),
                group: (r['Group'] as ChecklistItemConfig['group']) || 'Cơ khí',
                responseType: (r['ResponseType'] as ChecklistItemConfig['responseType']) || 'BOOLEAN',
                unit: r['Unit'] ? String(r['Unit']) : undefined,
                minVal: r['MinVal'] !== undefined && r['MinVal'] !== '' ? Number(r['MinVal']) : undefined,
                maxVal: r['MaxVal'] !== undefined && r['MaxVal'] !== '' ? Number(r['MaxVal']) : undefined,
                isMandatory: String(r['IsMandatory']).toUpperCase() !== 'NO',
                allowNA: String(r['AllowNA']).toUpperCase() === 'YES',
                failureImpact: (r['FailureImpact'] as ChecklistItemConfig['failureImpact']) || 'NOT_READY',
                active: String(r['Active']).toUpperCase() !== 'NO',
              };
            });
            summary['Câu hỏi kiểm tra'] = parsedData.checklists.length;
          }
        }

        setImportPreview({
          fileName: file.name,
          sheetsCount: wb.SheetNames.length,
          parsedData,
          summary,
        });
      } catch {
        notify('Lỗi đọc file Excel! Vui lòng kiểm tra định dạng file.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    const res = importFullConfiguration(importPreview.parsedData);
    if (res.success) {
      notify(res.message);
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      notify('Lỗi khi nạp dữ liệu!', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-4 rounded-2xl border text-xs font-semibold shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
          {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}
          {statusMessage.type === 'info' && <Info className="h-4 w-4 text-blue-600 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#E31837] uppercase tracking-wider">
              Cài đặt & Cấu hình Hệ thống
            </span>
            <h1 className="text-xl font-bold text-gray-900 mt-1">Quản lý Master Data & Import/Export Excel</h1>
            <p className="text-xs text-gray-500 mt-1">
              Cấu hình Chuyền, Thiết bị, Hạng mục kiểm tra đầu ca theo từng máy, Quy tắc CIP cưỡng bức và File Excel 14 sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFullExcel}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Xuất Full Excel (14 Sheets)</span>
            </button>
            <button
              onClick={() => setActiveTab('excel')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4 text-gray-500" />
              <span>Nạp từ Excel</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-6 flex items-center gap-1.5 overflow-x-auto border-t border-gray-100 pt-3">
          {[
            { id: 'checklist', label: 'Hạng mục Kiểm tra Đầu ca', icon: ClipboardList },
            { id: 'equipment', label: 'Thiết bị & Chuyền', icon: Cpu },
            { id: 'ciptype', label: 'Loại CIP & Hóa chất', icon: FlaskConical },
            { id: 'forcedcip', label: 'CIP Cưỡng Bức', icon: AlertOctagon },
            { id: 'reason', label: 'Lý do Dừng máy', icon: AlertTriangle },
            { id: 'line', label: 'Danh mục Chuyền', icon: Layers },
            { id: 'shift', label: 'Ca làm việc', icon: Clock },
            { id: 'excel', label: 'Import / Export Excel', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-[#E31837] text-white shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CHECKLIST CONFIGURATION PER EQUIPMENT */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Create / Edit Form */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#E31837]" />
              <span>{editingId ? 'Chỉnh sửa Câu hỏi Kiểm tra' : 'Thêm mới Câu hỏi Kiểm tra Đầu ca'}</span>
            </h3>

            <form onSubmit={handleSaveChecklist} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700">
                    Áp dụng cho Thiết bị <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={chkEqId}
                    onChange={(e) => setChkEqId(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 font-bold focus:ring-2 focus:ring-[#E31837]"
                  >
                    {equipments.map((eq) => {
                      const l = lines.find((line) => line.id === eq.lineId);
                      return (
                        <option key={eq.id} value={eq.id}>
                          {eq.code} - {eq.name} ({l?.code})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700">
                    Mã hạng mục (Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chkCode}
                    onChange={(e) => setChkCode(e.target.value)}
                    placeholder="VD: CK-BN-01, UT-STEAM-01..."
                    required
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-[#E31837]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700">Nhóm kiểm tra</label>
                  <select
                    value={chkGroup}
                    onChange={(e) => setChkGroup(e.target.value as ChecklistItemConfig['group'])}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 font-bold"
                  >
                    {['Cơ khí', 'Utility', 'Instrument', 'An toàn', 'Vệ sinh', 'Chế biến'].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700">
                  Tiêu đề câu hỏi / Nội dung kiểm tra <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={chkTitle}
                  onChange={(e) => setChkTitle(e.target.value)}
                  placeholder="VD: Kiểm tra độ kín phốt cơ khí bồn nấu khi gia nhiệt..."
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-[#E31837]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <label className="block font-bold text-gray-700">Dạng câu trả lời</label>
                  <select
                    value={chkType}
                    onChange={(e) => setChkType(e.target.value as ChecklistItemConfig['responseType'])}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 font-bold"
                  >
                    <option value="BOOLEAN">Đạt / Lỗi (PASS/FAIL)</option>
                    <option value="MEASUREMENT">Đo lường có chỉ số (Min/Max/Đơn vị)</option>
                    <option value="TEXT">Ghi chú dạng chữ</option>
                  </select>
                </div>

                {chkType === 'MEASUREMENT' && (
                  <>
                    <div>
                      <label className="block font-bold text-gray-700">Đơn vị đo</label>
                      <input
                        type="text"
                        value={chkUnit}
                        onChange={(e) => setChkUnit(e.target.value)}
                        placeholder="VD: bar, °C, mm/s..."
                        className="mt-1 w-full rounded-xl border border-gray-200 p-2"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700">Ngưỡng tối thiểu (Min)</label>
                      <input
                        type="number"
                        step="any"
                        value={chkMin}
                        onChange={(e) => setChkMin(e.target.value)}
                        placeholder="VD: 4.0"
                        className="mt-1 w-full rounded-xl border border-gray-200 p-2"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700">Ngưỡng tối đa (Max)</label>
                      <input
                        type="number"
                        step="any"
                        value={chkMax}
                        onChange={(e) => setChkMax(e.target.value)}
                        placeholder="VD: 5.5"
                        className="mt-1 w-full rounded-xl border border-gray-200 p-2"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700">Mức độ ảnh hưởng khi không đạt (Failure Impact)</label>
                  <select
                    value={chkFailureImpact}
                    onChange={(e) => setChkFailureImpact(e.target.value as ChecklistItemConfig['failureImpact'])}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 font-bold"
                  >
                    <option value="NOT_READY">Chặn chạy máy (Chưa sẵn sàng sản xuất)</option>
                    <option value="CONDITIONAL_PRODUCTION">Chạy có điều kiện (Cần giám sát & phê duyệt)</option>
                    <option value="RECORD_ONLY">Chỉ ghi nhận (Không ảnh hưởng sẵn sàng)</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkMandatory}
                      onChange={(e) => setChkMandatory(e.target.checked)}
                      className="rounded text-[#E31837]"
                    />
                    <span className="font-semibold text-gray-700">Bắt buộc trả lời</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chkAllowNA}
                      onChange={(e) => setChkAllowNA(e.target.checked)}
                      className="rounded text-[#E31837]"
                    />
                    <span className="font-semibold text-gray-700">Cho phép N/A (có lý do)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setChkCode('');
                      setChkTitle('');
                    }}
                    className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#E31837] hover:bg-red-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingId ? 'Cập nhật' : 'Thêm câu hỏi'}
                </button>
              </div>
            </form>
          </div>

          {/* List of configured items */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Danh sách Câu hỏi Đang Cấu hình ({checklistConfigs.length})</h3>
                <p className="text-xs text-gray-500">Lọc theo thiết bị để xem danh mục câu hỏi</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterEqId}
                  onChange={(e) => setFilterEqId(e.target.value)}
                  className="text-xs rounded-xl border border-gray-200 bg-gray-50 p-2 font-bold"
                >
                  <option value="ALL">Tất cả thiết bị ({equipments.length})</option>
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.code} - {eq.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Mã câu hỏi</th>
                    <th className="p-3">Thiết bị áp dụng</th>
                    <th className="p-3">Nội dung kiểm tra</th>
                    <th className="p-3">Dạng câu trả lời</th>
                    <th className="p-3">Ngưỡng chuẩn</th>
                    <th className="p-3">Mức độ ảnh hưởng</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {checklistConfigs
                    .filter((c) => filterEqId === 'ALL' || c.equipmentId === filterEqId)
                    .map((item) => {
                      const eq = equipments.find((e) => e.id === item.equipmentId);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/60">
                          <td className="p-3 font-mono font-bold text-[#E31837]">{item.code}</td>
                          <td className="p-3 text-gray-800 font-semibold">{eq ? `${eq.name} (${eq.code})` : item.equipmentId}</td>
                          <td className="p-3 text-gray-900 font-medium max-w-xs">{item.title}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-[10px]">
                              {item.responseType}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-600">
                            {item.responseType === 'MEASUREMENT'
                              ? `${item.minVal ?? '—'} đến ${item.maxVal ?? '—'} ${item.unit || ''}`
                              : 'PASS / FAIL'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.failureImpact === 'NOT_READY'
                                  ? 'bg-red-100 text-red-800'
                                  : item.failureImpact === 'CONDITIONAL_PRODUCTION'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.failureImpact === 'NOT_READY'
                                ? 'Chặn chạy máy'
                                : item.failureImpact === 'CONDITIONAL_PRODUCTION'
                                ? 'Chạy có điều kiện'
                                : 'Chỉ ghi nhận'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => handleEditChecklist(item)}
                              className="p-1 text-gray-400 hover:text-gray-900 cursor-pointer"
                              title="Sửa câu hỏi"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                deleteChecklistConfig(item.id);
                                notify('Đã xóa câu hỏi kiểm tra');
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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

      {/* TAB: EXCEL IMPORT / EXPORT PREVIEW */}
      {activeTab === 'excel' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Nạp & Xuất Cấu Hình Hệ Thống qua File Excel (14 Sheets)</h3>
              <p className="text-xs text-gray-500 mt-1">
                Cho phép tải template mẫu chuẩn, xuất cấu hình hiện tại hoặc import file Excel cập nhật đồng bộ các sheet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span>Xuất File Cấu Hình (.xlsx)</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Tải xuống file workbook chứa toàn bộ 14 sheet danh mục Chuyền, Thiết bị, SKU, Checklist câu hỏi, CIP Types, Forced CIP rules và Lý do dừng máy hiện tại.
                </p>
                <button
                  onClick={handleExportFullExcel}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Tải xuống File Excel (.xlsx)
                </button>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span>Nạp File Cấu Hình từ Máy tính</span>
                </div>
                <p className="text-xs text-blue-800">
                  Chọn file Excel (.xlsx hoặc .xls) từ máy để rà soát, kiểm tra hợp lệ và nạp vào hệ thống mà không xóa nhật ký vận hành.
                </p>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Import Preview Modal / Card */}
            {importPreview && (
              <div className="mt-6 rounded-2xl border border-gray-300 bg-gray-50 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Rà soát dữ liệu: {importPreview.fileName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Đã đọc thành công {importPreview.sheetsCount} sheets. Vui lòng xác nhận trước khi áp dụng.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setImportPreview(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {Object.entries(importPreview.summary).map(([key, val]) => (
                    <div key={key} className="p-3 bg-white rounded-xl border border-gray-200">
                      <span className="text-gray-500 block">{key}:</span>
                      <span className="text-base font-bold text-gray-900 mt-0.5 block">{val} dòng hợp lệ</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setImportPreview(null)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-200 rounded-xl cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#E31837] hover:bg-red-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    Xác nhận Nạp Cấu Hình vào Hệ Thống
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: OTHER SETTINGS (EQUIPMENTS, LINES, REASONS, CIP TYPES, FORCED CIP) */}
      {activeTab === 'equipment' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Danh mục Thiết bị theo Chuyền</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {equipments.map((eq) => {
              const line = lines.find((l) => l.id === eq.lineId);
              return (
                <div key={eq.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 font-bold text-[10px]">
                      {eq.code}
                    </span>
                    <span className="text-[10px] text-gray-500">{eq.category}</span>
                  </div>
                  <h4 className="mt-1 font-bold text-xs text-gray-900">{eq.name}</h4>
                  <div className="mt-1 text-[11px] text-gray-500">Chuyền: {line?.name || eq.lineId}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ciptype' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Danh mục Quy trình CIP & Hóa chất</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cipTypes.map((c) => (
              <div key={c.code} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#E31837]">{c.code}</span>
                  <span className="text-xs font-mono text-gray-600">{c.standardDurationMin}-{c.standardDurationMax} phút</span>
                </div>
                <h4 className="font-bold text-sm text-gray-900">{c.name}</h4>
                <p className="text-xs text-gray-600">{c.description}</p>
                <div className="text-[11px] text-gray-700">
                  Hóa chất: {c.chemicals.map((ch) => `${ch.chemicalName} (${ch.concentration}${ch.unit})`).join(', ') || 'Nước nóng'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'forcedcip' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Quy tắc CIP Cưỡng Bức theo Thiết bị</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {forcedCipRules.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{r.equipmentCode}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                    {r.requiredCipType}
                  </span>
                </div>
                <div className="text-gray-600">Ngày tối đa sau CIP: <strong className="text-gray-900">{r.maxDaysSinceLastCip} ngày</strong></div>
                <div className="text-gray-600">Ngày dừng tối đa: <strong className="text-gray-900">{r.maxIdleDaysWithoutCip} ngày</strong></div>
                {r.notes && <div className="text-[11px] text-gray-500 italic">{r.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reason' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Danh mục Nguyên nhân Dừng máy ({downtimeReasons.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {downtimeReasons.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-xs">
                <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 font-bold text-[10px]">{r.category}</span>
                <h4 className="mt-1 font-bold text-gray-900">{r.reason}</h4>
                <div className="mt-1 text-[11px] text-gray-500">{r.stage}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'line' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Danh mục Chuyền Sản xuất ({lines.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lines.map((l) => (
              <div key={l.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <span className="px-2 py-0.5 rounded bg-red-100 text-[#E31837] font-bold text-[10px]">{l.code}</span>
                <h4 className="mt-1 font-bold text-sm text-gray-900">{l.name}</h4>
                <p className="mt-1 text-xs text-gray-500">{l.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'shift' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Ca làm việc ({shifts.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {shifts.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <h4 className="font-bold text-sm text-gray-900">{s.name}</h4>
                <div className="mt-1 text-xs font-mono text-gray-600">{s.displayTime}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

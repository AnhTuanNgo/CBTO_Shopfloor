import { ImpactType, LossOriginStage, LossGroup, LossEventSource } from './types';

export interface RuleSuggestion {
  ruleId: string;
  title: string;
  suggestedImpactType: ImpactType;
  suggestedPercent: number | null; // null if unconfirmed/insufficient data
  rationale: string;
  warningNote?: string;
}

export interface RuleContext {
  source: LossEventSource;
  originStage: LossOriginStage;
  lineId: string;
  equipmentId?: string;
  equipmentName?: string;
  lossGroup: LossGroup;
  downtimeReason?: string;
  description?: string;
  // Specific machine conditions
  line2ActiveKettlesCount?: number; // e.g. 1 out of 2 running
  totalKettles?: number;
}

/**
 * CBTO Rule Engine
 * Đưa ra gợi ý thông minh mang tính THAM KHẢO (Advisory only).
 * Người dùng luôn xác nhận hoặc chỉnh sửa trước khi lưu.
 * Tuyệt đối không tự suy diễn dừng đóng gói từ việc dừng nấu hoặc ngược lại.
 */
export function evaluateRuleSuggestions(ctx: RuleContext): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  const reason = (ctx.downtimeReason || '').toLowerCase();
  const desc = (ctx.description || '').toLowerCase();
  const eqName = (ctx.equipmentName || '').toLowerCase();

  // Rule 1: Line 2 - Cụm 2 nồi nấu
  // Nồi nấu 1 hoặc 2 gặp sự cố trên Line 2
  if (ctx.lineId === 'LINE_02' && (ctx.originStage === 'Nấu' || eqName.includes('nồi') || eqName.includes('nấu'))) {
    if (ctx.line2ActiveKettlesCount === 0 || reason.includes('toàn bộ nồi') || desc.includes('cả 2 nồi')) {
      suggestions.push({
        ruleId: 'RULE_LINE2_ALL_KETTLES_STOP',
        title: 'Line 2: Toàn bộ nồi nấu dừng',
        suggestedImpactType: 'STOP_COOK',
        suggestedPercent: 100,
        rationale: 'Toàn bộ 2 nồi nấu tại Line 2 đều ngưng hoạt động. Gợi ý Dừng nấu 100% trong phạm vi cụm nấu.',
      });
    } else {
      // Default: 1 nồi chạy, 1 nồi dừng (năng lực tương đương 50%)
      suggestions.push({
        ruleId: 'RULE_LINE2_ONE_KETTLE_STOP',
        title: 'Line 2: 1 nồi dừng / 1 nồi chạy (50% công suất)',
        suggestedImpactType: 'REDUCE_COOK_CAPACITY',
        suggestedPercent: 50,
        rationale: 'Line 2 có cấu hình 2 nồi nấu tương đương. Khi 1 nồi dừng sự cố và 1 nồi đang hoạt động, năng lực nấu giảm 50%.',
        warningNote: 'Nếu 2 nồi có dung tích/tỷ trọng công suất lệch nhau, vui lòng điều chỉnh tỷ lệ % thực tế.',
      });
    }
  }

  // Rule 2: Đóng gói không nhận được tương / Tắc đường cấp tương
  if (
    reason.includes('thiếu tương cấp') ||
    reason.includes('tắc đường ống') ||
    reason.includes('không nhận được tương') ||
    desc.includes('không nhận được tương') ||
    desc.includes('chờ tương cấp')
  ) {
    suggestions.push({
      ruleId: 'RULE_FEED_STOPPED',
      title: 'Dừng cấp tương cho Đóng gói',
      suggestedImpactType: 'STOP_FEED_PACKING',
      suggestedPercent: 100,
      rationale: 'Hệ thống bơm/đường ống dừng cấp tương xuống khu vực đóng gói.',
      warningNote: 'Lưu ý: Không tự suy ra "Dừng đóng gói" nếu ĐG vẫn còn bồn buffer đệm hoặc đang chạy bình thường.',
    });
  }

  // Rule 3: Tương không chuyển xuống ĐG và tích lũy tại bồn làm nguội
  if (
    ctx.originStage === 'Làm nguội' ||
    ctx.originStage === 'Buffer' ||
    reason.includes('buffer làm nguội') ||
    reason.includes('ứ bồn') ||
    desc.includes('ứ bồn làm nguội') ||
    desc.includes('tích lũy tại làm nguội')
  ) {
    suggestions.push({
      ruleId: 'RULE_COOLING_CONGESTION',
      title: 'Ứ bồn làm nguội (Downstream Congestion)',
      suggestedImpactType: 'COOLING_BUFFER_CONGESTION',
      suggestedPercent: null, // Chưa đủ dữ liệu! Không mặc định 0% hoặc 100%
      rationale: 'Tương tích lũy tại hệ thống làm nguội/bồn đệm, gây nghẽn dòng chảy nhưng chưa khẳng định mức độ dừng.',
      warningNote: 'Không mặc định 100%. Ghi nhận thời gian tồn tại; chỉ tính Loss khi có tỷ lệ ảnh hưởng được xác nhận. Nếu chưa xác định, hệ thống sẽ gắn nhãn "Chưa đủ dữ liệu". Không tự suy ra Dừng nấu hay Dừng ĐG.',
    });
  }

  // Rule 4: Dừng nấu nói chung do sự cố tại công đoạn Nấu
  if (ctx.originStage === 'Nấu' && suggestions.length === 0) {
    if (reason.includes('dừng nấu') || reason.includes('bảo trì bồn')) {
      suggestions.push({
        ruleId: 'RULE_COOK_STOP',
        title: 'Dừng nấu (Cụm bồn nấu)',
        suggestedImpactType: 'STOP_COOK',
        suggestedPercent: 100,
        rationale: 'Sự cố tại công đoạn Nấu làm gián đoạn hoàn toàn mẻ nấu.',
        warningNote: 'Dừng nấu không mặc định làm Đóng gói chờ tương nếu bồn đệm còn tương.',
      });
    }
  }

  // Rule 5: Sự cố tại công đoạn Đóng gói
  if (ctx.originStage === 'Đóng gói' || ctx.source === 'Đóng gói') {
    if (reason.includes('giảm tốc') || desc.includes('chậm')) {
      suggestions.push({
        ruleId: 'RULE_PACKING_SLOW',
        title: 'Giảm tốc đóng gói',
        suggestedImpactType: 'REDUCE_PACKING_SPEED',
        suggestedPercent: 50,
        rationale: 'Dây chuyền chiết rót/đóng thùng giảm tốc độ làm việc.',
      });
    } else {
      suggestions.push({
        ruleId: 'RULE_PACKING_STOP',
        title: 'Dừng đóng gói',
        suggestedImpactType: 'STOP_PACKING',
        suggestedPercent: 100,
        rationale: 'Máy móc khu vực hoàn thiện/đóng gói dừng vận hành.',
        warningNote: 'Dừng đóng gói không mặc định gây dừng nấu nếu bồn trung gian chưa đầy.',
      });
    }
  }

  return suggestions;
}

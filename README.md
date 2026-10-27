# CBTO Shopfloor Operations Web App

> Hệ thống số hóa điều hành sản xuất và quản trị hiện trường (Shopfloor Operations Management) chuyên biệt cho các dây chuyền chế biến tương ớt CBTO.

---

## 📌 1. Giới thiệu tổng quan

**CBTO Shopfloor Operations Web App** là giải pháp phần mềm hiện trường hỗ trợ công nhân vận hành (Operator), tổ trưởng (Line Leader) và giám sát ca (Supervisor) theo dõi, ghi nhận và xử lý tức thời các biến động sản xuất. 

Hệ thống tập trung vào **4 chỉ số cốt lõi**:
1. **Sản lượng (Production Progress)**: Tiến độ kế hoạch và sản lượng thực tế (Tấn) theo ngày và ca.
2. **Quản lý Dừng máy & Loss (Loss Time)**: Mô hình hóa tổn thất quy đổi theo ảnh hưởng vận hành thực tế, phân tách theo 3 phạm vi độc lập (Nấu / Cấp tương / Đóng gói).
3. **Thời gian chạy liên tục (Runtime) & Vệ sinh CIP**: Giám sát giới hạn 72h chạy liên tục, cảnh báo sớm ngưỡng >90%, chu kỳ rửa CIP và đếm ngược 60 phút kiểm tra ATP vi sinh (Post-CIP).
4. **Bảo trì tự quản (Autonomous Maintenance - AM) & Bất thường (Abnormalities)**: Số hóa danh mục kiểm tra AM đầu ca, phát hiện và phân loại bất thường máy móc/chất lượng.

---

## 🚀 2. Kiến trúc Mô hình Dừng máy & Loss CBTO

Hệ thống áp dụng mô hình tính toán tổn thất đa chiều:
$$\text{Sự kiện / Nguyên nhân gốc} \longrightarrow \text{Ảnh hưởng vận hành được xác nhận} \longrightarrow \text{Thời gian ảnh hưởng thực tế} \longrightarrow \text{Mức độ ảnh hưởng (\%)} \longrightarrow \text{Loss quy đổi tương đương}$$

### A. Tách biệt độc lập 7 chiều thông tin
1. **Nguồn phát sinh**: CBTO, Đóng gói, Utility, QA, Kho, Khác.
2. **Nguyên nhân phát sinh (9 nhóm MVP)**: Breakdown, Chờ NVL, Utility, CIP, Hóa lý, Chờ tương, Changeover, Vệ sinh, Khác.
3. **Công đoạn phát sinh**: HTPG, Xay, Nấu, Làm nguội, Buffer, CIP, Đóng gói.
4. **Ảnh hưởng vận hành thực tế**:
   - `Không ảnh hưởng vận hành` (Loại trừ, 0% Loss).
   - `Giảm năng lực nấu`.
   - `Dừng nấu` (100%).
   - `Dừng cấp tương cho ĐG`.
   - `Ứ bồn làm nguội`.
   - `Dừng đóng gói` (100%).
   - `Giảm tốc đóng gói`.
5. **Mức độ ảnh hưởng (%)**: Cho phép chọn nhanh `25% · 50% · 75% · 100%` hoặc nhập trực tiếp từ $1\%$ đến $100\%$.
6. **Thời gian ảnh hưởng thực tế (phút)**: Cho phép chia thành nhiều khoảng biến thiên (ví dụ: 08:00–08:30 giảm 50%, 08:30–09:00 dừng 100%).
7. **Loss quy đổi tương đương (phút)**:
   $$\text{Loss quy đổi (phút)} = \text{Thời gian ảnh hưởng thực tế (phút)} \times \frac{\text{Mức ảnh hưởng (\%)}}{100}$$

### B. Nguyên tắc chống cộng dồn mù quáng (Anti-Duplication Principle)
- **Tách biệt 3 phạm vi độc lập**:
  - **Phạm vi Cụm Nấu (Cooking Scope)**: Tổn thất dừng nồi nấu hoặc giảm tải nấu. Không suy diễn làm dừng Đóng gói nếu ĐG vẫn chạy từ buffer.
  - **Phạm vi Cấp Tương (Feed Scope)**: Dừng cấp tương cho ĐG hoặc tương tích lũy tại bồn làm nguội.
  - **Phạm vi Đóng Gói (Packing Scope)**: Dừng máy chiết rót, vặn nắp, dán nhãn hoặc giảm tốc đóng gói.
- **Xử lý đặc thù Ứ bồn làm nguội**: Ghi nhận thời lượng tồn tại của hiện tượng; nếu chưa xác định được tỷ lệ % thực tế, hệ thống gắn cờ `"Chưa đủ dữ liệu"` thay vì tự áp đặt $0\%$ hoặc $100\%$.

### C. Rule Engine hỗ trợ CBTO (Advisory Only)
- Tự động phân tích ngữ cảnh (ví dụ: Line 2 có 2 nồi nấu, 1 nồi dừng $\rightarrow$ gợi ý giảm năng lực nấu $50\%$; ĐG không nhận được tương $\rightarrow$ gợi ý Dừng cấp tương).
- **Nguyên tắc**: Rule Engine chỉ mang tính tham khảo, người dùng luôn chủ động kiểm tra, chỉnh sửa và xác nhận trước khi lưu vào hệ thống.

---

## 📂 3. Cấu trúc Các Module Chức Năng

| Module | Đường dẫn / Tab | Chức năng chính |
| :--- | :--- | :--- |
| **Dashboard Điều Hành** | `Tổng quan` | Giám sát 4 chỉ số cốt lõi, trung tâm cảnh báo, Dual Pareto (Pareto Nguyên nhân 9 nhóm vs. Pareto Ảnh hưởng vận hành thực tế). |
| **Bảo trì AM** | `Ghi nhận` $\rightarrow$ `Kiểm tra AM` | Checklist tự động theo ca và dây chuyền, ghi nhận đạt/không đạt kèm hình ảnh và ghi chú. |
| **Bất thường** | `Ghi nhận` $\rightarrow$ `Bất thường` | Ghi nhận sự cố bất thường máy móc/chất lượng, theo dõi trạng thái xử lý và rà soát của giám sát. |
| **Loss Time** | `Ghi nhận` $\rightarrow$ `Loss Time` | Quản lý dừng máy theo Line, form ghi nhận 3 bước chuẩn hóa, theo dõi sự cố đang mở (ongoing) và tổng hợp phân bổ 9 nhóm. |
| **Nhật ký vận hành** | `Ghi nhận` $\rightarrow$ `Nhật ký` | Dòng thời gian (Timeline) ghi chép các thao tác kỹ thuật, thông số mẻ nấu, cấp phụ gia, vệ sinh. |
| **Runtime & CIP** | `Runtime/CIP` | Đo lường thời gian chạy liên tục (giới hạn 72h), cảnh báo >90%, chu trình CIP và đếm ngược Post-CIP 60 phút. |
| **Bàn giao ca** | `Giao ca` | Bàn giao an toàn, chất lượng 5S, tiến độ sản lượng, công việc tồn đọng và xác nhận ký nhận 2 chiều giữa 2 ca. |
| **Tiến độ sản xuất** | `Thêm` $\rightarrow$ `Tiến độ` | Theo dõi sản lượng theo SKU (chai 250ml, 500ml, can 2L...), tỷ lệ hoàn thành kế hoạch. |
| **Lịch làm việc** | `Thêm` $\rightarrow$ `Lịch làm việc` | Lịch phân ca theo Line, nhân sự phụ trách từng vị trí vận hành. |
| **KPI Vận hành** | `Thêm` $\rightarrow$ `KPI` | Đánh giá chỉ số sẵn sàng thiết bị, tuân thủ AM, hoàn thành sản lượng theo tháng/tuần. |
| **Cài đặt chi tiết** | `Thêm` $\rightarrow$ `Cài đặt` | Tùy biến danh mục Line, Thiết bị, Ca sản xuất, SKU và Danh mục lý do lỗi riêng cho từng dây chuyền. |

---

## 👥 4. Phân Quyền & Vai Trò Người Dùng

Hệ thống thiết lập 3 vai trò người dùng chuẩn công nghiệp:
- **Công nhân vận hành (Operator - CN)**:
  - Thực hiện kiểm tra checklist AM ca.
  - Ghi nhận nhật ký vận hành và sự cố bất thường tại máy.
  - Ghi nhận bắt đầu/kết thúc dừng máy tại vị trí được phân công.
- **Tổ trưởng (Line Leader - Leader)**:
  - Khai báo ảnh hưởng vận hành thực tế và mức độ % theo hiện trường.
  - Khởi động/kết thúc quy trình CIP và Post-CIP.
  - Soạn thảo và ký biên bản bàn giao ca.
- **Giám sát ca (Supervisor - SV)**:
  - Toàn quyền rà soát, phê duyệt biên bản giao ca và xác nhận các khoảng ảnh hưởng gắn cờ "Chưa đủ dữ liệu".
  - Theo dõi Dashboard điều hành, phân tích Dual Pareto.
  - Cấu hình tùy biến thiết bị, line và lý do dừng máy trong mục Cài đặt.

---

## 🛠️ 5. Công Nghệ & Khởi Chạy

### Công nghệ sử dụng
- **Framework**: Next.js 15+ (App Router).
- **Core UI**: React 19, TypeScript.
- **Styling**: Tailwind CSS v4, `@tailwindcss/postcss`.
- **Icon Library**: `lucide-react`.
- **Animation**: `motion` (`motion/react`).
- **Store & State**: React Context API (`AppStoreProvider`) kết hợp đồng bộ trình duyệt LocalStorage và dữ liệu mẫu chuẩn CBTO.

### Khởi chạy dự án trong môi trường phát triển
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển (Cổng 3000)
npm run dev

# 3. Kiểm tra cú pháp & tính toàn vẹn (ESLint)
npm run lint

# 4. Đóng gói sản phẩm (Production Build)
npm run build
```

---

## 📋 6. Quy Tắc Ngày Sản Xuất & Mốc Giờ Ca
- **Mốc cắt ngày sản xuất (Production Date Cut-off)**: **06:00 sáng**. Các sự kiện diễn ra từ 00:00 đến 05:59 sáng thuộc ngày sản xuất của ngày hôm trước.
- **3 Ca làm việc tiêu chuẩn**:
  - **Ca 1**: 06:00 – 14:00 (8 giờ).
  - **Ca 2**: 14:00 – 22:00 (8 giờ).
  - **Ca 3**: 22:00 – 06:00 (8 giờ, qua đêm).

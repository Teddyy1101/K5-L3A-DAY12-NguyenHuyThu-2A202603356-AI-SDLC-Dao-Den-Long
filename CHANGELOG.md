# Changelog

## Phase 3 — Contract 1.2

Thay đổi phá vỡ tương thích

- Bỏ thắng sớm và lý do `all_lit`. Đêm 1/2/3 dài 240/270/300 giây. Bình minh thắng với `dawn_survived` khi còn Ngọn Lửa và giữ ít nhất 3/4/5 đèn sáng tương ứng.
- Đèn sáng hao dầu và có thể tắt. **E** châm dầu vào đèn sáng còn thiếu hoặc nạp đèn tắt. Thắp lại tốn 5 đom đóm. Vùng an toàn chỉ tồn tại ở đèn sáng còn ít nhất 30 dầu.
- Điểm nạp giảm xuống +5 mỗi đom đóm. Thắp lần đầu +100, thắp lại +40. Tỏa Sáng trúng một Bóng Mực +5, hoặc tổng +15 nếu nó đang hút dầu. Bỏ thưởng thời gian. Thắng ở bình minh thưởng 50 cộng phần nguyên dầu của mỗi đèn sáng và 50 mỗi Ngọn Lửa.
- `lantern_lit` có thêm `relight`. Snapshot thêm `player.capacity`, `lanterns[].fuel`, `ever_lit`, `relit_count` và trạng thái Bóng Mực `drain`. Scenario hỗ trợ khởi tạo các giá trị dầu, lịch sử thắp, sức chứa theo số lần thắp và đích hút dầu. Thêm sự kiện `refuel`, `lantern_out` và `fuel_drain`.

Giao diện

- Thêm thanh dầu, nhấp nháy khi thấp, hình dáng đèn tắt có vết rách và HUD sức chứa từ 10 đến 20.
- Cài đặt **Bảng màu dễ phân biệt** được lưu, đổi viền và mắt Bóng Mực sang xanh lam, cảnh báo sang trắng có biểu tượng ⚠.

[ADR về dầu đèn và bình minh](docs/phase-3/adr-001-lantern-fuel.md)

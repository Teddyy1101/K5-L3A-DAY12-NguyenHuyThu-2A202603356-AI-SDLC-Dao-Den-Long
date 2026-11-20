# ADR 001 — Dầu đèn và kết quả khi bình minh

## Bối cảnh

Ticket-03 thay mục tiêu thắp toàn bộ đèn bằng giữ ánh sáng đến bình minh. Bản chơi và CLI dùng chung mô phỏng 60 tick/giây.

## Quyết định

- Mỗi đèn có `lit`, lượng dầu nội bộ tính bằng đơn vị nguyên 1/60, số đom đóm đang nạp, cờ đã từng sáng và số lần thắp lại. Nhập dầu từ scenario bằng phép làm tròn đến đơn vị gần nhất. Snapshot và các sự kiện dầu xuất đến một chữ số thập phân. Đèn sáng đặt bằng scenario khởi đầu với 100 dầu nếu bỏ trống, không tính vào sức chứa.
- Mỗi bước mô phỏng trừ hao tự nhiên và dầu hút bởi các Bóng Mực đang hút hợp lệ. Báo `fuel_drain` mỗi 60 tick hút thực tế của từng Bóng Mực, dùng số dầu sau khi cộng dồn hao hụt. Xử lý `lantern_out` trước khi di chuyển và nạp. Vì hao dầu đi trước tương tác, đèn có 100 dầu ở snapshot trước có thể nhận thêm một đom đóm sau khi đã hao 1/60.
- Vùng an toàn dùng lượng dầu nguyên với ngưỡng bao gồm đúng 30. Lần đẩy đã bắt đầu tiếp tục tới mép kể cả dầu vừa giảm dưới 30 trở lại. Bóng Mực đang hút chuyển trạng thái sau thao tác châm hoặc Tỏa Sáng trong tick.
- Đánh giá kết thúc sau toàn bộ bước. Hết Ngọn Lửa có ưu tiên cao nhất. Khi hết giờ, đếm đèn còn sáng với ngưỡng làm tròn lên 60%. Cộng `floor(fuel)` bằng giá trị dầu nguyên, độc lập với số hiển thị đã làm tròn.

## Hồi quy

- Bài thắp đèn cuối Đêm 1 nay kiểm tra ván vẫn chạy và chỉ ghi `dawn_survived` ở bình minh. Điểm mong đợi đổi theo công thức mới.
- Bài nạp từng phần giữ nguyên các bước cũ, bổ sung `relight: false` vào sự kiện thắp lần đầu. Bài thắng ở tick cuối được đổi thành trường hợp nạp vừa đạt ngưỡng ở từng Đêm, kèm đủ hai trường hợp thua.
- Kiểm tra giữ tọa độ, di chuyển, lướt, rơi, Gió Lạc, Bùa Gió, bình minh và tính tất định. Mộc Độn, phản lực của người chơi khi trúng Bóng Mực và đổi Đêm tay vẫn có ở bản chơi.

[Changelog](../../CHANGELOG.md) · [Bằng chứng Phase 3](../proof/phase-3/README.md)

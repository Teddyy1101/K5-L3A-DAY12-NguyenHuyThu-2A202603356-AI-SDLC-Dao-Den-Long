# Ghi chép Phase 1 · Đêm 1 – Đảo Bến

## Nguồn yêu cầu và quyết định

- Dùng PRD-0 và Test Contract v1.0 do người dùng cung cấp làm nguồn. Bản nháp ban đầu giả định ba đèn và 30 tick/giây. Sau khi có đề, thay thiết kế đó bằng năm đèn, 60 tick/giây, scenario/input riêng và JSONL theo mốc tick. So sánh trực tiếp contract với manifest và thêm test bảo vệ các điểm khác biệt. [PRD-0](../phase-1/prd-0.md) · [Test Contract v1.0](../phase-1/test-contract.md)
- Chọn bản web dựng hình phối cảnh 3D bằng Canvas và chạy CLI bằng Node.js. Cả hai nhập `src/core.mjs`. Canvas, hồ sơ mô hình và bản đồ nhỏ chỉ chạy ở giao diện. Có thể chạy bản web và CLI trên hệ có Node.js và trình duyệt tương thích, không cần Unity hoặc tải asset từ mạng.
- Mọi tuning dùng trong game được khai báo trong `game.contract.json`. Giả định bổ sung về bản đồ gồm đảo bán kính 36 m, bờ chắn, đường đom đóm cố định dẫn tới đèn và đom đóm rải thêm theo seed. Bản trình duyệt bắt đầu với seed `1201` và chơi lại dùng lại seed.
- Đèn sáng có vùng an toàn. Nạp từng phần theo cạnh lên của `E` và chọn đèn chưa sáng gần nhất. Tỏa sáng trừ 2 đom đóm, kích hoạt theo cạnh lên, làm choáng và đẩy Bóng Mực trong bán kính. Bóng Mực không gây sát thương khi bị choáng. Bóng Mực sinh thêm mỗi 30 giây, tối đa 6 con. `random_shades: false` bỏ sinh tự động. Danh sách scenario thay thế danh sách mặc định.
- Thứ tự xử lý một bước gồm di chuyển, nhặt, nạp, kiểm tra đủ đèn, tỏa sáng, cập nhật Bóng Mực và chốt thua. Điểm thời gian tính theo số giây nguyên còn lại và chỉ cộng khi thắng, cùng điểm máu còn lại. Dựng trạng thái scenario không cộng điểm hay phát event.

## Nhật ký AI và đánh giá

- Lượt tinh chỉnh giao diện bổ sung bước chân, sương trên đảo nổi, tín hiệu Bóng Mực ở gần trên bản đồ và phản hồi khi gom/nạp ánh sáng. Phím `P` dừng đồng hồ và mô phỏng trong bản chơi. Kiểm tra giao diện bao gồm cả tạm dừng, tiếp tục và thông báo thắp đèn.

- Dùng OpenAI Codex để đọc đề, triển khai, kiểm tra và ghi bằng chứng. Đề trích dẫn và lệnh chạy được lưu trong repo. Sai lệch đáng kể của bản nháp là tự đặt contract khi đề chưa có trong workspace. Phát hiện khi đối chiếu với đề người dùng gửi, xử lý bằng cách thay toàn bộ giao diện headless cũ, kiểm thử schema và thêm nguồn đề vào `AGENTS.md`.
- Ước lượng thô cho lượt triển khai lại là khoảng 20.000–30.000 token nội dung đọc và sinh mới, dựa trên độ dài đề, diff và kết quả kiểm tra. Phiên làm việc không cung cấp số token hoặc chi phí thực tế. Tiết kiệm bằng cách tái sử dụng phần khung 3D, không thêm dependency và dùng cùng logic để xác minh cả hai đường chạy.
- Đạt 10/10 bài kiểm thử tự động. Hai kịch bản đi qua CLI và xuất JSONL thật. Phần lớp vẽ và giao diện được kiểm tra bằng Canvas/DOM giả lập, còn chơi trực tiếp và chạy clone GitHub trên macOS/Linux chưa được xác nhận. [Bằng chứng](../proof/phase-1/README.md) · [Checklist](../../phase_1_checklist.md)

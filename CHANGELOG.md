# Changelog

## Phase 4 — Contract 1.3 · v1.0.0

Thêm

- `bench_cmd` và `soak_cmd` trong `game.contract.json`. `node src/bench.mjs --seed 42 --duration 30 --out bench.json` đo cảnh chuẩn (200 Bóng Mực wander, 100 đom đóm, 3 đèn fuel 100, camera bay vòng) trong Chrome/Edge. `node --expose-gc src/soak.mjs --seed 7 --nights 10 --out soak.json` chạy 10 Đêm headless liên tiếp.
- Bảng xếp hạng cục bộ top 10 (lưu đĩa, ghi nguyên tử), màn hình từ menu chính, nhập tên sau bình minh Đêm 3 hoặc sau khi thua, xuất bằng `node src/server.mjs --export-leaderboard out.json`.
- Kỹ năng 2 **Mưa sao băng** (phím `2`, hồi 8 giây), thuần hình ảnh nên luật, số liệu và đầu ra headless không đổi. Sáu bước bật/tắt và chỉnh được: đầu sáng, vệt đuôi, nổ tia, sao văng, mưa liên tục, bonus ô vỡ và sao băng khổng lồ. Ảnh chụp ở `docs/proof/phase-4/meteor-*.png`, tái tạo bằng `meteor-preview.html`.
- Kỹ năng 3 **Phép băng** (phím `3`, hồi 6 giây), thuần hình ảnh. Sáu hiệu ứng bật/tắt và chỉnh được: gai mọc lần lượt từ đất, gai to dần về phía quái, gai nhỏ nghiêng hai bên, đất nứt cùng mảnh vụn, gai tan từ đỉnh rồi vỡ mảnh, khối băng có tuyết bọc quái. Ảnh ở `docs/proof/phase-4/ice-*.png`.
- Đổi phím cho mọi hành động, báo trùng phím, nút khôi phục mặc định, lưu cấu hình.
- Phụ đề và chỉ báo: Bóng Mực xuất hiện (mũi tên mép màn hình), gió sắp thổi, 10 giây cuối, đèn dưới 30 dầu.
- Giảm chuyển động (tắt rung camera và chớp màn hình), chữ UI tối thiểu 18 px và tùy chọn chữ lớn ×1.25.
- README đầy đủ, LICENSE, CREDITS, bản retro, bằng chứng Phase 4.

Thay đổi

- Tối ưu vẽ: `paintFaces` dùng bộ đệm tái sử dụng thay vì cấp phát mảng cho mỗi mặt. Đầu ra hình ảnh và số lệnh vẽ không đổi; luật, số liệu và đầu ra headless không đổi.
- `contract_version` nâng lên `1.3`; test manifest ở Phase 1 cập nhật theo.
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

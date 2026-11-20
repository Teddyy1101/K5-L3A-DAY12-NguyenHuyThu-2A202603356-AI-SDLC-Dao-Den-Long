# Đặc tả Phase 2

## Nguồn yêu cầu

Ticket Phase 2 và hai bảng số liệu, màu sắc do người dùng cung cấp. Mã giao diện và CLI dùng cùng mô phỏng 60 tick/giây, đơn vị mét và giây, trục Y hướng lên. Manifest ở [game.contract.json](../../game.contract.json).

## Tiêu chí nghiệm thu

| Tiêu chí | Cách kiểm chứng |
|---|---|
| Chạy, nhảy, lướt | Chạy 6 m/s, nhảy 7 m/s với trọng lực −20 m/s². Lướt 14 m/s trong 12 tick, hướng theo input hoặc hướng mặt. Khi đang trên không, cao độ giữ nguyên trong lúc lướt. |
| Đom đóm và đèn | Khởi tạo đúng 20 điểm khác nhau. Sinh thêm tại tick 240, 480 và tiếp theo khi còn điểm trống và dưới trần 30. Nhặt theo bán kính 1 m trên XZ và chênh cao ≤ 1,5 m. Tối đa 10 ô. Nhấn E trong 2 m để nạp từng phần. Nếu bằng khoảng cách, lấy id đèn nhỏ hơn. |
| Bóng Mực, vùng an toàn | Hai con sinh ở tick 300, các lần sau theo khoảng sinh từng Đêm. Bóng Mực phát hiện trong 12 m, bỏ đuổi ngoài 18 m. Đèn sáng ngăn Bóng Mực ở rìa 6 m. Bóng bị kẹt bên trong ra tới mép trong tối đa 30 tick. |
| Tỏa Sáng | Tốn 3 đom đóm, hồi chiêu 3 s. Khoảng cách 3D tính từ chân Mây + 0,8 m. Choáng 120 tick, đẩy tổng 4 m trong 15 tick và dừng ở vật cản. Tính điểm cả khi đánh trúng Bóng Mực đang choáng. |
| Hit và rơi đảo | Hit trừ một Ngọn Lửa, thả một nửa kho ra vành 1,5–2,5 m và cho Mây bất tử 90 tick. Đom đóm rơi có TTL 480 tick. Rơi dưới Y = −10 trừ một Ngọn Lửa, xóa kho và hồi sinh sau 60 tick nếu còn sống. |
| Bản đồ | Đêm 1 có bán kính 40 m và 5 đèn. Đêm 2 có hai đảo, cầu tre, 2 bục và 6 đèn. Đêm 3 có 3 tầng, 2 dốc, bục nhảy, tháp và 7 đèn. Kiểm tra tọa độ đèn ở snapshot tick 0. |
| Gió Lạc | Sinh từ tick 1200 ở Đêm 2 và 3, tối đa hai con hoạt động. Trong điều kiện đuổi, cướp tối đa 3 đom đóm trước khi xét hit của Bóng Mực. Tỏa Sáng ngăn cướp hoặc khiến Gió Lạc đang chạy trốn thả đồ. |
| Bùa Gió | Bùa kéo dài 600 tick và hồi sau 2700 tick. Mây chạy 7,2 m/s và có thể lướt lại khi lần trước đã xong. |
| Gió mạnh | Ở Đêm 3, cảnh báo bằng lá và âm thanh trước 2 s. Cơn gió đầu tiên bắt đầu ở tick 1800, kéo dài 300 tick và tăng vận tốc ngang 2 m/s theo hướng từ seed. |
| Chuỗi 3 Đêm và điểm | Menu → lời Ông Đăng → chơi → kết quả từng Đêm → Bình Minh sau khi thắng Đêm 3. Thua chơi lại Đêm đang chơi. Điểm game cộng các Đêm đã thắng. Điểm trong Đêm đến từ nạp đom đóm, thắp đèn, trúng Tỏa Sáng và thưởng thời gian cùng Ngọn Lửa khi thắng. |
| Tạm dừng | Esc/P mở menu Tiếp tục, Chơi lại Đêm, Cài đặt, Về menu. CLI kiểm chứng tick tăng trong khi sim_tick, TTL và hồi chiêu giữ nguyên cho đến khi tiếp tục. |
| Cài đặt | Âm lượng và độ nhạy chuột được ghi vào localStorage. Kéo chuột trên khung game để xoay camera. |
| Âm thanh | Dùng Web Audio cho nhạc nền và các tín hiệu nhặt, thắp đèn, pulse, hit, nhảy, lướt, thắng, thua, Bóng Mực sinh và đếm ngược 10 giây cuối. |
| HUD | Ngọn Lửa trên trái, đồng hồ trên giữa đổi màu và nhấp nháy khi ≤ 30 s, điểm và số đèn trên phải. Thanh 10 ô và hồi chiêu Lướt/Tỏa Sáng ở dưới. Có gợi ý nạp và mũi tên khi đèn chưa sáng gần nhất ra ngoài màn hình. |
| Màu và ánh sáng | Áp bảng màu người dùng cung cấp. Môi trường dùng cường độ `0.15 + 0.55 × đèn sáng / tổng đèn`. Ánh vàng cục bộ và sao choáng theo mô hình Phase 1 vẫn có trong bản chơi. |
| Contract và hiệu năng | Snapshot 1.1 có trường bản đồ, gió, vận tốc, hồi chiêu, Bùa Gió, Gió Lạc, loại/TTL đom đóm. Cùng seed và input cho JSONL giống nhau. Mục tiêu CLI ≤ 30 s cho 21.600 tick và bản đồ 3D ≥ 30 FPS trung bình ở 1280×720. |

## Giả định triển khai

- Tên Đêm 2 và 3 cùng lời Ông Đăng là nội dung tự đặt. Gió Lạc và đom đóm thả từ Gió Lạc dùng cùng TTL với các đom đóm rơi khác.
- Dùng `x = r cos(θ)`, `z = r sin(θ)` cho các điểm mặt bằng để hai dốc và các điểm sinh tầng 1 nằm ở nửa `z > 0`.
- Snapshot tick 0 đứng trước sự kiện `night_start` cùng tick. Sự kiện hành động dùng số tick ngoài, thời lượng cơ chế dùng sim_tick.
- Lướt trên không giữ cả cao độ và vận tốc Y đến hết lượt lướt, sau đó tiếp tục chuyển động dọc. Sau khi kết thúc một lượt lướt giữa chuyến bay từ bục, vận tốc phóng ngang được tiếp tục.
- Bóng Mực do scenario chỉ định bắt đầu ở trạng thái được truyền vào. Nếu bỏ qua trường trạng thái, thực thể bắt đầu đuổi khi Mây nằm trong vùng phát hiện, còn lại bắt đầu lượn.

## Màu vật liệu

| Thành phần | Mã màu chuẩn |
|---|---|
| Trời và sương | `#0E1430`, `#1B2350` |
| Cỏ, cát, gỗ, biển mây | `#2F5D50`, `#C9B48A`, `#6B4A2F`, `#12384A` |
| Đèn sáng, lõi và đèn tắt | `#FFB347`, `#FFE9B0`, `#5B5F6E` |
| Lõi và quầng đom đóm | `#FFF6C2`, `#FFE58A` |
| Thân, viền và trạng thái choáng của Bóng Mực | `#120A1A`, `#7A3CFF`, `#3A3450` |
| Áo Mây, khăn Mây và Bùa Gió | `#E8E2D0`, `#C8102E` |
| Viền vàng, điểm số và Gió Lạc | `#F2C14E`, `#8FA3B8` |
| Cảnh báo và chữ giao diện | `#FF5A5F`, `#F5F1E6` |

[Hướng dẫn chơi](../../README.md) · [Bằng chứng](../proof/phase-2/README.md)

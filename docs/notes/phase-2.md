# Ghi chép Phase 2 · Contract 1.1

## Giả định và quyết định

- Đặt tên, lời dẫn và địa hình ba Đêm theo [đặc tả Phase 2](../phase-2/spec.md). Bản trình duyệt và headless tiếp tục dùng mô phỏng chung 60 tick/giây.
- Khi pause, đồng hồ và `sim_tick` đứng yên. Cảnh headless và HUD dùng chung trạng thái Bùa Gió, Gió Lạc và các thực thể.

## Nghiệm thu và đánh giá

- Bộ kiểm thử tại Phase 2 ghi 23/23 bài đạt. Kịch bản Đêm 3 đi hết 21.600 tick và bằng chứng render được thu ở 1280×720. Các phép đo, cấu hình scenario và hướng dẫn tái hiện nằm trong [bằng chứng Phase 2](../proof/phase-2/README.md).
- Giữ logic thu gom, nạp đèn và tính tất định trong kiểm tra hồi quy. Test mới bao phủ lướt, cầu và bục, rơi/hồi sinh, pause, gió, Bùa Gió và Gió Lạc.
- Nhật ký ước lượng token và cách tiết kiệm nằm trong [retro](../retro.md#tokenchi-phí).

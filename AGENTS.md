# Hướng dẫn làm việc trong repo Đảo Đèn Lồng

- Đọc ticket và Test Contract của phase đang triển khai. [Đặc tả Phase 2](docs/phase-2/spec.md) áp dụng cho ba Đêm và CLI 1.1. Đối chiếu hành vi cũ với [PRD-0](docs/phase-1/prd-0.md) khi chạy hồi quy.
- Ghi giả định, tiêu chí nghiệm thu, quyết định và đánh giá vào `docs/notes/phase-N.md`. Lưu bằng chứng chạy thật trong `docs/proof/phase-N/` kèm cách tái hiện. Ghi rõ mục chưa đạt và lý do.
- Dùng chung logic gameplay cho đường chạy 3D và headless. Giữ đúng giao diện được Test Contract quy định. Khi ticket thay luật, ghi lý do nếu sửa hoặc bỏ kiểm tra cũ.
- Game dùng Node.js 22 trở lên. Chạy bằng `node src/server.mjs`, kiểm tra bằng `node --test`. Tái tạo bằng chứng từ [hướng dẫn Phase 2](docs/proof/phase-2/README.md). Kiểm tra tuning khớp giữa `src/core.mjs` và manifest, tọa độ bản đồ lấy từ `src/nights.mjs`, và cơ chế pause giữ đúng sim_tick.
- Ghi nguồn và giấy phép asset trong `CREDITS.md`. Giữ bí mật trong môi trường local và loại `.env`, key, token khỏi các commit. Giữ lịch sử Git và harness để đối chiếu tại từng tag.

# Hướng dẫn làm việc trong repo Đảo Đèn Lồng

- Áp dụng Contract 1.2 ở Phase 3. Đọc [ADR dầu đèn và bình minh](docs/phase-3/adr-001-lantern-fuel.md) và [changelog](CHANGELOG.md) trước khi thay luật. Đối chiếu các hành vi cũ còn hiệu lực với [đặc tả Phase 2](docs/phase-2/spec.md).
- Ghi giả định, tiêu chí nghiệm thu, quyết định và đánh giá vào `docs/notes/phase-N.md`. Lưu bằng chứng chạy thật trong `docs/proof/phase-N/` kèm cách tái hiện. Ghi rõ mục chưa đạt và lý do.
- Dùng chung logic gameplay cho đường chạy 3D và headless. Giữ đúng giao diện được Test Contract quy định. Khi ticket thay luật, ghi lý do nếu sửa hoặc bỏ kiểm tra cũ.
- Game dùng Node.js 22 trở lên. Chạy bằng `node src/server.mjs`, kiểm tra bằng `node --test`. Tái tạo bằng chứng từ [hướng dẫn Phase 3](docs/proof/phase-3/README.md). Kiểm tra tuning khớp manifest, dầu dùng đơn vị nguyên 1/60, tọa độ bản đồ lấy từ `src/nights.mjs` và pause giữ đúng sim_tick.
- Ghi nguồn và giấy phép asset trong `CREDITS.md`. Giữ bí mật trong môi trường local và loại `.env`, key, token khỏi các commit. Giữ lịch sử Git và harness để đối chiếu tại từng tag.

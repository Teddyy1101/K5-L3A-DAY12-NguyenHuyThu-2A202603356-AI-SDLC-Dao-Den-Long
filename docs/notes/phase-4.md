# Ghi chú Phase 4 · Contract 1.3

## Giả định
- Bench đo trên trình duyệt Chrome/Edge của máy (Canvas 2D). Trang web không tắt được vsync và không đọc được RSS của tiến trình trình duyệt, nên `vsync_off=false`, `peak_mem_mb=null` (ghi trong README).
- Máy tự đo không phải máy chấm; số liệu chỉ để tham khảo.
- Soak: RSS lấy sau `gc()`. Thêm một Đêm khởi động bỏ đi trước khi đo `mem_start_mb` để JIT ổn định; heap kiểm chứng phẳng ~3.7 MB qua 10 Đêm.

## Tiêu chí nghiệm thu
1. `node --test` xanh toàn bộ (Phase 1–3 còn hiệu lực + UI).
2. `bench.json` có đủ trường, `contract_version` 1.3. Ngưỡng: avg_fps ≥ 60, p1_low ≥ 30, load_ms ≤ 10000.
3. `soak.json`: crashes = 0, mem_end ≤ 1.2 × mem_start.
4. Bảng xếp hạng: tên 3–12 ký tự, top 10, bằng điểm ai trước xếp trên, còn sau khi mở lại, xuất bằng `--export-leaderboard`.
5. Trợ năng: đổi phím + trùng + khôi phục + lưu; phụ đề; giảm chuyển động; chữ ≥ 18 px, chữ lớn ×1.25.
6. README, CHANGELOG 4 phase, CREDITS, LICENSE.

## Quyết định
- Test manifest Phase 1 đổi `'1.2'` → `'1.3'` vì Ticket-04 yêu cầu nâng contract; không sửa luật hay tuning.
- Mock DOM của `test/ui.test.mjs` thêm các id mới (bảng xếp hạng, đổi phím, trợ năng); không bỏ kiểm tra nào.
- Tối ưu vẽ không đổi đầu ra hình ảnh: `paintFaces` dùng bộ đệm Float64Array tái sử dụng (số lệnh vẽ đo bằng proxy canvas giữ nguyên), `tintFaces` bỏ spread. Quầng sáng đèn đổi từ 32 lớp alpha 4 sang 16 lớp alpha 8 (tổng độ đậm như cũ).

## Đánh giá
- Hiệu năng: xem [bench.json](../../bench.json) và [bằng chứng](../proof/phase-4/README.md). Trước tối ưu 26.3 fps (p1 4.3), sau tối ưu xem bảng trong bằng chứng.
- Kết quả chạy lại khi làm demo và giới hạn đo được ghi trong [bằng chứng Phase 4](../proof/phase-4/README.md).
- Nhật ký ước lượng token và cách tiết kiệm nằm trong [retro](../retro.md#tokenchi-phí).

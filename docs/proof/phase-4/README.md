# Bằng chứng Phase 4

Tái tạo từ thư mục gốc repo, Node.js 22+:

```sh
node --test
node --expose-gc src/soak.mjs --seed 7 --nights 10 --out soak.json
node src/bench.mjs --seed 42 --duration 30 --out bench.json
node src/server.mjs --export-leaderboard out.json
```

Tệp [bench.json](../../../bench.json) và [soak.json](../../../soak.json) ở gốc repo là kết quả tự chạy (máy dev, Windows 11, Chrome, không phải máy chấm).

## Số đo

| Lần | avg_fps | p1_low_fps | frame_ms_p95 |
|---|---|---|---|
| Trước tối ưu | 26.3 | 4.3 | 67.3 |
| Sau tối ưu `paintFaces`/`tintFaces` | 40.3 | 19.4 | 34.6 |
| Sau giảm lớp quầng sáng (bench.json hiện tại) | 41.3 | 19.9 | 33.8 |

Soak 10 Đêm: crashes 0, RSS bắt đầu/kết thúc ≈ 38 → 39.5 MB (≈ 1.03×, ngưỡng 1.2×). Ba lần chạy liên tiếp đều đạt.

## Chưa đạt / chưa làm (ghi trung thực)
- Ngưỡng avg_fps ≥ 60 chỉ được xác nhận trên máy chấm; trên máy dev số đo là ở bảng trên (chưa đạt 60 fps; JS vẽ còn ~12 ms/khung, phần còn lại là raster Canvas 2D).
- Chưa kiểm chứng --export-leaderboard thủ công ngoài test tự động.
- Chưa tắt được vsync (giới hạn của trình duyệt), `peak_mem_mb = null`.
- Chưa có video demo `docs/demo/demo.mp4`, tag `phase-4` và GitHub Release v1.0.0: cần người dùng quay/đẩy lên GitHub.
- Retro mới là bản nháp, cần điền số token thật.
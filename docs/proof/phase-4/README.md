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

## Bằng chứng bổ sung khi làm demo

- Bản giải nén từ Release `v1.0.0` chạy được trên Node.js 22.17.0 và đạt 47/47 test. Lệnh `node src/server.mjs --export-leaderboard out.json` xuất danh sách rỗng với thư mục dữ liệu mới.
- Demo quay cảnh chơi trên tag `v1.0.0`. Mây gom 10 đom đóm và dùng E để thắp đèn L2. Phần kiểm chứng hiển thị kết quả thật từ suite test, kịch bản bình minh, benchmark và soak. [Video demo MP4](https://github.com/Teddyy1101/K5-L3A-DAY12-NguyenHuyThu-2A202603356-AI-SDLC-Dao-Den-Long/releases/download/v1.0.0/dao-den-long-demo.mp4)
- Lần chạy phục vụ demo đặt biến môi trường `BENCH_HEADLESS=1` và dùng các lệnh ở trên. Benchmark đạt 134,435 FPS trung bình, 36,712 FPS p1 low và tải trong 975 ms. Soak có 0 crash, RSS 40,457 → 43,988 MB (1,09×). [Benchmark demo](demo-bench.json) · [Soak demo](demo-soak.json)

## Giới hạn

- Phép đo ban đầu trong bảng trên chưa đạt ngưỡng 60 FPS trung bình và 30 FPS p1 low. Lần chạy demo dùng Chrome headless. Tốc độ hiển thị trên máy chấm chưa được đo.
- Benchmark vẫn báo `vsync_off=false` và `peak_mem_mb=null` do giới hạn của trình duyệt.

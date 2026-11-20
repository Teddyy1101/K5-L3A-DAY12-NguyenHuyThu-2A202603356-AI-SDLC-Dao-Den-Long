# Bằng chứng Phase 1

Tệp và kết quả dưới đây ghi lại bản Phase 1 dùng Contract 1.0. Từ Phase 2, dùng [hồi quy với Contract 1.1](../phase-2/README.md) và thông số chuẩn mới.

Các lệnh chạy từ thư mục gốc repo. Bản kiểm chứng cục bộ dùng Node.js `24.22.1` trên Windows x64. Trình duyệt của phiên làm việc không mở được trang xem thử. Các bài về giao diện dùng DOM/Canvas giả lập và server được kiểm tra bằng HTTP cục bộ.

| Yêu cầu | Kiểm chứng | Kết quả |
|---|---|---|
| Màn mặc định, gom, nạp, đủ 5 đèn, tính điểm, dừng sớm | `win.inputs.json` với seed `1201` và mặc định của game. | Thắng ở tick 1288 với 1013 điểm. [JSONL](win.jsonl) |
| Tỏa sáng, choáng, đẩy lùi, hết máu | `combat.scenario.json` và `combat.inputs.json`. | Choáng `Snear` ở tick 1. Hết máu ở tick 190 với 20 điểm. [JSONL](combat.jsonl) |
| Tick 0, yaw, nhảy, nạp từng phần, vùng sáng, cooldown, thắng/thua, lỗi input và tất định | `node --test`. | 8 bài kiểm thử logic/CLI đạt. [Mã kiểm thử](../../../test/phase-1.test.mjs) |
| Cảnh Canvas, nhận phím, cập nhật HUD, màn thua và chơi lại | `node --test`. | 2 bài kiểm thử giao diện đạt. [Mã kiểm thử](../../../test/ui.test.mjs) |
| Server tĩnh | Gửi GET cục bộ vào `/`, `/styles.css`, `/src/game.mjs`, `/src/core.mjs`, `/src/render.mjs`. | Cả 5 trả HTTP 200 với MIME tương ứng. |

Kết quả chạy bộ kiểm thử được lưu trong [tests.tap](tests.tap).

```sh
node --test --test-reporter=tap
node src/headless.mjs --seed 1201 --night 1 --inputs docs/proof/phase-1/win.inputs.json --ticks 2000 --snapshot-every 60 --out win.jsonl
node src/headless.mjs --seed 1201 --night 1 --inputs docs/proof/phase-1/win.inputs.json --ticks 2000 --snapshot-every 60 --out win-rerun.jsonl
cmp win.jsonl win-rerun.jsonl
node src/headless.mjs --seed 1201 --night 1 --scenario docs/proof/phase-1/combat.scenario.json --inputs docs/proof/phase-1/combat.inputs.json --ticks 360 --snapshot-every 15 --out combat.jsonl
```

Hai bản chạy thắng có cùng SHA-256 `8f45832e72567209a03b7026e77e80d3a19a1ae68fa19ffd7522144a4bcba4b4` trong môi trường kiểm chứng.

## Bản Contract 1.0 khôi phục

Tag `phase-1` trên GitHub trỏ vào commit Phase 2 (`9ac9e68`, Contract 1.1). Bản mã Phase 1 dùng Contract 1.0 được khôi phục từ cây Git cục bộ `406e1f1bde3a060364597df5c1bf758e0757f5a7`, bỏ tệp debug cục bộ khi đóng gói. Đây là bản bổ sung để tái hiện Phase 1. [Tải gói bản khôi phục](https://github.com/Teddyy1101/K5-L3A-DAY12-NguyenHuyThu-2A202603356-AI-SDLC-Dao-Den-Long/releases/download/v1.0.0/phase-1-recovered.zip)

Giải nén và chạy các lệnh phía trên bằng Node.js 22.17.0. Lần chạy kiểm chứng đạt 10/10 test. Cả `win.jsonl` và `combat.jsonl` khớp SHA-256 với bằng chứng Phase 1 đã lưu.

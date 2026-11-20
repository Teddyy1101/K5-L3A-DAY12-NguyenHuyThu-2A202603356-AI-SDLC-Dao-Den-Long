# Bằng chứng Phase 2

## Chạy lại kiểm thử

```sh
node --test
node src/headless.mjs --night 3 --seed 1201 --ticks 21600 --snapshot-every 10 --scenario docs/proof/phase-2/full-night.scenario.json --out phase-2-full.jsonl
```

Các scenario tự động được tạo trong [kiểm thử Phase 2](../../../test/phase-2.test.mjs). Bộ kiểm thử xác nhận tọa độ bản đồ, cầu, bục, dốc, lướt, Bùa Gió, Gió Lạc, gió mạnh, nạp điểm, rơi và hồi sinh, pause và tính tất định. [Hồi quy Đêm 1](../../../test/phase-1.test.mjs) · [Kiểm thử HUD và menu](../../../test/ui.test.mjs)

Scenario đo toàn Đêm 3 đặt bất tử dài và tắt gió để giữ Mây trong vùng mô phỏng đến tick 21.600. Các thực thể vẫn cập nhật, còn gió mạnh được kiểm tra ở scenario riêng. Kết quả chạy nằm trong [tests.tap](tests.tap) và [performance.txt](performance.txt).

Ở 1280×720, Chrome headless đo được 52,33 FPS khi chạy trang chơi Đêm 1. Đo riêng bộ dựng hình cùng mô phỏng cho cảnh cầu Đêm 2 đạt 32,31 FPS và cảnh dốc Đêm 3 đạt 35,00 FPS. [Ảnh trang chơi Đêm 1](night-1.png)

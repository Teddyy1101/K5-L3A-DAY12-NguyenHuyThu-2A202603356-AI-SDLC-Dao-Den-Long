# Bằng chứng Phase 3

Chạy từ thư mục gốc repo.

```sh
node --test
node src/headless.mjs --night 1 --seed 1201 --ticks 120 --snapshot-every 30 --scenario docs/proof/phase-3/lanterns.scenario.json --inputs docs/proof/phase-3/lanterns.inputs.json --out lanterns.jsonl
```

Scenario ghi lại một đèn cạn và được thắp lại ngay tick 1, một đèn được châm dầu ở tick 26, và một Bóng Mực hút dầu ở tick 60 và 120. Ván thắng ở bình minh với đúng 3 đèn sáng và 549 điểm. Hai lần chạy cùng seed cho JSONL giống từng byte. [JSONL](lanterns.jsonl)

34/34 bài kiểm thử đạt. Các bài hồi quy và Phase 3 kiểm tra pause, dầu nguyên theo tick, chọn đèn và chọn mục tiêu, cộng dồn hút dầu, đẩy Bóng Mực khi khôi phục mức 30, điểm Tỏa Sáng, sức chứa và xử lý đúng tick bình minh. [Kiểm thử Phase 3](../../../test/phase-3.test.mjs) · [TAP](tests.tap)

Chrome headless kiểm tra lựa chọn bảng màu đã được lưu, viền và mắt Bóng Mực màu xanh lam, cảnh báo trắng có ⚠ và hai pha nhấp nháy của thanh dầu. Ảnh scenario cho thấy đèn tắt xẹp và có vết rách ở bên trái. [Ảnh kiểm tra 1280×720](colorblind.png)

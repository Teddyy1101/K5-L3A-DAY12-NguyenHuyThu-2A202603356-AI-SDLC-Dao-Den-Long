# Checklist hoàn thành Phase 1 · Đảo Đèn Lồng

**Trạng thái:** Đã triển khai Phase 1 theo PRD-0 và Test Contract v1.0 được cung cấp. Đã qua 10 bài kiểm thử cục bộ. Còn kiểm chứng chơi trực tiếp, chạy từ bản clone GitHub trên macOS hoặc Linux, và xác nhận tag `phase-1` trên GitHub.

## Yêu cầu và bàn giao

- [x] Lưu [PRD-0](docs/phase-1/prd-0.md) và [Test Contract v1.0](docs/phase-1/test-contract.md) từ đề người dùng cung cấp.
- [x] Dựng Đêm 1 – Đảo Bến, một đảo tròn với 5 Đèn Lồng Lớn. Mây đội nón lá có đèn nhỏ. Cảnh sáng dần khi thắp đèn.
- [x] Triển khai di chuyển, nhảy, camera 3D, gom đom đóm giới hạn sức chứa và nạp từng phần vào đèn.
- [x] Triển khai Bóng Mực đuổi Mây, vùng an toàn quanh đèn sáng, va chạm mất máu, miễn sát thương ngắn và tỏa sáng tốn đom đóm.
- [x] Có thắng khi sáng đủ 5 đèn, thua khi hết máu hoặc tới bình minh, HUD, điểm số và chơi lại.
- [x] Có [game.contract.json](game.contract.json) với tuning khớp gameplay. CLI hỗ trợ seed, scenario, inputs, 60 tick/giây, snapshot JSONL, event, end và mã lỗi 2 cho file đầu vào sai.
- [x] Cập nhật [README](README.md) với cách chạy, điều khiển, điểm số, headless, test và mục sáng tạo. Lưu [AGENTS.md](AGENTS.md), [ghi chép Phase 1](docs/notes/phase-1.md) và [nguồn nội dung](CREDITS.md).

## Kiểm chứng

- [x] Chạy kiểm tra cú pháp cho 6 module và chạy `node --test` với kết quả 10/10. [Log TAP](docs/proof/phase-1/tests.tap)
- [x] Chạy từ trạng thái mặc định với seed `1201`. Thắp đủ 5 đèn, thắng ở tick `1288` với `1013` điểm. Chạy lại cho JSONL giống từng byte. [Đầu ra thắng](docs/proof/phase-1/win.jsonl)
- [x] Chạy scenario tỏa sáng làm choáng một Bóng Mực rồi thua do hết máu ở tick `190`, với `20` điểm. [Đầu ra chiến đấu](docs/proof/phase-1/combat.jsonl)
- [x] Xác nhận server cục bộ trả HTTP 200 cho HTML, CSS và các module giao diện. Kiểm thử tự động đường vào game với phím, HUD, màn hình thua, chơi lại và các lệnh vẽ Canvas.
- [ ] Chơi trực tiếp bằng trình duyệt và chụp bằng chứng nón lá, camera và ánh sáng trên đảo. Công cụ trình duyệt của phiên làm việc hiện không mở được trang xem thử.
- [ ] Clone sạch từ GitHub và lặp lại `build_cmd`, `run_cmd` và lệnh headless trên macOS hoặc Linux. Kiểm tra cục bộ được thực hiện trên Windows.

## Git và nộp bài

- [x] Xác nhận tên và địa chỉ `origin` theo quy ước lớp.
- [ ] Xác nhận repo ở chế độ public và tag `phase-1` đã có trên GitHub trước mốc 1h của buổi lab.

[Kế hoạch triển khai](implementation_plan.md) · [Hướng dẫn nộp bài](SUBMISSION.md) · [Bằng chứng và cách tái hiện](docs/proof/phase-1/README.md)

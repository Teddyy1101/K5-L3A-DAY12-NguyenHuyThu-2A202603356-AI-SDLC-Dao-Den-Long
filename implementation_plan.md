# Kế hoạch triển khai lab Đảo Đèn Lồng

Xây dựng game 3D góc nhìn thứ ba cho bài lab cá nhân Day 12. Người chơi điều khiển Mây gom đom đóm, thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen. Sản phẩm phải chạy được trên macOS hoặc Linux và có chế độ headless theo Test Contract để chấm tự động. [README.md](README.md)

Phase 1 dùng [PRD-0](docs/phase-1/prd-0.md) và [Test Contract v1.0](docs/phase-1/test-contract.md) do người dùng cung cấp. Lấy Ticket-02, Ticket-03, Ticket-04 và Test Contract tương ứng từ tab của từng phase khi được phát hành. Các bước và phân bổ phút dưới đây là đề xuất. [Lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW) · [GUIDE.md](GUIDE.md)

## Lịch 4 giờ

| Mốc từ lúc bắt đầu | Việc chính | Bàn giao trên GitHub |
|---|---|---|
| 0h–1h | Chuẩn bị môi trường, đọc PRD-0, làm màn đầu và headless. | Push `phase-1` trước 1h. |
| 1h–2h | Thực hiện Ticket-02 và kiểm tra hồi quy Phase 1. | Push `phase-2` trước 2h. |
| 2h–2h30 | Thực hiện Ticket-03, cập nhật luật và kiểm tra bị ảnh hưởng. | Push `phase-3` trước 2h30. |
| 2h30–4h | Thực hiện Ticket-04, đo đạc, kiểm tra bản sạch và phát hành. | Push `phase-4`, xuất bản Release `v1.0.0` kèm bản chạy và công khai video trước 4h. |

Khi gần hết giờ mỗi phase, dừng thêm tính năng, ghi phần chưa đạt kèm lý do, commit và push tag trỏ đúng commit trước hạn. Xác nhận tag xuất hiện trên GitHub rồi chuyển phase. [CHECKPOINTS.md](CHECKPOINTS.md) · [SUBMISSION.md](SUBMISSION.md)

## Vòng làm việc áp dụng cho mỗi phase

1. **Đọc tài liệu phase.** Liệt kê yêu cầu bắt buộc và phần còn mơ hồ. Với Test Contract, chép đúng tên lệnh, quy cách dữ liệu đầu vào và đầu ra, tệp khai báo và những giá trị phải khai báo. Ghi rõ luật hoặc tiêu chí của phase trước bị ticket thay thế nếu có.
2. **Chốt tiêu chí nghiệm thu trước khi code.** Mỗi yêu cầu chính có điều kiện đầu vào, hành động, kết quả mong đợi và cách kiểm chứng. Ghi các giả định và giá trị tự chọn mà ticket để mở. Duyệt kế hoạch cùng agent trước khi giao việc.
3. **Triển khai từng thay đổi nhỏ.** Giao cho agent một tiêu chí hoặc nhóm liên quan mỗi lượt. Đọc diff, chạy kiểm tra liên quan và commit với thông điệp rõ. Giữ luật gameplay và trạng thái dùng chung cho bản 3D và chế độ headless.
4. **Kiểm chứng.** Chạy test đơn vị, scenario headless theo contract và các bài hồi quy còn hiệu lực. Chơi thử để kiểm tra camera, điều khiển, HUD và phản hồi mà headless không thể thể hiện. Tự review diff và kết quả, hoặc nhờ reviewer khác người viết.
5. **Lưu bằng chứng và đánh giá.** Ghi các yêu cầu đạt hoặc chưa đạt, lỗi hồi quy, lỗi AI đã gặp và thay đổi harness. Ghi token hoặc chi phí ước tính cùng cách tiết kiệm. Commit ghi chép và bằng chứng để có thể tái hiện từ tag của phase.
6. **Chốt phase.** Khi commit sẵn sàng, push nhánh và gắn tag theo mốc. Dùng `git tag phase-1`, `git push origin phase-1` cho Phase 1 và đổi số tương ứng ở các phase tiếp theo. Kiểm tra trên GitHub.

[GUIDE.md](GUIDE.md) · [RUBRIC.md](RUBRIC.md) · [SUBMISSION.md](SUBMISSION.md)

## Các bước triển khai theo phase

### Phase 1 · PRD-0 và màn đầu tiên · 60 phút

1. **10 phút chuẩn bị.** Xác nhận remote của repo cá nhân và tên theo mẫu `K5-<L3A hoặc L3B>-DAY12-<HoVaTen>-<MSSV>-AI-SDLC-Dao-Den-Long`. Đăng nhập Claude để mở Phase 1 trên lab board, kiểm tra mốc của Coach, thử chương trình 3D hoặc headless nhỏ và tạo chỗ lưu ghi chép. Khi chọn engine, ưu tiên khả năng gọi đúng lệnh headless và chạy được trên macOS hoặc Linux. Thử lại chương trình mẫu từ bản clone riêng nếu đã có remote.
2. **13 phút phân tích và lập kế hoạch.** Đọc PRD-0 và Test Contract. Ghi các bàn giao bắt buộc, giá trị tự chọn, tiêu chí nghiệm thu và scenario tối thiểu. Phác luồng dùng chung: input → cập nhật trạng thái game → engine hiển thị 3D hoặc CLI xuất kết quả headless.
3. **22 phút xây dựng.** Dựng một scenario chạy xuyên luồng qua CLI để xác nhận cách đọc input và xuất output. Hoàn thành luật gameplay theo PRD-0 trên trạng thái dùng chung và nối vào màn 3D chơi được. Thêm tệp khai báo đúng contract và README có cách cài, chạy, điều khiển, test và headless.
4. **10 phút kiểm chứng.** Kiểm tra vài scenario nhỏ có kết quả mong đợi cụ thể. Với tiêu chí tất định, chạy hai lần bằng cùng đầu vào và so sánh đầu ra theo contract. Chơi hết vòng chơi chính của màn đầu, rồi kiểm tra hướng dẫn chạy từ một bản clone sạch.
5. **5 phút chốt.** Lưu đầu vào, output thực và kết quả chơi thử. Ghi phần chưa đạt nếu có, commit và push `phase-1` trước 1h.

### Phase 2 · Ticket-02 và hồi quy · 60 phút

1. **12 phút phân tích và lập kế hoạch.** Đối chiếu ticket và Test Contract với giả định Phase 1. Ghi yêu cầu mới, yêu cầu được làm rõ và các tiêu chí cần kiểm tra lại. Viết scenario cho hành vi mới trước khi triển khai.
2. **28 phút xây dựng.** Mở rộng logic dùng chung, phần hiển thị và giao diện headless theo ticket. Cập nhật tệp khai báo và README nếu cách chạy thay đổi.
3. **15 phút kiểm chứng.** Chạy scenario mới, toàn bộ kiểm tra Phase 1 còn hiệu lực và chơi thử luồng vừa mở rộng. Sửa hoặc bỏ các test bị ticket thay thế kèm lý do trong ghi chép. Rà lại harness nếu agent lặp lỗi.
4. **5 phút chốt.** Lưu bằng chứng phần mới và kết quả hồi quy, commit và push `phase-2` trước 2h.

### Phase 3 · Ticket-03 và thay đổi luật · 30 phút

1. **6 phút xác định tác động.** Đọc ticket, liệt kê các giả định, luật, scenario, tệp khai báo và hướng dẫn bị ảnh hưởng. Ghi ngắn quyết định thiết kế và lý do.
2. **13 phút triển khai.** Sửa luật trong logic dùng chung, cập nhật đầu ra theo contract và phần hiển thị nếu bị ảnh hưởng. Cập nhật hoặc bỏ từng test theo luật mới, ghi lý do cụ thể.
3. **8 phút kiểm chứng.** Chạy scenario chứng minh hành vi mới và tất cả kiểm tra còn hiệu lực từ Phase 1–2. Lưu output và chơi thử phần thay đổi nếu có biểu hiện trên giao diện.
4. **3 phút chốt.** Ghi kết quả, commit và push `phase-3` trước 2h30.

### Phase 4 · Ticket-04, đóng gói và phát hành · 90 phút

1. **8 phút phân tích.** Trích các yêu cầu mới, lệnh đo, tải thử, chỉ tiêu và ngưỡng trong ticket. Chuẩn bị bảng đối chiếu số đo thực tế với ngưỡng.
2. **27 phút triển khai.** Hoàn thành phần bắt buộc. Chuẩn bị bản chạy phù hợp với công nghệ đã chọn, như file thực thi, thư mục web tĩnh hoặc Docker kèm hướng dẫn. Rà soát dependency và asset để bản sạch chạy được.
3. **20 phút kiểm chứng và đo.** Chạy bộ test của các phase còn hiệu lực, kịch bản headless và luồng chơi chính. Đo theo lệnh và điều kiện của ticket, lưu output gốc, cấu hình máy và kết quả so với ngưỡng. Kiểm tra bản đóng gói và chạy từ bản clone sạch trên macOS hoặc Linux theo README trong tối đa 3 lệnh.
4. **20 phút hoàn thiện bàn giao.** Hoàn tất README, `CREDITS.md`, `LICENSE`, ghi chép và retro. Quay bản build dự kiến phát hành, gồm chơi trực tiếp, chạy kiểm tra, kết quả đo nếu ticket yêu cầu và phần lướt nhanh qua harness/lịch sử Git. Xuất `.mp4` dưới 5 phút. Đặt link video ở đầu README trước khi chốt commit. Nếu đính kèm Release, dùng đường dẫn của asset đã định tên. Nếu lưu vào `docs/demo/demo.mp4`, commit file dưới 100 MB.
5. **15 phút phát hành.** Rà soát theo danh sách bàn giao bên dưới, commit bản cuối và push `phase-4`. Tạo Release `v1.0.0` trỏ đến cùng commit với `phase-4`, đính kèm bản chạy và video nếu chọn lưu tại Release. Mở repo, Release và video khi chưa đăng nhập. Xác nhận mọi thứ đã công khai trước 4h.

## Ghi chép, kiểm chứng và harness

- Dùng `docs/notes/phase-N.md` cho tiêu chí nghiệm thu, giả định, quyết định thiết kế, nhật ký AI và đánh giá từng phase. Mỗi lỗi AI đáng kể ghi cách phát hiện và biện pháp sửa. Với công cụ không có file cấu hình lưu trong repo, ghi lại lời nhắc chính. Tổng hợp bài học, số liệu token hoặc chi phí và điều sẽ làm khác vào `docs/notes/retro.md`.
- Dùng `docs/proof/phase-N/` cho bảng truy vết và bằng chứng chạy thật. Bảng có thể dùng mẫu `Yêu cầu | Tiêu chí nghiệm thu | Lệnh hoặc cách tái hiện | Bằng chứng | Kết quả`. Đính kèm input, output gốc, số đo hoặc ảnh/clip tùy tiêu chí. Ghi `chưa đạt` và lý do nếu còn lỗi.
- Viết `AGENTS.md` ngắn với lệnh chạy game, build, test, headless và quy ước lưu bằng chứng. Chọn thêm một thành phần harness hữu ích, chẳng hạn hook chạy lệnh kiểm chứng và báo lỗi khi test đỏ. Dùng một lệnh chạy bộ test đơn vị và scenario headless, rồi gọi lại lệnh đó từ CI hoặc cơ chế tự động tương đương. Giữ các file harness đã dùng trong repo và lịch sử Git.
- Ưu tiên Test Contract, gameplay bắt buộc và bằng chứng khi thiếu thời gian. Nếu có phần sáng tạo, kiểm tra đầu ra headless vẫn đúng contract và ghi mục **Sáng tạo của tôi** trong README kèm bằng chứng ngắn.

[GUIDE.md](GUIDE.md) · [RULES.md](RULES.md) · [RUBRIC.md](RUBRIC.md)

## Danh sách kiểm tra trước khi nộp

- [ ] Repo cá nhân public, đúng tên, clone được. Có đủ mã nguồn, bốn tag đúng commit và Release `v1.0.0` có bản chạy được.
- [ ] Đầu README có link video. README có mô tả game, tối đa 3 lệnh cài và chạy, điều khiển, cách chạy test và headless. Có tệp khai báo đúng Test Contract của từng tag.
- [ ] Mỗi phase có giả định, bằng chứng tái hiện được tại tag, kết quả hồi quy, nhật ký AI cùng token hoặc chi phí ước tính. Có retro và lịch sử harness.
- [ ] Video `.mp4` dưới 5 phút, mở được khi chưa đăng nhập. Video có phần chơi thử và bằng chứng kiểm chứng.
- [ ] Có `LICENSE` và `CREDITS.md` ghi nguồn, giấy phép của asset và âm thanh, cùng công cụ AI tạo nội dung nếu dùng. Dùng tài sản tự tạo, do AI tạo hoặc có giấy phép phù hợp như CC0, CC-BY hay MIT.
- [ ] Repo và lịch sử Git không chứa `.env`, API key hay token. Giữ nguyên lịch sử đã gắn tag.
- [ ] Sau mốc 4h chỉ gửi link repo lên LMS theo hướng dẫn của Coach. Hạn mặc định là 23h59 cùng ngày cho ca sáng, 11h59 ngày hôm sau cho ca chiều (ICT, GMT+7).

[SUBMISSION.md](SUBMISSION.md) · [RULES.md](RULES.md) · [RUBRIC.md](RUBRIC.md)

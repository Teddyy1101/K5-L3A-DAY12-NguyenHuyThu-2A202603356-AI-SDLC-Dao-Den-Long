# Retro · Đảo Đèn Lồng (Nguyễn Huy Thu, 2A202603356)

## Evaluation 4 phase
- Phase 1: game chạy được, headless tất định, test hợp đồng. Bài học: viết Test Contract trước, JSONL tất định giúp phát hiện hồi quy.
- Phase 2: thêm 3 Đêm, đảo, Bùa Gió, Gió Lạc. Rủi ro lớn nhất là logic render và logic gameplay lệch nhau.
- Phase 3: dầu đèn, bình minh, đổi luật. Cần ghi ADR và giữ test cũ khi luật đổi.
- Phase 4: bench, soak, bảng xếp hạng, trợ năng, đóng gói. Hiệu năng là rủi ro lớn nhất vì chỉ đo được trên máy thật.

## Hiệu quả và không hiệu quả với AI
- Hiệu quả: giao việc có số đo cụ thể (bench/soak), AI dựng nhanh khung; profile bằng `--cpu-prof` chỉ ra đúng điểm nóng (`paintFaces`, GC).
- Không hiệu quả: để AI tự khẳng định "đã tối ưu" mà không đo.

## AI sai và cách phát hiện
- Mock DOM của test UI không cập nhật khi thêm màn hình mới: `node --test` báo `addEventListener` của `undefined`.
- Test manifest còn kỳ vọng contract 1.2 sau khi nâng 1.3.
- Soak ban đầu ra RSS tăng 1.33× do đo lúc JIT còn lạnh; heap phẳng nên không phải rò rỉ, xử lý bằng Đêm khởi động.
- Bench ban đầu lỗi `WebSocket is not defined` vì chạy Node 20 trong khi yêu cầu Node 22.

## Harness giúp nhiều nhất
`AGENTS.md` (quy tắc đơn vị dầu, tọa độ từ `src/nights.mjs`, ghi proof) và `node --test` làm cổng kiểm tra trước mỗi commit.

## Token/chi phí

| Phase | Ước lượng | Cách tiết kiệm |
|---|---|---|
| 1 | Khoảng 20.000–30.000 token nội dung đọc và sinh mới, theo ghi chép lúc triển khai | Tái sử dụng khung 3D và dùng chung logic gameplay cho bản chơi và CLI. |
| 2 | Khoảng 14.000–24.000 token văn bản thêm trong diff, từ 72.407 ký tự | Giữ cùng mô phỏng và chạy các kịch bản hồi quy từ Phase 1. |
| 3 | Khoảng 9.500–16.000 token văn bản thêm trong diff, từ 47.782 ký tự | Tập trung vào luật đổi trong ADR và giữ các kiểm tra hành vi cũ còn hiệu lực. |
| 4 | Khoảng 18.000–30.000 token văn bản thêm trong diff, từ 89.334 ký tự | Dùng CPU profile để tìm điểm nóng và chạy test, bench, soak cục bộ. |

Các ước lượng Phase 2–4 dùng khoảng 3–5 ký tự/token cho dòng thêm trong mã, test và tài liệu chính. Phase 2 lấy bản Contract 1.0 khôi phục làm mốc. Phase 3 và 4 dùng cặp tag liền kề. Các số này đo phần văn bản còn thấy trong Git. Phiên lab chưa có thống kê tổng token của công cụ hoặc chi phí thực trả.

## Nếu làm lại
Đặt bench sớm từ Phase 2 để hiệu năng không dồn tới cuối; dùng sprite/offscreen cho quầng sáng từ đầu; lưu số token theo phase.

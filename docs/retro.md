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
Chưa thống kê được; cần điền từ bảng usage của công cụ AI. Cách tiết kiệm: đọc đúng file, dùng profile thay vì đoán, chạy test cục bộ thay vì nhờ AI chạy lại.

## Nếu làm lại
Đặt bench sớm từ Phase 2 để hiệu năng không dồn tới cuối; dùng sprite/offscreen cho quầng sáng từ đầu; lưu số token theo phase.
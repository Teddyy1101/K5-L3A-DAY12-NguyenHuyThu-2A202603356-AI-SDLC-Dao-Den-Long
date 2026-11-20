# Ghi chép Phase 3 · Contract 1.2

## Giả định và quyết định

- Lưu dầu bằng đơn vị nguyên 1/60, xuất một chữ số thập phân. Tính hao dầu và dầu Bóng Mực hút trước thao tác nạp. Kiểm tra ngưỡng vùng an toàn bằng dầu nguyên.
- Đổi điều kiện thắng sang sống đến bình minh và giữ đủ 60% số đèn, làm tròn lên. Các quyết định về thứ tự sự kiện, ngưỡng và bài kiểm thử đổi theo luật mới nằm trong [ADR 001](../phase-3/adr-001-lantern-fuel.md).

## Nghiệm thu và đánh giá

- Đạt 34/34 bài kiểm thử tại Phase 3. Kịch bản mẫu thắng ở bình minh với 3 đèn sáng và 549 điểm. Hai lần chạy cùng seed cho cùng JSONL.
- Kiểm tra lại pause, tọa độ các Đêm và các cơ chế di chuyển. Bảng màu dễ phân biệt được kiểm tra bằng Chrome headless. [Bằng chứng Phase 3](../proof/phase-3/README.md)
- Nhật ký ước lượng token và cách tiết kiệm nằm trong [retro](../retro.md#tokenchi-phí).

# PRD-0 · Đảo Đèn Lồng

Nội dung từ đề Phase 1 do người dùng cung cấp. Xem [Test Contract v1.0](test-contract.md).

## Chúng tôi muốn gì
Chúng tôi muốn một game 3D tên là Đảo Đèn Lồng.

Người chơi điều khiển Mây, người giữ đèn nhỏ tuổi của một hòn đảo giữa biển mây. Đêm nay sương đen đã nuốt hết ánh sáng của đảo. Mây phải chạy khắp đảo thu thập những đốm sáng (đom đóm) rồi mang về thắp lại các Đèn Lồng Lớn.

Trong bóng tối có Bóng Mực, những sinh vật bằng mực đen sống trong sương. Chúng đuổi theo Mây; bị chúng chạm vào thì mất máu. Mây có thể tỏa sáng để xua chúng đi, nhưng việc đó tốn ánh sáng. Bóng Mực sợ những chiếc đèn.

Thắp hết đèn thì thắng. Mất hết máu thì thua. Có điểm số.

## Phạm vi Phase 1
Một màn chơi: Đêm 1 – Đảo Bến, một hòn đảo tròn có 5 Đèn Lồng Lớn.
Nhân vật đi lại, nhảy, camera 3D.
Đom đóm xuất hiện rải rác trên đảo, nhặt được.
Nạp ánh sáng vào đèn để thắp đèn.
Bóng Mực xuất hiện và đuổi người chơi.
Tỏa sáng để xua Bóng Mực.
Thắng, thua, điểm số, giao diện hiển thị thông tin cần thiết (HUD).
Có thể chơi lại sau khi thắng hoặc thua.
## Cảm giác & phong cách
Không khí đêm, ấm áp, cổ tích
Đảo sáng dần lên khi thắp đèn
Ánh sáng vàng cam ấm là thứ tốt
Màu tím đen là nguy hiểm
Phong cách đồ họa đơn giản nhưng đẹp. Không cần đồ họa chân thực.
Mây đội nón lá có treo một chiếc đèn lồng nhỏ.
Không bạo lực, không máu me.
### Tự do sáng tạo (khuyến khích)
PRD-0 chỉ là khung. Ngoài những gì đã nêu, bạn được tự do sáng tạo thêm: nhân vật mới, kẻ địch mới (ngoài Bóng Mực), nhân vật phụ, loại Bóng Mực hay đom đóm khác nhau, cơ chế nhỏ, sự kiện bất ngờ, câu chuyện, hiệu ứng, âm thanh, cách thể hiện ánh sáng, chi tiết trên đảo. Hãy làm cho game mang dấu ấn của bạn.

Không phá những gì PRD-0 và Test Contract đã yêu cầu. Phần thêm không được làm đổi đầu ra headless theo contract (ví dụ thực thể thêm nên tắt khi chạy headless).
Nói rõ trong README (một mục ngắn "Sáng tạo của tôi") bạn đã thêm gì, và có bằng chứng ngắn rằng phần cũ vẫn đúng.
Làm lõi đúng trước, sáng tạo sau, và cân nhắc token: một ý sáng tạo nhỏ, gọn, chạy đúng hơn nhiều ý dở dang.
## Không bắt buộc công nghệ
Bạn được tự chọn engine, ngôn ngữ và framework. Game phải chạy được trên laptop (macOS hoặc Linux; nếu bạn dùng Windows thì phải có cách chạy trên macOS/Linux cho giảng viên, ví dụ Docker hoặc bản web).

## Bàn giao Phase 1
Nộp bằng tag git phase-1 trên repo public.

Game chơi được Đêm 1 từ đầu tới thắng/thua.
README.md: cách cài đặt và chạy (tối đa 3 lệnh), điều khiển, cách tính điểm của bạn.
game.contract.json và chế độ headless theo Test Contract v1.0 dưới đây.
Bằng chứng game chạy đúng yêu cầu, cùng ghi chép ngắn (giả định, nhật ký dùng AI). Định dạng tự chọn.
Harness AI bạn đã dùng (AGENTS.md hoặc tương đương, skills, hooks…).
## Lưu ý
Game tốt là game đúng yêu cầu của khách hàng, không phải game phức tạp hay đẹp nhất.
Cân nhắc kỹ quota token. Đốt nhiều token không làm bài tốt hơn.
Không có bằng chứng thì chưa xong. "Agent bảo chạy rồi" không phải bằng chứng.
Chỗ PRD-0 còn mơ hồ: tự giả định hợp lý và ghi lại.
Sáng tạo thêm được khuyến khích, nhưng không được làm hỏng phần lõi và Test Contract.

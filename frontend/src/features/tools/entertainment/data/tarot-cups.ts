import { tarotMeanings } from '../utils/meaning'

export const TAROT_CUPS = tarotMeanings({
  CUPS_ACE: [
    ['Tình cảm mới · Cởi lòng · Niềm vui', 'Át Cốc nói về tình cảm mới hoặc cảm xúc được khơi dậy. Đó có thể là bắt đầu yêu, làm lành, gặp người khiến bạn thấy được quan tâm hoặc tìm lại niềm vui trong một việc sáng tạo.', 'Đón nhận tình cảm và nói thật điều bạn cảm thấy.', ['connection', 'change']],
    ['Kìm nén cảm xúc · Hụt hẫng · Khó mở lòng', 'Át Cốc ngược nói về cảm xúc bị giữ lại hoặc kỳ vọng tình cảm chưa được đáp lại. Bạn có thể muốn gần gũi nhưng sợ tổn thương, hoặc đang cho đi khi chính mình đã mệt.', 'Nhận ra điều mình đang buồn hoặc thiếu trước khi cố chăm lo cho người khác.', ['rest', 'connection']],
  ],
  CUPS_2: [
    ['Đồng cảm · Tình cảm hai phía · Hợp tác', '2 Cốc nói về sự hòa hợp và tình cảm được đáp lại giữa hai người. Trong tình yêu, hai bên có sự quan tâm; trong công việc, đó là hợp tác dựa trên tôn trọng và trao đổi công bằng.', 'Nói rõ mong muốn của mình và hỏi người kia đang mong điều gì.', ['connection', 'balance']],
    ['Lệch mong muốn · Xa cách · Bất hòa', '2 Cốc ngược nói về hai người chưa hiểu nhau hoặc mong muốn khác nhau. Một bên có thể cố gắng nhiều hơn, cuộc trao đổi thiếu thẳng thắn hoặc mối quan hệ đang mất sự cân bằng.', 'Trao đổi về điều hai bên chưa đồng ý thay vì đoán ý nhau.', ['clarity', 'connection']],
  ],
  CUPS_3: [
    ['Bạn bè · Sum họp · Ăn mừng', '3 Cốc nói về niềm vui khi gặp gỡ bạn bè và những người ủng hộ bạn. Lá này thường gắn với tiệc mừng, hội ngộ hoặc cảm giác được chia sẻ sau một kết quả tốt.', 'Gặp những người khiến bạn thấy thoải mái và chia sẻ niềm vui với họ.', ['connection', 'rest']],
    ['Lạc lõng · Chuyện nhóm · Vui quá đà', '3 Cốc ngược nói về việc khó hòa vào nhóm, có lời bàn tán hoặc vui chơi quá mức. Trong tình cảm, cần xem các mối quan hệ bên ngoài có đang gây bất đồng; riêng lá này không đủ để kết luận có người thứ ba.', 'Hỏi rõ chuyện đã xảy ra và giảm những cuộc vui làm ảnh hưởng việc chính.', ['balance', 'connection']],
  ],
  CUPS_4: [
    ['Chán nản · Khép lòng · Bỏ lỡ cơ hội', '4 Cốc nói về cảm giác chán hoặc không còn hứng thú với điều đang có. Bạn có thể mải nghĩ chuyện thất vọng nên không nhận ra lời mời, sự quan tâm hay cơ hội ngay trước mình.', 'Xem xét một lời đề nghị cụ thể trước khi từ chối theo thói quen.', ['rest', 'clarity']],
    ['Quan tâm trở lại · Cơ hội mới · Bớt thờ ơ', '4 Cốc ngược nói về việc bắt đầu quan tâm trở lại sau thời gian chán nản. Bạn có thể nhận ra một cơ hội từng bỏ qua, muốn gặp người khác hoặc sẵn sàng thử cách làm mới.', 'Chọn một lời mời hoặc một việc nhỏ mà bạn muốn thử lại.', ['change', 'connection']],
  ],
  CUPS_5: [
    ['Mất mát · Tiếc nuối · Thất vọng', '5 Cốc nói về nỗi buồn vì điều không diễn ra như mong muốn. Bạn có thể tiếc một mối quan hệ, một cơ hội hoặc một sai lầm, trong khi những người và khả năng còn lại bị bỏ quên.', 'Cho mình thời gian buồn rồi nhìn lại điều vẫn còn để tiếp tục.', ['rest', 'resources']],
    ['Chấp nhận · Tha thứ · Hồi phục', '5 Cốc ngược nói về việc dần chấp nhận mất mát và bớt mắc kẹt trong tiếc nuối. Làm lành hoặc bắt đầu lại có thể được cân nhắc, nhưng cần thấy rõ vấn đề cũ đã thay đổi thế nào.', 'Giữ bài học từ chuyện cũ và chọn một việc giúp bạn trở lại sinh hoạt bình thường.', ['change', 'rest']],
  ],
  CUPS_6: [
    ['Kỷ niệm · Người cũ · Sự tử tế', '6 Cốc nói về ký ức, tuổi thơ và sự quan tâm giản dị. Lá này có thể gắn với gặp lại người quen hoặc nhớ một mối quan hệ cũ; nhớ nhau không có nghĩa chắc chắn sẽ quay lại.', 'Trân trọng kỷ niệm nhưng đánh giá người và việc bằng hoàn cảnh hiện tại.', ['connection', 'learning']],
    ['Mắc kẹt quá khứ · Lớn lên · Bớt lý tưởng hóa', '6 Cốc ngược nói về việc cần rời cách nghĩ cũ để sống ở hiện tại. Bạn có thể nhớ quá khứ đẹp hơn thực tế, so sánh người mới với người cũ hoặc đang dần học cách tự lập.', 'Phân biệt điều bạn nhớ với điều thực sự đã xảy ra.', ['clarity', 'change']],
  ],
  CUPS_7: [
    ['Nhiều lựa chọn · Mơ tưởng · Khó quyết định', '7 Cốc nói về nhiều lựa chọn nhưng chưa rõ lựa chọn nào thực tế. Bạn có thể thích nhiều kế hoạch, tin vào lời hứa hấp dẫn hoặc mơ về kết quả mà chưa xét cách đạt được.', 'Kiểm tra thông tin và loại những lựa chọn không đáp ứng điều kiện cơ bản.', ['clarity', 'learning']],
    ['Chọn rõ hơn · Bớt mơ tưởng · Quyết định', '7 Cốc ngược nói về việc bớt phân vân và nhận ra điều mình thật sự muốn. Một khả năng khác là bạn đang thu hẹp lựa chọn quá nhanh chỉ để khỏi phải nghĩ tiếp.', 'Chọn dựa trên điều bạn cần và bằng chứng hiện có.', ['clarity', 'action']],
  ],
  CUPS_8: [
    ['Rời đi · Không còn thỏa mãn · Tìm điều khác', '8 Cốc nói về việc rời một điều từng quan trọng vì nó không còn đáp ứng nhu cầu của bạn. Đó có thể là công việc, mối quan hệ hoặc mục tiêu đã theo lâu nhưng giờ thấy không còn ý nghĩa.', 'Nêu rõ lý do muốn rời đi và chuẩn bị cách chuyển sang bước tiếp theo.', ['change', 'clarity']],
    ['Khó rời bỏ · Sợ mất · Chưa quyết định', '8 Cốc ngược nói về việc biết mình không hài lòng nhưng vẫn khó rời đi. Bạn có thể ở lại vì quen, sợ bắt đầu lại hoặc cần thêm thời gian để hiểu liệu chuyện đó còn sửa được không.', 'Xác định điều phải thay đổi nếu bạn chọn ở lại.', ['clarity', 'balance']],
  ],
  CUPS_9: [
    ['Mãn nguyện · Điều ước · Hưởng thành quả', '9 Cốc nói về niềm vui và sự hài lòng khi đạt điều mình mong muốn. Lá này thường được xem là lá của điều ước: tình cảm thuận lợi hoặc kết quả tốt đang đem lại cảm giác đủ đầy.', 'Tận hưởng kết quả và xem điều đó có đáp ứng nhu cầu lâu dài của bạn không.', ['rest', 'balance']],
    ['Chưa thỏa mãn · Mong quá nhiều · Vui bề ngoài', '9 Cốc ngược nói về việc có được thứ mình muốn nhưng vẫn thấy thiếu. Bạn có thể quá kỳ vọng vào một kết quả, tìm niềm vui bằng mua sắm hoặc giữ vẻ hài lòng trong khi bên trong không vui.', 'Gọi tên điều bạn thực sự đang thiếu thay vì tìm thêm một phần thưởng khác.', ['clarity', 'balance']],
  ],
  CUPS_10: [
    ['Gia đình hòa thuận · Gắn bó · Hạnh phúc chung', '10 Cốc nói về hạnh phúc trong gia đình hoặc một mối quan hệ có sự gắn bó lâu dài. Điểm chính là mọi người thấy được yêu thương và chia sẻ, thay vì chỉ vui riêng từng người.', 'Dành thời gian cho việc khiến cả nhà hoặc cả hai cùng thấy gần nhau hơn.', ['connection', 'balance']],
    ['Bất hòa gia đình · Kỳ vọng lệch nhau · Vẻ ngoài hạnh phúc', '10 Cốc ngược nói về bất hòa trong gia đình hoặc hai người hình dung khác nhau về tương lai. Mọi chuyện có thể trông ổn với người ngoài nhưng bên trong thiếu trao đổi và thấu hiểu.', 'Nói về mong muốn cụ thể của từng người, đừng mặc định ai cũng muốn giống nhau.', ['connection', 'clarity']],
  ],
  CUPS_PAGE: [
    ['Lời nhắn tình cảm · Nhạy cảm · Sáng tạo', 'Tiểu đồng Cốc nói về cảm xúc mới, lời nhắn dễ thương hoặc một lời xin lỗi. Lá này cũng có thể chỉ người giàu tưởng tượng, nhạy cảm và còn đang học cách nói ra tình cảm.', 'Đáp lại bằng lời rõ ràng và cho cảm xúc mới thời gian phát triển.', ['learning', 'connection']],
    ['Khó nói cảm xúc · Trẻ con · Mơ mộng', 'Tiểu đồng Cốc ngược nói về cách phản ứng cảm tính hoặc khó nói điều mình muốn. Bạn hoặc người liên quan có thể giận dỗi, chờ người kia đoán ý hoặc tưởng tượng quá nhiều từ một lời nhắn.', 'Hỏi trực tiếp ý người kia và nói điều mình cần bằng lời cụ thể.', ['clarity', 'connection']],
  ],
  CUPS_KNIGHT: [
    ['Lãng mạn · Lời mời · Theo cảm xúc', 'Kỵ sĩ Cốc nói về lời mời, lời tỏ tình hoặc một người biết bày tỏ cảm xúc. Trong công việc, đó có thể là đề nghị liên quan sáng tạo; điểm cần xem là cảm xúc có đi cùng việc làm hay không.', 'Đón nhận thiện ý và quan sát cách người đó giữ lời.', ['connection', 'action']],
    ['Hứa nhiều · Thất vọng · Cảm xúc thay đổi', 'Kỵ sĩ Cốc ngược nói về lời nói đẹp nhưng thiếu hành động hoặc cảm xúc đổi nhanh. Bạn có thể lý tưởng hóa một người, dễ thất vọng khi họ không giống hình dung hoặc gặp lời hứa chưa được thực hiện.', 'Chờ hành động rõ ràng trước khi đặt kỳ vọng lớn.', ['clarity', 'balance']],
  ],
  CUPS_QUEEN: [
    ['Thấu cảm · Chăm sóc · Hiểu cảm xúc', 'Hoàng hậu Cốc nói về người biết lắng nghe, quan tâm và nhận ra cảm xúc của người khác. Lá này nhấn mạnh cách cư xử dịu dàng, nhưng vẫn cần phân biệt cảm nhận với điều đã được xác nhận.', 'Lắng nghe kỹ và hỏi người kia cần được giúp như thế nào.', ['connection', 'balance']],
    ['Dễ bị ảnh hưởng · Lo quá nhiều · Quên bản thân', 'Hoàng hậu Cốc ngược nói về việc bị cảm xúc của người khác kéo theo hoặc chăm người đến mức bỏ quên mình. Bạn có thể lo cho một mối quan hệ quá nhiều nên khó đánh giá chuyện đang xảy ra.', 'Nghỉ khỏi việc phải giải quyết cảm xúc của mọi người và nói rõ nhu cầu của mình.', ['rest', 'balance']],
  ],
  CUPS_KING: [
    ['Điềm tĩnh · Hiểu người · Kiểm soát cảm xúc', 'Vua Cốc nói về người hiểu cảm xúc nhưng không để cảm xúc quyết định mọi hành động. Khi có chuyện khó, lá này khuyến khích lắng nghe và xử lý bình tĩnh thay vì nổi nóng hoặc im lặng hoàn toàn.', 'Nói điều mình cảm thấy bằng giọng bình tĩnh và đề nghị cách giải quyết.', ['balance', 'connection']],
    ['Kìm nén · Thao túng cảm xúc · Thiếu ổn định', 'Vua Cốc ngược nói về việc khó giữ cảm xúc ổn định hoặc dùng cảm xúc để khiến người khác làm theo ý mình. Ví dụ, một người im lặng để gây áp lực, giận thất thường hoặc không chịu nói thật.', 'Đánh giá hành vi cụ thể và không nhận trách nhiệm cho mọi cảm xúc của người khác.', ['clarity', 'balance']],
  ],
})

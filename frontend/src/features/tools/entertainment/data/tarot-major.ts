import { tarotMeanings } from '../utils/meaning'

export const TAROT_MAJOR = tarotMeanings({
  MAJOR_00: [
    ['Khởi đầu mới · Tự do · Chưa có kinh nghiệm', 'Kẻ Khờ tượng trưng cho việc bắt đầu một chặng mới với tâm thế háo hức nhưng chưa biết hết điều phía trước. Có thể hiểu qua những việc như thử một nghề mới, bắt đầu một mối quan hệ hoặc đi tới nơi chưa quen.', 'Cứ thử điều mới, nhưng tìm hiểu những việc cơ bản và đừng hứa quá nhiều ngay từ đầu.', ['change', 'learning']],
    ['Vội vàng · Liều lĩnh · Sợ bắt đầu', 'Kẻ Khờ ngược nói về một khởi đầu thiếu chuẩn bị, quyết định bốc đồng hoặc ngần ngại không dám thử. Ví dụ, nghỉ việc ngay khi chưa có kế hoạch tiếp theo, hoặc trì hoãn mãi vì sợ mình làm không tốt.', 'Kiểm tra rủi ro và chuẩn bị bước đầu; đừng quyết chỉ vì đang quá hào hứng hoặc quá sợ.', ['clarity', 'balance']],
  ],
  MAJOR_01: [
    ['Tài năng · Chủ động · Biến ý tưởng thành việc', 'Nhà Ảo Thuật nói về việc sử dụng những kỹ năng đã có để thực hiện một ý tưởng. Trong công việc, lá này nhấn mạnh khả năng tự bắt tay làm thay vì chờ điều kiện hoàn hảo.', 'Chọn một việc cụ thể, dùng kỹ năng hiện có và bắt đầu làm.', ['action', 'resources']],
    ['Hứa nhiều làm ít · Lãng phí tài năng · Mánh khóe', 'Nhà Ảo Thuật ngược nói về tài năng chưa được sử dụng đúng hoặc lời nói hấp dẫn nhưng không có việc làm đi kèm. Trong quan hệ, nó nhắc tới nguy cơ bị dẫn dắt bởi một người rất giỏi thuyết phục.', 'Đánh giá bằng việc đã làm và kết quả thực tế, không chỉ bằng lời hứa.', ['clarity', 'action']],
  ],
  MAJOR_02: [
    ['Trực giác · Bí mật · Chờ hiểu rõ', 'Nữ Tư Tế tượng trưng cho điều chưa được nói ra và khả năng nhận biết qua quan sát. Lá này thường xuất hiện khi câu trả lời còn thiếu thông tin hoặc cần thời gian để hiểu một người.', 'Quan sát thêm, hỏi rõ điều chưa biết và đừng vội công bố kết luận.', ['rest', 'clarity']],
    ['Thông tin bị giấu · Bỏ qua cảm nhận · Khó hiểu mình', 'Nữ Tư Tế ngược nói về việc khó phân biệt cảm nhận của mình với lời người khác, hoặc có thông tin đang bị che giấu. Ví dụ, bạn thấy một lời giải thích chưa hợp lý nhưng vẫn bỏ qua để khỏi phải hỏi.', 'Ghi rõ điểm khiến bạn nghi ngờ và kiểm tra nó bằng câu hỏi cụ thể.', ['clarity', 'balance']],
  ],
  MAJOR_03: [
    ['Chăm sóc · Sáng tạo · Sự phát triển', 'Hoàng Hậu tượng trưng cho sự chăm sóc, sáng tạo và điều kiện giúp một việc phát triển. Trong tình cảm, lá này nói về sự ấm áp; trong công việc, nó nói về một ý tưởng cần được dành thời gian chăm chút.', 'Dành thời gian cho điều đang làm và chăm sóc sức khỏe, sinh hoạt của mình.', ['connection', 'resources']],
    ['Chăm quá mức · Cạn sức · Bí ý tưởng', 'Hoàng Hậu ngược nói về việc chăm lo cho người khác quá nhiều hoặc cảm thấy không còn hứng sáng tạo. Ví dụ, bạn lo hết việc nhà và việc của người thân đến mức không còn thời gian cho mình.', 'Chia lại việc chăm sóc và dành một khoảng thời gian riêng.', ['rest', 'balance']],
  ],
  MAJOR_04: [
    ['Kỷ luật · Người dẫn dắt · Sự ổn định', 'Hoàng Đế tượng trưng cho kỷ luật, trách nhiệm và người có quyền quyết định. Trong công việc, lá này nói về việc cần một kế hoạch rõ, người phụ trách rõ và quy định được giữ nghiêm túc.', 'Làm rõ ai quyết định, ai thực hiện và khi nào công việc phải xong.', ['action', 'clarity']],
    ['Độc đoán · Cứng nhắc · Thiếu kỷ luật', 'Hoàng Đế ngược nói về sự kiểm soát quá mức hoặc thiếu người chịu trách nhiệm. Ví dụ, một người bắt mọi việc theo ý mình, hoặc cả nhóm đều nghĩ người khác sẽ xử lý việc khó.', 'Thống nhất trách nhiệm và những quy định cần thiết, đồng thời nghe ý kiến của người cùng làm.', ['balance', 'clarity']],
  ],
  MAJOR_05: [
    ['Truyền thống · Thầy hướng dẫn · Học bài bản', 'Giáo Hoàng tượng trưng cho việc học từ người có kinh nghiệm, tổ chức hoặc những quy tắc đã có. Trong tình cảm, lá này có thể nói về một mối quan hệ nghiêm túc và coi trọng cam kết.', 'Tìm người hướng dẫn phù hợp và hiểu quy tắc trước khi tự làm theo cách riêng.', ['learning', 'connection']],
    ['Làm khác số đông · Tự chọn niềm tin · Quy tắc không hợp', 'Giáo Hoàng ngược nói về việc đặt câu hỏi với một quy tắc hoặc lựa chọn khác mong đợi của gia đình, tập thể. Ví dụ, bạn muốn chọn một nghề khác thay vì đi theo con đường đã được sắp sẵn.', 'Hiểu lý do của quy tắc rồi quyết định điều nào phù hợp với cuộc sống của mình.', ['learning', 'change']],
  ],
  MAJOR_06: [
    ['Tình yêu · Hòa hợp · Lựa chọn quan trọng', 'Người Yêu nói về tình yêu, sự thu hút và một lựa chọn cần phù hợp với điều bạn coi trọng. Trong quan hệ, lá này nhấn mạnh việc hai người thật lòng muốn ở bên nhau; trong quyết định, nó yêu cầu lựa chọn nhất quán với giá trị của mình.', 'Nói rõ điều bạn muốn và kiểm tra hai bên có cùng mong muốn đó không.', ['connection', 'balance']],
    ['Bất hòa · Khác mong muốn · Chọn trái lòng', 'Người Yêu ngược nói về sự bất hòa hoặc lựa chọn không đúng với điều bạn thực sự muốn. Ví dụ, hai người thích nhau nhưng khác mục tiêu lâu dài, hoặc bạn đồng ý một việc chỉ để chiều người khác.', 'Làm rõ điều hai bên khác nhau trước khi tiếp tục một cam kết lớn.', ['clarity', 'connection']],
  ],
  MAJOR_07: [
    ['Quyết tâm · Tiến lên · Làm chủ tình hình', 'Cỗ Xe tượng trưng cho quyết tâm và khả năng theo đuổi một mục tiêu giữa nhiều khó khăn. Trong công việc, lá này nói về việc giữ hướng đi và làm đều cho tới khi có kết quả.', 'Chọn mục tiêu chính, sắp thứ tự việc cần làm và theo tới cùng.', ['action', 'clarity']],
    ['Mất phương hướng · Nóng vội · Khó kiểm soát', 'Cỗ Xe ngược nói về việc cố tiến nhanh nhưng chưa biết mình đang đi đâu, hoặc cố kiểm soát quá nhiều việc. Ví dụ, cùng lúc theo nhiều kế hoạch rồi không hoàn thành kế hoạch nào.', 'Dừng lại, bỏ bớt mục tiêu phụ và chọn một việc cần làm trước.', ['balance', 'action']],
  ],
  MAJOR_08: [
    ['Can đảm · Kiên nhẫn · Kiềm chế', 'Sức Mạnh nói về sự can đảm và khả năng giữ bình tĩnh khi gặp chuyện khó. Lá này nhấn mạnh cách giải quyết bằng kiên nhẫn và thuyết phục, thay vì hơn thua hoặc gây sức ép.', 'Giữ lập trường nhưng nói chuyện bình tĩnh, nhất là khi đang tức giận.', ['balance', 'connection']],
    ['Thiếu tự tin · Mất kiên nhẫn · Mệt mỏi', 'Sức Mạnh ngược nói về sự thiếu tự tin hoặc khó giữ bình tĩnh vì đã quá mệt. Ví dụ, một lời góp ý nhỏ cũng khiến bạn thấy mình kém cỏi hoặc muốn nổi nóng.', 'Nghỉ trước khi phản ứng và chọn một việc nhỏ để lấy lại sự tự tin.', ['rest', 'balance']],
  ],
  MAJOR_09: [
    ['Ở một mình · Tìm câu trả lời · Suy nghĩ kỹ', 'Ẩn Sĩ nói về nhu cầu ở một mình để suy nghĩ và hiểu điều mình muốn. Trong công việc hoặc tình cảm, lá này có thể chỉ một khoảng tạm lùi để nhìn lại, thay vì quyết theo ý kiến đám đông.', 'Dành thời gian suy nghĩ riêng, nhưng vẫn giữ liên lạc với người đáng tin.', ['rest', 'learning']],
    ['Cô lập · Né gặp gỡ · Khó chia sẻ', 'Ẩn Sĩ ngược nói về việc ở một mình quá lâu hoặc tránh nói chuyện vì sợ không được hiểu. Ví dụ, bạn có chuyện buồn nhưng cắt liên lạc và tự chịu mọi việc.', 'Mở lại một cuộc trò chuyện với người bạn thấy an toàn.', ['connection', 'balance']],
  ],
  MAJOR_10: [
    ['Thay đổi · Cơ hội · Một chu kỳ mới', 'Bánh Xe Số Phận tượng trưng cho hoàn cảnh đang thay đổi và những cơ hội hoặc biến động ngoài dự tính. Trong cách đọc Tarot, lá này nhắc rằng một giai đoạn có thể kết thúc để nhường chỗ cho giai đoạn khác.', 'Theo dõi thay đổi thực tế và chuẩn bị phương án khác nếu kế hoạch cũ không còn phù hợp.', ['change', 'balance']],
    ['Trục trặc · Lặp chuyện cũ · Khó chấp nhận đổi thay', 'Bánh Xe Số Phận ngược nói về kế hoạch gặp trục trặc hoặc một chuyện cũ cứ lặp lại. Ví dụ, bạn đổi chỗ làm nhưng vẫn gặp cùng một vấn đề vì giữ nguyên cách xử lý.', 'Xem phần nào do hoàn cảnh và phần nào do thói quen của mình để sửa đúng chỗ.', ['change', 'learning']],
  ],
  MAJOR_11: [
    ['Công bằng · Sự thật · Chịu trách nhiệm', 'Công Lý tượng trưng cho một quyết định cần dựa trên sự thật và tiêu chí công bằng. Lá này cũng nói về hệ quả của lựa chọn: người tham gia cần chịu trách nhiệm cho việc mình làm.', 'Kiểm tra sự kiện và thỏa thuận rõ trước khi kết luận ai đúng, ai sai.', ['clarity', 'balance']],
    ['Thiếu công bằng · Né trách nhiệm · Thông tin lệch', 'Công Lý ngược nói về một đánh giá thiếu công bằng hoặc có người không nhận trách nhiệm. Ví dụ, chỉ nghe một phía rồi phán xét, hoặc đổ lỗi cho người khác để tránh sửa sai.', 'Nghe cả hai phía và ghi rõ phần trách nhiệm của từng người.', ['clarity', 'learning']],
  ],
  MAJOR_12: [
    ['Tạm dừng · Nhìn khác đi · Chấp nhận chờ', 'Người Treo Ngược nói về một khoảng dừng mà cố thúc cũng chưa giải quyết được việc. Lá này khuyên đổi cách nhìn, như thử hiểu lý do người khác phản đối thay vì lặp lại cùng một lời giải thích.', 'Xem lại giả định của mình và thử một cách làm khác trước khi tiếp tục.', ['rest', 'learning']],
    ['Trì hoãn · Chịu đựng vô ích · Không muốn thay đổi', 'Người Treo Ngược khi đảo chiều nói về việc chờ quá lâu, hy sinh mà không giải quyết được vấn đề hoặc từ chối đổi cách làm. Ví dụ, bạn giữ một thỏa thuận bất lợi vì nghĩ rồi người khác sẽ tự thay đổi.', 'Đặt thời hạn xem lại và quyết định điều mình cần làm khác.', ['clarity', 'action']],
  ],
  MAJOR_13: [
    ['Kết thúc · Đổi giai đoạn · Bỏ cách cũ', 'Lá Cái Chết tượng trưng cho việc kết thúc một giai đoạn để bước sang giai đoạn khác, không phải cái chết theo nghĩa đen. Đó có thể là rời một công việc, khép một mối quan hệ hoặc bỏ một thói quen đã không còn phù hợp.', 'Khép việc cũ rõ ràng và chuẩn bị những điều cần thiết cho bước tiếp theo.', ['change', 'clarity']],
    ['Không chịu buông · Sợ thay đổi · Việc cũ kéo dài', 'Lá Cái Chết ngược nói về việc biết một chuyện đã hết phù hợp nhưng vẫn khó chấm dứt. Ví dụ, bạn tiếp tục một cách làm không hiệu quả chỉ vì đã dành nhiều thời gian cho nó.', 'Xác định điều đã không còn hiệu quả và thay từng phần có thể thay ngay.', ['change', 'balance']],
  ],
  MAJOR_14: [
    ['Điều độ · Dung hòa · Kiên nhẫn', 'Tiết Độ tượng trưng cho việc kết hợp những điều khác nhau một cách vừa phải. Trong quan hệ, đó là nhường nhau ở việc nhỏ; trong công việc, đó là tiến đều thay vì làm quá sức rồi bỏ cuộc.', 'Giữ giờ làm và nghỉ hợp lý, thay đổi từng việc nhỏ.', ['balance', 'connection']],
    ['Quá mức · Thiếu điều độ · Khó hòa hợp', 'Tiết Độ ngược nói về việc đi từ cực này sang cực khác hoặc các bên chưa tìm được cách phối hợp. Ví dụ, làm liên tục nhiều ngày rồi kiệt sức, hoặc lúc chiều hoàn toàn, lúc phản ứng quá mạnh.', 'Giảm phần đang quá mức và thống nhất cách phối hợp thực tế hơn.', ['balance', 'rest']],
  ],
  MAJOR_15: [
    ['Lệ thuộc · Ham muốn · Khó từ bỏ', 'Ác Quỷ tượng trưng cho một thói quen, ham muốn hoặc quan hệ đang khiến bạn khó tự quyết. Ví dụ, biết mua sắm quá nhiều nhưng vẫn không dừng, hoặc chấp nhận bị kiểm soát vì sợ mất một người.', 'Gọi đúng điều đang khiến bạn lệ thuộc và tìm người hỗ trợ để giảm nó.', ['clarity', 'change']],
    ['Thoát lệ thuộc · Nhận ra vấn đề · Giành lại quyền chọn', 'Ác Quỷ ngược nói về việc nhận ra một thói quen hoặc quan hệ không tốt và bắt đầu thoát khỏi nó. Sự thay đổi cần được giữ bằng hành động cụ thể, không chỉ bằng một lần quyết tâm.', 'Bỏ một điều kiện khiến thói quen cũ dễ quay lại và nhờ hỗ trợ nếu cần.', ['change', 'action']],
  ],
  MAJOR_16: [
    ['Biến động bất ngờ · Điều cũ đổ vỡ · Xây lại', 'Tòa Tháp tượng trưng cho một biến động làm thay đổi điều bạn từng nghĩ là chắc chắn. Trong công việc hoặc quan hệ, nó nói về lúc phải nhìn ra vấn đề bị bỏ qua và xây lại từ đầu.', 'Xử lý việc cấp thiết trước và kiểm tra điều gì còn giữ được.', ['change', 'clarity']],
    ['Tránh đối diện · Sợ xáo trộn · Sửa vấn đề sớm', 'Tòa Tháp ngược nói về việc sợ thay đổi nên né một vấn đề đã thấy rõ. Ví dụ, tiếp tục bỏ qua mâu thuẫn trong nhóm vì không muốn cuộc họp trở nên khó chịu.', 'Nói về vấn đề cụ thể và sửa khi nó còn có thể xử lý từng phần.', ['change', 'balance']],
  ],
  MAJOR_17: [
    ['Hy vọng · Hồi phục · Có lại niềm tin', 'Ngôi Sao tượng trưng cho hy vọng và sự hồi phục sau một thời gian khó khăn. Lá này nói về việc thấy lại điều tốt và tìm được lý do để tiếp tục.', 'Duy trì những việc giúp bạn khỏe hơn và chọn một mục tiêu vừa sức.', ['rest', 'connection']],
    ['Nản lòng · Mất niềm tin · Khó thấy tiến bộ', 'Ngôi Sao ngược nói về sự nản lòng hoặc cảm giác cố gắng mà chưa thấy kết quả. Ví dụ, bạn chỉ nhìn điều chưa làm được và bỏ qua những tiến bộ nhỏ.', 'Nhìn lại điều đã cải thiện và nói chuyện với người có thể động viên đúng lúc.', ['rest', 'learning']],
  ],
  MAJOR_18: [
    ['Mơ hồ · Lo lắng · Điều chưa rõ', 'Mặt Trăng nói về một tình huống còn mơ hồ, dễ gây lo lắng hoặc hiểu nhầm. Trong tình cảm, bạn có thể chưa hiểu ý người kia; trong công việc, thông tin chưa đủ để quyết định.', 'Hỏi rõ và kiểm chứng thông tin trước khi hành động theo suy đoán.', ['clarity', 'rest']],
    ['Hiểu rõ dần · Bớt sợ · Nhận ra hiểu nhầm', 'Mặt Trăng ngược nói về việc sự thật dần rõ hơn hoặc bạn bắt đầu hiểu nguyên nhân của nỗi lo. Nó cũng nhắc kiểm tra xem điều đã yên tâm có thật sự được xác minh chưa.', 'Làm rõ một điều còn mơ hồ và sửa kết luận nếu có thông tin mới.', ['clarity', 'learning']],
  ],
  MAJOR_19: [
    ['Niềm vui · Thành công · Mọi việc rõ ràng', 'Mặt Trời tượng trưng cho niềm vui, sự tự tin và một kết quả tích cực. Trong quan hệ, nó nói về sự cởi mở; trong công việc, nó nói về thành quả có thể nhìn thấy rõ.', 'Ghi nhận thành quả và chia sẻ niềm vui với người đã cùng góp sức.', ['connection', 'action']],
    ['Niềm vui bị che · Quá lạc quan · Thành quả chậm', 'Mặt Trời ngược nói về một điều tốt chưa được nhìn nhận, tiến độ chậm hoặc sự lạc quan quá mức. Ví dụ, việc có tiến triển nhưng bạn vẫn thất vọng vì muốn mọi thứ hoàn hảo ngay.', 'Đánh giá đúng điều đã làm được và điều chỉnh kỳ vọng cho thực tế.', ['rest', 'balance']],
  ],
  MAJOR_20: [
    ['Nhìn lại · Nhận ra điều cần đổi · Cơ hội làm lại', 'Phán Xét tượng trưng cho lúc nhìn lại việc cũ và nhận ra điều cần làm khác. Lá này nói về một quyết định quan trọng dựa trên những gì bạn đã học từ trải nghiệm trước.', 'Nhận trách nhiệm cho phần của mình và chọn cách làm tốt hơn ở lần này.', ['learning', 'change']],
    ['Tự trách · Sợ bị đánh giá · Né quyết định', 'Phán Xét ngược nói về việc tự trách quá nhiều hoặc né một quyết định vì sợ bị đánh giá. Ví dụ, một sai lầm cũ khiến bạn cho rằng mình sẽ không làm tốt được việc mới.', 'Phân biệt lỗi của một việc với giá trị của bản thân và sửa điều có thể sửa.', ['balance', 'learning']],
  ],
  MAJOR_21: [
    ['Hoàn thành · Kết quả trọn vẹn · Sang chặng mới', 'Thế Giới tượng trưng cho việc hoàn thành một chặng và nhìn thấy kết quả từ những gì đã làm. Đó có thể là xong một dự án, kết thúc khóa học hoặc đạt một mục tiêu đã theo đuổi lâu.', 'Tổng kết điều đã học và khép các việc cuối trước khi bắt đầu mục tiêu mới.', ['learning', 'change']],
    ['Chưa hoàn tất · Thiếu bước cuối · Khó khép lại', 'Thế Giới ngược nói về một việc gần xong nhưng còn phần chưa hoàn thành. Ví dụ, đã làm gần hết dự án nhưng chưa bàn giao, hoặc một quan hệ đã kết thúc mà vẫn còn điều cần nói rõ.', 'Xác định bước còn thiếu và hoàn thành nó trước khi chuyển việc khác.', ['clarity', 'action']],
  ],
})

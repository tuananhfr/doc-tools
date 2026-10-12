import { tarotMeanings } from '../utils/meaning'

export const TAROT_PENTACLES = tarotMeanings({
  PENTACLES_ACE: [
    ['Cơ hội thực tế · Tiền bạc · Khởi đầu ổn định', 'Át Tiền nói về một cơ hội có thể đem lại sự ổn định: việc làm, khoản thu, dự án hoặc điều kiện học tập mới. Cơ hội mới chỉ là bước đầu; kết quả còn phụ thuộc cách bạn thực hiện.', 'Kiểm tra điều kiện của lời đề nghị và bắt đầu bằng kế hoạch cụ thể.', ['resources', 'action']],
    ['Cơ hội chậm · Bỏ lỡ · Kế hoạch thiếu chắc chắn', 'Át Tiền ngược nói về cơ hội bị trì hoãn, bỏ lỡ hoặc chưa có điều kiện thực hiện. Một lời đề nghị có vẻ hấp dẫn có thể thiếu thông tin về tiền, thời gian hay trách nhiệm.', 'Đọc kỹ điều kiện và chi phí trước khi nhận lời hoặc bỏ tiền.', ['resources', 'clarity']],
  ],
  PENTACLES_2: [
    ['Xoay xở · Hai việc · Cân đối chi tiêu', '2 Tiền nói về việc phải xoay xở giữa hai hay nhiều trách nhiệm. Bạn có thể vừa làm vừa học, cân đối thu chi hoặc chia thời gian giữa công việc và người thân.', 'Xếp ưu tiên theo thời hạn và khả năng thực tế của mình.', ['balance', 'resources']],
    ['Quá nhiều việc · Mất cân đối · Bỏ sót', '2 Tiền ngược nói về việc xoay xở không còn hiệu quả: trễ hẹn, quên việc hoặc chi tiêu vượt kế hoạch. Cố giữ mọi việc cùng lúc có thể khiến việc nào cũng dở dang.', 'Giảm một cam kết và ghi rõ khoản tiền, việc hoặc lịch đang bị thiếu.', ['balance', 'clarity']],
  ],
  PENTACLES_3: [
    ['Làm việc nhóm · Tay nghề · Học từ góp ý', '3 Tiền nói về việc cùng người khác tạo ra kết quả bằng kỹ năng và phân công rõ. Ví dụ, bạn làm dự án nhóm, được người có kinh nghiệm góp ý hoặc được công nhận về tay nghề.', 'Thống nhất ai làm gì và chủ động hỏi góp ý ở phần mình chưa vững.', ['learning', 'connection']],
    ['Phối hợp kém · Thiếu kỹ năng · Công việc lệch nhau', '3 Tiền ngược nói về việc nhóm làm không khớp hoặc chất lượng chưa đạt. Nguyên nhân có thể là phân công mơ hồ, không nghe góp ý hoặc thiếu kỹ năng cần thiết.', 'Làm rõ trách nhiệm và tiêu chuẩn hoàn thành trước khi làm tiếp.', ['clarity', 'connection']],
  ],
  PENTACLES_4: [
    ['Giữ tiền · Muốn an toàn · Khó chia sẻ', '4 Tiền nói về nhu cầu giữ sự ổn định bằng cách bảo vệ tiền bạc hoặc điều mình có. Tiết kiệm có thể hữu ích, nhưng quá sợ mất sẽ khiến bạn khó chia sẻ, thử điều mới hoặc tin người khác.', 'Phân biệt khoản cần giữ với điều bạn đang kiểm soát chỉ vì lo sợ.', ['resources', 'balance']],
    ['Bớt nắm giữ · Chi quá tay · Mất kiểm soát', '4 Tiền ngược nói về việc bớt giữ chặt tiền hoặc một mối quan hệ. Lá này cũng có thể chỉ cách chi tiêu thiếu tính toán; cần xem bạn đang chủ động chia sẻ hay đang mất khả năng kiểm soát.', 'Kiểm tra thu chi và nói rõ thỏa thuận về những gì đang dùng chung.', ['balance', 'resources']],
  ],
  PENTACLES_5: [
    ['Thiếu thốn · Cảm giác bị bỏ rơi · Cần giúp đỡ', '5 Tiền nói về khó khăn vật chất hoặc cảm giác không được hỗ trợ. Bạn có thể lo tiền, gặp trở ngại công việc hoặc thấy mình bị đứng ngoài một nhóm, dù sự giúp đỡ có thể vẫn ở gần.', 'Tìm người hoặc nơi có thể hỗ trợ việc đang thiếu thay vì tự chịu hết.', ['resources', 'connection']],
    ['Khó khăn giảm · Nhận hỗ trợ · Phục hồi', '5 Tiền ngược nói về việc bắt đầu tìm được sự giúp đỡ hoặc thoát dần khỏi thiếu thốn. Tình hình chưa hẳn đã ổn ngay, nhưng có cơ hội sửa từng phần nếu bạn chấp nhận hỗ trợ.', 'Ưu tiên nhu cầu thiết yếu và tận dụng sự giúp đỡ đã được xác nhận.', ['resources', 'change']],
  ],
  PENTACLES_6: [
    ['Cho và nhận · Giúp đỡ · Công bằng', '6 Tiền nói về sự hỗ trợ, chia sẻ hoặc trao đổi có qua có lại. Bạn có thể nhận khoản trợ giúp, trả công cho ai đó hoặc giúp người khác; điều cần xem là các bên có được đối xử công bằng không.', 'Làm rõ đây là quà, khoản vay hay việc trao đổi để tránh hiểu nhầm.', ['connection', 'resources']],
    ['Giúp có điều kiện · Nợ nghĩa · Thiếu công bằng', '6 Tiền ngược nói về việc cho và nhận không cân bằng. Một người có thể giúp để đòi kiểm soát, nhận nhiều nhưng không đáp lại hoặc chưa minh bạch về tiền và trách nhiệm.', 'Hỏi rõ điều kiện đi kèm trước khi nhận hoặc đưa sự hỗ trợ.', ['balance', 'clarity']],
  ],
  PENTACLES_7: [
    ['Kiên nhẫn · Đánh giá kết quả · Chờ thành quả', '7 Tiền nói về việc đã bỏ công và đang xem kết quả có đáng để tiếp tục không. Dự án, việc học hay một mối quan hệ cần thời gian, nhưng chờ đợi nên đi cùng kiểm tra tiến triển thực tế.', 'So sánh kết quả hiện có với thời gian và công sức đã bỏ ra.', ['learning', 'resources']],
    ['Chờ vô ích · Thiếu tiến triển · Mất kiên nhẫn', '7 Tiền ngược nói về việc bỏ nhiều công nhưng chưa thấy kết quả, hoặc muốn kết quả quá sớm. Cần phân biệt chuyện đang tiến chậm với chuyện không còn khả năng cải thiện.', 'Đặt một mốc đánh giá rõ để quyết định tiếp tục hay đổi cách làm.', ['clarity', 'balance']],
  ],
  PENTACLES_8: [
    ['Chăm chỉ · Luyện kỹ năng · Làm kỹ', '8 Tiền nói về học và luyện một kỹ năng bằng việc làm đều đặn. Bạn có thể đang học nghề, làm chi tiết của một dự án hoặc dành công sức để nâng chất lượng công việc.', 'Tập trung sửa một kỹ năng cụ thể và xin phản hồi về kết quả.', ['learning', 'action']],
    ['Làm qua loa · Quá cầu toàn · Chán việc', '8 Tiền ngược nói về chất lượng giảm do thiếu tập trung, chán việc hoặc sửa mãi không xong vì cầu toàn. Làm nhiều giờ chưa chắc có ích nếu bạn không biết phần nào cần cải thiện.', 'Xác định tiêu chuẩn đủ tốt và kiểm tra phần việc hay bị lỗi.', ['balance', 'learning']],
  ],
  PENTACLES_9: [
    ['Tự lập · Thành quả · Cuộc sống thoải mái', '9 Tiền nói về sự tự lập và thành quả có được nhờ nỗ lực của mình. Bạn có thể thấy yên tâm hơn về tiền, tận hưởng cuộc sống hoặc chọn ở một mình mà vẫn thấy thoải mái.', 'Trân trọng điều đã làm được và giữ những thói quen giúp bạn tự chủ.', ['resources', 'rest']],
    ['Phụ thuộc · Vẻ ngoài đủ đầy · Chi vượt khả năng', '9 Tiền ngược nói về việc chưa tự lập như mong muốn hoặc tốn quá nhiều để giữ vẻ ngoài thành công. Bạn có thể phụ thuộc người khác, tiêu vượt khả năng hoặc làm mãi mà không có thời gian hưởng kết quả.', 'Xem lại khoản chi và điều kiện giúp bạn đứng vững bằng khả năng của mình.', ['balance', 'rest']],
  ],
  PENTACLES_10: [
    ['Ổn định lâu dài · Gia đình · Tài sản chung', '10 Tiền nói về sự ổn định lâu dài và những gì nhiều người cùng xây dựng. Lá này thường gắn với gia đình, nhà cửa, tài sản hoặc công việc có nền vững; trong tình cảm, là mong muốn gắn bó và lo tương lai.', 'Trao đổi rõ kế hoạch lâu dài và trách nhiệm về những gì đang dùng chung.', ['resources', 'connection']],
    ['Bất đồng tiền bạc · Gia đình thiếu ổn định · Kế hoạch dài hạn vướng', '10 Tiền ngược nói về bất đồng quanh tiền, tài sản hoặc kỳ vọng của gia đình. Kế hoạch lâu dài có thể thiếu chắc chắn, hoặc áp lực từ người thân đang ảnh hưởng đến lựa chọn của bạn.', 'Làm rõ quyền, nghĩa vụ và mong muốn của từng người bằng thỏa thuận cụ thể.', ['clarity', 'balance']],
  ],
  PENTACLES_PAGE: [
    ['Học tập · Cơ hội nhỏ · Bắt đầu thực tế', 'Tiểu đồng Tiền nói về người muốn học và bắt đầu một kế hoạch thực tế. Đó có thể là khóa học, công việc đầu tiên hoặc ý tưởng kiếm tiền cần chuẩn bị; điểm chính là chịu học từ bước cơ bản.', 'Tìm hiểu yêu cầu và dành thời gian luyện kỹ năng nền tảng.', ['learning', 'resources']],
    ['Trì hoãn · Chưa chịu học · Kế hoạch bỏ dở', 'Tiểu đồng Tiền ngược nói về mục tiêu có nhưng chưa chịu học hoặc làm đều. Bạn có thể mải tìm cách nhanh, bỏ qua bước cơ bản hoặc trì hoãn việc chuẩn bị cần thiết.', 'Lập lịch học hoặc làm một phần nhỏ mỗi ngày và theo đến hết.', ['action', 'clarity']],
  ],
  PENTACLES_KNIGHT: [
    ['Đều đặn · Trách nhiệm · Chậm mà chắc', 'Kỵ sĩ Tiền nói về người làm việc cẩn thận, giữ lời và tiến từng bước. Công việc hay mối quan hệ có thể phát triển chậm, nhưng hành động ổn định quan trọng hơn sự hào hứng nhất thời.', 'Giữ lịch đã hẹn và hoàn thành việc theo thứ tự ưu tiên.', ['action', 'resources']],
    ['Trì trệ · Cứng nhắc · Mất động lực', 'Kỵ sĩ Tiền ngược nói về việc lặp lại cách làm không hiệu quả hoặc thiếu động lực. Bạn có thể quá cầu an nên không đổi, hoặc trì hoãn trách nhiệm vì thấy công việc nhàm chán.', 'Đổi một bước đang gây kẹt và đặt thời hạn cho việc bị trì hoãn.', ['balance', 'change']],
  ],
  PENTACLES_QUEEN: [
    ['Chăm lo thực tế · Thu vén · Đáng tin', 'Hoàng hậu Tiền nói về người biết chăm lo bằng những việc thiết thực: chuẩn bị bữa ăn, quản lý tiền hoặc giữ cuộc sống ổn định. Lá này nhấn mạnh sự quan tâm đi cùng khả năng tự chăm sóc mình.', 'Sắp xếp việc và chi tiêu để cả người khác lẫn bạn được chăm lo.', ['resources', 'connection']],
    ['Lo quá nhiều · Quên nhu cầu riêng · Mất cân đối', 'Hoàng hậu Tiền ngược nói về việc lo nhà hoặc công việc đến mức bỏ quên mình. Một khả năng khác là quá coi trọng tiền và sự tiện nghi, khiến quan hệ trở nên tính toán hoặc bị kiểm soát.', 'Chia lại việc và giữ thời gian, tiền bạc cho nhu cầu thiết yếu của mình.', ['balance', 'rest']],
  ],
  PENTACLES_KING: [
    ['Quản lý tốt · Thành công thực tế · Ổn định', 'Vua Tiền nói về người có kinh nghiệm quản lý công việc, tiền bạc và trách nhiệm. Lá này thường gắn với sự ổn định được xây lâu dài, khả năng giữ lời và quyết định thực tế.', 'Dựa vào kế hoạch, chi phí và kết quả đã có khi chọn bước tiếp theo.', ['resources', 'action']],
    ['Tham lợi · Cứng nhắc · Kiểm soát bằng tiền', 'Vua Tiền ngược nói về việc coi tiền hoặc địa vị quá quan trọng. Người liên quan có thể dùng sự hỗ trợ để áp đặt, quá bảo thủ hoặc chạy theo lợi ích mà bỏ qua cách đối xử với người khác.', 'Kiểm tra điều kiện tiền bạc và đừng chấp nhận yêu cầu bất công chỉ vì được hỗ trợ.', ['balance', 'clarity']],
  ],
})

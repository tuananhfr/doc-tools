import { tarotMeanings } from '../utils/meaning'

export const TAROT_SWORDS = tarotMeanings({
  SWORDS_ACE: [
    ['Sự thật · Hiểu rõ · Quyết định', 'Át Kiếm nói về việc hiểu ra sự thật hoặc tìm được cách giải quyết rõ ràng. Đó có thể là một cuộc nói chuyện thẳng thắn, ý tưởng giúp tháo nút thắt hoặc quyết định dựa trên thông tin đã kiểm tra.', 'Nói rõ vấn đề chính và kiểm tra bằng chứng trước khi quyết định.', ['clarity', 'learning']],
    ['Mơ hồ · Hiểu sai · Thiếu thông tin', 'Át Kiếm ngược nói về việc thông tin chưa rõ hoặc cách suy luận có chỗ sai. Một cuộc trao đổi có thể gây hiểu nhầm, hoặc bạn đang quyết định khi chưa biết đủ chuyện.', 'Xác nhận lại điều đã nghe và tìm phần thông tin còn thiếu.', ['clarity', 'balance']],
  ],
  SWORDS_2: [
    ['Bế tắc · Hai lựa chọn · Né quyết định', '2 Kiếm nói về thế khó khi phải chọn giữa hai hướng. Bạn có thể chưa đủ thông tin, sợ làm một người thất vọng hoặc đang tránh nhìn thẳng vào chuyện phải giải quyết.', 'Viết rõ hai lựa chọn và điều bạn cần biết để chọn.', ['clarity', 'balance']],
    ['Quá nhiều thông tin · Buộc phải chọn · Khó né tiếp', '2 Kiếm ngược nói về việc sự do dự đã gây áp lực và bạn khó trì hoãn thêm. Thông tin trái ngược hoặc cảm xúc mạnh có thể khiến lựa chọn càng rối.', 'Tách điều đã xác nhận khỏi suy đoán và quyết định từng phần.', ['clarity', 'action']],
  ],
  SWORDS_3: [
    ['Đau lòng · Chia cách · Sự thật khó nghe', '3 Kiếm nói về nỗi đau do mất mát, chia cách hoặc lời nói làm tổn thương. Trong tình cảm, đó có thể là một sự thật khó chấp nhận; trong công việc, là kết quả hoặc phản hồi gây thất vọng.', 'Thừa nhận điều làm bạn đau và tránh nói thêm lời tổn thương khi đang giận.', ['rest', 'connection']],
    ['Hồi phục · Tha thứ · Nỗi buồn còn lại', '3 Kiếm ngược nói về việc bắt đầu hồi phục sau tổn thương. Bạn có thể muốn tha thứ, làm lành hoặc buông chuyện cũ, nhưng nỗi buồn chưa hết nên cần thời gian và sự thay đổi thực tế.', 'Nói rõ điều cần thay đổi nếu hai bên muốn tiếp tục.', ['rest', 'change']],
  ],
  SWORDS_4: [
    ['Nghỉ ngơi · Tạm dừng · Hồi sức', '4 Kiếm nói về việc cần tạm nghỉ sau căng thẳng hoặc tranh cãi. Chưa phản hồi ngay, giảm việc hoặc có một khoảng yên tĩnh có thể giúp bạn suy nghĩ rõ hơn trước khi xử lý tiếp.', 'Hoãn việc không gấp và dành một khoảng nghỉ thực sự.', ['rest', 'balance']],
    ['Trở lại · Chưa hồi sức · Quá tải', '4 Kiếm ngược nói về việc quay lại sau thời gian nghỉ, hoặc cố làm tiếp khi chưa hồi sức. Bạn có thể thấy khó dừng dù đã mệt, khiến việc nhỏ cũng dễ gây căng thẳng.', 'Kiểm tra sức và khối lượng việc trước khi nhận thêm trách nhiệm.', ['rest', 'clarity']],
  ],
  SWORDS_5: [
    ['Xung đột · Thắng bằng mọi giá · Mất lòng tin', '5 Kiếm nói về cuộc tranh cãi mà dù có người thắng, quan hệ vẫn bị tổn hại. Lời nói cay nghiệt, chơi không công bằng hoặc cố chứng minh mình đúng có thể khiến mọi người mất lòng tin.', 'Xem việc thắng cuộc tranh luận có đáng với hậu quả để lại không.', ['clarity', 'connection']],
    ['Làm hòa · Dừng đối đầu · Hậu quả còn lại', '5 Kiếm ngược nói về mong muốn chấm dứt đối đầu hoặc sửa hậu quả của một cuộc cãi vã. Làm hòa cần đi cùng việc nhận lỗi và đổi cách cư xử, vì sự khó chịu có thể vẫn còn.', 'Nhận phần trách nhiệm của mình và thống nhất cách tránh lặp lại.', ['connection', 'balance']],
  ],
  SWORDS_6: [
    ['Chuyển tiếp · Rời khó khăn · Đi xa', '6 Kiếm nói về việc rời một giai đoạn căng thẳng để tìm hoàn cảnh dễ chịu hơn. Đó có thể là đổi nơi ở, đổi cách làm hoặc dần bước ra khỏi một mối quan hệ khó, dù vẫn còn buồn.', 'Chuẩn bị cho sự chuyển đổi và tìm người có thể giúp bạn trong giai đoạn đầu.', ['change', 'rest']],
    ['Khó chuyển đi · Việc cũ chưa xong · Chống thay đổi', '6 Kiếm ngược nói về việc muốn đi tiếp nhưng còn mắc ở chuyện cũ. Kế hoạch di chuyển có thể bị chậm, hoặc cùng một vấn đề tiếp tục xuất hiện vì chưa được giải quyết.', 'Xử lý một việc còn vướng trước khi chuyển sang kế hoạch mới.', ['learning', 'change']],
  ],
  SWORDS_7: [
    ['Giấu thông tin · Lách luật · Làm riêng', '7 Kiếm nói về việc có người giữ bí mật, tránh nói hết hoặc chọn làm theo cách riêng. Lá này có thể chỉ sự thiếu trung thực hay một kế hoạch cần kín đáo; phải xem bằng chứng trước khi kết luận ai đó lừa bạn.', 'Kiểm tra lời nói và thỏa thuận, đừng dựa riêng vào nghi ngờ.', ['clarity', 'action']],
    ['Lộ sự thật · Nhận lỗi · Tự lừa mình', '7 Kiếm ngược nói về thông tin bị che giấu đang được làm rõ hoặc việc cần nhận lỗi. Một khả năng khác là bạn biết có vấn đề nhưng vẫn tìm lý do để bỏ qua.', 'Nói thật phần mình biết và sửa hậu quả bằng hành động cụ thể.', ['clarity', 'change']],
  ],
  SWORDS_8: [
    ['Bị kẹt · Sợ hành động · Tự giới hạn', '8 Kiếm nói về cảm giác không có lựa chọn hoặc không thể thay đổi tình huống. Một phần trở ngại có thể là có thật, một phần là nỗi sợ khiến bạn chưa thử hỏi, từ chối hay tìm cách khác.', 'Phân biệt điều thực sự bị cấm với điều bạn đang sợ làm.', ['clarity', 'learning']],
    ['Tìm lối ra · Bớt sợ · Lấy lại quyền chọn', '8 Kiếm ngược nói về việc bắt đầu nhìn thấy lựa chọn và bớt bị nỗi sợ giữ lại. Nếu vẫn thấy bế tắc, lá này nhắc xem bạn đang tự trách mình hay đã tìm đủ sự giúp đỡ.', 'Thử một bước nhỏ bạn có quyền quyết định và nhờ hỗ trợ nếu cần.', ['change', 'action']],
  ],
  SWORDS_9: [
    ['Lo âu · Mất ngủ · Tự trách', '9 Kiếm nói về nỗi lo, cảm giác có lỗi hoặc suy nghĩ lặp lại khiến bạn khó nghỉ. Điều đang sợ có thể lớn hơn những gì thực sự đã xảy ra, nhất là khi bạn giữ chuyện đó một mình.', 'Viết điều đã xảy ra riêng với điều bạn đang sợ và trao đổi với người tin cậy.', ['rest', 'clarity']],
    ['Bớt lo · Nói ra nỗi sợ · Lo kéo dài', '9 Kiếm ngược nói về việc dần thoát khỏi lo lắng khi được chia sẻ, hoặc nỗi lo đang kéo dài vì bị giấu đi. Lá này không chẩn đoán bệnh; hãy nhìn tình trạng thực tế và mức ảnh hưởng tới sinh hoạt.', 'Nói rõ điều đang khiến bạn mất ngủ và tìm sự hỗ trợ phù hợp.', ['connection', 'rest']],
  ],
  SWORDS_10: [
    ['Kết thúc đau đớn · Chạm đáy · Không thể kéo dài', '10 Kiếm nói về một kết thúc khó chịu hoặc cảm giác thất bại nặng nề. Một công việc hay mối quan hệ có thể đã đến điểm không thể tiếp tục theo cách cũ; hình ảnh của lá bài không báo trước cái chết.', 'Chấp nhận phần đã kết thúc và giải quyết việc cần làm trước mắt.', ['change', 'rest']],
    ['Hồi phục · Qua giai đoạn khó · Chưa buông', '10 Kiếm ngược nói về việc dần đứng dậy sau một kết thúc đau đớn. Bạn có thể đã qua phần khó nhất, nhưng vẫn bị kéo lại nếu cố cứu chuyện đã không còn khả năng tiếp tục.', 'Làm một việc giúp ổn định cuộc sống hiện tại và ngừng lặp lại chuyện cũ.', ['rest', 'change']],
  ],
  SWORDS_PAGE: [
    ['Tò mò · Tìm thông tin · Nói thẳng', 'Tiểu đồng Kiếm nói về sự tò mò, quan sát và muốn biết sự thật. Bạn có thể đang học điều mới, kiểm tra tin tức hoặc gặp người hay hỏi, nói thẳng nhưng còn thiếu kinh nghiệm giao tiếp.', 'Hỏi rõ và kiểm chứng điều nghe được trước khi truyền tiếp.', ['learning', 'clarity']],
    ['Tin đồn · Nói vội · Thiếu kiểm chứng', 'Tiểu đồng Kiếm ngược nói về lời nói thiếu suy nghĩ, tin chưa kiểm chứng hoặc việc soi xét quá mức. Một cuộc trao đổi có thể thành lời đồn nếu người nói chỉ biết một phần câu chuyện.', 'Dừng việc truyền tin khi chưa biết nguồn và hỏi người có liên quan.', ['clarity', 'balance']],
  ],
  SWORDS_KNIGHT: [
    ['Quyết liệt · Nói nhanh · Theo mục tiêu', 'Kỵ sĩ Kiếm nói về hành động nhanh và quyết tâm giải quyết vấn đề. Bạn hoặc người liên quan có thể rất thẳng thắn, lập luận mạnh và muốn đạt mục tiêu ngay, nhưng dễ bỏ qua cảm xúc của người khác.', 'Giữ mục tiêu rõ và nghe hết ý người khác trước khi phản bác.', ['action', 'clarity']],
    ['Hấp tấp · Gây tranh cãi · Thiếu cân nhắc', 'Kỵ sĩ Kiếm ngược nói về việc lao vào quyết định hoặc tranh luận khi chưa hiểu đủ. Nói quá gắt, làm quá nhanh hay chỉ muốn thắng có thể khiến chuyện khó giải quyết hơn.', 'Chậm lại để kiểm tra thông tin và hậu quả của quyết định.', ['balance', 'clarity']],
  ],
  SWORDS_QUEEN: [
    ['Rõ ràng · Độc lập · Có nguyên tắc', 'Hoàng hậu Kiếm nói về người suy nghĩ rõ, nói thẳng và biết đặt yêu cầu cụ thể. Lá này khuyến khích đánh giá bằng sự thật, đồng thời không để trải nghiệm buồn trước đây làm mình phán xét mọi người.', 'Nói điều bạn chấp nhận và điều bạn không chấp nhận một cách rõ ràng.', ['clarity', 'balance']],
    ['Lời nói cay nghiệt · Phán xét · Khó tin người', 'Hoàng hậu Kiếm ngược nói về cách nói quá lạnh, quá gắt hoặc dễ nghi ngờ. Một người có thể dùng chuyện cũ để kết luận người mới, hoặc đúng về lý lẽ nhưng gây tổn thương bằng cách diễn đạt.', 'Giữ nội dung cần nói nhưng bỏ lời công kích cá nhân.', ['learning', 'connection']],
  ],
  SWORDS_KING: [
    ['Lý trí · Công bằng · Quyết định rõ', 'Vua Kiếm nói về cách quyết định dựa trên thông tin, luật lệ và trách nhiệm rõ ràng. Lá này có thể chỉ người quản lý, người tư vấn hoặc người biết tách cảm xúc khỏi việc cần xử lý.', 'Dựa vào bằng chứng và làm rõ điều kiện trước khi chốt quyết định.', ['clarity', 'action']],
    ['Lạm quyền · Cứng nhắc · Dùng lời áp đảo', 'Vua Kiếm ngược nói về việc dùng quyền lực hoặc lý lẽ để ép người khác. Một người có thể chọn thông tin có lợi cho mình, áp quy tắc không công bằng hoặc không cho người khác phản hồi.', 'Yêu cầu lý do và thỏa thuận rõ ràng thay vì chấp nhận vì người đó có quyền.', ['balance', 'clarity']],
  ],
})

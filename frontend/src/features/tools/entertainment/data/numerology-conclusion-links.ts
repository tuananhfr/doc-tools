interface NumberLink { text: string; advice: string }
type NumberLinkRow = readonly [text: string, advice: string]

const rows: Readonly<Record<string, NumberLinkRow>> = {
  '1:1': ['Bạn có thể rất muốn tự làm và tự quyết, nhưng vẫn cần nghe ý kiến của người cùng làm.', 'Hỏi thêm ý kiến trước khi quyết định việc ảnh hưởng đến người khác.'],
  '2:2': ['Đừng vì muốn giữ hòa thuận mà luôn nhường phần mình.', 'Nói rõ điều bạn muốn trước khi nhận lời hoặc thỏa hiệp.'],
  '3:3': ['Bạn có thể có nhiều ý tưởng, nhưng cần làm đến cùng để thấy kết quả.', 'Chọn một việc sáng tạo và đặt hạn hoàn thành.'],
  '4:4': ['Bạn dễ yên tâm khi mọi việc theo kế hoạch, nhưng đôi lúc vẫn cần đổi cách làm.', 'Chừa thời gian cho việc bất ngờ thay vì xếp lịch quá kín.'],
  '5:5': ['Bạn dễ hứng thú với điều mới rồi nhanh chán việc đang làm.', 'Làm xong việc đã nhận trước khi bắt đầu một việc khác.'],
  '6:6': ['Đừng vì thương mọi người mà gánh hết việc thay họ.', 'Chia việc chăm lo và để mỗi người chịu trách nhiệm phần của mình.'],
  '7:7': ['Bạn có thể suy nghĩ rất kỹ nhưng lại chậm nói ra hoặc bắt tay làm.', 'Đặt mốc dừng tìm hiểu rồi thử một bước nhỏ.'],
  '8:8': ['Bạn có thể đặt yêu cầu cao cho cả mình và người cùng làm.', 'Bàn mục tiêu vừa sức và chia trách nhiệm rõ ràng.'],
  '9:9': ['Bạn muốn giúp nhiều người, nhưng không thể nhận mọi lời nhờ.', 'Chọn một việc giúp vừa sức và giữ thời gian cho cuộc sống riêng.'],
  '1:2': ['Bạn có thể vừa giữ ý kiến riêng vừa hợp tác nếu nói rõ phần nào cần cùng bàn.', 'Thống nhất việc mỗi người được tự quyết và việc phải cùng trao đổi.'],
  '1:3': ['Sự chủ động có thể giúp bạn đưa ý tưởng thành việc làm, thay vì chỉ nói rồi để đó.', 'Làm một bản thử và nhờ người khác góp ý.'],
  '1:4': ['Bạn cần một kế hoạch cụ thể để theo đến cùng việc mình đã chọn.', 'Chia mục tiêu thành các việc nhỏ và đặt lịch thực hiện.'],
  '1:5': ['Bạn dễ muốn đổi hướng khi gặp điều mới hấp dẫn hơn.', 'Giữ một việc chính và thử điều mới trong thời gian còn lại.'],
  '1:6': ['Bạn có thể muốn giúp người khác theo cách mình cho là tốt, nhưng họ cũng cần được tự quyết.', 'Hỏi người kia có cần giúp không trước khi can thiệp.'],
  '1:7': ['Bạn nên tìm hiểu trước khi làm, nhưng không cần biết hết mọi thứ mới bắt đầu.', 'Kiểm tra thông tin quan trọng rồi thử một bước có thể sửa được.'],
  '1:8': ['Bạn có thể chủ động dẫn dắt, nhưng đừng quyết định thay mọi người.', 'Giao việc rõ và để người cùng làm tự quyết phần của họ.'],
  '1:9': ['Bạn có thể làm việc có ích theo cách riêng nếu hiểu người nhận thật sự cần gì.', 'Hỏi nhu cầu trước rồi chọn một việc bạn có thể tự làm.'],
  '2:3': ['Bạn dễ làm cuộc trò chuyện vui vẻ, nhưng cũng cần nói điều mình chưa đồng ý.', 'Nói thẳng điều còn vướng bằng lời nhẹ nhàng, dễ hiểu.'],
  '2:4': ['Người khác sẽ yên tâm hơn khi sự quan tâm của bạn đi cùng việc giữ lời.', 'Giữ đúng điều đã hẹn và báo sớm khi cần đổi kế hoạch.'],
  '2:5': ['Bạn có thể muốn gần gũi với người khác mà vẫn cần một khoảng riêng.', 'Bàn thời gian dành cho nhau và thời gian riêng của mỗi người.'],
  '2:6': ['Bạn dễ nhường hoặc nhận thêm việc chỉ để mọi người vui.', 'Nói nhu cầu của mình và chia trách nhiệm với người khác.'],
  '2:7': ['Nếu cần yên tĩnh, hãy nói ra để người khác không hiểu nhầm là bạn xa cách.', 'Báo khi bạn cần ở riêng và hẹn lúc quay lại trò chuyện.'],
  '2:8': ['Khi theo đuổi mục tiêu, bạn cũng cần nghe cảm xúc và khó khăn của người cùng làm.', 'Bàn cả kết quả cần đạt lẫn cách phối hợp.'],
  '2:9': ['Bạn có thể hiểu và thương nhiều người, nhưng không cần làm hài lòng tất cả.', 'Nhận phần bạn giúp được và từ chối rõ phần quá sức.'],
  '3:4': ['Ý tưởng của bạn dễ thành kết quả hơn khi có lịch làm cụ thể.', 'Đặt thời hạn và dành một khoảng để thử cách mới.'],
  '3:5': ['Bạn dễ mở nhiều ý tưởng cùng lúc rồi bỏ dở khi hết hứng.', 'Làm xong một việc trước khi bắt đầu thêm ý tưởng.'],
  '3:6': ['Bạn có thể đem niềm vui đến cho người thân, nhưng cũng cần dành thời gian cho điều mình thích.', 'Giữ một khoảng cho sở thích riêng bên cạnh việc gia đình.'],
  '3:7': ['Bạn cần cách nói dễ hiểu để chia sẻ những điều mình đã tìm hiểu kỹ.', 'Chọn một ý chính và giải thích bằng ví dụ cụ thể.'],
  '3:8': ['Nói hay có thể giúp bạn thu hút sự chú ý, nhưng kết quả thực tế mới giữ được niềm tin.', 'Biến ý tưởng thành một bản có thể xem hoặc dùng thử.'],
  '3:9': ['Bạn có thể dùng lời nói, bài viết hoặc ý tưởng để giúp người khác hiểu chuyện họ đang gặp.', 'Chọn một điều người nghe đang cần và giải thích cho rõ.'],
  '4:5': ['Bạn có thể vừa muốn ổn định vừa muốn thử điều mới, nên đừng đổi toàn bộ kế hoạch cùng lúc.', 'Giữ đều việc thiết yếu và thử thay đổi ở một phần nhỏ.'],
  '4:6': ['Một lịch chung có thể giúp bạn bớt phải tự lo mọi việc trong nhà.', 'Chia việc với người thân và hỏi mỗi người có thể nhận phần nào.'],
  '4:7': ['Bạn dễ kiểm tra quá kỹ rồi chậm hoàn thành việc.', 'Đặt hạn hoàn thành và chọn mức đủ tốt cho việc đang làm.'],
  '4:8': ['Bạn có thể làm việc rất chăm, nhưng cần xem việc đó có đưa mình gần mục tiêu hơn không.', 'Ưu tiên việc có kết quả rõ và kiểm tra tiến độ từng mốc.'],
  '4:9': ['Bạn cần chọn cách giúp phù hợp với thời gian và khả năng của mình để làm được lâu dài.', 'Chọn một việc cụ thể và tính trước thời gian, chi phí có thể dành.'],
  '5:6': ['Đừng nhận hết việc của mọi người rồi bỏ quên thời gian của mình.', 'Chia việc với người thân và giữ một khoảng riêng mỗi ngày.'],
  '5:7': ['Bạn có thể học từ trải nghiệm mới rồi dành thời gian nhìn lại trước khi quyết định lâu dài.', 'Thử một việc nhỏ và xem điều gì phù hợp với mình.'],
  '5:8': ['Cơ hội mới có thể hấp dẫn, nhưng bạn cần tính công sức và chi phí trước khi đổi hướng.', 'Đặt giới hạn thời gian, tiền bạc và mục tiêu cho mỗi lần thử.'],
  '5:9': ['Trải nghiệm nhiều hoàn cảnh có thể giúp bạn hiểu người khác, nhưng hãy chọn một việc giúp cụ thể.', 'Chọn một hoạt động vừa giúp bạn học thêm vừa đáp ứng nhu cầu thực tế.'],
  '6:7': ['Bạn vẫn có thể quan tâm đến người khác khi dành thời gian riêng để nghỉ và suy nghĩ.', 'Nói rõ lúc cần nghỉ và việc bạn có thể hỗ trợ sau đó.'],
  '6:8': ['Bạn có thể lo tốt việc tiền bạc và trách nhiệm, nhưng người thân còn cần được lắng nghe.', 'Dành thời gian hỏi người thân đang cảm thấy thế nào.'],
  '6:9': ['Bạn dễ nhận quá nhiều trách nhiệm vì muốn giúp cả người thân lẫn người ngoài.', 'Ưu tiên việc cần lo và chỉ nhận thêm khi còn đủ sức.'],
  '7:8': ['Tìm hiểu kỹ giúp bạn quyết định chắc hơn, nhưng cần có lúc dừng phân tích để bắt đầu.', 'Kiểm tra thông tin chính rồi chốt việc làm và thời hạn.'],
  '7:9': ['Điều bạn hiểu sâu có thể giúp người khác nếu được giải thích bằng lời dễ hiểu.', 'Chia sẻ một kiến thức có ích bằng ví dụ gần gũi.'],
  '8:9': ['Bạn có thể tổ chức việc chung hiệu quả nếu cân nhắc cả kết quả lẫn người được giúp.', 'Đặt mục tiêu rõ và bàn ai nhận việc, ai chịu chi phí.'],
}

export const NUMEROLOGY_CONCLUSION_LINKS: Readonly<Record<string, NumberLink>> = Object.fromEntries(Object.entries(rows).map(([key, [text, advice]]) => [key, { text, advice }]))

export function numberConclusionLink(first: number, second: number): NumberLink {
  return NUMEROLOGY_CONCLUSION_LINKS[`${Math.min(first, second)}:${Math.max(first, second)}`]
}

// robots.txt matching and readability: pure functions, no network, no database.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { robotsAllows } = require('../dist/read/robots')
const { extractArticle, looksPaywalled, decodeHtml, decodeEntities } = require('../dist/read/article-extract')

test('robots.txt: own group beats *, longest rule wins, Allow wins a tie, wildcards and $', () => {
  const text = 'User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: ChuyenNhoReader\nUser-agent: other\nDisallow: /private\nAllow: /private/ok\nDisallow: /*.pdf$\nDisallow: /tmp*/x'
  assert.equal(robotsAllows(text, '/news/a'), true)
  assert.equal(robotsAllows(text, '/private/x'), false)
  assert.equal(robotsAllows(text, '/private/ok/1'), true)
  assert.equal(robotsAllows(text, '/a/b.pdf'), false)
  assert.equal(robotsAllows(text, '/a/b.pdf?x=1'), true)
  assert.equal(robotsAllows(text, '/tmp123/x'), false)
  assert.equal(robotsAllows('User-agent: *\nDisallow: /', '/a'), false)
  assert.equal(robotsAllows('User-agent: *\nDisallow:', '/a'), true)
  assert.equal(robotsAllows('', '/a'), true)
  assert.equal(robotsAllows('User-agent: *\nAllow: /a\nDisallow: /a', '/a'), true)
  const started = Date.now()
  robotsAllows('User-agent: *\n' + 'Disallow: /' + '*a'.repeat(5000) + 'b\n' + ' '.repeat(400000) + 'x', '/' + 'a'.repeat(2000))
  assert.ok(Date.now() - started < 2000, 'hostile robots.txt must stay fast')
})

const ARTICLE = `<!doctype html><html><head><meta charset="utf-8"><title>Tiêu đề trang | Báo</title><meta property="og:title" content="Giá lúa tăng mạnh &amp; ổn định"></head>
<body><header><nav><a href="/">Trang chủ</a><a href="/the-gioi">Thế giới</a></nav></header>
<div class="ads-banner"><p>Quảng cáo dài dài dài dài dài dài dài dài dài dài dài dài</p></div>
<main><article><h1>Giá lúa tăng mạnh</h1><p>Đoạn một nói về giá lúa ở đồng bằng sông Cửu Long, tăng 500 đồng mỗi ký trong tuần qua.</p>
<script>var p = "<p>không đọc</p>";</script><p>Đoạn hai: nông dân phấn khởi vì giá bán cao hơn dự kiến, nhiều thương lái đến tận ruộng.<br>Dòng sau dấu ngắt.</p>
<ul><li>Ý thứ nhất của danh sách đủ dài</li><li>Ý thứ hai</ul><blockquote>Trích dẫn của một chuyên gia về thị trường gạo xuất khẩu.</blockquote>
<p>Đoạn ba có &agrave; &ecirc; &#7853; &#x1EA1; và chữ <strong>đậm</strong> nằm trong câu, đủ dài để tính điểm.</p>
<div class="share-box"><p>Chia sẻ bài viết này lên mạng xã hội ngay hôm nay nhé bạn đọc</p></div></article>
<aside><p>Tin liên quan dài dài dài dài dài dài dài dài dài dài dài dài dài dài</p></aside></main><footer><p>Bản quyền thuộc về báo</p></footer></body></html>`

test('readability keeps the article blocks in order and drops chrome, scripts and ads', () => {
  const article = extractArticle(ARTICLE)
  assert.ok(article)
  assert.equal(article.title, 'Giá lúa tăng mạnh & ổn định')
  assert.deepEqual(article.segments.map((s) => s.kind), ['heading', 'paragraph', 'paragraph', 'list-item', 'list-item', 'quote', 'paragraph'])
  assert.equal(article.segments[2].text, 'Đoạn hai: nông dân phấn khởi vì giá bán cao hơn dự kiến, nhiều thương lái đến tận ruộng. Dòng sau dấu ngắt.')
  assert.match(article.segments[6].text, /^Đoạn ba có à ê ậ ạ và chữ đậm nằm trong câu/)
  const all = article.segments.map((s) => s.text).join(' ')
  for (const noise of ['Trang chủ', 'Quảng cáo', 'không đọc', 'Chia sẻ', 'Tin liên quan', 'Bản quyền']) assert.ok(!all.includes(noise), noise)
  assert.deepEqual(article.segments.map((s) => s.id), ['s1', 's2', 's3', 's4', 's5', 's6', 's7'])
  assert.equal(article.truncated, false)
})

test('readability without <article> picks the densest container; menus alone are NO_ARTICLE', () => {
  const body = '<p>' + 'Nội dung chính của bài viết rất dài. '.repeat(4) + '</p>'
  const page = `<div id="menu"><p>${'Mục menu '.repeat(10)}</p></div><div class="content">${body}${body}</div><div><p>Ngắn</p></div>`
  const article = extractArticle(page)
  assert.ok(article)
  assert.equal(article.segments.length, 2)
  assert.equal(extractArticle('<nav><a>Trang chủ</a></nav><p>Xin chào</p>'), null)
  assert.equal(extractArticle(''), null)
})

test('readability stays linear on hostile markup', () => {
  for (const hostile of ['<a "'.repeat(300000), '<a'.repeat(500000), '"x<a" '.repeat(300000), '<div>'.repeat(200000) + '<p>' + 'chữ '.repeat(100) + '</p>', '<!--'.repeat(300000), '</a'.repeat(400000)]) {
    const started = Date.now()
    extractArticle(hostile)
    assert.ok(Date.now() - started < 3000, `slow on ${hostile.slice(0, 12)}`)
  }
})

test('paywall markers, entities and charset decoding', () => {
  assert.equal(looksPaywalled('<script type="application/ld+json">{"isAccessibleForFree": false}</script>'), true)
  assert.equal(looksPaywalled('<script type="application/ld+json">{"isAccessibleForFree":"False"}</script>'), true)
  assert.equal(looksPaywalled('<meta property="article:content_tier" content="locked">'), true)
  assert.equal(looksPaywalled('<meta property="article:content_tier" content="free"><p>"isAccessibleForFree": true</p>'), false)
  assert.equal(decodeEntities('&lt;b&gt; &#0; &#xD800; &unknown; &Agrave;&agrave;'), '<b>   &unknown; Àà')
  assert.equal(decodeHtml(Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from('Việt')]), null), 'Việt')
  const cp1258 = Buffer.from([0x56, 0x69, 0xea, 0xf2, 0x74])
  assert.equal(decodeHtml(cp1258, 'windows-1258').normalize('NFC'), 'Việt')
  assert.equal(decodeHtml(Buffer.from('<meta charset="windows-1258">' + 'x'), null), '<meta charset="windows-1258">x')
  assert.equal(decodeHtml(Buffer.from('ok'), 'no-such-charset'), 'ok')
})

// Tệp độc cho SEC01 / CN-013: bom giải nén, cấu trúc lồng sâu, ảnh khai kích thước khổng lồ, tệp mạo
// danh. Dựng tay từng byte — thư viện ghi PDF/zip "đúng chuẩn" không chịu sinh tệp lừa dối kiểu này.
import fs from 'node:fs'
import zlib from 'node:zlib'
import { FIX } from '../lib/qa.mjs'

const latin = (text) => Buffer.from(text, 'latin1')

function pdf(objects) {
  const parts = [latin('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n')]
  let size = parts[0].length
  const offsets = []
  objects.forEach((body, index) => {
    offsets.push(size)
    const chunk = Buffer.concat([latin(`${index + 1} 0 obj\n`), Buffer.isBuffer(body) ? body : latin(body), latin('\nendobj\n')])
    parts.push(chunk)
    size += chunk.length
  })
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('') + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF\n`
  return Buffer.concat([...parts, latin(xref)])
}
const stream = (dict, data) => Buffer.concat([latin(`<< ${dict} /Length ${data.length} >>\nstream\n`), data, latin('\nendstream')])
const page = (extra) => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R ${extra} >>`

// 1. Mảng lồng 100.000 tầng: bộ đọc đệ quy không giới hạn sẽ tràn ngăn xếp.
fs.writeFileSync(FIX + 'long-sau.pdf', pdf(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', page('/X ' + '['.repeat(100000) + ']'.repeat(100000)), stream('', latin('BT ET'))]))

// 2. Luồng nội dung ~250 KB nén, giải ra 256 MiB.
const bomb = zlib.deflateSync(Buffer.alloc(256 * 1024 * 1024, 0x20), { level: 9 })
fs.writeFileSync(FIX + 'bom-luong.pdf', pdf(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', page(''), stream('/Filter /FlateDecode', bomb)]))

// 3. Ảnh khai 30000 × 30000 (2,7 GB RGB) nhưng dữ liệu chỉ 1 KB.
fs.writeFileSync(FIX + 'bom-anh.pdf', pdf([
  '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', page('/Resources << /XObject << /Im0 5 0 R >> >>'),
  stream('', latin('q 595 0 0 842 0 0 cm /Im0 Do Q')),
  stream('/Type /XObject /Subtype /Image /Width 30000 /Height 30000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode', zlib.deflateSync(Buffer.alloc(1024))),
]))

// 4. PNG 10000 × 10000 = 100 MP (trên trần imagePixels 80M), dữ liệu chỉ hai dòng.
const pngChunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([latin(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(zlib.crc32(body))
  return Buffer.concat([length, body, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(10000, 0)
ihdr.writeUInt32BE(10000, 4)
ihdr.set([8, 2, 0, 0, 0], 8)
fs.writeFileSync(FIX + 'anh-100mp.png', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(Buffer.alloc(30001 * 2))), pngChunk('IEND', Buffer.alloc(0))]))

// 5. JPEG chỉ có SOF0 10000 × 10000: trình duyệt đọc được kích thước nhưng không giải mã được.
fs.writeFileSync(FIX + 'anh-100mp.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x27, 0x10, 0x27, 0x10, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9]))

// 6. Tệp chạy Windows đội đuôi .png: MIME sniffing phải nhận ra.
fs.writeFileSync(FIX + 'gia-mao-anh.png', Buffer.concat([latin('MZ'), Buffer.alloc(510)]))

// 7–8. DOCX: zip dựng tay để khai kích thước giải nén tuỳ ý.
async function deflateRawChunks(chunkCount, chunk) {
  return new Promise((resolve, reject) => {
    const out = []
    const deflate = zlib.createDeflateRaw({ level: 9 })
    deflate.on('data', (data) => out.push(data))
    deflate.on('end', () => resolve(Buffer.concat(out)))
    deflate.on('error', reject)
    let index = 0
    const pump = () => {
      while (index < chunkCount) {
        index++
        if (!deflate.write(chunk)) return void deflate.once('drain', pump)
      }
      deflate.end()
    }
    pump()
  })
}
function zip(entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const { name, data, crc, size } of entries) {
    const nameBytes = latin(name)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(8, 8)
    local.writeUInt32LE(0, 10); local.writeUInt32LE(crc >>> 0, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(size, 22)
    local.writeUInt16LE(nameBytes.length, 26); local.writeUInt16LE(0, 28)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8); central.writeUInt16LE(8, 10)
    central.writeUInt32LE(0, 12); central.writeUInt32LE(crc >>> 0, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(size, 24)
    central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42)
    locals.push(local, nameBytes, data)
    centrals.push(central, nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}
const contentTypes = latin('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
const entry = (name, raw) => ({ name, data: zlib.deflateRawSync(raw), crc: zlib.crc32(raw), size: raw.length })

// 7. document.xml giải ra 1 GiB thật (nén ~1 MB).
const MiB = Buffer.alloc(1024 * 1024, 0x20)
let crc = 0
for (let i = 0; i < 1024; i++) crc = zlib.crc32(MiB, crc)
fs.writeFileSync(FIX + 'bom-nen.docx', zip([entry('[Content_Types].xml', contentTypes), { name: 'word/document.xml', data: await deflateRawChunks(1024, MiB), crc, size: 1024 * 1024 * 1024 }]))

// 8. Khai 4.000.000.000 byte nhưng dữ liệu thật vài chục byte: bộ giải nén cấp phát theo số KHAI BÁO.
const small = latin('<w:document><w:body><w:p><w:r><w:t>xin chao</w:t></w:r></w:p></w:body></w:document>')
fs.writeFileSync(FIX + 'khai-gian.docx', zip([entry('[Content_Types].xml', contentTypes), { ...entry('word/document.xml', small), size: 4_000_000_000 }]))

// 9. "TXT" toàn byte nhị phân.
fs.writeFileSync(FIX + 'nhi-phan.txt', Buffer.from(Array.from({ length: 65536 }, (_, index) => (index * 7919) & 0xff)))

// 10. Billion laughs.
fs.writeFileSync(FIX + 'bom-thuc-the.xml', '<?xml version="1.0"?>\n<!DOCTYPE lolz [\n<!ENTITY lol "lol">\n' + Array.from({ length: 9 }, (_, index) => `<!ENTITY lol${index + 1} "${`&lol${index || ''};`.repeat(10)}">`).join('\n') + '\n]>\n<HDon><DLHDon>&lol9;</DLHDon></HDon>\n', 'utf8')

console.log('malicious: 10 tệp')

import { describe, expect, it } from 'vitest'
import { describeError, TOOL_ERROR, ToolError } from './tool-error'

describe('describeError', () => {
  it('có đúng 11 mã, không trùng', () => {
    expect(new Set(Object.values(TOOL_ERROR)).size).toBe(11)
  })

  it('giữ mã và câu báo của ToolError', () => {
    expect(describeError(new ToolError(TOOL_ERROR.corruptFile, 'Tệp PDF hỏng.'), 'x')).toEqual({ code: 'CORRUPT_FILE', message: 'Tệp PDF hỏng.' })
  })

  it('tìm mã dọc theo chuỗi cause khi lỗi bị bọc để thêm tên tệp', () => {
    const wrapped = new Error('"a.jpg": ảnh quá lớn', { cause: new ToolError(TOOL_ERROR.memory, 'ảnh quá lớn') })
    expect(describeError(wrapped, 'x')).toEqual({ code: 'MEMORY_LIMIT', message: '"a.jpg": ảnh quá lớn' })
  })

  it('nhận lỗi của trình duyệt theo loại', () => {
    expect(describeError(new RangeError('Array buffer allocation failed'), 'x').code).toBe('MEMORY_LIMIT')
    expect(describeError(new DOMException('denied', 'NotAllowedError'), 'x').code).toBe('PERMISSION_DENIED')
    expect(describeError(new DOMException('slow', 'TimeoutError'), 'x').code).toBe('PROCESSING_TIMEOUT')
    const encode = new Error('Ảnh quá lớn với trình duyệt này.')
    encode.name = 'CanvasEncodeError'
    expect(describeError(encode, 'x').code).toBe('EXPORT_FAILED')
  })

  it('lỗi lạ hoặc không phải Error thì là UNKNOWN_ERROR kèm câu mặc định', () => {
    expect(describeError(new Error('gì đó'), 'x')).toEqual({ code: 'UNKNOWN_ERROR', message: 'gì đó' })
    expect(describeError('chuỗi', 'Không xử lý được tệp.')).toEqual({ code: 'UNKNOWN_ERROR', message: 'Không xử lý được tệp.' })
    expect(describeError(new Error(''), 'mặc định').message).toBe('mặc định')
  })
})

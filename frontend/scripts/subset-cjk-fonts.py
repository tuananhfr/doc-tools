"""Cắt Noto Sans SC / TC / JP / KR (bản variable của google/fonts) thành phông tĩnh thường + đậm cho chữ in vào PDF.

Chạy lại sau mỗi lần sửa bản dịch zh/ja/ko — chữ của chính giao diện luôn phải có glyph:
    python scripts/subset-cjk-fonts.py <thư mục chứa sc.ttf tc.ttf jp.ttf kr.ttf>
Nguồn: https://github.com/google/fonts/tree/main/ofl/notosans{sc,tc,jp,kr} (OFL, cho phép cắt).

Nguyên bộ nặng 10–18 MB mỗi ngôn ngữ; chỉ giữ chữ thông dụng còn ~1–2 MB. Chữ hiếm ngoài bộ
không mất: `pdf-text.ts` vẽ cả dòng bằng canvas thành ảnh.
"""
import json
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
MESSAGES = ROOT / 'src/i18n/messages'
OUT = ROOT / 'src/assets/fonts'


def decode_range(codec, first, last, second_from, second_to):
    chars = set()
    for lead in range(first, last + 1):
        for trail in range(second_from, second_to + 1):
            try:
                chars.update(bytes([lead, trail]).decode(codec))
            except UnicodeDecodeError:
                pass
    return chars


def ranges(*spans):
    return {chr(code) for start, end in spans for code in range(start, end + 1)}


def message_chars(locale):
    chars = set()

    def walk(node):
        if isinstance(node, dict):
            for value in node.values():
                walk(value)
        elif isinstance(node, str):
            chars.update(node)

    for path in (MESSAGES / locale).glob('*.json'):
        walk(json.loads(path.read_text(encoding='utf-8')))
    return chars


# ASCII, dấu câu chung, ký hiệu CJK, dạng toàn khổ: số trang, ngày, ngoặc… trộn trong cùng dòng.
COMMON = ranges((0x20, 0x7E), (0xA0, 0xFF), (0x2000, 0x206F), (0x2190, 0x21FF), (0x2460, 0x24FF), (0x3000, 0x303F), (0xFF00, 0xFFEF))
KANA = ranges((0x3040, 0x30FF), (0x31F0, 0x31FF))

SETS = {
    # GB2312 cấp 1 (3.755 chữ) — phủ ~99,7% văn bản giản thể.
    'SC': ('zh-hans', decode_range('gb2312', 0xB0, 0xD7, 0xA1, 0xFE)),
    # Big5 chữ thường dùng (5.401 chữ).
    'TC': ('zh-hant', decode_range('big5', 0xA4, 0xC6, 0x40, 0xFE)),
    # JIS X 0208 cấp 1 (2.965 kanji) + kana.
    'JP': ('ja', decode_range('euc_jp', 0xB0, 0xCF, 0xA1, 0xFE) | KANA),
    # KS X 1001: 2.350 âm tiết Hangul thông dụng + jamo.
    'KR': ('ko', decode_range('euc_kr', 0xB0, 0xC8, 0xA1, 0xFE) | ranges((0x3130, 0x318F))),
}
SOURCES = {'SC': 'sc.ttf', 'TC': 'tc.ttf', 'JP': 'jp.ttf', 'KR': 'kr.ttf'}
WEIGHTS = {'Regular': 400, 'Bold': 700}


def build(source_dir):
    for script, (locale, chars) in SETS.items():
        wanted = COMMON | chars | message_chars(locale)
        for style, weight in WEIGHTS.items():
            font = TTFont(source_dir / SOURCES[script])
            static = instancer.instantiateVariableFont(font, {'wght': weight})
            options = subset.Options()
            # pdf-lib không dùng GSUB/GPOS để dàn chữ CJK; bỏ hinting — chữ in vào PDF, không hiển thị trên màn pixel thấp.
            options.layout_features = []
            options.hinting = False
            options.name_IDs = ['*']
            options.notdef_outline = True
            subsetter = subset.Subsetter(options)
            subsetter.populate(unicodes=[ord(char) for char in wanted])
            subsetter.subset(static)
            # Bộ cắt của fontkit (pdf-lib, subset: true) đọc offset glyph như loca ngắn: glyph không đệm
            # (offset lẻ) ra glyph cụt — chữ biến mất khỏi PDF mà không lỗi nào báo.
            static['glyf'].padding = 4
            family = f'Noto Sans {script}'
            for name_id, value in {1: family, 2: style, 4: f'{family} {style}', 6: f'NotoSans{script}-{style}'}.items():
                static['name'].setName(value, name_id, 3, 1, 0x409)
            target = OUT / f'NotoSans{script}-{style}.ttf'
            static.save(target)
            print(f'{target.name}: {len(wanted)} chars, {target.stat().st_size // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build(pathlib.Path(sys.argv[1]))

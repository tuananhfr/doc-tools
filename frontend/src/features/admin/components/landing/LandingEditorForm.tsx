import { DEFAULT_PICTURES, defaultToolsShot, type LandingDoc, type LandingMode } from '@/features/site-landing'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { LANDING_LIMITS as LIMIT, LANDING_PAGE_TARGETS } from '../../config/landing-form'
import { LandingBlock, LandingItem, SelectField, TextField } from './LandingFields'
import { LandingImageField } from './LandingImageField'

type Block = 'meta' | 'hero' | 'tools' | 'cases' | 'steps' | 'privacy' | 'closing' | 'footer'
type ItemBlock = 'tools' | 'cases' | 'steps' | 'privacy'
type ItemOf<B extends ItemBlock> = LandingDoc[B]['items'][number]

const ORDINAL = ['Thứ nhất', 'Thứ hai', 'Thứ ba']
const HEX = /^#[0-9a-f]{6}$/i

interface LandingEditorFormProps {
  doc: LandingDoc
  name: string
  readyTools: readonly ToolDefinition[]
  onChange: (doc: LandingDoc) => void
  onNameChange: (name: string) => void
}

/** The page's blocks in the order they appear on it; staff edit words and pictures, never the layout. */
export function LandingEditorForm({ doc, name, readyTools, onChange, onNameChange }: LandingEditorFormProps) {
  const set = <B extends Block>(block: B, change: Partial<LandingDoc[B]>) => onChange({ ...doc, [block]: { ...doc[block], ...change } })
  const setItem = <B extends ItemBlock>(block: B, index: number, change: Partial<ItemOf<B>>) => {
    const items = doc[block].items.map((item, at) => at === index ? { ...item, ...change } : item)
    onChange({ ...doc, [block]: { ...doc[block], items } })
  }
  const setTheme = (change: Partial<LandingDoc['theme']>) => onChange({ ...doc, theme: { ...doc.theme, ...change } })
  const toolBySlug = new Map(readyTools.map((tool) => [tool.slug, tool]))
  const toolOptions = readyTools.map((tool) => <option key={tool.slug} value={tool.slug}>{tool.name}</option>)

  return (
    <div className="cn-admin-lform">
      <LandingBlock id="khoi-trang" title="Thông tin trang" description="Tên chỉ hiện trong quản trị. Tiêu đề và mô tả là thứ Google và mạng xã hội hiển thị.">
        <TextField label="Tên trang (nội bộ)" path="name" value={name} max={LIMIT.title} required onChange={onNameChange} />
        <TextField label="Địa chỉ trang trên website gắn vào" path="canonicalUrl" type="url" value={doc.canonicalUrl} max={LIMIT.url} placeholder="https://website-cua-ban.vn/chuyen-nho" onChange={(canonicalUrl) => onChange({ ...doc, canonicalUrl })} hint="Để Google ghi công cho website đó, không phải cho DocTools. Bỏ trống thì dùng địa chỉ DocTools." />
        <TextField label="Tiêu đề trang (thẻ title)" path="meta.title" value={doc.meta.title} max={LIMIT.metaTitle} required onChange={(title) => set('meta', { title })} />
        <TextField label="Mô tả ngắn" path="meta.description" value={doc.meta.description} max={LIMIT.metaDescription} multiline onChange={(description) => set('meta', { description })} />
      </LandingBlock>

      <LandingBlock id="khoi-giao-dien" title="Giao diện" description="Màu nhấn dùng cho nút và điểm nhấn; chữ trên nút tự đổi sáng/tối cho đủ tương phản.">
        <div className="cn-admin-form__row">
          <label className="cn-admin-lfield">
            <span className="cn-admin-lfield__head"><span>Màu nhấn</span></span>
            <span className="cn-admin-lcolor">
              <input type="color" aria-label="Chọn màu nhấn" value={HEX.test(doc.theme.accent) ? doc.theme.accent : '#005be8'} onChange={(event) => setTheme({ accent: event.target.value })} />
              <input type="text" name="theme.accent" value={doc.theme.accent} maxLength={7} pattern="#[0-9a-fA-F]{6}" spellCheck={false} onChange={(event) => setTheme({ accent: event.target.value.trim() })} />
            </span>
          </label>
          <fieldset className="cn-admin-radios cn-admin-lmode">
            <legend>Nền trang</legend>
            {(['light', 'dark'] as LandingMode[]).map((mode) => (
              <label key={mode}><input type="radio" name="theme.mode" value={mode} checked={doc.theme.mode === mode} onChange={() => setTheme({ mode })} /><span><strong>{mode === 'light' ? 'Sáng' : 'Tối'}</strong></span></label>
            ))}
          </fieldset>
        </div>
        <LandingImageField label="Logo" path="theme.logo" value={doc.theme.logo} fallback={DEFAULT_PICTURES.logo} onChange={(logo) => setTheme({ logo })} hint="Ảnh ngang, nền trong suốt, cao khoảng 80px. Logo tải lên thay cho chữ “Chuyện Nhỏ” ở đầu và chân trang." />
      </LandingBlock>

      <LandingBlock id="khoi-mo-dau" title="Mở đầu">
        <TextField label="Tiêu đề" path="hero.title" value={doc.hero.title} max={LIMIT.title} required onChange={(title) => set('hero', { title })} />
        <TextField label="Dòng tô màu nhấn" path="hero.highlight" value={doc.hero.highlight} max={LIMIT.title} onChange={(highlight) => set('hero', { highlight })} hint="Hiện ngay sau tiêu đề, bằng màu nhấn." />
        <TextField label="Đoạn giới thiệu" path="hero.body" value={doc.hero.body} max={LIMIT.body} multiline onChange={(body) => set('hero', { body })} />
        <TextField label="Chữ trên nút chính" path="hero.cta" value={doc.hero.cta} max={LIMIT.short} required onChange={(cta) => set('hero', { cta })} hint="Nút mở trang tất cả công cụ." />
        <LandingImageField label="Ảnh nền" path="hero.image" value={doc.hero.image} fallback={DEFAULT_PICTURES.hero} onChange={(image) => set('hero', { image })} hint="Ảnh ngang, rộng ít nhất 1600px; phần bên phải nên thoáng vì chữ nằm bên trái." />
      </LandingBlock>

      <LandingBlock id="khoi-tinh-huong" title="Tình huống" description="Ba thẻ, mỗi thẻ dẫn tới một công cụ hoặc một trang của DocTools.">
        <TextField label="Tiêu đề khối" path="cases.title" value={doc.cases.title} max={LIMIT.title} required onChange={(title) => set('cases', { title })} />
        <TextField label="Mô tả khối" path="cases.body" value={doc.cases.body} max={LIMIT.body} multiline onChange={(body) => set('cases', { body })} />
        {doc.cases.items.map((item, index) => (
          <LandingItem key={index} title={`Thẻ ${ORDINAL[index]?.toLowerCase() ?? index + 1}`}>
            <TextField label="Tiêu đề" path={`cases.items.${index}.title`} value={item.title} max={LIMIT.title} required onChange={(title) => setItem('cases', index, { title })} />
            <TextField label="Mô tả" path={`cases.items.${index}.body`} value={item.body} max={LIMIT.body} multiline onChange={(body) => setItem('cases', index, { body })} />
            <div className="cn-admin-form__row">
              <SelectField label="Mở tới" path={`cases.items.${index}.target`} value={item.target} onChange={(target) => setItem('cases', index, { target })}>
                <optgroup label="Trang">{LANDING_PAGE_TARGETS.map((page) => <option key={page.value} value={page.value}>{page.label}</option>)}</optgroup>
                <optgroup label="Công cụ">{toolOptions}</optgroup>
                {/* A tool retired since the last save stays visible, so the server's error has something to point at. */}
                {LANDING_PAGE_TARGETS.some((page) => page.value === item.target) || toolBySlug.has(item.target) ? null : <option value={item.target}>{item.target} (không còn)</option>}
              </SelectField>
              <TextField label="Chữ trên liên kết" path={`cases.items.${index}.linkLabel`} value={item.linkLabel} max={LIMIT.short} required onChange={(linkLabel) => setItem('cases', index, { linkLabel })} />
            </div>
            <LandingImageField label="Ảnh" path={`cases.items.${index}.image`} value={item.image} fallback={DEFAULT_PICTURES.cases[index] ?? DEFAULT_PICTURES.cases[0]} onChange={(image) => setItem('cases', index, { image })} />
          </LandingItem>
        ))}
      </LandingBlock>

      <LandingBlock id="khoi-cong-cu" title="Công cụ nổi bật" description="Ba công cụ hợp với người xem website này. Bỏ trống tên hoặc mô tả thì trang dùng chữ có sẵn của công cụ.">
        <TextField label="Tiêu đề khối" path="tools.title" value={doc.tools.title} max={LIMIT.title} required onChange={(title) => set('tools', { title })} />
        <TextField label="Mô tả khối" path="tools.body" value={doc.tools.body} max={LIMIT.body} multiline onChange={(body) => set('tools', { body })} />
        {doc.tools.items.map((item, index) => {
          const tool = toolBySlug.get(item.slug)
          return (
            <LandingItem key={index} title={`Công cụ ${ORDINAL[index]?.toLowerCase() ?? index + 1}`}>
              <SelectField label="Công cụ" path={`tools.items.${index}.slug`} value={item.slug} onChange={(slug) => setItem('tools', index, { slug })}>
                {toolOptions}
                {tool ? null : <option value={item.slug}>{item.slug || 'Chọn công cụ'} (không còn)</option>}
              </SelectField>
              <TextField label="Tên hiển thị" path={`tools.items.${index}.title`} value={item.title} max={LIMIT.title} placeholder={tool?.name} onChange={(title) => setItem('tools', index, { title })} />
              <TextField label="Mô tả" path={`tools.items.${index}.body`} value={item.body} max={LIMIT.body} multiline placeholder={tool?.description} onChange={(body) => setItem('tools', index, { body })} />
            </LandingItem>
          )
        })}
        <LandingImageField label="Ảnh minh hoạ" path="tools.image" value={doc.tools.image} fallback={defaultToolsShot(doc.theme.mode)} onChange={(image) => set('tools', { image })} hint="Ảnh chụp màn hình công cụ, tỉ lệ khoảng 4:3." />
      </LandingBlock>

      <LandingBlock id="khoi-cach-dung" title="Cách dùng" description="Ba bước, icon cố định: tìm công cụ, thêm tệp, tải kết quả.">
        <TextField label="Tiêu đề khối" path="steps.title" value={doc.steps.title} max={LIMIT.title} required onChange={(title) => set('steps', { title })} />
        <TextField label="Mô tả khối" path="steps.body" value={doc.steps.body} max={LIMIT.body} multiline onChange={(body) => set('steps', { body })} />
        {doc.steps.items.map((item, index) => (
          <LandingItem key={index} title={`Bước ${index + 1}`}>
            <TextField label="Tiêu đề" path={`steps.items.${index}.title`} value={item.title} max={LIMIT.title} required onChange={(title) => setItem('steps', index, { title })} />
            <TextField label="Mô tả" path={`steps.items.${index}.body`} value={item.body} max={LIMIT.body} multiline onChange={(body) => setItem('steps', index, { body })} />
          </LandingItem>
        ))}
        <TextField label="Ghi chú dưới các bước" path="steps.note" value={doc.steps.note} max={LIMIT.body} multiline onChange={(note) => set('steps', { note })} />
      </LandingBlock>

      <LandingBlock id="khoi-du-lieu" title="Dữ liệu và quyền riêng tư" description="Ba ý, icon cố định: xử lý trên máy, không lưu đám mây, người dùng tự quyết.">
        <TextField label="Tiêu đề khối" path="privacy.title" value={doc.privacy.title} max={LIMIT.title} required onChange={(title) => set('privacy', { title })} />
        <TextField label="Mô tả khối" path="privacy.body" value={doc.privacy.body} max={LIMIT.body} multiline onChange={(body) => set('privacy', { body })} />
        {doc.privacy.items.map((item, index) => (
          <LandingItem key={index} title={`Ý ${ORDINAL[index]?.toLowerCase() ?? index + 1}`}>
            <TextField label="Tiêu đề" path={`privacy.items.${index}.title`} value={item.title} max={LIMIT.title} required onChange={(title) => setItem('privacy', index, { title })} />
            <TextField label="Mô tả" path={`privacy.items.${index}.body`} value={item.body} max={LIMIT.body} multiline onChange={(body) => setItem('privacy', index, { body })} />
          </LandingItem>
        ))}
        <LandingImageField label="Ảnh nền" path="privacy.image" value={doc.privacy.image} fallback={DEFAULT_PICTURES.privacy} onChange={(image) => set('privacy', { image })} />
      </LandingBlock>

      <LandingBlock id="khoi-ket" title="Kêu gọi cuối trang">
        <TextField label="Tiêu đề" path="closing.title" value={doc.closing.title} max={LIMIT.title} required onChange={(title) => set('closing', { title })} />
        <TextField label="Đoạn văn" path="closing.body" value={doc.closing.body} max={LIMIT.body} multiline onChange={(body) => set('closing', { body })} />
        <LandingImageField label="Ảnh nền" path="closing.image" value={doc.closing.image} fallback={DEFAULT_PICTURES.closing} onChange={(image) => set('closing', { image })} />
      </LandingBlock>

      <LandingBlock id="khoi-chan-trang" title="Chân trang" description="Liên kết chân trang cố định (công cụ, điều khoản, quyền riêng tư, xử lý dữ liệu).">
        <TextField label="Dòng giới thiệu" path="footer.tagline" value={doc.footer.tagline} max={LIMIT.title} onChange={(tagline) => set('footer', { tagline })} />
      </LandingBlock>
    </div>
  )
}

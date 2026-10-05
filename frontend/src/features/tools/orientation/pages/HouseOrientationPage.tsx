import { useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ToolBoard, ToolLeaveGuard, ToolSegments } from '@/features/tools/hub'
import { useThemeTokens } from '@/hooks'
import { themeTokens } from '@/styles/tokens'
import { AgePanel } from '../components/AgePanel'
import { ExportPanel } from '../components/ExportPanel'
import { MethodPanel } from '../components/MethodPanel'
import { OrientationStage } from '../components/OrientationStage'
import { ResultPanel } from '../components/ResultPanel'
import { SolarPanel } from '../components/SolarPanel'
import { SourcePicker } from '../components/SourcePicker'
import { TargetsPanel } from '../components/TargetsPanel'
import { TechPanel } from '../components/TechPanel'
import { useOrientation } from '../hooks/useOrientation'
import { useOrientationSource } from '../hooks/useOrientationSource'
import type { Point, UxMode } from '../types/orientation.types'
import { compassPalette } from '../utils/compass-palette'
import { hasResult, overlayCompass } from '../utils/compass-view'
import type { OrientationState } from '../utils/orientation-state'
import { legendLines, measurements, targetLabel } from '../utils/orientation-summary'
import { readSolar, type SolarInput } from '../utils/sun-exposure'

/** Trục mới dài bằng ngần này cạnh ngắn của ảnh — đủ thấy rõ, không che hết bản vẽ. */
const AXIS_SHARE = 0.16

const MODES: { value: UxMode; label: string; icon: string }[] = [
  { value: 'HOMEOWNER', label: 'Gia chủ', icon: 'house' },
  { value: 'PROFESSIONAL', label: 'Chuyên môn', icon: 'rulers' },
]

/** Câu nói rõ còn thiếu gì để ra số — không bao giờ để ô kết quả trống câm. */
function missingStep(state: OrientationState, hasImage: boolean): string | null {
  const main = measurements(state)[0]
  if (!main || main.azimuth !== null) return null
  if (!state.anchor) {
    if (state.method === 'DRAWING') return 'Chạm vào ký hiệu Bắc trên bản vẽ để bắt đầu.'
    if (state.method === 'DEVICE') return 'Bấm “Bắt đầu đo”, đứng yên rồi chốt số đo.'
    return 'Nhập số độ đã biết.'
  }
  return hasImage ? `Đặt trục ${targetLabel(main.target).toLowerCase()} trên ảnh.` : 'Chọn đối tượng đã có số đo.'
}

/**
 * HƯỚNG NHÀ & LA BÀN (spec v1.1) — đo hướng bằng la bàn máy, số đã biết, hoặc
 * mũi tên Bắc trên bản vẽ; đặt la bàn lên ảnh / PDF và lưu ra tệp mới. Phần
 * "theo tuổi" tách riêng, mặc định tắt. Mọi thứ chỉ nằm trong RAM của tab.
 */
export default function HouseOrientationPage() {
  const files = useOrientationSource()
  const orientation = useOrientation()
  const tokens = useThemeTokens()
  const palette = useMemo(() => compassPalette(tokens), [tokens])
  const [solar, setSolar] = useState<SolarInput | null>(null)
  const [exporting, setExporting] = useState(false)

  const { source } = files
  const { state, dispatch } = orientation
  const view = source && source.kind !== 'none' ? source.view : null

  // Nguồn mới (kể cả đổi trang PDF) là toạ độ mới: điểm đã đặt trên nguồn cũ vô nghĩa.
  const [seen, setSeen] = useState(source)
  if (seen !== source) {
    setSeen(source)
    orientation.reset(view ? { width: view.width, height: view.height } : null)
  }

  const solarReading = useMemo(() => readSolar(solar), [solar])
  const sun = solarReading && solarReading.now.elevation > 0 ? solarReading.now.azimuth : null
  const busy = files.loading || exporting

  const labelOf = (id: string) => {
    const target = state.targets.find((item) => item.id === id)
    return target ? targetLabel(target) : ''
  }
  const anchorId = state.anchor && state.anchor.source !== 'DRAWING' ? state.anchor.targetId : state.activeId
  const main = measurements(state)[0]
  const frontage = measurements(state).find((item) => item.target.type === 'HOUSE_FRONTAGE')

  const onPlace = (at: Point) => {
    if (!view) return
    const length = AXIS_SHARE * Math.min(view.width, view.height)
    if (state.method === 'DRAWING' && state.step === 'north') dispatch({ type: 'place-north', at, length })
    else if (state.step === 'door') dispatch({ type: 'place-door', at, length })
    else dispatch({ type: 'place-axis', at, length })
  }

  const build = async (format: 'image' | 'pdf') => {
    if (!source) throw new Error('Chưa có nguồn.')
    const { exportOrientation } = await import('../services/orientation-export')
    // Tệp gửi đi in ra giấy / mở ở máy khác: luôn dùng bảng màu sáng, không theo theme đang xem.
    return exportOrientation({ state, source, palette: compassPalette(themeTokens.light), legend: legendLines(state, new Date()), format, labelOf, sun })
  }

  const modeSwitch = (
    <div className="erp-orient-head">
      <ToolSegments label="Chế độ hiển thị" value={state.mode} options={MODES} disabled={busy} onChange={(mode) => dispatch({ type: 'mode', mode })} />
      {source ? (
        <Button variant="link" className="erp-orient-actions__link" disabled={busy} onClick={files.clear}>
          <Icon name="arrow-left-right" className="me-2" />
          Đổi ảnh / nguồn
        </Button>
      ) : null}
    </div>
  )

  if (!source) {
    return (
      <ToolBoard>
        {modeSwitch}
        <SourcePicker loading={files.loading} rejected={files.rejected} onDismissRejected={files.dismissRejected} onFiles={(list) => void files.addFiles(list)} onNone={files.chooseNone} />
      </ToolBoard>
    )
  }

  const showStandalone = !view || !overlayCompass(state, view)

  return (
    <>
      <ToolLeaveGuard active={hasResult(state) || state.trace.shapes.length > 0} />
      <ToolBoard
        sideLabel="Kết quả đo"
        side={
          <>
            <ResultPanel state={state} palette={palette} missing={missingStep(state, Boolean(view))} showCompass={showStandalone} sun={sun} />
            <ExportPanel
              blocked={hasResult(state) ? null : 'Chưa có số đo để lưu.'}
              sourceKind={source.kind}
              disabled={files.loading}
              onBuild={build}
              onBusy={setExporting}
            />
            <AgePanel azimuth={main?.azimuth ?? null} targetLabel={main ? targetLabel(main.target) : 'Mặt tiền'} />
            <SolarPanel reading={solarReading} front={frontage?.azimuth ?? null} frontLabel={frontage ? targetLabel(frontage.target) : 'Mặt tiền nhà'} onChange={setSolar} />
          </>
        }
      >
        {modeSwitch}
        {source.kind !== 'none' ? (
          <OrientationStage
            source={source}
            state={state}
            palette={palette}
            sun={sun}
            busy={busy}
            canUndo={orientation.canUndo}
            canRedo={orientation.canRedo}
            labelOf={labelOf}
            dispatch={dispatch}
            checkpoint={orientation.checkpoint}
            undo={orientation.undo}
            redo={orientation.redo}
            onPlace={onPlace}
            onPage={(index) => void files.choosePage(index)}
          />
        ) : null}
        <MethodPanel state={state} hasImage={Boolean(view)} disabled={busy} anchorLabel={labelOf(anchorId)} dispatch={dispatch} />
        <TargetsPanel state={state} hasImage={Boolean(view)} disabled={busy} dispatch={dispatch} />
        {state.mode === 'PROFESSIONAL' ? <TechPanel state={state} source={source} disabled={busy} dispatch={dispatch} checkpoint={orientation.checkpoint} /> : null}
      </ToolBoard>
    </>
  )
}

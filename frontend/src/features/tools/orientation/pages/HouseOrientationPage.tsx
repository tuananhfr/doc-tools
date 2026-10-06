import { useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ToolBoard, ToolLeaveGuard, ToolSegments } from '@/features/tools/hub'
import { useThemeTokens } from '@/hooks'
import { themeTokens } from '@/styles/tokens'
import { AgePanel } from '../components/AgePanel'
import { ExportPanel } from '../components/ExportPanel'
import { LiveCompass, type LockedFacing } from '../components/LiveCompass'
import { MethodPanel } from '../components/MethodPanel'
import { OrientationStage } from '../components/OrientationStage'
import { ResultPanel } from '../components/ResultPanel'
import { SolarPanel } from '../components/SolarPanel'
import { SourcePicker } from '../components/SourcePicker'
import { TargetsPanel } from '../components/TargetsPanel'
import { TechPanel } from '../components/TechPanel'
import { useOrientation } from '../hooks/useOrientation'
import { useOrientationSource } from '../hooks/useOrientationSource'
import { useOwners } from '../hooks/useOwners'
import type { Point, UxMode } from '../types/orientation.types'
import { targetAzimuth } from '../utils/azimuth'
import { compassPalette } from '../utils/compass-palette'
import { hasResult, overlayCompass, type CompassExtras } from '../utils/compass-view'
import { mountainOf, sittingOf } from '../utils/luopan'
import type { OrientationState } from '../utils/orientation-state'
import { legendLines, measurements, targetLabel } from '../utils/orientation-summary'
import { readSolar, type SolarInput } from '../utils/sun-exposure'

/** Trục mới dài bằng ngần này cạnh ngắn của ảnh — đủ thấy rõ, không che hết bản vẽ. */
const AXIS_SHARE = 0.16

const MODES: { value: UxMode; label: string; icon: string }[] = [
  { value: 'HOMEOWNER', label: 'Gia chủ', icon: 'house' },
  { value: 'PROFESSIONAL', label: 'Chuyên môn', icon: 'rulers' },
]

const PROJECT_NORTH_WARNING =
  'Đang đo theo Bắc dự án — không phải phương thật, nên không đọc hợp / kỵ theo tuổi và không tính nắng được. Đổi sang Bắc thật hoặc Bắc từ ở phần kỹ thuật.'

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
 * HƯỚNG NHÀ & LA BÀN (spec v1.1). Gia chủ mở ra là la bàn sống (24 sơn, Hướng / Toạ,
 * vòng sao theo tuổi); ảnh / bản vẽ là bước phụ. Chuyên môn giữ đủ nhiều đối tượng,
 * mặt trời, số liệu kỹ thuật (spec §2). Mọi thứ chỉ nằm trong RAM của tab.
 */
export default function HouseOrientationPage() {
  const files = useOrientationSource()
  const orientation = useOrientation()
  const owners = useOwners()
  const tokens = useThemeTokens()
  const palette = useMemo(() => compassPalette(tokens), [tokens])
  const [solar, setSolar] = useState<SolarInput | null>(null)
  const [exporting, setExporting] = useState(false)
  const [picking, setPicking] = useState(false)

  const { source } = files
  const { state, dispatch } = orientation
  const view = source && source.kind !== 'none' ? source.view : null
  const professional = state.mode === 'PROFESSIONAL'

  // Nguồn mới (kể cả đổi trang PDF) là toạ độ mới: điểm đã đặt trên nguồn cũ vô nghĩa.
  const [seen, setSeen] = useState(source)
  if (seen !== source) {
    setSeen(source)
    setPicking(false)
    orientation.reset(view ? { width: view.width, height: view.height } : null)
  }

  // Bắc dự án là quy ước của bản vẽ, lệch phương thật một góc bất kỳ — sao theo tuổi và mặt trời tính theo nó là sai.
  const projectNorth = state.northReference === 'PROJECT'
  const solarReading = useMemo(() => (professional && !projectNorth ? readSolar(solar) : null), [professional, projectNorth, solar])
  const extras: CompassExtras = {
    sun: solarReading && solarReading.now.elevation > 0 ? solarReading.now.azimuth : null,
    stars: projectNorth ? null : owners.stars,
  }
  const busy = files.loading || exporting

  const labelOf = (id: string) => {
    const target = state.targets.find((item) => item.id === id)
    return target ? targetLabel(target) : ''
  }
  // Có ảnh: số độ đã biết là mốc chung, gắn cố định vào một đối tượng. Không ảnh: số đi theo đối tượng đang chọn.
  const anchorId = view && state.anchor && state.anchor.source !== 'DRAWING' ? state.anchor.targetId : state.activeId
  const main = measurements(state)[0]
  const frontage = measurements(state).find((item) => item.target.type === 'HOUSE_FRONTAGE')
  const home = state.targets[0]
  const homeAzimuth = targetAzimuth(home, state.anchor, state.targets)
  const homeSource = state.anchor && state.anchor.source !== 'DRAWING' && state.anchor.targetId === home.id ? state.anchor.source : 'MANUAL'
  const locked: LockedFacing | null = homeAzimuth === null ? null : { azimuth: homeAzimuth, source: homeSource }

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
    const facing = main?.azimuth ?? null
    const luopan = !professional && facing !== null ? [`Hướng ${mountainOf(facing).mountain.name} · Toạ ${mountainOf(sittingOf(facing)).mountain.name}`] : []
    // Tệp gửi đi in ra giấy / mở ở máy khác: luôn dùng bảng màu sáng, không theo theme đang xem.
    return exportOrientation({ state, source, palette: compassPalette(themeTokens.light), legend: legendLines(state, new Date(), luopan), format, labelOf, extras })
  }

  const changeMode = (mode: UxMode) => {
    dispatch({ type: 'mode', mode })
    // Gia chủ chỉ đo hướng nhà: đối tượng đang chọn ở chế độ chuyên môn không được kéo theo.
    if (mode === 'HOMEOWNER') dispatch({ type: 'activate', id: home.id })
  }

  const head = (
    <div className="erp-orient-head">
      <ToolSegments label="Chế độ hiển thị" value={state.mode} options={MODES} disabled={busy} onChange={changeMode} />
      {picking && source ? (
        <Button variant="link" className="erp-orient-actions__link" disabled={busy} onClick={() => setPicking(false)}>
          <Icon name="arrow-left" className="me-2" />
          Quay lại
        </Button>
      ) : (
        <Button variant="link" className="erp-orient-actions__link" disabled={busy} onClick={() => setPicking(true)}>
          <Icon name={view ? 'arrow-left-right' : 'image'} className="me-2" />
          {view ? 'Đổi ảnh / nguồn' : 'Đặt lên ảnh nhà / bản vẽ'}
        </Button>
      )}
    </div>
  )

  if (picking || !source) {
    return (
      <ToolBoard>
        {head}
        <SourcePicker
          loading={files.loading}
          rejected={files.rejected}
          onDismissRejected={files.dismissRejected}
          onFiles={(list) => void files.addFiles(list)}
          onNone={() => (source?.kind === 'none' ? setPicking(false) : files.chooseNone())}
        />
      </ToolBoard>
    )
  }

  const exportPanel = (
    <ExportPanel blocked={hasResult(state) ? null : 'Chưa có số đo để lưu.'} sourceKind={source.kind} disabled={files.loading} onBuild={build} onBusy={setExporting} />
  )
  const agePanel = (
    <AgePanel
      owners={owners}
      azimuth={main?.azimuth ?? null}
      targetLabel={main ? targetLabel(main.target) : 'Mặt tiền'}
      warning={projectNorth ? PROJECT_NORTH_WARNING : null}
    />
  )

  if (!professional && source.kind === 'none') {
    return (
      <>
        <ToolLeaveGuard active={hasResult(state)} />
        <ToolBoard
          sideLabel="Theo tuổi và lưu kết quả"
          side={
            <>
              {agePanel}
              {exportPanel}
            </>
          }
        >
          {head}
          <LiveCompass
            palette={palette}
            stars={extras.stars ?? null}
            locked={locked}
            disabled={busy}
            onLock={(azimuth, method, accuracy) => {
              dispatch({ type: 'activate', id: home.id })
              dispatch({ type: 'known-azimuth', azimuth, source: method, accuracy })
            }}
            onUnlock={() => {
              dispatch({ type: 'activate', id: home.id })
              dispatch({ type: 'known-azimuth', azimuth: null, source: 'MANUAL' })
            }}
          />
        </ToolBoard>
      </>
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
            <ResultPanel state={state} palette={palette} missing={missingStep(state, Boolean(view))} showCompass={showStandalone} extras={extras} />
            {exportPanel}
            {agePanel}
            {professional ? (
              <SolarPanel
                reading={solarReading}
                front={frontage?.azimuth ?? null}
                frontLabel={frontage ? targetLabel(frontage.target) : 'Mặt tiền nhà'}
                warning={projectNorth ? PROJECT_NORTH_WARNING : null}
                onChange={setSolar}
              />
            ) : null}
          </>
        }
      >
        {head}
        {source.kind !== 'none' ? (
          <OrientationStage
            source={source}
            state={state}
            palette={palette}
            extras={extras}
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
        {professional ? <TargetsPanel state={state} hasImage={Boolean(view)} disabled={busy} dispatch={dispatch} /> : null}
        {professional ? <TechPanel state={state} source={source} disabled={busy} dispatch={dispatch} checkpoint={orientation.checkpoint} /> : null}
      </ToolBoard>
    </>
  )
}

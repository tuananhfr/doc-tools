export interface CameraCrop {
  x: number
  y: number
  width: number
  height: number
}

export interface CameraPoint {
  x: number
  y: number
}

export function cameraCrop(width: number, height: number, viewWidth: number, viewHeight: number, zoom = 1): CameraCrop {
  const aspect = viewWidth / viewHeight
  const cropWidth = Math.min(width, height * aspect) / Math.max(1, zoom)
  const cropHeight = cropWidth / aspect
  return { x: (width - cropWidth) / 2, y: (height - cropHeight) / 2, width: cropWidth, height: cropHeight }
}

export function cameraPoint(point: CameraPoint, crop: CameraCrop): CameraPoint {
  return { x: ((point.x - crop.x) / crop.width) * 100, y: ((point.y - crop.y) / crop.height) * 100 }
}

export function detectionBounds(points: CameraPoint[], format: string): CameraCrop | null {
  const valid = points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
  if (valid.length < 2) return null
  // QR results contain finder centers, while linear barcodes return two scan-line endpoints.
  if (format === 'QR_CODE' && valid.length >= 3) {
    const [bottomLeft, topLeft, topRight] = valid
    valid.push({ x: bottomLeft.x + topRight.x - topLeft.x, y: bottomLeft.y + topRight.y - topLeft.y })
  }
  const left = Math.min(...valid.map(point => point.x))
  const top = Math.min(...valid.map(point => point.y))
  const right = Math.max(...valid.map(point => point.x))
  const bottom = Math.max(...valid.map(point => point.y))
  if (right < 0 || left > 100 || bottom < 0 || top > 100) return null
  const padding = format === 'QR_CODE' ? Math.max(3, (right - left) * 0.12) : 3
  const x = Math.max(0, left - padding)
  const y = Math.max(0, top - Math.max(padding, 4))
  return { x, y, width: Math.min(100, right + padding) - x, height: Math.min(100, bottom + Math.max(padding, 4)) - y }
}

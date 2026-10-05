import type { CompassShape } from '../utils/compass-geometry'
import type { CompassPalette } from '../utils/compass-palette'

interface ShapeLayerProps {
  shapes: CompassShape[]
  palette: CompassPalette
  opacity: number
}

const points = (list: { x: number; y: number }[]) => list.map((point) => `${point.x},${point.y}`).join(' ')

/** Vẽ danh sách hình (la bàn, trục, nét vẽ tay) bằng SVG — bản canvas lúc xuất là `drawShapes`, cùng một danh sách. */
export function ShapeLayer({ shapes, palette, opacity }: ShapeLayerProps) {
  return (
    <g>
      {shapes.map((shape, index) => {
        const color = palette[shape.role]
        const alpha = shape.role === 'disc' ? opacity * 0.82 : opacity
        switch (shape.kind) {
          case 'circle':
            return shape.fill ? (
              <circle key={index} cx={shape.center.x} cy={shape.center.y} r={shape.radius} fill={color} fillOpacity={alpha} />
            ) : (
              <circle key={index} cx={shape.center.x} cy={shape.center.y} r={shape.radius} fill="none" stroke={color} strokeOpacity={alpha} strokeWidth={shape.width} />
            )
          case 'line':
            return (
              <line
                key={index}
                x1={shape.from.x}
                y1={shape.from.y}
                x2={shape.to.x}
                y2={shape.to.y}
                stroke={color}
                strokeOpacity={alpha}
                strokeWidth={shape.width}
                strokeLinecap="round"
                strokeDasharray={shape.dash?.join(' ')}
              />
            )
          case 'path': {
            const Tag = shape.closed ? 'polygon' : 'polyline'
            return (
              <g key={index} strokeLinecap="round" strokeLinejoin="round">
                {shape.fill ? <Tag points={points(shape.points)} fill={color} fillOpacity={0.12 * opacity} stroke="none" /> : null}
                <Tag points={points(shape.points)} fill="none" stroke={palette.halo} strokeOpacity={opacity} strokeWidth={shape.width * 2} />
                <Tag points={points(shape.points)} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={shape.width} strokeDasharray={shape.dash?.join(' ')} />
              </g>
            )
          }
          case 'polygon':
            return <polygon key={index} points={points(shape.points)} fill={color} fillOpacity={alpha} />
          case 'text':
            return (
              <text
                key={index}
                x={shape.at.x}
                y={shape.at.y}
                fill={color}
                fillOpacity={alpha}
                stroke={palette.halo}
                strokeOpacity={alpha}
                strokeWidth={shape.size * 0.28}
                strokeLinejoin="round"
                paintOrder="stroke"
                fontSize={shape.size}
                fontWeight={shape.weight}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {shape.text}
              </text>
            )
        }
      })}
    </g>
  )
}

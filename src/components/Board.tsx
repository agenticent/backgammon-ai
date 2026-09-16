import type { GameState, MoveSource, MoveTarget, Player } from '../engine/index.ts'

export interface BoardProps {
  state: GameState
  /** Points (or the bar) holding a checker that can legally move now. */
  sources: MoveSource[]
  selected: MoveSource | null
  /** Where the selected checker may land. */
  destinations: MoveTarget[]
  onSelect: (source: MoveSource) => void
  onMoveTo: (target: MoveTarget) => void
}

const W = 1000
const H = 640
const PAD = 20
const POINT_W = 62
const POINT_H = 260
const BAR_W = 64
const TRAY_W = 70
const R = 27
const MAX_STACK = 5

const leftX = PAD
const barX = leftX + POINT_W * 6
const rightX = barX + BAR_W
const trayX = rightX + POINT_W * 6 + 16

function pointX(pointNumber: number): number {
  const column = pointNumber >= 13 ? pointNumber - 13 : 12 - pointNumber
  return (column < 6 ? leftX + column * POINT_W : rightX + (column - 6) * POINT_W) + POINT_W / 2
}

function isTop(pointNumber: number): boolean {
  return pointNumber >= 13
}

function fill(player: Player): string {
  return player === 'white' ? '#f4ede0' : '#2b2420'
}

function stroke(player: Player): string {
  return player === 'white' ? '#b9a98a' : '#0d0a08'
}

function badgeColor(player: Player): string {
  return player === 'white' ? '#2b2420' : '#f4ede0'
}

interface StackProps {
  x: number
  count: number
  player: Player
  fromTop: boolean
  edgeY: number
}

function Stack({ x, count, player, fromTop, edgeY }: StackProps) {
  const shown = Math.min(count, MAX_STACK)
  const circles = []
  for (let i = 0; i < shown; i += 1) {
    const offset = R + i * (R * 2 - 2)
    circles.push(
      <circle
        key={i}
        cx={x}
        cy={fromTop ? edgeY + offset : edgeY - offset}
        r={R}
        fill={fill(player)}
        stroke={stroke(player)}
        strokeWidth={2}
      />,
    )
  }
  const lastY = fromTop ? edgeY + R + (shown - 1) * (R * 2 - 2) : edgeY - R - (shown - 1) * (R * 2 - 2)
  return (
    <g className="stack" data-player={player} data-count={count}>
      {circles}
      {count > MAX_STACK && (
        <text
          x={x}
          y={lastY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={26}
          fontWeight={700}
          fill={badgeColor(player)}
        >
          {count}
        </text>
      )}
    </g>
  )
}

export function Board({ state, sources, selected, destinations, onSelect, onMoveTo }: BoardProps) {
  const sourceSet = new Set<MoveSource>(sources)
  const destinationSet = new Set<MoveTarget>(destinations)
  const midY = H / 2

  const points = Array.from({ length: 24 }, (_, i) => i + 1).map((n) => {
    const x = pointX(n)
    const top = isTop(n)
    const baseY = top ? PAD : H - PAD
    const tipY = top ? PAD + POINT_H : H - PAD - POINT_H
    const point = state.points[n - 1]
    const isSource = sourceSet.has(n)
    const isDestination = destinationSet.has(n)
    const isSelected = selected === n
    const clickable = isSource || isDestination
    const handleClick = () => {
      if (isDestination) onMoveTo(n)
      else if (isSource) onSelect(n)
    }
    return (
      <g
        key={n}
        className={[
          'point',
          clickable ? 'clickable' : '',
          isSource ? 'source' : '',
          isDestination ? 'destination' : '',
          isSelected ? 'selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-point={n}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={`Point ${n}${point.count ? `, ${point.count} ${point.player}` : ''}`}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleClick()
          }
        }}
      >
        <rect
          x={x - POINT_W / 2}
          y={top ? 0 : midY}
          width={POINT_W}
          height={midY}
          fill="transparent"
        />
        <polygon
          className="triangle"
          points={`${x - POINT_W / 2},${baseY} ${x + POINT_W / 2},${baseY} ${x},${tipY}`}
          fill={n % 2 === (top ? 1 : 0) ? '#a8643c' : '#e6c692'}
        />
        <text
          className="point-label"
          x={x}
          y={top ? 12 : H - 4}
          textAnchor="middle"
          fontSize={13}
          fill="#5a3a20"
        >
          {n}
        </text>
        {point.player && (
          <Stack x={x} count={point.count} player={point.player} fromTop={top} edgeY={baseY} />
        )}
        {isDestination && (
          <circle className="target" cx={x} cy={top ? PAD + POINT_H - 40 : H - PAD - POINT_H + 40} r={14} />
        )}
      </g>
    )
  })

  const barSource = sourceSet.has('bar')
  const barCenter = barX + BAR_W / 2
  const offDestination = destinationSet.has('off')
  const trayCenter = trayX + TRAY_W / 2

  return (
    <svg
      className="board"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Backgammon board"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x={0} y={0} width={W} height={H} rx={12} fill="#5b3a1e" />
      <rect x={leftX} y={PAD} width={POINT_W * 6} height={H - PAD * 2} fill="#c99a63" />
      <rect x={rightX} y={PAD} width={POINT_W * 6} height={H - PAD * 2} fill="#c99a63" />
      {points}

      <g
        className={['bar', barSource ? 'clickable source' : '', selected === 'bar' ? 'selected' : '']
          .filter(Boolean)
          .join(' ')}
        role={barSource ? 'button' : undefined}
        tabIndex={barSource ? 0 : undefined}
        aria-label={`Bar, white ${state.bar.white}, black ${state.bar.black}`}
        onClick={() => barSource && onSelect('bar')}
        onKeyDown={(event) => {
          if (barSource && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            onSelect('bar')
          }
        }}
      >
        <rect x={barX} y={0} width={BAR_W} height={H} fill="#5b3a1e" />
        {state.bar.black > 0 && (
          <Stack x={barCenter} count={state.bar.black} player="black" fromTop edgeY={PAD + 40} />
        )}
        {state.bar.white > 0 && (
          <Stack x={barCenter} count={state.bar.white} player="white" fromTop={false} edgeY={H - PAD - 40} />
        )}
      </g>

      <g
        className={['tray', offDestination ? 'clickable destination' : ''].filter(Boolean).join(' ')}
        role={offDestination ? 'button' : undefined}
        tabIndex={offDestination ? 0 : undefined}
        aria-label={`Bear-off tray, white ${state.off.white}, black ${state.off.black}`}
        onClick={() => offDestination && onMoveTo('off')}
        onKeyDown={(event) => {
          if (offDestination && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            onMoveTo('off')
          }
        }}
      >
        <rect x={trayX} y={PAD} width={TRAY_W} height={midY - PAD - 6} rx={6} fill="#3d2612" />
        <rect x={trayX} y={midY + 6} width={TRAY_W} height={midY - PAD - 6} rx={6} fill="#3d2612" />
        {Array.from({ length: state.off.black }, (_, i) => (
          <rect
            key={`b${i}`}
            x={trayX + 8}
            y={PAD + 6 + i * 18}
            width={TRAY_W - 16}
            height={14}
            rx={3}
            fill={fill('black')}
            stroke={stroke('black')}
          />
        ))}
        {Array.from({ length: state.off.white }, (_, i) => (
          <rect
            key={`w${i}`}
            x={trayX + 8}
            y={H - PAD - 20 - i * 18}
            width={TRAY_W - 16}
            height={14}
            rx={3}
            fill={fill('white')}
            stroke={stroke('white')}
          />
        ))}
        {offDestination && <circle className="target" cx={trayCenter} cy={H - PAD - 140} r={14} />}
        <text x={trayCenter} y={midY - 14} textAnchor="middle" fontSize={14} fill="#e6c692">
          {state.off.black}
        </text>
        <text x={trayCenter} y={midY + 22} textAnchor="middle" fontSize={14} fill="#e6c692">
          {state.off.white}
        </text>
      </g>
    </svg>
  )
}

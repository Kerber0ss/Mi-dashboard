import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useStore } from '../store'
import { posToStyle, renderItem } from './GridView'
import type { DashboardConfig } from '../../server/config.js'

type Item = DashboardConfig['items'][number]
type Grid = DashboardConfig['grid']

/** Minimal rect shape resolveOverlaps operates on (subset of a grid item). */
interface GridRect { id: string; x: number; y: number; w: number; h: number }

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max))

const intersects = (a: GridRect, b: GridRect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/**
 * Pure overlap resolution: sort by (y, x); each item that intersects an
 * already-placed item is pushed below it (y = collider bottom), repeated
 * until stable (guard: 100 iterations). Widths/heights are never changed.
 */
export function resolveOverlaps<T extends GridRect>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const placed: T[] = []
  for (const item of sorted) {
    let cur: T = { ...item }
    let guard = 100
    while (guard-- > 0) {
      const hit = placed.find((p) => intersects(p, cur))
      if (!hit) break
      cur = { ...cur, y: hit.y + hit.h }
    }
    placed.push(cur)
  }
  return placed
}

/** Snap a pointer position to a cell origin using the column pitch. */
export function snapToCell(
  pointer: { x: number; y: number },
  rect: DOMRect,
  grid: Grid,
  w: number,
): { x: number; y: number } {
  const cellW = (rect.width - (grid.cols - 1) * grid.gap) / grid.cols
  const pitchX = cellW + grid.gap
  const pitchY = grid.rowHeight + grid.gap
  return {
    x: clamp(Math.round((pointer.x - rect.left) / pitchX - 0.5), 0, Math.max(0, grid.cols - w)),
    y: Math.max(0, Math.round((pointer.y - rect.top) / pitchY - 0.5)),
  }
}

/** Re-apply resolveOverlaps to the current store items (moves only). */
export function applyResolvedOverlaps() {
  const s = useStore.getState()
  const originals = new Map(s.config.items.map((i) => [i.id, i]))
  for (const r of resolveOverlaps(s.config.items)) {
    const orig = originals.get(r.id)!
    if (orig.x !== r.x || orig.y !== r.y) s.moveItem(r.id, r.x, r.y)
  }
}

interface EditableCellProps {
  item: Item
  grid: Grid
  containerRef: React.RefObject<HTMLDivElement | null>
  onEditCard?: (id: string) => void
}

function EditableCell({ item, grid, containerRef, onEditCard }: EditableCellProps) {
  const removeItem = useStore((s) => s.removeItem)
  const resizeItem = useStore((s) => s.resizeItem)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  // Live resize preview (committed to the store on pointerup)
  const [preview, setPreview] = useState<{ w: number; h: number } | null>(null)
  const previewRef = useRef<{ w: number; h: number } | null>(null)
  // Click-vs-drag discrimination: a pointerdown→click with < 6px movement
  // (same threshold as the PointerSensor) opens the card editor.
  const downPos = useRef<{ x: number; y: number } | null>(null)
  // Live handlers for the active resize gesture (set by startResize, driven by
  // pointer capture on the handle element).
  const moveHandler = useRef<((ev: ReactPointerEvent<HTMLDivElement>) => void) | null>(null)
  const upHandler = useRef<((ev: ReactPointerEvent<HTMLDivElement>) => void) | null>(null)
  const w = preview?.w ?? item.w
  const h = preview?.h ?? item.h

  const setPreviewBoth = (v: { w: number; h: number } | null) => {
    previewRef.current = v
    setPreview(v)
  }

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation() // keep the pointer sensor (cell drag) out of it
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cellW = (rect.width - (grid.cols - 1) * grid.gap) / grid.cols
    const pitchX = cellW + grid.gap
    const pitchY = grid.rowHeight + grid.gap
    e.currentTarget.setPointerCapture(e.pointerId)
    setPreviewBoth({ w: item.w, h: item.h })

    const onMove = (ev: ReactPointerEvent<HTMLDivElement>) => {
      // Same snapping formula as drag: the pointer's column/row index the
      // handle is pulled into defines the new span (min 1x1, max w = cols).
      const col = Math.round((ev.clientX - rect.left) / pitchX - 0.5)
      const row = Math.round((ev.clientY - rect.top) / pitchY - 0.5)
      setPreviewBoth({
        w: clamp(col - item.x + 1, 1, Math.max(1, grid.cols - item.x)),
        h: Math.max(1, row - item.y + 1),
      })
    }
    const onUp = () => {
      const final = previewRef.current
      setPreviewBoth(null)
      if (final && (final.w !== item.w || final.h !== item.h)) {
        resizeItem(item.id, final.w, final.h)
        applyResolvedOverlaps()
      }
    }
    // Pointer capture retargets move/up events to the handle element, whose
    // declarative onPointerMove/onPointerUp delegate to these.
    moveHandler.current = onMove
    upHandler.current = onUp
  }

  const style: CSSProperties = {
    ...posToStyle(item.x, item.y, w, h, grid),
    position: 'absolute',
    touchAction: 'none',
    zIndex: isDragging ? 100 : undefined,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : null),
  }

  return (
    <div
      ref={setNodeRef}
      className={`grid-cell${isDragging ? ' cell-dragging' : ''}`}
      style={style}
      {...listeners}
      {...attributes}
      onPointerDownCapture={(e) => {
        downPos.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={(e) => {
        const down = downPos.current
        if (onEditCard && down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
          onEditCard(item.id)
        }
      }}
    >
      {renderItem(item, true)}
      <button
        type="button"
        className="cell-remove"
        title="Remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          removeItem(item.id)
        }}
      >
        ×
      </button>
      <div
        className="resize-handle"
        title="Resize"
        onPointerDown={startResize}
        onClick={(e) => e.stopPropagation()}
        onPointerMove={(e) => moveHandler.current?.(e)}
        onPointerUp={(e) => { upHandler.current?.(e); moveHandler.current = null; upHandler.current = null }}
      />
    </div>
  )
}

/** Edit-mode grid: dnd-kit DndContext + draggable/resizable cells. */
export default function EditGrid({ onEditCard }: { onEditCard?: (id: string) => void }) {
  const items = useStore((s) => s.config.items)
  const grid = useStore((s) => s.config.grid)
  const moveItem = useStore((s) => s.moveItem)
  const containerRef = useRef<HTMLDivElement>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const maxBottom = items.reduce((m, i) => Math.max(m, i.y + i.h), 1)
  const height = (maxBottom - 1) * (grid.rowHeight + grid.gap) + grid.rowHeight

  const handleDragEnd = (event: DragEndEvent) => {
    const state = useStore.getState()
    const item = state.config.items.find((i) => i.id === event.active.id)
    const rect = containerRef.current?.getBoundingClientRect()
    const activator = event.activatorEvent as PointerEvent
    if (!item || !rect || typeof activator.clientX !== 'number') return
    const pointer = { x: activator.clientX + event.delta.x, y: activator.clientY + event.delta.y }
    const { x, y } = snapToCell(pointer, rect, state.config.grid, item.w)
    moveItem(item.id, x, y)
    applyResolvedOverlaps()
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        ref={containerRef}
        className="grid-view edit-grid"
        style={{ position: 'relative', minHeight: height }}
      >
        {items.map((item) => (
          <EditableCell key={item.id} item={item} grid={grid} containerRef={containerRef} onEditCard={onEditCard} />
        ))}
      </div>
    </DndContext>
  )
}

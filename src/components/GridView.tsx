import type { CSSProperties } from 'react'
import type { DashboardConfig } from '../../server/config.js'
import LinkCard from './cards/LinkCard'
import GroupCard from './cards/GroupCard'

type Item = DashboardConfig['items'][number]
type Grid = DashboardConfig['grid']

export function posToStyle(x: number, y: number, w: number, h: number, grid: { cols: number; rowHeight: number; gap: number }): CSSProperties {
  return {
    left: `calc(${(x / grid.cols) * 100}% + ${x * grid.gap / 2}px)`,
    top: y * (grid.rowHeight + grid.gap),
    width: `calc(${(w / grid.cols) * 100}% - ${(grid.cols - w) * grid.gap / grid.cols}px)`,
    height: h * grid.rowHeight + (h - 1) * grid.gap,
  }
}

export default function GridView({ items, grid, editMode }: { items: Item[]; grid: Grid; editMode: boolean }) {
  const maxBottom = items.reduce((m, i) => Math.max(m, i.y + i.h), 1)
  const height = (maxBottom - 1) * (grid.rowHeight + grid.gap) + grid.rowHeight

  return (
    <div className="grid-view" style={{ position: 'relative', minHeight: height }}>
      {items.map((item) => (
        <div
          key={item.id}
          className="grid-cell"
          style={{ ...posToStyle(item.x, item.y, item.w, item.h, grid), position: 'absolute' }}
        >
          {item.type === 'link' ? (
            <LinkCard item={item} editMode={editMode} />
          ) : item.type === 'group' ? (
            <GroupCard item={item} editMode={editMode} />
          ) : (
            <div className="card card-widget" data-widget={item.type}>
              <span className="card-title">{item.props.title}</span>
              <span className="widget-placeholder">{item.type}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

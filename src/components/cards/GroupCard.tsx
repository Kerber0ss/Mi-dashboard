import { useStore } from '../../store'
import type { DashboardConfig } from '../../../server/config.js'

type Item = DashboardConfig['items'][number]

interface GroupCardProps {
  item: Item
  editMode: boolean
}

/**
 * Group card: title + nested list of child link titles rendered as simple rows
 * inside the card. Free drag inside groups is out of scope for v1.
 */
export default function GroupCard({ item, editMode }: GroupCardProps) {
  const items = useStore((s) => s.config.items)
  const children = (item.props.children ?? []) as string[]
  const rows = children.map((child) => {
    const target = items.find((i) => i.id === child)
    if (target) return { id: target.id, title: target.props.title || target.id, url: target.props.url }
    return { id: child, title: child, url: null }
  })

  return (
    <div className="card card-group" data-edit={editMode ? 'true' : undefined}>
      <span className="card-title group-title">{item.props.title}</span>
      <ul className="group-rows">
        {rows.map((row) => (
          <li key={row.id} className="group-row">
            {editMode || !row.url ? (
              <span>{row.title}</span>
            ) : (
              <a href={row.url} target="_blank" rel="noreferrer">
                {row.title}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

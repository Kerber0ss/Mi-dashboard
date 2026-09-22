import type { DashboardConfig } from '../../../server/config.js'
import Icon from '../Icon'

type Item = DashboardConfig['items'][number]
type LinkProps = Item['props']

interface LinkCardProps {
  item: Item
  editMode: boolean
}

export default function LinkCard({ item, editMode }: LinkCardProps) {
  const { title, url, icon, customIcon } = item.props as LinkProps
  return (
    <a
      className="card card-link"
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      draggable={editMode ? false : undefined}
      onClick={(e) => {
        if (editMode) e.preventDefault()
      }}
    >
      <Icon icon={icon} customIcon={customIcon} url={url} title={title} />
      <span className="card-title">{title}</span>
    </a>
  )
}

import type { DashboardConfig } from '../../../server/config.js'
import Icon from '../Icon'
import { useHealth } from '../../lib/health'

type Item = DashboardConfig['items'][number]
type LinkProps = Item['props']

interface LinkCardProps {
  item: Item
  editMode: boolean
}

const host = (url: string) => {
  try { return new URL(url).host } catch { return url }
}

/* NOC-блок: LED живого состояния (общий health-стор), крупное имя, хост моноширинкой. */
export default function LinkCard({ item, editMode }: LinkCardProps) {
  const { title, url, icon, customIcon } = item.props as LinkProps
  const led = useHealth(url, !editMode)

  const ledClass = led === 'up' ? 'led-up' : led === 'down' ? 'led-down' : 'led-warn'
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
      <span className={`led ${editMode ? 'led-port' : ledClass}`} aria-hidden="true" />
      <span className="card-body">
        <span className="card-title">{title}</span>
        {url && <span className="card-host mono">{host(url)}</span>}
      </span>
      <Icon icon={icon} customIcon={customIcon} url={url} title={title} size={28} />
    </a>
  )
}
import { useStore } from '../../store'
import { THEMES, type ThemeId } from '../../themes'
import Modal from '../Modal'

/**
 * Appearance settings: theme gallery (mini card mock per theme, rendered with
 * the theme's tokens for the current mode), light/dark segmented control,
 * accent color, opacity/blur sliders, background image URL.
 */
export default function AppearanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useStore((s) => s.config.theme)
  const setTheme = useStore((s) => s.setTheme)

  return (
    <Modal open={open} onClose={onClose} title="Оформление">
      <label className="field">
        <span>Тема</span>
        <div className="theme-gallery" role="listbox" aria-label="Тема">
          {Object.values(THEMES).map((def) => {
            const t = def.tokens[theme.mode] ?? def.tokens.dark
            return (
              <button
                key={def.id}
                type="button"
                role="option"
                aria-selected={theme.id === def.id}
                className={`theme-tile${theme.id === def.id ? ' active' : ''}`}
                onClick={() => setTheme({ id: def.id })}
              >
                <span className="theme-tile-bg" style={{ background: t['--bg'] }}>
                  <span
                    className="theme-tile-card"
                    style={{
                      background: t['--surface'],
                      borderColor: t['--surface-border'],
                      borderRadius: t['--radius-base'],
                      color: t['--text'],
                    }}
                  >
                    <span className="theme-tile-dot" style={{ background: theme.accent }} />
                    <span className="theme-tile-bar" style={{ background: t['--text'] }} />
                  </span>
                </span>
                <span className="theme-tile-name">{def.name}</span>
              </button>
            )
          })}
        </div>
      </label>

      <div className="field">
        <span>Режим</span>
        <div className="segmented" role="radiogroup" aria-label="Цветовой режим">
          {(['light', 'dark'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={theme.mode === m}
              className={theme.mode === m ? 'active' : ''}
              onClick={() => setTheme({ mode: m })}
            >
              {m === 'light' ? '☀️ Светлая' : '🌙 Тёмная'}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Цвет акцента</span>
          <input
            type="color"
            value={theme.accent}
            onChange={(e) => setTheme({ accent: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Прозрачность: {theme.opacity.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={theme.opacity}
            onChange={(e) => setTheme({ opacity: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Размытие: {theme.blur}px</span>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={theme.blur}
            onChange={(e) => setTheme({ blur: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="field">
        <span>Фоновое изображение (URL)</span>
        <div className="field-inline">
          <input
            type="text"
            placeholder="https://example.com/photo.jpg"
            value={theme.background ?? ''}
            onChange={(e) => setTheme({ background: e.target.value.trim() || null })}
          />
          {theme.background && (
            <button type="button" className="btn-secondary" onClick={() => setTheme({ background: null })}>
              Убрать
            </button>
          )}
        </div>
      </label>
    </Modal>
  )
}
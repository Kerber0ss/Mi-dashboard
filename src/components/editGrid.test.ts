import { describe, it, expect } from 'vitest'
import { resolveOverlaps } from './EditGrid'

const mk = (id: string, x: number, y: number, w = 2, h = 1) => ({ id, x, y, w, h })

describe('resolveOverlaps', () => {
  it('pushes overlapping item below', () => {
    const items = [mk('a', 0, 0), mk('b', 0, 0)]
    const out = resolveOverlaps(items as never)
    expect(out.find(i => i.id === 'a')!.y).toBe(0)
    expect(out.find(i => i.id === 'b')!.y).toBe(1)
  })

  it('keeps non-overlapping items untouched', () => {
    const items = [mk('a', 0, 0), mk('b', 4, 4)]
    expect(resolveOverlaps(items as never)).toEqual(items)
  })
})

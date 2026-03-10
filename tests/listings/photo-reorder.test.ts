import { describe, it, expect } from 'vitest'
import { arrayMove } from '@dnd-kit/sortable'

describe('photo reorder position logic (LIST-03)', () => {
  it('arrayMove moves item from index 2 to index 0 correctly', () => {
    const arr = ['a', 'b', 'c', 'd']
    const result = arrayMove(arr, 2, 0)
    expect(result).toEqual(['c', 'a', 'b', 'd'])
  })

  it('arrayMove moving last item to first makes it the hero photo', () => {
    const photos = [
      { id: '1', url: 'a' },
      { id: '2', url: 'b' },
      { id: '3', url: 'c' },
    ]
    const reordered = arrayMove(photos, 2, 0)
    expect(reordered[0].id).toBe('3')
  })

  it.todo('after delete and reorder, full position array write contains no gaps')
  it.todo('positions array derived from index order is contiguous after reorder')
})

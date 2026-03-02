import type { Property } from '../types/game'

export const isProperty = (space: { type: string }): space is Property => {
  return (
    space.type === 'property' ||
    space.type === 'railroad' ||
    space.type === 'utility'
  )
}

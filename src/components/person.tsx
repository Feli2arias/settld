import type { User } from '@/lib/split/types'
import { cn } from '@/lib/utils'

// Contract: PersonAvatar
// Props: user (required), size ('sm'|'md'|'lg'), className?
// Variants: tres tamaños. El color de fondo se deriva del username, así que la misma
//   persona siempre tiene el mismo color en todas las pantallas.
// States: presentacional puro
// Accessibility: aria-hidden — las iniciales son decorativas, el nombre siempre está
//   escrito al lado en texto real
// Responsive: sin cambios por breakpoint

/** Paleta de fondos para avatares, en tonos que conviven con el papel. */
const TINTS = [
  'bg-[oklch(0.90_0.09_140)] text-[oklch(0.30_0.09_145)]',
  'bg-[oklch(0.90_0.07_60)] text-[oklch(0.34_0.10_50)]',
  'bg-[oklch(0.89_0.07_250)] text-[oklch(0.34_0.10_255)]',
  'bg-[oklch(0.90_0.08_20)] text-[oklch(0.36_0.12_25)]',
  'bg-[oklch(0.91_0.09_100)] text-[oklch(0.36_0.10_95)]',
  'bg-[oklch(0.89_0.07_310)] text-[oklch(0.34_0.10_310)]'
]

const SIZES = {
  sm: 'size-8 text-[0.7rem]',
  md: 'size-10 text-xs',
  lg: 'size-14 text-base'
} as const

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()

const tintFor = (seed: string) => {
  const sum = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return TINTS[sum % TINTS.length]
}

export function PersonAvatar ({
  user,
  size = 'md',
  className
}: {
  user: Pick<User, 'name' | 'username'>
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        SIZES[size],
        tintFor(user.username),
        className
      )}
    >
      {initials(user.name)}
    </span>
  )
}

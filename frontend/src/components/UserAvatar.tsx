import { AuthUser } from '../services/auth.service'

interface Props {
  user: AuthUser | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { outer: 'w-9 h-9', text: 'text-[11px]', ring: 'ring-2' },
  md: { outer: 'w-10 h-10', text: 'text-xs', ring: 'ring-2' },
  lg: { outer: 'w-24 h-24', text: 'text-3xl', ring: 'ring-4' },
}

export function UserAvatar({ user, size = 'md', className = '' }: Props) {
  const { outer, text, ring } = sizeMap[size]
  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  const base = `${outer} rounded-full flex items-center justify-center overflow-hidden ${ring} ring-[#004643]/20 ${className}`

  if (user?.foto_profil) {
    return (
      <div className={base} style={{ background: '#004643' }}>
        <img
          src={user.foto_profil}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`${base} bg-[#004643]`}>
      <span className={`${text} font-extrabold text-[#f9bc60]`}>{initials}</span>
    </div>
  )
}

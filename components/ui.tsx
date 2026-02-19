'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Card({ title, children, accentColor }: { title?: string; children: React.ReactNode; accentColor?: string }) {
  return (
    <article
      className="relative overflow-hidden rounded-2xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
    >
      {accentColor && (
        <div
          className="pointer-events-none absolute left-0 top-0 h-[2px]"
          style={{ width: '35%', background: accentColor, borderRadius: '0 0 4px 0' }}
        />
      )}
      {title && (
        <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: 'var(--text-dim)', marginBottom: '12px' }}>
          {title}
        </p>
      )}
      {children}
    </article>
  )
}

// ── Icon components ──────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" opacity={active ? 0.15 : 1}/>
      <path d="M3 9l9-7 9 7" fill="none"/>
      <polyline points="9 22 9 12 15 12 15 22" fill="none"/>
    </svg>
  )
}
function RouteIcon({ active }: { active: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/>
      <circle cx="18" cy="18" r="3"/>
      <path d="M6 9v5a2 2 0 002 2h8"/>
    </svg>
  )
}
function LiveIcon({ active }: { active: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" fill={active ? 'currentColor' : 'none'}/>
      <path d="M8.93 6.35a6 6 0 000 11.3M15.07 6.35a6 6 0 010 11.3"/>
    </svg>
  )
}
function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0}/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  )
}
function FareIcon({ active }: { active: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.1 : 0}/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )
}
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0}/>
    </svg>
  )
}

const tabs = [
  { href: '/',       label: 'Home',    Icon: HomeIcon  },
  { href: '/route',  label: 'Route',   Icon: RouteIcon },
  { href: '/live',   label: 'Live',    Icon: LiveIcon  },
  { href: '/map',    label: 'Map',     Icon: MapIcon   },
  { href: '/fare',   label: 'Fare',    Icon: FareIcon  },
  { href: '/user',   label: 'Profile', Icon: UserIcon  },
]

export function BottomTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-6 pt-3"
      style={{
        background: 'linear-gradient(to top, var(--bg) 55%, transparent)',
      }}
    >
      <div
        className="mx-auto flex w-full max-w-md items-center justify-around rounded-2xl px-1.5 py-1.5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-1 rounded-xl px-3 py-2"
              style={{
                color: active ? 'var(--text)' : 'var(--text-dim)',
                background: active ? 'var(--surface3)' : 'transparent',
                minWidth: 0,
              }}
            >
              {/* Active indicator dot */}
              {active && (
                <span
                  className="absolute -top-0.5 left-1/2 h-0.5 w-4 rounded-full"
                  style={{
                    background: 'var(--text)',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
              <Icon active={active} />
              <span style={{ fontSize: '9px', fontWeight: active ? 600 : 400, letterSpacing: '0.01em' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

import type { ReactNode } from 'react'
import { AlertTriangle, Info, RefreshCw, WifiOff, type LucideIcon } from 'lucide-react'
import { formatClock } from '../lib/time'

/** Glas-Karte mit optionalem Titel, Symbol und Aktion rechts oben */
export function Card({
  title,
  icon: Icon,
  action,
  children,
  className = '',
  delay = 0,
}: {
  title?: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <section
      className={`glass animate-rise rounded-[1.75rem] p-5 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      aria-label={title}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2 text-[0.8rem] font-semibold tracking-wide text-muted uppercase">
              {Icon && <Icon size={16} strokeWidth={2.2} className="text-navy-700" aria-hidden />}
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="animate-rise mb-5 flex items-end justify-between gap-4 px-1">
      <div>
        {subtitle && <p className="text-sm font-medium text-muted">{subtitle}</p>}
        <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-navy-950">{title}</h1>
      </div>
      {action}
    </header>
  )
}

type Tone = 'info' | 'warn' | 'error'
const toneStyles: Record<Tone, string> = {
  info: 'bg-navy-50/80 text-navy-900 border-navy-100',
  warn: 'bg-amber-50/85 text-amber-900 border-amber-200/70',
  error: 'bg-red-50/85 text-red-900 border-red-200/70',
}

/** Klarer Hinweis, z. B. wenn Daten nicht verfügbar sind */
export function Notice({ tone = 'info', title, children, action }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode }) {
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-2xl border p-4 text-sm ${toneStyles[tone]}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="mt-0.5 leading-relaxed opacity-90">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry, offline }: { message: string; onRetry?: () => void; offline?: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl bg-red-50/70 px-4 py-6 text-center text-sm text-red-900">
      {offline ? <WifiOff size={22} aria-hidden /> : <AlertTriangle size={22} aria-hidden />}
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} icon={RefreshCw}>
          Erneut versuchen
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Wird geladen">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-12" style={{ opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  icon: Icon,
  type = 'button',
  disabled,
  href,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: LucideIcon
  type?: 'button' | 'submit'
  disabled?: boolean
  href?: string
  className?: string
}) {
  const styles = {
    primary: 'bg-navy-800 text-white shadow-lg shadow-navy-900/20 hover:bg-navy-700',
    secondary: 'bg-white/80 text-navy-900 border border-navy-100 hover:bg-white',
    ghost: 'text-navy-700 hover:bg-navy-50',
  }[variant]
  const cls = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-semibold transition duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${styles} ${className}`
  const content = (
    <>
      {Icon && <Icon size={18} aria-hidden />}
      {children}
    </>
  )
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    )
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  )
}

export function UpdatedAt({ at, loading, onRefresh }: { at: Date | null; loading?: boolean; onRefresh?: () => void }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-muted hover:bg-white/60"
      aria-label="Jetzt aktualisieren"
    >
      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden />
      {at ? `Stand ${formatClock(at)}` : 'Lädt …'}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-full bg-navy-900/6 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-full px-4 text-sm font-semibold transition duration-300 ${
            value === o.value ? 'bg-white text-navy-900 shadow-sm' : 'text-muted hover:text-navy-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

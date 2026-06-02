import type { ReactNode } from 'react'

interface TabDef<T extends string> { id: T; label: string; icon?: ReactNode }

interface Props<T extends string> {
  tabs: readonly TabDef<T>[]
  active: T
  onChange: (t: T) => void
}

export default function TabBar<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            active === t.id ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
          }`}>
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  )
}

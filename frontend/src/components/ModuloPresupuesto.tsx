import { DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fmt, APORTE_ESTATAL_ANUAL } from '../utils'

// ─── Datos reales SERVEL — Gastos totales mensuales 2025 ─────────────────────
// Fuente: portaltransparencia.cl PP007 — Módulo 12 Gastos Q4 2025
const presupuestoData = [
  { mes: 'Ene', estatal: 56_633_189 + 58_462_232 + 11_781_754, cotizaciones: 1_201_730 + 1_700_000 },
  { mes: 'Feb', estatal: 48_555_132 + 25_631_239 +  5_871_778, cotizaciones: 2_403_466 + 2_300_008 },
  { mes: 'Mar', estatal: 34_947_637 + 27_524_310 + 25_183_082, cotizaciones: 1_201_733 + 1_700_006 },
  { mes: 'Abr', estatal: 28_913_965 +  3_990_144 + 18_558_390, cotizaciones: 0 },
  { mes: 'May', estatal: 37_429_775 + 22_411_641 +  7_795_405, cotizaciones: 0 },
  { mes: 'Jun', estatal: 36_694_774 + 27_186_310 +  7_577_170, cotizaciones: 1_530_535 + 1_700_006 },
  { mes: 'Jul', estatal: 44_633_427 + 45_953_490 +  9_527_218, cotizaciones: 0 },
  { mes: 'Ago', estatal: 21_011_213 + 11_024_206 +  4_583_270, cotizaciones: 0 },
  { mes: 'Sep', estatal: 28_752_855 + 22_551_473 + 22_055_237, cotizaciones: 0 },
  { mes: 'Oct', estatal: 59_551_077 +  9_336_895 + 48_831_977, cotizaciones: 0 },
  { mes: 'Nov', estatal: 42_770_701 +  5_641_443 +  2_767_166, cotizaciones: 0 },
  { mes: 'Dic', estatal: 18_656_152 +  6_737_738 +  6_249_689, cotizaciones: 0 },
]

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
      <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function ModuloPresupuesto() {
  const totalEstatal = presupuestoData.reduce((s, d) => s + d.estatal, 0)
  const totalCotiz   = presupuestoData.reduce((s, d) => s + d.cotizaciones, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<DollarSign size={20} />}
          label="Gasto total 2025 (SERVEL)"
          value={fmt(totalEstatal + totalCotiz)}
          sub="Personal + Bienes + Admin + Actividades"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Gasto operacional 2025"
          value={fmt(totalEstatal)}
          sub="Fuente: CSV SERVEL 2025-4"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Actividades Género + Juvenil"
          value={fmt(totalCotiz)}
          sub="Fomento Participación Femenina/Juvenil"
        />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Gastos Mensuales 2025 — Operacional vs Actividades (Fuente: SERVEL)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={presupuestoData} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Legend />
            <Bar dataKey="estatal"      name="Operacional (Personal+Bienes+Admin)" fill="#003087" radius={[4,4,0,0]} />
            <Bar dataKey="cotizaciones" name="Actividades Género+Juvenil"          fill="#22d3ee" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-700">
        <strong>Fuente:</strong> SERVEL PP007 — Módulo 12 Gastos 2025 (CSV Q4). Aporte estatal anual estimado: {fmt(APORTE_ESTATAL_ANUAL)}.
        Los datos de 2026 se actualizan con el módulo Análisis Histórico.
      </div>
    </div>
  )
}

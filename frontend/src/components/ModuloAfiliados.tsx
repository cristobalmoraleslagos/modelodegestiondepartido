import { Users, AlertTriangle, MapPin, ShieldAlert } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fmt } from '../utils'

// ─── Datos reales SERVEL PP007 — Módulos 22, 23, 03 ─────────────────────────
// Fuente: portaltransparencia.cl — Información Estadística participación política Q1 2026
// Módulo 22: Requisitos y procedimientos para nuevas afiliaciones y número de afiliados
// Módulo 23: Rangos Etareos — trimestre Ene-Mar 2026
// Módulo 03: Regiones y domicilio sedes — Oct-Dic 2025

const TOTAL_MILITANTES = 44_997
const MUJERES          = 20_840   // 46.3%
const HOMBRES          = 24_157   // 53.7%

// Rangos etareos Q1 2026 — fuente: CSV Información_Estadística...Rangos_Etareos Q1 2026
const RANGOS_ETAREOS = [
  { rango: '18–19', mujeres: 18,    hombres: 33,    total: 51    },
  { rango: '20–24', mujeres: 218,   hombres: 282,   total: 500   },
  { rango: '25–29', mujeres: 1_320, hombres: 1_624, total: 2_944 },
  { rango: '30–34', mujeres: 1_793, hombres: 2_132, total: 3_925 },
  { rango: '35–39', mujeres: 1_874, hombres: 2_222, total: 4_096 },
  { rango: '40–44', mujeres: 1_731, hombres: 1_984, total: 3_715 },
  { rango: '45–49', mujeres: 1_666, hombres: 1_936, total: 3_602 },
  { rango: '50–54', mujeres: 1_991, hombres: 2_296, total: 4_287 },
  { rango: '55–59', mujeres: 1_977, hombres: 2_246, total: 4_223 },
  { rango: '60–64', mujeres: 2_231, hombres: 2_539, total: 4_770 },
  { rango: '65–69', mujeres: 1_888, hombres: 2_157, total: 4_045 },
  { rango: '70–74', mujeres: 1_516, hombres: 1_723, total: 3_239 },
  { rango: '75–79', mujeres: 1_164, hombres: 1_366, total: 2_530 },
  { rango: '80+',   mujeres: 1_453, hombres: 1_617, total: 3_070 },
]

// % juvenil (18–29): 51 + 500 + 2944 = 3495 / 44997 = 7.8%
const TOTAL_JUVENIL  = 51 + 500 + 2_944
const PCT_JUVENIL    = Math.round((TOTAL_JUVENIL / TOTAL_MILITANTES) * 100 * 10) / 10
// % adulto mayor (65+): 4045 + 3239 + 2530 + 3070 = 12884 / 44997 = 28.6%
const TOTAL_SENIOR   = 4_045 + 3_239 + 2_530 + 3_070
const PCT_SENIOR     = Math.round((TOTAL_SENIOR  / TOTAL_MILITANTES) * 100 * 10) / 10

// Sedes — Módulo 03, Oct-Dic 2025
const SEDES = [
  { region: 'Antofagasta',            comuna: 'Calama',               direccion: 'Perú 2001' },
  { region: 'Atacama',                comuna: 'Copiapó',              direccion: 'Rodríguez 440' },
  { region: 'Valparaíso',             comuna: 'Quillota',             direccion: 'Manuel Rodríguez 35' },
  { region: 'Valparaíso',             comuna: 'Valparaíso',           direccion: 'Aldunate 1666' },
  { region: 'Valparaíso',             comuna: 'San Antonio',          direccion: 'Lautaro 1661' },
  { region: 'Metropolitana',          comuna: 'Santiago',             direccion: 'Vicuña Mackenna 31 (Sede Central)' },
  { region: 'Metropolitana',          comuna: 'Maipú',                direccion: 'Pasaje Riquelme 3164' },
  { region: 'Metropolitana',          comuna: 'Pudahuel',             direccion: 'San Pablo 9059' },
  { region: 'Metropolitana',          comuna: 'Renca',                direccion: 'La Marquesita 3908' },
  { region: 'Metropolitana',          comuna: 'Conchalí',             direccion: 'Manizales 1890' },
  { region: 'Metropolitana',          comuna: 'Lo Prado',             direccion: 'Doctor Valencia 6069' },
  { region: 'Metropolitana',          comuna: 'Cerro Navia',          direccion: 'Clorinda Silva 1975' },
  { region: 'Metropolitana',          comuna: 'Macul',                direccion: 'Los Olmos 3849' },
  { region: 'Metropolitana',          comuna: 'La Pintana',           direccion: 'Rey Don Felipe 1481' },
  { region: 'Metropolitana',          comuna: 'Lo Espejo',            direccion: 'Avda. Salvador Allende 3621' },
  { region: 'Metropolitana',          comuna: 'Pedro Aguirre Cerda',  direccion: 'La Coruña 4806' },
  { region: 'Metropolitana',          comuna: 'Pedro Aguirre Cerda',  direccion: 'La Coruña 4812' },
  { region: 'Metropolitana',          comuna: 'San Miguel',           direccion: 'Miguel Luis Cerda 5525' },
  { region: "O'Higgins",              comuna: 'Rancagua',             direccion: 'Zañartu 656' },
  { region: "O'Higgins",              comuna: 'Graneros',             direccion: 'Lautaro 187' },
  { region: "O'Higgins",              comuna: 'San Fernando',         direccion: 'Manuel Rodríguez 195' },
  { region: 'Maule',                  comuna: 'Talca',                direccion: '5 Oriente 932' },
  { region: 'Ñuble',                  comuna: 'Chillán',              direccion: 'Brasil 985' },
  { region: 'Biobío',                 comuna: 'Coronel',              direccion: 'Lautaro 149' },
  { region: 'Araucanía',             comuna: 'Temuco',               direccion: 'Manuel Montt 1100' },
  { region: 'Los Ríos',              comuna: 'Valdivia',             direccion: 'Juana de Arcos 1823' },
  { region: 'Los Lagos',             comuna: 'Puerto Montt',         direccion: 'Rengifo 415' },
  { region: 'Aysén',                 comuna: 'Coyhaique',            direccion: 'Las Lengas 1184' },
  { region: 'Magallanes',            comuna: 'Punta Arenas',         direccion: 'Chiloé 1258' },
]

// Sanciones SERVEL — Módulo 21, fuente: CSVs sanciones PP007
// Infracción artículos 39, 41 y 44 Ley 18.603 en tres períodos
const SANCIONES = [
  {
    año: 2019,
    trimestre: 'Jul–Sep',
    fechaResolucion: '25/07/2019',
    infraccion: 'Infringe art. 39, 41 y 44 en relación con art. 60 y 65 de la Ley 18.603',
    tipo: 'Multa',
    url: 'http://pcchile.cl/documentos/facturas/julsep2019/Resolucion_0299.pdf',
  },
  {
    año: 2021,
    trimestre: 'Oct–Dic',
    fechaResolucion: '09/11/2021',
    infraccion: 'Infringe artículos 39, 41 y 44 de la Ley 18.603',
    tipo: 'Multa',
    url: 'https://pcchile.cl/documentos/Sanción_Res_1130',
  },
  {
    año: 2022,
    trimestre: 'Oct–Dic',
    fechaResolucion: '08/09/2022',
    infraccion: 'Infringe artículos 39, 41 y 44 de la Ley 18.603',
    tipo: 'Multa',
    url: 'https://pcchile.cl/documentos/sanción_0624.pdf',
  },
]

const PIE_DATA = [
  { name: 'Mujeres', value: MUJERES, color: '#a855f7' },
  { name: 'Hombres', value: HOMBRES, color: '#6366f1' },
]

export default function ModuloAfiliados() {
  const sedesRM = SEDES.filter(s => s.region === 'Metropolitana')
  const sedesRegiones = SEDES.filter(s => s.region !== 'Metropolitana')

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            icon: <Users size={20} />,
            label: 'Total militantes',
            value: TOTAL_MILITANTES.toLocaleString('es-CL'),
            sub: 'Fuente: SERVEL PP007 Q1 2026',
            color: 'indigo',
          },
          {
            icon: <Users size={20} />,
            label: 'Mujeres afiliadas',
            value: `${MUJERES.toLocaleString('es-CL')} (46.3%)`,
            sub: 'Paridad por debajo de 50%',
            color: 'purple',
          },
          {
            icon: <Users size={20} />,
            label: 'Militantes jóvenes (18–29)',
            value: `${TOTAL_JUVENIL.toLocaleString('es-CL')} (${PCT_JUVENIL}%)`,
            sub: 'Solo 500 militantes entre 20–24 años',
            color: 'amber',
          },
          {
            icon: <Users size={20} />,
            label: 'Mayores de 65 años',
            value: `${TOTAL_SENIOR.toLocaleString('es-CL')} (${PCT_SENIOR}%)`,
            sub: 'Partido con perfil etario envejecido',
            color: 'slate',
          },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-3">
            <div className={`p-3 rounded-xl bg-${k.color}-50 text-${k.color}-600`}>{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-semibold text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerta perfil juvenil */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Alerta de representación juvenil — solo {PCT_JUVENIL}% de militantes tienen 18–29 años</p>
          <p className="text-xs mt-0.5">
            El grupo etario 20–24 cuenta con apenas 500 militantes, frente a 4.770 en el tramo 60–64 (el más numeroso).
            Riesgo de descontinuidad generacional — considerar programas de captación juvenil.
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-3 gap-4">
        {/* Distribución etaria */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Distribución por Rango Etario</h2>
          <p className="text-xs text-slate-400 mb-4">Fuente: SERVEL PP007 — Módulo 23, Q1 2026</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={RANGOS_ETAREOS} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              <XAxis dataKey="rango" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => v.toLocaleString('es-CL')} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => v.toLocaleString('es-CL')} />
              <Legend />
              <Bar dataKey="mujeres" name="Mujeres" fill="#a855f7" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="hombres" name="Hombres" fill="#6366f1" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución género */}
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Distribución por Género</h2>
          <p className="text-xs text-slate-400 mb-4">Total: {TOTAL_MILITANTES.toLocaleString('es-CL')}</p>
          <div className="flex-1 flex items-center justify-center">
            <PieChart width={180} height={180}>
              <Pie data={PIE_DATA} cx={90} cy={90} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${Math.round(value / TOTAL_MILITANTES * 100)}%`} labelLine={false} fontSize={11}>
                {PIE_DATA.map((_, i) => <Cell key={i} fill={PIE_DATA[i].color} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2 mt-2">
            {PIE_DATA.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="font-medium text-slate-800">{d.value.toLocaleString('es-CL')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla etaria detallada */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Detalle por Rango Etario — Q1 2026</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Rango etario', 'Mujeres', 'Hombres', 'Total', '% del total', '% Mujeres'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RANGOS_ETAREOS.map((r, i) => {
                const pct = (r.total / TOTAL_MILITANTES * 100).toFixed(1)
                const pctM = (r.mujeres / r.total * 100).toFixed(1)
                const esJuvenil = ['18–19', '20–24', '25–29'].includes(r.rango)
                return (
                  <tr key={i} className={`border-b border-slate-50 last:border-0 ${esJuvenil ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {r.rango}
                      {esJuvenil && <span className="ml-2 text-xs text-amber-600 font-normal">juvenil</span>}
                    </td>
                    <td className="py-3 px-4 text-purple-700">{r.mujeres.toLocaleString('es-CL')}</td>
                    <td className="py-3 px-4 text-indigo-700">{r.hombres.toLocaleString('es-CL')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.total.toLocaleString('es-CL')}</td>
                    <td className="py-3 px-4 text-slate-500">{pct}%</td>
                    <td className="py-3 px-4 text-slate-500">{pctM}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td className="py-3 px-4 font-semibold text-slate-700">TOTAL</td>
                <td className="py-3 px-4 font-bold text-purple-700">{MUJERES.toLocaleString('es-CL')}</td>
                <td className="py-3 px-4 font-bold text-indigo-700">{HOMBRES.toLocaleString('es-CL')}</td>
                <td className="py-3 px-4 font-bold text-slate-800">{TOTAL_MILITANTES.toLocaleString('es-CL')}</td>
                <td className="py-3 px-4 font-semibold text-slate-700">100%</td>
                <td className="py-3 px-4 font-semibold text-slate-700">46.3%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Sedes regionales */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <MapPin size={16} className="text-indigo-500" />
            Sedes Regionales — {SEDES.length} inmuebles declarados
          </h2>
          <p className="text-xs text-slate-500 mt-1">Fuente: SERVEL PP007 — Módulo 03 Regiones y domicilio, Oct–Dic 2025</p>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-y divide-slate-50">
          {/* Región Metropolitana */}
          <div className="col-span-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Región Metropolitana — {sedesRM.length} sedes</p>
          </div>
          {sedesRM.map((s, i) => (
            <div key={i} className="px-5 py-3 border-b border-slate-50 hover:bg-slate-50">
              <p className="text-sm font-medium text-slate-800">{s.comuna}</p>
              <p className="text-xs text-slate-500">{s.direccion}</p>
            </div>
          ))}
          {/* Resto de regiones */}
          <div className="col-span-2 px-5 py-3 bg-slate-50 border-b border-slate-100 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Regiones — {sedesRegiones.length} sedes</p>
          </div>
          {sedesRegiones.map((s, i) => (
            <div key={i} className="px-5 py-3 border-b border-slate-50 hover:bg-slate-50">
              <p className="text-sm font-medium text-slate-800">{s.region} — {s.comuna}</p>
              <p className="text-xs text-slate-500">{s.direccion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sanciones históricas SERVEL */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-500" />
            Sanciones Aplicadas por SERVEL — Historial
          </h2>
          <p className="text-xs text-slate-500 mt-1">Fuente: SERVEL PP007 — Módulo 21 Sanciones · Art. 39, 41 y 44 Ley 18.603</p>
        </div>
        <div className="flex items-start gap-3 bg-red-50 border-b border-red-100 px-5 py-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold text-sm text-red-800">{SANCIONES.length} multas SERVEL registradas — artículos 39, 41 y 44 Ley 18.603</p>
            <p className="text-xs mt-0.5 text-red-700">
              Infracciones reiteradas en tres periodos distintos (2019, 2021, 2022).
              Art. 39: obligaciones contables · Art. 41: presentación balances · Art. 44: declaraciones a SERVEL.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                {['Año', 'Período', 'Fecha resolución', 'Infracción', 'Tipo de sanción', 'Resolución'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SANCIONES.map((s, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-red-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{s.año}</td>
                  <td className="py-3 px-4 text-slate-500">{s.trimestre}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{s.fechaResolucion}</td>
                  <td className="py-3 px-4 text-slate-600 text-xs">{s.infraccion}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{s.tipo}</span>
                  </td>
                  <td className="py-3 px-4">
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline truncate block max-w-[180px]">
                      Ver resolución →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

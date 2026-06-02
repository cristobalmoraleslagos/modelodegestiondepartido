/**
 * ConfigContext — Configuración global en tiempo de ejecución.
 * Permite que ModuloCargaDatos actualice VALOR_UF, MES_ACTUAL y APORTE_ESTATAL_ANUAL
 * y que el cambio se propague a todos los componentes sin recargar la página.
 *
 * Los valores de utils.ts sirven como fallback si no hay configuración guardada.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { VALOR_UF as UF_DEFAULT, MES_ACTUAL as MES_DEFAULT, APORTE_ESTATAL_ANUAL as APORTE_DEFAULT } from '../utils'

const LS_KEY = 'fp_runtime_config'

export interface AppConfig {
  valorUF:    number
  mesActual:  number
  aporteAnual: number
}

interface ConfigCtx extends AppConfig {
  updateConfig: (partial: Partial<AppConfig>) => void
}

function loadFromStorage(): AppConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Partial<AppConfig>
    return {
      valorUF:    saved.valorUF    ?? UF_DEFAULT,
      mesActual:  saved.mesActual  ?? MES_DEFAULT,
      aporteAnual: saved.aporteAnual ?? APORTE_DEFAULT,
    }
  } catch {
    return { valorUF: UF_DEFAULT, mesActual: MES_DEFAULT, aporteAnual: APORTE_DEFAULT }
  }
}

const ConfigContext = createContext<ConfigCtx>({
  valorUF: UF_DEFAULT, mesActual: MES_DEFAULT, aporteAnual: APORTE_DEFAULT,
  updateConfig: () => {},
})

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(loadFromStorage)

  function updateConfig(partial: Partial<AppConfig>) {
    setConfig(prev => {
      const next = { ...prev, ...partial }
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <ConfigContext.Provider value={{ ...config, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig(): ConfigCtx {
  return useContext(ConfigContext)
}

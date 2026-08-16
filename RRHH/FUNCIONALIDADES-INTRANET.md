# Análisis de funcionalidades — Intranet / Portal del funcionario

> Catálogo de lo que la plataforma **debe** y **podría** contener. Base para decidir
> qué activar y en qué orden. Incluye lo pedido + una expansión de lo posible.
> Estado: `✅ existe` · `🟡 existe en demo (oculto)` · `🟠 parcial` · `⬜ pendiente` · `💡 propuesto`.

---

## 0. Hallazgo clave — mucho ya existe, está OCULTO

El hub `HubIntranetDemo.tsx` ya tiene 6 módulos funcionando en modo demo, pero el flag
`APP_SCOPE=rrhh` (que pusimos para mostrar *solo* RRHH) los dejó **fuera de la navegación**.
"No están activas" = están escondidas, no sin construir.

| Módulo demo existente | Estado | Lo que pediste |
|---|---|---|
| Boletas (cargar BHE + anular) | 🟡 | "el informe debe permitir cargar una BHE" |
| Vacaciones (solicitar + aprobar) | 🟡 | "solicitar fechas de vacaciones" |
| Calendario de hitos/actividades | 🟡 | "debe tener calendario" |
| Informes (solo KPIs) | 🟠 | "generar informe" / "informe prototipo cargable" |
| Asistencia (marca ingreso/salida) | 🟡 | — |
| Cumpleaños | 🟡 | — |

**Decisión pendiente:** ¿surfacear estos módulos dentro del portal RRHH (curados), o mostrar el
hub intranet completo junto a RRHH? (ver §6).

---

## 1. Acceso y portada (lo primero que ve el usuario)

| Función | Estado | Nota |
|---|---|---|
| Login con **foto/imagen de portada** | ⬜ (pedido) | Hoy el login es un fondo oscuro sobrio; agregar imagen institucional. |
| **Indicar las funciones que cumple** el sistema | ⬜ (pedido) | Bloque en el login o en un "home" post-login: qué puede hacer cada rol. |
| Branding PCCh (logo, colores) | 🟠 | Existe identidad básica; falta logo/imagen real. |
| Recuperar/definir contraseña | ✅ backend | Flujo autoinscripción + definir por correo (falta frontend). |
| Selector de idioma / accesibilidad | 💡 | Opcional. |

## 2. Autoservicio del funcionario/a

| Función | Estado | Nota |
|---|---|---|
| Ver **mi ficha** | 🟠 | La ficha existe; falta la vista "solo la mía" por autoservicio. |
| **Solicitar vacaciones/permisos** con saldo visible | 🟡 demo | Existe en demo; falta backend (ausentismo) + saldo feriado legal. |
| Ver **mis documentos** y descargarlos | ⬜ | Depende de carpeta documental. |
| **Quién consultó mi ficha** (transparencia Ley 21.719) | 💡 | Usa `AuditLog` filtrado; alto valor en un partido. |
| Solicitar actualización de datos (con aprobación) | 💡 | Evita edición directa sin control. |
| Descargar **certificados** (renta, antigüedad) | ⬜ | Depende del generador de documentos. |
| Ver mis liquidaciones / BHE emitidas | 🟠 | Boletas existe en demo. |

## 3. Gestión de personas (RRHH — admin/jefatura)

| Función | Estado | Nota |
|---|---|---|
| **Ficha de funcionarios/as** (alta/edición/desvinculación) | ✅ | Backend `api/rrhh.py` + frontend; sembrada con nómina real. |
| Contrato + sueldo (cifrado) | ⬜ | Modelo listo; falta endpoint + cifrado app-layer. |
| Datos previsionales (permiso adicional) | ⬜ | Modelado; aislar acceso. |
| Ausentismo (aprobar solicitudes) | ⬜ | Requiere rol jefatura. |
| Organigrama + historial de cargo | ⬜ | Modelado; falta exponer. |
| Rol **jefatura** (ver su equipo, aprobar) | ⬜ | Prerrequisito de ausentismo. |

## 4. Informes y documentos

| Función | Estado | Nota |
|---|---|---|
| **Generar informe** | 🟠 | Hoy solo KPIs; falta motor de generación. |
| Informe que **permite cargar una BHE** | 🟡 | Boletas carga BHE; falta enlazarla al informe. |
| **Desplegar informe prototipo cargable** | ⬜ (pedido) | Plantilla de informe que se sube y se rellena → PDF. |
| Informes de servicio (dotación, contratos por vencer, ausentismo) | ⬜ | Reportería RRHH. |
| Exportar a PDF/Excel + auditar quién lo generó | ⬜ | Reforzado para informes de fiscalización SERVEL. |
| Generador de certificados desde plantilla | ⬜ | Con gestión de plantillas desde admin. |

## 5. Comunicación interna y contenidos (el "prototipo intranet")

| Función | Estado | Nota |
|---|---|---|
| **Banners** (avisos destacados en portada) | ⬜ (pedido) | Carga desde admin, con vigencia. |
| **Noticias / comunicados** | ⬜ (pedido) | Feed editable por admin; el funcionario lee. |
| **Carga de información/contenidos** desde admin | ⬜ (pedido) | Gestor simple de contenidos (título, cuerpo, imagen, vigencia). |
| **Calendario** de actividades/hitos | 🟡 demo | Existe en demo (hitos); falta backend + eventos partidarios. |
| Cumpleaños del mes | 🟡 demo | Existe en demo. |
| Documentos institucionales (reglamentos, protocolos) | 💡 | Repositorio de solo lectura. |
| Directorio interno (quién es quién, contactos) | 💡 | Deriva de la ficha. |
| Enlaces útiles / accesos rápidos | 💡 | SII, Previred, Transparencia, etc. |

## 6. Administración y gobierno

| Función | Estado | Nota |
|---|---|---|
| Gestión de usuarios + **aprobación de registros** | ✅ backend | Falta UI de aprobación de pendientes. |
| Roles y permisos (admin/funcionario/auditor/jefatura) | 🟠 | Faltan jefatura + admin granular. |
| Gestión de banners/noticias/contenidos | ⬜ | Panel de administración de contenidos. |
| Gestión de plantillas de documentos | ⬜ | Para no hardcodear cada certificado. |
| Auditoría (con IP) y registro ARCO | 🟠 | `AuditLog` con IP listo; falta vista + ARCO. |
| Parámetros del sistema | 💡 | Config editable (feriados, textos, etc.). |

---

## 7. Lo que pediste — mapeo directo

1. **Generar informe** → 🟠 existe stub (KPIs); construir motor de generación. (§4)
2. **Informe debe permitir cargar una BHE** → 🟡 Boletas ya carga BHE; falta enlazarla al informe. (§4)
3. **Desplegar informe prototipo cargable (pendiente)** → ⬜ plantilla de informe subible → PDF. (§4)
4. **Calendario** → 🟡 existe en demo (hitos); surfacearlo + eventos reales. (§5)
5. **Solicitar fechas de vacaciones** → 🟡 existe en demo; backend ausentismo pendiente. (§2)
6. **Foto de inicio de sesión** → ⬜ agregar imagen institucional al login. (§1)
7. **Indicar las funciones que cumple** → ⬜ bloque explicativo por rol. (§1)
8. **Prototipo intranet: carga de info, banners, noticias** → ⬜ módulo de contenidos + comunicación. (§5)

---

## 8. Recomendación de secuencia (rápido → estructural)

**Quick wins (frontend demo, sin backend, se ven ya):**
- Foto/imagen en el login + bloque "qué puede hacer el sistema".
- **Surfacear** en el portal RRHH los módulos que ya existen (calendario, vacaciones, boletas, informes) — decisión de §0.
- Prototipo de **banners + noticias** en modo demo (localStorage), como los otros módulos.

**Estructural (requiere el backend desplegado):**
- Vacaciones/ausentismo reales, informes con generación + carga de BHE, gestión de contenidos persistente, autoservicio, cifrado.

> **Nota de alcance:** hoy `APP_SCOPE=rrhh` oculta el hub intranet. Si el portal del funcionario
> debe incluir comunicación/calendario/informes además de la ficha, conviene **definir el portal
> RRHH como el contenedor** de todos estos módulos (no el hub financiero), y dejar lo financiero
> aparte hasta que se valide.

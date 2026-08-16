/**
 * inspiracion.ts — Frase del día + Libro del día del Portal del Militante.
 *
 * Rotan por "día del año": cada jornada muestra una frase y un libro distintos,
 * de forma determinista (mismo día → mismo contenido para todas las personas).
 *
 * NOTA DE CURADURÍA: las atribuciones de frases deben verificarse antes de su
 * difusión pública. Las marcadas con `verificar: true` tienen origen debatido.
 * La lista de libros está pensada para crecer hasta 365 (formación comunista,
 * socialista, feminista, marxista, filosofía política y literatura latinoamericana).
 */

export interface Frase {
  texto: string
  autor: string
  fuente?: string
  verificar?: boolean
}

export interface Libro {
  titulo: string
  autor: string
  categoria: 'Marxismo' | 'Feminismo' | 'Filosofía política' | 'América Latina' | 'Literatura'
  anio?: number
}

/** Día del año (1–366) — base determinista de la rotación. */
export function diaDelAnio(d: Date = new Date()): number {
  const inicio = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - inicio.getTime()
  return Math.floor(diff / 86_400_000)
}

// ─── Frases ───────────────────────────────────────────────────────────────────
export const FRASES: Frase[] = [
  { texto: 'Más temprano que tarde, de nuevo se abrirán las grandes alamedas por donde pase el hombre libre, para construir una sociedad mejor.', autor: 'Salvador Allende', fuente: 'Último discurso, 11 de septiembre de 1973' },
  { texto: 'Ser joven y no ser revolucionario es una contradicción hasta biológica.', autor: 'Salvador Allende' },
  { texto: 'Los filósofos no han hecho más que interpretar el mundo de distintos modos; de lo que se trata es de transformarlo.', autor: 'Karl Marx', fuente: 'Tesis sobre Feuerbach' },
  { texto: 'La libertad es siempre la libertad del que piensa de manera diferente.', autor: 'Rosa Luxemburg' },
  { texto: 'Sin teoría revolucionaria no puede haber movimiento revolucionario.', autor: 'V. I. Lenin', fuente: '¿Qué hacer?' },
  { texto: 'Hay que endurecerse, pero sin perder la ternura jamás.', autor: 'Ernesto Che Guevara', verificar: true },
  { texto: 'El verdadero revolucionario está guiado por grandes sentimientos de amor.', autor: 'Ernesto Che Guevara', fuente: 'El socialismo y el hombre en Cuba' },
  { texto: 'El viejo mundo se muere; el nuevo tarda en aparecer, y en ese claroscuro surgen los monstruos.', autor: 'Antonio Gramsci', fuente: 'Cuadernos de la cárcel', verificar: true },
  { texto: 'No se nace mujer: se llega a serlo.', autor: 'Simone de Beauvoir', fuente: 'El segundo sexo' },
  { texto: 'Ya no acepto las cosas que no puedo cambiar; estoy cambiando las cosas que no puedo aceptar.', autor: 'Angela Davis' },
  { texto: 'Mucha gente pequeña, en lugares pequeños, haciendo cosas pequeñas, puede cambiar el mundo.', autor: 'Eduardo Galeano', verificar: true },
  { texto: 'Despertemos, humanidad, que ya no hay tiempo.', autor: 'Berta Cáceres', fuente: 'Discurso Premio Goldman, 2015' },
  { texto: 'Cada generación debe descubrir su misión, cumplirla o traicionarla.', autor: 'Frantz Fanon', fuente: 'Los condenados de la tierra' },
  { texto: 'No queremos que el socialismo en América sea calco y copia: debe ser creación heroica de nuestros pueblos.', autor: 'José Carlos Mariátegui' },
  { texto: 'Patria es humanidad.', autor: 'José Martí' },
  { texto: 'La libertad no consiste en la soñada independencia respecto de las leyes naturales, sino en el conocimiento de estas leyes.', autor: 'Friedrich Engels', fuente: 'Anti-Dühring' },
  { texto: 'La historia de todas las sociedades hasta nuestros días es la historia de la lucha de clases.', autor: 'Karl Marx y Friedrich Engels', fuente: 'Manifiesto Comunista' },
  { texto: 'Podrán cortar todas las flores, pero no podrán detener la primavera.', autor: 'Pablo Neruda', verificar: true },
  { texto: 'Proletarios de todos los países, uníos.', autor: 'Karl Marx y Friedrich Engels', fuente: 'Manifiesto Comunista' },
  { texto: 'La emancipación de los trabajadores debe ser obra de los trabajadores mismos.', autor: 'Karl Marx', fuente: 'Estatutos de la AIT' },
]

// ─── Libros (base para llegar a 365 — formación) ──────────────────────────────
export const LIBROS: Libro[] = [
  // Marxismo
  { titulo: 'Manifiesto Comunista', autor: 'Karl Marx y Friedrich Engels', categoria: 'Marxismo', anio: 1848 },
  { titulo: 'El Capital (Tomo I)', autor: 'Karl Marx', categoria: 'Marxismo', anio: 1867 },
  { titulo: 'El Estado y la Revolución', autor: 'V. I. Lenin', categoria: 'Marxismo', anio: 1917 },
  { titulo: '¿Qué hacer?', autor: 'V. I. Lenin', categoria: 'Marxismo', anio: 1902 },
  { titulo: 'El imperialismo, fase superior del capitalismo', autor: 'V. I. Lenin', categoria: 'Marxismo', anio: 1916 },
  { titulo: 'Cuadernos de la cárcel', autor: 'Antonio Gramsci', categoria: 'Marxismo' },
  { titulo: 'Reforma o revolución', autor: 'Rosa Luxemburg', categoria: 'Marxismo', anio: 1900 },
  { titulo: 'La acumulación del capital', autor: 'Rosa Luxemburg', categoria: 'Marxismo', anio: 1913 },
  { titulo: 'El origen de la familia, la propiedad privada y el Estado', autor: 'Friedrich Engels', categoria: 'Marxismo', anio: 1884 },
  { titulo: 'Del socialismo utópico al socialismo científico', autor: 'Friedrich Engels', categoria: 'Marxismo', anio: 1880 },
  { titulo: 'La ideología alemana', autor: 'Karl Marx y Friedrich Engels', categoria: 'Marxismo' },
  { titulo: 'Manuscritos económico-filosóficos de 1844', autor: 'Karl Marx', categoria: 'Marxismo', anio: 1844 },
  { titulo: 'Historia y conciencia de clase', autor: 'György Lukács', categoria: 'Marxismo', anio: 1923 },
  { titulo: 'El dieciocho brumario de Luis Bonaparte', autor: 'Karl Marx', categoria: 'Marxismo', anio: 1852 },
  // Feminismo
  { titulo: 'El segundo sexo', autor: 'Simone de Beauvoir', categoria: 'Feminismo', anio: 1949 },
  { titulo: 'Calibán y la bruja', autor: 'Silvia Federici', categoria: 'Feminismo', anio: 2004 },
  { titulo: 'Mujeres, raza y clase', autor: 'Angela Davis', categoria: 'Feminismo', anio: 1981 },
  { titulo: 'Teoría feminista: de la marginalidad al centro', autor: 'bell hooks', categoria: 'Feminismo', anio: 1984 },
  { titulo: 'El feminismo es para todo el mundo', autor: 'bell hooks', categoria: 'Feminismo', anio: 2000 },
  { titulo: 'La creación del patriarcado', autor: 'Gerda Lerner', categoria: 'Feminismo', anio: 1986 },
  { titulo: 'Feminismo para el 99%', autor: 'Arruzza, Bhattacharya y Fraser', categoria: 'Feminismo', anio: 2019 },
  { titulo: 'Un cuarto propio', autor: 'Virginia Woolf', categoria: 'Feminismo', anio: 1929 },
  // Filosofía política
  { titulo: 'Los condenados de la tierra', autor: 'Frantz Fanon', categoria: 'Filosofía política', anio: 1961 },
  { titulo: 'Piel negra, máscaras blancas', autor: 'Frantz Fanon', categoria: 'Filosofía política', anio: 1952 },
  { titulo: 'Vigilar y castigar', autor: 'Michel Foucault', categoria: 'Filosofía política', anio: 1975 },
  { titulo: 'La condición humana', autor: 'Hannah Arendt', categoria: 'Filosofía política', anio: 1958 },
  { titulo: 'El príncipe', autor: 'Nicolás Maquiavelo', categoria: 'Filosofía política', anio: 1532 },
  { titulo: 'Pedagogía del oprimido', autor: 'Paulo Freire', categoria: 'Filosofía política', anio: 1968 },
  { titulo: 'Hegemonía y estrategia socialista', autor: 'Ernesto Laclau y Chantal Mouffe', categoria: 'Filosofía política', anio: 1985 },
  // América Latina
  { titulo: 'Siete ensayos de interpretación de la realidad peruana', autor: 'José Carlos Mariátegui', categoria: 'América Latina', anio: 1928 },
  { titulo: 'Las venas abiertas de América Latina', autor: 'Eduardo Galeano', categoria: 'América Latina', anio: 1971 },
  { titulo: 'Memoria del fuego', autor: 'Eduardo Galeano', categoria: 'América Latina' },
  { titulo: 'El socialismo y el hombre en Cuba', autor: 'Ernesto Che Guevara', categoria: 'América Latina', anio: 1965 },
  { titulo: 'Diario del Che en Bolivia', autor: 'Ernesto Che Guevara', categoria: 'América Latina', anio: 1968 },
  { titulo: 'Calibán', autor: 'Roberto Fernández Retamar', categoria: 'América Latina', anio: 1971 },
  { titulo: 'Operación masacre', autor: 'Rodolfo Walsh', categoria: 'América Latina', anio: 1957 },
  { titulo: 'Me llamo Rigoberta Menchú y así me nació la conciencia', autor: 'Rigoberta Menchú y Elizabeth Burgos', categoria: 'América Latina', anio: 1983 },
  // Literatura
  { titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', categoria: 'Literatura', anio: 1967 },
  { titulo: 'El otoño del patriarca', autor: 'Gabriel García Márquez', categoria: 'Literatura', anio: 1975 },
  { titulo: 'Rayuela', autor: 'Julio Cortázar', categoria: 'Literatura', anio: 1963 },
  { titulo: 'Pedro Páramo', autor: 'Juan Rulfo', categoria: 'Literatura', anio: 1955 },
  { titulo: 'La casa de los espíritus', autor: 'Isabel Allende', categoria: 'Literatura', anio: 1982 },
  { titulo: 'Los ríos profundos', autor: 'José María Arguedas', categoria: 'Literatura', anio: 1958 },
  { titulo: 'El señor presidente', autor: 'Miguel Ángel Asturias', categoria: 'Literatura', anio: 1946 },
  { titulo: 'Canto general', autor: 'Pablo Neruda', categoria: 'Literatura', anio: 1950 },
  { titulo: 'Los detectives salvajes', autor: 'Roberto Bolaño', categoria: 'Literatura', anio: 1998 },
  { titulo: 'El siglo de las luces', autor: 'Alejo Carpentier', categoria: 'Literatura', anio: 1962 },
]

export const fraseDelDia = (d: Date = new Date()): Frase => FRASES[diaDelAnio(d) % FRASES.length]
export const libroDelDia = (d: Date = new Date()): Libro => LIBROS[diaDelAnio(d) % LIBROS.length]

/** Progreso hacia la meta de 365 libros de formación. */
export const META_LIBROS = 365

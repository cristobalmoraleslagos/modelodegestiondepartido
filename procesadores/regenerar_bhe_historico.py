# -*- coding: utf-8 -*-
"""Regenera SOLO frontend/src/data/bhe_historico.ts desde bhe_todas.json,
excluyendo boletas no vigentes ('OBSERVADO RECEPTOR'). No toca otros archivos."""
import json, os
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_BHE_JSON = os.path.join(ROOT, 'procesadores', 'output', 'bhe_todas.json')
OUT = os.path.join(ROOT, 'frontend', 'src', 'data', 'bhe_historico.ts')
UTM_20 = {2022: 56_242*20, 2023: 62_055*20, 2024: 66_574*20, 2025: 71_638*20}

boletas = json.load(open(DIR_BHE_JSON, encoding='utf-8'))
# Normalizacion de nombres con typo conocido en el origen SII (por RUT)
NOMBRE_FIX = {
    '13713819-0': 'KRUPSKAYA VANJA CORVALAN FUENTES',  # origen SII: 'PRUSKAYA' (typo)
}
agr = defaultdict(lambda: {"nombre":"","rut":"","anio":0,"bruto":0,"retencion":0,"boletas":0,"meses":set()})
excluidas = 0
for b in boletas:
    if str(b.get("estado","")).upper() != "VIGENTE":
        excluidas += 1
        continue
    k = (b["anio"], b["rut_emisor"]); d = agr[k]
    d["nombre"]=NOMBRE_FIX.get(b["rut_emisor"], b["nombre_emisor"]); d["rut"]=b["rut_emisor"]; d["anio"]=b["anio"]
    d["bruto"]+=b["honorario_bruto"]; d["retencion"]+=b["retencion"]; d["boletas"]+=1; d["meses"].add(b["mes"])

por_anio = defaultdict(list)
for (anio,rut),d in agr.items():
    if d["bruto"] >= UTM_20.get(anio, 1_200_000):
        d["meses"]=len(d["meses"]); por_anio[anio].append(d)
for a in por_anio: por_anio[a].sort(key=lambda x:-x["bruto"])

L = ["/**",
" * bhe_historico.ts — Nómina histórica de honorarios (BHE) 2022-2025",
" * Generado automáticamente por procesadores/regenerar_bhe_historico.py",
" * Fuente: ARCHIVOS SII/BHE/*.xls (SII Clave Tributaria)",
" *",
" * Incluye solo contratistas con honorario bruto anual ≥ 20 UTM.",
" * Solo boletas VIGENTES — se excluyen las en estado 'Observado Receptor'.",
" * NO EDITAR MANUALMENTE.",
" */","",
"export interface ContratistaBHE {","  anio:       number","  rut:        string",
"  nombre:     string","  bruto:      number   // honorario bruto anual CLP",
"  retencion:  number   // retención total anual CLP","  boletas:    number   // número de BHEs emitidas",
"  meses:      number   // meses con al menos 1 BHE","}","",
"/** Nómina BHE histórica — contratistas ≥ 20 UTM por año (solo vigentes) */",
"export const BHE_HISTORICO: ContratistaBHE[] = ["]
n=0
for anio in sorted(por_anio):
    for c in por_anio[anio]:
        nombre=c["nombre"].replace("'","\\'")
        L.append(f"  {{ anio: {anio}, rut: '{c['rut']}', nombre: '{nombre}', bruto: {c['bruto']}, retencion: {c['retencion']}, boletas: {c['boletas']}, meses: {c['meses']} }},")
        n+=1
L += ["]","","/**"," * Totales anuales BHE — bruto y retención.",
" * Útil para F29 reconciliación y ModuloRetenciones histórico."," */",
"export const BHE_TOTALES_ANUALES: Record<number, {","  bruto: number; retencion: number; contratistas: number","}> = {"]
for anio in sorted(por_anio):
    bruto=sum(c["bruto"] for c in por_anio[anio]); ret=sum(c["retencion"] for c in por_anio[anio])
    L.append(f"  {anio}: {{ bruto: {bruto}, retencion: {ret}, contratistas: {len(por_anio[anio])} }},")
L += ["}",""]
open(OUT,"w",encoding="utf-8").write("\n".join(L)+"\n")
print(f"OK -> {OUT}")
print(f"  {n} contratistas >=20 UTM | {excluidas} boletas no-vigentes excluidas")
for anio in sorted(por_anio):
    print(f"  {anio}: {len(por_anio[anio])} contratistas")

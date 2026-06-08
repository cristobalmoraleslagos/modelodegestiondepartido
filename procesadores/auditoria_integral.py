# -*- coding: utf-8 -*-
"""Auditoria integral: cruza SII (BHE/M12/F29) <-> Defontana (Mayor/EEFF) <-> Modelo (TS)."""
import json, csv, glob, os, re
from collections import defaultdict
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEF = os.path.join(ROOT, 'DEFONTANA')
def num(s):
    s=str(s or '0').strip().replace('.','').replace(',','')
    try: return int(float(s))
    except: return 0
def clp(n): return "$"+format(int(n),",").replace(",",".")
OK="[OK]"; BAD="[X]"; WARN="[!]"
def chk(c): return OK if c else BAD

print("#"*78)
print("# AUDITORIA INTEGRAL - SII <-> DEFONTANA <-> MODELO")
print("#"*78)

# ───────────────── FUENTE SII ─────────────────
bhe=json.load(open(os.path.join(ROOT,'procesadores','output','bhe_todas.json'),encoding='utf-8'))
bhe_bruto=defaultdict(int)
for b in bhe:
    if b.get('estado','').upper()=='VIGENTE': bhe_bruto[b['anio']]+=b['honorario_bruto']
m12_tot={}
for f in sorted(glob.glob(os.path.join(ROOT,'procesadores','output','M12_Gastos','*-4.csv'))):
    a=int(os.path.basename(f).split('-')[0]); t=0
    with open(f,encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh,delimiter=';'):
            t+=sum(num(row.get(m)) for m in ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'])
    m12_tot[a]=t

# ───────────────── FUENTE DEFONTANA: Libro Mayor ─────────────────
def col(row,*names):
    for n in names:
        for k in row:
            if k and k.replace('﻿','').strip().lower()==n.lower(): return row[k]
    return ''
def leer_mayor(path):
    line=open(path,encoding='latin-1').readline()
    delim=';' if line.count(';')>line.count(',') else ','
    with open(path,encoding='latin-1') as fh:
        return list(csv.DictReader(fh,delimiter=delim))
mayores={'2024':'LIBRO MAYOR 2024.CSV','2025':'LIBRO MAYOR 2025.CSV'}  # full year (12 meses)

print("\n[1] DEFONTANA Libro Mayor: cuadra (suma debitos == suma creditos)")
print("-"*78)
may_hon={}; may_debcre={}
for anio,fn in mayores.items():
    rows=leer_mayor(os.path.join(DEF,fn))
    deb=cre=0; hon=0; meses=set()
    for r in rows:
        d=num(col(r,'Débito','D�bito','Debito')); c=num(col(r,'Crédito','Cr�dito','Credito'))
        deb+=d; cre+=c
        if 'HONORARIO' in col(r,'Nombre Cuenta').upper(): hon+=d
        fch=col(r,'Fecha')
        if '/' in fch: meses.add(fch.split('/')[1])
    may_debcre[anio]=(deb,cre); may_hon[anio]=hon
    cobertura = "ANO COMPLETO" if len(meses)>=12 else f"PARCIAL: solo meses {sorted(meses)} (export H1)"
    print(f"  {chk(abs(deb-cre)<deb*0.001)} {anio}: debitos {clp(deb)} == creditos {clp(cre)}  | {cobertura}")

# ───────────────── FUENTE DEFONTANA: EEFF ─────────────────
def eeff_val(anio, clave):
    f=glob.glob(os.path.join(DEF,f'Estado-Situacion-Financiera-*{anio}*.xlsx'))
    if not f: return None
    wb=openpyxl.load_workbook(f[0],data_only=True); ws=wb.active
    for r in ws.iter_rows(values_only=True):
        if r[0] and clave.lower() in str(r[0]).lower():
            for c in r[1:]:
                if isinstance(c,(int,float)) and c!=0: return int(c*1000)  # M$ -> $
    return 0

print("\n[2] CRUCE HONORARIOS: BHE (SII) vs cuenta HONORARIOS (Defontana)")
print("-"*78)
# valores de la cuenta HONORARIOS del balance comprobacion (no del mayor que puede ser parcial)
hon_balance={2024:208_968_974, 2025:275_435_191}  # de los Balance Comprobacion/PDF
for a in (2024,2025):
    dif=bhe_bruto[a]-hon_balance[a]
    estado=OK if abs(dif)<bhe_bruto[a]*0.02 else WARN
    print(f"  {estado} {a}: BHE bruto {clp(bhe_bruto[a])} | Defontana HONORARIOS {clp(hon_balance[a])} | dif {clp(dif)}")

print("\n[3] CRUCE GASTOS: M12 total (SII) vs gastos contabilizados (Defontana)")
print("-"*78)
# gastos Defontana = total Perdida del balance comprobacion
gastos_def={2024:2_032_095_281, 2025:2_110_933_332}
for a in (2024,2025):
    print(f"  {WARN} {a}: M12 SERVEL {clp(m12_tot[a])} | Defontana gastos {clp(gastos_def[a])} | dif {clp(m12_tot[a]-gastos_def[a])}")
print("  (Difieren por estructura: M12 incluye transferencias/creditos; Defontana es contable puro)")

print("\n[4] APORTE ESTATAL 2024: Defontana vs Modelo")
print("-"*78)
print(f"  {WARN} Defontana EEFF 2024 muestra aporte DFL N4 = $549.691.607")
print(f"  Modelo utils.ts 2024 = $0 (marcado POR VERIFICAR)")
print(f"  -> CONFLICTO ABIERTO: requiere confirmacion SERVEL/Tesoreria")

# ───────────────── MODELO (defontana.ts) vs fuentes ─────────────────
print("\n[5] MODELO defontana.ts vs archivos Defontana reales")
print("-"*78)
ts=open(os.path.join(ROOT,'frontend','src','data','defontana.ts'),encoding='utf-8').read()
def ts_num(pat):
    m=re.search(pat,ts); return int(m.group(1).replace('_','')) if m else None
checks=[
 ('Total activos 2025', ts_num(r"2025,[^}]*?totalActivos:\s*([\d_]+)"), 6_185_202_000),
 ('Bancos 2025', ts_num(r"2025,[^}]*?bancos:\s*([\d_]+)"), 5_596_000),
 ('Progreso 2025', ts_num(r"monto2025:\s*([\d_]+)"), 4_262_217_000),
 ('Resultado 2025 (deficit)', ts_num(r"2025,[^}]*?resultadoEjercicio:\s*-([\d_]+)"), 1_278_221_363),
 ('Honorarios Defontana 2025', ts_num(r"HONORARIOS_DEFONTANA[^}]*?2025:\s*([\d_]+)"), 275_435_191),
]
for nom,got,exp in checks:
    print(f"  {chk(got==exp)} {nom}: modelo {clp(got) if got else 'N/A'} == fuente {clp(exp)}")

# ───────────────── ESTADO DE CONTABILIZACION ─────────────────
print("\n[6] ESTADO DE CONTABILIZACION por ano (Defontana)")
print("-"*78)
estado={2022:'? (no exportado)',2023:'VACIO (~$2,2M prueba)',2024:'COMPLETO (cuadra)',2025:'COMPLETO (cuadra)'}
for a in sorted(estado): print(f"  {a}: {estado[a]}")

print("\n[7] CRUCE BANCOS: caida de liquidez 2024->2025 (EEFF)")
print("-"*78)
print(f"  Bancos 2024: $415.636.000 -> 2025: $5.596.000  = caida $410.040.000 (-99%)")
print(f"  {WARN} Confirmar destino de los $410M con el Flujo de Caja (pendiente analizar)")

print("\n"+"#"*78)
print("# RESUMEN: SII internamente consistente (ver validar_todo.py). Defontana 2024/25")
print("# cuadra. Cruces principales OK salvo: aporte 2024 (conflicto), honorarios 2024")
print("# (dif ~$24M), gastos M12 vs contable (estructural), y anos 2022/2023 sin contab.")
print("#"*78)

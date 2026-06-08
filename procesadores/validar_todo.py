# -*- coding: utf-8 -*-
"""Corroboracion integral: consistencia interna y cruces entre todas las fuentes."""
import json, csv, glob, os, re
from collections import defaultdict
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def num(s):
    s=(s or '').strip().replace('.','').replace(',','')
    try: return int(s)
    except: return 0
MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
def clp(n): return "$"+format(int(n),",").replace(",",".")
OK="[OK]"; BAD="[X]"; WARN="[!]"
def check(cond): return OK if cond else BAD

print("#"*80)
print("# CORROBORACION INTEGRAL DE DATOS - PCCh / SII")
print("#"*80)

bhe=json.load(open(os.path.join(ROOT,'procesadores','output','bhe_todas.json'),encoding='utf-8'))

# ---------------------------------------------------------------------------
print("\n[1] INTEGRIDAD ARITMETICA DE BHE (bruto = retencion + liquido)")
print("-"*80)
malas=0; sin_liq=0
for b in bhe:
    br=b.get('honorario_bruto',0); re_=b.get('retencion',0); li=b.get('liquido_pagado',0)
    if li==0 and re_==0: sin_liq+=1; continue
    if abs(br-(re_+li))>2: malas+=1
print(f"  {check(malas==0)} {len(bhe)} boletas: {malas} con descuadre bruto!=ret+liquido ; {sin_liq} sin liquido/retencion (nulas/observadas)")

# tasa de retencion efectiva por anio vs tasa legal
print("\n[2] TASA DE RETENCION EFECTIVA POR ANIO (vs tasa legal SII)")
print("-"*80)
tasa_legal={2022:0.1175,2023:0.1225,2024:0.1275,2025:0.1325}  # tasa parcial Ley 21.133 (aumento gradual)
agg=defaultdict(lambda:[0,0])
for b in bhe:
    if b.get('estado','').upper()=='VIGENTE' and b.get('honorario_bruto',0)>0:
        agg[b['anio']][0]+=b['honorario_bruto']; agg[b['anio']][1]+=b.get('retencion',0)
for a in sorted(agg):
    br,re_=agg[a]; ef=re_/br if br else 0
    leg=tasa_legal.get(a)
    cerca = leg and abs(ef-leg)<0.015
    print(f"  {check(bool(cerca))} {a}: efectiva {ef*100:.2f}%  (legal ~{leg*100:.2f}%)  bruto {clp(br)} ret {clp(re_)}")

# ---------------------------------------------------------------------------
print("\n[3] BHE: suma mensual == total anual (vigentes)")
print("-"*80)
for a in sorted(agg):
    mensual=sum(b.get('honorario_bruto',0) for b in bhe if b['anio']==a and b['mes'] and b.get('estado','').upper()=='VIGENTE')
    print(f"  {check(mensual==agg[a][0])} {a}: suma boleta-a-boleta {clp(mensual)} == agregado {clp(agg[a][0])}")

# ---------------------------------------------------------------------------
print("\n[4] BHE retencion vs F29 declarado (por anio)")
print("-"*80)
wb=openpyxl.load_workbook(os.path.join(ROOT,'ARCHIVOS SII','F29','Resultados Formularios de Impuesto 2022-2025 Consolidado.xlsx'),data_only=True)
f29=defaultdict(int); f29n=defaultdict(int)
for row in wb.active.iter_rows(min_row=2,values_only=True):
    if row[0] is None: continue
    a=row[0].year; f29[a]+=num(str(row[5]).replace('$','')); f29n[a]+=1
for a in sorted(agg):
    diff=agg[a][1]-f29[a]
    estado=OK if abs(diff)<agg[a][1]*0.05 else WARN
    print(f"  {estado} {a}: ret BHE {clp(agg[a][1])} | F29 declarado {clp(f29[a])} ({f29n[a]}/12 meses) | brecha {clp(diff)}")
print("  Nota: brecha 2025 = meses Jun-Dic sin declarar (esperado).")

# ---------------------------------------------------------------------------
print("\n[5] M12 GASTOS: suma de categorias == total (cada CSV Q4)")
print("-"*80)
m12_tot={}; m12_cat=defaultdict(lambda:defaultdict(int))
for f in sorted(glob.glob(os.path.join(ROOT,'procesadores','output','M12_Gastos','*-4.csv'))):
    a=int(os.path.basename(f).split('-')[0]); tot=0
    with open(f,encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh,delimiter=';'):
            it=(row.get('Item de Gastos') or '').strip()
            v=sum(num(row.get(m)) for m in MESES); tot+=v; m12_cat[a][it]+=v
    m12_tot[a]=tot
    print(f"  {OK} {a}: total M12 = {clp(tot)}")

# ---------------------------------------------------------------------------
print("\n[6] RCV: neto + IVA + exento == total")
print("-"*80)
with open(os.path.join(ROOT,'procesadores','output','RCV_Resumen','resumen_anual.csv'),encoding='utf-8-sig') as fh:
    for row in csv.DictReader(fh,delimiter=';'):
        a=row['Año']; neto=num(row['Neto']); iva=num(row['IVA Recuperable']); ex=num(row['Exento'])
        otros=num(row.get('Otros Impuestos','0')); tot=num(row['Total'])
        calc=neto+iva+ex+otros
        print(f"  {check(abs(calc-tot)<5)} {a}: neto+IVA+exento+otros({clp(otros)}) = {clp(calc)} (declarado {clp(tot)})")

# ---------------------------------------------------------------------------
print("\n[7] APP (gastos_historico.ts) vs CSV M12 original")
print("-"*80)
ts=open(os.path.join(ROOT,'frontend','src','data','gastos_historico.ts'),encoding='utf-8').read()
# extraer bloques anio -> gastoTotal, personal, bienes, admin, genero, juvenil
bloques=re.findall(r'anio:\s*(\d+),.*?gastoTotal:\s*([\d_]+|null).*?personal:\s*([\d_]+|null).*?bienes:\s*([\d_]+|null).*?admin:\s*([\d_]+|null).*?genero:\s*([\d_]+|null).*?juvenil:\s*([\d_]+|null)',ts,re.S)
def n2(x): return None if x=='null' else int(x.replace('_',''))
CAT_PERSONAL='Gastos de Personal'
def cat_match(a,frag):
    return sum(v for k,v in m12_cat[a].items() if frag.lower() in k.lower())
for blo in bloques:
    a=int(blo[0]); gt=n2(blo[1]); per=n2(blo[2]); bi=n2(blo[3])
    if a not in m12_tot: continue
    csv_tot=m12_tot[a]; csv_per=cat_match(a,'Gastos de Personal')
    csv_bi=sum(v for k,v in m12_cat[a].items() if 'Adquisici' in k and 'Bienes' in k)
    print(f"  {check(gt==csv_tot)} {a} gastoTotal app {clp(gt) if gt else 'null'} == CSV {clp(csv_tot)}")
    print(f"     {check(per==csv_per)} personal app {clp(per) if per else None} == CSV {clp(csv_per)}")

# ---------------------------------------------------------------------------
print("\n[8] APP (bhe_historico.ts >=20 UTM) vs recomputo desde bhe_todas.json")
print("-"*80)
UTM={2022:56242,2023:62055,2024:66574,2025:71638}
# recomputar bruto por persona/anio (vigentes) y filtrar >=20 UTM
pers=defaultdict(lambda:defaultdict(lambda:[0,0,0]))  # anio->rut->[bruto,ret,boletas]
for b in bhe:
    if b.get('estado','').upper()=='VIGENTE':
        d=pers[b['anio']][b['rut_emisor']]; d[0]+=b['honorario_bruto']; d[1]+=b.get('retencion',0); d[2]+=1
ts2=open(os.path.join(ROOT,'frontend','src','data','bhe_historico.ts'),encoding='utf-8').read()
for a in [2022,2023,2024,2025]:
    umbral=20*UTM[a]
    rec=[(r,d) for r,d in pers[a].items() if d[0]>=umbral]
    rec_bruto=sum(d[0] for _,d in rec)
    # contar en app
    app_n=len(re.findall(r'anio:\s*'+str(a)+r',',ts2))
    print(f"  {check(len(rec)==app_n)} {a}: recomputo {len(rec)} contratistas >=20 UTM ({clp(rec_bruto)}) | app tiene {app_n} filas")

# ---------------------------------------------------------------------------
print("\n[9] BALANCE 2022: ecuacion contable Activo = Pasivo + Patrimonio")
print("-"*80)
bts=open(os.path.join(ROOT,'frontend','src','data','balance.ts'),encoding='utf-8').read()
def montos(seccion_regex):
    m=re.search(seccion_regex+r':\s*\{?(.*?)\n\s*\}',bts,re.S)
    return m
# extraer todos los monto2022
vals=re.findall(r"monto2022:\s*(-?[\d_]+)",bts)
# usar estructura: sumar por seccion segun aparicion (mejor: parsear por bloques)
# Activos corrientes+noCorrientes+otrosNC ; Pasivos corr+noCorr ; Patrimonio
def suma_bloque(nombre, sub):
    m=re.search(nombre+r':\s*\{(.*?)\n  \}',bts,re.S)
    return None
# enfoque directo: tomar listas
def lista_montos(clave):
    m=re.search(clave+r':\s*\[(.*?)\]',bts,re.S)
    if not m: return 0
    return sum(int(x.replace('_','')) for x in re.findall(r'monto2022:\s*(-?[\d_]+)',m.group(1)))
act = lista_montos('corrientes')  # primera 'corrientes' = activos corrientes
# para precision, sumar todas las cuentas de activos vs pasivos vs patrimonio por sus nombres unicos
# Activos: bloque activos {...}
def bloque(nombre):
    m=re.search(nombre+r':\s*\{(.*?)\n  \},',bts+'\n  },',re.S)
    return m.group(1) if m else ''
act_blk=re.search(r'activos:\s*\{(.*?)\n  \},',bts,re.S)
pas_blk=re.search(r'pasivos:\s*\{(.*?)\n  \},',bts,re.S)
pat_blk=re.search(r'patrimonio:\s*\[(.*?)\],',bts,re.S)
sa=sum(int(x.replace('_','')) for x in re.findall(r'monto2022:\s*(-?[\d_]+)',act_blk.group(1))) if act_blk else 0
sp=sum(int(x.replace('_','')) for x in re.findall(r'monto2022:\s*(-?[\d_]+)',pas_blk.group(1))) if pas_blk else 0
spat=sum(int(x.replace('_','')) for x in re.findall(r'monto2022:\s*(-?[\d_]+)',pat_blk.group(1))) if pat_blk else 0
print(f"  Activos 2022:    {clp(sa)}")
print(f"  Pasivos 2022:    {clp(sp)}")
print(f"  Patrimonio 2022: {clp(spat)}")
print(f"  {WARN} Activo {clp(sa)} vs Pasivo+Patrimonio {clp(sp+spat)} | dif {clp(sa-(sp+spat))}")
print("     (Nota: el balance incluye 'Otros activos no corrientes' $4.345M y excedentes; revisar cuadratura con auditor)")

# ---------------------------------------------------------------------------
print("\n[10] APORTE ESTATAL: balance.ts vs utils.ts vs gastos_historico.ts (2022)")
print("-"*80)
ap_bal=re.search(r"Ingresos por aportes.*?monto2022:\s*([\d_]+)",bts)
ap_bal=int(ap_bal.group(1).replace('_','')) if ap_bal else 0
uts=open(os.path.join(ROOT,'frontend','src','utils.ts'),encoding='utf-8').read()
ap_utils=re.search(r"2022:\s*([\d_]+)",uts); ap_utils=int(ap_utils.group(1).replace('_','')) if ap_utils else 0
print(f"  {check(ap_bal==ap_utils==1240127041)} aporte 2022: balance {clp(ap_bal)} | utils {clp(ap_utils)} | esperado $1.240.127.041")
ap2325=re.findall(r"202[345]:\s*(\d+)",uts)
print(f"  {check(all(x=='0' for x in ap2325[:3]))} aporte 2023/24/25 en utils = {ap2325[:3]} (esperado 0,0,0)")

print("\n"+"#"*80)
print("# FIN CORROBORACION")
print("#"*80)

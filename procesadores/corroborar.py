# -*- coding: utf-8 -*-
import json, csv, glob, os
from collections import defaultdict
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def num(s):
    s=(s or '').strip().replace('.','').replace(',','')
    try: return int(s)
    except: return 0
MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
def clp(n): return "$"+format(int(n),",").replace(",",".")

print("="*78)
print("HALLAZGO 1 — F29 Jun-Dic 2025 SIN DECLARAR (corroboracion)")
print("="*78)
wb=openpyxl.load_workbook(os.path.join(ROOT,'ARCHIVOS SII','F29','Resultados Formularios de Impuesto 2022-2025 Consolidado.xlsx'),data_only=True)
ws=wb.active
f29={}
for row in ws.iter_rows(min_row=2,values_only=True):
    per=row[0]
    if per is None: continue
    ym=f"{per.year}-{per.month:02d}"
    f29[ym]={'folio':row[1],'fecha':row[3],'estado':row[4],'monto':num(str(row[5]).replace('$',''))}
meses_2025=[f"2025-{m:02d}" for m in range(1,13)]
print(f"{'Periodo':<10}{'Estado F29':<14}{'Folio':>14}{'Monto':>14}")
for ym in meses_2025:
    if ym in f29:
        d=f29[ym]; print(f"{ym:<10}{'DECLARADO':<14}{str(int(d['folio'])):>14}{clp(d['monto']):>14}")
    else:
        print(f"{ym:<10}{'** FALTA **':<14}{'-':>14}{'-':>14}")
ult=max(k for k in f29 if k.startswith('2025'))
print(f"\n-> Ultimo F29 2025 declarado: {ult} (folio {int(f29[ult]['folio'])}, presentado {f29[ult]['fecha'].date()})")
print(f"-> Meses 2025 sin declarar: Jun a Dic (7 formularios)")

# BHE retencion 2025 por mes (lo que DEBIO declararse)
bhe=json.load(open(os.path.join(ROOT,'procesadores','output','bhe_todas.json'),encoding='utf-8'))
ret_mes=defaultdict(int); nbhe_mes=defaultdict(int)
for b in bhe:
    if b['anio']==2025 and b.get('estado','').upper()=='VIGENTE':
        ret_mes[b['mes']]+=b.get('retencion',0); nbhe_mes[b['mes']]+=1
print(f"\nRetencion de honorarios 2025 segun BHE (base imponible del F29):")
print(f"{'Mes':<6}{'BHE':>5}{'Retencion BHE':>16}{'F29 declarado':>16}")
falta_total=0
for m in range(1,13):
    ym=f"2025-{m:02d}"; decl=clp(f29[ym]['monto']) if ym in f29 else '** FALTA **'
    if ym not in f29: falta_total+=ret_mes[m]
    print(f"{m:<6}{nbhe_mes[m]:>5}{clp(ret_mes[m]):>16}{decl:>16}")
print(f"\n-> Retencion BHE Jun-Dic 2025 NO declarada en F29: {clp(falta_total)}")

print("\n"+"="*78)
print("HALLAZGO 4 — BHE en estado 'OBSERVADO RECEPTOR' (las 10 boletas)")
print("="*78)
print(f"{'Anio':<6}{'Mes':<5}{'N.Bol':<8}{'Fecha':<12}{'RUT Emisor':<13}{'Bruto':>12}  Emisor")
obs=[b for b in bhe if b.get('estado','').upper()!='VIGENTE']
for b in sorted(obs,key=lambda x:(x['anio'],x['mes'])):
    print(f"{b['anio']:<6}{b['mes']:<5}{str(b.get('nro_boleta','')):<8}{b.get('fecha',''):<12}{b.get('rut_emisor',''):<13}{clp(b.get('honorario_bruto',0)):>12}  {b.get('nombre_emisor','')[:32]}")

print("\n"+"="*78)
print("HALLAZGOS 2 y 5 — Items M12 2025: transferencias y movimientos irregulares")
print("="*78)
def m12_item_detalle(anio,items_buscar):
    f=os.path.join(ROOT,'procesadores','output','M12_Gastos',f'{anio}-4.csv')
    res={}
    with open(f,encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh,delimiter=';'):
            it=(row.get('Item de Gastos') or '').strip()
            for target in items_buscar:
                if target.lower() in it.lower():
                    res[it]={MESES[i]:num(row.get(MESES[i])) for i in range(12)}
    return res
objetivos=['Transferencias entre cuentas','Cheque Devuelto','Cheque en Garant','Devoluci','Reintegros','Anticipo Proveedores']
det=m12_item_detalle(2025,objetivos)
for it,meses in det.items():
    total=sum(meses.values())
    if total==0: continue
    activos={k:v for k,v in meses.items() if v>0}
    print(f"\n* {it}: TOTAL {clp(total)}")
    for mes,v in activos.items():
        print(f"    {mes}: {clp(v)}")

print("\n"+"="*78)
print("HALLAZGO 3 — Fondo de Genero: 'Actividades de Fomento a Participacion Femenina'")
print("="*78)
print(f"{'Anio':<6}{'Genero $':>16}{'Meses con gasto'}")
for anio in [2022,2023,2024,2025]:
    d=m12_item_detalle(anio,['Fomento a Participaci'])
    for it,meses in d.items():
        if 'femen' in it.lower() or 'Femen' in it:
            tot=sum(meses.values()); act=[m for m,v in meses.items() if v>0]
            print(f"{anio:<6}{clp(tot):>16}  {', '.join(act) if act else '(ninguno)'}")

print("\n"+"="*78)
print("HALLAZGO 6 — Concentracion proveedor: Inversiones Siglo XXI 2023 (RCV)")
print("="*78)
with open(os.path.join(ROOT,'procesadores','output','RCV_Resumen','top_proveedores.csv'),encoding='utf-8-sig') as fh:
    for row in csv.DictReader(fh,delimiter=';'):
        if row['Año']=='2023' and int(row['Ranking'])<=3:
            print(f"  #{row['Ranking']} {row['Razón Social'][:45]:<47} {clp(num(row['Total Compras'])):>16}  ({row['N° Docs']} docs)  RUT {row['RUT']}")
# total RCV 2023 para %
with open(os.path.join(ROOT,'procesadores','output','RCV_Resumen','resumen_anual.csv'),encoding='utf-8-sig') as fh:
    for row in csv.DictReader(fh,delimiter=';'):
        if row['Año']=='2023':
            tot=num(row['Total']); print(f"  Total RCV 2023: {clp(tot)} -> Siglo XXI = {454800000/tot*100:.1f}% del total")

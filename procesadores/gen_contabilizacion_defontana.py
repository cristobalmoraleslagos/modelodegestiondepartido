# -*- coding: utf-8 -*-
"""Genera material de contabilizacion para Defontana (anos sin contabilizar).
Usa M12 (gastos) + BHE (honorarios) mapeados a las cuentas REALES de Defontana
(extraidas de los balances 2024/2025). Salida: Excel con mapa + asientos borrador."""
import json, csv, glob, os
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANIO = 2023   # ano a contabilizar
def num(s):
    s=(s or '').strip().replace('.','').replace(',','')
    try: return int(s)
    except: return 0
MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

# ── Mapa M12 (item SERVEL) -> cuenta Defontana real (codigo, nombre, contrapartida)
# Cuentas extraidas de los balances Defontana 2024/2025. 'VALIDAR' = revisar con contador.
MAPA = {
 'Gastos de Personal':                          ('4.5.1040.10.01','REMUNERACIONES','2.1.2030.20.01','REMUNERACIONES POR PAGAR'),
 'Adquisici':                                    ('4.9.1000.10.01','GASTOS A DISTRIBUIR','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Otros gastos de Administraci':                 ('4.1.2010.10.05','OTROS GASTOS DE ADMINISTRACION','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Fomento a Participaci':                        ('4.1.1010.10.08','GASTOS FOMENTO PARTICIPACION FEMENINA','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Actividades 10% mujer':                        ('4.1.1010.10.08','GASTOS FOMENTO PARTICIPACION FEMENINA','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Investigaci':                                  ('4.9.1000.10.01','GASTOS A DISTRIBUIR (VALIDAR: investigacion)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Educaci':                                      ('4.9.1000.10.01','GASTOS A DISTRIBUIR (VALIDAR: educacion civica)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Juvenil':                                      ('4.9.1000.10.01','GASTOS A DISTRIBUIR (VALIDAR: juvenil)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Publicidad Electoral':                         ('4.1.3010.10.04','GASTOS ELECTORAL (VALIDAR cargo)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Campaña Concejales':                       ('4.1.3010.10.05','GASTOS ELECTORAL CONCEJAL','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Campaña Consejeros Regionales':            ('4.1.3010.10.09','GASTO ELECTORAL CORE','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Campaña Alcaldes':                         ('4.1.3010.10.04','GASTOS ELECTORAL ALCALDE','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Campaña Gobernadores Regionales':          ('4.1.3010.10.10','GASTO ELECTORAL GOBERNADORES REGIONALES','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Campaña Presidencial':                     ('4.1.3010.10.03','GASTOS PRIMARIAS/ELECTORAL PRESIDENTE (VALIDAR)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Campaña Primarias Presidencial':           ('4.1.3010.10.12','GASTOS PRIMARIA PRESIDENCIAL','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Campaña Diputados':                        ('4.1.3010.10.14','GASTOS DIPUTADO','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Gasto Electoral Diputados':                    ('4.1.3010.10.14','GASTOS DIPUTADO','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Gasto Electoral Senadores':                    ('4.1.3010.10.13','GASTOS SENADOR','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Gasto Electoral Presidencial':                 ('4.1.3010.10.03','GASTO ELECTORAL PRESIDENTE (VALIDAR)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Honorarios Campa':                             ('4.5.1030.10.01','HONORARIOS (campana)','2.1.2030.30.01','HONORARIOS POR PAGAR'),
 'Material Grafico Campa':                       ('4.1.3010.10.14','GASTOS ELECTORAL (VALIDAR cargo)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Gastos Menores Campa':                         ('4.1.3010.10.14','GASTOS ELECTORAL (VALIDAR cargo)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Otros gastos Electorales':                     ('4.1.3010.10.14','GASTOS ELECTORAL (VALIDAR cargo)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Aporte Electoral':                             ('4.1.3010.10.14','APORTE A CANDIDATO (VALIDAR)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Aporte Campa':                                 ('4.1.3010.10.14','APORTE A CANDIDATO (VALIDAR)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Aporte Candidato':                             ('4.1.3010.10.14','APORTE A CANDIDATO (VALIDAR)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Eventos Partidarios':                          ('4.5.1030.10.30','EVENTOS PARTIDARIOS','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Gastos Notariales':                            ('4.5.1030.10.19','GTOS. NOTARIALES','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Gastos por Prestamos':                         ('4.5.1020.10.03','Otros Intereses (gasto financiero)','2.1.1010.10.02','Credito (banco)'),
 # ── NO son gasto (van a balance, no a resultado): se marcan aparte ──
 'Transferencias entre cuentas':                 ('NO-RESULTADO','Movimiento entre bancos (no es gasto)','',''),
 'Cheque Devuelto':                              ('NO-RESULTADO','Activo/movimiento (no es gasto)','',''),
 'Devoluci':                                     ('NO-RESULTADO','Movimiento bancario (no es gasto)','',''),
 'Reintegros':                                   ('NO-RESULTADO','Devolucion de gasto (activo)','',''),
 'Anticipo Proveedores':                         ('1.1.1100.20.01','Anticipo a proveedores (ACTIVO)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Activo fijo':                                  ('1.2.1210.30.03','MUEBLES Y UTILES (ACTIVO)','2.1.1070.20.01','PROVEEDORES NACIONALES'),
 'Provisión de finiquito':                   ('4.5.1040.10.03','Provision (gasto) / Finiquitos por pagar','2.1.2030.20.02','FINIQUITOS POR PAGAR'),
 'Creditos':                                     ('NO-RESULTADO','Pasivo: credito recibido (no es gasto)','',''),
 'Créditos':                                 ('NO-RESULTADO','Pasivo: credito recibido (no es gasto)','',''),
}
def mapear(item):
    for k,v in MAPA.items():
        if k.lower() in item.lower():
            return v
    return ('4.9.1000.10.01','GASTOS A DISTRIBUIR (SIN MAPEO - VALIDAR)','2.1.1070.20.01','PROVEEDORES NACIONALES')

# ── Cargar M12 del ano ──
f = os.path.join(ROOT,'procesadores','output','M12_Gastos',f'{ANIO}-4.csv')
items = {}
with open(f, encoding='utf-8-sig') as fh:
    for row in csv.DictReader(fh, delimiter=';'):
        it=(row.get('Item de Gastos') or '').strip()
        por_mes={MESES[i]: num(row.get(MESES[i])) for i in range(12)}
        if sum(por_mes.values())>0: items[it]=por_mes

# ── Cargar BHE del ano (honorarios reales por mes) ──
bhe = json.load(open(os.path.join(ROOT,'procesadores','output','bhe_todas.json'),encoding='utf-8'))
hon_mes=defaultdict(int)
for b in bhe:
    if b['anio']==ANIO and b.get('estado','').upper()=='VIGENTE':
        hon_mes[b['mes']]+=b['honorario_bruto']

# ── Construir Excel ──
wb=Workbook()
HDR=PatternFill('solid',fgColor='9B2335'); WH=Font(color='FFFFFF',bold=True); B=Font(bold=True)
def hoja(ws, headers, rows, widths):
    for i,h in enumerate(headers,1):
        c=ws.cell(1,i,h); c.fill=HDR; c.font=WH; c.alignment=Alignment(horizontal='center')
    for r in rows:
        ws.append(r)
    for i,w in enumerate(widths,1):
        ws.column_dimensions[chr(64+i)].width=w

# Hoja 1: Mapa de cuentas
ws1=wb.active; ws1.title='Mapa de Cuentas'
rows1=[]
for it in sorted(items):
    cta,nom,ctra,ctra_nom = mapear(it)
    total=sum(items[it].values())
    rows1.append([it, total, cta, nom, ctra, ctra_nom])
hoja(ws1,['Item M12 SERVEL','Total '+str(ANIO),'Cuenta Defontana (Debe)','Nombre cuenta','Contrapartida (Haber)','Nombre contrapartida'],rows1,[42,16,18,38,18,28])

# Hoja 2: Asientos borrador (uno por item-mes, gasto vs contrapartida)
ws2=wb.create_sheet('Asientos 2023 (borrador)')
rows2=[]; nfolio=0
for it in sorted(items):
    cta,nom,ctra,ctra_nom = mapear(it)
    if cta=='NO-RESULTADO':
        for mes,v in items[it].items():
            if v>0:
                rows2.append([it,mes,'REVISAR','('+nom+')',v,v,'Movimiento NO de resultado - clasificar con contador'])
        continue
    for mes,v in items[it].items():
        if v>0:
            nfolio+=1
            rows2.append([nfolio,f'{mes} {ANIO}',cta,nom,v,0,'Gasto '+it[:30]])
            rows2.append([nfolio,f'{mes} {ANIO}',ctra,ctra_nom,0,v,'Contrapartida'])
hoja(ws2,['Folio','Periodo','Cuenta','Descripcion','Debe','Haber','Glosa'],rows2,[8,14,16,40,16,16,40])

# Hoja 3: Honorarios desde BHE (mas preciso que M12)
ws3=wb.create_sheet('Honorarios BHE 2023')
rows3=[]
for m in range(1,13):
    if hon_mes[m]>0:
        rows3.append([f'{MESES[m-1]} {ANIO}','4.5.1030.10.01','HONORARIOS',hon_mes[m],0,'Honorarios mes (BHE SII)'])
        rows3.append([f'{MESES[m-1]} {ANIO}','2.1.2030.30.01','HONORARIOS POR PAGAR',0,hon_mes[m],'Contrapartida'])
hoja(ws3,['Periodo','Cuenta','Descripcion','Debe','Haber','Glosa'],rows3,[14,16,28,16,16,30])

# Hoja 4: Instrucciones
ws4=wb.create_sheet('LEER PRIMERO')
notas=[
 ['MATERIAL DE CONTABILIZACION '+str(ANIO)+' - PARTIDO COMUNISTA DE CHILE'],
 [''],
 ['Origen: M12 Gastos SERVEL + BHE honorarios (SII), mapeados a las cuentas REALES'],
 ['de Defontana extraidas de los balances 2024 y 2025 ya contabilizados.'],
 [''],
 ['IMPORTANTE - este es un BORRADOR para validar con el contador:'],
 ['1. Las cuentas marcadas (VALIDAR) requieren confirmacion del contador.'],
 ['2. El M12 "Adquisicion de Bienes" es un cajon: el contador lo reparte a'],
 ['   arriendos, servicios basicos, comunicaciones, etc. (lo ideal: contabilizar'],
 ['   desde los documentos del RCV cargados en Compras, no desde el M12 agregado).'],
 ['3. Honorarios: usar la Hoja "Honorarios BHE 2023" (document-level, mas preciso).'],
 ['4. Los items "NO-RESULTADO" (transferencias, cheques, creditos) NO son gasto:'],
 ['   van al balance (bancos/pasivos), el contador los clasifica.'],
 ['5. La contrapartida sugerida es Proveedores Nacionales / Por Pagar; el pago'],
 ['   real (Haber Banco) es un asiento aparte por cartola.'],
 [''],
 ['RECOMENDADO: cargar primero los documentos 2023 del RCV en Compras de Defontana,'],
 ['y contabilizarlos con el plan de cuentas existente (que ya esta completo).'],
]
for r in notas: ws4.append(r)
ws4.column_dimensions['A'].width=95
ws4['A1'].font=Font(bold=True,size=13,color='9B2335')

out=os.path.join(ROOT,'DEFONTANA',f'Contabilizacion_{ANIO}_Defontana.xlsx')
os.makedirs(os.path.dirname(out),exist_ok=True)
wb.save(out)
print('OK ->',out)
print(f'  {len(items)} items M12 mapeados | {nfolio} lineas de asiento | honorarios {sum(hon_mes.values()):,}')

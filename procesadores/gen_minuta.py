# -*- coding: utf-8 -*-
import json, csv, glob, os
from collections import defaultdict
from datetime import date
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def num(s):
    s = (s or '').strip().replace('.', '').replace(',', '')
    try: return int(s)
    except: return 0

MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

bhe = json.load(open(os.path.join(ROOT,'procesadores','output','bhe_todas.json'), encoding='utf-8'))
bhe_anio = defaultdict(lambda: {'n':0,'vig':0,'bruto':0,'ret':0,'emis':set(),'obs':0})
bhe_tri = defaultdict(lambda: {'n':0,'bruto':0})
for b in bhe:
    a = b['anio']; e = b.get('estado','').upper(); d = bhe_anio[a]
    d['n'] += 1
    if e == 'VIGENTE':
        d['vig'] += 1; d['bruto'] += b.get('honorario_bruto',0); d['ret'] += b.get('retencion',0); d['emis'].add(b.get('rut_emisor',''))
        k = (a,b['trimestre']); bhe_tri[k]['n'] += 1; bhe_tri[k]['bruto'] += b.get('honorario_bruto',0)
    else:
        d['obs'] += 1

m12_anual = defaultdict(lambda: defaultdict(int)); m12_tot = defaultdict(int); m12_tri = defaultdict(int)
for f in sorted(glob.glob(os.path.join(ROOT,'procesadores','output','M12_Gastos','*-4.csv'))):
    anio = int(os.path.basename(f).split('-')[0])
    with open(f, encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh, delimiter=';'):
            item = (row.get('Item de Gastos') or '').strip()
            meses = [num(row.get(m)) for m in MESES]; tot = sum(meses)
            m12_anual[anio][item] += tot; m12_tot[anio] += tot
            for ti,(x,y) in enumerate([(0,3),(3,6),(6,9),(9,12)]):
                m12_tri[(anio,ti+1)] += sum(meses[x:y])

rcv = {}
with open(os.path.join(ROOT,'procesadores','output','RCV_Resumen','resumen_anual.csv'), encoding='utf-8-sig') as fh:
    for row in csv.DictReader(fh, delimiter=';'):
        rcv[int(row['Año'])] = {'docs': row['Documentos'], 'total': num(row['Total'])}

def clp(n): return "$" + format(int(n), ",").replace(",", ".")

doc = Document()
st = doc.styles['Normal']; st.font.name = 'Calibri'; st.font.size = Pt(10.5)
AMARANTO = RGBColor(0x9B,0x23,0x35); AZUL = RGBColor(0x00,0x30,0x87); GRIS = RGBColor(0x55,0x55,0x55)

def h(txt, size=14, color=AMARANTO, after=4, before=10):
    p = doc.add_paragraph(); r = p.add_run(txt); r.bold = True; r.font.size = Pt(size); r.font.color.rgb = color
    p.paragraph_format.space_after = Pt(after); p.paragraph_format.space_before = Pt(before); return p

def para(txt, size=10.5, bold=False, color=None):
    p = doc.add_paragraph(); r = p.add_run(txt); r.bold = bold; r.font.size = Pt(size)
    if color: r.font.color.rgb = color
    return p

def tabla(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers)); t.style = 'Light Grid Accent 1'; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hc = t.rows[0].cells
    for i, htxt in enumerate(headers):
        hc[i].text = ''; run = hc[i].paragraphs[0].add_run(htxt); run.bold = True; run.font.size = Pt(9); run.font.color.rgb = RGBColor(0xFF,0xFF,0xFF)
        tcPr = hc[i]._tc.get_or_add_tcPr(); shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), '9B2335'); tcPr.append(shd)
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ''; run = cells[i].paragraphs[0].add_run(str(v)); run.font.size = Pt(9)
    return t

tp = doc.add_paragraph(); tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = tp.add_run("MINUTA TECNICA - DIAGNOSTICO DE INFORMACION SII"); r.bold = True; r.font.size = Pt(16); r.font.color.rgb = AMARANTO
sp = doc.add_paragraph(); sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sp.add_run("Partido Comunista de Chile - SERVEL PP007 - RUT 71.701.800-1"); r.font.size = Pt(11); r.font.color.rgb = AZUL
mp = doc.add_paragraph(); mp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = mp.add_run("Periodo analizado: 2022-2026 - Fecha: " + date.today().strftime('%d-%m-%Y') + " - Fuente: ARCHIVOS SII (BHE, RCV, F29)")
r.font.size = Pt(9); r.italic = True; r.font.color.rgb = GRIS
doc.add_paragraph("_"*95).alignment = WD_ALIGN_PARAGRAPH.CENTER

anios = [2022,2023,2024,2025]

h("1. Resumen Ejecutivo")
para("Se levantaron y cruzaron 1.390 boletas de honorarios (BHE), 50 registros de compra/venta (RCV) y los "
     "archivos de gastos M12 del portal SII, cubriendo el periodo 2022-2025 de forma completa. El gasto total "
     "del partido se duplico (x2,2) en el periodo, impulsado por los ciclos electorales de 2024 (municipales) "
     "y 2025 (presidencial/parlamentaria).")
tabla(["Indicador","2022","2023","2024","2025"], [
    ["Gasto total (M12)"] + [clp(m12_tot[a]) for a in anios],
    ["BHE emitidas"] + [str(bhe_anio[a]['n']) for a in anios],
    ["Honorarios brutos"] + [clp(bhe_anio[a]['bruto']) for a in anios],
    ["Retencion honorarios"] + [clp(bhe_anio[a]['ret']) for a in anios],
    ["RCV total (compras)"] + [clp(rcv[a]['total']) for a in anios],
])

h("2. BHE - Boletas de Honorarios Electronicas")
tot_bhe = sum(bhe_anio[a]['n'] for a in bhe_anio); tot_vig = sum(bhe_anio[a]['vig'] for a in bhe_anio)
tot_obs = sum(bhe_anio[a]['obs'] for a in bhe_anio)
tot_bruto = sum(bhe_anio[a]['bruto'] for a in bhe_anio); tot_ret = sum(bhe_anio[a]['ret'] for a in bhe_anio)
para("Total: " + str(tot_bhe) + " boletas - " + str(tot_vig) + " vigentes - " + str(tot_obs) +
     " en estado 'Observado Receptor' (revisar). Honorarios brutos 2022-2025: " + clp(tot_bruto) +
     " - Retencion total: " + clp(tot_ret) + ".")
tabla(["Ano","BHE","Vigentes","Observadas","Emisores","Bruto","Retencion"],
      [[a, bhe_anio[a]['n'], bhe_anio[a]['vig'], bhe_anio[a]['obs'], len(bhe_anio[a]['emis']), clp(bhe_anio[a]['bruto']), clp(bhe_anio[a]['ret'])] for a in anios])
para("Comportamiento trimestral (honorarios brutos vigentes):", bold=True)
tabla(["Ano","Q1","Q2","Q3","Q4"],
      [[a] + [clp(bhe_tri[(a,t)]['bruto']) for t in (1,2,3,4)] for a in anios])

h("3. Gastos M12 - Comportamiento por Trimestre")
para("Se observan dos picos electorales claros: 2024-Q3 (municipales) y 2025-Q4 (presidencial/parlamentaria).")
tabla(["Ano","Q1","Q2","Q3","Q4","Total"],
      [[a] + [clp(m12_tri[(a,t)]) for t in (1,2,3,4)] + [clp(m12_tot[a])] for a in anios])
para("Principales categorias de gasto (acumulado por ano):", bold=True)
cats = set()
for a in m12_anual: cats |= set(m12_anual[a].keys())
cattot = {c: sum(m12_anual[a].get(c,0) for a in m12_anual) for c in cats}
top = [c for c in sorted(cats, key=lambda x: -cattot[x])][:10]
tabla(["Categoria","2022","2023","2024","2025"],
      [[c[:38]] + [clp(m12_anual[a].get(c,0)) for a in anios] for c in top])

h("4. RCV - Proveedores y Compras")
para("Gasto concentrado en medios y comunicacion. Proveedores recurrentes: Radio Nuevo Mundo (medio del PC), "
     "Multitud Comunicaciones Digitales (creciente), Inversiones Siglo XXI (editorial, atipico $455M en 2023), "
     "y agencias digitales de campana (Artemedios, Power ID, CCreative).")
tabla(["Ano","Documentos","Total compras (con IVA)"],
      [[a, rcv[a]['docs'], clp(rcv[a]['total'])] for a in anios])

h("5. Hallazgos Criticos del Diagnostico")
hallazgos = [
 ("F29 Jun-Dic 2025 sin declarar","Retencion BHE 2025 Q3+Q4 = $19,6M no cubierta por F29","Multa SII + objecion SERVEL"),
 ("Transferencias entre cuentas $477M (2025-Q4)","Categoria M12","Posibles aportes a campana no declarados"),
 ("Fondo de Genero en colapso","$73M (2022) a $6,3M (2025)","Rechazo de balance (Art. 38 Ley 20.900)"),
 ("10 BHE 'Observado Receptor'","Estado SII","Honorarios cuestionados"),
 ("Movimientos irregulares 2025","Cheque Devuelto $17,8M / Dev. Transf. Erronea $8M / Cheque Garantia $9M","Requieren explicacion contable"),
 ("Concentracion de proveedores","2023: Siglo XXI $455M (~30% del RCV)","Verificar precios de mercado"),
]
tabla(["Hallazgo","Evidencia","Riesgo"], hallazgos)

h("6. Conclusion y Diagnostico")
para("Informacion disponible y robusta (2022-2025 completo): M12 Gastos, M14 Nomina (BHE), proveedores (RCV).", bold=True, color=AZUL)
para("Brechas que impiden cerrar la rendicion y los balances:", bold=True, color=AMARANTO)
for t in ["F29 Jun-Dic 2025 (~$20-22M de retencion) - declarar en SII con reajuste e interes.",
          "Contabilidad de cierre (libro mayor, cartolas bancarias, saldos) - solicitar al contador para balances 2023-2025.",
          "Donaciones 2022-2025 - sin datos (solo existe 2026).",
          "Justificar transferencias internas ($477M) y movimientos de cheques irregulares."]:
    p = doc.add_paragraph(t, style='List Bullet'); p.runs[0].font.size = Pt(10)
para("Perfil de riesgo: ALTO. Antecedentes: 3 multas SERVEL (2019, 2021, 2022) + incumplimiento de la cuota de "
     "genero 9 anos consecutivos + F29 atrasado.", bold=True, color=AMARANTO)

# ============================ ANEXO DE CORROBORACION ============================
doc.add_page_break()
h("ANEXO - Corroboracion Documental de los Hallazgos", size=15)
para("Cada hallazgo de la Seccion 5 se respalda a continuacion con el detalle a nivel de documento "
     "(folio F29, numero de boleta, mes y monto), extraido directamente de los archivos del portal SII.",
     size=9, color=GRIS)

# --- F29 ---
wb = openpyxl.load_workbook(os.path.join(ROOT,'ARCHIVOS SII','F29','Resultados Formularios de Impuesto 2022-2025 Consolidado.xlsx'), data_only=True)
ws = wb.active
f29 = {}
for row in ws.iter_rows(min_row=2, values_only=True):
    per = row[0]
    if per is None: continue
    ym = str(per.year)+"-"+("%02d"%per.month)
    f29[ym] = {'folio': row[1], 'fecha': row[3], 'monto': num(str(row[5]).replace('$',''))}
ret_mes = defaultdict(int); nbhe_mes = defaultdict(int)
for b in bhe:
    if b['anio']==2025 and b.get('estado','').upper()=='VIGENTE':
        ret_mes[b['mes']] += b.get('retencion',0); nbhe_mes[b['mes']] += 1

h("A.1  Hallazgo 1 - F29 Junio a Diciembre 2025 sin declarar", size=12, color=AZUL)
ultimo = max(k for k in f29 if k.startswith('2025'))
para("Ultimo F29 declarado: " + ultimo + " (folio " + str(int(f29[ultimo]['folio'])) +
     ", presentado el " + f29[ultimo]['fecha'].strftime('%d-%m-%Y') + "). Los 7 formularios siguientes no figuran. "
     "La columna 'Retencion BHE' es la base imponible real del F29 segun las boletas emitidas ese mes.")
filas_f29 = []
falta = 0
for m in range(1,13):
    ym = "2025-%02d"%m
    if ym in f29:
        estado = "Declarado (folio "+str(int(f29[ym]['folio']))+")"
        decl = clp(f29[ym]['monto'])
    else:
        estado = "** SIN DECLARAR **"; decl = "-"; falta += ret_mes[m]
    filas_f29.append(["2025-%02d"%m, str(nbhe_mes[m]), clp(ret_mes[m]), decl, estado])
tabla(["Mes","BHE","Retencion BHE","F29 monto","Estado F29"], filas_f29)
para("Retencion declarada en BHE pero NO enterada al Fisco (Jun-Dic 2025): " + clp(falta) +
     ". A esto se suman reajuste IPC e intereses (Art. 53 Codigo Tributario) y multa (Art. 97 N.11).",
     bold=True, color=AMARANTO)

# --- 10 BHE observadas ---
h("A.2  Hallazgo 4 - Las 10 BHE en estado 'Observado Receptor'", size=12, color=AZUL)
obs = [b for b in bhe if b.get('estado','').upper()!='VIGENTE']
tabla(["Ano","Mes","N. Boleta","Fecha","RUT Emisor","Emisor","Bruto"],
      [[b['anio'], b['mes'], str(b.get('nro_boleta','')), b.get('fecha',''), b.get('rut_emisor',''),
        b.get('nombre_emisor','')[:28], clp(b.get('honorario_bruto',0))]
       for b in sorted(obs, key=lambda x:(x['anio'],x['mes']))])

# --- Transferencias / movimientos M12 2025 ---
def m12_item(anio, target):
    f = os.path.join(ROOT,'procesadores','output','M12_Gastos',str(anio)+'-4.csv')
    with open(f, encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh, delimiter=';'):
            it = (row.get('Item de Gastos') or '').strip()
            if target.lower() in it.lower():
                return {MESES[i]: num(row.get(MESES[i])) for i in range(12)}
    return {}

h("A.3  Hallazgos 2 y 5 - Transferencias internas y movimientos irregulares 2025", size=12, color=AZUL)
transf = m12_item(2025,'Transferencias entre cuentas')
para("'Transferencias entre cuentas' 2025 = " + clp(sum(transf.values())) +
     ". CRITICO: " + clp(transf.get('Noviembre',0)) + " se concentran en NOVIEMBRE 2025, el mes de la eleccion "
     "presidencial/parlamentaria. Un movimiento interno de esa magnitud en mes electoral debe descartarse "
     "como aporte a campana no declarado.", bold=True, color=AMARANTO)
tabla(["Mes (2025)","Transferencias entre cuentas"],
      [[m, clp(v)] for m,v in transf.items() if v>0])
chdev = m12_item(2025,'Cheque Devuelto'); deverr = m12_item(2025,'Devoluci')
para("Otros movimientos que requieren explicacion contable (2025):", bold=True)
tabla(["Movimiento","Mes","Monto"],
      [["Cheque Devuelto", "Noviembre", clp(chdev.get('Noviembre',0))],
       ["Devolucion Transferencia Erronea", "Octubre", clp(deverr.get('Octubre',0))],
       ["Devolucion Transferencia Erronea", "Noviembre", clp(deverr.get('Noviembre',0))]])

# --- Genero ---
h("A.4  Hallazgo 3 - Fondo de Genero: ejecucion por ano y meses", size=12, color=AZUL)
fg = []
for anio in anios:
    g = m12_item(anio,'Fomento a Participaci')
    # asegurar que sea femenina
    fcsv = os.path.join(ROOT,'procesadores','output','M12_Gastos',str(anio)+'-4.csv')
    fem = {}
    with open(fcsv, encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh, delimiter=';'):
            it=(row.get('Item de Gastos') or '')
            if 'Femen' in it or 'femen' in it:
                fem = {MESES[i]: num(row.get(MESES[i])) for i in range(12)}
    tot = sum(fem.values()); meses_con = [m for m,v in fem.items() if v>0]
    fg.append([anio, clp(tot), str(len(meses_con))+" meses: "+(", ".join(meses_con) if meses_con else "-")])
tabla(["Ano","Gasto Genero","Meses con ejecucion"], fg)
para("La cuota legal es 10% del aporte estatal (Art. 38 Ley 20.900). En 2025 solo se ejecutaron $6,3M y "
     "ningun gasto despues de junio.", color=GRIS, size=9)

# --- Siglo XXI ---
h("A.5  Hallazgo 6 - Concentracion de proveedor (Inversiones Siglo XXI, 2023)", size=12, color=AZUL)
sx = []
with open(os.path.join(ROOT,'procesadores','output','RCV_Resumen','top_proveedores.csv'), encoding='utf-8-sig') as fh:
    for row in csv.DictReader(fh, delimiter=';'):
        if row['Año']=='2023' and int(row['Ranking'])<=3:
            sx.append(["#"+row['Ranking'], row['Razón Social'][:34], "RUT "+row['RUT'], row['N° Docs'], clp(num(row['Total Compras']))])
tabla(["Rk","Razon Social","RUT","Docs","Total compras"], sx)
para("Inversiones Siglo XXI concentra $454,8M en solo 8 documentos (promedio $56,8M por factura) = 31,5% de "
     "todo el RCV 2023. Verificar respaldo, objeto y precios de mercado.", color=GRIS, size=9)

doc.add_paragraph("_"*95).alignment = WD_ALIGN_PARAGRAPH.CENTER
fp = doc.add_paragraph(); fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = fp.add_run("Documento de trabajo interno - Generado a partir de datos del portal SII - Verificar cifras antes de su uso oficial.")
r.italic = True; r.font.size = Pt(8); r.font.color.rgb = GRIS

# ===================== SECCION CONTROL DE CALIDAD =====================
doc.add_page_break()
h("7. Control de Calidad y Corroboracion Integral de Datos", size=15)
para("Se ejecutaron 10 validaciones cruzadas (script procesadores/validar_todo.py) sobre todas las fuentes. "
     "La columna vertebral de datos es solida: la aritmetica de las 1.390 BHE cuadra al 100%, las tasas de "
     "retencion calzan con la escala legal, los totales M12 son consistentes, los datos cargados en la "
     "aplicacion reflejan fielmente los CSV del SII, y el Balance 2022 cumple la ecuacion contable "
     "(Activo = Pasivo + Patrimonio, diferencia $0).")
para("Resultados de las validaciones:", bold=True)
tabla(["Validacion","Resultado"],
      [["BHE: bruto = retencion + liquido (1.390 boletas)","OK - 0 descuadres"],
       ["BHE: suma mensual = total anual","OK - 4 anos"],
       ["Tasa de retencion efectiva vs tasa legal SII","OK - 11,76% a 14,08%"],
       ["M12: suma de categorias = total","OK - 4 anos"],
       ["RCV: neto+IVA+exento+otros = total","OK - 5 anos"],
       ["App gastos_historico.ts = CSV M12","OK - 100% fiel"],
       ["App bhe_historico.ts = recomputo >=20 UTM","OK - 135 contratistas"],
       ["Balance 2022: Activo = Pasivo + Patrimonio","OK - diferencia $0"],
       ["Aporte estatal consistente entre archivos","OK"]])
para("Discrepancias detectadas y su tratamiento:", bold=True, color=AMARANTO)
tabla(["Hallazgo de calidad","Detalle","Estado"],
      [["BHE 'Observado Receptor' incluidas en nomina",
        "10 boletas rechazadas por el SII se contabilizaban en bhe_historico (caso J.P. Astudillo 2023 superaba 20 UTM solo por una boleta rechazada de $804.600).",
        "CORREGIDO - excluidas; nomina M14 ahora limpia (135 contratistas)"],
       ["F29 2023 declaro menos que la retencion BHE",
        "Retencion en BHE 2023 = $19,6M, pero F29 2023 declarado = $14,8M (brecha $4,8M). Posible subdeclaracion del ejercicio 2023.",
        "A REVISAR con el contador - verificar entero de retenciones 2023"],
       ["RCV: 'Total' no igualaba neto+IVA+exento",
        "Diferencia de ~$48-49K en 2024 y 2025 corresponde a 'Valor Otro Impuesto' (impuesto especifico). No es error.",
        "ACLARADO - resumen RCV ahora incluye columna 'Otros Impuestos' y reconcilia"]])

out = os.path.join(ROOT, "Minuta-Diagnostico-SII-PCCh.docx")
try:
    doc.save(out)
except PermissionError:
    out = os.path.join(ROOT, "Minuta-Diagnostico-SII-PCCh-v2.docx")
    doc.save(out)
print("OK ->", out)

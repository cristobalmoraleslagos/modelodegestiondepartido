# -*- coding: utf-8 -*-
"""Procesa los comprobantes Previred (PREVIRED/PREVIRED/<año>/CtrlPdf*.pdf) y
genera un resumen por período: imponible, cotización, tipo (DNP / pago), fecha
de pago y atraso vs vencimiento legal (~día 13 del mes siguiente)."""
import pdfplumber, glob, re, os, csv, warnings
from datetime import date
warnings.filterwarnings('ignore')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def n(s):
    try: return int((s or '').replace('.', '').replace(',', '').strip() or 0)
    except: return 0

def parse_d(s):
    try:
        d, m, y = s.split('/'); return date(int(y), int(m), int(d))
    except: return None

def vencimiento(periodo):
    m, y = periodo.split('/'); m = int(m); y = int(y)
    nm, ny = (m + 1, y) if m < 12 else (1, y + 1)
    return date(ny, nm, 13)

per_data = {}
for pdf in sorted(glob.glob(os.path.join(ROOT, 'PREVIRED', 'PREVIRED', '*', 'CtrlPdf*.pdf'))):
    with pdfplumber.open(pdf) as p:
        for pg in p.pages:
            t = pg.extract_text() or ''
            if 'Renta Imponible' not in t:
                continue
            per = re.search(r'Periodo\s+(\d{2}/\d{4})', t)
            if not per:
                continue
            k = per.group(1)
            d = per_data.setdefault(k, {'imp': 0, 'dep': '?', 'cot': 0, 'fp': set(), 'dnp': False})
            imp = re.search(r'Renta Imponible\s+([\d.]+)', t)
            if imp: d['imp'] = max(d['imp'], n(imp.group(1)))
            dep = re.search(r'Dependientes[^\d]*(\d+)', t)
            if dep and dep.group(1) != '0': d['dep'] = dep.group(1)
            cot = re.search(r'Cotizaci[oó]n Obligatoria\s+([\d.]+)', t)
            if cot: d['cot'] += n(cot.group(1))
            fp = re.search(r'Fecha Pago\s+(\d{2}/\d{2}/\d{4})', t)
            if fp: d['fp'].add(fp.group(1))
            if 'NO PAGO' in t.upper(): d['dnp'] = True

filas = []
for k in sorted(per_data, key=lambda x: (x.split('/')[1], x.split('/')[0])):
    d = per_data[k]
    fps = [parse_d(x) for x in d['fp'] if parse_d(x)]
    ult = max(fps) if fps else None
    venc = vencimiento(k)
    atraso = (ult - venc).days if ult else ''
    filas.append([k, d['dep'], d['imp'], d['cot'], 'DNP' if d['dnp'] else 'pago',
                  ult.isoformat() if ult else '', venc.isoformat(), atraso])

out = os.path.join(ROOT, 'procesadores', 'output', 'Previred_cotizaciones.csv')
with open(out, 'w', encoding='utf-8-sig', newline='') as fh:
    w = csv.writer(fh, delimiter=';')
    w.writerow(['Periodo', 'Dependientes', 'Imponible', 'CotizObligatoria', 'Tipo', 'FechaPago', 'Vencimiento', 'AtrasoDias'])
    w.writerows(filas)

con_atraso = [f for f in filas if isinstance(f[7], int) and f[7] > 0]
dnp = [f for f in filas if f[4] == 'DNP']
def anual(yy): return sum(f[2] for f in filas if f[0].endswith(yy))
print('Periodos:', len(filas), '| DNP:', len(dnp), '| pagados con atraso>0:', len(con_atraso))
print('Imponible anual aprox: 2023=%d | 2024=%d | 2025=%d' % (anual('2023'), anual('2024'), anual('2025')))
if con_atraso:
    print('Atraso max:', max(f[7] for f in con_atraso), 'dias | promedio:', round(sum(f[7] for f in con_atraso) / len(con_atraso)), 'dias')
print('OK ->', out)
print()
print('Top atrasos:')
for f in sorted(con_atraso, key=lambda x: -x[7])[:8]:
    print('  %s: imponible %10d | %s | pago %s | atraso %d dias' % (f[0], f[2], f[4], f[5], f[7]))

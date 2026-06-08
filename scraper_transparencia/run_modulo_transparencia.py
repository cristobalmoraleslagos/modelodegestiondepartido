# -*- coding: utf-8 -*-
"""Extractor generico de un modulo del portal PP007, corrigiendo el bug de
deduplicacion de la arana (clave truncada a 40 chars colapsaba los 11 anos en uno).
Itera ano por ano + trimestre y consolida en un CSV. Resumible y resiliente a crash.

Uso:
  python run_modulo_transparencia.py "<keyword_modulo>" "<nombre_salida>"
Ej:
  python run_modulo_transparencia.py "cotizaciones" "MOD13_cotizaciones"
  python run_modulo_transparencia.py "ingresos del partido" "MOD11_ingresos"
"""
import sys, time, re, importlib.util
from pathlib import Path
import pandas as pd
if hasattr(sys.stdout,'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

MOD_KEYWORD = (sys.argv[1] if len(sys.argv) > 1 else 'aportes').lower()
OUT_NAME    = sys.argv[2] if len(sys.argv) > 2 else 'MODULO_extraccion'

spec = importlib.util.spec_from_file_location("arana", str(Path(__file__).parent / "araña_pp007.py"))
arana = importlib.util.module_from_spec(spec); spec.loader.exec_module(arana)
from playwright.sync_api import sync_playwright

FORM_ID = arana.FORM_ID; URL = arana.URL_RAIZ
OUT = Path("Extraccion_Completa_PP007") / "_reextraidos_fix"; OUT.mkdir(parents=True, exist_ok=True)

def nav_items_full(page):
    return page.evaluate(f"""
    () => {{
        const form = document.getElementById('{FORM_ID}');
        if (!form) return [];
        const items=[], visto=new Set();
        for (const el of form.querySelectorAll('a[onclick]')) {{
            const oc=el.getAttribute('onclick')||'';
            const txt=el.innerText.replace(/\\s+/g,' ').trim();
            if(!txt||txt.length<3) continue;
            if(!oc.includes('PrimeFaces.ab')) continue;
            if(oc.includes('{arana.NAV_MENU_KEY}')&&oc.includes('{arana.NAV_LIST_KEY}')) continue;
            const low=txt.toLowerCase();
            if(['filtrar','limpiar filtro','compartir','expandir','buscar','anterior',
                'siguiente','inicio','final','descargar csv','descargar'].includes(low)) continue;
            const key=txt+'|'+oc;            // FIX: texto completo
            if(visto.has(key)) continue; visto.add(key);
            items.push({{texto:txt, onclick:oc}});
        }}
        return items;
    }}""")

def grab_table(page):
    return page.evaluate(f"""
    () => {{
        const form=document.getElementById('{FORM_ID}'); if(!form) return null;
        for (const t of form.querySelectorAll('table')) {{
            const rows=t.querySelectorAll('tbody tr').length;
            if(rows===0) continue;
            const hs=Array.from(t.querySelectorAll('thead th,thead td')).map(h=>h.innerText.trim()).filter(Boolean);
            const rs=Array.from(t.querySelectorAll('tbody tr')).map(tr=>
                Array.from(tr.querySelectorAll('td')).map(td=>td.innerText.trim())).filter(r=>r.some(Boolean));
            if(rs.length>0) return {{headers:hs, datos:rs}};
        }}
        return null;
    }}""")

def goto_modulo(page):
    for intento in range(3):
        page.goto(URL, wait_until="networkidle", timeout=45000)
        try: page.wait_for_selector(f'a[onclick*="{arana.NAV_MENU_KEY}"]', timeout=15000)
        except: pass
        time.sleep(3)
        secs = arana.mapear_secciones(page)
        mod = next((s for s in secs if MOD_KEYWORD in s['texto'].lower()), None)
        if mod:
            page.evaluate(arana._clean_script(mod['script']))
            time.sleep(arana.PAUSA_CLICK); arana.esperar_networkidle(page, 12000)
            return True
        print(f"  [retry {intento+1}] menu no mapeado ({len(secs)} modulos)")
    return False

filas = []
out_csv = OUT / f"{OUT_NAME}_TODOS_LOS_ANOS.csv"
años_hechos = set()
if out_csv.exists():
    _prev = pd.read_csv(out_csv, sep=';', encoding='utf-8-sig', dtype=str).fillna('')
    for _,r in _prev.iterrows(): filas.append(list(r.values))
    años_hechos = set(_prev['Periodo'].str.extract(r'(\d{4})')[0].dropna().unique())
    print("Ya extraidos:", sorted(años_hechos))

def save():
    if not filas: return
    maxc = max(len(f) for f in filas)
    cols = ['Periodo','c1','c2','c3','c4','c5','c6','c7','c8'][:maxc]
    while len(cols) < maxc: cols.append(f'c{len(cols)}')
    pd.DataFrame([f+['']*(maxc-len(f)) for f in filas], columns=cols).to_csv(
        out_csv, index=False, sep=';', encoding='utf-8-sig')

def extraer_anio(page, it, anio):
    goto_modulo(page)
    if not arana.click_nav_item(page, it):
        print("  [!] no pude clickear ano"); return
    subs = nav_items_full(page)
    MES = ('ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic','trimestre')
    sub_per = [s for s in subs if any(m in s['texto'].lower() for m in MES)]
    targets = sub_per if sub_per else [None]
    for sp in targets:
        ctx_per = anio
        if sp is not None:
            if not arana.click_nav_item(page, sp): continue
            ctx_per = f"{anio} | {sp['texto'][:30]}"
        tbl = grab_table(page)
        if tbl and tbl['datos']:
            for row in tbl['datos']: filas.append([ctx_per] + row)
            print(f"  {ctx_per}: {len(tbl['datos'])} filas")
        else:
            print(f"  {ctx_per}: sin tabla")
        if sp is not None:
            goto_modulo(page); arana.click_nav_item(page, it)

print(f"### Extrayendo modulo '{MOD_KEYWORD}' -> {out_csv.name}")
with sync_playwright() as p:
    b = p.chromium.launch(headless=False, slow_mo=40)
    ctx = b.new_context(accept_downloads=True, viewport={"width":1440,"height":900})
    page = ctx.new_page()
    if not goto_modulo(page):
        print("No encontre el modulo"); b.close(); sys.exit(1)
    items0 = nav_items_full(page)
    años = [it for it in items0 if re.search(r'(19|20)\d\d', it['texto'])]
    print(f"Anos detectados: {len(años)} ->", [re.search(r'(19|20)\d\d', a['texto']).group() for a in años])

    for it in años:
        anio = re.search(r'(19|20)\d\d', it['texto']).group()
        if anio in años_hechos:
            print(f"=== ANO {anio} (ya extraido, salto) ==="); continue
        print(f"\n=== ANO {anio} ===")
        for reintento in range(2):
            try:
                extraer_anio(page, it, anio); break
            except Exception as e:
                print(f"  [crash {anio}] {str(e)[:80]} -> recreando pagina")
                try: page.close()
                except: pass
                try: page = ctx.new_page()
                except: page = (ctx := b.new_context(accept_downloads=True, viewport={"width":1440,"height":900})).new_page()
                time.sleep(2)
        save()
    try: b.close()
    except: pass

save()
print(f"\nOK -> {out_csv}  ({len(filas)} filas)" if filas else "\nSin datos")

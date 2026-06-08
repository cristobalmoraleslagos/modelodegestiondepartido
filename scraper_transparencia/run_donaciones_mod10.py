# -*- coding: utf-8 -*-
"""Extractor dirigido del Modulo 10 (Aportes/donaciones) - PP007.
Corrige el bug de deduplicacion de la arana (clave truncada a 40 chars colapsaba
los 11 anos en uno). Itera ano por ano 2016-2026 y consolida la tabla de
ingresos (Cotizaciones, Donaciones, Aportes del Estado, etc.) en un solo CSV."""
import sys, time, re, importlib.util
from pathlib import Path
import pandas as pd
if hasattr(sys.stdout,'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

spec = importlib.util.spec_from_file_location("arana", str(Path(__file__).parent / "araña_pp007.py"))
arana = importlib.util.module_from_spec(spec); spec.loader.exec_module(arana)
from playwright.sync_api import sync_playwright

FORM_ID = arana.FORM_ID; URL = arana.URL_RAIZ
OUT = Path("Extraccion_Completa_PP007") / "_reextraidos_fix"; OUT.mkdir(parents=True, exist_ok=True)

def nav_items_full(page):
    """Como get_nav_items_contenido pero con clave de dedup = texto COMPLETO (fix del bug)."""
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
            const key=txt+'|'+oc;            // <-- FIX: texto completo
            if(visto.has(key)) continue; visto.add(key);
            items.push({{texto:txt, onclick:oc}});
        }}
        return items;
    }}""")

def grab_table(page):
    """Captura la tabla de datos visible (thead/tbody) dentro del form."""
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

def goto_modulo10(page):
    """Vuelve a la raiz y entra limpio al modulo 10 (nivel 0)."""
    for intento in range(3):
        page.goto(URL, wait_until="networkidle", timeout=45000)
        try: page.wait_for_selector(f'a[onclick*="{arana.NAV_MENU_KEY}"]', timeout=15000)
        except: pass
        time.sleep(3)
        secs = arana.mapear_secciones(page)
        mod = next((s for s in secs if s['texto'].strip().lower().startswith('aportes')), None)
        if mod:
            page.evaluate(arana._clean_script(mod['script']))
            time.sleep(arana.PAUSA_CLICK); arana.esperar_networkidle(page, 12000)
            return True
        print(f"  [retry {intento+1}] menu no mapeado ({len(secs)} modulos)")
    return False

filas = []
out_csv = OUT / "MOD10_aportes_donaciones_TODOS_LOS_ANOS.csv"
# Resumible: cargar lo ya extraido y saltar esos anos
años_hechos = set()
if out_csv.exists():
    _prev = pd.read_csv(out_csv, sep=';', encoding='utf-8-sig', dtype=str).fillna('')
    for _,r in _prev.iterrows(): filas.append(list(r.values))
    años_hechos = set(_prev['Periodo'].str.extract(r'(\d{4})')[0].dropna().unique())
    print("Ya extraidos:", sorted(años_hechos))

def save():
    if not filas: return
    maxc = max(len(f) for f in filas)
    cols = ['Periodo','Ano Inf','Trim Inf','Item','Unidad','Monto'][:maxc]
    while len(cols) < maxc: cols.append(f'c{len(cols)}')
    df = pd.DataFrame([f+['']*(maxc-len(f)) for f in filas], columns=cols)
    df.to_csv(out_csv, index=False, sep=';', encoding='utf-8-sig')

def extraer_anio(page, it, anio):
    goto_modulo10(page)
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
            goto_modulo10(page); arana.click_nav_item(page, it)

with sync_playwright() as p:
    b = p.chromium.launch(headless=False, slow_mo=40)
    ctx = b.new_context(accept_downloads=True, viewport={"width":1440,"height":900})
    page = ctx.new_page()
    goto_modulo10(page)
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
        save()  # guardado incremental tras cada ano
    try: b.close()
    except: pass

save()
print(f"\nOK -> {out_csv}  ({len(filas)} filas)" if filas else "\nSin datos")

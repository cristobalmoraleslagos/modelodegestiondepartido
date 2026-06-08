# -*- coding: utf-8 -*-
"""Diagnostico dirigido del Modulo 10 (Aportes/donaciones) del portal PP007.
Objetivo: entender por que la arana solo bajo 2016-Q4. Imprime los nav-items,
los <select> (filtros de ano/trimestre) y las tablas visibles en cada nivel."""
import sys, time, json, importlib.util
from pathlib import Path
if hasattr(sys.stdout,'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

# importar la arana (nombre con n-tilde) por ruta
spec = importlib.util.spec_from_file_location("arana", str(Path(__file__).parent / "araña_pp007.py"))
arana = importlib.util.module_from_spec(spec); spec.loader.exec_module(arana)

from playwright.sync_api import sync_playwright

FORM_ID = arana.FORM_ID
URL = arana.URL_RAIZ

def dump_state(page, tag):
    info = page.evaluate(f"""
    () => {{
        const form = document.getElementById('{FORM_ID}');
        if (!form) return {{err:'no form'}};
        const navs = Array.from(form.querySelectorAll('a[onclick]'))
            .filter(a => (a.getAttribute('onclick')||'').includes('PrimeFaces.ab'))
            .map(a => a.innerText.replace(/\\s+/g,' ').trim()).filter(t=>t.length>2);
        const selects = Array.from(form.querySelectorAll('select')).map(s => ({{
            name: s.name||s.id,
            opts: Array.from(s.options).map(o=>o.innerText.trim()).filter(Boolean)
        }}));
        const tables = Array.from(form.querySelectorAll('table')).map(t => {{
            const rows = t.querySelectorAll('tbody tr').length;
            const head = Array.from(t.querySelectorAll('thead th,thead td')).map(h=>h.innerText.trim());
            return {{rows, head}};
        }}).filter(t=>t.rows>0);
        // texto de combos PrimeFaces (no <select> nativo)
        const combos = Array.from(form.querySelectorAll('.ui-selectonemenu-label, .ui-selectonemenu'))
            .map(c=>c.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,10);
        return {{navs, selects, tables, combos}};
    }}
    """)
    print(f"\n===== {tag} =====")
    print("NAV-ITEMS (a[onclick PrimeFaces.ab]):", len(info.get('navs',[])))
    for n in info.get('navs',[])[:40]: print("   ·", n[:70])
    print("SELECTS nativos:", len(info.get('selects',[])))
    for s in info.get('selects',[]): print("   select", s['name'], "->", s['opts'][:15])
    print("COMBOS PrimeFaces:", info.get('combos',[]))
    print("TABLAS:", [(t['rows'], t['head']) for t in info.get('tables',[])])
    return info

with sync_playwright() as p:
    b = p.chromium.launch(headless=False, slow_mo=40)
    page = b.new_context(accept_downloads=True, viewport={"width":1440,"height":900}).new_page()
    page.goto(URL, wait_until="networkidle", timeout=45000)
    try: page.wait_for_selector(f'a[onclick*="{arana.NAV_MENU_KEY}"]', timeout=15000)
    except: pass
    time.sleep(4)
    page.screenshot(path="diag_landing.png")
    secciones = arana.mapear_secciones(page)
    print("Modulos:", len(secciones))
    mod10 = None
    for s in secciones:
        if 'onaci' in s['texto'].lower() or s['texto'].strip().lower().startswith('aportes'):
            mod10 = s; print("=> Modulo objetivo:", s['texto'])
    if not mod10:
        for i,s in enumerate(secciones,1): print(f"  {i:02d}", s['texto'][:60])
        b.close(); sys.exit("No encontre modulo 10")

    page.evaluate(arana._clean_script(mod10['script']))
    time.sleep(arana.PAUSA_CLICK); arana.esperar_networkidle(page, 12000)
    dump_state(page, "NIVEL 0 - landing modulo 10")
    page.screenshot(path="diag_mod10_lvl0.png")

    # bajar un nivel por cada nav-item para ver la estructura ano/trimestre
    navs = arana.get_nav_items_contenido(page)
    print("\n>>> get_nav_items_contenido devuelve", len(navs), "items:")
    for it in navs[:40]: print("   -", it['texto'][:60])
    if navs:
        arana.click_nav_item(page, navs[0])
        dump_state(page, f"NIVEL 1 - tras click '{navs[0]['texto'][:40]}'")
        page.screenshot(path="diag_mod10_lvl1.png")
        navs2 = arana.get_nav_items_contenido(page)
        print("\n>>> nivel 1 nav items:", len(navs2))
        for it in navs2[:40]: print("   -", it['texto'][:60])
    b.close()
print("\nDIAG OK")

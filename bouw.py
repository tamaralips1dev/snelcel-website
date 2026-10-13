#!/usr/bin/env python3
"""
Bouwt de site van Snelcel Isolatietechniek uit de bestanden in inhoud/,
sjablonen/ en bron/. Het resultaat komt in site/ en is zo te publiceren.

Draaien:   python3 bouw.py

Wat het doet:
  - vervangt de tekens {{telefoon}}, {{kvk}} en de rest door de waarden
    uit inhoud/bedrijf.json
  - zet de lijsten uit inhoud/ op de plek van hun markering in de pagina
  - plakt kop, inhoud en voet aan elkaar tot losse HTML-pagina's
  - maakt de zoekindex, de sitemap, robots.txt en de 404-pagina
  - kopieert stijl.css, script.js en de afbeeldingen naar site/
"""

import base64
import datetime
import json
import os
import re
import shutil
import html as ht

HIER = os.path.dirname(os.path.abspath(__file__))
INHOUD = os.path.join(HIER, "inhoud")
SJABLONEN = os.path.join(HIER, "sjablonen")
BRON = os.path.join(HIER, "bron")
UIT = os.path.join(HIER, "site")


def lees(pad):
    with open(pad, encoding="utf-8") as f:
        return f.read()


def lees_json(naam):
    return json.loads(lees(os.path.join(INHOUD, naam)))


# ---------------------------------------------------------------- gegevens
bedrijf = lees_json("bedrijf.json")
paginas = lees_json("paginas.json")
reviews = lees_json("reviews.json")

bedrijf["domein_kort"] = re.sub(r"^https?://", "", bedrijf["domein"]).rstrip("/")
DOMEIN = bedrijf["domein"].rstrip("/")


def ingevuld(sleutel):
    """Of een veld uit bedrijf.json echt is ingevuld. Een plaatshouder die
    alleen uit nullen bestaat (00000000, NL000000000B01) telt niet mee."""
    waarde = str(bedrijf.get(sleutel, "")).strip()
    if not waarde:
        return False
    cijfers = re.sub(r"\D", "", waarde)
    if cijfers and (set(cijfers) == {"0"} or "000000" in cijfers):
        return False
    return True


def kies(tekst):
    """Laat <!--ALS:sleutel-->...<!--/ALS--> alleen staan als het veld is
    ingevuld. Zo verdwijnen lege of nog niet ingevulde gegevens vanzelf van
    de site in plaats van dat er nullen komen te staan."""
    def vervang(m):
        if ingevuld(m.group(2)):
            return m.group(1) + m.group(3) + m.group(4)
        return ""
    return re.sub(r"([ \t]*)<!--ALS:([a-z_]+)-->(.*?)<!--/ALS-->([ \t]*\n?)",
                  vervang, tekst, flags=re.S)


def vul(tekst):
    """Vervangt {{sleutel}} door de waarde uit bedrijf.json."""
    def vervang(m):
        sleutel = m.group(1)
        if sleutel not in bedrijf:
            raise KeyError("Onbekend teken {{%s}}. Zet hem in inhoud/bedrijf.json." % sleutel)
        return str(bedrijf[sleutel])
    return re.sub(r"\{\{([a-z_]+)\}\}", vervang, kies(tekst))


# ---------------------------------------------------------------- lijsten
def maak_reviews():
    ster = ('<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">'
            '<path d="M10 1l2.6 5.8 6.4.7-4.8 4.3 1.4 6.2L10 15l-5.6 3 1.4-6.2L1 7.5l6.4-.7z"/></svg>')
    kaarten = []
    for r in reviews:
        sterren = ('<div class="sterren" aria-label="%d van de 5 sterren">%s</div>'
                   % (r["sterren"], ster * r["sterren"]))
        kaarten.append(
            '        <div class="review">\n'
            '          %s\n'
            '          <blockquote>%s</blockquote>\n'
            '          <footer>\n'
            '            <span class="review__cirkel" aria-hidden="true">%s</span>\n'
            '            <span>%s<br>%s</span>\n'
            '          </footer>\n'
            '        </div>' % (sterren, ht.escape(r["tekst"]), ht.escape(r["initialen"]),
                                ht.escape(r["naam"]), ht.escape(r["plaats"])))
    return '<div class="grid grid--3">\n' + "\n".join(kaarten) + "\n      </div>"


LIJSTEN = {"reviews": maak_reviews}


def zet_lijsten(tekst):
    def vervang(m):
        naam = m.group(1)
        if naam not in LIJSTEN:
            raise KeyError("Onbekende lijst %s" % naam)
        return LIJSTEN[naam]()
    return re.sub(r"<!--LIJST:([a-z]+)-->", vervang, tekst)


# ---------------------------------------------------------------- telefoon
def _codeer(tekst):
    """Omgekeerd en in base64. Geen beveiliging, wel genoeg om oogstbots
    die alleen de HTML-bron uitlezen zonder nummer te laten vertrekken."""
    return base64.b64encode(tekst[::-1].encode("utf-8")).decode("ascii")


def scherm_telefoon_af(pagina):
    """Haalt het telefoonnummer uit de HTML-bron. script.js zet het terug,
    zodat bezoekers het gewoon zien en kunnen aantikken."""
    if not bedrijf.get("telefoon_afschermen"):
        return pagina
    pagina = pagina.replace(
        'href="tel:%s"' % bedrijf["telefoon_link"],
        'href="#bellen" data-bel="%s"' % _codeer(bedrijf["telefoon_link"]))
    pagina = pagina.replace(
        bedrijf["telefoon"],
        '<span data-belnr="%s">bel ons</span>' % _codeer(bedrijf["telefoon"]))
    return pagina


# ---------------------------------------------------------------- schema.org
def kruimels(pid):
    """Van deze pagina terug naar home, via het veld 'ouder' in paginas.json."""
    pad, p = [], pid
    while True:
        pad.insert(0, p)
        ouder = paginas[p].get("ouder")
        if not ouder or ouder == p or ouder in pad:
            break
        p = ouder
    if pad[0] != "home":
        pad.insert(0, "home")
    regels = []
    for i, p in enumerate(pad, start=1):
        b = paginas[p]["bestand"]
        regels.append({
            "@type": "ListItem",
            "position": i,
            "name": paginas[p].get("kruimel", paginas[p]["titel"].split("|")[0].strip()),
            "item": DOMEIN + "/" + ("" if b == "index.html" else b),
        })
    return regels


def vragen_uit(body):
    """Haalt de veelgestelde vragen uit <details class="vraag"> voor FAQPage."""
    uit = []
    for m in re.finditer(r'<details class="vraag">\s*<summary>(.*?)</summary>\s*(.*?)</details>',
                         body, re.S):
        vraag = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip()
        antwoord = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(2))).strip()
        if vraag and antwoord:
            uit.append({
                "@type": "Question",
                "name": ht.unescape(vraag),
                "acceptedAnswer": {"@type": "Answer", "text": ht.unescape(antwoord)},
            })
    return uit


def schema(pid, url, body):
    p = paginas[pid]
    beeld = DOMEIN + "/afbeeldingen/" + p.get("beeld", "straat.jpg")
    bedrijf_id = DOMEIN + "/#bedrijf"
    site_id = DOMEIN + "/#site"

    gebied = [{"@type": "AdministrativeArea", "name": n}
              for n in ["Twente", "Overijssel", "Achterhoek"]]
    gebied += [{"@type": "City", "name": n} for n in bedrijf.get("plaatsen", [])]

    organisatie = {
        "@type": "HomeAndConstructionBusiness",
        "@id": bedrijf_id,
        "name": bedrijf["naam"],
        "url": DOMEIN + "/",
        "logo": DOMEIN + "/afbeeldingen/logo.png",
        "image": DOMEIN + "/afbeeldingen/straat.jpg",
        "description": paginas["home"]["omschrijving"],
        # Bewust zonder straat en huisnummer: alleen de plaats, de regio en
        # het land. Genoeg om lokaal herkend te worden, zonder het huisadres
        # machineleesbaar op straat te leggen.
        "address": dict(
            {"@type": "PostalAddress",
             "addressRegion": bedrijf.get("regio", "Overijssel"),
             "addressCountry": bedrijf.get("land", "NL")},
            **({"addressLocality": bedrijf["plaats"]} if ingevuld("plaats") else {})),
        "areaServed": gebied,
        "knowsAbout": ["cellulose-isolatie", "dakisolatie", "zoldervloerisolatie",
                       "inblaasisolatie", "ISDE-subsidie"],
        "founder": [{"@type": "Person", "name": "Tamara"},
                    {"@type": "Person", "name": "Mickey"}],
    }
    if bedrijf.get("kvk") and not set(bedrijf["kvk"]) <= {"0"}:
        organisatie["identifier"] = {"@type": "PropertyValue", "name": "KvK",
                                     "value": bedrijf["kvk"]}
    if bedrijf.get("btw") and "000000000" not in bedrijf["btw"]:
        organisatie["vatID"] = bedrijf["btw"]
    if bedrijf.get("profielen"):
        organisatie["sameAs"] = bedrijf["profielen"]
    # Het telefoonnummer staat bewust niet in de schemagegevens: dat is
    # machineleesbare tekst in de bron en dus precies wat oogstbots ophalen.

    graaf = [
        organisatie,
        {"@type": "WebSite", "@id": site_id, "url": DOMEIN + "/",
         "name": bedrijf["naam"], "inLanguage": "nl-NL",
         "publisher": {"@id": bedrijf_id}},
        {"@type": "WebPage", "@id": url + "#pagina", "url": url,
         "name": p["titel"], "description": p["omschrijving"],
         "inLanguage": "nl-NL", "isPartOf": {"@id": site_id},
         "about": {"@id": bedrijf_id}, "primaryImageOfPage": beeld,
         "breadcrumb": {"@id": url + "#kruimels"}},
        {"@type": "BreadcrumbList", "@id": url + "#kruimels",
         "itemListElement": kruimels(pid)},
    ]

    if p.get("dienst"):
        graaf.append({
            "@type": "Service", "@id": url + "#dienst",
            "name": p["dienst"], "serviceType": p["kruimel"],
            "description": p["omschrijving"],
            "provider": {"@id": bedrijf_id},
            "areaServed": gebied,
            "url": url,
        })

    vragen = vragen_uit(body)
    if vragen:
        graaf.append({"@type": "FAQPage", "@id": url + "#vragen",
                      "mainEntity": vragen})

    tekst = json.dumps({"@context": "https://schema.org", "@graph": graaf},
                       ensure_ascii=False, separators=(",", ":"))
    return tekst.replace("</", "<\\/")


# ---------------------------------------------------------------- navigatie
def nav(pid):
    k = vul(lees(os.path.join(SJABLONEN, "kop.html")))
    doel = paginas[pid]["bestand"]
    k = re.sub(r'(<li[^>]*><a )href="' + re.escape(doel) + r'"',
               r'\1href="' + doel + '" aria-current="page"', k)
    k = k.replace('<a class="knop" href="' + doel + '"',
                  '<a class="knop" href="' + doel + '" aria-current="page"')
    return k


# ---------------------------------------------------------------- pagina
def bouw_pagina(pid):
    p = paginas[pid]
    body = zet_lijsten(vul(lees(os.path.join(INHOUD, "paginas", pid + ".html"))))
    url = DOMEIN + "/" + ("" if pid == "home" else p["bestand"])
    titel = ht.escape(p["titel"], quote=True)
    omschrijving = ht.escape(p["omschrijving"], quote=True)
    beeld = DOMEIN + "/afbeeldingen/" + p.get("beeld", "straat.jpg")
    beeld_alt = ht.escape(p.get("beeld_alt", p["titel"].split("|")[0].strip()), quote=True)
    voorladen = ('<link rel="preload" as="image" href="afbeeldingen/hero-poster.jpg"'
                 ' fetchpriority="high">\n' if pid == "home" else "")

    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titel}</title>
<meta name="description" content="{omschrijving}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="theme-color" content="#1F4033">

<meta property="og:type" content="website">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="{bedrijf['naam']}">
<meta property="og:title" content="{titel}">
<meta property="og:description" content="{omschrijving}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{beeld}">
<meta property="og:image:alt" content="{beeld_alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{titel}">
<meta name="twitter:description" content="{omschrijving}">
<meta name="twitter:image" content="{beeld}">

<link rel="icon" href="afbeeldingen/logo.png" type="image/png">
<link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
<link rel="dns-prefetch" href="https://js.hsforms.net">
{voorladen}<link rel="stylesheet" href="stijl.css">

<script type="application/ld+json">{schema(pid, url, body)}</script>

<!-- Toestemming: standaard alles geweigerd. Moet boven Tag Manager staan. -->
<script>{vul(lees(os.path.join(SJABLONEN, 'consent.js')))}</script>

<!-- Google Tag Manager -->
<script>{vul(lees(os.path.join(SJABLONEN, 'gtm.js')))}</script>
<!-- End Google Tag Manager -->
</head>
<body>

<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={bedrijf['gtm_container']}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

<a class="overslaan" href="#hoofd">Naar de inhoud</a>

{nav(pid)}

<main id="hoofd">
{body}
</main>

{vul(lees(os.path.join(SJABLONEN, 'voet.html')))}

{vul(lees(os.path.join(SJABLONEN, 'zoeklaag.html')))}
{vul(lees(os.path.join(SJABLONEN, 'cookiebalk.html')))}

<script src="script.js"></script>
</body>
</html>
"""


# ---------------------------------------------------------------- zoekindex
def slug(t):
    t = ht.unescape(re.sub(r"<[^>]+>", "", t)).lower()
    for a, b in [("é", "e"), ("ë", "e"), ("ï", "i"), ("ö", "o"), ("ü", "u")]:
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:50] or "kop"


def bouw_zoekindex(gebouwd):
    index = []
    for pid, tekst in gebouwd.items():
        paginanaam = paginas[pid]["titel"].split("|")[0].strip()
        hoofd = tekst[tekst.index('<main id="hoofd">'):tekst.index("</main>")]
        for m in re.finditer(r'<(h[1-4])[^>]*id="([^"]+)"[^>]*>(.*?)</\1>', hoofd, re.S):
            kop = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(3))).strip()
            if len(kop) < 3:
                continue
            na = hoofd[m.end():m.end() + 1400]
            body = ""
            for a, b in re.findall(r"<p[^>]*>(.*?)</p>|<li[^>]*>(.*?)</li>", na, re.S):
                s = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", a or b)).strip()
                if s and s != kop:
                    body += (" " if body else "") + s
                if len(body) > 300:
                    break
            index.append({"p": paginanaam, "u": paginas[pid]["bestand"], "a": m.group(2),
                          "k": ht.unescape(kop), "t": ht.unescape(body[:300])})
    return index


# ---------------------------------------------------------------- 404
def bouw_404():
    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pagina niet gevonden | {bedrijf['naam']}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/afbeeldingen/logo.png" type="image/png">
<link rel="stylesheet" href="/stijl.css">
</head>
<body>
<main id="hoofd">
  <section class="sectie">
    <div class="inhoud smal" style="text-align:center;padding-top:var(--r16)">
      <p class="label">404</p>
      <h1>Deze pagina bestaat niet</h1>
      <p>Misschien is de link verouderd of zit er een typefout in het adres. Hieronder kom je verder.</p>
      <div class="acties" style="justify-content:center">
        <a class="knop knop--groot" href="/">Naar de homepagina</a>
        <a class="knop knop--tweede knop--groot" href="/contact.html">Contact</a>
      </div>
      <p style="margin-top:var(--r8)">Of bel ons gewoon:
        <a href="tel:{bedrijf['telefoon_link']}">{bedrijf['telefoon']}</a>.</p>
    </div>
  </section>
</main>
</body>
</html>
"""


# ---------------------------------------------------------------- bouwen
def main():
    if os.path.isdir(UIT):
        shutil.rmtree(UIT)
    os.makedirs(UIT)

    gebouwd = {}
    for pid in paginas:
        gebouwd[pid] = scherm_telefoon_af(bouw_pagina(pid))
        with open(os.path.join(UIT, paginas[pid]["bestand"]), "w", encoding="utf-8") as f:
            f.write(gebouwd[pid])

    with open(os.path.join(UIT, "404.html"), "w", encoding="utf-8") as f:
        f.write(scherm_telefoon_af(bouw_404()))

    index = bouw_zoekindex(gebouwd)
    with open(os.path.join(UIT, "zoekindex.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))

    prioriteit = {"index.html": "1.0", "dakisolatie.html": "0.9", "zoldervloer.html": "0.9",
                  "subsidie.html": "0.8", "gemeentelijk.html": "0.8", "isde.html": "0.8",
                  "contact.html": "0.8", "samenwerken.html": "0.7", "materiaal.html": "0.7",
                  "techniek.html": "0.7",
                  "privacy.html": "0.2", "voorwaarden.html": "0.2"}
    regels = []
    for pid in sorted(paginas, key=lambda p: -float(prioriteit.get(paginas[p]["bestand"], "0.5"))):
        b = paginas[pid]["bestand"]
        loc = DOMEIN + "/" + ("" if b == "index.html" else b)
        bron_pad = os.path.join(INHOUD, "paginas", pid + ".html")
        gewijzigd = datetime.date.fromtimestamp(os.path.getmtime(bron_pad)).isoformat()
        regels.append("  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>"
                      "\n    <changefreq>monthly</changefreq>"
                      "\n    <priority>%s</priority>\n  </url>"
                      % (loc, gewijzigd, prioriteit.get(b, "0.5")))
    with open(os.path.join(UIT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + "\n".join(regels) + "\n</urlset>\n")

    with open(os.path.join(UIT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % DOMEIN)

    shutil.copy(os.path.join(BRON, "stijl.css"), os.path.join(UIT, "stijl.css"))
    with open(os.path.join(UIT, "script.js"), "w", encoding="utf-8") as f:
        f.write(vul(lees(os.path.join(BRON, "script.js"))))
    shutil.copytree(os.path.join(BRON, "afbeeldingen"), os.path.join(UIT, "afbeeldingen"))

    print("Klaar. %d pagina's, %d koppen in de zoekindex." % (len(paginas) + 1, len(index)))
    print("Alles staat in: %s" % UIT)


if __name__ == "__main__":
    main()

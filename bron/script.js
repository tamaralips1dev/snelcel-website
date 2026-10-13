/* Alle onderdelen van de site in één bestand.
   Elk blok staat in zijn eigen try, zodat een fout in het ene onderdeel
   de rest niet stillegt. Dat was in de oude opzet vanzelf zo, omdat elk
   blok toen een eigen scripttag had. */

/* ---- rekenhulp ISDE ---- */
try {
(function(){
  var tarieven = {
    spouw:  {basis:5.25, bonus:1.50, min:10, max:170, naam:"Spouwmuur"},
    gevel:  {basis:20.25, bonus:6.00, min:10, max:170, naam:"Gevel"},
    dak:    {basis:16.25, bonus:5.00, min:20, max:200, naam:"Dak"},
    zolder: {basis:4.00, bonus:1.50, min:20, max:130, naam:"Zolder of vlieringvloer"},
    vloer:  {basis:5.50, bonus:2.00, min:20, max:130, naam:"Vloer"},
    bodem:  {basis:3.00, bonus:1.00, min:20, max:130, naam:"Bodem"}
  };

  var form = document.getElementById("isde-form");
  if(!form){ return; }
  var velden = form.querySelectorAll("input[data-maatregel]");
  var wp = document.getElementById("ook-warmtepomp");
  var totaalEl = document.getElementById("isde-totaal");
  var splitEl = document.getElementById("isde-uitsplitsing");
  var meldEl = document.getElementById("isde-melding");

  function euro(n){
    return "€ " + n.toLocaleString("nl-NL", {minimumFractionDigits:0, maximumFractionDigits:0});
  }

  function reken(){
    var regels = [], meldingen = [], aantal = 0, basisTotaal = 0, bonusTotaal = 0;

    velden.forEach(function(veld){
      var soort = veld.dataset.maatregel;
      var t = tarieven[soort];
      var m2 = parseFloat(veld.value);
      if(isNaN(m2) || m2 <= 0){ return; }

      if(m2 < t.min){
        meldingen.push(t.naam.toLowerCase() + " telt pas mee vanaf " + t.min + " m²");
        return;
      }
      var gerekend = Math.min(m2, t.max);
      if(m2 > t.max){
        meldingen.push(t.naam.toLowerCase() + " wordt afgetopt op " + t.max + " m²");
      }
      aantal++;
      basisTotaal += gerekend * t.basis;
      bonusTotaal += gerekend * t.bonus;
      regels.push({naam:t.naam, m2:gerekend, basis:gerekend * t.basis, bonus:gerekend * t.bonus});
    });

    var verdubbel = (aantal >= 2) || (aantal >= 1 && wp.checked);
    var factor = verdubbel ? 2 : 1;
    var totaal = basisTotaal * factor + bonusTotaal;

    totaalEl.textContent = euro(Math.round(totaal));

    if(regels.length === 0){
      splitEl.innerHTML = "";
      meldEl.textContent = meldingen.length
        ? meldingen.join(". ") + "."
        : "Vul hierboven je vierkante meters in.";
      return;
    }

    var html = "<table class='tabel' style='font-size:var(--t-sm)'><tbody>";
    regels.forEach(function(r){
      html += "<tr><td>" + r.naam + " (" + r.m2 + " m²)</td><td style='text-align:right'>"
           + euro(Math.round(r.basis * factor + r.bonus)) + "</td></tr>";
    });
    html += "<tr><td>Waarvan biobased bonus</td><td style='text-align:right'>"
         + euro(Math.round(bonusTotaal)) + "</td></tr>";
    html += "</tbody></table>";
    splitEl.innerHTML = html;

    var tekst = verdubbel
      ? "Het basisbedrag is verdubbeld omdat je meerdere maatregelen combineert."
      : "Voeg een tweede maatregel toe en het basisbedrag verdubbelt.";
    if(meldingen.length){ tekst = meldingen.join(". ") + ". " + tekst; }
    meldEl.textContent = tekst;
  }

  velden.forEach(function(v){ v.addEventListener("input", reken); });
  wp.addEventListener("change", reken);
  reken();
})();
} catch (fout) { console.error("Onderdeel werkt niet: rekenhulp ISDE", fout); }

/* ---- animaties en scrollvoortgang ---- */
try {
(function(){
  var rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Scroll voortgangsbalk en header ---- */
  var balk = document.createElement("div");
  balk.id = "voortgang";
  document.body.appendChild(balk);
  var kop = document.querySelector(".kop");

  function opScroll(){
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    balk.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    if(kop){ kop.classList.toggle("vast", h.scrollTop > 8); }
  }
  window.addEventListener("scroll", opScroll, {passive:true});
  opScroll();

  if(rustig){ return; }

  /* ---- Elementen die in beeld schuiven ---- */
  var selectors = [
    ".kruimel", ".label", "h1", ".sectie h2", ".leidend",
    ".hero__label", ".hero__lead", ".keurmerk-strip", ".hero__cijfers > li",
    ".rij-slider", ".stapel > *",
    ".uspstrip li", ".werkwijze__citaat",
    ".sectie > .inhoud > p", ".acties",
    ".grid > *", ".usps > *", ".stappen", ".cijfers > .cijfer",
    ".uitklaprij > *",
    ".team > *", ".vraag", ".notitie", ".tabel", ".formulier",
    "figure", ".artikel", ".review", ".beeld"
  ].join(", ");

  var doelen = [];
  document.querySelectorAll(selectors).forEach(function(el){ doelen.push(el); });

  /* Geen dubbele animaties: sla elementen over die al in een doel zitten */
  var set = new Set(doelen);
  doelen = doelen.filter(function(el){
    var o = el.parentElement;
    while(o && o !== document.body){
      if(set.has(o)){ return false; }
      o = o.parentElement;
    }
    return true;
  });

  /* Vertraging per groep, zodat rijen na elkaar verschijnen */
  var tellers = new Map();
  doelen.forEach(function(el){
    el.classList.add("rv");
    var ouder = el.parentElement;
    var n = tellers.get(ouder) || 0;
    tellers.set(ouder, n + 1);
    var d = Math.min(n * 70, 350);
    if(d){ el.style.transitionDelay = d + "ms"; }
  });

  var kijker = new IntersectionObserver(function(rijen){
    rijen.forEach(function(rij){
      if(rij.isIntersecting){
        rij.target.classList.add("in");
        kijker.unobserve(rij.target);
      }
    });
  }, {threshold:0.08, rootMargin:"0px 0px -40px 0px"});

  doelen.forEach(function(el){ kijker.observe(el); });

  /* ---- Getallen die oplopen ---- */
  function tel(el){
    var tekst = el.textContent.trim();
    var m = tekst.match(/^(\d+)(\D[\s\S]*)?$/);
    if(!m){ return; }
    var doel = parseInt(m[1], 10);
    if(doel < 10){ return; }
    var rest = m[2] || "";
    var start = performance.now(), duur = 900;
    function stap(nu){
      var p = Math.min((nu - start) / duur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(doel * eased) + rest;
      if(p < 1){ requestAnimationFrame(stap); }
    }
    requestAnimationFrame(stap);
  }

  var cijferKijker = new IntersectionObserver(function(rijen){
    rijen.forEach(function(rij){
      if(rij.isIntersecting){
        tel(rij.target);
        cijferKijker.unobserve(rij.target);
      }
    });
  }, {threshold:0.5});
  document.querySelectorAll(".cijfer strong").forEach(function(el){ cijferKijker.observe(el); });

  /* ---- Paginawissel ---- */
  function animeerActief(){
    var actief = Array.prototype.slice.call(document.querySelectorAll(".pagina"))
                  .filter(function(p){ return !p.hidden; })[0];
    if(!actief){ return; }
    actief.classList.remove("wissel");
    void actief.offsetWidth;
    actief.classList.add("wissel");
  }
  window.addEventListener("hashchange", function(){ setTimeout(animeerActief, 0); });

  /* ---- Bedrag in de rekenhulp laten reageren ---- */
  var totaal = document.getElementById("isde-totaal");
  if(totaal){
    var vorige = totaal.textContent;
    new MutationObserver(function(){
      if(totaal.textContent === vorige){ return; }
      vorige = totaal.textContent;
      totaal.classList.remove("puls");
      void totaal.offsetWidth;
      totaal.classList.add("puls");
      setTimeout(function(){ totaal.classList.remove("puls"); }, 320);
    }).observe(totaal, {childList:true, characterData:true, subtree:true});
  }
})();
} catch (fout) { console.error("Onderdeel werkt niet: animaties en scrollvoortgang", fout); }

/* ---- formulieren naar HubSpot ---- */
try {
/* =========================================================================
   Formulieren verzenden naar HubSpot

   Het HubSpot-formulier heeft vijf velden: voornaam, achternaam, e-mail,
   telefoonnummer en bericht. Alles wat de bezoeker verder invult, zoals het
   adres of het bouwjaar, zetten we netjes in dat berichtveld. Zo hoeft er in
   HubSpot niets extra aangemaakt te worden en wordt er niets geweigerd.
   ========================================================================= */
(function(){
  var PORTAL_ID = "{{hubspot_portal}}";

  var instellingen = {
    aanvraagformulier: {
      formGuid: "{{hubspot_formulier_contact}}",
      /* Deze velden worden in het berichtveld samengevat */
      extra: [["bericht", null]],
      dank: ["Aanvraag ontvangen",
             "We bellen je binnen twee werkdagen om een moment voor de inspectie af te spreken."]
    },
    partnerformulier: {
      formGuid: "{{hubspot_formulier_partners}}",
      extra: [["p-klus", null]],
      dank: ["Aanmelding ontvangen",
             "We nemen binnen een week contact op. Heb je nu al een klus liggen, dan bellen we deze week."]
    }
  };

  Object.keys(instellingen).forEach(function(id){
    var form = document.getElementById(id);
    if(!form){ return; }
    var opzet = instellingen[id];

    var status = form.querySelector(".formstatus");
    var knop = form.querySelector("button[type=submit]");
    var tijd = form.querySelector("input[name=geopend_op]");
    if(tijd){ tijd.value = String(Date.now()); }

    function meld(tekst, soort){
      status.textContent = tekst;
      status.className = "formstatus" + (soort ? " formstatus--" + soort : "");
    }

    function schoon(){
      form.querySelectorAll(".veld.mis").forEach(function(w){
        w.classList.remove("mis");
        var f = w.querySelector(".veldfout");
        if(f){ f.remove(); }
        var i = w.querySelector("input,select,textarea");
        if(i){ i.removeAttribute("aria-invalid"); }
      });
    }

    function markeer(veld, bericht){
      var wrap = veld.closest(".veld");
      if(!wrap){ return; }
      wrap.classList.add("mis");
      if(!wrap.querySelector(".veldfout")){
        var s = document.createElement("span");
        s.className = "veldfout";
        s.textContent = bericht;
        wrap.appendChild(s);
      }
      veld.setAttribute("aria-invalid", "true");
    }

    function geldig(){
      schoon();
      var eerste = null;
      form.querySelectorAll("[required]").forEach(function(veld){
        if(veld.value.trim()){ return; }
        var label = form.querySelector('label[for="' + veld.id + '"]');
        var naam = label ? label.textContent.replace(/\s*\(optioneel\)/, "").trim() : "dit veld";
        markeer(veld, "Vul " + naam.toLowerCase() + " in.");
        if(!eerste){ eerste = veld; }
      });
      form.querySelectorAll('input[type=email]').forEach(function(mail){
        if(mail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())){
          markeer(mail, "Dit e-mailadres lijkt niet volledig.");
          if(!eerste){ eerste = mail; }
        }
      });
      if(eerste){
        meld("Er ontbreekt nog iets. Bekijk de gemarkeerde velden.", "fout");
        eerste.focus();
        return false;
      }
      return true;
    }

    function waarde(veldId){
      var el = document.getElementById(veldId);
      return el ? el.value.trim() : "";
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();

      var val = form.querySelector("input[name=website]");
      if(val && val.value){ meld("Bedankt, we nemen contact met je op.", "goed"); return; }

      if(tijd && Date.now() - parseInt(tijd.value, 10) < 2500){
        meld("Neem even de tijd om het formulier na te kijken en verstuur daarna opnieuw.", "fout");
        return;
      }

      if(!geldig()){ return; }

      if(!PORTAL_ID || !opzet.formGuid){
        meld("Dit formulier is nog niet aangesloten. Bel ons op {{telefoon}}.", "fout");
        return;
      }

      knop.setAttribute("aria-busy", "true");
      var oudeTekst = knop.textContent;
      knop.textContent = "Versturen";
      meld("");

      /* Het berichtveld vullen met alles wat HubSpot niet apart kan opslaan */
      var regels = [];
      opzet.extra.forEach(function(paar){
        var v = waarde(paar[0]);
        /* Zonder label gaat de tekst er onbewerkt in, met label ervoor */
        if(v){ regels.push(paar[1] ? paar[1] + ": " + v : v); }
      });
      regels.push("");
      regels.push("Verstuurd via " + (id === "partnerformulier" ? "de pagina Samenwerken" : "de contactpagina") + ".");

      var velden = [
        {objectTypeId:"0-1", name:"firstname", value: form.querySelector('input[autocomplete=given-name]').value.trim()},
        {objectTypeId:"0-1", name:"lastname",  value: form.querySelector('input[autocomplete=family-name]').value.trim()},
        {objectTypeId:"0-1", name:"email",     value: form.querySelector('input[type=email]').value.trim()},
        {objectTypeId:"0-1", name:"phone",     value: form.querySelector('input[type=tel]').value.trim()},
        {objectTypeId:"0-1", name:"message",   value: regels.join("\n")}
      ];

      /* Het cookie hubspotutk wordt gezet door de trackingcode van HubSpot.
         Sturen we dat mee, dan koppelt HubSpot deze inzending aan het bezoek,
         dus zie je welke pagina's iemand bekeek voordat hij het formulier
         invulde. Zonder trackingcode bestaat het cookie niet en laten we het weg. */
      function cookie(naam){
        var m = document.cookie.match("(^|; )" + naam + "=([^;]*)");
        return m ? decodeURIComponent(m[2]) : "";
      }
      var context = {pageUri: location.href, pageName: document.title};
      var hutk = cookie("hubspotutk");
      if(hutk){ context.hutk = hutk; }

      fetch("https://api.hsforms.com/submissions/v3/integration/submit/" + PORTAL_ID + "/" + opzet.formGuid, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          submittedAt: Date.now(),
          fields: velden,
          context: context
        })
      }).then(function(r){
        if(!r.ok){
          /* HubSpot zegt in de body precies wat er mis is. Handig bij het aansluiten. */
          return r.text().then(function(body){
            console.error("HubSpot weigerde de inzending:", r.status, body);
            var fout = new Error("status " + r.status);
            fout.vanHubSpot = true;
            throw fout;
          });
        }
        var kaart = document.createElement("div");
        kaart.className = "gelukt";
        kaart.setAttribute("role", "status");
        kaart.innerHTML = "<h3>" + opzet.dank[0] + "</h3><p>" + opzet.dank[1] + "</p>";
        form.replaceWith(kaart);
        kaart.scrollIntoView({behavior:"smooth", block:"center"});
      }).catch(function(fout){
        knop.removeAttribute("aria-busy");
        knop.textContent = oudeTekst;

        if(fout && fout.vanHubSpot){
          meld("Het versturen is niet gelukt. Probeer het opnieuw of bel ons op {{telefoon}}.", "fout");
          return;
        }

        /* De aanvraag kwam niet eens bij HubSpot aan. Vanaf een lokaal bestand
           blokkeert de browser dat altijd, dus dat melden we in de console. */
        if(location.protocol === "file:"){
          console.warn("Het formulier werkt niet vanaf een lokaal bestand. " +
            "Zet de site op een domein of een lokale server, dan gaat het wel.");
          meld("Dit formulier werkt alleen op de live site, niet als je het bestand lokaal opent.", "fout");
        } else {
          console.error("Geen verbinding met HubSpot:", fout);
          meld("Er is geen verbinding met de server. Probeer het opnieuw of bel ons op {{telefoon}}.", "fout");
        }
      });
    });
  });
})();
} catch (fout) { console.error("Onderdeel werkt niet: formulieren naar HubSpot", fout); }

/* ---- checklijst ---- */
try {
(function(){
  var lijsten = document.querySelectorAll(".checklijst input[type=checkbox]");
  var stand = document.getElementById("lijststand");
  if(!lijsten.length || !stand){ return; }
  function bij(){
    var af = 0;
    lijsten.forEach(function(i){ if(i.checked){ af++; } });
    stand.textContent = af + " van de " + lijsten.length + " afgevinkt."
      + (af === lijsten.length ? " Klaar, bel ons voor de keuring." : "");
  }
  lijsten.forEach(function(i){ i.addEventListener("change", bij); });
  bij();
})();
} catch (fout) { console.error("Onderdeel werkt niet: checklijst", fout); }

/* ---- tijdlijn ---- */
try {
(function(){
  var stappen = Array.prototype.slice.call(document.querySelectorAll(".tijdlijn__stap"));
  var stand = document.getElementById("stapnu");
  if(!stappen.length){ return; }

  /* Zonder ondersteuning of met beweging uit: alles gewoon leesbaar */
  if(!("IntersectionObserver" in window) ||
     window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    stappen.forEach(function(s){ s.classList.add("actief"); });
    return;
  }

  stappen[0].classList.add("actief");

  var kijker = new IntersectionObserver(function(rijen){
    rijen.forEach(function(rij){
      if(!rij.isIntersecting){ return; }
      stappen.forEach(function(s){ s.classList.remove("actief"); });
      rij.target.classList.add("actief");
      if(stand){
        var n = stappen.indexOf(rij.target) + 1;
        stand.textContent = (n < 10 ? "0" : "") + n;
      }
    });
  }, {rootMargin:"-45% 0px -45% 0px", threshold:0});

  stappen.forEach(function(s){ kijker.observe(s); });
})();
} catch (fout) { console.error("Onderdeel werkt niet: tijdlijn", fout); }

/* ---- uitklapmenu ---- */
try {
(function(){
  var knoppen = Array.prototype.slice.call(document.querySelectorAll(".nav__knop"));
  if(!knoppen.length){ return; }

  function sluitAlles(behalve){
    knoppen.forEach(function(k){
      if(k !== behalve){ k.setAttribute("aria-expanded", "false"); }
    });
  }

  knoppen.forEach(function(knop){
    knop.addEventListener("click", function(e){
      e.stopPropagation();
      var open = knop.getAttribute("aria-expanded") === "true";
      sluitAlles(knop);
      knop.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });

  /* Buiten het menu klikken sluit het */
  document.addEventListener("click", function(e){
    if(!e.target.closest(".nav__uit")){ sluitAlles(); }
  });

  /* Escape sluit en zet de aandacht terug op de knop */
  document.addEventListener("keydown", function(e){
    if(e.key !== "Escape"){ return; }
    var open = knoppen.filter(function(k){ return k.getAttribute("aria-expanded") === "true"; })[0];
    if(open){ open.setAttribute("aria-expanded", "false"); open.focus(); }
  });

  /* Na het kiezen van een pagina het menu dichtdoen */
  window.addEventListener("hashchange", function(){ sluitAlles(); });
})();



/* Schuifrijen: stappen en losse rijen die niet in de breedte passen.
   De bediening komt onder de rij te staan: een voortgangsbalk plus twee
   pijlen. Zo is het meteen duidelijk dat er meer naast staat. */
} catch (fout) { console.error("Onderdeel werkt niet: uitklapmenu", fout); }

/* ---- uitklapmenu ---- */
try {
(function(){
  var rijen = Array.prototype.slice.call(document.querySelectorAll(".stappen, .rij-slider"));
  if(!rijen.length){ return; }

  var pijl = {
    links: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    rechts: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  rijen.forEach(function(rij){
    var houder = document.createElement("div");
    houder.className = "slider";
    rij.parentNode.insertBefore(houder, rij);
    houder.appendChild(rij);

    var voet = document.createElement("div");
    voet.className = "slider__voet";
    houder.appendChild(voet);

    var balk = document.createElement("div");
    balk.className = "slider__balk";
    balk.setAttribute("aria-hidden", "true");
    var vulling = document.createElement("span");
    balk.appendChild(vulling);
    voet.appendChild(balk);

    var knoppen = document.createElement("div");
    knoppen.className = "slider__knoppen";
    voet.appendChild(knoppen);

    function maakKnop(kant, label){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "slider__knop";
      b.innerHTML = pijl[kant];
      b.setAttribute("aria-label", label);
      knoppen.appendChild(b);
      return b;
    }
    var vorige = maakKnop("links", "Vorige");
    var volgende = maakKnop("rechts", "Volgende");

    function stap(){
      var eerste = rij.querySelector("li, .kaart");
      if(!eerste){ return rij.clientWidth; }
      var gat = parseFloat(getComputedStyle(rij).columnGap) || 24;
      return eerste.getBoundingClientRect().width + gat;
    }

    function bij(){
      var ruimte = rij.scrollWidth - rij.clientWidth;
      var schuifbaar = ruimte > 6;
      houder.classList.toggle("slider--schuifbaar", schuifbaar);
      if(!schuifbaar){ return; }

      /* De balk laat zien hoeveel er zichtbaar is en waar je bent */
      var deel = rij.clientWidth / rij.scrollWidth;
      var pos = rij.scrollLeft / ruimte;
      vulling.style.width = (deel * 100).toFixed(1) + "%";
      vulling.style.transform = "translateX(" + (pos * (100 / deel - 100)).toFixed(1) + "%)";

      vorige.disabled = rij.scrollLeft <= 2;
      volgende.disabled = rij.scrollLeft >= ruimte - 2;
    }

    vorige.addEventListener("click", function(){
      rij.scrollBy({left: -stap(), behavior: "smooth"});
    });
    volgende.addEventListener("click", function(){
      rij.scrollBy({left: stap(), behavior: "smooth"});
    });

    rij.addEventListener("scroll", bij, {passive:true});
    window.addEventListener("resize", bij);
    window.addEventListener("load", bij);
    /* Pagina's die nog niet in beeld zijn staan op hidden en hebben dan breedte
       nul. Zodra ze zichtbaar worden moet er opnieuw gemeten worden, anders
       blijft de bediening onterecht weg. */
    window.addEventListener("hashchange", function(){ setTimeout(bij, 30); });
    if(window.ResizeObserver){
      new ResizeObserver(bij).observe(rij);
    }
    bij();
    if(document.fonts && document.fonts.ready){ document.fonts.ready.then(bij); }
  });
})();



/* Mobiel menu: openen, sluiten en netjes opruimen bij schermwissel. */
} catch (fout) { console.error("Onderdeel werkt niet: uitklapmenu", fout); }

/* ---- mobiel menu ---- */
try {
(function(){
  var knop = document.querySelector(".menu-knop");
  var kop = document.querySelector(".kop");
  var paneel = document.getElementById("hoofdmenu");
  if(!knop || !kop || !paneel){ return; }

  var label = knop.querySelector(".sr");

  function zet(open){
    kop.classList.toggle("kop--open", open);
    knop.setAttribute("aria-expanded", open ? "true" : "false");
    document.documentElement.classList.toggle("menu-vast", open);
    if(label){ label.textContent = open ? "Menu sluiten" : "Menu openen"; }
    if(!open){
      /* Ook de accordeons dichtdoen */
      paneel.querySelectorAll('.nav__knop[aria-expanded="true"]').forEach(function(k){
        k.setAttribute("aria-expanded", "false");
      });
    }
  }

  knop.addEventListener("click", function(e){
    e.stopPropagation();
    zet(knop.getAttribute("aria-expanded") !== "true");
  });

  /* Een link kiezen sluit het menu */
  paneel.addEventListener("click", function(e){
    if(e.target.closest("a")){ zet(false); }
  });

  /* Buiten het menu klikken sluit het */
  document.addEventListener("click", function(e){
    if(!kop.classList.contains("kop--open")){ return; }
    if(e.target.closest(".kop")){ return; }
    zet(false);
  });

  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && kop.classList.contains("kop--open")){
      zet(false);
      knop.focus();
    }
  });

  /* Bij het verbreden van het venster het paneel terug naar de balk */
  var breed = window.matchMedia("(min-width: 52.0625rem)");
  function bijWissel(){ if(breed.matches){ zet(false); } }
  if(breed.addEventListener){ breed.addEventListener("change", bijWissel); }
  else { window.addEventListener("resize", bijWissel); }
})();



/* Dichtheidsschuif: tekent vlokken in het vak en zegt wat je ziet.
   Bewust zonder getallen, want de juiste dichtheid verschilt per product. */
} catch (fout) { console.error("Onderdeel werkt niet: mobiel menu", fout); }

/* ---- dichtheidsschuif ---- */
try {
(function(){
  var schuif = document.getElementById("dichtheidschuif");
  if(!schuif){ return; }
  var groep = document.querySelector(".d-vlokken");
  var strook = document.querySelector(".d-strook");
  var verdict = document.getElementById("dichtheidverdict");
  var uitleg = document.getElementById("dichtheiduitleg");

  var VAK = {x:86, y:26, b:248, h:208};
  var MAX = 460;

  /* Vaste, gelijkmatig verdeelde posities, zodat het beeld niet danst
     bij elke beweging van de schuif */
  var punten = [];
  var zaad = 7;
  function toeval(){ zaad = (zaad * 16807) % 2147483647; return zaad / 2147483647; }
  for(var i = 0; i < MAX; i++){
    punten.push({
      x: VAK.x + 4 + toeval() * (VAK.b - 8),
      y: VAK.y + 4 + toeval() * (VAK.h - 8),
      r: 2.1 + toeval() * 2.3
    });
  }
  punten.forEach(function(p){
    var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x.toFixed(1));
    c.setAttribute("cy", p.y.toFixed(1));
    c.setAttribute("r", p.r.toFixed(1));
    groep.appendChild(c);
  });
  var cirkels = groep.children;

  function bij(){
    var v = parseInt(schuif.value, 10);          /* 0 tot 100 */
    var aantal = Math.round(40 + (v / 100) * (MAX - 40));
    for(var i = 0; i < cirkels.length; i++){
      cirkels[i].style.display = i < aantal ? "" : "none";
    }

    /* Bij te los inblazen zakt het materiaal en blijft er bovenin een strook over */
    var zetting = v < 40 ? (40 - v) / 40 : 0;
    strook.setAttribute("height", (zetting * 46).toFixed(1));

    var stand, kop, tekst;
    if(v < 40){
      stand = "los"; kop = "Te los ingeblazen";
      tekst = "Het materiaal zakt in de eerste jaren en laat bovenin een koude strook achter. Je ziet er niets van, want het zit achter je beschot.";
    } else if(v <= 78){
      stand = "goed"; kop = "Op de voorgeschreven dichtheid";
      tekst = "Het vak zit volledig vol en blijft zitten. Dit is wat wij vooraf uitrekenen en na de klus narekenen en vastleggen.";
    } else {
      stand = "dicht"; kop = "Te dicht ingeblazen";
      tekst = "Je gebruikt onnodig veel materiaal en zet je membraan of beschot onder druk. Duurder zonder dat je er iets voor terugkrijgt.";
    }
    verdict.textContent = kop;
    verdict.setAttribute("data-stand", stand);
    uitleg.textContent = tekst;
  }

  schuif.addEventListener("input", bij);
  bij();
})();
} catch (fout) { console.error("Onderdeel werkt niet: dichtheidsschuif", fout); }

/* ---- cookiebanner ---- */
try {
/* =========================================================================
   Cookiebanner
   Werkt samen met Google Consent Mode. De keuze gaat in een eigen cookie en
   wordt daarna doorgegeven aan Tag Manager op twee manieren: als
   consent update, en als gebeurtenis cookie_consent met twee variabelen.
   In Tag Manager kun je dus kiezen wat je gebruikt als trigger.
   ========================================================================= */
(function(){
  var balk = document.getElementById("cookiebalk");
  var keuzes = document.getElementById("cookiekeuzes");
  if(!balk){ return; }

  var vinkStatistieken = document.getElementById("cookie-statistieken");
  var vinkMarketing = document.getElementById("cookie-marketing");
  var knopOpslaan = balk.querySelector('[data-cookies="keuze"]');
  var knopInstellingen = balk.querySelector("[data-cookies-instellingen]");
  var MAANDEN = 6;

  function lees(naam){
    var m = document.cookie.match("(^|; )" + naam + "=([^;]*)");
    return m ? decodeURIComponent(m[2]) : "";
  }

  function bewaar(statistieken, marketing){
    var eind = new Date();
    eind.setMonth(eind.getMonth() + MAANDEN);
    var waarde = "v1|s=" + (statistieken ? 1 : 0) + "|m=" + (marketing ? 1 : 0);
    document.cookie = "snelcel_cookies=" + encodeURIComponent(waarde)
      + ";expires=" + eind.toUTCString()
      + ";path=/;SameSite=Lax"
      + (location.protocol === "https:" ? ";Secure" : "");
  }

  function doorgeven(statistieken, marketing){
    if(typeof gtag === "function"){
      gtag("consent", "update", {
        ad_storage:         marketing ? "granted" : "denied",
        ad_user_data:       marketing ? "granted" : "denied",
        ad_personalization: marketing ? "granted" : "denied",
        analytics_storage:  statistieken ? "granted" : "denied"
      });
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "cookie_consent",
      statistieken: statistieken,
      marketing: marketing
    });
  }

  function kies(statistieken, marketing){
    bewaar(statistieken, marketing);
    doorgeven(statistieken, marketing);
    balk.hidden = true;
  }

  /* De banner alleen laten zien als er nog geen keuze is gemaakt */
  var bestaand = lees("snelcel_cookies");
  if(!bestaand){
    balk.hidden = false;
  }

  balk.querySelectorAll("[data-cookies]").forEach(function(knop){
    knop.addEventListener("click", function(){
      var soort = knop.dataset.cookies;
      if(soort === "alles"){ kies(true, true); }
      else if(soort === "noodzakelijk"){ kies(false, false); }
      else { kies(vinkStatistieken.checked, vinkMarketing.checked); }
    });
  });

  knopInstellingen.addEventListener("click", function(){
    var open = !keuzes.hidden;
    keuzes.hidden = open;
    knopOpslaan.hidden = open;
    knopInstellingen.textContent = open ? "Instellingen" : "Verbergen";
    if(!open){ vinkStatistieken.focus(); }
  });

  /* Vanuit de footer opnieuw openen, met de huidige keuze al ingevuld */
  document.querySelectorAll("[data-cookies-open]").forEach(function(knop){
    knop.addEventListener("click", function(){
      var huidig = lees("snelcel_cookies");
      vinkStatistieken.checked = /s=1/.test(huidig);
      vinkMarketing.checked = /m=1/.test(huidig);
      keuzes.hidden = false;
      knopOpslaan.hidden = false;
      knopInstellingen.textContent = "Verbergen";
      balk.hidden = false;
      /* De balk staat vast onderaan, dus scrollen is niet nodig */
      vinkStatistieken.focus();
    });
  });
})();
} catch (fout) { console.error("Onderdeel werkt niet: cookiebanner", fout); }

/* ---- uitklapmenu ---- */
try {
/* =========================================================================
   Zoeken op de site
   De index staat in zoekindex.json en wordt bij het bouwen van de site
   gegenereerd uit alle koppen. Hij wordt pas geladen bij de eerste zoekactie,
   zodat hij het laden van de pagina niet vertraagt.
   ========================================================================= */
(function(){
  var laag = document.getElementById("zoeklaag");
  var veld = document.getElementById("zoekveld");
  var uit = document.getElementById("zoekresultaten");
  var hint = document.getElementById("zoekhint");
  if(!laag || !veld || !uit){ return; }

  var index = null, laden = false;

  function haalIndex(daarna){
    if(index){ daarna(); return; }
    if(laden){ return; }
    laden = true;
    fetch("zoekindex.json").then(function(r){ return r.json(); }).then(function(d){
      index = d.map(function(i){
        return {pagina:i.p, url:i.u, anker:i.a, kop:i.k, tekst:i.t,
                zoek:(i.k + " " + i.t + " " + i.p).toLowerCase()};
      });
      laden = false;
      daarna();
    }).catch(function(){
      laden = false;
      hint.textContent = "Zoeken lukt nu niet. Probeer het later opnieuw of bel ons.";
    });
  }

  function normaal(s){
    return s.toLowerCase()
      .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, "e").replace(/[\u00e0\u00e1\u00e2\u00e4]/g, "a")
      .replace(/[\u00ef\u00ee\u00ec\u00ed]/g, "i").replace(/[\u00f6\u00f4\u00f2\u00f3]/g, "o")
      .replace(/[\u00fc\u00fb\u00f9\u00fa]/g, "u");
  }

  function varianten(w){
    var lijst = [w];
    if(w.length >= 6){ lijst.push(w.slice(0, -1), w.slice(0, -2)); }
    else if(w.length >= 5){ lijst.push(w.slice(0, -1)); }
    return lijst;
  }

  function zoek(vraag){
    var woorden = normaal(vraag).split(/\s+/).filter(function(w){ return w.length > 1; });
    if(!woorden.length || !index){ return []; }
    var treffers = [];
    index.forEach(function(item){
      var kop = normaal(item.kop), body = normaal(item.zoek);
      var score = 0, alle = true;
      woorden.forEach(function(w){
        var beste = 0;
        varianten(w).forEach(function(v, n){
          var straf = n === 0 ? 1 : 0.5;
          var inKop = kop.indexOf(v), inBody = body.indexOf(v), p = 0;
          if(inKop === 0){ p = 12; }
          else if(inKop > 0){ p = 7; }
          else if(inBody >= 0){ p = 2; }
          beste = Math.max(beste, p * straf);
        });
        if(beste > 0){ score += beste; } else { alle = false; }
      });
      if(alle && score > 0){ treffers.push({item:item, score:score}); }
    });
    treffers.sort(function(a, b){ return b.score - a.score; });
    return treffers.slice(0, 40);
  }

  function markeer(tekst, woorden, maxLengte){
    var laag2 = normaal(tekst), start = 0;
    for(var i = 0; i < woorden.length; i++){
      var p = laag2.indexOf(woorden[i]);
      if(p >= 0){ start = Math.max(0, p - 40); break; }
    }
    var stuk = tekst.slice(start, start + maxLengte);
    if(start > 0){ stuk = "..." + stuk; }
    if(start + maxLengte < tekst.length){ stuk += "..."; }
    var veilig = stuk.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    woorden.forEach(function(w){
      if(!w){ return; }
      var stam = w.length >= 6 ? w.slice(0, -2) : w;
      var re = new RegExp("(" + stam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z\u00e0-\u00ff]{0,4})", "gi");
      veilig = veilig.replace(re, "<mark>$1</mark>");
    });
    return veilig;
  }

  var huidige = [], gekozen = -1;

  var MAX_PAGINAS = 5, MAX_PER_PAGINA = 3;

  /* De index bevat elke kop van de site, dus \u00e9\u00e9n zoekwoord levert makkelijk
     tien treffers op die allemaal naar dezelfde pagina wijzen. Daarom worden
     ze per pagina gebundeld: de paginanaam \u00e9\u00e9n keer als tussenkop, daaronder
     hooguit drie plekken op die pagina. */
  function bundel(treffers){
    var groepen = [], perPagina = {};
    treffers.forEach(function(t){
      var g = perPagina[t.item.url];
      if(!g){
        if(groepen.length >= MAX_PAGINAS){ return; }
        g = perPagina[t.item.url] = {pagina: t.item.pagina, items: []};
        groepen.push(g);
      }
      if(g.items.length < MAX_PER_PAGINA){ g.items.push(t.item); }
    });
    return groepen;
  }

  function telling(groepen){
    var n = 0;
    groepen.forEach(function(g){ n += g.items.length; });
    return n + (n === 1 ? " resultaat" : " resultaten") + " op "
      + groepen.length + (groepen.length === 1 ? " pagina" : " pagina's");
  }

  function toon(vraag){
    var woorden = normaal(vraag).split(/\s+/).filter(function(w){ return w.length > 1; });
    huidige = [];
    gekozen = -1;
    uit.innerHTML = "";

    if(vraag.trim().length < 2){
      hint.textContent = "Typ minstens twee letters. Gebruik de pijltjes en Enter om te kiezen.";
      return;
    }
    var groepen = bundel(zoek(vraag));
    if(!groepen.length){
      hint.textContent = "Niets gevonden voor \u201c" + vraag + "\u201d. Probeer een ander woord, of bel ons.";
      return;
    }
    hint.textContent = telling(groepen);

    groepen.forEach(function(groep){
      var kop = document.createElement("li");
      kop.className = "zoekgroep";
      kop.setAttribute("role", "presentation");
      kop.textContent = groep.pagina;
      uit.appendChild(kop);

      groep.items.forEach(function(item){
        var li = document.createElement("li");
        li.className = "zoektreffer";
        var a = document.createElement("a");
        a.href = item.url + "#" + item.anker;
        a.setAttribute("role", "option");
        a.innerHTML = '<span class="zoekresultaat__kop">' + markeer(item.kop, woorden, 90) + '</span>'
          + (item.tekst ? '<span class="zoekresultaat__tekst">' + markeer(item.tekst, woorden, 150) + '</span>' : '');
        li.appendChild(a);
        uit.appendChild(li);
        huidige.push(item);
      });
    });
  }

  function kies(richting){
    var knoppen = uit.querySelectorAll("a");
    if(!knoppen.length){ return; }
    gekozen = (gekozen + richting + knoppen.length) % knoppen.length;
    Array.prototype.forEach.call(knoppen, function(k, i){
      k.classList.toggle("aan", i === gekozen);
      if(i === gekozen){ k.scrollIntoView({block:"nearest"}); }
    });
  }

  var vorigeFocus = null;
  function open(){
    vorigeFocus = document.activeElement;
    laag.hidden = false;
    document.documentElement.classList.add("menu-vast");
    veld.value = "";
    haalIndex(function(){ toon(veld.value); });
    toon("");
    veld.focus();
  }
  function sluit(){
    laag.hidden = true;
    document.documentElement.classList.remove("menu-vast");
    if(vorigeFocus && vorigeFocus.focus){ vorigeFocus.focus(); }
  }

  document.querySelectorAll("[data-zoek-open]").forEach(function(b){ b.addEventListener("click", open); });
  document.querySelectorAll("[data-zoek-sluit]").forEach(function(b){ b.addEventListener("click", sluit); });
  document.querySelectorAll("[data-zoek-vul]").forEach(function(b){
    b.addEventListener("click", function(){
      veld.value = b.dataset.zoekVul;
      haalIndex(function(){ toon(veld.value); });
      veld.focus();
    });
  });

  veld.addEventListener("input", function(){ haalIndex(function(){ toon(veld.value); }); });

  veld.addEventListener("keydown", function(e){
    if(e.key === "ArrowDown"){ e.preventDefault(); kies(1); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); kies(-1); }
    else if(e.key === "Enter"){
      var knoppen = uit.querySelectorAll("a");
      if(knoppen.length){ e.preventDefault(); (knoppen[Math.max(gekozen,0)]).click(); }
    }
  });

  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && !laag.hidden){ sluit(); }
    var inVeld = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if(!inVeld && laag.hidden && (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key === "k"))){
      e.preventDefault();
      open();
    }
  });
})();
} catch (fout) { console.error("Onderdeel werkt niet: uitklapmenu", fout); }

/* ---- springen naar een anker ---- */
try {
/* =========================================================================
   Bij het openen van een adres met een hekje: een dichtgeklapt blok openen
   en er netjes naartoe scrollen. Zonder dit springt de browser naar een
   uitklapkaart die dicht staat en zie je niets.
   ========================================================================= */
(function(){
  function naarAnker(){
    if(!location.hash || location.hash.length < 2){ return; }
    var doel;
    try { doel = document.querySelector(location.hash); } catch(e){ return; }
    if(!doel){ return; }
    var blok = doel.closest("details");
    while(blok){ blok.open = true; blok = blok.parentElement && blok.parentElement.closest("details"); }
    setTimeout(function(){
      doel.scrollIntoView({behavior:"smooth", block:"center"});
      doel.classList.add("zoek-gevonden");
      setTimeout(function(){ doel.classList.remove("zoek-gevonden"); }, 1800);
    }, 60);
  }
  window.addEventListener("hashchange", naarAnker);
  if(document.readyState === "complete"){ naarAnker(); }
  else { window.addEventListener("load", naarAnker); }
})();
} catch (fout) { console.error("Onderdeel werkt niet: springen naar een anker", fout); }

/* ---- telefoonnummer invullen ---- */
try {
/* =========================================================================
   Het telefoonnummer staat niet leesbaar in de HTML-bron, zodat bots die
   adressen oogsten er niets vinden. Hier wordt het teruggezet: de tel:-link
   krijgt zijn nummer en de plaatshouder zijn tekst. Zonder JavaScript blijft
   er "bel ons" staan en werkt het contactformulier gewoon.
   ========================================================================= */
(function(){
  function lees(w){
    try { return atob(w).split("").reverse().join(""); } catch(e){ return ""; }
  }
  function vul(){
    var links = document.querySelectorAll("a[data-bel]");
    for(var i = 0; i < links.length; i++){
      var n = lees(links[i].getAttribute("data-bel"));
      if(n){ links[i].setAttribute("href", "tel:" + n); links[i].removeAttribute("data-bel"); }
    }
    var velden = document.querySelectorAll("[data-belnr]");
    for(var j = 0; j < velden.length; j++){
      var m = lees(velden[j].getAttribute("data-belnr"));
      if(m){ velden[j].textContent = m; velden[j].removeAttribute("data-belnr"); }
    }
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", vul);
  } else { vul(); }
})();
} catch (fout) { console.error("Onderdeel werkt niet: telefoonnummer invullen", fout); }

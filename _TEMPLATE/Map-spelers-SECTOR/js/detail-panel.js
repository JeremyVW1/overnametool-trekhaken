/* ═══════════════════════════════════════════════════════════════
   detail-panel.js
   Detail-paneel per record met:
   - Categorie-badges + korte beschrijving (info-veld)
   - Focus-activiteiten (categorieën + merken_gevoerd + NACE/SBI)
   - Klikbare adres (Google Maps), telefoon (tel:), website
   - BTW/KvK → CompanyWeb + Creditsafe + KBO + Pappers + KvK.nl
   - Financials: Omzet, Brutomarge, EBITDA, Winst, FTE, boekjaar, oprichting
   - Status-knoppen (★ ● ✗)
   - Bron-vermelding

   Wordt geopend via window.openDetail(naam_of_record).
   ═══════════════════════════════════════════════════════════════ */

(function () {

  function esc(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtEur(n) {
    if (n == null || n === '') return '—';
    const num = typeof n === 'number' ? n : Number(n);
    if (!Number.isFinite(num)) return '—';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1000000) return sign + '€' + (abs / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (abs >= 1000)    return sign + '€' + Math.round(abs / 1000) + 'K';
    return sign + '€' + Math.round(abs);
  }

  function provLabelOf(b) {
    return window.PROV_LABELS?.[b.provincie] || b.provincie || '';
  }
  function landLabelOf(b) {
    return window.LAND_LABELS?.[b.land] || b.land || '';
  }

  /* ─── Hoofd-render functie ─── */
  function buildDetail(b) {
    const cfg = window.SECTOR_CONFIG;
    const catKleur = (id) => cfg?.categorie_kleur?.[id] || '#9E9E9E';
    const catLabel = (id) => cfg?.categorie_label?.[id] || id;

    /* Categorie-badges */
    const cats = b.categorieen || (b.categorie ? [b.categorie] : []);
    const catBadges = cats.map(id =>
      `<span class="dp-cat-badge" style="background:${catKleur(id)}">${esc(catLabel(id))}</span>`
    ).join('');

    /* Status (★ ● ✗) — gebruik bestaande buildStatusHtml */
    const statusHtml = typeof window.buildStatusHtml === 'function'
      ? window.buildStatusHtml(b.naam) : '';

    /* Focus-activiteiten:  categorie-labels + gevoerde merken + NACE/SBI */
    const merken = (b.merken_gevoerd || []).filter(Boolean);
    const focusItems = [];
    if (cats.length) focusItems.push(...cats.map(catLabel));
    if (merken.length) focusItems.push('Voert: ' + merken.join(', '));
    const nace = b.nace || [];
    if (nace.length) focusItems.push('NACE: ' + nace.join(', '));
    const sbi = b.sbi || [];
    if (sbi.length) focusItems.push('SBI: ' + sbi.join(', '));
    const focusHtml = focusItems.length
      ? `<div class="dp-section"><div class="dp-label">Focus-activiteiten</div>
           <ul class="dp-list">${focusItems.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
         </div>`
      : '';

    /* Korte beschrijving */
    const infoHtml = b.info
      ? `<div class="dp-section"><div class="dp-label">Beschrijving</div>
           <p class="dp-info">${esc(b.info)}</p>
         </div>`
      : '';

    /* Contact: adres → Google Maps, telefoon → tel:, website */
    const contactRows = [];
    if (b.adres) {
      const land = b.land === 'BE' ? 'België' : b.land === 'NL' ? 'Nederland' : '';
      const q = encodeURIComponent(b.adres + (land ? ', ' + land : ''));
      contactRows.push(
        `<div class="dp-row">
          <span class="dp-icon">📍</span>
          <a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener" title="Open in Google Maps">
            ${esc(b.adres)}
          </a>
        </div>`
      );
    }
    const plaatsLine = [provLabelOf(b), landLabelOf(b)].filter(Boolean).join(' · ');
    if (plaatsLine && !b.adres) {
      contactRows.push(`<div class="dp-row"><span class="dp-icon">📍</span>${esc(plaatsLine)}</div>`);
    }
    if (b.telefoon) {
      const telClean = String(b.telefoon).replace(/[^+\d]/g, '');
      contactRows.push(
        `<div class="dp-row">
          <span class="dp-icon">📞</span>
          <a href="tel:${esc(telClean)}" title="Bellen">${esc(b.telefoon)}</a>
        </div>`
      );
    }
    if (b.email) {
      contactRows.push(
        `<div class="dp-row">
          <span class="dp-icon">📧</span>
          <a href="mailto:${esc(b.email)}">${esc(b.email)}</a>
        </div>`
      );
    }
    if (b.website) {
      const url = b.website.startsWith('http') ? b.website : 'https://' + b.website;
      contactRows.push(
        `<div class="dp-row">
          <span class="dp-icon">🌐</span>
          <a href="${esc(url)}" target="_blank" rel="noopener">${esc(b.website)}</a>
        </div>`
      );
    }
    const contactHtml = contactRows.length
      ? `<div class="dp-section">
           <div class="dp-label">Contact</div>
           ${contactRows.join('')}
         </div>`
      : '';

    /* BTW / KvK met externe links */
    let ondHtml = '';
    if (b.btw) {
      const num = String(b.btw).replace(/[^0-9]/g, '');
      const csNum = num.replace(/^0+/, '');
      ondHtml = `<div class="dp-section">
        <div class="dp-label">Ondernemingsnummer (BE)</div>
        <div class="dp-row dp-mono">${esc(b.btw)}</div>
        <div class="dp-links">
          <a class="dp-btn" href="https://www.companyweb.be/nl/${num}" target="_blank" rel="noopener">📊 CompanyWeb</a>
          <a class="dp-btn" href="https://www.pappers.be/nl/company/${num}" target="_blank" rel="noopener">📑 Pappers</a>
          <a class="dp-btn" href="https://app.creditsafe.com/companies/BE-X-${csNum}" target="_blank" rel="noopener">🔍 Creditsafe</a>
          <a class="dp-btn" href="https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${num}" target="_blank" rel="noopener">🏛️ KBO</a>
          <a class="dp-btn" href="https://trendstop.knack.be/nl/detail/${num}" target="_blank" rel="noopener">📈 Trends Top</a>
        </div>
      </div>`;
    } else if (b.kvk) {
      const num = String(b.kvk).replace(/[^0-9]/g, '');
      ondHtml = `<div class="dp-section">
        <div class="dp-label">KvK-nummer (NL)</div>
        <div class="dp-row dp-mono">${esc(b.kvk)}</div>
        <div class="dp-links">
          <a class="dp-btn" href="https://www.kvk.nl/orderstraat/bedrijfsprofiel/?kvknummer=${num}" target="_blank" rel="noopener">📊 KvK</a>
        </div>
      </div>`;
    } else if (b.land === 'BE' && b.naam) {
      ondHtml = `<div class="dp-section">
        <div class="dp-label">Ondernemingsnummer</div>
        <div class="dp-row" style="color:var(--color-text-muted)">Niet bekend</div>
        <div class="dp-links">
          <a class="dp-btn" href="https://kbopub.economie.fgov.be/kbopub/zoekwoordenform.html?searchWord=${encodeURIComponent(b.naam)}" target="_blank" rel="noopener">🔎 KBO zoek op naam</a>
        </div>
      </div>`;
    }

    /* Financials */
    const finRows = [];
    const finField = (label, value, cls = '') => {
      if (value == null || value === '') return '';
      return `<tr><td class="dp-fin-lbl">${label}</td><td class="dp-fin-val ${cls}">${value}</td></tr>`;
    };
    finRows.push(finField('Omzet', fmtEur(b.cw_omzet)));
    finRows.push(finField('Brutomarge', fmtEur(b.cw_brutomarge)));
    finRows.push(finField('EBITDA', fmtEur(b.bizzy_ebitda)));
    finRows.push(finField('Winst', fmtEur(b.cw_winst), b.cw_winst < 0 ? 'dp-fin-neg' : (b.cw_winst > 0 ? 'dp-fin-pos' : '')));
    finRows.push(finField('FTE', b.cw_fte ?? null));
    finRows.push(finField('Boekjaar', b.cw_jaar));
    finRows.push(finField('Oprichting', b.oprichting));

    const finHasData = finRows.some(r => r);
    const finHtml = finHasData
      ? `<div class="dp-section">
           <div class="dp-label">Financiële gegevens</div>
           <table class="dp-fin">${finRows.join('')}</table>
           ${b.financials_bron ? `<div class="dp-source">Bron: ${esc(b.financials_bron)}</div>` : ''}
         </div>`
      : '';

    /* Bron-vermelding */
    const bron = b.bron || [];
    const bronHtml = bron.length
      ? `<div class="dp-section dp-bron-section">
           <div class="dp-label">Bronnen</div>
           <div class="dp-bron">${bron.map(b => `<span class="dp-bron-tag">${esc(b)}</span>`).join('')}</div>
         </div>`
      : '';

    return { catBadges, statusHtml, infoHtml, focusHtml, contactHtml, ondHtml, finHtml, bronHtml };
  }

  /* ─── Open paneel ─── */
  window.openDetail = function (naamOrRecord) {
    let b = naamOrRecord;
    if (typeof naamOrRecord === 'string') {
      b = window.bedrijvenMap?.get(naamOrRecord)
        || window.bedrijven?.find(x => x.naam === naamOrRecord);
    }
    if (!b) {
      console.warn('[detail] record niet gevonden:', naamOrRecord);
      return;
    }

    const panel = document.getElementById('detail-panel');
    const naam  = document.getElementById('detail-naam');
    const cats  = document.getElementById('detail-cats');
    const body  = document.getElementById('detail-body');
    if (!panel || !body) return;

    const parts = buildDetail(b);

    naam.innerHTML = esc(b.naam || '');
    cats.innerHTML = parts.catBadges + (parts.statusHtml ? `<span class="dp-status">${parts.statusHtml}</span>` : '');
    body.innerHTML = [parts.infoHtml, parts.focusHtml, parts.contactHtml, parts.ondHtml, parts.finHtml, parts.bronHtml].join('');

    panel.classList.remove('hidden');
    panel.setAttribute('aria-hidden', 'false');
    body.scrollTop = 0;
  };

  window.closeDetail = function () {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
  };

  /* ─── Event handlers ─── */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('detail-close')?.addEventListener('click', window.closeDetail);
    document.querySelector('#detail-panel .detail-overlay')?.addEventListener('click', window.closeDetail);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.closeDetail();
    });
  });

  /* Globale delegatie: klik op .open-detail in elke tabel → open paneel */
  document.addEventListener('click', (e) => {
    const tgt = e.target.closest('.open-detail');
    if (!tgt) return;
    e.preventDefault();
    const naam = tgt.dataset.naam;
    if (naam) window.openDetail(naam);
  });

})();

/* Houtkaart — Zoekfunctionaliteit */

let searchTerm   = "";
let debounceTimer = null;

function initSearch() {
  const input    = document.getElementById("search");
  const clearBtn = document.getElementById("search-clear");
  const sugBox   = document.getElementById("search-suggestions");

  input.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const val = e.target.value.trim();
    clearBtn.style.display = val ? "block" : "none";

    debounceTimer = setTimeout(() => {
      searchTerm = val.toLowerCase();
      render();
      updateCounter();
      showSuggestions(val, sugBox, input);

      const visible = getVisibleCompanies();
      if (visible.length === 1) {
        map.setView([visible[0].lat, visible[0].lng], 14);
        if (markers.length === 1) markers[0].openPopup();
      }
    }, SEARCH_DEBOUNCE_MS);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) showSuggestions(input.value.trim(), sugBox, input);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) sugBox.style.display = "none";
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    sugBox.style.display = "none";
    searchTerm = "";
    render();
    updateCounter();
  });
}

function showSuggestions(val, sugBox, input) {
  sugBox.innerHTML = "";
  if (!val || val.length < 2) { sugBox.style.display = "none"; return; }

  const q     = val.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);

  const matches = bedrijven.filter(c => {
    const haystack = [c.naam, c.adres || "", c.info || ""].join(" ").toLowerCase();
    return words.every(w => haystack.includes(w));
  }).slice(0, SEARCH_MAX_RESULTS);

  if (matches.length === 0) { sugBox.style.display = "none"; return; }

  matches.forEach(c => {
    const div = document.createElement("div");
    div.className = "search-sug-item";

    const naam   = highlightMatch(escHtml(c.naam), words);
    const detail = c.adres ? ` — <span class="sug-detail">${escHtml(c.adres)}</span>` : "";
    const act    = escHtml(actLabel(c));

    div.innerHTML = `<span class="sug-naam">${naam}</span>${detail}<span class="sug-act">${act}</span>`;

    div.addEventListener("click", () => {
      input.value = c.naam;
      searchTerm  = c.naam.toLowerCase();
      sugBox.style.display = "none";
      render();
      updateCounter();
      map.setView([c.lat, c.lng], 14);
      setTimeout(() => {
        const entry = allMarkers.get(c.naam);
        if (entry && map.hasLayer(entry.marker)) entry.marker.openPopup();
      }, 100);
    });

    sugBox.appendChild(div);
  });

  sugBox.style.display = "block";
}

function highlightMatch(text, words) {
  let html = text;
  words.forEach(w => {
    const re = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    html = html.replace(re, "<b>$1</b>");
  });
  return html;
}

function matchesSearch(company) {
  if (!searchTerm) return true;
  const haystack = (company.naam + " " + (company.adres || "") + " " + (company.info || "")).toLowerCase();
  return searchTerm.split(/\s+/).filter(Boolean).every(w => haystack.includes(w));
}

function getVisibleCompanies() {
  const isAllesMode = activeRegios.size === 0 && activeActiviteiten.size === 0 && activeStatus.size === 0;

  return bedrijven.filter(c => {
    // Status filter: als actief, toon ENKEL bedrijven met die status
    if (activeStatus.size > 0) {
      const isFav = activeStatus.has("favoriet") && isFavorite(c.naam);
      const isTwf = activeStatus.has("twijfel") && isOrange(c.naam);
      if (!isFav && !isTwf) return false;
    }

    // Als niet in "Alles" modus en geen enkele activiteit geselecteerd → verberg alle houtspelers
    // Zo kan de gebruiker enkel de concurrentenlaag (diamanten) bekijken
    if (!isAllesMode && activeActiviteiten.size === 0) return false;

    if (activeRegios.has("groene_zone") && !inGroeneZone(c)) return false;

    const regioSet = new Set([...activeRegios].filter(r => r !== "groene_zone"));
    const passRegio = regioSet.size === 0 || regioSet.has(c.provincie);
    const passAct   = activeActiviteiten.size === 0 || (c.activiteiten || []).some(a => activeActiviteiten.has(a));

    if (regioSet.size > 0 && activeActiviteiten.size > 0) {
      if (!passRegio || !passAct) return false;
    } else if (regioSet.size > 0) {
      if (!passRegio) return false;
    } else if (activeActiviteiten.size > 0) {
      if (!passAct) return false;
    }

    return matchesSearch(c);
  });
}

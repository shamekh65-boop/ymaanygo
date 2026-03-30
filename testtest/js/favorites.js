/* =========================
   FAVORITES
   ========================= */
function openFavManager(){
  document.getElementById('overlay').classList.add('show');
  document.getElementById('favModal').style.display = 'flex';
  renderFavList();
}

function closeFavManager(){
  const fm = document.getElementById('favModal');
  if(fm) fm.style.display = 'none';

  document.getElementById('favName').value = "";
  document.getElementById('favAddr').value = "";

  renderQuickFavs();

  setTimeout(() => {
    const anyOpen = document.querySelector('.sheet.open');
    const pickerOpen = document.getElementById('pickModal')?.classList.contains('open');
    const homeOpen = document.getElementById('homeSheet').getAttribute('aria-hidden') === 'false';

    if(!anyOpen && !pickerOpen && !homeOpen){
      document.getElementById('overlay').classList.remove('show');
    }
  }, 30);
}

function addFav(){
  const lang = getLang();
  const name = (document.getElementById('favName').value || "").trim();
  const addr = (document.getElementById('favAddr').value || "").trim();

  if(!name || !addr){
    alert(
      lang === 'ar'
        ? "اكتب الاسم والعنوان."
        : (lang === 'en' ? "Enter name and address." : "Vul naam en adres in.")
    );
    return;
  }

  const favs = getFavs();
  favs.unshift({
    id: cryptoId(),
    name,
    addr,
    createdAt: new Date().toISOString()
  });

  setFavs(favs);

  document.getElementById('favName').value = "";
  document.getElementById('favAddr').value = "";

  renderFavList();
  renderQuickFavs();
}

function removeFav(id){
  setFavs(getFavs().filter(x => x.id !== id));
  renderFavList();
  renderQuickFavs();
}

function renderFavList(){
  const favs = getFavs();
  const lang = getLang();
  const wrap = document.getElementById('favList');

  if(!wrap) return;

  if(!favs.length){
    wrap.innerHTML = `
      <div style="color:var(--muted);font-size:10px;">
        ${
          lang === 'ar'
            ? 'لا يوجد مفضلة بعد.'
            : (lang === 'en' ? 'No favorites yet.' : 'Nog geen favorieten.')
        }
      </div>
    `;
    return;
  }

  wrap.innerHTML = favs.map(f => `
    <div class="block" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
      <div style="min-width:0">
        <div style="font-weight:950;font-size:12px;">${escapeHtml(f.name)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px;word-break:break-word">${escapeHtml(f.addr)}</div>
      </div>
      <button class="icon" type="button" onclick="removeFav('${f.id}')" title="Delete">🗑️</button>
    </div>
  `).join("");
}

function renderQuickFavs(){
  const favs = getFavs().slice(0, 6);
  const lang = getLang();
  const grid = document.getElementById('quickFavGrid');

  if(!grid) return;

  if(!favs.length){
    grid.innerHTML = `
      <div style="color:var(--muted);font-size:10px;">
        ${
          lang === 'ar'
            ? 'أضف مفضلات من ⭐ لتظهر هنا.'
            : (lang === 'en'
              ? 'Add favorite addresses via ⭐ to show them here.'
              : 'Voeg favorieten adressen toe via ⭐ om hier te tonen.')
        }
      </div>
    `;
    return;
  }

  grid.innerHTML = favs.map(f => `
    <button
      class="block"
      type="button"
      style="text-align:left;cursor:pointer"
      onclick="quickFavTo('${escapeHtmlAttr(f.addr)}')"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="min-width:0">
          <div style="font-weight:950;display:flex;align-items:center;gap:8px;font-size:12px;">
            <span class="badge">★</span>
            <span>${escapeHtml(f.name)}</span>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:4px;word-break:break-word">${escapeHtml(f.addr)}</div>
        </div>
        <div style="opacity:.8">→</div>
      </div>
    </button>
  `).join("");
}

function quickFavTo(addr){
  document.getElementById('to').value = addr;
  hideSuggest('to');
  updateFooterButtons();
  document.getElementById('to').focus();
  setTimeout(()=>document.getElementById('to').blur(), 0);
  autoCalc(true);
}

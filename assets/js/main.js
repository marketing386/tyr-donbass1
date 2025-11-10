
(function(){
  const state = {
    agency:null,
    tours:null
  };

  async function loadJSON(path){
    const r = await fetch(path, {cache:'no-store'});
    return await r.json();
  }

  function fmtPrice(n, currency='RUB'){
    if(n==null || isNaN(n)) return 'Цена по запросу';
    return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  }

  function monthName(mm){
    return {'01':'Январь','02':'Февраль','03':'Март','04':'Апрель','05':'Май','06':'Июнь','07':'Июль','08':'Август','09':'Сентябрь','10':'Октябрь','11':'Ноябрь','12':'Декабрь'}[mm]||mm;
  }

  function parseFirstDate(datesStr){
    // Patterns: "19.11–20.11" or "29.12" or "28.11–01.12"
    try{
      const now = new Date();
      let first = datesStr.split('–')[0].trim(); // "19.11" or "29.12"
      const [dd, mm] = first.split('.').map(x=>parseInt(x,10));
      let year = now.getFullYear();
      // ensure future-ish
      if((mm-1) < now.getMonth() || ((mm-1)===now.getMonth() && dd < now.getDate())){
        year += 1;
      }
      return new Date(year, mm-1, dd, 8, 0, 0);
    }catch(e){ return null;}
  }

  function createCard(item){
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('itemscope','');
    card.setAttribute('itemtype','https://schema.org/Offer');
    card.innerHTML = `
      <img src="${item.image || '/assets/images/placeholders/placeholder-16x9.svg'}" alt="Изображение тура ${item.title}">
      <div class="pad">
        <div>${item.badge?`<span class="badge">${item.badge}</span>`:''}</div>
        <h3 itemprop="name">${item.title}</h3>
        <div class="muted">${item.location||''} · ${item.dates||''} ${item.nights?`· ${item.nights} н.`:''}</div>
        <div class="price-line">
          <span class="price" itemprop="price">${fmtPrice(item.price,item.currency)}</span>
          <button class="btn btn-primary" data-open-modal data-fill-destination="${item.title}">Выбрать тур</button>
        </div>
        ${item.link?`<meta itemprop="url" content="${item.link}">`:''}
        ${item.currency?`<meta itemprop="priceCurrency" content="${item.currency}">`:''}
      </div>`;
    return card;
  }

  function fillHeaderFooter(){
    if(!state.agency) return;
    const a = state.agency;

    // Phones in header
    const telMain = document.querySelector('.tel-main');
    if(a.phones_main && a.phones_main[0] && telMain){
      telMain.textContent = formatPhone(a.phones_main[0]);
      telMain.href = 'tel:' + a.phones_main[0];
    }
    // Telegram
    const tgLink = document.getElementById('tgLink');
    const tgFooter = document.getElementById('tgFooter');
    const tgContacts = document.getElementById('tgContacts');
    [tgLink, tgFooter, tgContacts].forEach(el=>{ if(el && a.telegram_channel){el.href = a.telegram_channel;} });

    // Footer legal
    document.getElementById('brandFooter')?.replaceChildren(document.createTextNode(a.brand||'Донбасс-Тур'));
    document.getElementById('legalName')?.replaceChildren(document.createTextNode(a.legal_name));
    const regA = document.getElementById('registryLink'); if(regA){ regA.href = a.registry_url; }
    const rn = document.getElementById('registryNote'); if(rn){ rn.textContent = '— ' + (a.registry_note||''); }

    const phonesUl = document.getElementById('phonesList');
    if(phonesUl){
      phonesUl.innerHTML = '';
      a.managers.forEach(m=>{
        const li = document.createElement('li');
        li.innerHTML = `<a href="tel:${m.phone}">${m.name}: ${formatPhone(m.phone)}</a>`;
        phonesUl.appendChild(li);
      });
    }

    const callPhones = document.getElementById('callPhones');
    if(callPhones){
      callPhones.innerHTML = a.managers.map(m=>`<a href="tel:${m.phone}">${formatPhone(m.phone)}</a>`).join(' · ');
    }

    const addrUl = document.getElementById('addressesList');
    if(addrUl){
      a.addresses.forEach(ad=>{ const li = document.createElement('li'); li.textContent = ad; addrUl.appendChild(li); });
    }

    const addrFull = document.getElementById('addressesFull');
    if(addrFull){
      a.addresses.forEach(ad=>{ const li = document.createElement('li'); li.textContent = ad; addrFull.appendChild(li); });
    }

    const managersList = document.getElementById('managersList');
    if(managersList){
      a.managers.forEach(m=>{ const li=document.createElement('li'); li.innerHTML=`<a href="tel:${m.phone}">${m.name}: ${formatPhone(m.phone)}</a>`; managersList.appendChild(li); });
    }

    document.getElementById('tgContacts')?.setAttribute('href', a.telegram_channel);
    document.getElementById('tgFooter')?.setAttribute('href', a.telegram_channel);

    // Year
    const y = document.getElementById('yearNow'); if(y) y.textContent = new Date().getFullYear();

    // JSON-LD Organization/TravelAgency
    const org = {
      "@context":"https://schema.org",
      "@type":["Organization","TravelAgency"],
      "name": a.brand || "Донбасс-Тур",
      "url": location.origin,
      "telephone": a.phones_main?.[0] || "",
      "sameAs": a.telegram_channel ? [a.telegram_channel] : []
    };
    const s = document.createElement('script');
    s.type="application/ld+json"; s.textContent = JSON.stringify(org);
    document.head.appendChild(s);
  }

  function formatPhone(p){
    // convert +79595069445 to +7 959 506-94-45
    const digits = (p||'').replace(/\D/g,'');
    if(digits.length<11) return p;
    return `+7 ${digits.slice(1,4)} ${digits.slice(4,7)}-${digits.slice(7,9)}-${digits.slice(9,11)}`;
  }

  function renderCalendar(){
    const list = document.getElementById('calendarList');
    if(!list || !state.tours) return;
    const items = (state.tours.items||[]).slice();
    items.forEach(i=>i._date = parseFirstDate(i.dates||''));
    items.sort((a,b)=> (a._date||0) - (b._date||0));
    const soon = items.filter(i=>i._date && i._date>=new Date()).slice(0,6);
    list.innerHTML = '';
    soon.forEach(i=>{
      const card = document.createElement('div');
      card.className = 'calendar-card';
      card.innerHTML = `
        <div class="calendar-title">${i.title}</div>
        <div class="muted">${i.location||''} · ${i.dates||''}</div>
        <div class="countdown" id="cd_${i.slug}"></div>
        <div style="margin-top:8px"><a class="btn btn-light" href="/tours.html?location=${encodeURIComponent(i.location||'')}&month=${String(((i._date.getMonth()+1)+'').padStart(2,'0'))}">Смотреть</a></div>
      `;
      list.appendChild(card);
      startCountdown(`cd_${i.slug}`, i._date);
    });
  }

  function startCountdown(elId, targetDate){
    function tick(){
      const el = document.getElementById(elId);
      if(!el) return;
      const now = new Date();
      let diff = Math.max(0, targetDate - now);
      const days = Math.floor(diff / (1000*60*60*24));
      diff -= days*24*60*60*1000;
      const hours = Math.floor(diff / (1000*60*60));
      diff -= hours*60*60*1000;
      const minutes = Math.floor(diff/(1000*60));
      diff -= minutes*60*1000;
      const seconds = Math.floor(diff/1000);
      el.textContent = `${days}д ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  function renderFeatured(){
    const con = document.getElementById('featuredList');
    if(!con || !state.tours) return;
    const items = [];
    // pick recurring as pseudo-card + first few items
    const recs = (state.tours.recurring||[]).map(r=>({
      title:r.title, location:r.note, dates:r.schedule, nights:null, price:null, currency:'RUB', badge:r.badge, link:r.link, slug:'rec_'+Math.random().toString(36).slice(2)
    }));
    items.push(...recs);
    items.push(...(state.tours.items||[]).slice(0,5));
    con.innerHTML='';
    items.forEach(i=> con.appendChild(createCard(i)));
  }

  function applySearchForm(){
    const form = document.getElementById('searchForm');
    if(!form) return;
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const data = new FormData(form);
      const params = new URLSearchParams();
      for(const [k,v] of data.entries()){
        if(v) params.set(k,v);
      }
      location.href = '/tours.html?' + params.toString();
    });
  }

  function getMonthFromDates(dates){
    if(!dates) return '';
    const first = dates.split('–')[0].trim();
    const parts = first.split('.');
    return parts[1] || '';
  }

  function renderCatalog(){
    const wrap = document.getElementById('catalogGrouped');
    if(!wrap || !state.tours) return;
    const params = new URLSearchParams(location.search);
    const monthQ = params.get('month') || '';
    const locationQ = (params.get('location')||'').toLowerCase();
    const nightsQ = parseInt(params.get('nights')||'',10);
    const priceQ = parseInt(params.get('price')||'',10);
    const badgeQ = (params.get('badge')||'').toLowerCase();
    const sort = params.get('sort') || 'date';

    // Prefill filters UI if present
    document.getElementById('monthFilter')?.value = monthQ;
    document.getElementById('locationFilter')?.value = params.get('location')||'';
    document.getElementById('nightsFilter')?.value = params.get('nights')||'';
    document.getElementById('priceFilter')?.value = params.get('price')||'';
    document.getElementById('badgeFilter')?.value = params.get('badge')||'';
    document.getElementById('sortSelect')?.value = sort;

    let items = (state.tours.items||[]).slice();
    items.forEach(i=> i._date = parseFirstDate(i.dates||''));

    items = items.filter(i=>{
      if(monthQ && getMonthFromDates(i.dates) !== monthQ) return false;
      if(locationQ && !(i.location||'').toLowerCase().includes(locationQ)) return false;
      if(nightsQ && i.nights && i.nights !== nightsQ) return false;
      if(priceQ && i.price && i.price > priceQ) return false;
      if(badgeQ && (i.badge||'').toLowerCase().indexOf(badgeQ)===-1) return false;
      return true;
    });

    if(sort==='price'){
      items.sort((a,b)=> (a.price||1e15) - (b.price||1e15));
    }else if(sort==='pop'){
      items.sort((a,b)=> ((b.link?1:0)+(b.badge?1:0)) - ((a.link?1:0)+(a.badge?1:0)));
    }else{
      items.sort((a,b)=> (a._date||0) - (b._date||0));
    }

    // group by month
    const groups = {};
    items.forEach(i=>{
      const m = getMonthFromDates(i.dates);
      const key = m || '??';
      groups[key] = groups[key] || [];
      groups[key].push(i);
    });

    wrap.innerHTML = '';
    Object.keys(groups).sort().forEach(m=>{
      const section = document.createElement('section');
      section.className = 'section-month';
      const h = document.createElement('h2');
      h.textContent = monthName(m);
      section.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'card-grid';
      groups[m].forEach(i=> grid.appendChild(createCard(i)));
      section.appendChild(grid);
      wrap.appendChild(section);
    });
  }

  function bindFilters(){
    const form = document.getElementById('filtersForm');
    if(!form) return;
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const data = new FormData(form);
      const params = new URLSearchParams();
      for(const [k,v] of data.entries()){ if(v) params.set(k,v); }
      location.search = params.toString();
    });
    document.getElementById('resetFilters')?.addEventListener('click', ()=>{
      location.search = '';
    });
  }

  function renderTourDetail(){
    const desc = document.getElementById('tourDescription');
    if(!desc || !state.tours) return;
    const feat = state.tours.featured;
    document.getElementById('tourTitle').textContent = feat.title;
    document.getElementById('tourPrice').textContent = 'от ' + fmtPrice(feat.price, feat.currency);
    desc.textContent = feat.description;
    const ul = document.getElementById('tourIncludes'); ul.innerHTML = '';
    feat.includes.forEach(x=>{ const li = document.createElement('li'); li.textContent = x; ul.appendChild(li); });
    const phones = (state.agency?.managers||[]).map(m=>m.phone);
    const phText = (phones.length?phones:feat.booking_phones||[]).map(formatPhone).join(' · ');
    document.getElementById('tourPhones').innerHTML = phText;
    // similar — pick some from items
    const sim = document.getElementById('similarList');
    (state.tours.items||[]).slice(0,4).forEach(i=> sim.appendChild(createCard(i)));
  }

  function kebabMenu(){
    const kebab = document.querySelector('.kebab');
    if(!kebab) return;
    let menu = document.querySelector('.mobile-menu');
    if(!menu){
      menu = document.createElement('div');
      menu.className = 'mobile-menu';
      menu.innerHTML = `<a href="/tours.html">Туры</a><a href="/about.html">О нас</a><a href="/services.html">Услуги</a><a href="/contacts.html">Контакты</a><a href="#" data-open-modal>Подобрать тур</a>`;
      document.body.appendChild(menu);
    }
    kebab.addEventListener('click', ()=>{ menu.classList.toggle('show'); });
    document.addEventListener('click', (e)=>{
      if(!menu.contains(e.target) && !kebab.contains(e.target)) menu.classList.remove('show');
    });
  }

  function modalSetup(){
    const modal = document.getElementById('requestModal');
    if(!modal) return;
    const openers = document.querySelectorAll('[data-open-modal]');
    openers.forEach(b=> b.addEventListener('click', (e)=>{
      const dest = e.currentTarget.getAttribute('data-fill-destination');
      if(dest) modal.querySelector('input[name="destination"]').value = dest;
      modal.setAttribute('aria-hidden','false');
    }));
    modal.querySelectorAll('[data-close-modal]').forEach(x=> x.addEventListener('click', ()=> modal.setAttribute('aria-hidden','true')));

    const f = document.getElementById('requestForm');
    const inline = document.getElementById('managerPhonesInline');
    if(state.agency){
      inline.textContent = (state.agency.managers||[]).map(m=>formatPhone(m.phone)).join(' · ');
    }
    // phone mask basic
    const phoneInput = f.querySelector('input[name="phone"]');
    phoneInput.addEventListener('input', ()=>{
      let v = phoneInput.value.replace(/[^\d]/g,'');
      if(!v.startsWith('7')) v = '7' + v;
      phoneInput.value = '+7 ' + (v.slice(1,4)||'') + (v.length>4?' ' + v.slice(4,7):'') + (v.length>7?'-' + v.slice(7,9):'') + (v.length>9?'-' + v.slice(9,11):'');
    });

    f.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!f.reportValidity()) return;
      const data = Object.fromEntries(new FormData(f).entries());
      alert('Заявка отправлена! Мы свяжемся с вами по телефону. Для быстрого бронирования звоните: ' + (state.agency.managers||[]).map(m=>formatPhone(m.phone)).join(' · '));
      modal.setAttribute('aria-hidden','true');
      f.reset();
    });
  }

  // Init
  document.addEventListener('DOMContentLoaded', async ()=>{
    try{
      [state.agency, state.tours] = await Promise.all([loadJSON('/data/agency.json'), loadJSON('/data/tours.json')]);
    }catch(e){ console.error('JSON load error', e); }
    fillHeaderFooter();
    applySearchForm();
    renderCalendar();
    renderFeatured();
    renderCatalog();
    bindFilters();
    renderTourDetail();
    kebabMenu();
    modalSetup();
  });
})();

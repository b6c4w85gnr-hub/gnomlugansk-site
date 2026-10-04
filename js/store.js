(() => {
  const api = window.GnomAPI;
  const isEnglish = document.documentElement.lang === 'en';
  const pagePath = isEnglish ? '/en' : '/';
  const state = { products: [], settings: null, category: isEnglish ? 'All' : 'Все', query: '' };
  const catMap = {
    'Костюмы':'Sets','Верхняя одежда':'Outerwear','Кофты':'Tops','Брюки':'Trousers','Платья':'Dresses'
  };
  const categoriesRu = ['Все','Костюмы','Верхняя одежда','Кофты','Брюки','Платья'];
  const categoriesEn = ['All','Sets','Outerwear','Tops','Trousers','Dresses'];

  const $ = (q) => document.querySelector(q);
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = (n) => Number(n||0).toLocaleString(isEnglish?'en-US':'ru-RU');
  const translateCategory = (c) => isEnglish ? (catMap[c] || c) : c;

  async function load() {
    const [settingsRows, products] = await Promise.all([
      api.select('site_settings','select=*&id=eq.1&limit=1'),
      api.select('products','select=*&active=eq.true&order=sort_order.asc')
    ]);
    state.settings = settingsRows?.[0];
    state.products = products || [];
    fillSettings();
    renderFilters();
    renderProducts();
  }

  function fillSettings() {
    const s = state.settings;
    if (!s) return;
    const map = {
      '[data-store-name]': s.store_name,
      '[data-hero-title]': isEnglish ? 'Kidswear for little adventures' : s.hero_title,
      '[data-hero-text]': isEnglish ? 'Bright, comfortable kidswear from Gnom in Luhansk: sets, jackets, dresses, tops and everyday essentials.' : s.hero_text,
      '[data-promo-title]': isEnglish ? '10% off your first in-store purchase' : s.promo_title,
      '[data-promo-text]': isEnglish ? 'Show this offer to the shop assistant when you visit.' : s.promo_text,
      '[data-address]': s.address || (isEnglish?'Luhansk':'Луганск'),
      '[data-hours]': s.hours,
      '[data-phone]': s.phone
    };
    for (const [sel,val] of Object.entries(map)) document.querySelectorAll(sel).forEach(el => el.textContent = val || '');
    const direct = $('[data-contact-link]');
    if (direct) {
      if (s.contact_link) { direct.href = s.contact_link; direct.classList.remove('hidden'); }
      else direct.classList.add('hidden');
    }
  }

  function renderFilters() {
    const root = $('#filters'); if (!root) return;
    const cats = isEnglish ? categoriesEn : categoriesRu;
    root.innerHTML = cats.map(cat => `<button class="filter ${state.category===cat?'active':''}" data-cat="${esc(cat)}">${esc(cat)}</button>`).join('');
    root.querySelectorAll('[data-cat]').forEach(btn => btn.addEventListener('click', () => { state.category=btn.dataset.cat; renderFilters(); renderProducts(); }));
  }

  function visibleProducts() {
    return state.products.filter(p => {
      const c = translateCategory(p.category);
      const byCat = state.category === (isEnglish?'All':'Все') || c === state.category;
      const q = state.query.trim().toLowerCase();
      return byCat && (!q || p.name.toLowerCase().includes(q) || c.toLowerCase().includes(q));
    });
  }

  function renderProducts() {
    const root = $('#products'); if (!root) return;
    const items = visibleProducts();
    if (!items.length) { root.innerHTML=`<div class="empty">${isEnglish?'Nothing found. Try another category or search.':'Ничего не нашли. Попробуйте другую категорию или запрос.'}</div>`; return; }
    root.innerHTML = items.map(p => {
      const stockClass = p.stock===0?'out':p.stock<=3?'low':'ok';
      const stockText = isEnglish ? (p.stock===0?'Out of stock':p.stock<=3?`Only ${p.stock} left`:'In stock') : (p.stock===0?'Закончился':p.stock<=3?`Осталось ${p.stock}`:'В наличии');
      return `<article class="card">
        <div class="product-img ${esc(p.color)}">${p.badge?`<span class="badge">${esc(p.badge)}</span>`:''}<span class="emoji">${esc(p.icon)}</span></div>
        <div class="product-body"><div class="meta">${esc(translateCategory(p.category))} · ${esc(p.sizes)}</div><h3>${esc(p.name)}</h3>
        <div class="product-bottom"><strong class="price">${money(p.price_rub)} ₽</strong><span class="stock ${stockClass}">${esc(stockText)}</span></div>
        <button class="btn orange order" data-product="${esc(p.name)}" ${p.stock===0?'disabled':''}>${p.stock===0?(isEnglish?'Notify me':'Сообщить о поступлении'):(isEnglish?'Book a fitting':'Хочу примерить')}</button></div>
      </article>`;
    }).join('');
    root.querySelectorAll('.order').forEach(btn => btn.addEventListener('click', () => selectProduct(btn.dataset.product)));
  }

  function selectProduct(name) {
    const field = $('#selected-product'); if (field) field.value=name;
    const text = $('#form-copy'); if (text) text.textContent = isEnglish ? `Selected: ${name}` : `Вы выбрали: ${name}`;
    document.querySelector('#contacts')?.scrollIntoView({behavior:'smooth'});
  }

  async function sendInquiry(e) {
    e.preventDefault();
    const form=e.currentTarget, status=$('#form-status');
    const name=form.elements.customer_name.value.trim();
    const phone=form.elements.phone.value.trim();
    const product=form.elements.product_name.value.trim();
    if (!name || !phone) return;
    form.querySelector('button[type=submit]').disabled=true;
    status.className=''; status.textContent=isEnglish?'Sending…':'Отправляем…';
    try { await api.insert('inquiries',{customer_name:name,phone,product_name:product,note:''}); status.className='success'; status.textContent=isEnglish?'Thanks! The shop has received your request.':'Спасибо! Заявка уже в админ-панели магазина.'; form.reset(); }
    catch(error) { console.error(error); status.className='error'; status.textContent=isEnglish?'Could not send. Check your details.':'Не получилось отправить. Проверьте данные.'; }
    form.querySelector('button[type=submit]').disabled=false;
  }

  function wire() {
    $('#search')?.addEventListener('input', e => {state.query=e.target.value;renderProducts();});
    $('#inquiry-form')?.addEventListener('submit', sendInquiry);
    document.querySelectorAll('[data-year]').forEach(el => el.textContent=new Date().getFullYear());
  }

  async function track() {
    try { await api.insert('page_views',{page_path:pagePath,language:isEnglish?'en':'ru'}); } catch (_) {}
  }

  wire();
  load().catch(err => { console.error(err); const root=$('#products'); if(root) root.innerHTML=`<div class="empty">${isEnglish?'Could not load the store. Please refresh the page.':'Не удалось загрузить магазин. Обновите страницу.'}</div>`; });
  track();
})();

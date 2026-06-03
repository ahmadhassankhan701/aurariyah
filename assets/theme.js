/**
 * Aura Riyah Theme — Lightweight vanilla JS
 * Performance-first: no heavy animation libraries
 */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* Header scroll state */
  function initHeader() {
    const header = $('.site-header');
    if (!header) return;

    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('is-solid', y > 40);
      header.classList.toggle('is-transparent', y <= 40 && header.dataset.transparent === 'true');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Hero slider */
  function initHeroSlider() {
    const slider = $('.hero-slider');
    if (!slider) return;

    const slides = $$('.hero-slide', slider);
    const dots = $$('.hero-slider__dot', slider);
    let current = 0;
    let timer;

    function goTo(index) {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
      current = index;
    }

    function next() {
      goTo((current + 1) % slides.length);
    }

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        goTo(i);
        resetTimer();
      });
    });

    function resetTimer() {
      clearInterval(timer);
      if (slides.length > 1) timer = setInterval(next, 6000);
    }

    let touchStartX = 0;
    slider.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    slider.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        goTo(diff > 0 ? (current + 1) % slides.length : (current - 1 + slides.length) % slides.length);
        resetTimer();
      }
    }, { passive: true });

    resetTimer();
  }

  /* Mobile drawer */
  function initMobileDrawer() {
    const drawer = $('.mobile-drawer');
    const openBtn = $('[data-mobile-menu-open]');
    const closeBtn = $('[data-mobile-menu-close]');
    const overlay = $('[data-overlay]');

    if (!drawer) return;

    const open = () => {
      drawer.classList.add('is-open');
      overlay?.removeAttribute('hidden');
      overlay?.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
    };
    const close = () => {
      drawer.classList.remove('is-open');
      overlay?.classList.remove('is-visible');
      overlay?.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', () => {
      close();
      closeCart();
      closeSearch();
    });
  }

  /* Cart drawer */
  function openCart() {
    const drawer = $('.cart-drawer');
    const overlay = $('[data-overlay]');
    drawer?.classList.add('is-open');
    overlay?.removeAttribute('hidden');
    overlay?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    const drawer = $('.cart-drawer');
    const overlay = $('[data-overlay]');
    drawer?.classList.remove('is-open');
    if (!$('.mobile-drawer.is-open') && !$('.search-modal.is-open')) {
      overlay?.classList.remove('is-visible');
      overlay?.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  }

  function initCart() {
    $$('[data-cart-open]').forEach((btn) => btn.addEventListener('click', openCart));
    $$('[data-cart-close]').forEach((btn) => btn.addEventListener('click', closeCart));
    initCartLineItems();

    document.addEventListener('click', async (e) => {
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (!addBtn) return;
      e.preventDefault();

      const variantId = addBtn.dataset.variantId;
      const quantity = parseInt(addBtn.dataset.quantity || '1', 10);

      addBtn.disabled = true;
      try {
        const res = await fetch(window.routes.cart_add_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: variantId, quantity }] })
        });
        if (!res.ok) throw new Error();
        await refreshCartUI();
        openCart();
      } catch {
        alert(window.cartStrings?.error || 'Error');
      } finally {
        addBtn.disabled = false;
      }
    });
  }

  function updateCartCount(count) {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });
  }

  function parseSectionHtml(sectionHtml, selector) {
    const doc = new DOMParser().parseFromString(sectionHtml, 'text/html');
    return doc.querySelector(selector) || doc.querySelector('.shopify-section') || doc.body;
  }

  async function refreshCartUI() {
    const sections = ['cart-drawer-items'];
    if ($('[data-cart-page]')) sections.push('cart-page-items');

    try {
      const res = await fetch(`${window.routes.cart_url}?sections=${sections.join(',')}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      const drawerRefresh = $('[data-cart-drawer-refresh]');
      if (drawerRefresh && data['cart-drawer-items']) {
        const node = parseSectionHtml(data['cart-drawer-items'], '[data-cart-drawer-refresh]');
        if (node) drawerRefresh.innerHTML = node.innerHTML;
      }

      const pageRefresh = $('[data-cart-page-refresh]');
      if (pageRefresh && data['cart-page-items']) {
        const node = parseSectionHtml(data['cart-page-items'], '[data-cart-page-refresh]');
        if (node) pageRefresh.innerHTML = node.innerHTML;
      }

      const cart = await fetch('/cart.js').then((r) => r.json());
      updateCartCount(cart.item_count);
      if (cart.currency) window.currency = cart.currency;
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
      return cart;
    } catch {
      return null;
    }
  }

  async function changeCartLine(line, quantity) {
    const lineEl = $(`[data-cart-line="${line}"]`);
    lineEl?.classList.add('is-updating');

    try {
      const res = await fetch(`${window.routes.cart_change_url}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity: Math.max(0, quantity) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.description || data.message || window.cartStrings?.error;
        alert(msg);
        return null;
      }
      await refreshCartUI();
      return data;
    } catch {
      alert(window.cartStrings?.error || 'Error');
      return null;
    } finally {
      lineEl?.classList.remove('is-updating');
    }
  }

  function initCartLineItems() {
    let qtyDebounce;

    document.addEventListener('click', async (e) => {
      const removeBtn = e.target.closest('[data-cart-remove]');
      if (removeBtn) {
        e.preventDefault();
        const line = parseInt(removeBtn.dataset.line, 10);
        if (line) await changeCartLine(line, 0);
        return;
      }

      const minus = e.target.closest('[data-cart-qty-minus]');
      const plus = e.target.closest('[data-cart-qty-plus]');
      if (!minus && !plus) return;

      e.preventDefault();
      const btn = minus || plus;
      const line = parseInt(btn.dataset.line, 10);
      const lineEl = $(`[data-cart-line="${line}"]`);
      const input = lineEl?.querySelector('[data-cart-qty-input]');
      if (!input || !line) return;

      let val = parseInt(input.value, 10) || 1;
      if (plus) val += 1;
      if (minus) val = Math.max(0, val - 1);
      await changeCartLine(line, val);
    });

    document.addEventListener('change', (e) => {
      const input = e.target.closest('[data-cart-qty-input]');
      if (!input) return;
      clearTimeout(qtyDebounce);
      qtyDebounce = setTimeout(async () => {
        const line = parseInt(input.dataset.line, 10);
        let val = parseInt(input.value, 10);
        if (Number.isNaN(val) || val < 0) val = 0;
        await changeCartLine(line, val);
      }, 400);
    });
  }

  /* Search modal */
  function closeSearch() {
    $('.search-modal')?.classList.remove('is-open');
  }

  function initSearch() {
    const modal = $('.search-modal');
    const input = $('.search-modal__input');
    if (!modal) return;

    $$('[data-search-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.classList.add('is-open');
        $('[data-overlay]')?.classList.add('is-visible');
        $('[data-overlay]')?.removeAttribute('hidden');
        setTimeout(() => input?.focus(), 100);
      });
    });
    $$('[data-search-close]').forEach((btn) => btn.addEventListener('click', closeSearch));

    let debounce;
    input?.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => fetchSuggestions(input.value), 300);
    });
  }

  async function fetchSuggestions(query) {
    const container = $('.search-modal__suggestions');
    if (!container || !query || query.length < 2) {
      if (container) container.innerHTML = '';
      return;
    }
    try {
      const res = await fetch(
        `${window.routes.predictive_search_url}?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=6&section_id=predictive-search`
      );
      const text = await res.text();
      const html = new DOMParser().parseFromString(text, 'text/html');
      const results = html.querySelector('.predictive-search-results');
      container.innerHTML = results ? results.innerHTML : '';
    } catch { /* silent */ }
  }

  /* Product gallery */
  function initProductGallery() {
    const gallery = $('.product-gallery');
    if (!gallery) return;

    const mainImg = $('.product-gallery__main img', gallery);
    const thumbs = $$('.product-gallery__thumb', gallery);

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const src = thumb.dataset.src;
        const alt = thumb.dataset.alt;
        if (mainImg && src) {
          mainImg.src = src;
          mainImg.alt = alt || '';
        }
        thumbs.forEach((t) => t.classList.toggle('is-active', t === thumb));
      });
    });

    $('.product-gallery__main')?.addEventListener('click', () => {
      const src = mainImg?.src;
      if (!src) return;
      const overlay = document.createElement('div');
      overlay.className = 'gallery-fullscreen';
      overlay.innerHTML = `<img src="${src}" alt=""><button aria-label="Close">&times;</button>`;
      overlay.style.cssText = 'position:fixed;inset:0;z-index:800;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;';
      overlay.querySelector('img').style.maxWidth = '95%';
      overlay.querySelector('img').style.maxHeight = '95%';
      overlay.querySelector('button').style.cssText = 'position:absolute;top:1rem;right:1rem;color:#fff;font-size:2rem;';
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.tagName === 'BUTTON') overlay.remove();
      });
      document.body.appendChild(overlay);
    });
  }

  /* Variant picker */
  function initVariantPicker() {
    const form = $('.product-form');
    if (!form) return;

    const productJson = $('#ProductJSON');
    if (!productJson) return;

    const product = JSON.parse(productJson.textContent);
    const options = $$('[data-option-index]', form);

    function getSelectedOptions() {
      return options.map((group) => {
        const selected = group.querySelector('.is-selected, input:checked');
        return selected?.dataset.value || selected?.value;
      });
    }

    function findVariant() {
      const selected = getSelectedOptions();
      return product.variants.find((v) =>
        v.options.every((opt, i) => opt === selected[i])
      );
    }

    function updateVariant(variant) {
      const priceEl = $('[data-product-price]');
      const compareEl = $('[data-product-compare]');
      const atcBtn = $('[data-add-to-cart]', form);

      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      if (compareEl) {
        compareEl.textContent = variant.compare_at_price > variant.price ? formatMoney(variant.compare_at_price) : '';
        compareEl.hidden = !(variant.compare_at_price > variant.price);
      }
      const variantInput = $('[data-variant-input]', form);
      if (variantInput) variantInput.value = variant.id;
      if (atcBtn) {
        atcBtn.dataset.variantId = variant.id;
        atcBtn.disabled = !variant.available;
        atcBtn.textContent = variant.available
          ? window.variantStrings.addToCart
          : window.variantStrings.soldOut;
      }
      $$('[data-add-to-cart]').forEach((btn) => {
        if (form.contains(btn)) btn.dataset.variantId = variant.id;
      });
      const url = new URL(window.location);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    }

    options.forEach((group) => {
      group.addEventListener('click', (e) => {
        const pill = e.target.closest('.variant-pill, .color-swatch');
        if (!pill) return;
        $$('.variant-pill, .color-swatch', group).forEach((p) => p.classList.remove('is-selected'));
        pill.classList.add('is-selected');
        const variant = findVariant();
        if (variant) updateVariant(variant);
      });
    });
  }

  function formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, window.moneyFormat);
    }
    return (cents / 100).toLocaleString(document.documentElement.lang, {
      style: 'currency',
      currency: window.currency || 'QAR'
    });
  }

  /* Accordions */
  function initAccordions() {
    $$('.accordion__trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.accordion__item');
        const wasOpen = item.classList.contains('is-open');
        $$('.accordion__item', trigger.closest('.accordion')).forEach((i) => i.classList.remove('is-open'));
        if (!wasOpen) item.classList.add('is-open');
      });
    });
  }

  /* Wishlist (localStorage) */
  function initWishlist() {
    const KEY = 'aura_wishlist';
    const get = () => JSON.parse(localStorage.getItem(KEY) || '[]');
    const set = (handles) => localStorage.setItem(KEY, JSON.stringify(handles));

    function updateUI() {
      const handles = get();
      $$('[data-wishlist-toggle]').forEach((btn) => {
        const handle = btn.dataset.productHandle;
        btn.classList.toggle('is-wishlisted', handles.includes(handle));
      });
      const countEl = $('[data-wishlist-count]');
      if (countEl) {
        countEl.textContent = handles.length;
        countEl.hidden = handles.length === 0;
      }
    }

    function removeHandle(handle) {
      let handles = get().filter((h) => h !== handle);
      set(handles);
      updateUI();
      return handles;
    }

    document.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-wishlist-remove]');
      if (removeBtn) {
        e.preventDefault();
        const handle = removeBtn.dataset.productHandle;
        removeHandle(handle);
        const card = removeBtn.closest('.product-card');
        card?.remove();
        const grid = $('[data-wishlist-grid]');
        const empty = $('[data-wishlist-empty]');
        if (grid && !grid.querySelector('.product-card')) {
          if (empty) empty.hidden = false;
        }
        return;
      }

      const btn = e.target.closest('[data-wishlist-toggle]');
      if (!btn) return;
      e.preventDefault();
      const handle = btn.dataset.productHandle;
      let handles = get();
      handles = handles.includes(handle) ? handles.filter((h) => h !== handle) : [...handles, handle];
      set(handles);
      updateUI();
    });

    updateUI();
    return { get, set, removeHandle, updateUI };
  }

  /* Wishlist page — render cards from stored handles */
  function initWishlistPage() {
    const grid = $('[data-wishlist-grid]');
    if (!grid) return;

    const KEY = 'aura_wishlist';
    const handles = JSON.parse(localStorage.getItem(KEY) || '[]');
    const empty = $('[data-wishlist-empty]');
    if (!handles.length) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    handles.forEach(async (handle) => {
      try {
        const res = await fetch(`/products/${handle}?view=card`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const card = doc.querySelector('[data-wishlist-card]') || doc.querySelector('.product-card');
        if (!card) return;

        const wrap = document.createElement('div');
        wrap.innerHTML = card.outerHTML;
        const el = wrap.firstElementChild;
        if (!el) return;

        const removeBtn = el.querySelector('[data-wishlist-remove]');
        if (!removeBtn) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'product-card__remove';
          btn.dataset.wishlistRemove = '';
          btn.dataset.productHandle = handle;
          btn.setAttribute('aria-label', 'Remove from wishlist');
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
          el.prepend(btn);
        }

        const heart = el.querySelector('[data-wishlist-toggle]');
        heart?.classList.add('is-wishlisted');

        grid.appendChild(el);
      } catch { /* skip */ }
    });
  }

  /* Recently viewed */
  function trackRecentlyViewed() {
    const productId = document.body.dataset.productId;
    if (!productId) return;
    const KEY = 'aura_recent';
    let recent = JSON.parse(localStorage.getItem(KEY) || '[]');
    recent = recent.filter((id) => id !== productId);
    recent.unshift(productId);
    recent = recent.slice(0, 12);
    localStorage.setItem(KEY, JSON.stringify(recent));
  }

  /* Collection filters mobile */
  function initCollectionFilters() {
    const openBtn = $('[data-filters-open]');
    const closeBtn = $('[data-filters-close]');
    const panel = $('.collection-filters');

    openBtn?.addEventListener('click', () => panel?.classList.add('is-mobile-open'));
    closeBtn?.addEventListener('click', () => panel?.classList.remove('is-mobile-open'));

    const gridBtn = $('[data-view-grid]');
    const listBtn = $('[data-view-list]');
    const grid = $('.collection-products');

    gridBtn?.addEventListener('click', () => {
      grid?.classList.remove('collection-products--list');
      gridBtn.classList.add('is-active');
      listBtn?.classList.remove('is-active');
    });
    listBtn?.addEventListener('click', () => {
      grid?.classList.add('collection-products--list');
      listBtn.classList.add('is-active');
      gridBtn?.classList.remove('is-active');
    });
  }

  /* Flash sale countdown */
  function initCountdown() {
    $$('[data-countdown]').forEach((el) => {
      const end = new Date(el.dataset.end).getTime();
      const units = {
        days: el.querySelector('[data-days]'),
        hours: el.querySelector('[data-hours]'),
        minutes: el.querySelector('[data-minutes]'),
        seconds: el.querySelector('[data-seconds]')
      };

      function tick() {
        const diff = Math.max(0, end - Date.now());
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (units.days) units.days.textContent = String(d).padStart(2, '0');
        if (units.hours) units.hours.textContent = String(h).padStart(2, '0');
        if (units.minutes) units.minutes.textContent = String(m).padStart(2, '0');
        if (units.seconds) units.seconds.textContent = String(s).padStart(2, '0');
      }
      tick();
      setInterval(tick, 1000);
    });
  }

  /* Quantity inputs */
  function initQuantity() {
    document.addEventListener('click', (e) => {
      const minus = e.target.closest('[data-qty-minus]');
      const plus = e.target.closest('[data-qty-plus]');
      if (!minus && !plus) return;
      const wrap = e.target.closest('.quantity-input, .cart-drawer__qty');
      const input = wrap?.querySelector('input[type="number"]');
      if (!input) return;
      const min = parseInt(input.min || '1', 10);
      const max = parseInt(input.max || '99', 10);
      let val = parseInt(input.value, 10) || 1;
      if (plus) val = Math.min(max, val + 1);
      if (minus) val = Math.max(min, val - 1);
      input.value = val;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /* Sticky ATC visibility */
  function initStickyAtc() {
    const sticky = $('.sticky-atc');
    const form = $('.product-form__actions');
    if (!sticky || !form) return;

    const observer = new IntersectionObserver(
      ([entry]) => sticky.classList.toggle('is-visible', !entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(form);
  }

  function closeQuickView() {
    $('.quick-view')?.classList.remove('is-open');
    const overlay = $('[data-overlay]');
    overlay?.classList.remove('is-visible');
    if (!$('.mobile-drawer.is-open') && !$('.cart-drawer.is-open')) {
      overlay?.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }
  }

  function extractQuickViewHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const node = doc.querySelector('[data-quick-view-content]');
    if (node) return node.innerHTML;
    if (html.includes('<html')) return '';
    return html;
  }

  /* Quick view */
  function initQuickView() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-quick-view]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const handle = btn.dataset.productHandle;
      const modal = $('.quick-view');
      const body = $('.quick-view__body');
      if (!modal || !body) return;

      body.innerHTML = '<div class="skeleton" style="height:320px;border-radius:12px"></div>';
      modal.classList.add('is-open');
      modal.removeAttribute('hidden');
      const overlay = $('[data-overlay]');
      overlay?.removeAttribute('hidden');
      overlay?.classList.add('is-visible');
      document.body.style.overflow = 'hidden';

      try {
        const res = await fetch(`/products/${handle}?view=quick`);
        const html = await res.text();
        const content = extractQuickViewHtml(html);
        body.innerHTML = content || '<p class="text-muted">Could not load product.</p>';
      } catch {
        body.innerHTML = '<p class="text-muted">Could not load product.</p>';
      }
    });

    $$('[data-quick-view-close]').forEach((btn) => {
      btn.addEventListener('click', closeQuickView);
    });

    $('[data-overlay]')?.addEventListener('click', () => {
      if ($('.quick-view.is-open')) closeQuickView();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('.quick-view.is-open')) closeQuickView();
    });
  }

  /* Init */
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('has-mobile-nav');
    initHeader();
    initHeroSlider();
    initMobileDrawer();
    initCart();
    initSearch();
    initProductGallery();
    initVariantPicker();
    initAccordions();
    initWishlist();
    initCollectionFilters();
    initCountdown();
    initQuantity();
    initStickyAtc();
    initQuickView();
    initWishlistPage();
    trackRecentlyViewed();
  });
})();

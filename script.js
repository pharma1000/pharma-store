/**
 * PHARMA 1000 - CORE ENGINE 2025
 * With Clean URL Support for SEO & Deep Linking
 */
const API_URL = "https://script.google.com/macros/s/AKfycbzaNi6UY67DS7OXV4cCNhikTlM4iJkZ5Qfx1rhrJ8l3Zba92PSDnqElOlTFdg1XpylakA/exec"; 

// ============================================
// RISK TRACKER - BEHAVIORAL ANALYSIS
// ============================================
const RiskTracker = {
    startTime: Date.now(),
    maxScroll: 0,
    imagesViewed: new Set(),
    dwellTimeImages: 0,
    dwellTimeSpecs: 0,
    lastPageChange: Date.now(),
    currentPage: 'home',
    
    // Form tracking
    keystrokes: [],
    fieldEdits: 0,
    pastes: 0,
    navigationTimes: [],
    lastFieldFocus: null,
    autofillDetected: false,
    
    init() {
        window.addEventListener('scroll', () => {
            const depth = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
            if (depth > this.maxScroll) this.maxScroll = depth;
        });
        
        // Hook into showPage to track dwell time and image views
        const originalShowPage = window.showPage;
        window.showPage = (page, param) => {
            const now = Date.now();
            const dwell = (now - this.lastPageChange) / 1000;
            
            if (this.currentPage === 'product') {
                this.dwellTimeImages += dwell * 0.6;
                this.dwellTimeSpecs += dwell * 0.4;
            }
            
            this.currentPage = page;
            this.lastPageChange = now;
            if (page === 'product' && param) this.imagesViewed.add(param);
            
            originalShowPage(page, param);
            if (page === 'checkout') setTimeout(() => this.attachFormListeners(), 500);
        };
    },
    
    attachFormListeners() {
        const form = document.querySelector('#checkout-page form');
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('keydown', (e) => this.keystrokes.push(Date.now()));
            input.addEventListener('change', () => this.fieldEdits++);
            input.addEventListener('paste', () => this.pastes++);
            input.addEventListener('focus', () => {
                const now = Date.now();
                if (this.lastFieldFocus) this.navigationTimes.push(now - this.lastFieldFocus);
                this.lastFieldFocus = now;
            });
            input.addEventListener('input', (e) => {
                if (e.inputType === 'insertReplacementText' || !e.inputType) this.autofillDetected = true;
            });
        });
    },
    
    getMetrics() {
        const sessionDuration = (Date.now() - this.startTime) / 1000;
        const avgKeystroke = this.keystrokes.length > 1 ? 
            (this.keystrokes[this.keystrokes.length-1] - this.keystrokes[0]) / this.keystrokes.length : 0;
        const avgNavSpeed = this.navigationTimes.length > 0 ? 
            this.navigationTimes.reduce((a, b) => a + b, 0) / this.navigationTimes.length : 0;
        
        // Visuals calculation (Percentage of images viewed relative to a threshold of 5 products)
        const imageViewPercent = Math.min(100, (this.imagesViewed.size / 5) * 100);

        let risk = 0;
        // 1. Speed (40%)
        if (sessionDuration < 15) risk += 40;
        else if (sessionDuration < 30) risk += 20;
        
        // 2. Visuals (30%)
        if (this.maxScroll < 0.4) risk += 15;
        if (this.imagesViewed.size === 0) risk += 15;
        
        // 3. Behavior (10%)
        if (this.pastes > 3) risk += 5;
        if (avgKeystroke < 50 && this.keystrokes.length > 0) risk += 5;
        
        // 4. Technical (20%)
        if (navigator.webdriver) risk += 20;

        return {
            image_view_percentage: Math.round(imageViewPercent),
            dwell_time_images: Math.round(this.dwellTimeImages),
            dwell_time_specs: Math.round(this.dwellTimeSpecs),
            scroll_depth: Math.round(this.maxScroll * 100),
            total_session_duration: Math.round(sessionDuration),
            keystroke_velocity: Math.round(avgKeystroke),
            checkout_navigation_speed: Math.round(avgNavSpeed),
            field_edit_count: this.fieldEdits,
            autofill_detected: this.autofillDetected,
            paste_event_count: this.pastes,
            is_headless_browser: !!navigator.webdriver,
            timezone_match: true,
            user_agent_consistency: !(/mobile/i.test(navigator.userAgent) && window.innerWidth > 1024),
            risk_score: Math.min(100, risk) + "%"
        };
    }
};

// ============================================
// CLEAN URL - SLUG HELPER FUNCTIONS
// ============================================

/**
 * Creates a URL-friendly slug from product name
 * Example: "Noreva Actipur" → "noreva-actipur"
 */
function createSlug(productName) {
    if (!productName) return '';
    return productName
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Finds a product by its URL slug
 */
function findProductBySlug(slug, products) {
    if (!slug || !products) return null;
    return products.find(p => createSlug(p.name) === slug) || null;
}

// ============================================
// CLEAN URL - URL UPDATE FUNCTION
// ============================================

/**
 * Updates URL using pushState (Clean URLs for SEO)
 */
function updateUrlForProduct(productName) {
    if (!productName) return;
    const slug = createSlug(productName);
    const newUrl = `/${slug}`;
    window.history.pushState({ product: productName }, '', newUrl);
    document.title = `${productName} | Pharma-1000`;
}

/**
 * Handles browser back/forward navigation
 */
function handleUrlNavigation() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html' || path === '') {
        showPage('home');
        return;
    }
    const slug = path.replace(/^\//, '').replace(/\/$/, '');
    if (!slug || slug.includes('.')) {
        showPage('home');
        return;
    }
    const product = findProductBySlug(slug, allProducts);
    if (product) {
        renderProductDetail(product.name);
    } else {
        showPage('home');
    }
}

// 1. GLOBAL STATE
let allProducts = [];
let designData = { status: 'open', categoryImages: {} };
let allLivraison = [];
let cart = JSON.parse(localStorage.getItem('pharmaCart')) || [];
let favorites = JSON.parse(localStorage.getItem('pharmaFavs')) || [];
let currentPage = 1;
const itemsPerPage = 30;
const MIN_ORDER = 2000; // --- MINIMUM ORDER SET TO 2000 DA ---
const categories = ["COSMETIQUE", "Hygiène Corporelle", "Huiles essentielles", "DIETETIQUE", "ARTICLE BEBE", "DISPOSITIFS MÉDICAUX", "ORTHOPÉDIQUE"];

// 2. UTILITY & HELPER FUNCTIONS
function formatDriveUrl(url) {
    if (!url) return '';
    const idMatch = url.toString().match(/[-\w]{25,}/);
    return idMatch ? `https://lh3.googleusercontent.com/d/${idMatch[0]}` : url;
}
function normalizeStr(s) {
    if(!s) return "";
    return s.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function isMatch(s1, s2) { return normalizeStr(s1) === normalizeStr(s2); }
function updateBadges() {
    const c = document.getElementById('cart-count');
    const f = document.getElementById('fav-count');
    if(c) c.innerText = cart.reduce((a, b) => a + b.qty, 0);
    if(f) f.innerText = favorites.length;
}
function toggleTheme() {
    const b = document.body, n = b.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    b.setAttribute('data-theme', n); localStorage.setItem('theme', n);
    const i = document.querySelector('.theme-toggle i'); if(i) i.className = n === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}
function hideLoader() { 
    const l = document.getElementById('loader-shell'); 
    if(l) { l.style.opacity = '0'; setTimeout(() => l.style.display = 'none', 400); }
}

// 3. RENDERERS
function productCard(p) {
    const isF = favorites.includes(p.name);
    const avail = !p.availability || isMatch(p.availability, 'disponible');
    const closed = designData.status === 'closed';
    const safeName = (p.name || "").replace(/'/g, "\\'");
    return `
      <div class="product-card" onclick="showPage('product', '${safeName}')">
        <div class="fav-heart ${isF ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav('${safeName}', this)">
          <i class="${isF ? 'fas' : 'far'} fa-heart"></i>
        </div>
        <img src="${formatDriveUrl(p.image)}" class="product-img" loading="lazy" onerror="this.src='https://via.placeholder.com/150?text=PH'">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-price">${p.price.toFixed(2)} DA</div>
          <button class="btn" onclick="event.stopPropagation(); addToCart('${safeName}')" ${!avail || closed ? 'disabled' : ''}>
            ${closed ? 'Fermé' : (avail ? 'Ajouter' : 'Rupture')}
          </button>
        </div>
      </div>`;
}

function renderHome() {
    let h = designData.status === 'closed' ? '<div class="status-stripe">BOUTIQUE FERMÉE TEMPORAIREMENT</div>' : '';
    h += `<div class="category-scroll">`;
    categories.forEach(cat => {
        const img = formatDriveUrl(designData.categoryImages[cat.trim()] || "");
        h += `<div class="cat-item" onclick="showPage('category', '${cat.replace(/'/g, "\\'")}')">
            <div class="cat-img"><img src="${img}" onerror="this.src='https://via.placeholder.com/80?text=PH'"></div>
            <span>${cat}</span></div>`;
    });
    h += `</div><div class="container">`;
    categories.forEach(cat => {
        const prods = allProducts.filter(p => isMatch(p.category, cat)).slice(0, 4);
        if(prods.length > 0) {
            h += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
                    <b>${cat}</b><span style="color:var(--primary); font-size:0.7rem; font-weight:bold; cursor:pointer;" onclick="showPage('category', '${cat.replace(/'/g, "\\'")}')">VOIR TOUT</span>
                  </div>
                  <div class="product-grid" style="margin-top:10px">${prods.map(p => productCard(p)).join('')}</div>`;
        }
    });
    h += `<div style="margin-top:40px; border-top:1px solid var(--border); padding-top:20px;"><b>Catalogue complet</b></div>
          <div class="product-grid" id="main-grid" style="margin-top:15px"></div>
          <div id="pagination-ctrl" class="pagination"></div></div>`;
    document.getElementById('home-page').innerHTML = h;
    changePage(1);
}

function changePage(p) {
    currentPage = p;
    const total = Math.ceil(allProducts.length / itemsPerPage);
    document.getElementById('main-grid').innerHTML = allProducts.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage).map(i => productCard(i)).join('');
    const ctrl = document.getElementById('pagination-ctrl');
    if (ctrl && total > 1) {
        ctrl.innerHTML = `<button class="pg-nav-btn" onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''}>Préc.</button>
        <span style="font-weight:bold; font-size:0.8rem">Page ${currentPage}/${total}</span>
        <button class="pg-nav-btn" onclick="changePage(${currentPage+1})" ${currentPage===total?'disabled':''}>Suivant</button>`;
    }
}

function showPage(page, param = null) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    if (page === 'home') {
        renderHome();
        // Reset URL to root for home page
        if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            window.history.pushState({}, '', '/');
            document.title = 'Pharma-1000 | Parapharmacie';
        }
    }
    else if (page === 'category') renderCategory(param);
    else if (page === 'product') {
        renderProductDetail(param);
        // Update URL with product slug for SEO (Clean URL)
        updateUrlForProduct(param);
    }
    else if (page === 'checkout') renderCheckout();
    else if (page === 'favorites') renderFavorites();
    else if (page === 'search') renderSearch();
    const target = document.getElementById(page + '-page');
    if(target) target.style.display = 'block';
    window.scrollTo(0,0);
}

// 4. CORE APP LOGIC
function initApp(data, skipHomeNavigation = false) {
    allProducts = data.products || []; designData = data.design || designData; allLivraison = data.livraisons || [];
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const icon = document.querySelector('.theme-toggle i'); if(icon) icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    updateBadges(); 
    // Always initialize home page to setup DOM structure
    showPage('home');
}
// ============================================
// CLEAN URL - BROWSER HISTORY NAVIGATION
// ============================================

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    handleUrlNavigation();
});

window.onload = function() {
    // Check for deep link BEFORE loading data
    const urlParams = new URLSearchParams(window.location.search);
    const urlSlug = urlParams.get('url');
    const pathSlug = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    const hasCleanUrl = pathSlug && pathSlug !== 'index.html' && !pathSlug.includes('.');
    
    // Determine which slug to use and if we should skip home navigation
    const initialSlug = urlSlug || (hasCleanUrl ? pathSlug : null);
    const hasDeepLink = !!initialSlug;
    
    // Helper function to handle deep link after data is loaded
    function handleDeepLink(skipDefault = false) {
        if (initialSlug) {
            const product = findProductBySlug(initialSlug, allProducts);
            if (product) {
                showPage('product', product.name);
                // Clean up URL - use replaceState if came from 404, otherwise keep current URL
                if (urlSlug) {
                    window.history.replaceState({}, '', '/' + initialSlug);
                }
                return true;
            } else {
                if (!skipDefault) {
                    showPage('home');
                }
                return false;
            }
        } else {
            if (!skipDefault) {
                handleUrlNavigation();
            }
            return false;
        }
    }
    
    const cached = localStorage.getItem('pharma_cache');
    let deepLinkHandled = false;
    
    if (cached) { 
        try { 
            initApp(JSON.parse(cached), hasDeepLink); 
            hideLoader();
            
            // Initialize Risk Tracking for cached load
            RiskTracker.init();
            
            // Handle deep link immediately with cached data
            deepLinkHandled = handleDeepLink(true);
        } catch(e){} 
    }
    
    fetch(API_URL, { redirect: 'follow' }).then(res => res.json()).then(data => {
        localStorage.setItem('pharma_cache', JSON.stringify(data));
        initApp(data, hasDeepLink); 
        hideLoader();
        
        // Initialize Risk Tracking
        RiskTracker.init();
        
        // Only handle deep link if we haven't already handled it with cache
        if (!deepLinkHandled) {
            handleDeepLink();
        } else {
            // If we already handled it, just ensure we're showing the right page
            // but don't navigate away from where we are
            if (!initialSlug) {
                handleUrlNavigation();
            }
        }
    }).catch(err => { if(!cached) document.getElementById('loader-shell').innerHTML = "Erreur de connexion."; });
};

// 5. SHOPPING & CART LOGIC (WITH MINIMUM ORDER FIX)
function renderCheckout() {
    let subtotal = cart.reduce((acc, i) => acc + ((allProducts.find(p=>p.name===i.name)||{price:0}).price*i.qty), 0);
    const itemsH = cart.map((item, idx) => {
        const p = allProducts.find(x => x.name === item.name);
        return `<div style="display:flex; justify-content:space-between; background:var(--card); padding:10px; margin-bottom:5px; border-radius:10px; border:1px solid var(--border)">
                <div style="font-size:0.8rem"><b>${p.name}</b><br>${p.price.toFixed(2)} DA x ${item.qty}</div>
                <i class="fas fa-trash" onclick="removeItem(${idx})" style="color:red; cursor:pointer; padding:5px;"></i></div>`;
    }).join('');
    
    const wilayas = allLivraison.map(l => `<option value="${l.wilaya}">${l.wilaya}</option>`).join('');
    
    // Check if total is enough
    const isMinMet = subtotal >= MIN_ORDER;
    const warningMsg = isMinMet ? '' : `<p style="color:red; font-weight:bold; text-align:center; font-size:0.8rem; margin:10px 0;">⚠️ Commande minimum : ${MIN_ORDER} DA (Manque : ${(MIN_ORDER - subtotal).toFixed(2)} DA)</p>`;

    document.getElementById('checkout-page').innerHTML = `<div class="container">
      <div class="return-bar" onclick="showPage('home')">← RETOUR BOUTIQUE</div>
      <h2>Votre Panier</h2>${itemsH || '<p>Votre panier est vide</p>'}
      <div style="background:var(--card); padding:15px; border-radius:15px; margin-top:15px; border:1px solid var(--border)">
        <select id="wilaya-select" onchange="updateTotal()"><option value="">Choisir Wilaya...</option>${wilayas}</select>
        <select id="method-select" onchange="updateTotal()"><option value="domicile">Domicile</option><option value="relais">Relais</option><option value="magasin">Magasin</option></select>
        <div style="display:flex; justify-content:space-between; margin-top:10px;"><span>Sous-total</span><span id="sub-val">${subtotal.toFixed(2)} DA</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Livraison</span><span id="shipping-val">0.00 DA</span></div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; color:var(--primary); font-size:1.1rem; margin-top:10px;"><span>TOTAL</span><span id="total-val">${subtotal.toFixed(2)} DA</span></div>
      </div>
      ${warningMsg}
      <form onsubmit="submitOrder(event)" ${!cart.length || designData.status === 'closed' || !isMinMet ? 'style="display:none"' : ''} style="margin-top:20px">
        <input type="text" id="order-name" name="name" placeholder="Nom Complet" required>
        <input type="email" id="order-email" name="email" placeholder="Email" required>
        <input type="tel" id="order-phone" name="phone" placeholder="Téléphone" required>
        <textarea name="address" id="addr-field" placeholder="Adresse" required rows="2"></textarea>
        <button type="submit" class="btn" style="background:#ff4757; padding:15px">CONFIRMER LA COMMANDE</button>
      </form></div>`;
}

function updateTotal() {
    const wil = document.getElementById('wilaya-select').value;
    const met = document.getElementById('method-select').value;
    const sub = cart.reduce((acc, i) => acc + ((allProducts.find(p=>p.name===i.name)||{price:0}).price*i.qty), 0);
    let ship = 0; const addr = document.getElementById('addr-field');
    if(met === 'magasin') { addr.value = "RETRAIT MAGASIN"; }
    else { if(addr.value === "RETRAIT MAGASIN") addr.value = "";
      const data = allLivraison.find(l => l.wilaya === wil);
      if(data) ship = (met === 'domicile') ? data.dPrice : data.rPrice;
    }
    document.getElementById('shipping-val').innerText = ship.toFixed(2) + " DA";
    document.getElementById('total-val').innerText = (sub + ship).toFixed(2) + " DA";
}

function submitOrder(e) {
    e.preventDefault();
    const fd = new FormData(e.target); const data = Object.fromEntries(fd.entries());
    data.wilaya = document.getElementById('wilaya-select').value || "Magasin";
    data.products = cart.map(i => `${i.name} (x${i.qty})`).join(', ');
    data.orderTotal = document.getElementById('total-val').innerText;
    data.shippingMethod = document.getElementById('method-select').value;
    
    // Add Risk Metrics with Safety Net
    try {
        const riskMetrics = RiskTracker.getMetrics();
        Object.assign(data, riskMetrics);
    } catch (err) {
        console.warn("Risk tracking failed, sending order without metrics:", err);
    }
    
    console.log("Submitting Order:", data);
    
    document.getElementById('success-page').innerHTML = `<div class="container" style="text-align:center; padding-top:50px;"><div class="success-card" style="background:var(--card); padding:30px; border-radius:20px; border:1px solid var(--border)"><i class="fas fa-check-circle" style="font-size:4rem; color:var(--primary)"></i><h1>Merci !</h1><p>Commande réussie.</p><button class="btn" onclick="location.reload()">RETOUR</button></div></div>`;
    showPage('success');
    fetch(API_URL, { method: "POST", mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(data) });
    cart=[]; localStorage.removeItem('pharmaCart'); updateBadges();
}

// REST OF HELPERS
function addToCart(n) { const entry = cart.find(i=>i.name===n); if(entry) entry.qty++; else cart.push({name:n, qty:1}); localStorage.setItem('pharmaCart', JSON.stringify(cart)); updateBadges(); const cbtn = document.getElementById('cart-btn-nav'); if(cbtn) { cbtn.classList.add('animate-bounce'); setTimeout(()=>cbtn.classList.remove('animate-bounce'), 400); } }
function toggleFav(n, el) { const idx = favorites.indexOf(n); if(idx > -1) { favorites.splice(idx,1); el.classList.remove('active'); el.querySelector('i').className='far fa-heart'; } else { favorites.push(n); el.classList.add('active'); el.querySelector('i').className='fas fa-heart'; } localStorage.setItem('pharmaFavs', JSON.stringify(favorites)); updateBadges(); }
function removeItem(idx) { cart.splice(idx,1); localStorage.setItem('pharmaCart', JSON.stringify(cart)); updateBadges(); renderCheckout(); }
function renderCategory(cat) { const filtered = allProducts.filter(p => isMatch(p.category, cat)); document.getElementById('category-page').innerHTML = `<div class="container"><div class="return-bar" onclick="showPage('home')">← RETOUR</div><b>${cat}</b><div class="product-grid" style="margin-top:15px">${filtered.map(p => productCard(p)).join('')}</div></div>`; }
function renderProductDetail(name) { const p = allProducts.find(x => x.name === name); if(!p) return showPage('home'); const related = allProducts.filter(x => isMatch(x.category, p.category) && x.name !== p.name).slice(0, 4); document.getElementById('product-page').innerHTML = `<div class="container"><div class="return-bar" onclick="showPage('home')">← RETOUR</div><div style="background:var(--card); padding:20px; border-radius:20px; text-align:center; border:1px solid var(--border); margin-top:10px;"><img src="${formatDriveUrl(p.image)}" style="height:220px; object-fit:contain; background:#fff; border-radius:10px;"><h1>${p.name}</h1><h2 style="color:var(--primary)">${p.price.toFixed(2)} DA</h2><p style="text-align:left; color:var(--text-light); font-size:0.9rem">${p.description}</p><button class="btn" onclick="addToCart('${p.name.replace(/'/g, "\\'")}')">AJOUTER AU PANIER</button></div><div style="margin-top:20px"><b>Similaires</b></div><div class="product-grid" style="margin-top:10px">${related.map(r => productCard(r)).join('')}</div></div>`; }
function renderFavorites() { const favs = allProducts.filter(p => favorites.includes(p.name)); document.getElementById('favorites-page').innerHTML = `<div class="container"><div class="return-bar" onclick="showPage('home')">← RETOUR</div><b>Mes Favoris</b><div class="product-grid" style="margin-top:15px">${favs.length ? favs.map(p => productCard(p)).join('') : '<p>Vide</p>'}</div></div>`; }
function renderSearch() { document.getElementById('search-page').innerHTML = `<div class="container"><div class="return-bar" onclick="showPage('home')">← RETOUR</div><input type="text" id="search-input" placeholder="Rechercher..." oninput="performSearch(this.value)"><div id="search-results" class="product-grid" style="margin-top:20px"></div></div>`; setTimeout(()=>document.getElementById('search-input').focus(), 100); }
function performSearch(q) { if (q.length < 2) { document.getElementById('search-results').innerHTML = ''; return; } const f = allProducts.filter(p => normalizeStr(p.name).includes(normalizeStr(q))); document.getElementById('search-results').innerHTML = f.map(p => productCard(p)).join(''); }

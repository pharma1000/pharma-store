/** 
 * CONFIGURATION: Paste your NEW Google Apps Script Web App URL below 
 * Make sure it ends in /exec
 */
const API_URL = "https://script.google.com/macros/s/AKfycbyGfgQ7LMjM4UbFodjvBVrX-gpw4E8cp_SOHNf3nvFRWruZTU2yp3FdquxIO9LtQY1Xrg/exec"; 

// Global Data State
let allProducts = [];
let designData = { status: 'open', categoryImages: {} };
let allLivraison = [];
let cart = JSON.parse(localStorage.getItem('pharmaCart')) || [];
let favorites = JSON.parse(localStorage.getItem('pharmaFavs')) || [];

// App Settings
const itemsPerPage = 30;
const categories = [
    "COSMETIQUE", 
    "Hygiène Corporelle", 
    "Huiles essentielles", 
    "DIETETIQUE", 
    "ARTICLE BEBE", 
    "DISPOSITIFS MÉDICAUX", 
    "ORTHOPÉDIQUE"
];

/**
 * 1. DATA FETCHING (CORS-Friendly)
 */
window.onload = function() {
    fetch(API_URL, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to connect to Google API');
        return response.json();
    })
    .then(data => {
        allProducts = data.products || [];
        designData = data.design || designData;
        allLivraison = data.livraisons || [];
        initApp();
    })
    .catch(err => {
        console.error("Fetch Error:", err);
        document.getElementById('loader-shell').innerHTML = 
            `<div style='color:red; padding:20px; font-family:sans-serif;'>
                <h2>Erreur de chargement</h2>
                <p>${err.message}</p>
                <button onclick="location.reload()" style="padding:10px; background:#00a86b; color:white; border:none; border-radius:5px;">Réessayer</button>
            </div>`;
    });
};

function initApp() {
    // Apply saved theme
    if(localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }
    
    updateBadges();
    showPage('home');
    
    // Smooth transition from loader to content
    const loader = document.getElementById('loader-shell');
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 500);
}

/**
 * 2. NAVIGATION & ROUTING
 */
function showPage(page, param = null) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
    if (page === 'home') renderHome();
    else if (page === 'category') renderCategory(param);
    else if (page === 'product') renderProductDetail(param);
    else if (page === 'checkout') renderCheckout();
    else if (page === 'favorites') renderFavorites();
    else if (page === 'search') renderSearch();
    
    const targetPage = document.getElementById(page + '-page');
    if(targetPage) targetPage.style.display = 'block';
    window.scrollTo(0,0);
}

/**
 * 3. RENDERING FUNCTIONS
 */
function renderHome() {
    const bannerUrl = formatDriveUrl(designData.banner);
    let html = designData.status === 'closed' ? '<div class="status-stripe">Fermé temporairement - Nous ne prenons pas de commandes</div>' : '';
    
    html += `<div class="banner" style="background-image: url('${bannerUrl}')"></div>`;
    
    // Category Round Scroll
    html += `<div class="category-scroll">`;
    categories.forEach(cat => {
        const img = formatDriveUrl(designData.categoryImages[cat.trim()] || "");
        html += `<div class="cat-item" onclick="showPage('category', '${cat.replace(/'/g, "\\'")}')">
            <div class="cat-img"><img src="${img}" onerror="this.src='https://via.placeholder.com/80?text=PH'"></div>
            <span>${cat}</span></div>`;
    });
    html += `</div><div class="container">`;

    // Featured Sections
    categories.forEach(cat => {
        const prods = allProducts.filter(p => isMatch(p.category, cat)).slice(0, 4);
        if(prods.length > 0) {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:25px;">
                        <b style="text-transform:uppercase; font-size:0.9rem;">${cat}</b>
                        <span style="color:var(--primary); font-size:0.75rem; font-weight:bold; cursor:pointer;" onclick="showPage('category', '${cat.replace(/'/g, "\\'")}')">VOIR TOUT</span>
                     </div>
                     <div class="product-grid" style="margin-top:10px">${prods.map(p => productCard(p)).join('')}</div>`;
        }
    });

    html += `<div style="margin-top:40px; border-top: 1px solid var(--border); padding-top:20px;"><b>Tous nos produits</b></div>
             <div class="product-grid" id="main-grid" style="margin-top:15px"></div>
             <div id="pagination-ctrl" style="display:flex; justify-content:center; align-items:center; gap:20px; margin:30px 0;"></div></div>`;
    
    document.getElementById('home-page').innerHTML = html;
    changePage(1);
}

function productCard(p) {
    const isF = favorites.includes(p.name);
    const avail = !p.availability || isMatch(p.availability, 'disponible');
    const closed = designData.status === 'closed';
    const n = (p.name || "").replace(/'/g, "\\'");
    
    return `
      <div class="product-card" onclick="showPage('product', '${n}')">
        <div class="fav-heart ${isF?'active':''}" onclick="event.stopPropagation(); toggleFav('${n}', this)">
          <i class="${isF?'fas':'far'} fa-heart"></i>
        </div>
        <img src="${formatDriveUrl(p.image)}" class="product-img" loading="lazy">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-price">${p.price.toFixed(2)} DA</div>
          <button class="btn" onclick="event.stopPropagation(); addToCart('${n}')" ${!avail || closed ? 'disabled' : ''}>
            ${closed ? 'Fermé' : (avail ? 'Ajouter' : 'Rupture')}
          </button>
        </div>
      </div>`;
}

function changePage(p) {
    const total = Math.ceil(allProducts.length / itemsPerPage);
    const items = allProducts.slice((p-1)*itemsPerPage, p*itemsPerPage);
    document.getElementById('main-grid').innerHTML = items.map(i => productCard(i)).join('');
    
    const ctrl = document.getElementById('pagination-ctrl');
    if (total > 1) {
        ctrl.innerHTML = `
            <button class="pg-nav-btn" onclick="changePage(${p-1})" ${p===1?'disabled':''}>Préc.</button>
            <span style="font-weight:bold; font-size:0.8rem">Page ${p} / ${total}</span>
            <button class="pg-nav-btn" onclick="changePage(${p+1})" ${p===total?'disabled':''}>Suiv.</button>`;
    }
}

/**
 * 4. CHECKOUT & ORDER LOGIC
 */
function renderCheckout() {
    let subtotal = cart.reduce((acc, i) => acc + ((allProducts.find(p=>p.name===i.name)||{price:0}).price*i.qty), 0);
    const itemsHtml = cart.map((item, idx) => {
        const p = allProducts.find(x => x.name === item.name);
        if(!p) return '';
        return `<div style="display:flex; justify-content:space-between; background:var(--card); padding:10px; margin-bottom:5px; border-radius:12px; border:1px solid var(--border)">
                  <div style="font-size:0.8rem"><b>${p.name}</b><br>${p.price.toFixed(2)} DA x ${item.qty}</div>
                  <i class="fas fa-trash" onclick="removeItem(${idx})" style="color:red; cursor:pointer; padding:5px;"></i>
                </div>`;
    }).join('');
    
    const wilayas = allLivraison.map(l => `<option value="${l.wilaya}">${l.wilaya}</option>`).join('');

    document.getElementById('checkout-page').innerHTML = `
      <div class="container">
        <div class="back-btn" onclick="showPage('home')"><i class="fas fa-arrow-left"></i> Retour boutique</div>
        <h2>Mon Panier</h2>
        ${itemsHtml || '<p style="padding:20px; text-align:center;">Votre panier est vide</p>'}
        
        <div style="background:var(--card); padding:20px; border-radius:15px; margin-top:15px; border:1px solid var(--border)">
          <label style="font-size:0.7rem; font-weight:bold; color:var(--primary);">WILAYA DE LIVRAISON</label>
          <select id="wilaya-select" onchange="updateTotal()"><option value="">Choisir Wilaya...</option>${wilayas}</select>
          
          <label style="font-size:0.7rem; font-weight:bold; color:var(--primary);">MODE DE RÉCEPTION</label>
          <select id="method-select" onchange="updateTotal()">
            <option value="domicile">Livraison à Domicile</option>
            <option value="relais">Point Relais</option>
            <option value="magasin">Retrait en Pharmacie (Gratuit)</option>
          </select>

          <div style="display:flex; justify-content:space-between; margin-top:15px; font-size:0.9rem;"><span>Sous-total</span><span>${subtotal.toFixed(2)} DA</span></div>
          <div style="display:flex; justify-content:space-between; font-size:0.9rem;"><span>Frais Livraison</span><span id="shipping-val">0.00 DA</span></div>
          <div style="display:flex; justify-content:space-between; font-weight:bold; color:var(--primary); font-size:1.2rem; margin-top:10px; border-top:1px dashed var(--border); padding-top:10px;">
            <span>TOTAL</span><span id="total-val">${subtotal.toFixed(2)} DA</span>
          </div>
        </div>

        <form onsubmit="submitOrder(event)" ${!cart.length || designData.status === 'closed' ?'style="display:none"':''} style="margin-top:25px">
          <input type="text" name="name" placeholder="Nom Complet" required>
          <input type="email" name="email" placeholder="Email (Pour suivi)" required>
          <input type="tel" name="phone" placeholder="Numéro de Téléphone" required>
          <textarea name="address" id="addr-field" placeholder="Adresse complète" required rows="3"></textarea>
          <button type="submit" class="btn" style="background:#ff4757; padding:18px; font-size:1.1rem;">CONFIRMER LA COMMANDE</button>
        </form>
      </div>`;
}

function updateTotal() {
    const wil = document.getElementById('wilaya-select').value;
    const met = document.getElementById('method-select').value;
    const sub = cart.reduce((acc, i) => acc + ((allProducts.find(p=>p.name===i.name)||{price:0}).price*i.qty), 0);
    let ship = 0;
    const addr = document.getElementById('addr-field');

    if(met === 'magasin') { 
        addr.value = "RETRAIT EN PHARMACIE"; 
        addr.readOnly = true;
    } else { 
        addr.readOnly = false; 
        if(addr.value === "RETRAIT EN PHARMACIE") addr.value = "";
        const data = allLivraison.find(l => l.wilaya === wil); 
        if(data) ship = (met === 'domicile') ? data.dPrice : data.rPrice; 
    }
    document.getElementById('shipping-val').innerText = ship.toFixed(2) + " DA";
    document.getElementById('total-val').innerText = (sub + ship).toFixed(2) + " DA";
}

function submitOrder(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const method = document.getElementById('method-select').value;
    
    data.wilaya = document.getElementById('wilaya-select').value || "Magasin";
    data.products = cart.map(i => `${i.name} (x${i.qty})`).join(', ');
    data.orderTotal = document.getElementById('total-val').innerText;
    data.shippingMethod = method;

    // Instant Feedback UI
    const msg = (method === 'magasin') ? "Nous vous attendons en pharmacie !" : "Commande confirmée, nous vous contacterons bientôt.";
    document.getElementById('success-page').innerHTML = `
        <div class="container" style="text-align:center; padding-top:50px;">
            <div class="success-card" style="background:var(--card); padding:40px; border-radius:25px; border:1px solid var(--border)">
                <i class="fas fa-check-circle" style="font-size:5rem; color:var(--primary); margin-bottom:20px;"></i>
                <h1 style="color:var(--primary)">Merci !</h1>
                <p style="font-size:1.1rem; color:var(--text-light); line-height:1.6; margin-bottom:30px;">${msg}</p>
                <button class="btn" onclick="location.reload()">RETOUR À LA BOUTIQUE</button>
            </div>
        </div>`;
    showPage('success');
    
    // Async Background Send (No wait)
    fetch(API_URL, {
        method: "POST",
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
    });

    // Clear local cart
    cart = [];
    localStorage.removeItem('pharmaCart');
    updateBadges();
}

/**
 * 5. UTILITY FUNCTIONS
 */
function isMatch(s1, s2) {
    if(!s1 || !s2) return false;
    const clean = (s) => s.toString().toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return clean(s1) === clean(s2);
}

function formatDriveUrl(url) {
    if (!url) return 'https://via.placeholder.com/150';
    const idMatch = url.toString().match(/[-\w]{25,}/);
    return idMatch ? `https://lh3.googleusercontent.com/d/${idMatch[0]}` : url;
}

function updateBadges() {
    document.getElementById('cart-count').innerText = cart.reduce((a, b) => a + b.qty, 0);
    document.getElementById('fav-count').innerText = favorites.length;
}

function toggleFav(n, el) {
    const idx = favorites.indexOf(n);
    if(idx > -1) { 
        favorites.splice(idx,1); 
        el.classList.remove('active'); 
        el.querySelector('i').className='far fa-heart'; 
    } else { 
        favorites.push(n); 
        el.classList.add('active'); 
        el.querySelector('i').className='fas fa-heart'; 
    }
    localStorage.setItem('pharmaFavs', JSON.stringify(favorites));
    updateBadges();
    const navH = document.getElementById('fav-btn-nav');
    navH.classList.add('animate-bounce'); 
    setTimeout(()=>navH.classList.remove('animate-bounce'), 400);
}

function addToCart(n) {
    const entry = cart.find(i => i.name === n);
    if(entry) entry.qty++; else cart.push({name: n, qty: 1});
    localStorage.setItem('pharmaCart', JSON.stringify(cart));
    updateBadges();
    const cbtn = document.getElementById('cart-btn-nav');
    cbtn.classList.add('animate-bounce'); 
    setTimeout(()=>cbtn.classList.remove('animate-bounce'), 400);
}

function removeItem(idx) {
    cart.splice(idx,1);
    localStorage.setItem('pharmaCart', JSON.stringify(cart));
    updateBadges();
    renderCheckout();
}

function toggleTheme() {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.querySelector('.theme-toggle').className = next === 'dark' ? 'fas fa-sun theme-toggle' : 'fas fa-moon theme-toggle';
}

function renderCategory(cat) {
    const filtered = allProducts.filter(p => isMatch(p.category, cat));
    document.getElementById('category-page').innerHTML = `
        <div class="container">
            <div class="back-btn" onclick="showPage('home')">← RETOUR</div>
            <div style="margin-bottom:15px; border-left:4px solid var(--primary); padding-left:10px;">
                <h2 style="margin:0; text-transform:uppercase; font-size:1rem;">${cat}</h2>
            </div>
            <div class="product-grid">${filtered.map(p => productCard(p)).join('')}</div>
        </div>`;
}

function renderProductDetail(name) {
    const p = allProducts.find(x => x.name === name);
    if(!p) return showPage('home');
    const related = allProducts.filter(x => isMatch(x.category, p.category) && x.name !== p.name).slice(0, 4);
    document.getElementById('product-page').innerHTML = `
        <div class="container">
            <div class="back-btn" onclick="showPage('home')">← RETOUR</div>
            <div style="background:var(--card); padding:20px; border-radius:20px; text-align:center; border:1px solid var(--border); margin-top:10px;">
                <img src="${formatDriveUrl(p.image)}" style="height:220px; width:100%; object-fit:contain; background:#fff; border-radius:10px;">
                <h1 style="font-size:1.3rem; margin:15px 0 5px;">${p.name}</h1>
                <h2 style="color:var(--primary); margin-bottom:15px;">${p.price.toFixed(2)} DA</h2>
                <p style="text-align:left; color:var(--text-light); font-size:0.9rem; line-height:1.6; white-space:pre-line;">${p.description}</p>
                <button class="btn" style="margin-top:20px; padding:15px;" onclick="addToCart('${p.name.replace(/'/g, "\\'")}')">AJOUTER AU PANIER</button>
            </div>
            <div style="margin-top:30px; border-left:4px solid var(--primary); padding-left:10px;"><b>PRODUITS SIMILAIRES</b></div>
            <div class="product-grid" style="margin-top:15px">${related.map(r => productCard(r)).join('')}</div>
        </div>`;
}

function renderFavorites() {
    const favs = allProducts.filter(p => favorites.includes(p.name));
    document.getElementById('favorites-page').innerHTML = `
        <div class="container">
            <div class="back-btn" onclick="showPage('home')">← RETOUR</div>
            <div style="border-left:4px solid var(--primary); padding-left:10px;"><b>MES FAVORIS</b></div>
            <div class="product-grid" style="margin-top:15px">
                ${favs.length ? favs.map(p => productCard(p)).join('') : '<p style="text-align:center; padding:50px; color:var(--text-light);">Aucun favori pour le moment.</p>'}
            </div>
        </div>`;
}

function renderSearch() {
    document.getElementById('search-page').innerHTML = `
        <div class="container">
            <div class="back-btn" onclick="showPage('home')">← RETOUR</div>
            <input type="text" id="search-input" placeholder="Rechercher un produit..." oninput="performSearch(this.value)" style="margin-top:10px;">
            <div id="search-results" class="product-grid" style="margin-top:20px"></div>
        </div>`;
    setTimeout(()=> {
        const inp = document.getElementById('search-input');
        if(inp) inp.focus();
    }, 100);
}

function performSearch(q) {
    const results = document.getElementById('search-results');
    if (q.length < 2) { results.innerHTML = ''; return; }
    const filtered = allProducts.filter(p => 
        isMatch(p.name, q) || 
        isMatch(p.category, q) || 
        p.name.toLowerCase().includes(q.toLowerCase())
    );
    results.innerHTML = filtered.map(p => productCard(p)).join('');
}

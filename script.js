const API_URL = "https://script.google.com/macros/s/AKfycbzaNi6UY67DS7OXV4cCNhikTlM4iJkZ5Qfx1rhrJ8l3Zba92PSDnqElOlTFdg1XpylakA/exec"; 

let allProducts = [];
let designData = { status: 'open', categoryImages: {} };
let allLivraison = [];
let cart = JSON.parse(localStorage.getItem('pharmaCart')) || [];
let favorites = JSON.parse(localStorage.getItem('pharmaFavs')) || [];
const itemsPerPage = 30;
const categories = ["COSMETIQUE", "Hygiène Corporelle", "Huiles essentielles", "DIETETIQUE", "ARTICLE BEBE", "DISPOSITIFS MÉDICAUX", "ORTHOPÉDIQUE"];

window.onload = function() {
    // 1. Try to load from local memory for speed
    const cachedStore = localStorage.getItem('pharma_cache');
    if (cachedStore) {
        try {
            const data = JSON.parse(cachedStore);
            renderWithData(data);
            hideLoader();
        } catch(e) { localStorage.removeItem('pharma_cache'); }
    }

    // 2. Fetch fresh data using a clean Request object
    fetch(API_URL)
    .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
    })
    .then(data => {
        // Update variables and local storage
        allProducts = data.products || [];
        designData = data.design || designData;
        allLivraison = data.livraisons || [];
        localStorage.setItem('pharma_cache', JSON.stringify(data));
        
        renderWithData(data);
        hideLoader();
    })
    .catch(err => {
        console.error("Fetch failed:", err);
        // If we don't even have a cache, show the error on screen
        if (!localStorage.getItem('pharma_cache')) {
            document.getElementById('loader-shell').innerHTML = 
            `<div style="padding:40px; text-align:center; color:red; font-family:sans-serif;">
                <b>Erreur de connexion</b><br>
                Impossible de joindre le serveur Google.<br>
                <small>${err.message}</small><br><br>
                <button onclick="location.reload()" style="padding:10px; background:#00a86b; color:white; border:none; border-radius:8px;">Réessayer</button>
            </div>`;
        }
    });
};

function renderWithData(data) {
    allProducts = data.products || [];
    designData = data.design || designData;
    allLivraison = data.livraisons || [];
    if(localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    updateBadges();
    showPage('home');
}

function hideLoader() {
    const loader = document.getElementById('loader-shell');
    if(loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);
    }
}

// ... PASTE THE REST OF YOUR FUNCTIONS (showPage, renderHome, productCard, etc.) BELOW THIS LINE

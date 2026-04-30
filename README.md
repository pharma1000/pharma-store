# Pharma-1000 Store

Votre parapharmacie en ligne sur GitHub Pages avec support **Clean URLs** pour un meilleur SEO.

## Fonctionnalités

- ✅ **Clean URLs** - URLsSEO-friendly (ex: `/noreva-actipur`)
- ✅ **Deep Linking** - Accès direct aux produits via URL
- ✅ **Data Persistence** - Données toujours fraîches depuis Google Sheets
- ✅ **SPA Routing** - Navigation fluide sans rechargement
- ✅ **404.html Redirect** - Support pour GitHub Pages

## Configuration

### 1. Google Sheets

Remplacez `YOUR_GOOGLE_SHEET_URL_HERE` dans `script.js` par l'URL de votre Google Sheet au format JSON.

### 2. GitHub Pages

1. Poussez ce repository sur GitHub
2. Activez GitHub Pages dans Settings → Pages
3. Sélectionnez `main` branch et `/ (root)` folder

## Structure des données Google Sheet

Le script s'attend à un tableau JSON avec les colonnes:
- `nom` - Nom du produit
- `prix` - Prix (optionnel)
- `description` - Description (optionnel)
- `image` - URL de l'image (optionnel)
- `composition` - Composition (optionnel)
- `usage` - Mode d'emploi (optionnel)
- `lien` - Lien d'achat (optionnel)

## Architecture

```
index.html     → Page principale (SPA)
script.js      → Logique Clean URLs + Google Sheets
style.css      → Styles
404.html       → Redirect pour GitHub Pages
```

## Comment ça marche

1. **URL Sync**: `window.history.pushState()` met à jour l'URL sans rechargement
2. **Deep Linking**: Au chargement, on vérifie si l'URL contient un slug produit
3. **Data Persistence**: Les données sont toujours chargées depuis Google Sheets
4. **404 Handling**: 404.html redirige vers index.html en préservant le path

---
© 2026 Pharma-1000
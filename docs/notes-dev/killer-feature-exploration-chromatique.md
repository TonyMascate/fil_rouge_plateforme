# Killer Feature — Exploration Chromatique (POC)

## Contexte

Proposition retenue suite à une matrice de décision parmi 3 options (Exploration Chromatique, Carte Interactive, Recherche Sémantique IA). Score : **36/40** grâce à sa valeur ajoutée UX et son caractère innovant.

Concept : naviguer dans sa galerie photo par **ambiance colorielle** plutôt que par date ou lieu. L'utilisateur explore un nuage de bulles colorées, chaque bulle représentant un cluster de photos partageant la même dominante chromatique.

---

## Architecture technique

### Vue d'ensemble du flux

```
Upload photo
    ↓
Sharp (resize + webp)        ← pipeline existant
    ↓ (fork via clone())
Extraction couleur dominante ← nouveau
    ↓
dominant_color stocké en BDD
    ↓
GET /photos/colors
    ↓
K-means clustering (backend)
    ↓
ChromaticExplorer (frontend)
```

---

## 1. Extraction de la couleur dominante

**Fichier :** `apps/api/src/photo/photo.processor.ts`

### Problème initial : la moyenne naïve

La première approche consistait à redimensionner l'image à **1×1 pixel** avec Sharp :

```typescript
sharp().resize(1, 1).raw().toBuffer()
// → 3 octets = R, G, B moyens de toute l'image
```

**Problème :** la moyenne de tous les pixels produit une couleur grisâtre et désaturée. Une photo de coucher de soleil (orange + ciel bleu) donne `#8a7a6b` — du marron sans signification visuelle.

### Problème de la moyenne des pixels saturés

Deuxième tentative : trier les pixels par saturation HSL et faire la moyenne des 20% les plus saturés. Même résultat incorrect pour une image avec deux zones de couleurs opposées (ex: orange + bleu → moyenne crème `#c3c3a1`).

### Solution retenue : histogramme de teinte (Hue Histogram)

```typescript
// 1. Redimensionner à 50×50 (2500 pixels — compromis qualité/perf)
// 2. Exclure pixels quasi-noirs (L < 0.08) et quasi-blancs (L > 0.92)
// 3. Exclure pixels trop désaturés (S < 0.15)
// 4. Répartir les pixels restants dans 12 buckets de teinte (30° chacun)
// 5. Trouver le bucket le plus peuplé
// 6. Faire la moyenne RGB des pixels de ce seul bucket
```

**Pourquoi ça marche :** on ne mélange jamais des teintes opposées. Pour la photo Goku (ciel bleu + nuage orange) :
- Bucket bleu (hue 200–230°) : ~60% des pixels colorés → **gagnant**
- Bucket orange (hue 20–40°) : ~15%
- Résultat : bleu ciel ✓

**Performance :** le fork Sharp utilise `clone()` sur le pipeline existant — l'image n'est téléchargée depuis S3 qu'**une seule fois**. Le calcul de couleur se fait en parallèle de l'upload de l'image optimisée, sans surcoût mémoire significatif.

```typescript
const base = sharp();
const colorFork = base.clone().resize(50, 50).removeAlpha().raw();
const uploadTransform = base.clone().resize(1920, 1920).webp({ quality: 82 });

inputStream.pipe(base);
uploadTransform.pipe(passThrough);

const [colorBuf] = await Promise.all([
  colorFork.toBuffer(),
  uploadPromise, // les deux s'exécutent en parallèle
]);
```

---

## 2. Clustering dynamique — K-means en espace RGB

**Fichier :** `apps/api/src/photo/photo.service.ts`

### Pourquoi pas de familles de couleurs fixes ?

Une approche naïve consisterait à classer chaque couleur dans une famille prédéfinie (rouge si hue 0–30°, orange si hue 30–60°...). Problème : les familles existent toujours même si elles contiennent 0 photos. La navigation ne reflète pas le contenu réel de la galerie.

### K-means adaptatif

L'algorithme k-means regroupe les couleurs dominantes en **k clusters** dont les frontières émergent des données elles-mêmes.

**Choix de k :**

```typescript
k = Math.max(3, Math.min(10, Math.round(Math.sqrt(n / 2))))
// n=18 photos  → k=3
// n=98 photos  → k=7
// n=200 photos → k=10
```

**Initialisation k-means++ :** évite les centroïdes trop proches au démarrage en favorisant des points initiaux espacés (sélection probabiliste pondérée par la distance).

**Résultat :** si la galerie contient surtout des photos de mer, les clusters seront plusieurs nuances de bleu. Si c'est un portfolio de portraits, on aura des tons chair, des fonds studio, etc.

### Centroïde = couleur représentative

Le centroïde de chaque cluster (moyenne RGB de tous ses membres) est utilisé directement comme couleur d'affichage de la bulle. Aucune couleur n'est hardcodée côté frontend.

---

## 3. Navigation à 3 niveaux (frontend)

**Fichier :** `apps/web/components/ChromaticExplorer.tsx`

```
Niveau 1 : Nuage de bulles (clusters k-means)
    ↓ clic sur une bulle
Niveau 2 : Sous-nuances de ce cluster
           (quantization RGB : arrondi canal/32)
    ↓ clic sur une sous-nuance
Niveau 3 : Grille de photos filtrées
```

**Taille des bulles** proportionnelle au nombre de photos du cluster (`56 + count * 2`, clampé entre 72 et 120px) — signal visuel immédiat sur la répartition de la galerie.

**Sous-nuances (niveau 2) :** les couleurs dominantes des photos du cluster sont quantifiées en arrondissant chaque canal RGB à la dizaine de 32 la plus proche. Photos proches en couleur → même sous-nuance.

---

## Points à améliorer (hors scope POC)

- **Photos existantes :** re-traitement nécessaire après le changement d'algorithme d'extraction (un script de migration peut forcer le rejob BullMQ)
- **Cache Redis :** le k-means s'exécute à chaque requête `GET /photos/colors`. Pour des galeries larges, mettre le résultat en cache (TTL ~5min, invalidé à chaque upload)
- **Espace colorimétrique LAB :** le clustering RGB ne respecte pas la perception humaine des couleurs. Passer en CIELAB améliorerait la cohérence perceptuelle des clusters
- **URLs CloudFront signées :** les images sont actuellement accessibles via URLs publiques CloudFront

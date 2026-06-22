# Killer Feature — Exploration Chromatique

> Document de référence pour la soutenance et le dossier professionnel.
> Décrit la version **v2** (production) et l'évolution depuis le POC.

---

## 0. Glossaire — comprendre les termes (à lire en premier)

Cette section explique en langage simple **tous** les termes techniques employés plus bas. Elle suffit pour comprendre — et défendre — la feature sans connaissance préalable.

### Les couleurs

- **Pixel** : un point de l'image. Une photo de 50×50 = 2500 points, chacun avec une couleur.
- **RGB (ou RVB)** : la façon « machine » de décrire une couleur par 3 nombres = quantité de **R**ouge, **V**ert, **B**leu (0 à 255). Ex. `(255,0,0)` = rouge pur. C'est le format des écrans, mais il ne reflète **pas** comment l'œil humain perçoit les couleurs.
- **hex / `#RRGGBB`** : la même couleur RGB écrite en hexadécimal. `#ff0000` = rouge. Juste une notation compacte.
- **Espace colorimétrique** : un « système de coordonnées » pour situer une couleur. RGB en est un ; OKLab/OKLCH en sont d'autres, conçus pour coller à la perception.
- **Perceptuellement uniforme** : propriété d'un bon espace couleur — *une même distance entre deux couleurs correspond à une même différence ressentie par l'œil*. RGB ne l'est pas (deux couleurs « proches » en chiffres peuvent sembler très différentes) ; **OKLab l'est**. C'est pour ça qu'on calcule en OKLab et pas en RGB.
- **OKLab** : un espace couleur moderne, perceptuellement uniforme. On y mesure et compare les couleurs « comme l'œil le ferait ».
- **OKLCH** : exactement la même chose qu'OKLab, mais exprimée en 3 grandeurs intuitives :
  - **L = Lightness (clarté)** : du noir (0) au blanc (1).
  - **C = Chroma (saturation)** : du gris terne (0) à la couleur vive.
  - **H = Hue (teinte)** : la « couleur » sur la roue chromatique, en degrés (0–360° : rouge, orange, jaune, vert, bleu…).
  - C'est cette forme qui permet de **nommer** et **ranger** les couleurs facilement.
- **Couleur dominante** : la couleur principale d'une photo (approche du POC : une seule).
- **Palette** : plusieurs couleurs représentatives d'une photo (approche v2 : 3 à 5), chacune avec un **poids** (sa part de l'image).
- **Quantification** : « arrondir » une couleur exacte vers une case prédéfinie — comme classer une nuance précise dans un nuancier de peinture.
- **Atlas / nuancier / cellule** : notre grille fixe de 53 cases de couleur. Chaque **cellule** est une case ; l'**atlas** (ou **nuancier**) est la grille entière.

### L'algorithme de regroupement

- **Clustering** : regrouper automatiquement des éléments qui se ressemblent (ici, des couleurs proches).
- **k-means** : l'algorithme de clustering le plus courant. On lui dit « fais **k** groupes » (k=5 chez nous) ; il regroupe les points et calcule le centre de chaque groupe, de façon itérative jusqu'à stabilisation.
- **Centroïde** : le centre d'un groupe = la couleur moyenne du groupe. Sert de couleur représentative.
- **Déterministe vs aléatoire** : un calcul **déterministe** donne **toujours le même résultat** pour la même entrée. Le k-means classique démarre de points **aléatoires** → résultat différent à chaque fois. On a rendu le nôtre **déterministe** (départ calculé, pas tiré au hasard) → indispensable pour pouvoir mettre en cache et avoir une carte stable.
- **Farthest-first** (« le plus éloigné d'abord ») : notre façon déterministe de choisir les points de départ du k-means — on prend à chaque fois la couleur la plus éloignée de celles déjà retenues, pour bien les espacer.

### Traitement d'image et tâches de fond

- **Sharp** : la bibliothèque qui manipule les images (redimensionner, convertir en WebP, lire les pixels).
- **Vignette** : version miniature de l'image (ici 50×50) — suffisante pour analyser les couleurs, et bien plus rapide à traiter que l'originale.
- **RAW** : les pixels bruts (non compressés) d'une image, qu'on lit directement pour les analyser.
- **Asynchrone / worker / file (queue) / BullMQ** : le traitement d'une photo (optimisation + couleurs) est lent, donc on ne le fait pas pendant que l'utilisateur attend. On dépose une « tâche » dans une **file d'attente** (BullMQ, appuyée sur Redis), et un **worker** (processus de fond) la traite plus tard. L'utilisateur, lui, a une réponse immédiate.
- **Fork de pipeline / `clone()`** : on dédouble le flux Sharp pour faire **deux choses à partir d'un seul téléchargement** de l'image (l'optimiser **et** en extraire les couleurs, en parallèle) — au lieu de la télécharger deux fois.

### Base de données et SQL

- **PostgreSQL** : notre base de données relationnelle (tables, colonnes, lignes).
- **`jsonb`** : un type de colonne PostgreSQL qui stocke du **JSON** (ici, la palette : une liste d'objets `{couleur, cellule, poids}`).
- **`text[]` (tableau)** : une colonne qui contient une **liste** de textes (ici, la liste des cellules d'une photo). Permet qu'**une photo appartienne à plusieurs cellules**.
- **Index (et index GIN)** : un « sommaire » que la base maintient pour retrouver vite des lignes sans tout parcourir. Un **index GIN** est le type d'index adapté aux **tableaux** : il accélère la question « quelles photos contiennent la cellule X ? ».
- **Requête / agrégat / `GROUP BY` / `COUNT`** : une **requête** interroge la base. Un **agrégat** résume des lignes (ex. **compter** les photos par cellule via `GROUP BY`).
- **`UNNEST`** : fonction PostgreSQL qui « déplie » un tableau en lignes — on l'utilise pour compter chaque cellule d'une photo séparément.
- **`@>` (« contient »)** : teste si un tableau en contient un autre (`color_cells @> ARRAY['c-9-0']` = « cette photo a-t-elle la cellule c-9-0 ? »). On l'utilise **plutôt que** la forme équivalente `'c-9-0' = ANY(color_cells)` car **seul `@>` exploite l'index GIN** — `= ANY(...)` force un parcours complet (cf. §8, optimisation de l'index).
- **Jointure / table de liaison / relation N-N (many-to-many)** : une photo peut être dans plusieurs albums et un album contient plusieurs photos = relation **N-N**. On la matérialise par une **table de liaison** (`album_photos`, qui relie un `album_id` et un `photo_id`). **Joindre** = combiner deux tables sur une clé commune.
- **Produit cartésien** : piège classique du SQL — si on combine deux tables sans condition de liaison correcte, on obtient **toutes les combinaisons** (lignes A × lignes B), ce qui gonfle les résultats. C'est la cause du bug « ×26 » (§8, retour d'expérience).
- **Migration / backfill** : une **migration** est un script versionné qui modifie le schéma de la base (ajouter des colonnes). Le **backfill** = remplir ces nouvelles colonnes pour les **données déjà existantes**.
- **Pagination / `getManyAndCount`** : renvoyer les résultats **par pages** (ex. 30 à la fois) au lieu de tout d'un coup. `getManyAndCount` (TypeORM) renvoie à la fois la page de résultats **et** le total.

### API, web, qualité

- **API REST / endpoint** : l'API est le « serveur » qui répond aux requêtes du site. Un **endpoint** est une URL précise (ex. `GET /photos/colors`).
- **Architecture en couches (Controller → Service → Repository)** : organisation du code en responsabilités séparées — le **Controller** reçoit la requête HTTP, le **Service** orchestre la logique, le **Repository** parle à la base. Chacun son rôle, plus facile à tester et à maintenir.
- **DTO** (Data Transfer Object) : la forme précise des données échangées avec le frontend (quels champs, quels types).
- **Cache / Redis / TTL / invalidation** : un **cache** garde un résultat coûteux en mémoire rapide (**Redis**) pour le resservir sans le recalculer. Le **TTL** (Time To Live) est sa durée de vie (300 s ici). **Invalider** = effacer le cache quand la donnée change (ajout/suppression de photo).
- **URL signée (S3)** : nos images sont privées sur le stockage S3. Une **URL signée** est un lien temporaire qui autorise l'accès à une image pour une durée limitée. On n'en génère que pour les photos réellement affichées.
- **React Query / scroll infini** : côté site, **React Query** gère les appels à l'API et leur cache ; le **scroll infini** charge la page suivante automatiquement quand on arrive en bas.
- **Test unitaire vs test d'intégration** : un **test unitaire** vérifie une fonction isolée (les autres briques sont **mockées**, c.-à-d. simulées). Un **test d'intégration** vérifie le vrai comportement avec une **vraie base** de données.
- **Mock** : une fausse version d'une dépendance, pour tester une brique sans lancer les autres.
- **Testcontainers** : un outil qui démarre une **vraie base PostgreSQL** dans un conteneur Docker jetable, le temps des tests d'intégration.
- **Test de régression** : un test ajouté après un bug, pour garantir que ce bug **ne reviendra pas**.

---

## 1. Concept et choix de la feature

**Idée :** naviguer dans sa bibliothèque photo **par la couleur** plutôt que par date ou par lieu. L'utilisateur voit un **nuancier** (atlas de couleurs) ; chaque case allumée correspond à des photos de cette teinte. Il clique une couleur → il obtient toutes ses photos qui la contiennent.

**Pourquoi cette feature :** retenue via une matrice de décision parmi 3 candidates (Exploration Chromatique, Carte Interactive, Recherche Sémantique IA). Score **36/40** : forte valeur UX, caractère innovant, et faisabilité dans le périmètre technique existant (pipeline d'upload + traitement d'image déjà en place).

**Argument de soutenance :** c'est une feature qui touche toute la chaîne — traitement d'image asynchrone, science des couleurs, modélisation de données, API, cache, frontend, tests — donc représentative des compétences du titre.

---

## 2. Évolution POC → v2 (fil narratif de la soutenance)

Le POC fonctionnait mais reposait sur 4 partis pris fragiles. La v2 corrige chacun. C'est ce cheminement qui démontre le raisonnement d'ingénierie.

| Aspect | POC (v1) | Problème | v2 (production) |
|---|---|---|---|
| Couleur par photo | **1** couleur dominante | Un coucher de soleil (orange + bleu) n'existe que dans une seule famille | **Palette** de 3–5 couleurs pondérées → une photo apparaît dans **plusieurs** cellules |
| Espace colorimétrique | **RGB** (moyennes, distances euclidiennes) | RGB ne correspond pas à la perception : moyennes ternes, regroupements faux | **OKLCH/OKLab** (perceptuellement uniforme) |
| Regroupement | **k-means** relancé à chaque requête, init **aléatoire** | Familles **instables** (changent à chaque rechargement), **non nommables** (`#6b7a3c`), non cacheables | **Atlas fixe** de 53 cellules nommées et déterministes |
| Catégorie neutres | aucune | Le noir & blanc atterrissait dans une teinte « muddy » | Ligne de **neutres** dédiée (noir → blanc) |
| UI | nuage radial plein écran, fond sombre `bg-gray-950` | Illisible avec beaucoup de familles, mauvais responsive, rupture avec le design de l'app, cul-de-sac (clic photo sans effet) | **Nuancier intégré au shell de la galerie** (thème de l'app), clic photo → modal détail réutilisée |

---

## 3. Architecture technique (vue en couches)

Respect strict de l'architecture en couches NestJS : **Controller → Service → Repository**.

```
Upload (multipart S3)
   │
   ▼
PhotoProcessor (worker BullMQ)               apps/api/src/photo/photo.processor.ts
   │  Sharp : fork du pipeline via clone()
   │   ├─ optimisation 1920px WebP → S3
   │   └─ vignette 50×50 RAW → extractPalette()
   ▼
extractPalette()  (pur, OKLab)               apps/api/src/photo/color.ts
   │  → palette [{hex, cellId, weight}]
   ▼
Photo.palette (jsonb) + Photo.colorCells (text[])   apps/api/src/photo/entities/photo.entity.ts
   │  invalidation du cache atlas (Redis)
   ▼
─────────────  lecture  ─────────────
GET /photos/colors[?albumId]                 PhotoController
   → PhotoService.getColorAtlas()            (cache Redis + assemblage grille)
       → PhotoRepository.countByColorCell()  (agrégat SQL)
GET /photos/colors/:cellId[?albumId&page]    PhotoController
   → PhotoService.listByCell()
       → PhotoRepository.findByColorCellPage()        (sans album)
       → AlbumPhotoRepository.findPhotosByCellPage()  (avec album)
   ▼
ChromaticExplorer (Next.js)                  apps/web/components/ChromaticExplorer.tsx
```

**Répartition des responsabilités :**
- **Controller** : routage, validation d'entrée (`ParseUUIDPipe` pour `albumId`, `isValidCellId` pour la cellule), délégation. Aucune logique métier.
- **Service** : orchestration (cache, assemblage de la grille d'atlas, signature des URLs, mapping DTO). Aucune requête SQL.
- **Repository** : tout l'accès aux données (query builders, SQL brut). Conforme à la convention du projet (`PhotoRepository.storageUsedByUser`, `AlbumPhotoRepository`).
- **Logique pure** (conversion couleur, atlas) : isolée dans des modules sans I/O → testable et partagée.

---

## 4. La science des couleurs (cœur technique)

### 4.1 Pourquoi OKLCH et pas RGB

**Le problème de fond.** RGB décrit la couleur pour l'**écran** (combien de lumière rouge/verte/bleue émettre), pas pour l'**œil**. Deux symptômes concrets :

1. **Les distances ne correspondent pas à la perception.** En RGB on peut mesurer un écart entre deux couleurs (√(ΔR²+ΔV²+ΔB²)), mais un même écart chiffré ne « se voit » pas pareil partout : l'œil distingue énormément de **verts** et très peu de **bleus foncés/violets**. Un regroupement (k-means) basé sur la distance RGB ne colle donc pas à ce qu'un humain appelle « couleurs proches ».
2. **Les moyennes salissent les couleurs.** Moyenner des couleurs vives en RGB tire vers le terne/marron (un rouge + un jaune ne donnent pas un orange vif). C'était la cause des teintes grisâtres du POC.

**La solution : OKLab**, un espace **perceptuellement uniforme** — *conçu pour* qu'une même distance chiffrée ≈ une même différence ressentie. Le k-means y regroupe « comme l'œil le ferait », et les moyennes restent fidèles.

**OKLCH = le même OKLab, en coordonnées lisibles.** OKLab donne 3 axes : **L** (clarté), **a** (vert↔rouge), **b** (bleu↔jaune) — mais `a=0.05, b=-0.1` ne parle à personne. OKLCH convertit le couple (a, b) en **polaire** :

- **C = chroma** = distance au centre = vivacité → `√(a²+b²)`
- **H = teinte** = angle = couleur sur la roue → `atan2(b, a)` en degrés (0–360°)
- **L = clarté** (0–1), inchangée.

> *Analogie :* OKLab (a, b) = « 5 km à l'est, 3 km au nord » (cartésien) ; OKLCH (C, H) = « 5,8 km, cap 31° » (polaire). Même point, mais la forme polaire dit directement *vivacité* + *teinte*. C'est ce qui permet de **ranger** : la teinte donne la colonne du nuancier, la clarté la ligne, un chroma quasi nul = neutre.

**La chaîne de conversion, étape par étape** — on se rapproche progressivement de l'œil :

| Étape | Quoi | Pourquoi |
|---|---|---|
| `sRGB → linéaire` | « défaire le gamma » | Les valeurs d'un fichier ne sont pas proportionnelles à la lumière réelle (encodage gamma) ; on les linéarise sinon tout le calcul est faussé. |
| `linéaire → LMS` | passer aux 3 cônes de l'œil (**L**ong/**M**edium/**S**hort) | Décrire la couleur avec les capteurs réels de la vision. |
| `LMS → OKLab` | transform. finale (+ racine cubique) | La racine cubique imite la compression perceptuelle de l'intensité → coordonnées L, a, b. |
| `OKLab → OKLCH` | cartésien → polaire | Forme lisible (clarté, chroma, teinte). Aucune info nouvelle. |

L'**inverse** (`OKLCH → … → sRGB`) sert au retour : une cellule définie par « teinte 255°, clarté 0,7, chroma 0,13 » est reconvertie en `#hex` pour **peindre la pastille** à l'écran.

**Fichier partagé :** `packages/shared/src/color.ts`. Ces conversions sont des **fonctions pures** (nombres → nombres, sans base ni réseau) → mises en commun pour que l'**API** (qui classe les photos) et le **site** (qui dessine les pastilles) utilisent **exactement le même** calcul. Une seule source de vérité, pas de divergence possible.

**Le code — la conversion polaire (`packages/shared/src/color.ts`)** : c'est elle qui transforme les axes abstraits (a, b) en grandeurs lisibles (chroma, teinte).

```ts
export function oklabToOklch({ lightness, aAxis, bAxis }: Oklab): Oklch {
  const chroma = Math.sqrt(aAxis * aAxis + bAxis * bAxis);   // distance au centre = vivacité
  let hue = (Math.atan2(bAxis, aAxis) * 180) / Math.PI;      // angle = teinte (degrés)
  if (hue < 0) hue += 360;                                   // ramène dans 0–360°
  return { lightness, chroma, hue };
}
```

> `Math.atan2(b, a)` renvoie l'angle du point (a, b) — exactement le « cap » de l'analogie. `Math.sqrt(a²+b²)` est la distance au centre — la « vivacité ». La conversion `sRGB → OKLab` (`rgbToOklab`), avec ses coefficients vers les cônes LMS et la racine cubique, est juste au-dessus dans le même fichier.

### 4.1bis D'où viennent les « chiffres magiques » de `rgbToOklab` ?

> *Question de jury anticipée : « ces constantes à 10 décimales, vous les avez inventées ? »* — **Non.** Ce sont les **coefficients officiels de la spécification OKLab**, publiés par **Björn Ottosson** (2020) : [bottosson.github.io/posts/oklab](https://bottosson.github.io/posts/oklab/). Toute implémentation d'OKLab (CSS Color 4 `oklch()`, Sass, libs comme `culori`, oklch.com…) utilise **exactement les mêmes valeurs** — c'est ce qui garantit qu'une couleur calculée chez nous est identique à la même couleur en CSS. Je les ai **recopiées en dur**, pas recalculées : ce sont des constantes mathématiques fixes, pas des paramètres réglables.

La fonction `rgbToOklab` enchaîne **deux matrices figées** séparées par une **racine cubique** :

```ts
export function rgbToOklab({ red, green, blue }: Rgb): Oklab {
  const linearRed   = srgbChannelToLinear(red);    // 1) défaire le gamma sRGB
  const linearGreen = srgbChannelToLinear(green);
  const linearBlue  = srgbChannelToLinear(blue);

  // 2) MATRICE 1 — RGB linéaire → LMS (réponse des 3 cônes de l'œil)
  const longCone   = 0.4122214708 * linearRed + 0.5363325363 * linearGreen + 0.0514459929 * linearBlue;
  const mediumCone = 0.2119034982 * linearRed + 0.6806995451 * linearGreen + 0.1073969566 * linearBlue;
  const shortCone  = 0.0883024619 * linearRed + 0.2817188376 * linearGreen + 0.6299787005 * linearBlue;

  // 3) RACINE CUBIQUE — compression perceptuelle (loi de Stevens, remplace l'exposant 1/3 de CIELAB)
  const longRoot   = Math.cbrt(longCone);
  const mediumRoot = Math.cbrt(mediumCone);
  const shortRoot  = Math.cbrt(shortCone);

  // 4) MATRICE 2 — LMS' → OKLab (L = clarté, a = vert↔rouge, b = bleu↔jaune)
  return {
    lightness: 0.2104542553 * longRoot + 0.793617785  * mediumRoot - 0.0040720468 * shortRoot,
    aAxis:     1.9779984951 * longRoot - 2.428592205  * mediumRoot + 0.4505937099 * shortRoot,
    bAxis:     0.0259040371 * longRoot + 0.7827717662 * mediumRoot - 0.808675766  * shortRoot,
  };
}
```

**Origine de chaque bloc** (résumé défendable à l'oral) :

| Bloc | Ce que c'est | D'où viennent les chiffres |
|---|---|---|
| **`srgbChannelToLinear`** (seuil 0,04045, exposant 2,4) | « défaire le gamma » : un fichier image n'encode **pas** la lumière proportionnellement (encodage gamma sRGB pour mieux exploiter les bits). On retrouve l'intensité réelle. | **Définition standard du sRGB** (la branche à deux cas évite une singularité près du noir). |
| **Matrice 1** (9 coefficients, RGB→**LMS**) | **L**ong/**M**edium/**S**hort = réponse des **3 types de cônes** de la rétine. On décrit la couleur avec les capteurs réels de la vision. | **Composition de deux transformations connues** : sRGB linéaire → CIE XYZ (mesures de vision humaine des années 1930) puis XYZ → LMS (proche de CIECAM), **ré-optimisée** par Ottosson pour mieux coller aux données perceptuelles, **notamment sur les bleus** (le défaut majeur de CIELAB). |
| **Racine cubique** (`Math.cbrt`) | Étape **non-linéaire** clé : la perception de l'intensité n'est pas linéaire (loi de puissance de Stevens). Elle compresse les fortes intensités. | Choix de modélisation d'OKLab (remplace l'exposant 1/3 de CIELAB). C'est *elle* qui rend les distances perceptuellement cohérentes pour le k-means. |
| **Matrice 2** (9 coefficients, LMS'→**Lab**) | Donne les 3 axes finaux : **L** (clarté), **a** (axe vert↔rouge), **b** (axe bleu↔jaune). | **Solution d'un système d'équations sous contraintes** résolu par Ottosson : un gris (R=G=B) doit donner a=0 et b=0 (neutre parfait), L=0 au noir et L=1 au blanc, axes alignés sur les oppositions perceptuelles. **Pas du « bruit » ni des poids appris** : une solution mathématique publiée une fois pour toutes. |

> **Pourquoi en dur plutôt que recalculées ?** Parce que ce sont des constantes fixes : aucune raison de refaire le calcul matriciel à l'exécution, et les copier **garantit l'interopérabilité** avec tout l'écosystème OKLab (même résultat que `oklch()` en CSS). La fonction inverse `oklabToRgb` (juste en dessous dans le fichier) applique les **mêmes matrices à l'envers** pour repeindre les pastilles de l'atlas à l'écran.

### 4.2 Extraction de la palette (à l'ingestion)

**Fichier :** `apps/api/src/photo/color.ts` (`extractPalette`, dépend de `Buffer` → reste côté API).

1. Sharp produit une vignette **50×50 RAW** (2500 px) — fork du pipeline existant via `clone()` : l'image n'est téléchargée de S3 **qu'une fois**, le calcul couleur tourne **en parallèle** de l'upload optimisé.
2. Chaque pixel est converti en OKLab.
3. **k-means déterministe** (k = 5) regroupe les pixels en couleurs représentatives.
   - **Initialisation farthest-first** (et non `Math.random`) : 1er centroïde = pixel le plus central, puis à chaque fois le plus éloigné des centroïdes déjà choisis.
   - **Déterminisme = garantie clé** : même image ⇒ même palette ⇒ résultat **cacheable** et carte **stable**.
4. Chaque couleur est classée dans une cellule de l'atlas et pondérée par sa part de pixels. On ignore les couleurs < 6 % (anecdotiques).

Résultat : `palette = [{ hex, cellId, weight }]` triée par poids décroissant.

**Le code — départ déterministe du k-means (`apps/api/src/photo/color.ts`)** : aucun `Math.random`, donc même image ⇒ même palette.

```ts
const centroids: Oklab[] = [pixels[firstIndex]];      // 1er centroïde = le pixel le plus « central »
while (centroids.length < clusterCount) {
  // à chaque tour, on ajoute le pixel le PLUS ÉLOIGNÉ des centroïdes déjà retenus (farthest-first)
  let farthestIndex = 0, farthestDistance = -1;
  for (let index = 0; index < pixels.length; index++) {
    const distanceToNearest = Math.min(
      ...centroids.map((centroid) => squaredOklabDistance(pixels[index], centroid)),
    );
    if (distanceToNearest > farthestDistance) { farthestDistance = distanceToNearest; farthestIndex = index; }
  }
  centroids.push(pixels[farthestIndex]);
}
```

**Et la sortie** — chaque centroïde devient une entrée de palette (couleur hex + cellule + poids), on jette les couleurs anecdotiques :

```ts
return centroids
  .map((centroid, index) => ({
    hex: rgbToHex(oklabToRgb(centroid)),        // couleur affichable
    cellId: classifyToCell(oklabToOklch(centroid)), // cellule de l'atlas (cf. 4.3)
    weight: memberCounts[index] / pixels.length,    // part de l'image
  }))
  .filter((entry) => entry.weight >= MIN_ENTRY_WEIGHT) // > 6 %
  .sort((first, second) => second.weight - first.weight);
```

### 4.3 L'atlas fixe (53 cellules)

Plutôt que des familles découvertes par k-means (instables), on définit une **grille fixe** :

- **12 teintes** (cercle chromatique en tranches de 30°) × **4 niveaux de clarté** = **48 cellules chromatiques**
- **+ 5 cellules neutres** (noir, gris foncé, gris, gris clair, blanc) = **53 cellules**

**Le code — classement déterministe (`packages/shared/src/color.ts`)** :

```ts
export function classifyToCell(color: Oklch): string {
  if (color.chroma < NEUTRAL_MAX_CHROMA) {     // pas de teinte exploitable → gris/noir/blanc
    return neutralCellId(findBandIndex(NEUTRAL_LIGHTNESS_BANDS, color.lightness)); // "n-0".."n-4"
  }
  // teinte (0–360°) → une des 12 colonnes ; clarté → une des 4 lignes
  const hueIndex = Math.floor((((color.hue % 360) + 360) % 360) / HUE_BAND_WIDTH) % HUE_BAND_COUNT;
  const lightIndex = findBandIndex(CHROMATIC_LIGHTNESS_BANDS, color.lightness);
  return chromaticCellId(hueIndex, lightIndex); // "c-{0..11}-{0..3}"
}
```

> `NEUTRAL_MAX_CHROMA`, `CHROMATIC_LIGHTNESS_BANDS` et `HUE_BAND_WIDTH` (= 30°) sont les **constantes de calibration** isolées en haut du fichier.

Les seuils sont **isolés en constantes** (`NEUTRAL_MAX_CHROMA`, bandes de clarté/teinte) → recalibrables sans toucher à la logique. Le nombre de cellules est un simple paramètre (12×4 ⇒ 53 ; passable à 12×6 si besoin de plus de finesse).

**Bénéfices vs k-means :** stable entre rechargements, **nommable** (« bleu clair », « vert sombre »), **accessible** (libellés pour daltoniens), **cacheable**, et le nuancier devient une *carte mémorisable* (le bleu est toujours au même endroit).

---

## 5. Modèle de données et persistance

**Entité `Photo`** (`apps/api/src/photo/entities/photo.entity.ts`) :

| Colonne | Type | Rôle |
|---|---|---|
| `dominant_color` | `varchar(7)` | Conservée (rétrocompat) = `palette[0].hex` |
| `palette` | `jsonb` | `[{hex, cellId, weight}]` — source de vérité, rendu des pastilles |
| `color_cells` | `text[]` | Cellules **dédupliquées** couvertes par la palette — colonne **requêtée** |

**Le code — colonnes de l'entité (`apps/api/src/photo/entities/photo.entity.ts`)** :

```ts
@Column({ name: 'palette', type: 'jsonb', nullable: true })
palette: { hex: string; cellId: string; weight: number }[] | null;

@Column({ name: 'color_cells', type: 'text', array: true, nullable: true })
colorCells: string[] | null;   // ex. ['c-9-0', 'n-1'] — index GIN créé dans la migration
```

**Index GIN** sur `color_cells` : accélère la recherche d'appartenance, écrite `color_cells @> ARRAY[:cellId]` (« contient »). **Point d'attention SQL** : la forme intuitive `:cellId = ANY(color_cells)`, pourtant équivalente, **n'utilise pas** l'index GIN (PostgreSQL repasse en *seq scan*) — c'est `@>` qu'il faut employer (cf. §8). C'est ce qui permet la **multi-appartenance** efficace (une photo dans plusieurs cellules).

**Migration** (`apps/api/src/migrations/1781639383027-Migration.ts` — générée puis enrichie) :
1. `bun run migration:generate` (diff de schéma → ajout des 2 colonnes).
2. Enrichissement manuel : `CREATE INDEX … USING GIN (color_cells)` + **backfill** des photos existantes (on dérive `cellId` depuis `dominant_color` et on crée une palette à 1 entrée). Exécutée avec succès en local.

```ts
// up() — index + backfill (extrait)
await queryRunner.query(`CREATE INDEX "IDX_photos_color_cells" ON "photos" USING GIN ("color_cells")`);

const rows = await queryRunner.query(`SELECT "id", "dominant_color" FROM "photos" WHERE "dominant_color" IS NOT NULL`);
for (const row of rows) {
  const cellId = classifyHexToCell(row.dominant_color);          // réutilise le module couleur partagé
  await queryRunner.query(
    `UPDATE "photos" SET "palette" = $1::jsonb, "color_cells" = $2 WHERE "id" = $3`,
    [JSON.stringify([{ hex: row.dominant_color, cellId, weight: 1 }]), [cellId], row.id],
  );
}
```

> Limite connue : le backfill donne **1 cellule** aux anciennes photos (mono-couleur). La vraie multi-appartenance ne joue que pour les nouveaux uploads tant qu'un **reprocessing** complet n'est pas lancé (axe d'amélioration §9).

---

## 6. API

**Fichier :** `apps/api/src/photo/photo.controller.ts` + `photo.service.ts`.

### `GET /photos/colors[?albumId]` — l'atlas
- Renvoie la **grille complète** (53 cellules) avec le **nombre de photos** par cellule.
- Agrégat SQL léger : `SELECT UNNEST(color_cells) … GROUP BY cell` (repository `countByColorCell`).
- **Cache Redis** (clé `colors:atlas:{userId}`, TTL 300 s) **uniquement** pour l'atlas non filtré ; les variantes par album sont calculées à la volée (évite l'explosion de clés).
- Invalidation : à la fin du traitement d'une photo (processor) et à la suppression.

**Le code, des 3 couches** (Controller mince → Service orchestre → Repository requête) :

```ts
// Controller — valide l'entrée et délègue (apps/api/src/photo/photo.controller.ts)
@Get('colors')
getColorAtlas(@CurrentUser() user, @Query('albumId', new ParseUUIDPipe({ optional: true })) albumId?: string) {
  return this.photoService.getColorAtlas(user.userId, albumId);
}

// Service — cache + assemblage de la grille (photo.service.ts)
const rows = await this.photoRepo.countByColorCell(userId, albumId);
const countByCell = new Map(rows.map((row) => [row.cellId, Number(row.count)]));
const atlas = getAtlasCells().map((cell) => ({ ...cell, count: countByCell.get(cell.cellId) ?? 0 }));

// Repository — l'agrégat SQL ; UNNEST « déplie » color_cells en lignes (photo.repository.ts)
return this.query(
  `SELECT cell AS "cellId", COUNT(*)::int AS count
     FROM (SELECT UNNEST(p.color_cells) AS cell FROM photos p
           ${albumId ? 'INNER JOIN album_photos ap ON ap.photo_id = p.id AND ap.album_id = $3' : ''}
           WHERE p.user_id = $1 AND p.status = $2) AS cells
    GROUP BY cell`,
  albumId ? [userId, PhotoStatus.COMPLETED, albumId] : [userId, PhotoStatus.COMPLETED]);
```

### `GET /photos/colors/:cellId[?albumId&page&limit]` — photos d'une cellule
- Pagination (scroll infini côté front).
- Les **URLs S3 signées** ne sont générées que pour la **page visible** (et non toute la collection) → coût maîtrisé.
- Filtre d'appartenance écrit en `color_cells @> ARRAY[:cellId]` (forme qui exploite l'index GIN, cf. §8).
- Avec `albumId` : passe par `AlbumPhotoRepository.findPhotosByCellPage` (jointure sur la table de liaison `album_photos`).

**Le code — l'aiguillage du service (`photo.service.ts`)** : deux chemins selon la présence d'un album, mais même format de réponse.

```ts
if (albumId) {
  // part de la table de liaison album_photos (où vit album_id)
  const [albumPhotos, count] = await this.albumPhotoRepo.findPhotosByCellPage(albumId, userId, cellId, query);
  photos = albumPhotos.map((albumPhoto) => albumPhoto.photo);
  total = count;
} else {
  [photos, total] = await this.photoRepo.findByColorCellPage(userId, cellId, query);
}
return { cellId, items: photos.map((p) => this.toPhotoResponse(p)), page, limit, total, totalPages: Math.ceil(total / limit) };
```

### Filtre par album
`album_id` n'existe pas sur `photos` : la relation photo↔album est **N-N** via `album_photos`. Le filtre se fait donc en repartant de cette table de liaison. Le scope `user_id` est conservé → **aucune fuite** possible (un album ne contient que les photos de son propriétaire).

---

## 7. Frontend

**Fichier :** `apps/web/components/ChromaticExplorer.tsx` + hooks `apps/web/lib/useColoredPhotos.ts` (React Query).

- **Intégré au design de l'app** (thème clair, tokens, primitives shadcn) — fini le radial sombre.
- **Nuancier** : grille teintes (colonnes) × clartés (lignes) + rangée de neutres. Les cellules **peuplées** sont vives avec une lueur ∝ au nombre de photos ; les **vides** sont estompées et non cliquables. « Votre collection éclaire le nuancier. »
- **Responsive mobile** : sur petit écran, 12 colonnes seraient illisibles → la grille chromatique passe en **colonnes à largeur fixe + scroll horizontal** ; à partir de `sm`, elle se répartit sur toute la largeur.
- **Sélecteur d'album** dans l'en-tête (composant `Select` shadcn) : « Toutes les photos » / albums de l'utilisateur.
- Clic sur une cellule → **grille filtrée** en scroll infini ; clic sur une photo → **`PhotoDetailModal` réutilisée** (zoom, navigation, partage, suppression) — plus de cul-de-sac.
- Accessibilité : chaque pastille porte un `aria-label` « {nom} — N photos ».

**Le code — récupération (`useColoredPhotos.ts`) et rendu d'une pastille (`ChromaticExplorer.tsx`)** :

```ts
// hook : l'albumId fait partie de la clé de cache React Query (refetch auto au changement)
export function useColorAtlas(albumId: string | null) {
  return useQuery({
    queryKey: ["colors", "atlas", albumId],
    queryFn: async () => (await api.get("/photos/colors", { params: albumId ? { albumId } : undefined })).data,
  });
}
```

```tsx
// pastille : opacité/lueur proportionnelles au nombre de photos ; cellule vide = désactivée
const fill = Math.min(1, cell.count / maxCount);
<button
  disabled={cell.count === 0}
  aria-label={`${cell.label} — ${cell.count} photo${cell.count > 1 ? "s" : ""}`}
  style={{ backgroundColor: cell.hex,
           boxShadow: cell.count === 0 ? undefined : `0 0 ${4 + fill * 16}px ${cell.hex}` }}
/>
```

---

## 8. Qualité, sécurité, performance

### Sécurité
- Scope `user_id` sur **toutes** les requêtes couleur.
- Validation d'entrée : `ParseUUIDPipe({ optional: true })` sur `albumId`, `isValidCellId()` sur la cellule (400 si inconnue).

### Performance
- Fork Sharp `clone()` : 1 seul téléchargement S3, calcul couleur en parallèle.
- Atlas mis en cache (Redis), agrégat SQL unique, index GIN.
- Pagination + signature d'URL par page uniquement.

**Optimisation de l'index GIN (`@>` vs `= ANY`)** — l'index GIN sur `color_cells` n'accélère une requête **que** si elle est formulée avec l'opérateur « contient » `@>`. La forme intuitive et pourtant équivalente `:cellId = ANY(color_cells)` est, elle, **ignorée par le planificateur** : PostgreSQL repasse en *sequential scan* (lecture de toutes les lignes). Les deux requêtes de listing par cellule (`PhotoRepository.findByColorCellPage`, `AlbumPhotoRepository.findPhotosByCellPage`) ont donc été écrites en `color_cells @> ARRAY[:cellId]`. Vérifiable au `EXPLAIN ANALYZE` : on observe alors un *Bitmap Index Scan on IDX_photos_color_cells* au lieu d'un *Seq Scan*. (À l'échelle actuelle le gain est faible, mais c'est une dette de performance évitée pour la montée en charge.)

### Tests — **227 tests verts** (181 API unit + 22 API intégration + 24 web)
- **API — unitaires (Jest, 181 tests)** : `color.ts` (conversions, classement, déterminisme de la palette), service (mocké), controller, processor.
- **API — intégration (Testcontainers + PostgreSQL, 22 tests)** : les méthodes repository sont testées sur une **vraie base** — c'est indispensable car la logique est en **SQL** (UNNEST, `@>`, jointures) qu'un mock ne valide pas.
- **Web — unitaires (Vitest, 24 tests)** : composants et hooks de l'interface (galerie, exploration).

### Retour d'expérience — 2 bugs SQL trouvés et couverts par des tests de régression
Excellent matériel de soutenance (montre la démarche de debug) :
1. **Compteur ×N (produit cartésien)** : l'atlas affichait `130` pour une cellule qui n'avait que 5 photos (130 = 5 × 26 photos). Cause : un sous-`SELECT` construit via le query builder ajoutait un **second FROM** → produit cartésien avec la table principale. Corrigé par une requête SQL directe et sans ambiguïté.
2. **`Cannot read … 'databaseName'`** : `getManyAndCount()` plantait quand on **triait sur une colonne d'une entité jointe** (`p.created_at`) avec pagination — bug connu de TypeORM. Corrigé en triant sur la colonne racine (`album_photos.added_at`), cohérent avec la vue album classique.

Les deux cas ont désormais un test d'intégration dédié (Testcontainers, vraie base) qui échouerait si la régression revenait :

```ts
// Bug 1 — produit cartésien : 4 photos en c-9-0 dont 1 seule dans l'album
const rows = await photoRepository.countByColorCell(user.id, album.id);
const countByCell = new Map(rows.map((row) => [row.cellId, Number(row.count)]));
expect(countByCell.get('c-9-0')).toBe(1); // et non 1 × (nombre total de photos)

// Bug 2 — getManyAndCount ne plante plus (tri sur la colonne racine)
const [albumPhotos, count] = await repo.findPhotosByCellPage(album.id, user.id, 'c-9-0', query);
expect(count).toBe(1);
expect(albumPhotos[0].photo.s3Key).toBe('blue.jpg');
```

---

## 9. Axes d'amélioration (produit, hors dette technique)

Le code est propre et testé ; les pistes restantes sont des **évolutions produit**, pas des défauts :

1. **Reprocessing des photos existantes** (le plus rentable) : rejouer `extractPalette` sur l'historique pour leur donner une vraie palette multi-couleurs (job batch BullMQ). Sans ça, la multi-appartenance ne profite qu'aux nouveaux uploads.
2. **Tri par pertinence** : dans une cellule, ordonner par poids de la couleur (la photo « la plus bleue » d'abord) plutôt que par date.
3. **Calibration & mobile** : finesse de la grille (12×6 ?), taille des cibles tactiles, à ajuster à l'usage.

---

## 10. Compétences mises en œuvre (pour le dossier)

- **Conception** : modélisation N-N (album_photos), choix d'un index GIN, schéma `jsonb` + `text[]`.
- **Algorithmique / traitement d'image** : espace perceptuel OKLab, k-means déterministe, quantification en atlas fixe.
- **Architecture logicielle** : séparation stricte en couches, code pur partagé API/web, mise en cache.
- **Qualité** : tests unitaires + intégration (Testcontainers), tests de régression issus de bugs réels.
- **Sécurité** : scoping par utilisateur, validation d'entrée, pas de fuite inter-utilisateurs.
- **Démarche d'ingénierie** : itération POC → v2 documentée, décisions justifiées, retours d'expérience de debug.

---

## 11. Références

- **OKLab — Björn Ottosson (2020)** : [bottosson.github.io/posts/oklab](https://bottosson.github.io/posts/oklab/) — article d'origine de l'espace colorimétrique : motivation (corriger CIELAB, surtout sur les bleus), méthode, et **matrices/coefficients officiels** repris dans `rgbToOklab` / `oklabToRgb` (cf. §4.1bis).
- **CSS Color Module 4** — fonctions `oklab()` / `oklch()` : standard W3C qui a popularisé OKLab côté web (mêmes constantes → mêmes couleurs que notre calcul).

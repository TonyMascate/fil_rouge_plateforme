# Benchmark Concurrentiel — Plateformes de gestion de photos

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums
**Auteur :** Tony Mascate
**Date :** Janvier 2025

---

## 1. Solutions analysées

| #   | Solution                | Type                     | Cible                |
| --- | ----------------------- | ------------------------ | -------------------- |
| 1   | **Google Photos**       | SaaS, cloud Google       | Grand public         |
| 2   | **Apple iCloud Photos** | SaaS, écosystème Apple   | Utilisateurs Apple   |
| 3   | **Amazon Photos**       | SaaS, cloud Amazon       | Abonnés Prime        |
| 4   | **Flickr** ⚠️            | SaaS, communautaire      | Photographes amateurs/pros — réseau social photo, pas un concurrent direct |
| 5   | **Immich**              | Open-source, self-hosted | Tech-savvy, privacy  |
| 6   | **Nextcloud Photos**    | Open-source, self-hosted | Entreprises, privacy |

---

## 2. Grille de critères

### 2.1 Fonctionnalités

| Fonctionnalité                        |  Google Photos   | iCloud Photos |  Amazon Photos   | Flickr |    Immich    | Nextcloud Photos |
| ------------------------------------- | :--------------: | :-----------: | :--------------: | :----: | :----------: | :--------------: |
| Upload photos/vidéos                  |        ✅        |      ✅       |        ✅        |   ✅   |      ✅      |        ✅        |
| Albums manuels                        |        ✅        |      ✅       |        ✅        |   ✅   |      ✅      |        ✅        |
| Albums automatiques (IA)              |        ✅        |      ✅       |        ✅        |   ❌   | ⚠️ (basique) |        ❌        |
| Partage avec lien                     |        ✅        |      ✅       |        ✅        |   ✅   |      ✅      |        ✅        |
| Partage collaboratif (album partagé)  |        ✅        |      ✅       |        ✅        |   ⚠️   |      ✅      |        ✅        |
| Recherche par lieu                    |        ✅        |      ✅       |        ✅        |   ⚠️   |      ✅      |        ❌        |
| Recherche par visage                  |        ✅        |      ✅       |        ✅        |   ❌   |      ✅      |        ❌        |
| Recherche par objet/scène             |        ✅        |      ✅       |        ✅        |   ❌   |      ⚠️      |        ❌        |
| **Recherche par couleur**             |   ⚠️ (limitée)   |      ❌       |        ❌        |   ⚠️   |      ❌      |        ❌        |
| Tags manuels                          |        ❌        |      ❌       |        ❌        |   ✅   |      ✅      |        ✅        |
| Édition photo intégrée                |        ✅        |      ✅       |        ⚠️        |   ⚠️   |      ⚠️      |        ❌        |
| Favoris                               |        ✅        |      ✅       |        ✅        |   ✅   |      ✅      |        ✅        |
| Vue chronologique                     |        ✅        |      ✅       |        ✅        |   ✅   |      ✅      |        ✅        |
| **Vue carte mentale / whiteboard**    |        ❌        |      ❌       |        ❌        |   ❌   |      ❌      |        ❌        |
| **Organisation visuelle par couleur** |        ❌        |      ❌       |        ❌        |   ❌   |      ❌      |        ❌        |
| Application mobile                    | ✅ (iOS/Android) |   ✅ (iOS)    | ✅ (iOS/Android) |   ✅   |      ✅      |        ✅        |
| Gestion des doublons                  |        ✅        |      ✅       |        ✅        |   ❌   |      ✅      |        ❌        |

**Légende :** ✅ Complet · ⚠️ Partiel / limité · ❌ Absent

---

### 2.2 Technique

| Critère technique              |     Google Photos      |   iCloud Photos    |   Amazon Photos    |   Flickr   |       Immich       |  Nextcloud Photos  |
| ------------------------------ | :--------------------: | :----------------: | :----------------: | :--------: | :----------------: | :----------------: |
| API publique disponible        |   ⚠️ (très limitée)    |         ❌         |         ⚠️         |     ✅     |         ✅         |         ✅         |
| Self-hosted possible           |           ❌           |         ❌         |         ❌         |     ❌     |         ✅         |         ✅         |
| Formats supportés              |   RAW + JPEG + vidéo   | RAW + JPEG + vidéo | RAW + JPEG + vidéo | JPEG + PNG | RAW + JPEG + vidéo | JPEG + PNG + vidéo |
| Compression sans perte         | ❌ (mode "économique") |    ✅ (iCloud)     |         ✅         |     ✅     |         ✅         |         ✅         |
| Chiffrement de bout en bout    |           ❌           |    ✅ (avancé)     |         ❌         |     ❌     |   ✅ (optionnel)   |   ✅ (optionnel)   |
| Import/Export données          |  ⚠️ (Google Takeout)   |     ⚠️ (lent)      |         ⚠️         |     ✅     |         ✅         |         ✅         |
| WebApp moderne                 |           ✅           |         ✅         |         ⚠️         |     ⚠️     |         ✅         |         ⚠️         |
| Performance chargement galerie |           ✅           |         ✅         |         ⚠️         |     ⚠️     |         ✅         |         ⚠️         |
| Infrastructure multi-réplicas  |   ✅ (Google Cloud)    |  ✅ (Apple Cloud)  |      ✅ (AWS)      |     ✅     |       Manuel       |       Manuel       |
| Conformité RGPD                |  ⚠️ (données aux US)   |         ⚠️         |         ⚠️         |     ⚠️     |  ✅ (self-hosted)  |  ✅ (self-hosted)  |

---

### 2.3 UX

| Critère UX                      | Google Photos | iCloud Photos | Amazon Photos | Flickr | Immich | Nextcloud Photos |
| ------------------------------- | :-----------: | :-----------: | :-----------: | :----: | :----: | :--------------: |
| Onboarding intuitif             |      ✅       |      ✅       |      ✅       |   ⚠️   |   ⚠️   |        ❌        |
| Interface moderne               |      ✅       |      ✅       |      ⚠️       |   ⚠️   |   ✅   |        ❌        |
| Navigation fluide               |      ✅       |      ✅       |      ⚠️       |   ⚠️   |   ✅   |        ⚠️        |
| Mode sombre                     |      ✅       |      ✅       |      ❌       |   ❌   |   ✅   |        ⚠️        |
| Accessibilité (WCAG)            |      ⚠️       |      ✅       |      ⚠️       |   ❌   |   ⚠️   |        ❌        |
| Recherche rapide                |      ✅       |      ✅       |      ⚠️       |   ⚠️   |   ✅   |        ⚠️        |
| Personnalisation de l'interface |      ❌       |      ❌       |      ❌       |   ⚠️   |   ⚠️   |        ⚠️        |
| **Organisation visuelle libre** |      ❌       |      ❌       |      ❌       |   ❌   |   ❌   |        ❌        |

---

### 2.4 Prix

| Solution             |      Plan gratuit       | Plan payant           |  Stockage inclus  | Prix/Go additionnel | Modèle                           |
| -------------------- | :---------------------: | --------------------- | :---------------: | :-----------------: | -------------------------------- |
| **Google Photos**    |          15 Go          | 2,99 €/mois → 100 Go  |       15 Go       |     ~0,03 €/Go      | Abonnement (Google One)          |
| **iCloud Photos**    |          5 Go           | 0,99 €/mois → 50 Go   |       5 Go        |     ~0,02 €/Go      | Abonnement (iCloud+)             |
| **Amazon Photos**    | Illimité photos (Prime) | 0,02 €/Go             | Illimité (Prime)  |      0,02 €/Go      | Inclus Amazon Prime (69,90 €/an) |
| **Flickr**           |       1000 photos       | 7,99 $/mois           |  Illimité (Pro)   |       Inclus        | Abonnement Pro                   |
| **Immich**           |         Gratuit         | Gratuit (self-hosted) | Dépend du serveur |    Coût serveur     | Open-source                      |
| **Nextcloud Photos** |         Gratuit         | Gratuit (self-hosted) | Dépend du serveur |    Coût serveur     | Open-source                      |

---

## 3. Tableau récapitulatif — Score global

Notation de 1 à 5 par domaine.

| Solution             | Fonctionnalités | Technique |  UX   | Prix  | **Total /20** |
| -------------------- | :-------------: | :-------: | :---: | :---: | :-----------: |
| Google Photos        |        4        |     3     |   5   |   3   |    **15**     |
| iCloud Photos        |        4        |     4     |   5   |   3   |    **16**     |
| Amazon Photos        |        3        |     3     |   3   |   4   |    **13**     |
| Flickr               |        3        |     3     |   3   |   3   |    **12**     |
| Immich               |        3        |     5     |   4   |   5   |    **17**     |
| Nextcloud Photos     |        2        |     4     |   2   |   5   |    **13**     |
| **Notre plateforme** |      **5**      |   **4**   | **5** | **5** |    **19**     |

> Notre plateforme cible un score maximal grâce à la killer feature (whiteboard visuel) et au self-hosting RGPD-compliant, ce qu'aucune solution existante ne combine aujourd'hui.

---

## 4. Identification des gaps de marché

### Gap 1 — Organisation visuelle libre (non linéaire)

**Toutes les solutions existantes** organisent les photos de manière chronologique ou par album traditionnel. Aucune ne propose une organisation **spatiale et visuelle libre**, de type carte mentale ou whiteboard.

→ **Mon point fort :** Whiteboard interactif avec nœuds colorés (React Flow), où chaque nœud représente une couleur dominante et regroupe les photos associées. L'utilisateur organise visuellement ses photos selon sa propre logique, pas celle de l'algorithme.

---

### Gap 2 — Privacy-first avec UX moderne

Les solutions self-hosted (Immich, Nextcloud) offrent la confidentialité mais avec une UX technique et peu accessible. Les solutions grand public (Google, Apple) ont une belle UX mais aspirent les données vers des serveurs soumis au Cloud américain.

→ **Mon point fort :** Architecture self-hosted (Docker Swarm sur VPS EU) avec une interface moderne (Next.js 15, shadcn/ui, Tailwind v4), combinant confidentialité RGPD-native et expérience utilisateur soignée.

> **Compromis accepté :** Les fichiers binaires des photos sont stockés sur Amazon S3 (région Paris, `eu-west-3`) avec distribution via CloudFront. Ce choix introduit une dépendance à AWS, service américain soumis au Cloud Act. La mitigation retenue est le choix de la région EU et le fait que les données personnelles identifiantes (comptes, métadonnées, albums) restent exclusivement sur le VPS auto-hébergé. Les fichiers photos seuls sont externalisés, sans lien direct exploitable sans accès à la base de données.

---

## 5. Positionnement de notre plateforme

```
                    UX / Facilité d'utilisation
                            ▲
              Google Photos ●  ● iCloud Photos
                            │
          Flickr ●          │
                            │          ● Notre plateforme
   ─────────────────────────┼─────────────────────────►
   Propriétaire /           │                 Self-hosted /
   Données tierces          │                 RGPD-compliant
                            │
            Nextcloud ●     │   ● Immich
                            │
                            ▼
                   UX technique / complexe
```

Notre plateforme occupe le quadrant **Self-hosted + UX moderne** — actuellement vide sur le marché grand public.

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._

# Architecture des pages — PhotoApp

## Arborescence

```mermaid
flowchart TD
    LANDING["🏠 Landing  /"]

    LANDING --> LOGIN["Connexion  /login"]
    LANDING --> REGISTER["Inscription  /register"]
    LANDING --> FONCTIONNALITES["Fonctionnalités  /fonctionnalites"]
    LANDING --> TARIFS["Tarifs  /tarifs"]

    LOGIN --> GALLERY["Galerie  /galerie"]
    REGISTER --> GALLERY

    GALLERY --> UPLOAD["📤 Upload  dialog — pas de route dédiée"]
    GALLERY --> CHROMATIC["Exploration chromatique  /explore"]
    GALLERY --> ALBUMS_LIST["Albums  /albums"]
    GALLERY --> PHOTO_MODAL["🖼️ Détail photo  modal — pas de route dédiée"]

    CHROMATIC --> PHOTO_MODAL

    ALBUMS_LIST --> ALBUM_DETAIL["Détail album  /albums/id"]
    ALBUM_DETAIL --> PHOTO_MODAL

    PHOTO_MODAL --> SHARED["🔗 Photo partagée  /p/token  —  public"]

    style LANDING fill:#6d28d9,color:#fff,stroke:none
    style GALLERY fill:#6d28d9,color:#fff,stroke:none
    style SHARED fill:#0369a1,color:#fff,stroke:none
    style CHROMATIC fill:#7c3aed,color:#fff,stroke:none
    style UPLOAD fill:#6b7280,color:#fff,stroke:none
    style PHOTO_MODAL fill:#6b7280,color:#fff,stroke:none
```

---

## Pages existantes

### Pages publiques (sans authentification)
| Page | Route | Statut |
|------|--------|--------|
| Landing | `/` | ✅ Implémenté |
| Connexion | `/login` | ✅ Implémenté |
| Inscription | `/register` | ✅ Implémenté |
| Fonctionnalités | `/fonctionnalites` | ✅ Implémenté |
| Tarifs | `/tarifs` | ✅ Implémenté |
| Photo partagée (public) | `/p/[token]` | ✅ Implémenté |

### Pages authentifiées
| Page | Route | Statut |
|------|--------|--------|
| Galerie principale | `/galerie` | ✅ Implémenté |
| Exploration chromatique | `/explore` | ✅ Implémenté |
| Liste des albums | `/albums` | ✅ Implémenté |
| Détail d'un album | `/albums/[id]` | ✅ Implémenté |
| Dashboard admin | `/admin` | ✅ Implémenté |

### Composants sans route dédiée
| Élément | Implémentation | Note |
|---------|----------------|------|
| Détail photo | Modal overlay | Accessible depuis la galerie, l'exploration et les albums |
| Upload | Dialog | Intégré dans la page galerie (`/galerie`) |

---

## Notes

- La **galerie** (`/galerie`) est le hub central — toutes les pages app en partent.
- L'**exploration chromatique** (`/explore`) range les couleurs des photos dans un atlas fixe (palette OKLab) et présente un nuancier filtrable par album.
- Le **détail photo** et l'**upload** sont des composants (modal/dialog) intégrés dans les pages, sans route propre.
- Le **partage public** (`/p/[token]`) concerne les **photos** individuelles, pas les albums.
- Le groupe `/(public)` contient aussi `/mockups/*` (pages de développement, hors production).

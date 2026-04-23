# Architecture des pages — PhotoApp

## Arborescence

```mermaid
flowchart TD
    LANDING["🏠 Landing  /"]

    LANDING --> LOGIN["Connexion  /login"]
    LANDING --> REGISTER["Inscription  /register"]

    LOGIN --> GALLERY["Galerie  /gallery"]
    REGISTER --> GALLERY

    GALLERY --> CHROMATIC["Exploration chromatique  /explore"]
    GALLERY --> UPLOAD["Upload  /upload"]
    GALLERY --> ALBUMS_LIST["Albums  /albums"]
    GALLERY --> PHOTO_G["Détail photo  /photos/id"]
    GALLERY --> SETTINGS["Paramètres  /settings"]

    CHROMATIC --> PHOTO_C["Détail photo  /photos/id"]

    ALBUMS_LIST --> ALBUM_DETAIL["Détail album  /albums/id"]
    ALBUM_DETAIL --> PHOTO_A["Détail photo  /photos/id"]
    ALBUM_DETAIL --> SHARED["🔗 Album partagé  /s/token  —  public"]

    ADMIN["🛡️ Dashboard admin  /admin"] --> ADMIN_USERS["Utilisateurs  /admin/users"]

    style LANDING fill:#6d28d9,color:#fff,stroke:none
    style GALLERY fill:#6d28d9,color:#fff,stroke:none
    style ADMIN fill:#374151,color:#fff,stroke:none
    style SHARED fill:#0369a1,color:#fff,stroke:none
    style CHROMATIC fill:#7c3aed,color:#fff,stroke:none
```

---

## Pages à maquetter — priorités

### P1 — MVP
| Page | Route | Statut |
|------|--------|--------|
| Landing | `/` | ✅ V4 / V5 en cours |
| Connexion | `/login` | ❌ À faire |
| Inscription | `/register` | ❌ À faire |
| Galerie principale | `/gallery` | ❌ À faire |
| Upload | `/upload` | ❌ À faire |
| Détail d'une photo | `/photos/[id]` | ❌ À faire |

### P2 — Core features
| Page | Route | Statut |
|------|--------|--------|
| Exploration chromatique | `/explore` | ❌ À faire |
| Liste des albums | `/albums` | ❌ À faire |
| Détail d'un album | `/albums/[id]` | ❌ À faire |
| Album partagé (public) | `/s/[token]` | ❌ À faire |

### P3 — Secondaire
| Page | Route | Statut |
|------|--------|--------|
| Paramètres du compte | `/settings` | ❌ À faire |
| Dashboard admin | `/admin` | ❌ À faire |
| Gestion utilisateurs | `/admin/users` | ❌ À faire |

---

## Notes

- La **galerie** est le hub central — toutes les pages app en partent.
- L'**exploration chromatique** est un toggle dans la galerie, pas une entrée de nav séparée.
- **Détail photo** apparaît à plusieurs niveaux (galerie, exploration, album) — même page, contexte de retour différent.
- **Album partagé** (`/s/[token]`) est accessible sans compte — même UI que détail album en lecture seule.

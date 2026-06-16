# Diagrammes de flux et de séquence

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums (PhotoApp)
**Auteur :** Tony Mascate
**Date :** Juin 2026 _(mise à jour — aligné sur l'architecture livrée)_

---

> Ce document décrit les **flux dynamiques** du système. Pour les vues **statiques** (diagramme de
> composants, diagramme de déploiement, ports et protocoles), voir [`cartographie-si.md`](cartographie-si.md).
> Le reverse proxy utilisé est **Caddy** (TLS automatique via Let's Encrypt).

---

## 1. Flux nominal d'une requête authentifiée

```mermaid
flowchart LR
    user["Utilisateur<br/>(navigateur)"]

    subgraph swarm["VPS — Docker Swarm"]
        caddy["Caddy<br/>(reverse proxy, TLS)"]
        front["Next.js<br/>(frontend, RSC)"]
        api["NestJS<br/>(API REST)"]
        pgb["PgBouncer"]
        db[("PostgreSQL")]
        redis[("Redis<br/>cache + file")]
        worker["Worker BullMQ<br/>(optimisation image)"]
    end

    subgraph aws["AWS (eu-west-3)"]
        s3[("S3")]
        cf["CloudFront (CDN)"]
    end

    user -->|"HTTPS :443"| caddy
    caddy -->|"web"| front
    caddy -->|"api"| api
    front -->|"REST (cookie JWT)"| api
    api -->|"TCP"| pgb --> db
    api -->|"TCP"| redis
    api -->|"enqueue"| worker
    worker -->|"AWS SDK"| s3
    user -->|"HTTPS (images signées)"| cf
    cf --- s3
```

**Points clés :** le frontend et l'API sont servis derrière un point d'entrée unique (Caddy) qui
centralise le TLS ; les images ne transitent jamais par l'API (diffusion directe via CloudFront avec
URL signée) ; le traitement d'image est déporté hors du cycle requête/réponse (worker BullMQ).

---

## 2. Diagramme de séquence — Upload d'une photo

> Upload multipart résilient vers S3 (URLs pré-signées) + traitement asynchrone. La session d'upload
> est attachée à l'utilisateur dans Redis (TTL 1 h) pour empêcher l'usurpation.

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant F as Frontend (Next.js)
    participant A as API (NestJS)
    participant R as Redis
    participant S as S3
    participant Q as File BullMQ
    participant W as Worker (Sharp)

    U->>F: Sélectionne une/des image(s)
    F->>A: POST /photos/uploads/multipart (contentType, fileSize)
    A->>A: Vérifie le quota (500 Mo/user)
    A->>S: createMultipartUpload
    A->>R: SET upload:{uploadId} = userId (TTL 1h)
    A-->>F: uploadId + key

    loop pour chaque part
        F->>A: POST /sign-part (uploadId, partNumber)
        A->>R: assertUploadOwner(uploadId, userId)
        A-->>F: URL PUT signée
        F->>S: PUT part (envoi direct)
    end

    F->>A: POST /complete (parts)
    A->>S: completeMultipartUpload
    A->>R: DEL upload:{uploadId}
    A->>A: enregistre Photo (status = PENDING)
    A->>Q: enqueue job d'optimisation
    A-->>F: photo (PENDING)

    Q->>W: job
    W->>S: download (raw)
    W->>W: resize + WebP + extraction couleur dominante
    W->>S: upload (image optimisée)
    W->>A: status = COMPLETED (+ dominantColor)

    loop polling
        F->>A: GET /photos/{id}/status
        A-->>F: PENDING puis COMPLETED
    end
```

**Robustesse :** en cas d'échec d'enregistrement après assemblage, l'objet S3 est supprimé (rollback) ;
en cas d'échec du worker, le fichier brut est nettoyé et le statut passe à `FAILED`.

---

## 3. Diagramme de séquence — Exploration chromatique

> La couleur dominante est calculée **à l'upload** (section 2) ; l'exploration regroupe ensuite
> dynamiquement les couleurs par **k-means** côté serveur. C'est la fonctionnalité différenciante.

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant F as Frontend (ChromaticExplorer)
    participant A as API (NestJS)
    participant DB as PostgreSQL

    U->>F: Ouvre la page /explore
    F->>A: GET /photos/colors (cookie JWT)
    A->>DB: SELECT id, dominant_color WHERE user_id = ? AND status = COMPLETED
    A->>A: k = max(3, min(10, round(sqrt(n/2))))
    A->>A: k-means++ sur les couleurs RVB
    A-->>F: groupes { centroïde, photos[] }

    U->>F: Clique sur une bulle (cluster)
    F->>F: Affiche les sous-nuances (quantification RVB)
    U->>F: Clique sur une sous-nuance
    F->>F: Affiche la grille des photos de la teinte
```

**Note :** aucune couleur n'est codée en dur côté frontend — les centroïdes k-means servent
directement de couleur d'affichage des bulles, dont la taille est proportionnelle au nombre de photos
du cluster. Le recalcul k-means à chaque requête est une limite connue (évolution : cache Redis).

---

## 4. Diagramme de séquence — Authentification (JWT + refresh)

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant F as Frontend
    participant A as API (Auth)
    participant DB as PostgreSQL

    U->>F: Identifiants (email, mot de passe)
    F->>A: POST /auth/login
    A->>DB: SELECT user (password select:false → +password)
    A->>A: Argon2.verify(password)
    A->>DB: stocke le hash du refresh token
    A-->>F: Set-Cookie access(15min) + refresh(7j) + XSRF (HTTP-only sauf XSRF)

    Note over F,A: Requête mutante → en-tête X-XSRF-TOKEN comparé au cookie (double-submit)

    U->>F: Action après expiration de l'access
    F->>A: POST /auth/refresh (cookie refresh)
    A->>DB: vérifie hash + non révoqué + non expiré
    A-->>F: nouveau couple de tokens (rotation)
```

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._

# ADR-006 — Authentification : JWT + Refresh Tokens + Argon2

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon application nécessite un système d'authentification sécurisé pour protéger les ressources des utilisateurs (photos, albums, partages). L'API tourne sur plusieurs réplicas Docker Swarm — la session ne peut donc pas être stockée en mémoire locale. Je dois gérer à la fois la sécurité des tokens, leur transmission, et leur renouvellement sans obliger l'utilisateur à se reconnecter trop souvent.

---

## Options considérées

### Stratégie d'authentification

| Critère                        | JWT stateless               | Sessions serveur (Redis)     | OAuth2 / OIDC externe        |
|--------------------------------|-----------------------------|------------------------------|------------------------------|
| Compatibilité multi-réplicas   | Oui (stateless)             | Oui (si Redis centralisé)    | Oui                          |
| Complexité                     | Moyenne                     | Faible                       | Élevée                       |
| Révocation de token            | Complexe (blacklist)        | Facile (supprimer la session)| Dépend du provider           |
| Dépendance externe             | Non                         | Redis                        | Provider OAuth               |
| Adapté à un projet solo        | Oui                         | Oui                          | Trop complexe                |

### Stockage du token côté client

| Critère                        | Cookie HTTP-only             | localStorage                 | sessionStorage               |
|--------------------------------|-----------------------------|------------------------------|------------------------------|
| Accessible par JS              | Non (protégé)               | Oui (vulnérable XSS)         | Oui (vulnérable XSS)         |
| Envoi automatique              | Oui (avec credentials)      | Non (manuel)                 | Non (manuel)                 |
| Protégé contre XSS             | Oui                         | Non                          | Non                          |
| Protégé contre CSRF            | Nécessite protection CSRF   | Non concerné                 | Non concerné                 |

### Algorithme de hachage de mot de passe

| Critère                        | Argon2                       | bcrypt                       | PBKDF2                       |
|--------------------------------|------------------------------|------------------------------|------------------------------|
| Résistance aux GPU             | Excellente (mémoire-intensive)| Bonne                        | Moyenne                      |
| Recommandation OWASP           | Première recommandation      | Acceptable                   | Acceptable                   |
| Support Node.js                | Via `argon2` (natif)         | Via `bcrypt` / `bcryptjs`    | Natif Node.js                |

---

## Décision

**J'utilise JWT avec un pattern access token (15 min) + refresh token (7 jours), stockés en cookies HTTP-only, avec hachage des mots de passe via Argon2 et protection CSRF.**

---

## Justification

1. **Access token court + refresh token :** Un access token de 15 minutes limite la fenêtre d'exploitation en cas de vol. Le refresh token (7 jours) permet de renouveler l'access token sans re-connexion. Le refresh token est haché en base de données pour permettre sa révocation.

2. **Cookies HTTP-only :** Les tokens ne sont jamais accessibles via JavaScript — une attaque XSS ne peut pas les voler. Le cookie est envoyé automatiquement par le navigateur sur chaque requête, sans gestion manuelle.

3. **Protection CSRF :** Les cookies HTTP-only rendent nécessaire une protection CSRF. J'utilise un middleware + guard NestJS (`CsrfMiddleware`, `CsrfGuard`) pour valider un token CSRF sur les requêtes mutantes (POST, PUT, DELETE).

4. **Argon2 :** Première recommandation OWASP pour le hachage de mots de passe. Résistant aux attaques GPU/ASIC grâce à son paramètre de consommation mémoire (memory-hard). Le module `argon2` pour Node.js utilise la bibliothèque C native, pas de dépendance purement JS.

5. **Refresh token persisté :** Le hash du refresh token est stocké en base de données. Cela permet de le révoquer explicitement (déconnexion, changement de mot de passe, compromission) — contrairement à un JWT purement stateless qui ne peut pas être invalidé avant expiration.

6. **Passport.js + @nestjs/jwt :** L'écosystème NestJS fournit des modules officiels qui s'intègrent dans le système d'injection de dépendances, avec des stratégies Passport (LocalStrategy, JwtStrategy) réutilisables et testables.

---

## Conséquences

**Positives :**
- Sécurité élevée : tokens non accessibles en JS, hachage résistant aux attaques modernes.
- Révocation possible grâce à la persistance du refresh token en base.
- Renouvellement transparent pour l'utilisateur (pas de re-connexion fréquente).
- Compatible multi-réplicas (stateless pour l'access token).

**Négatives / Risques :**
- Le refresh token en base de données introduit un appel DB à chaque renouvellement — négligeable à cette échelle.
- La protection CSRF ajoute une requête préalable pour obtenir le token CSRF — complexité légère côté client.
- Si Redis tombe, le cache d'invalidation n'est plus disponible (non implémenté dans ce projet, acceptable).

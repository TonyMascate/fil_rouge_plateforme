# ADR-010 — CI/CD : GitHub Actions + ghcr.io + Déploiement SSH

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon projet nécessite un pipeline CI/CD automatisé pour construire les images Docker, les pousser dans un registre, et les déployer sur mon VPS via Docker Swarm. Le pipeline doit aussi exécuter les migrations de base de données après déploiement. Je dois choisir une plateforme CI/CD, un registre d'images, et une stratégie de déploiement adaptés à un projet hébergé sur GitHub.

---

## Options considérées

### Plateforme CI/CD

| Critère                        | GitHub Actions                | GitLab CI/CD                  | Jenkins                       | CircleCI                      |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Intégration GitHub             | Native                        | Nécessite import              | Via plugin                    | Via OAuth                     |
| Coût                           | Gratuit (2 000 min/mois)      | Gratuit (400 min/mois)        | Self-hosted requis            | Gratuit limité                |
| Configuration                  | YAML dans `.github/workflows/`| YAML dans `.gitlab-ci.yml`    | Groovy (Jenkinsfile)          | YAML dans `.circleci/`        |
| Marketplace d'actions          | Très riche                    | Moyen                         | Via plugins                   | Via orbs                      |
| Secrets management             | GitHub Secrets                | GitLab CI Variables           | Credentials Jenkins           | CircleCI Contexts             |

### Registre d'images Docker

| Critère                        | ghcr.io (GitHub Registry)     | Docker Hub                    | AWS ECR                       | Self-hosted Registry          |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Intégration GitHub Actions     | Native (GITHUB_TOKEN)         | Via secrets                   | Via aws-actions               | Via secrets                   |
| Coût                           | Gratuit (packages publics/privés) | Gratuit limité (pull limits) | Payant                        | Infrastructure à gérer        |
| Auth dans Swarm                | `--with-registry-auth`        | `docker login`                | Via rôle IAM                  | `docker login`                |

### Stratégie de déploiement

| Critère                        | SSH + docker stack deploy     | Ansible                       | Watchtower (pull auto)        | Kubernetes (kubectl)          |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Complexité                     | Faible                        | Moyenne                       | Très faible                   | Élevée                        |
| Contrôle du déploiement        | Total                         | Total                         | Limité (pas de staging)       | Total                         |
| Rolling update Swarm           | Via `docker stack deploy`     | Via modules Docker            | Automatique                   | Via Deployment                |
| Adapté au projet               | Oui                           | Overkill                      | Trop automatique              | Voir ADR-001                  |

---

## Décision

**J'utilise GitHub Actions pour le CI/CD, ghcr.io comme registre Docker, et un déploiement SSH via `docker stack deploy` sur mon VPS.**

---

## Justification

1. **GitHub Actions natif :** Mon code est hébergé sur GitHub. GitHub Actions s'active directement, sans configuration d'intégration externe. Les workflows YAML sont versionnés dans le dépôt — l'infrastructure CI/CD est du code.

2. **ghcr.io avec GITHUB_TOKEN :** Le registre GitHub Packages (ghcr.io) est authentifié automatiquement via le `GITHUB_TOKEN` intégré à GitHub Actions — pas de secret supplémentaire à gérer pour le push d'images. `docker stack deploy --with-registry-auth` transmet les credentials aux nœuds Swarm.

3. **Pipeline en trois étapes :**
   - **Build & Push :** Construction de l'image Docker avec `turbo prune` (voir ADR-009), push sur ghcr.io.
   - **Deploy :** SSH sur le VPS, `docker stack deploy` avec la nouvelle image.
   - **Migrate :** Exécution des migrations TypeORM comme conteneur éphémère (`docker run --rm`) après le déploiement, avant que le trafic arrive sur la nouvelle version.

4. **SSH via appleboy/ssh-action :** Action marketplace simple et maintenue pour exécuter des commandes sur le VPS via SSH. La clé privée SSH est stockée dans GitHub Secrets. Pas de VPN, pas d'agent intermédiaire.

5. **Rolling update automatique :** `docker stack deploy` réutilise la configuration Swarm existante (réplicas, restart policies, update config) définie dans `stack.yml`. Le rolling update préserve la disponibilité pendant le déploiement (voir ADR-001).

6. **Migrations post-déploiement :** Les migrations sont exécutées dans un conteneur éphémère après que les nouveaux conteneurs d'API sont démarrés, mais avant que le routeur Swarm n'envoie du trafic dessus (grâce au health check). Cela garantit que la base de données est à jour avant que les nouvelles instances répondent.

7. **Séparation des workflows :** API et frontend ont des workflows distincts (`api.yml`, `web.yml`). Un changement frontend ne déclenche pas un redéploiement de l'API — pas de déploiement inutile.

---

## Conséquences

**Positives :**
- Pipeline entièrement automatisé sur push/merge sur `main`.
- Pas de gestion manuelle de secrets Docker Hub ou de registre externe.
- Rolling updates sans interruption de service.
- Migrations de base de données versionnées et automatisées.

**Négatives / Risques :**
- Déploiement SSH sur un VPS = point de défaillance unique si le VPS est inaccessible.
- Pas d'environnement de staging — les déploiements vont directement en production. Acceptable pour un projet solo.
- Si les migrations échouent, l'API nouvelle version est déjà déployée — nécessite une procédure de rollback manuel.

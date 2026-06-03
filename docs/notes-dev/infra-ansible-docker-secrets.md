# Infrastructure Ansible & Docker Secrets — Note de soutenance

## 1. Contexte et problème initial

### L'ancienne approche : le "bloc Ninja"

Avant cette refactorisation, les secrets de production (mots de passe DB, clés JWT, clés AWS…) vivaient dans un unique secret GitHub nommé `ENV_PROD`. Ce secret contenait l'intégralité d'un fichier `.env` de production.

Au déploiement, le workflow GitHub Actions se connectait au VPS en SSH et exécutait :

```bash
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ -n "$line" && "$line" != \#* ]]; then
    export "$line"
  fi
done <<< "${{ secrets.ENV_PROD }}"

docker stack deploy --with-registry-auth -c stack.yml mon-app
```

Ce pattern (surnommé "bloc Ninja" pour sa discrétion) était fonctionnel mais présentait plusieurs faiblesses :

| Problème | Impact |
|---|---|
| Les secrets sont interpolés dans le script shell | Risque d'apparition dans les logs si l'interpolation échoue |
| Un seul "mega-secret" opaque | Si une valeur change, on écrase tout le blob |
| `docker stack deploy` avec `${VAR}` non résolues si l'export échoue | Deploy silencieusement cassé |
| Job `migrate` parse `ENV_PROD` avec `grep '^DB_USER='` | Fragile, casse si la valeur contient des caractères spéciaux |
| Le `.env` peut être reconstitué depuis les logs d'exécution | Surface d'attaque plus large |

### Objectif

Passer à une architecture où :
- Les valeurs sensibles ne transitent **jamais en clair** dans des scripts shell
- Chaque secret est **identifié individuellement** (rotation sans tout casser)
- Les conteneurs accèdent aux secrets via un **mécanisme chiffré natif Docker**
- L'infrastructure est **reproductible** et **versionnée** (nouveau serveur en quelques commandes)

---

## 2. Architecture cible : le modèle GitHub Secrets + Ansible + Docker Secrets

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Secrets (chiffré au repos, jamais dans le repo)       │
│  DB_PASSWORD, JWT_ACCESS_SECRET, AWS_SECRET_ACCESS_KEY…      │
└───────────────────────┬─────────────────────────────────────┘
                        │ -e db_password=$DB_PASSWORD
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Ansible (runner GitHub → VPS via SSH)                        │
│  playbook-secrets.yml : docker secret create db_password -  │
└───────────────────────┬─────────────────────────────────────┘
                        │ chiffré dans le raft Swarm (AES)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Docker Swarm Raft (base de données distribuée chiffrée)      │
│  docker secret ls → db_password, jwt_access_secret…         │
└───────────────────────┬─────────────────────────────────────┘
                        │ monté en tmpfs (RAM uniquement)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Conteneur API / Web                                          │
│  /run/secrets/db_password  (fichier en RAM, jamais sur disque)│
└───────────────────────┬─────────────────────────────────────┘
                        │ readSecret() / loadSecrets()
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ process.env (mémoire du process Node.js)                     │
│  ConfigService, TypeORM, AWS SDK lisent normalement          │
└─────────────────────────────────────────────────────────────┘
```

**Propriété clé :** à aucun moment les valeurs sensibles ne touchent le disque dur du serveur en clair.

### Le raft Swarm : qu'est-ce que c'est concrètement ?

**Raft** est un algorithme de consensus — une façon pour plusieurs machines de se mettre d'accord sur une valeur même si l'une d'elles tombe. Docker Swarm l'utilise pour que les managers du cluster partagent un état commun : quels services tournent, combien de replicas, et les secrets.

Cet état partagé s'appelle le **raft log** — c'est une base de données distribuée embarquée directement dans Docker, sans dépendance externe. Sur le disque du serveur, elle se trouve dans `/var/lib/docker/swarm/raft/` et son contenu est chiffré AES-256.

```
Manager (109.123.247.178)
└── /var/lib/docker/swarm/
    └── raft/
        └── wal-xxx.db  ← chiffré AES-256, illisible sans la clé Swarm
```

Quand tu exécutes `docker secret create db_password -`, la valeur est chiffrée avant d'être écrite dans ce fichier. Quand un conteneur démarre et demande le secret, Docker le déchiffre **en mémoire** et le monte en tmpfs — la valeur en clair n'existe qu'en RAM, jamais sur le disque.

**Avec plusieurs managers** (3 recommandés en prod), Raft garantit que si un manager tombe, les autres ont la même copie chiffrée et le cluster continue de fonctionner. La règle : il faut une majorité (2 managers sur 3) pour valider une écriture — c'est ce qu'on appelle le **quorum**. Avec un seul manager (notre cas actuel), il n'y a pas de quorum à maintenir, mais c'est un point unique de défaillance.

**Pour la soutenance** : *"les secrets sont stockés dans le raft Swarm, qui est la base de données distribuée et chiffrée native de Docker. Pas de base externe à sécuriser, pas de service tiers — Docker gère seul la cohérence et le chiffrement."*

### Comparaison avec un fichier `.env` sur le serveur

| Critère | `.env` sur le serveur | Docker Secrets |
|---|---|---|
| Stockage | Fichier texte clair sur le disque | Chiffré AES dans le raft Swarm |
| Visibilité `docker inspect` | Oui (si `--env-file`) | Non |
| Accessible depuis l'hôte | Oui | Non (tmpfs dans le conteneur) |
| Risque de commit accidentel | Élevé | Nul (rien dans le repo) |
| Granularité | Tout-ou-rien | Par secret individuel |
| Rotation | Remplacer tout le fichier | Créer une nouvelle version versionnée |

---

## 3. Outillage : Ansible

### Pourquoi Ansible plutôt qu'un simple script bash ?

Un script bash de provisioning fonctionne une fois mais :
- N'est pas **idempotent** (relancer casse des choses)
- Difficile à **tester** et à **maintenir**
- Ne gère pas les erreurs proprement

Ansible garantit l'**idempotence** : chaque tâche vérifie l'état cible avant d'agir. Relancer `playbook-provision.yml` sur un serveur déjà configuré ne change rien. C'est crucial pour :
- Reprendre après une interruption
- Ajouter un nœud sans toucher aux existants
- Débugger en rejouant une tâche isolée

### Structure des rôles

```
infra/
├── ansible.cfg              → config globale (inventory, SSH, become)
├── inventory.ini            → liste des serveurs avec IPs
├── playbook-provision.yml   → rôles common + docker
├── playbook-swarm.yml       → rôle swarm
├── playbook-secrets.yml     → création des Docker Secrets
└── roles/
    ├── common/              → durcissement système
    ├── docker/              → installation Docker CE
    └── swarm/               → init cluster + réseau overlay
```

### Rôle `common` — Durcissement

Ce rôle transforme un VPS vierge (accessible en root par mot de passe) en serveur durci :

1. **Création de l'utilisateur `deploy`** : jamais root en production. L'utilisateur `deploy` a les droits `sudo` sans mot de passe uniquement pour les commandes automatisées.
2. **Authentification par clé SSH uniquement** : `PasswordAuthentication no` + `PermitRootLogin no`. Après ce rôle, il est impossible de se connecter autrement qu'avec `id_deploy`.
3. **Firewall UFW** : politique "deny all" par défaut, uniquement les ports 22, 80, 443 ouverts sur internet. Les ports Swarm internes (2377, 7946, 4789) sont restreints au sous-réseau privé entre nœuds.
4. **fail2ban** : bannit automatiquement les IPs qui multiplient les tentatives SSH.

### Rôle `swarm` — Cluster Swarm

Initialise Docker Swarm avec `--advertise-addr` pointant sur l'IP privée (trafic interne entre nœuds sur le réseau LAN de l'hébergeur, pas sur internet). Crée le réseau overlay `mon-app_app-net` utilisé par tous les services.

**Idempotence** : la tâche vérifie `docker info --format '{{.Swarm.LocalNodeState}}'`. Si le résultat est `active`, l'init est skippée.

### Playbook `playbook-secrets.yml` — Cœur du système

```yaml
- name: Créer les secrets (idempotent)
  shell: "printf '%s' '{{ item.value }}' | docker secret create {{ item.name }} -"
  no_log: true
```

Points clés :
- Les valeurs arrivent via `-e db_password=$DB_PASSWORD` depuis GitHub Actions — elles ne sont jamais écrites dans un fichier
- `no_log: true` empêche Ansible d'afficher les valeurs même en mode verbose
- `printf '%s'` évite l'interprétation des caractères spéciaux (contrairement à `echo`)
- `already exists` dans stderr est ignoré : idempotent, relancer ne casse rien
- Docker Secrets sont **immuables** : pour changer une valeur, créer `db_password_v2` et pointer le stack vers la nouvelle version

---

## 4. Lecture des secrets dans le code

### Pourquoi pas juste des variables d'environnement classiques ?

Docker Swarm permet de passer des env vars au conteneur via `stack.yml`. Mais cela les rend visibles dans `docker service inspect` et les logs de déploiement. Les Docker Secrets montés en fichier `/run/secrets/` ne sont visibles nulle part en dehors du conteneur.

### Convention `_FILE`

La convention `<NOM>_FILE` est un standard Docker (utilisé par les images officielles postgres, mysql, etc.) :
- `DB_PASSWORD_FILE=/run/secrets/db_password` → la variable `_FILE` pointe vers le fichier secret
- `DB_PASSWORD` → la valeur en clair pour le dev local

Le helper `readSecret()` implémente cette convention :

```typescript
// apps/api/src/config/secret.ts
export function readSecret(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (filePath) {
    try {
      return readFileSync(filePath, 'utf8').trim();
    } catch {
      return undefined;
    }
  }
  return process.env[name];
}
```

**En dev** : `DB_PASSWORD_FILE` n'existe pas → retourne `process.env.DB_PASSWORD` (depuis le `.env`)  
**En prod** : `DB_PASSWORD_FILE=/run/secrets/db_password` → lit le fichier en RAM

### Injection dans `process.env` avant NestJS

NestJS utilise `ConfigService.getOrThrow('JWT_ACCESS_SECRET')` qui lit `process.env`. Pour ne pas modifier chaque module qui utilise ConfigService, `loadSecrets()` dans `main.ts` injecte toutes les valeurs dans `process.env` avant que `NestFactory.create()` initialise les modules :

```typescript
// apps/api/src/main.ts
function loadSecrets() {
  for (const name of SECRET_NAMES) {
    const value = readSecret(name);
    if (value !== undefined) {
      process.env[name] = value;
    }
  }
}

loadSecrets(); // ← avant NestFactory.create()
```

**Ordre d'exécution garanti** :
1. Docker injecte `DB_PASSWORD_FILE=/run/secrets/db_password` dans le process (avant tout JS)
2. `loadSecrets()` lit le fichier et pose `DB_PASSWORD` dans `process.env`
3. `NestFactory.create()` initialise les modules, ConfigService trouve les valeurs

### Migrations au démarrage (API)

L'ancien job `migrate` dans le CI parsait `ENV_PROD` avec `grep`, fragile et risqué. `runMigrations()` dans `main.ts` remplace proprement ce pattern :

```typescript
async function runMigrations() {
  const MAX_ATTEMPTS = 30;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await dataSource.initialize();
      await dataSource.runMigrations();
      await dataSource.destroy();
      return;
    } catch {
      if (attempt === MAX_ATTEMPTS) throw new Error('DB unreachable after 30 attempts');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
```

**Comportement avec plusieurs replicas** : TypeORM utilise `pg_advisory_lock` lors des migrations. Avec 4 replicas qui démarrent simultanément, un seul exécute la migration pendant que les autres attendent le lock. C'est safe, mais cela implique un délai de démarrage lié à la migration pour tous les replicas.

**Trade-off accepté** : pour des migrations courantes (< quelques secondes), ce n'est pas un problème. Pour des migrations lourdes (backfill de millions de lignes), il faudrait un job Swarm one-shot dédié qui tourne avant les replicas API. Cette évolution est possible sans changer l'architecture.

### Secrets JWT pour Next.js

Next.js 16 fournit `instrumentation.ts`, un hook officiel qui tourne une seule fois au démarrage du serveur, avant les pages et le middleware :

```typescript
// apps/web/instrumentation.ts
export async function register() {
  const secrets = {
    JWT_ACCESS_SECRET: '/run/secrets/jwt_access_secret',
    JWT_REFRESH_SECRET: '/run/secrets/jwt_refresh_secret',
  };
  for (const [name, filePath] of Object.entries(secrets)) {
    try {
      process.env[name] = readFileSync(filePath, 'utf8').trim();
    } catch {
      // Mode dev : fichier absent, la var est déjà dans .env
    }
  }
}
```

---

## 5. Workflow de déploiement complet

```
git push → main
    │
    ▼
build-push : build image Docker → push sur ghcr.io
    │
    ▼ (api.yml uniquement)
secrets : runner GitHub installe Ansible
          → configure la clé SSH id_deploy
          → ansible-playbook playbook-secrets.yml
              -e "db_password=$DB_PASSWORD" ...
          → docker secret create (idempotent) sur le manager
    │
    ▼
deploy : scp stack.yml + prometheus.yml + promtail.yml → /var/www/html/fil_rouge/
         ssh → docker login ghcr.io
             → docker pull <image>:latest
             → docker stack deploy --with-registry-auth -c stack.yml mon-app
             → docker image prune -f
    │
    ▼
conteneur démarre :
    API : loadSecrets() → runMigrations() → NestFactory.create()
    Web : instrumentation.ts register() → serveur Next.js
```

### Séparation des responsabilités

| Tâche | Outil | Fréquence | Où ça tourne |
|---|---|---|---|
| Provisionner OS + durcissement | Ansible | Rare (nouveau serveur) | Dev machine ou CI manuel → VPS |
| Installer Docker | Ansible | Rare | idem |
| Init cluster Swarm | Ansible | Rare | idem |
| Créer/vérifier Docker Secrets | Ansible | À chaque deploy | Runner GitHub → manager |
| Build + push image | GitHub Actions | À chaque push | Runner GitHub |
| Copier stack.yml + configs | GitHub Actions (scp) | À chaque push | Runner GitHub → VPS |
| `docker stack deploy` | GitHub Actions (ssh) | À chaque push | Runner GitHub → VPS |
| Migrations DB | TypeScript (main.ts) | À chaque démarrage de conteneur | Dans le conteneur |

---

## 6. Clé SSH de déploiement

### Pourquoi une clé dédiée

La clé principale du développeur (`id_ed25519` ou `id_rsa`) donne accès à GitHub, autres serveurs, comptes perso. En cas de compromission, l'impact est maximal.

`id_deploy` est une clé **à usage unique** : elle n'est autorisée que sur les VPS de production (ajoutée dans `authorized_keys` de l'utilisateur `deploy` par Ansible). Si elle est compromise, on la révoque sans toucher à rien d'autre.

### Cycle de vie

```
Génération : ssh-keygen -t ed25519 -f ~/.ssh/id_deploy -C "deploy"
              ↓ une seule fois sur la machine de dev

id_deploy.pub → déposée sur le VPS par Ansible (roles/common)
             → enregistrée dans le panel hébergeur pour les nouveaux VPS

id_deploy (privée) → stockée dans GitHub Secret SSH_PRIVATE_KEY
                   → jamais dans le repo (infra/.gitignore)
```

Algorithme `ed25519` : plus court qu'RSA 4096, cryptographiquement plus solide, signatures plus rapides.

---

## 7. Évolutivité : ajouter un nœud worker

L'architecture est conçue pour scaler horizontalement. Pour ajouter un worker :

```
1. Créer le VPS chez l'hébergeur → cocher la clé id_deploy au boot
2. Ajouter worker-1 dans infra/inventory.ini
3. GitHub Actions → workflow manuel → playbook-provision.yml (limit: worker-1)
4. GitHub Actions → workflow manuel → playbook-swarm.yml
5. Vérifier : docker node ls (depuis le manager)
```

Les Docker Secrets et le réseau overlay existent déjà sur le cluster. Le nouveau nœud les voit immédiatement. Zéro reconfiguration de l'app.

Pour le trafic inter-nœuds Swarm (ports 2377, 7946, 4789), activer le réseau privé chez l'hébergeur et mettre à jour le CIDR dans `roles/common/tasks/main.yml` (actuellement `10.0.0.0/24`).

---

## 8. Rotation d'un secret

Les Docker Secrets sont **immuables** — on ne peut pas modifier la valeur d'un secret existant. Le pattern de rotation :

```bash
# 1. Mettre à jour la valeur dans GitHub Secrets (interface web GitHub)

# 2. Sur le manager : créer une version v2
printf 'nouveau_mdp' | docker secret create db_password_v2 -

# 3. Dans stack.yml : pointer vers db_password_v2
#    DB_PASSWORD_FILE: /run/secrets/db_password_v2

# 4. Redéployer (docker stack deploy ... → rolling update sans interruption)

# 5. Une fois stable, supprimer l'ancienne version
docker secret rm db_password
```

**Bonne pratique** : nommer les secrets avec une version dès le départ (`db_password_v1`) pour que les rotations futures soient sans ambiguïté.

---

## 9. Points forts pour la soutenance

### Ce qui distingue cette approche

1. **Zéro secret en clair dans le repo** : ni dans les fichiers YAML Ansible, ni dans les workflows, ni dans le `stack.yml`. Les valeurs n'existent qu'à deux endroits : GitHub Secrets (interface web) et le raft Swarm chiffré.

2. **Infrastructure as Code complète** : un développeur qui clone le repo a la recette pour recréer l'infrastructure from scratch. Ansible remplace une documentation textuelle qui devient rapidement obsolète.

3. **Idempotence** : relancer n'importe quel playbook Ansible sur un serveur existant est safe. C'est la propriété clé qui distingue Ansible d'un script bash.

4. **Conformité aux standards** : la convention `_FILE` est utilisée par toutes les images officielles Docker Hub (postgres, mysql, redis). L'approche est standard, pas une solution maison.

5. **Défense en profondeur** : durcissement SSH (pas de root, pas de mot de passe), firewall UFW, fail2ban, secrets en mémoire uniquement. Chaque couche limite l'impact d'une compromission.

### Limites connues et évolutions possibles

- **Migrations multi-replicas** : safe grâce au lock TypeORM, mais suboptimal. Évolution : job Swarm one-shot dédié.
- **Secrets immuables** : la rotation nécessite une procédure manuelle. Évolution : HashiCorp Vault avec rotation automatique.
- **Single manager** : point unique de défaillance pour le raft Swarm. Évolution : 3 managers (quorum).
- **Monitoring des secrets** : pas d'alerting si un secret expire ou est compromis. Évolution : audit log Docker + alerting Grafana.

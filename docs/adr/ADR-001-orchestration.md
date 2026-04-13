# ADR-001 — Choix d'orchestration : Docker Swarm
 
- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate
 
---
 
## Contexte
 
Mon projet nécessite un système d'orchestration de conteneurs capable de gérer plusieurs réplicas de mes services (API NestJS, Frontend Next.js) avec haute disponibilité, load balancing et rollouts sans interruption de service.
 
La consigne du projet mentionne Kubernetes comme référence. Je dois justifier mon choix d'une technologie d'orchestration alternative.
 
---
 
## Options considérées
 
| Critère                     | Kubernetes (K8s)              | Docker Swarm                     |
|-----------------------------|-------------------------------|----------------------------------|
| Courbe d'apprentissage      | Élevée (CRDs, RBAC, Ingress…) | Faible (même syntaxe que Compose)|
| Complexité opérationnelle   | Haute (etcd, control plane…)  | Basse (intégré à Docker Engine)  |
| Scalabilité horizontale     | Excellente                    | Très bonne (suffisante au scale projet) |
| Résilience & self-healing   | Avancée                       | Bonne (restart policies, health checks) |
| Load balancing              | Via Ingress Controller externe | Intégré nativement               |
| Rolling updates / rollbacks | Oui                           | Oui                              |
| Ecosystème monitoring       | Prometheus/Grafana natifs     | Compatible Prometheus/Grafana    |
| Adapté à un projet de 8 sem.| Risqué (setup > features)     | Oui                              |
 
---
 
## Décision
 
**Je choisis Docker Swarm** comme orchestrateur de conteneurs.
 
---
 
## Justification
 
1. **Contrainte temps :** Sur 8 semaines en solo, la mise en place d'un cluster Kubernetes (même local avec Minikube/Kind) représente une charge opérationnelle significative qui aurait réduit le temps disponible pour les fonctionnalités métier et la qualité de la killer feature.
 
2. **Équivalence fonctionnelle :** Docker Swarm couvre l'ensemble de mes besoins : réplication de services, load balancing intégré, rolling updates, health checks, volumes persistants et réseau overlay. Les concepts adressés sont identiques à ceux de Kubernetes (orchestration, scalabilité..).
 
3. **Infrastructure as Code :** Mon `stack.yml` (mode Swarm) joue le même rôle que les manifests Kubernetes : il décrit de façon déclarative l'état souhaité de l'infrastructure.
 
4. **Principe Green IT :** Docker Swarm consomme significativement moins de ressources CPU/RAM que Kubernetes pour un résultat équivalent à mon échelle. Ce choix est cohérent avec ma stratégie d'éco-conception (voir ADR-005 et Rapport Green IT).
 
5. **Compétences visées maintenues :** Les compétences "Conteneurisation & Orchestration" restent pleinement couvertes. La transposition vers Kubernetes reste possible.
 
---
 
## Conséquences
 
**Positives :**
- Mise en place rapide, temps libéré pour la qualité et les features.
- Pipeline CI/CD plus simple à configurer (pas de kubeconfig à gérer).
- Consommation ressources réduite (Green IT).
 
**Négatives / Risques :**
- Pas d'exposition aux outils spécifiques Kubernetes (Helm, RBAC, CRDs) qui sont courants en entreprise, compensé par la veille technologique et la documentation.
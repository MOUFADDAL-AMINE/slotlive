# SlotLive — Real-Time Slot Booking Platform

> Portfolio GitHub Junior/Senior - Plateforme de reservation de creneaux en temps reel, construite avec des technologies enterprise-grade.

[![CI](https://github.com/your-username/slotlive/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/slotlive/actions)

## Fonctionnalites

| Feature | Technologie | Detail |
|---------|------------|--------|
| Temps reel | **Socket.io** | Rooms par ressource, broadcast immediat |
| Anti-double reservation | **PostgreSQL Exclusion Constraint** | Contrainte au niveau BDD |
| Idempotency | **Redis + Headers** | Cle Idempotency-Key sur chaque mutation |
| Paiement | **Stripe Checkout** | Webhooks idempotents via table StripeEvent |
| Emails | **Nodemailer + BullMQ** | Confirmation asynchrone avec fichier .ics |
| Auth | **JWT dual-token** | accessToken (15 min) + refreshToken httpOnly (7j) |
| Admin | **Dashboard React** | Stats + Recharts + export CSV |
| Tests | **Vitest** | Unit tests sur services critiques |
| DevOps | **Docker Compose** | PostgreSQL 16, Redis, MailHog, API, Web |
| OpenAPI | **Swagger** | Auto-genere depuis les decorateurs NestJS |

## Architecture (Monorepo pnpm + Turborepo)

```
reservation/
+-- apps/
|   +-- api/          # NestJS 10 - REST + WebSocket backend
|   |   +-- prisma/   # Schema, migrations, seed data
|   |   +-- src/
|   |       +-- auth/         # JWT Auth, refresh, guards
|   |       +-- venues/       # Lieux + calcul disponibilites
|   |       +-- bookings/     # Reservation + BullMQ expiration
|   |       +-- payments/     # Stripe checkout + webhooks
|   |       +-- emails/       # Nodemailer + ICS generator
|   |       +-- events/       # Socket.io Gateway
|   |       +-- admin/        # Dashboard + CSV export
|   +-- web/          # Next.js 14 App Router (Tailwind CSS dark)
|       +-- src/
|           +-- app/          # Pages (login, register, venues, admin)
|           +-- components/   # Navbar, Providers (auth context)
|           +-- lib/          # fetchApi, socket singleton
+-- packages/
    +-- shared/       # Schemas Zod partages (types inferes)
```

## Demarrage rapide (Docker Compose)

### Prerequis
- Docker Desktop >= 24
- pnpm >= 9

### 1. Cloner et configurer
```bash
git clone https://github.com/your-username/slotlive.git
cd slotlive
cp .env.example .env
```

### 2. Lancer tous les services
```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| API NestJS | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |
| Web Next.js | http://localhost:3000 |
| MailHog (emails) | http://localhost:8025 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 3. Donnees de demonstration (seed)
```bash
pnpm --filter @slotlive/api prisma:seed
```

Cela cree :
- **Admin** : `admin@slotlive.com` / `Admin1234!`
- **Client** : `client@slotlive.com` / `Client1234!`
- **3 etablissements** avec ressources et regles d'ouverture

## Developpement local (sans Docker)

```bash
pnpm install
docker compose up postgres redis mailhog -d
pnpm --filter @slotlive/api prisma:migrate
pnpm --filter @slotlive/api prisma:seed
pnpm dev
```

## Tests

```bash
pnpm --filter @slotlive/api test
pnpm --filter @slotlive/api test:cov
```

## Stripe (mode test)

1. Mettre la cle test dans `.env` : `STRIPE_SECRET_KEY=sk_test_...`
2. Carte de test : `4242 4242 4242 4242`
3. Webhooks locaux :
   ```bash
   stripe listen --forward-to localhost:4000/api/v1/payments/webhook
   ```

## Decisions techniques

### 1. PostgreSQL Exclusion Constraint vs. Optimistic Locking
Pour une garantie absolue d'absence de double-reservation, j'ai opte pour une contrainte d'exclusion PostgreSQL (USING gist) sur (resource_id, tstzrange(start_at, end_at)) avec l'extension btree_gist. C'est la seule approche qui garantit l'atomicite meme si deux transactions concurrentes soumettent simultanement la meme plage.

### 2. Modele Hold-then-Pay
L'utilisateur bloque un creneau (HELD) pendant 10 minutes, puis paie. BullMQ expire automatiquement la reservation via un job differe si le paiement n'aboutit pas.

### 3. Race conditions Stripe
Le webhook checkout.session.completed re-verifie le creneau : si libre -> re-confirmation ; si pris -> remboursement automatique.

### 4. Idempotency a deux niveaux
- API : Header Idempotency-Key stocke dans Redis (TTL 10 min)
- Webhooks Stripe : Table StripeEvent avec stripeEventId unique

### 5. WebSockets par rooms de ressource
Socket.io avec rooms nommees resource:{id}. Un client ne recoit les mises a jour que pour la ressource qu'il consulte.

### 6. Monorepo pnpm + Turborepo
Partage du package @slotlive/shared (schemas Zod) entre API et Web sans dupliquer la logique de validation.

### 7. Securite
- Helmet sur tous les headers HTTP
- Throttler global (100 req/min par IP)
- Mots de passe hashe argon2id (plus robuste que bcrypt contre GPU)
- refreshToken en cookie httpOnly + SameSite=Lax (protection CSRF)
- Logs structures pino (pas de console.log en production)

## Flux de reservation

```
Client -> POST /bookings (idempotency key)
       <- booking.id (statut HELD, 10 min)
       -> BullMQ job "expire" planifie
       -> socket.emit(slot.held) broadcast

Client -> POST /checkout
       <- URL Stripe Checkout
       -> Paiement carte 4242...
       -> Stripe webhook checkout.session.completed
       -> UPDATE booking CONFIRMED
       -> socket.emit(slot.confirmed)
       -> Email + .ics envoye via BullMQ
```

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|------------|-------------|
| DATABASE_URL | Oui | URL PostgreSQL |
| REDIS_HOST | Oui | Hote Redis |
| JWT_ACCESS_SECRET | Oui | Secret JWT (32+ chars) |
| JWT_REFRESH_SECRET | Oui | Secret JWT refresh |
| STRIPE_SECRET_KEY | Oui | Cle Stripe (sk_test_) |
| STRIPE_WEBHOOK_SECRET | Oui | Secret webhook Stripe |
| SMTP_HOST | Oui | Serveur SMTP (MailHog local) |
| FRONTEND_URL | Oui | URL frontend CORS |

## Stack technologique

**Backend**: NestJS 10, Prisma ORM 5, Socket.io 4, BullMQ, Stripe SDK, Nodemailer, Argon2, Zod, Swagger, Vitest, Pino

**Frontend**: Next.js 14 App Router, Tailwind CSS, TanStack Query v5, React Hook Form, Socket.io Client, Recharts, Lucide React, date-fns

**DevOps**: Docker Compose, Turborepo, GitHub Actions CI, Husky + Commitlint, ESLint + Prettier

## Licence

MIT - Projet portfolio, libre d'utilisation.

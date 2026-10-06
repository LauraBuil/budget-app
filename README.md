# Gasel

Gasel est une application personnelle de gestion de budget. Firebase Authentication gère les comptes et Neon PostgreSQL stocke les données privées de chaque utilisateur.

## Fonctionnalités

- tableau de bord avec revenus, dépenses, solde, budgets et objectifs ;
- dépenses classées en charges fixes, dépenses fixes, dépenses non essentielles ou dépenses imprévues ;
- dépenses fixes récurrentes sur une fenêtre glissante de six mois ;
- catégories personnalisées créées depuis la barre de recherche ;
- modification du nom directement depuis l’accueil ;
- thème clair/sombre, français/anglais et calculatrice disponible sur tous les écrans ;
- authentification e-mail/mot de passe avec Firebase ;
- données isolées par utilisateur dans Neon PostgreSQL.

## Développement local

```bash
npm install
npm run db:migrate
npm run dev
```

Le client Vite est disponible sur `http://localhost:5173` et l’API locale sur `http://localhost:8787`.

Créez `.env.local` à partir de `.env.example` :

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
DATABASE_URL=
FIREBASE_PROJECT_ID=
CLIENT_ORIGIN=http://localhost:5173
```

`DATABASE_URL` est la chaîne Neon `postgresql://...`. Elle reste côté serveur et ne doit jamais être préfixée par `VITE_`. Ne commitez jamais `.env.local`, une clé privée Firebase ou un fichier `service-account.json`.

## Firebase

1. Activez Authentication > Sign-in method > Email/Password.
2. Dans Project settings > Your apps, créez l’application Web `Gasel Web`.
3. Copiez les six valeurs Firebase dans `.env.local` et dans les variables d’environnement Vercel.
4. Après le déploiement, ajoutez `gasel.app` et `www.gasel.app` dans Authentication > Settings > Authorized domains.

## Neon

Créez un projet PostgreSQL Neon et copiez sa connection string dans `DATABASE_URL`. Installez ou mettez à jour les tables `transactions`, `categories`, `recurring_expenses`, `budgets` et `goals` avec :

```bash
npm run db:migrate
```

Cette commande s’exécute volontairement hors des requêtes de l’application : Vercel ne lance donc pas de création de table ni de mise à jour de données lors d’un démarrage à froid.

## Déploiement Vercel

`api/[...path].mjs` permet à Vercel de servir le frontend Vite et toutes les routes `/api/*` de l’API Express comme fonction serverless.

### 1. Lier le projet Vercel

Depuis le dossier du projet :

```bash
npx vercel login
npx vercel link
```

Sélectionnez l’équipe `Yhumi's projects` puis le projet `Gasel` existant.

### 2. Ajouter les variables de production

Dans Vercel > `Gasel` > Settings > Environment Variables, ajoutez pour **Production** et **Preview** :

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=gasel-10cbc.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gasel-10cbc
VITE_FIREBASE_STORAGE_BUCKET=gasel-10cbc.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
DATABASE_URL=
FIREBASE_PROJECT_ID=gasel-10cbc
CLIENT_ORIGIN=https://gasel.app
```

Ne partagez jamais la valeur de `DATABASE_URL` dans le dépôt ou une capture d’écran.

### 3. Déployer

Avant le premier déploiement et après toute mise à jour du schéma, lancez une fois la migration avec la variable `DATABASE_URL` de production disponible localement :

```bash
npm run db:migrate
```

Pour tester sans publier la version finale :

```bash
npx vercel
```

Après vérification :

```bash
npx vercel --prod
```

Cette méthode déploie le dossier local et ne nécessite pas de pousser une modification sur GitHub.

### 4. Connecter `gasel.app`

Dans Vercel > `Gasel` > Settings > Domains, ajoutez `gasel.app` puis `www.gasel.app` si souhaité. Si le domaine a été acheté via Vercel, la configuration DNS est normalement automatique. Sinon, Vercel affichera les enregistrements DNS à créer chez le registrar.

Vérifiez ensuite la connexion, l’inscription, `https://gasel.app/api/health` et l’ajout du domaine dans Firebase Authorized domains.

## Vérifications

```bash
npm run build
npm run test:security
```

Les données personnelles de l’ancien classeur Excel ne sont pas incluses dans le code source.

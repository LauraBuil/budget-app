# Bloom Budget

Application personnelle de gestion de budget inspirée de la maquette fournie. L’interface fonctionne immédiatement en mode démo. Avec Firebase configuré, les transactions sont enregistrées par utilisateur et accessibles depuis plusieurs appareils.

## Fonctionnalités

- tableau de bord avec revenus, dépenses, solde, budgets et objectifs ;
- ajout et recherche de transactions ;
- pages budgets, objectifs, analyses, calendrier et paramètres ;
- thème clair et sombre ;
- interface française et anglaise ;
- connexion et création de compte par e-mail avec Firebase Authentication ;
- données séparées par utilisateur dans Firestore.

## Lancer le projet

```bash
npm install
npm run dev
```

Sans fichier `.env`, utilisez le bouton « Découvrir la démo ».

## Activer Firebase

1. Créez un projet sur Firebase avec le plan gratuit Spark.
2. Activez Authentication > Email/Password.
3. Créez une base Firestore.
4. Copiez `.env.example` vers `.env.local` et renseignez les valeurs de l’application Web Firebase.
5. Déployez les règles contenues dans `firestore.rules`.

Les clés de configuration Firebase utilisées par le navigateur ne sont pas des secrets. La sécurité repose sur Authentication et les règles Firestore. Ne placez jamais de clé de compte de service dans le projet frontend.

## Données de l’Excel

La structure de l’application reprend les concepts du classeur : revenus, dépenses fixes, dépenses variables, épargne, cartes, budgets mensuels et comparaison prévu/réel. Les montants personnels du classeur ne sont pas intégrés au code source. Un import privé pourra être ajouté après la création du projet Firebase.

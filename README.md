# Gasel

Gasel est une application personnelle de gestion de budget. Firebase Authentication gère les comptes et Neon PostgreSQL stocke les données privées de chaque utilisateur.

## Fonctionnalités

- tableau de bord avec revenus, dépenses, solde, budgets et objectifs ;
- dépenses classées en charges fixes, dépenses fixes, dépenses non essentielles ou dépenses imprévues ;
- dépenses et revenus récurrents sur une fenêtre glissante de six mois ;
- catégories personnalisées créées depuis la barre de recherche ;
- modification du nom directement depuis l’accueil ;
- thème clair/sombre, français/anglais et calculatrice disponible dans les pages connectées ;
- authentification e-mail/mot de passe avec Firebase ;
- données isolées par utilisateur dans Neon PostgreSQL.

## Règles de gestion

- Une opération récurrente possède une seule série et au maximum une occurrence par mois.
- La création prépare six mois, mois de départ inclus. Consulter le dernier mois préparé (ou un mois ultérieur) prolonge la série par lots de six mois.
- Modifier une valeur directement dans une ligne ne modifie que cette occurrence.
- Le crayon ouvre la modification complète : « Cette opération uniquement » ou « Ce mois et les suivants ». Le même choix est proposé avant suppression, dans Dépenses et Calendrier.
- Changer une catégorie sur les mois suivants met aussi à jour le modèle de récurrence, sans créer une autre série. Le nom reste libre : par exemple Netflix, catégorie Abonnement.
- Une occurrence supprimée n'est pas recréée lors de la synchronisation normale. Arrêter la série ne supprime pas son historique.
- Le restant du mois précédent est le solde de clôture précédent, report inclus. Une valeur manuelle, même zéro ou négative, remplace ce calcul ; le bouton de restauration revient au calcul automatique.
- Le solde actuel utilise les opérations datées jusqu'à aujourd'hui. Le prévisionnel inclut toutes les opérations du mois. Les filtres de recherche ne modifient pas les soldes.
- Les opérations de récurrence et les transferts du restant vers une épargne sont atomiques et sérialisés par compte. Un formulaire réessayé conserve son identifiant pour éviter une création en double.

## Vérifications locales

Depuis le dossier `gasel` :

```sh
npm run dev
npm run build
npm run test:security
npm run test:recurrence
```

Le dernier test utilise la connexion Neon configurée localement, mais écrit exclusivement dans des tables temporaires et termine par un rollback. Il vérifie les récurrences, les changements de catégorie, les jours de fin de mois, les suppressions, l'isolation des comptes et les reports de solde. Il ne modifie pas les données financières enregistrées.

Les tests locaux ne remplacent pas une vérification après déploiement. Aucun push ni déploiement ne doit être effectué sans autorisation.

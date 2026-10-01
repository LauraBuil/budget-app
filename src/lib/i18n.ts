import type { Language } from '../types'

const dictionary = {
  fr: {
    home: 'Accueil', transactions: 'Transactions', budgets: 'Budgets', goals: 'Objectifs', analytics: 'Analyses', calendar: 'Calendrier', settings: 'Paramètres',
    hello: 'Bonjour', evening: 'Bonsoir', welcome: 'Votre argent, plus clair chaque jour.', currentBalance: 'Solde actuel', income: 'Revenus', expenses: 'Dépenses', savings: 'Épargne',
    overview: "Vue d’ensemble", spendingByCategory: 'Dépenses par catégorie', monthlyBudgets: 'Budgets du mois', recentTransactions: 'Dernières transactions', seeAll: 'Voir tout',
    addTransaction: 'Ajouter une transaction', expense: 'Dépense', transactionIncome: 'Revenu', amount: 'Montant', category: 'Catégorie', date: 'Date', description: 'Description', cancel: 'Annuler', add: 'Ajouter',
    search: 'Rechercher une transaction…', all: 'Toutes', housing: 'Logement', groceries: 'Alimentation', transport: 'Transport', leisure: 'Loisirs', dining: 'Restaurant', other: 'Autres',
    myGoals: 'Mes objectifs', goalJapan: 'Voyage au Japon', goalComputer: 'Nouvel ordinateur', goalSafety: 'Épargne de précaution',
    budgetVsActual: 'Budget prévu et dépenses réelles', spent: 'dépensés', remaining: 'restants', overBudget: 'Budget dépassé',
    cashFlow: 'Évolution des revenus et dépenses', categoryBreakdown: 'Répartition des dépenses', thisMonth: 'Ce mois-ci', sixMonths: '6 mois',
    calendarTitle: 'Calendrier financier', upcoming: 'À venir', recurring: 'Paiements récurrents',
    profile: 'Mon compte', appearance: 'Apparence', language: 'Langue', light: 'Clair', dark: 'Sombre', signOut: 'Se déconnecter',
    loginTitle: 'Retrouvez vos comptes en toute simplicité.', loginSubtitle: 'Un espace personnel, doux et clair, sans connexion à votre banque.', email: 'Adresse e-mail', password: 'Mot de passe', signIn: 'Se connecter', createAccount: 'Créer un compte', demo: 'Découvrir la démo', noAccount: 'Pas encore de compte ?', alreadyAccount: 'Déjà un compte ?',
    demoNotice: 'Mode démo : configurez Firebase pour activer la synchronisation entre vos appareils.', saved: 'enregistrés', of: 'sur', october2026: 'Octobre 2026', growthMonth: '+12% ce mois-ci', demoMode: 'Mode démo', operations: 'opérations', totalBudget: 'Budget total', goalsSubtitle: 'Avancez à votre rythme, un objectif après l’autre.', optional: 'Optionnel', exampleGroceries: 'Ex. Courses', close: 'Fermer', cannotConnect: 'Connexion impossible. Vérifiez vos informations.', salary: 'Salaire', rent: 'Loyer', electricity: 'Électricité', changeTheme: 'Changer de thème', changeLanguage: 'Changer de langue', period: 'Période',
  },
  en: {
    home: 'Home', transactions: 'Transactions', budgets: 'Budgets', goals: 'Goals', analytics: 'Analytics', calendar: 'Calendar', settings: 'Settings',
    hello: 'Hello', evening: 'Good evening', welcome: 'A clearer view of your money, every day.', currentBalance: 'Current balance', income: 'Income', expenses: 'Expenses', savings: 'Savings',
    overview: 'Overview', spendingByCategory: 'Spending by category', monthlyBudgets: 'Monthly budgets', recentTransactions: 'Recent transactions', seeAll: 'See all',
    addTransaction: 'Add transaction', expense: 'Expense', transactionIncome: 'Income', amount: 'Amount', category: 'Category', date: 'Date', description: 'Description', cancel: 'Cancel', add: 'Add',
    search: 'Search transactions…', all: 'All', housing: 'Housing', groceries: 'Groceries', transport: 'Transport', leisure: 'Leisure', dining: 'Dining', other: 'Other',
    myGoals: 'My goals', goalJapan: 'Trip to Japan', goalComputer: 'New computer', goalSafety: 'Emergency fund',
    budgetVsActual: 'Planned budget and actual spending', spent: 'spent', remaining: 'remaining', overBudget: 'Over budget',
    cashFlow: 'Income and expense trend', categoryBreakdown: 'Expense breakdown', thisMonth: 'This month', sixMonths: '6 months',
    calendarTitle: 'Financial calendar', upcoming: 'Coming up', recurring: 'Recurring payments',
    profile: 'My account', appearance: 'Appearance', language: 'Language', light: 'Light', dark: 'Dark', signOut: 'Sign out',
    loginTitle: 'Your finances, beautifully simple.', loginSubtitle: 'A calm personal space, with no bank connection required.', email: 'Email address', password: 'Password', signIn: 'Sign in', createAccount: 'Create account', demo: 'Explore the demo', noAccount: 'New here?', alreadyAccount: 'Already have an account?',
    demoNotice: 'Demo mode: configure Firebase to sync data across your devices.', saved: 'saved', of: 'of', october2026: 'October 2026', growthMonth: '+12% this month', demoMode: 'Demo mode', operations: 'transactions', totalBudget: 'Total budget', goalsSubtitle: 'Move forward at your own pace, one goal at a time.', optional: 'Optional', exampleGroceries: 'E.g. Groceries', close: 'Close', cannotConnect: 'Unable to sign in. Please check your details.', salary: 'Salary', rent: 'Rent', electricity: 'Electricity', changeTheme: 'Change theme', changeLanguage: 'Change language', period: 'Period',
  },
} as const

export type TranslationKey = keyof typeof dictionary.fr
export const translate = (language: Language, key: TranslationKey) => dictionary[language][key] ?? key

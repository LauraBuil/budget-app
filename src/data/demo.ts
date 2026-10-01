import type { AppData } from '../types'

export const demoData: AppData = {
  transactions: [
    { id: 't1', label: 'Salaire', amount: 3200, type: 'income', category: 'income', date: '2026-10-01' },
    { id: 't2', label: 'Loyer', amount: 905, type: 'expense', category: 'housing', date: '2026-10-02' },
    { id: 't3', label: 'Courses', amount: 82.4, type: 'expense', category: 'groceries', date: '2026-10-03' },
    { id: 't4', label: 'Spotify', amount: 12.99, type: 'expense', category: 'leisure', date: '2026-10-04' },
    { id: 't5', label: 'Restaurant', amount: 42, type: 'expense', category: 'dining', date: '2026-10-05' },
    { id: 't6', label: 'Transport', amount: 36.5, type: 'expense', category: 'transport', date: '2026-10-06' },
  ],
  budgets: [
    { id: 'b1', category: 'housing', limit: 1100, spent: 905, color: '#c87d78' },
    { id: 'b2', category: 'groceries', limit: 300, spent: 182.4, color: '#dca39b' },
    { id: 'b3', category: 'transport', limit: 160, spent: 76.5, color: '#9c9b86' },
    { id: 'b4', category: 'leisure', limit: 240, spent: 94.99, color: '#e8b7ad' },
  ],
  goals: [
    { id: 'g1', name: 'goalJapan', target: 3000, saved: 1200, dueDate: '2027-05-01', icon: 'travel' },
    { id: 'g2', name: 'goalComputer', target: 1500, saved: 650, icon: 'tech' },
    { id: 'g3', name: 'goalSafety', target: 5000, saved: 1200, icon: 'safety' },
  ],
  history: [
    { month: 'May', income: 2700, expense: 1780 },
    { month: 'Jun', income: 2920, expense: 2010 },
    { month: 'Jul', income: 2840, expense: 1920 },
    { month: 'Aug', income: 3100, expense: 2260 },
    { month: 'Sep', income: 2960, expense: 2110 },
    { month: 'Oct', income: 3200, expense: 1079.89 },
  ],
}

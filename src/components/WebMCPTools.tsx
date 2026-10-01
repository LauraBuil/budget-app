import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string
        title: string
        description: string
        inputSchema: object
        annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
        execute: (input: unknown) => unknown | Promise<unknown>
      }, options?: { signal?: AbortSignal }) => void | Promise<void>
    }
  }
}

export function WebMCPTools() {
  const { data, addTransaction, user } = useApp()

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool || !user) return
    const lifecycle = new AbortController()
    const register = (result: void | Promise<void>) => {
      void Promise.resolve(result).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('WebMCP registration failed', error)
      })
    }

    register(context.registerTool({
      name: 'read_budget_summary',
      title: 'Lire le résumé du budget',
      description: 'Retourne les totaux actuels de revenus, dépenses et solde affichés dans Bloom Budget.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        const income = data.transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
        const expenses = data.transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
        return { income, expenses, balance: income - expenses, currency: 'EUR' }
      },
    }, { signal: lifecycle.signal }))

    register(context.registerTool({
      name: 'create_transaction',
      title: 'Ajouter une transaction',
      description: 'Ajoute une dépense ou un revenu au budget de la personne connectée.',
      inputSchema: {
        type: 'object',
        properties: {
          label: { type: 'string', minLength: 1 },
          amount: { type: 'number', exclusiveMinimum: 0 },
          type: { type: 'string', enum: ['income', 'expense'] },
          category: { type: 'string' },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
        required: ['label', 'amount', 'type', 'category', 'date'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const value = input as { label?: unknown; amount?: unknown; type?: unknown; category?: unknown; date?: unknown }
        if (typeof value.label !== 'string' || typeof value.amount !== 'number' || value.amount <= 0 || !['income', 'expense'].includes(String(value.type)) || typeof value.category !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(String(value.date))) {
          throw new Error('Transaction invalide')
        }
        await addTransaction({ label: value.label, amount: value.amount, type: value.type as 'income' | 'expense', category: value.category, date: String(value.date) })
        return { status: 'created', label: value.label, amount: value.amount }
      },
    }, { signal: lifecycle.signal }))

    return () => lifecycle.abort()
  }, [addTransaction, data.transactions, user])

  return null
}

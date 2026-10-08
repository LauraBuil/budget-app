import { isSupportedMonth } from '../months.mjs'
import { TransactionError } from './service.mjs'

export function validateTransaction(body, icons) {
  const { label, amount, type, category, expenseGroup = 'daily', date, note = '', icon = 'other', recurrence = null, scope = 'this', clientRequestId } = body || {}
  const fail = (message) => { throw new TransactionError(message) }
  if (typeof label !== 'string' || !label.trim() || label.length > 200) fail('INVALID_LABEL')
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0 || value > 10000000) fail('INVALID_AMOUNT')
  if (!['income','expense'].includes(type) || typeof category !== 'string' || !/^[a-z0-9-]{1,80}$/.test(category)) fail('INVALID_TRANSACTION')
  if (!['fixed','daily','nonEssential','unexpected'].includes(expenseGroup)) fail('INVALID_EXPENSE_GROUP')
  if (!icons.has(icon)) fail('INVALID_ICON')
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isSupportedMonth(date.slice(0,7)) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) fail('INVALID_DATE')
  if (typeof note !== 'string' || note.length > 1000) fail('INVALID_NOTE')
  if (!['this','future'].includes(scope)) fail('INVALID_SCOPE')
  if (clientRequestId !== undefined && (typeof clientRequestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(clientRequestId))) fail('INVALID_REQUEST_ID')
  if (recurrence !== null && (typeof recurrence !== 'object' || !Number.isInteger(Number(recurrence.day)) || recurrence.day < 1 || recurrence.day > 31)) fail('INVALID_RECURRENCE')
  return { label:label.trim(),amount:Math.round(value*100)/100,type,category,expenseGroup,date,note:note.trim(),icon,
    recurrence:recurrence ? { day:Number(recurrence.day) } : null,scope,clientRequestId }
}

import assert from 'node:assert/strict'
import { claimsFromFirebaseAccount } from './firebase-account.mjs'

const claims = { sub: 'uid-1', email: 'old@example.com', email_verified: true, iat: 200 }

assert.deepEqual(claimsFromFirebaseAccount(claims, null), { error: 'AUTH_ACCOUNT_DISABLED', status: 403 })
assert.deepEqual(claimsFromFirebaseAccount(claims, { localId: 'uid-1', disabled: true }), { error: 'AUTH_ACCOUNT_DISABLED', status: 403 })
assert.deepEqual(claimsFromFirebaseAccount(claims, { localId: 'uid-2', disabled: false }), { error: 'AUTH_INVALID', status: 401 })
assert.deepEqual(claimsFromFirebaseAccount(claims, { localId: 'uid-1', disabled: false, validSince: '201' }), { error: 'AUTH_INVALID', status: 401 })
assert.deepEqual(claimsFromFirebaseAccount(claims, {
  localId: 'uid-1',
  disabled: false,
  validSince: '200',
  email: 'new@example.com',
  emailVerified: false,
}), {
  payload: { ...claims, email: 'new@example.com', email_verified: false },
})

console.log('Firebase account state checks passed')

import assert from 'node:assert/strict'
import { describeAuthClaims, evaluateAuthClaims, parseBlockedEmailDomains } from './auth-policy.mjs'

const blocked = parseBlockedEmailDomains(' @mailinator.com, TEMP.example ,,')
assert.deepEqual([...blocked], ['mailinator.com', 'temp.example'])

assert.deepEqual(evaluateAuthClaims({}, blocked), { allowed: false, code: 'AUTH_INVALID', status: 401 })
assert.deepEqual(evaluateAuthClaims({ sub: 'uid', email: 'owner@example.com', email_verified: false }, blocked), { allowed: false, code: 'AUTH_EMAIL_UNVERIFIED', status: 403 })
assert.deepEqual(evaluateAuthClaims({ sub: 'uid', email: 'owner@example.com', email_verified: 'true' }, blocked), { allowed: false, code: 'AUTH_EMAIL_UNVERIFIED', status: 403 })
assert.deepEqual(evaluateAuthClaims({ sub: 'uid', email: 'person@mailinator.com', email_verified: true }, blocked), { allowed: false, code: 'AUTH_EMAIL_DOMAIN_BLOCKED', status: 403 })
assert.deepEqual(evaluateAuthClaims({ sub: 'uid', email_verified: true }, blocked), { allowed: false, code: 'AUTH_INVALID', status: 401 })
assert.deepEqual(evaluateAuthClaims({ sub: 'uid', email: ' OWNER@example.com ', email_verified: true }, blocked), { allowed: true, uid: 'uid', email: 'owner@example.com' })
assert.deepEqual(evaluateAuthClaims({ sub: 'uid', email: 'owner@example.com', email_verified: true }, new Set()), { allowed: true, uid: 'uid', email: 'owner@example.com' })
assert.deepEqual(describeAuthClaims({ email: ' PERSON@MAILINATOR.COM ', email_verified: true }, blocked), { emailVerified: true, emailAllowed: false })
assert.deepEqual(describeAuthClaims({ email: 'owner@example.com', email_verified: true }, blocked), { emailVerified: true, emailAllowed: true })

console.log('Authentication policy checks passed')

export function parseBlockedEmailDomains(value = '') {
  return new Set(value.split(',').map((domain) => domain.trim().toLowerCase().replace(/^@/, '')).filter(Boolean))
}

function emailDomain(email) {
  return email.split('@').at(-1) || ''
}

export function evaluateAuthClaims(payload, blockedDomains) {
  if (typeof payload?.sub !== 'string' || !payload.sub) return { allowed: false, code: 'AUTH_INVALID', status: 401 }
  if (payload.email_verified !== true) return { allowed: false, code: 'AUTH_EMAIL_UNVERIFIED', status: 403 }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  if (!email || !email.includes('@')) return { allowed: false, code: 'AUTH_INVALID', status: 401 }
  if (blockedDomains.has(emailDomain(email))) return { allowed: false, code: 'AUTH_EMAIL_DOMAIN_BLOCKED', status: 403 }
  return { allowed: true, uid: payload.sub, email }
}

export function describeAuthClaims(payload, blockedDomains) {
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : ''
  return {
    emailVerified: payload?.email_verified === true,
    emailAllowed: Boolean(email && email.includes('@') && !blockedDomains.has(emailDomain(email))),
  }
}

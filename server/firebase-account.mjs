export function claimsFromFirebaseAccount(payload, account) {
  if (!account || account.disabled === true) return { error: 'AUTH_ACCOUNT_DISABLED', status: 403 }
  if (typeof account.localId !== 'string' || account.localId !== payload.sub) return { error: 'AUTH_INVALID', status: 401 }

  const issuedAt = Number(payload.iat)
  const validSince = Number(account.validSince)
  if (Number.isFinite(validSince) && Number.isFinite(issuedAt) && issuedAt < validSince) {
    return { error: 'AUTH_INVALID', status: 401 }
  }

  return {
    payload: {
      ...payload,
      email: typeof account.email === 'string' ? account.email : '',
      email_verified: account.emailVerified === true,
    },
  }
}

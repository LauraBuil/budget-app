import { isTauri } from '@tauri-apps/api/core'

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '')
const configuredApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '')
const configuredWebUrl = trimTrailingSlash(import.meta.env.VITE_PUBLIC_WEB_URL || '')

export const runningInTauri = isTauri()
// Android's WebView does not always expose the Tauri globals early enough for
// layout detection. The user agent remains available before React is mounted.
export const runningOnAndroid = /Android/i.test(navigator.userAgent)
export const apiBaseUrl = configuredApiBaseUrl || (runningInTauri ? 'https://gasel.app' : '')
export const publicWebUrl = configuredWebUrl || (runningInTauri ? 'https://gasel.app' : window.location.origin)

export const apiUrl = (path: string) => `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`

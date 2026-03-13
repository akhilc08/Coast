// lib/dropboxsign.ts
// NEVER import this file in client-side code.
// Dropbox Sign credentials must NOT be prefixed with NEXT_PUBLIC_.
import { SignatureRequestApi } from '@dropbox/sign'

/**
 * Returns a configured Dropbox Sign SignatureRequestApi instance.
 */
export function getSignatureRequestApi(): SignatureRequestApi {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY
  if (!apiKey) throw new Error('Missing required env var: DROPBOX_SIGN_API_KEY')

  const api = new SignatureRequestApi()
  ;(api as unknown as { authentications: Record<string, { username: string }> }).authentications['api_key'].username = apiKey
  return api
}

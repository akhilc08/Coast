// lib/docusign.ts
// NEVER import this file in client-side code.
// DocuSign credentials must NOT be prefixed with NEXT_PUBLIC_.
import { ApiClient, EnvelopesApi } from 'docusign-esign'

const SCOPES = ['signature', 'impersonation']
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry
// Note: these module-level variables are reset on every serverless cold start.
// Token caching only benefits warm instances.
let cachedToken: string | null = null
let tokenExpiresAt: number = 0

/**
 * Returns a valid DocuSign access token, using a cached one if still fresh.
 * DocuSign JWT tokens have a 1-hour TTL; we refresh 5 minutes early.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken
  }

  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY!
  const userId = process.env.DOCUSIGN_USER_ID!
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY!.replace(/\\n/g, '\n')
  const authServer = process.env.DOCUSIGN_AUTH_SERVER!

  const apiClient = new ApiClient()
  apiClient.setOAuthBasePath(authServer)

  const results = await apiClient.requestJWTUserToken(
    integrationKey,
    userId,
    SCOPES,
    Buffer.from(privateKey),
    3600
  )

  cachedToken = results.body.access_token
  tokenExpiresAt = now + results.body.expires_in * 1000
  return cachedToken!
}

/**
 * Returns a configured DocuSign ApiClient with a valid access token set.
 */
export async function getApiClient(): Promise<ApiClient> {
  const token = await getAccessToken()
  const baseUrl = process.env.DOCUSIGN_BASE_URL!

  const apiClient = new ApiClient()
  apiClient.setBasePath(`https://${baseUrl}/restapi`)
  apiClient.addDefaultHeader('Authorization', `Bearer ${token}`)
  return apiClient
}

/**
 * Returns a configured EnvelopesApi instance.
 */
export async function getEnvelopesApi(): Promise<EnvelopesApi> {
  const apiClient = await getApiClient()
  return new EnvelopesApi(apiClient)
}

/** Constant documentId mapping — must match fulfillment.ts and webhook handler */
export const DOCUMENT_IDS = {
  purchase_agreement: '1',
  title_transfer: '2',
} as const

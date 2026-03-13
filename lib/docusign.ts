// lib/docusign.ts
// NEVER import this file in client-side code.
// DocuSign credentials must NOT be prefixed with NEXT_PUBLIC_.
//
// Uses native fetch + Node.js crypto instead of docusign-esign SDK to avoid
// Turbopack AMD module incompatibility.

import { createSign } from 'crypto'

const SCOPES = 'signature impersonation'
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry
// Note: these module-level variables are reset on every serverless cold start.
// Token caching only benefits warm instances.
let cachedToken: string | null = null
let tokenExpiresAt = 0

function buildJWT(integrationKey: string, userId: string, authServer: string, privateKey: string): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const now     = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    iss:   integrationKey,
    sub:   userId,
    aud:   authServer,
    iat:   now,
    exp:   now + 3600,
    scope: SCOPES,
  })).toString('base64url')

  const signingInput = `${header}.${payload}`
  const sign         = createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(privateKey).toString('base64url')

  return `${signingInput}.${signature}`
}

/**
 * Returns a valid DocuSign access token, using a cached one if still fresh.
 * DocuSign JWT tokens have a 1-hour TTL; we refresh 5 minutes early.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken
  }

  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
  const userId         = process.env.DOCUSIGN_USER_ID
  const rawPrivateKey  = process.env.DOCUSIGN_PRIVATE_KEY
  const authServer     = process.env.DOCUSIGN_AUTH_SERVER

  if (!integrationKey) throw new Error('Missing required env var: DOCUSIGN_INTEGRATION_KEY')
  if (!userId)         throw new Error('Missing required env var: DOCUSIGN_USER_ID')
  if (!rawPrivateKey)  throw new Error('Missing required env var: DOCUSIGN_PRIVATE_KEY')
  if (!authServer)     throw new Error('Missing required env var: DOCUSIGN_AUTH_SERVER')

  const privateKey = rawPrivateKey.replace(/\\n/g, '\n')
  const assertion  = buildJWT(integrationKey, userId, authServer, privateKey)

  const response = await fetch(`https://${authServer}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`DocuSign auth failed: ${response.status} ${text}`)
  }

  const data: { access_token: string; expires_in: number } = await response.json()
  cachedToken    = data.access_token
  tokenExpiresAt = now + data.expires_in * 1000
  return cachedToken
}

function getBaseUrl(): string {
  const rawBaseUrl = process.env.DOCUSIGN_BASE_URL
  if (!rawBaseUrl) throw new Error('Missing required env var: DOCUSIGN_BASE_URL')
  return `https://${rawBaseUrl.replace(/^https?:\/\//, '')}/restapi`
}

/**
 * Creates a DocuSign envelope. envelopeDefinition is a plain object matching
 * the DocuSign REST API schema for EnvelopeDefinition.
 */
export async function createEnvelope(
  accountId: string,
  envelopeDefinition: Record<string, unknown>
): Promise<{ envelopeId?: string }> {
  const token   = await getAccessToken()
  const baseUrl = getBaseUrl()

  const response = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/envelopes`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(envelopeDefinition),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`DocuSign createEnvelope failed: ${response.status} ${text}`)
  }

  return response.json()
}

/**
 * Downloads a signed document from a completed DocuSign envelope.
 * Returns the PDF as a Buffer.
 */
export async function getDocument(
  accountId: string,
  envelopeId: string,
  documentId: string
): Promise<Buffer> {
  const token   = await getAccessToken()
  const baseUrl = getBaseUrl()

  const response = await fetch(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/${documentId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) {
    throw new Error(`DocuSign getDocument failed: ${response.status}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

/** Constant documentId mapping — must match fulfillment.ts and webhook handler */
export const DOCUMENT_IDS = {
  purchase_agreement: '1',
  title_transfer:     '2',
} as const

/**
 * Quick smoke test for DocuSign JWT authentication.
 * Run with: node scripts/test-docusign.mjs
 *
 * Tests:
 *   1. JWT token request
 *   2. List envelopes (proves the token + account ID work)
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local')
const envContents = readFileSync(envPath, 'utf8')
for (const line of envContents.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq)
  const val = trimmed.slice(eq + 1)
  process.env[key] = val
}

const docusign = await import('docusign-esign')
const { ApiClient, EnvelopesApi } = docusign.default ?? docusign

const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
const userId         = process.env.DOCUSIGN_USER_ID
const accountId      = process.env.DOCUSIGN_ACCOUNT_ID
const rawPrivateKey  = process.env.DOCUSIGN_PRIVATE_KEY
const authServer     = process.env.DOCUSIGN_AUTH_SERVER
const baseUrl        = process.env.DOCUSIGN_BASE_URL

console.log('DocuSign config:')
console.log('  Integration Key:', integrationKey)
console.log('  User ID:        ', userId)
console.log('  Account ID:     ', accountId)
console.log('  Auth Server:    ', authServer)
console.log('  Base URL:       ', baseUrl)
console.log()

if (!integrationKey || !userId || !accountId || !rawPrivateKey || !authServer || !baseUrl) {
  console.error('Missing required env vars. Aborting.')
  process.exit(1)
}

const privateKey = rawPrivateKey.replace(/\\n/g, '\n')

// Step 1: Get JWT token
console.log('Step 1: Requesting JWT token...')
const apiClient = new ApiClient()
apiClient.setOAuthBasePath(authServer)

let token
try {
  const result = await apiClient.requestJWTUserToken(
    integrationKey,
    userId,
    ['signature', 'impersonation'],
    Buffer.from(privateKey),
    3600
  )
  token = result.body.access_token
  console.log('  ✓ Token obtained. Expires in:', result.body.expires_in, 'seconds')
} catch (err) {
  const errData = err?.response?.data
  const errCode = errData?.error ?? err?.message ?? String(err)
  if (errCode === 'consent_required') {
    const consentUrl =
      `https://${authServer}/oauth/auth?response_type=code` +
      `&scope=signature%20impersonation` +
      `&client_id=${integrationKey}` +
      `&redirect_uri=https://developers.docusign.com/platform/auth/consent`
    console.error('  ✗ Consent required. Visit this URL once to grant consent:')
    console.error()
    console.error(' ', consentUrl)
    console.error()
    console.error('  After granting consent, re-run this script.')
  } else {
    console.error('  ✗ JWT error:', errCode)
    if (errData) console.error('  Response:', JSON.stringify(errData, null, 2))
  }
  process.exit(1)
}

// Step 2: List envelopes to confirm token + account ID work
console.log()
console.log('Step 2: Listing recent envelopes (smoke test)...')
const cleanBase = baseUrl.replace(/^https?:\/\//, '')
apiClient.setBasePath(`https://${cleanBase}/restapi`)
apiClient.addDefaultHeader('Authorization', `Bearer ${token}`)

const envelopesApi = new EnvelopesApi(apiClient)
try {
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const result = await envelopesApi.listStatusChanges(accountId, { fromDate })
  const count = result.envelopes?.length ?? 0
  console.log(`  ✓ API call succeeded. Found ${count} envelope(s) in the last 30 days.`)
} catch (err) {
  const msg = err?.response?.body ?? err?.message ?? String(err)
  console.error('  ✗ API call failed:', JSON.stringify(msg, null, 2))
  process.exit(1)
}

console.log()
console.log('✓ DocuSign integration is working correctly.')

import { SignatureRequestApi } from '@dropbox/sign'

// NEVER import this file in client-side code.
// DROPBOX_SIGN_API_KEY must NOT be prefixed with NEXT_PUBLIC_.
export const signatureApi = new SignatureRequestApi()
signatureApi.username = process.env.DROPBOX_SIGN_API_KEY!

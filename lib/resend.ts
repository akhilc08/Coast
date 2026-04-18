import { Resend } from 'resend'

let _resend: Resend | null = null
export function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

/** Admin email for order alert notifications (NOTF-02) */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL!

/** Default sender address for all transactional emails */
export const FROM_EMAIL = 'Coast <no-reply@drivewithcoast.com>'

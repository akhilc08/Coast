import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)

/** Admin email for order alert notifications (NOTF-02) */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL!

/** Default sender address for all transactional emails */
export const FROM_EMAIL = 'Coast <no-reply@coastautos.com>'

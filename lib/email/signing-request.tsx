import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export interface SigningRequestEmailProps {
  buyerName: string
  vehicleTitle: string
  orderNumber: string
  orderUrl: string
}

/**
 * NOTF-03: Document signing request email sent to buyer after documents are generated.
 * Points to the Coast order detail page (NOT a direct DocuSign URL).
 */
export function SigningRequestEmail({
  buyerName,
  vehicleTitle,
  orderNumber,
  orderUrl,
}: SigningRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your documents for {vehicleTitle} are ready to sign</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={h1Style}>Documents Ready to Sign</Heading>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hi {buyerName},</Text>
            <Text style={textStyle}>
              Your documents are ready to sign for your purchase of{' '}
              <strong style={strongStyle}>{vehicleTitle}</strong>.
            </Text>

            <Section style={orderBoxStyle}>
              <Text style={labelStyle}>Order Number</Text>
              <Text style={valueStyle}>{orderNumber}</Text>

              <Text style={labelStyle}>Vehicle</Text>
              <Text style={valueStyle}>{vehicleTitle}</Text>
            </Section>

            <Text style={textStyle}>
              Please click the button below to review and sign your purchase agreement
              and bill of sale. This takes just a few minutes to complete digitally.
            </Text>

            <Button href={orderUrl} style={buttonStyle}>
              Sign Documents
            </Button>

            <Text style={noteStyle}>
              Once signed, you will receive a copy of your completed documents via email.
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Coast — Wholesale Vehicle Marketplace
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default SigningRequestEmail

// Styles
const bodyStyle: React.CSSProperties = {
  backgroundColor: '#09090b',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const containerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 20px',
}

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  paddingBottom: '24px',
}

const h1Style: React.CSSProperties = {
  color: '#fafafa',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
}

const contentStyle: React.CSSProperties = {
  backgroundColor: '#18181b',
  borderRadius: '12px',
  padding: '32px',
  border: '1px solid #27272a',
}

const greetingStyle: React.CSSProperties = {
  color: '#fafafa',
  fontSize: '16px',
  marginBottom: '8px',
}

const textStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '15px',
  lineHeight: '24px',
}

const strongStyle: React.CSSProperties = {
  color: '#fafafa',
}

const orderBoxStyle: React.CSSProperties = {
  backgroundColor: '#09090b',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  border: '1px solid #27272a',
}

const labelStyle: React.CSSProperties = {
  color: '#71717a',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 2px 0',
}

const valueStyle: React.CSSProperties = {
  color: '#fafafa',
  fontSize: '15px',
  margin: '0 0 12px 0',
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 24px',
  textAlign: 'center',
  textDecoration: 'none',
  marginTop: '24px',
}

const noteStyle: React.CSSProperties = {
  color: '#71717a',
  fontSize: '13px',
  lineHeight: '20px',
  marginTop: '16px',
}

const hrStyle: React.CSSProperties = {
  borderColor: '#27272a',
  margin: '32px 0 16px',
}

const footerStyle: React.CSSProperties = {
  textAlign: 'center',
}

const footerTextStyle: React.CSSProperties = {
  color: '#52525b',
  fontSize: '13px',
}

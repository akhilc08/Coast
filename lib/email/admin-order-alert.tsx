import {
  Body,
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

export interface AdminOrderAlertEmailProps {
  orderNumber: string
  vehicleTitle: string
  priceCents: number
  buyerName: string
  buyerEmail: string
}

/**
 * NOTF-02: Order alert email sent to admin when a sale occurs.
 */
export function AdminOrderAlertEmail({
  orderNumber,
  vehicleTitle,
  priceCents,
  buyerName,
  buyerEmail,
}: AdminOrderAlertEmailProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100)

  return (
    <Html>
      <Head />
      <Preview>New Sale: {vehicleTitle} — {formattedPrice}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={h1Style}>New Order Alert</Heading>
            <Text style={subtitleStyle}>A new sale has been completed</Text>
          </Section>

          <Section style={contentStyle}>
            <Section style={orderBoxStyle}>
              <Text style={labelStyle}>Order Number</Text>
              <Text style={valueStyle}>{orderNumber}</Text>

              <Text style={labelStyle}>Vehicle</Text>
              <Text style={valueStyle}>{vehicleTitle}</Text>

              <Text style={labelStyle}>Sale Price</Text>
              <Text style={valueStyle}>{formattedPrice}</Text>
            </Section>

            <Hr style={hrInlineStyle} />

            <Text style={sectionHeadingStyle}>Buyer Information</Text>

            <Section style={buyerBoxStyle}>
              <Text style={labelStyle}>Name</Text>
              <Text style={valueStyle}>{buyerName}</Text>

              <Text style={labelStyle}>Email</Text>
              <Text style={valueStyle}>{buyerEmail}</Text>
            </Section>

            <Text style={noteStyle}>
              Documents are being generated. The buyer will receive a signing
              request when they are ready.
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Coast Admin — Wholesale Vehicle Marketplace
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default AdminOrderAlertEmail

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
  margin: '0 0 8px 0',
}

const subtitleStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '15px',
  margin: '0',
}

const contentStyle: React.CSSProperties = {
  backgroundColor: '#18181b',
  borderRadius: '12px',
  padding: '32px',
  border: '1px solid #27272a',
}

const orderBoxStyle: React.CSSProperties = {
  backgroundColor: '#09090b',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 20px 0',
  border: '1px solid #27272a',
}

const buyerBoxStyle: React.CSSProperties = {
  backgroundColor: '#09090b',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 0 20px 0',
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

const sectionHeadingStyle: React.CSSProperties = {
  color: '#fafafa',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
}

const noteStyle: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const hrInlineStyle: React.CSSProperties = {
  borderColor: '#27272a',
  margin: '16px 0',
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

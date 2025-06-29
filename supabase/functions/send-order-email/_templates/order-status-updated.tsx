
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Row,
  Column,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface OrderStatusUpdatedEmailProps {
  customerName: string
  orderNumber: string
  oldStatus: string
  newStatus: string
  totalAmount: number
  orderSummaryUrl: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending_payment': return '#eab308'
    case 'payment_confirmed': return '#3b82f6'
    case 'on_delivery': return '#8b5cf6'
    case 'delivered': return '#10b981'
    case 'cancelled': return '#ef4444'
    default: return '#6b7280'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending_payment': return 'Pending Payment'
    case 'payment_confirmed': return 'Payment Confirmed'
    case 'on_delivery': return 'On Delivery'
    case 'delivered': return 'Delivered'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

const getStatusMessage = (status: string) => {
  switch (status) {
    case 'pending_payment': return 'We are waiting for your payment confirmation.'
    case 'payment_confirmed': return 'Your payment has been confirmed and we are preparing your order.'
    case 'on_delivery': return 'Great news! Your order is on its way to you.'
    case 'delivered': return 'Your order has been successfully delivered. Thank you for your business!'
    case 'cancelled': return 'Your order has been cancelled. If you have any questions, please contact our support team.'
    default: return 'Your order status has been updated.'
  }
}

export const OrderStatusUpdatedEmail = ({
  customerName,
  orderNumber,
  oldStatus,
  newStatus,
  totalAmount,
  orderSummaryUrl,
}: OrderStatusUpdatedEmailProps) => (
  <Html>
    <Head />
    <Preview>Order #{orderNumber} status updated to {getStatusText(newStatus)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Order Status Update</Heading>
          <Text style={headerText}>Your order status has changed</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>Hello {customerName},</Text>
          
          <Text style={text}>
            We wanted to let you know that your order status has been updated.
          </Text>

          <Section style={statusBox}>
            <Text style={statusTitle}>Status Update</Text>
            <Hr style={divider} />
            
            <Row>
              <Column>
                <Text style={label}>Order Number:</Text>
              </Column>
              <Column>
                <Text style={value}>#{orderNumber}</Text>
              </Column>
            </Row>

            <Row>
              <Column>
                <Text style={label}>Previous Status:</Text>
              </Column>
              <Column>
                <Text style={{...statusBadge, backgroundColor: getStatusColor(oldStatus)}}>
                  {getStatusText(oldStatus)}
                </Text>
              </Column>
            </Row>

            <Row>
              <Column>
                <Text style={label}>New Status:</Text>
              </Column>
              <Column>
                <Text style={{...statusBadge, backgroundColor: getStatusColor(newStatus)}}>
                  {getStatusText(newStatus)}
                </Text>
              </Column>
            </Row>

            <Row>
              <Column>
                <Text style={label}>Order Total:</Text>
              </Column>
              <Column>
                <Text style={value}>Rs. {totalAmount.toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={messageBox}>
            <Text style={statusMessage}>
              {getStatusMessage(newStatus)}
            </Text>
          </Section>

          <Section style={buttonSection}>
            <Link href={orderSummaryUrl} style={button}>
              View Order Details
            </Link>
          </Section>

          <Text style={text}>
            If you have any questions about your order, please don't hesitate to contact us.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Best regards,<br />
            The Mozamandu Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  backgroundColor: '#dc2626',
  padding: '40px 0',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
}

const headerText = {
  color: '#fecaca',
  fontSize: '16px',
  margin: '8px 0 0 0',
}

const content = {
  padding: '0 48px',
}

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#111827',
  margin: '32px 0 16px 0',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const statusBox = {
  backgroundColor: '#fef2f2',
  border: '2px solid #fecaca',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const statusTitle = {
  color: '#dc2626',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const divider = {
  borderColor: '#fecaca',
  margin: '16px 0',
}

const label = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '500',
  margin: '8px 0',
}

const value = {
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
  margin: '8px 0',
  textAlign: 'right' as const,
}

const statusBadge = {
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  padding: '4px 8px',
  borderRadius: '4px',
  textAlign: 'center' as const,
  display: 'inline-block',
  margin: '8px 0',
}

const messageBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const statusMessage = {
  color: '#166534',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
  textAlign: 'center' as const,
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const footer = {
  padding: '0 48px',
  marginTop: '32px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
}

export default OrderStatusUpdatedEmail

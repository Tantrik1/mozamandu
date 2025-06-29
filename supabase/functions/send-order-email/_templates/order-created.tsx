
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

interface OrderCreatedEmailProps {
  customerName: string
  orderNumber: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  orderSummaryUrl: string
  isCustomerOrder: boolean
}

export const OrderCreatedEmail = ({
  customerName,
  orderNumber,
  totalAmount,
  paidAmount,
  remainingAmount,
  orderSummaryUrl,
  isCustomerOrder,
}: OrderCreatedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your order #{orderNumber} has been placed successfully!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Order Confirmation</Heading>
          <Text style={headerText}>Thank you for your order!</Text>
        </Section>

        <Section style={content}>
          <Text style={greeting}>Hello {customerName},</Text>
          
          <Text style={text}>
            Great news! Your order has been placed successfully and is now being processed.
          </Text>

          <Section style={orderBox}>
            <Text style={orderTitle}>Order Details</Text>
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
                <Text style={label}>Total Amount:</Text>
              </Column>
              <Column>
                <Text style={value}>Rs. {totalAmount.toFixed(2)}</Text>
              </Column>
            </Row>

            <Row>
              <Column>
                <Text style={label}>Paid Amount:</Text>
              </Column>
              <Column>
                <Text style={value}>Rs. {paidAmount.toFixed(2)}</Text>
              </Column>
            </Row>

            {remainingAmount > 0 && (
              <Row>
                <Column>
                  <Text style={label}>Remaining:</Text>
                </Column>
                <Column>
                  <Text style={{...value, color: '#dc2626'}}>Rs. {remainingAmount.toFixed(2)}</Text>
                </Column>
              </Row>
            )}
          </Section>

          <Section style={buttonSection}>
            <Link href={orderSummaryUrl} style={button}>
              View Order Summary
            </Link>
          </Section>

          <Text style={text}>
            We'll keep you updated on your order status. If you have any questions, 
            feel free to contact our support team.
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

const orderBox = {
  backgroundColor: '#fef2f2',
  border: '2px solid #fecaca',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const orderTitle = {
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

export default OrderCreatedEmail

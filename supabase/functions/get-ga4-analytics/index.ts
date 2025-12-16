import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Base64URL encode
  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemContent = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const propertyId = Deno.env.get('GOOGLE_ANALYTICS_PROPERTY_ID');
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');

    if (!propertyId || !serviceAccountKey) {
      throw new Error('Missing GA4 configuration');
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    const accessToken = await getAccessToken(serviceAccount);

    // Get date ranges
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    // Fetch GA4 data
    const reportRequest = {
      dateRanges: [
        { startDate: formatDate(last30Days), endDate: formatDate(today) }
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'newUsers' },
        { name: 'bounceRate' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'engagedSessions' },
      ],
    };

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportRequest),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GA4 API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Parse metrics from response
    const metrics = data.rows?.[0]?.metricValues || [];
    const totalUsers = parseInt(metrics[0]?.value || '0');
    const sessions = parseInt(metrics[1]?.value || '0');
    const newUsers = parseInt(metrics[2]?.value || '0');
    const bounceRate = parseFloat(metrics[3]?.value || '0') * 100;
    const pageViews = parseInt(metrics[4]?.value || '0');
    const avgSessionDuration = parseFloat(metrics[5]?.value || '0');
    const engagedSessions = parseInt(metrics[6]?.value || '0');

    // Calculate additional metrics
    const uniqueVisitors = totalUsers;
    const returningUsers = totalUsers - newUsers;
    const engagementRate = sessions > 0 ? (engagedSessions / sessions) * 100 : 0;

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalVisitors: totalUsers,
        sessions,
        uniqueVisitors,
        newUsers,
        returningUsers,
        bounceRate: Math.round(bounceRate * 10) / 10,
        pageViews,
        avgSessionDuration: Math.round(avgSessionDuration),
        engagementRate: Math.round(engagementRate * 10) / 10,
        // Simulated conversion rates (these would need e-commerce tracking setup in GA4)
        addToCartRate: 0,
        checkoutInitiationRate: 0,
        cartAbandonmentRate: 0,
        checkoutAbandonmentRate: 0,
      },
      period: '30days',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('GA4 Analytics Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      data: null,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SearchConsoleRequest {
  days: number;
}

interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Create JWT for Google API authentication
async function createJWT(email: string, privateKey: string): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Parse the private key - handle escaped newlines from JSON
  const normalizedKey = privateKey.replace(/\\n/g, '\n');
  const pemContents = normalizedKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

// Get access token from Google
async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = await createJWT(email, privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch data from Search Console API
async function fetchSearchConsoleData(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[]
): Promise<SearchConsoleRow[]> {
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit: 25,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search Console API error: ${error}`);
  }

  const data = await response.json();
  return data.rows || [];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { days = 28 }: SearchConsoleRequest = await req.json();

    // Hardcoded external Supabase URL for consistent connection
    const EXTERNAL_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';
    
    // Initialize Supabase client with service role
    const supabase = createClient(
      EXTERNAL_SUPABASE_URL,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch analytics settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('analytics_settings')
      .select('setting_key, setting_value');

    if (settingsError) {
      throw new Error(`Failed to fetch settings: ${settingsError.message}`);
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((item: { setting_key: string; setting_value: string }) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    const email = settingsMap.google_service_account_email;
    const privateKey = settingsMap.google_private_key;
    const siteUrl = settingsMap.google_search_console_site_url;

    if (!email || !privateKey || !siteUrl) {
      return new Response(
        JSON.stringify({ error: 'Analytics settings not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    // Get access token
    const accessToken = await getAccessToken(email, privateKey);

    // Fetch all data in parallel
    const [timeSeriesData, queriesData, pagesData, countriesData, devicesData] = await Promise.all([
      fetchSearchConsoleData(accessToken, siteUrl, startDateStr, endDateStr, ['date']),
      fetchSearchConsoleData(accessToken, siteUrl, startDateStr, endDateStr, ['query']),
      fetchSearchConsoleData(accessToken, siteUrl, startDateStr, endDateStr, ['page']),
      fetchSearchConsoleData(accessToken, siteUrl, startDateStr, endDateStr, ['country']),
      fetchSearchConsoleData(accessToken, siteUrl, startDateStr, endDateStr, ['device']),
    ]);

    // Calculate summary
    const summary = {
      clicks: timeSeriesData.reduce((sum, row) => sum + row.clicks, 0),
      impressions: timeSeriesData.reduce((sum, row) => sum + row.impressions, 0),
      ctr: timeSeriesData.length > 0 
        ? timeSeriesData.reduce((sum, row) => sum + row.ctr, 0) / timeSeriesData.length 
        : 0,
      position: timeSeriesData.length > 0 
        ? timeSeriesData.reduce((sum, row) => sum + row.position, 0) / timeSeriesData.length 
        : 0,
    };

    // Format time series data
    const timeSeries = timeSeriesData.map(row => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
    })).sort((a, b) => a.date.localeCompare(b.date));

    const responseData = {
      summary,
      timeSeries,
      queries: queriesData,
      pages: pagesData,
      countries: countriesData,
      devices: devicesData,
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-search-console-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);

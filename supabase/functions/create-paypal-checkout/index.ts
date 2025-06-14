import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Get PayPal access token
async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "Failed to obtain PayPal access token.");
  return data.access_token;
}

// Helper: Create PayPal Subscription
async function createPayPalSubscription(accessToken: string, planId: string, returnUrl: string, cancelUrl: string) {
  const response = await fetch("https://api-m.sandbox.paypal.com/v1/billing/subscriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      application_context: {
        brand_name: "Interactive Coding Platform",
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create PayPal subscription.");
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { plan_id } = body;
    if (!plan_id) throw new Error("Missing plan_id.");

    const clientId = Deno.env.get("PayPal_Client_ID");
    const clientSecret = Deno.env.get("PayPal_Client_Secret");
    if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured.");

    // Dev/prod: Always use sandbox when not live
    const origin = req.headers.get("origin") || "http://localhost:3000";

    const accessToken = await getPayPalAccessToken(clientId, clientSecret);
    const subscription = await createPayPalSubscription(
      accessToken,
      plan_id,
      `${origin}/subscription-success?provider=paypal`,
      `${origin}/?paypal_cancelled=1`
    );

    // Find approve link
    const approveUrl = (subscription.links || []).find((l: any) => l.rel === "approve")?.href;
    if (!approveUrl) throw new Error("No approval link returned by PayPal.");

    return new Response(JSON.stringify({ url: approveUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

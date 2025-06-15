//Updated for PAYPAL LIVE environment 2025-06-15

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Get PayPal access token with detailed logging
async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const fetchUrl = "https://api-m.paypal.com/v1/oauth2/token"; // LIVE endpoint
  try {
    console.log("[PayPal] Requesting access token...");
    const response = await fetch(fetchUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`[PayPal] Failed to get access token. Status: ${response.status}`);
      console.error(`[PayPal] Response:`, data);
      throw { message: data.error_description || "Failed to obtain PayPal access token.", data };
    }
    console.log("[PayPal] Obtained access token");
    return data.access_token;
  } catch (err: any) {
    console.error("[PayPal] Exception getting access token:", err);
    if (err?.data) throw err;
    throw { message: err?.message || "Unknown error obtaining PayPal access token.", data: err };
  }
}

// Helper: Create PayPal Subscription with detailed logging
async function createPayPalSubscription(accessToken: string, planId: string, returnUrl: string, cancelUrl: string) {
  const fetchUrl = "https://api-m.paypal.com/v1/billing/subscriptions"; // LIVE endpoint
  try {
    console.log("[PayPal] Creating subscription...", { planId, returnUrl, cancelUrl });
    const response = await fetch(fetchUrl, {
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
    if (!response.ok) {
      console.error(`[PayPal] Failed to create subscription. Status: ${response.status}`);
      console.error(`[PayPal] Response:`, data);
      throw { message: data.message || "Failed to create PayPal subscription.", data };
    }
    console.log("[PayPal] Subscription created:", data);
    return data;
  } catch (err: any) {
    console.error("[PayPal] Exception during subscription creation:", err);
    if (err?.data) throw err;
    throw { message: err?.message || "Unknown error creating subscription.", data: err };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { plan_id } = body;
    if (!plan_id) {
      console.error("[EdgeFn] Missing plan_id in request body");
      throw { message: "Missing plan_id.", data: body };
    }

    const clientId = Deno.env.get("PayPal_Client_ID");
    const clientSecret = Deno.env.get("PayPal_Client_Secret");
    if (!clientId || !clientSecret) {
      console.error("[EdgeFn] PayPal credentials not configured.");
      throw { message: "PayPal credentials not configured." };
    }

    // Dev/prod: Always use sandbox when not live
    const origin = req.headers.get("origin") || "http://localhost:3000";

    let accessToken;
    try {
      accessToken = await getPayPalAccessToken(clientId, clientSecret);
    } catch (accessTokenError: any) {
      return new Response(
        JSON.stringify({ error: "[getPayPalAccessToken] " + accessTokenError.message, details: accessTokenError.data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let subscription;
    try {
      subscription = await createPayPalSubscription(
        accessToken,
        plan_id,
        `${origin}/subscription-success?provider=paypal`,
        `${origin}/?paypal_cancelled=1`
      );
    } catch (subError: any) {
      return new Response(
        JSON.stringify({ error: "[createPayPalSubscription] " + subError.message, details: subError.data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Find approve link
    const approveUrl = (subscription.links || []).find((l: any) => l.rel === "approve")?.href;
    if (!approveUrl) {
      console.error("[EdgeFn] No approval link returned by PayPal. Subscription data:", subscription);
      // Send back PayPal subscription response for debug
      return new Response(
        JSON.stringify({ error: "No approval link returned by PayPal.", details: subscription }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("[EdgeFn] Successfully created PayPal approval URL.");
    return new Response(JSON.stringify({ url: approveUrl, subscription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    // Top-level catch all
    console.error("[EdgeFn] Top-level error handler triggered:", error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error), details: error?.data || error }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

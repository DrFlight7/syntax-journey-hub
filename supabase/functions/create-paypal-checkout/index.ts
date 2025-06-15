
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Get PayPal access token
async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const fetchUrl = "https://api-m.paypal.com/v1/oauth2/token"; // LIVE endpoint
  
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
    throw new Error(data.error_description || "Failed to obtain PayPal access token.");
  }
  
  console.log("[PayPal] Successfully obtained access token");
  return data.access_token;
}

// Helper: Create PayPal Subscription
async function createPayPalSubscription(accessToken: string, planId: string, returnUrl: string, cancelUrl: string) {
  const fetchUrl = "https://api-m.paypal.com/v1/billing/subscriptions"; // LIVE endpoint
  
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
    throw new Error(data.message || "Failed to create PayPal subscription.");
  }
  
  console.log("[PayPal] Subscription created successfully");
  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[PayPal] Processing checkout request...");
    
    // Parse request body
    const body = await req.json();
    const { plan_id } = body;
    
    if (!plan_id) {
      console.error("[PayPal] Missing plan_id in request body");
      return new Response(
        JSON.stringify({ error: "Missing plan_id parameter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get PayPal credentials from environment
    const clientId = Deno.env.get("PayPal_Client_ID");
    const clientSecret = Deno.env.get("PayPal_Client_Secret");
    
    if (!clientId || !clientSecret) {
      console.error("[PayPal] PayPal credentials not configured");
      return new Response(
        JSON.stringify({ error: "PayPal credentials not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Determine return URLs based on request origin
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const returnUrl = `${origin}/subscription-success?provider=paypal`;
    const cancelUrl = `${origin}/?paypal_cancelled=1`;

    console.log("[PayPal] Using return URLs:", { returnUrl, cancelUrl });

    // Get PayPal access token
    let accessToken;
    try {
      accessToken = await getPayPalAccessToken(clientId, clientSecret);
    } catch (error) {
      console.error("[PayPal] Error getting access token:", error);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with PayPal" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Create PayPal subscription
    let subscription;
    try {
      subscription = await createPayPalSubscription(accessToken, plan_id, returnUrl, cancelUrl);
    } catch (error) {
      console.error("[PayPal] Error creating subscription:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create PayPal subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Extract approval URL from subscription response
    const approveUrl = subscription.links?.find((link: any) => link.rel === "approve")?.href;
    
    if (!approveUrl) {
      console.error("[PayPal] No approval link found in subscription response");
      return new Response(
        JSON.stringify({ error: "No approval link returned by PayPal" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("[PayPal] Successfully created PayPal subscription with approval URL");
    
    // Return success response with approval URL
    return new Response(
      JSON.stringify({ 
        url: approveUrl, 
        subscription_id: subscription.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("[PayPal] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

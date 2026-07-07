// functions/api/create-checkout.js
// Cloudflare Pages Function — creates a Stripe Checkout session.
// app.seasononehealthcare.com is hosted on Cloudflare Pages (confirmed via
// the dashboard), not Vercel — this replaces an earlier Vercel-style
// api/create-checkout.js that would never have run here.

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { priceId, userId, email, plan, billingCycle } = await request.json();

    if (!priceId || !userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const appUrl = 'https://app.seasononehealthcare.com';

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'payment_method_types[0]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: `${appUrl}/recruiters/search?checkout=success`,
        cancel_url: `${appUrl}/recruiters/upgrade?checkout=cancelled`,
        customer_email: email,
        client_reference_id: userId,
        'subscription_data[metadata][userId]': userId,
        'subscription_data[metadata][plan]': plan,
        'subscription_data[metadata][billingCycle]': billingCycle,
        'metadata[userId]': userId,
        'metadata[plan]': plan,
        'metadata[billingCycle]': billingCycle,
      }).toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

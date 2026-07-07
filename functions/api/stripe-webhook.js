// functions/api/stripe-webhook.js
// Cloudflare Pages Function — Stripe webhook handler. Cloudflare Workers
// guarantee the Web Crypto API globally, so crypto.subtle is safe to use
// here (unlike the Vercel Node runtime this was briefly ported to).

const PLAN_CREDITS = { starter: 1000, professional: 3500, agency: 15000, enterprise: 20000 };

export async function onRequestPost(context) {
  const { request, env } = context;
  const SUPABASE_URL     = env.SUPABASE_URL;
  const SUPABASE_SERVICE = env.SUPABASE_SERVICE_KEY;
  const WEBHOOK_SECRET   = env.STRIPE_WEBHOOK_SECRET;

  const body = await request.text();
  const sig  = request.headers.get('stripe-signature');

  let event;
  try { event = await verifyStripeWebhook(body, sig, WEBHOOK_SECRET); }
  catch (err) { return new Response(`Webhook error: ${err.message}`, { status: 400 }); }

  const sb = (path, method = 'GET', data) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE,
      'Authorization': `Bearer ${SUPABASE_SERVICE}`,
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : 'return=minimal',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId  = session.client_reference_id || session.metadata?.userId;
        const plan    = session.metadata?.plan || 'starter';
        if (!userId) break;

        // Upsert subscription
        await sb('subscriptions', 'POST', {
          user_id:            userId,
          stripe_customer_id: session.customer,
          stripe_sub_id:      session.subscription,
          plan,
          status:             'active',
          current_period_end: null,
        });

        // Grant first month credits
        const credits = PLAN_CREDITS[plan] || 1000;
        await sb('credit_ledger', 'POST', {
          user_id: userId, amount: credits, action: 'plan_grant',
        });
        break;
      }

      case 'invoice.paid': {
        // Fires on every successful renewal — add credits on top
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_create') break; // already handled above

        // Get subscription to find userId and plan
        const subRes  = await sb(`subscriptions?stripe_customer_id=eq.${invoice.customer}&select=user_id,plan`);
        const subData = await subRes.json();
        if (!subData?.length) break;

        const { user_id, plan } = subData[0];
        const credits = PLAN_CREDITS[plan] || 1000;

        await sb('credit_ledger', 'POST', {
          user_id, amount: credits, action: 'monthly_renewal',
          stripe_event: event.id,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;
        await sb(`subscriptions?stripe_sub_id=eq.${sub.id}`, 'PATCH', {
          status:             sub.status,
          plan:               sub.metadata?.plan,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await sb(`subscriptions?stripe_sub_id=eq.${sub.id}`, 'PATCH', { status: 'canceled' });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await sb(`subscriptions?stripe_customer_id=eq.${invoice.customer}`, 'PATCH', { status: 'past_due' });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function verifyStripeWebhook(payload, signature, secret) {
  if (!signature || !secret) throw new Error('Missing signature or secret');
  const parts     = signature.split(',').reduce((a, p) => { const [k,v] = p.split('='); a[k]=v; return a; }, {});
  const timestamp = parts.t;
  const sigHash   = parts.v1;
  if (!timestamp || !sigHash) throw new Error('Invalid signature format');
  if (Math.abs(Date.now()/1000 - parseInt(timestamp)) > 300) throw new Error('Timestamp outside tolerance');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${payload}`));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
  if (hex !== sigHash) throw new Error('Signature mismatch');
  return JSON.parse(payload);
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

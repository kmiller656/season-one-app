import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/recruiters.css';
import styles from './Paywall.module.css';

const PRICES = {
  starter:      { monthly: 'price_1TmM9nElyORhYDyX7a6DZ8Zt', annual: 'price_1TmM9nElyORhYDyXi2VZgeMn' },
  professional: { monthly: 'price_1TmMADElyORhYDyXcjJExaFY', annual: 'price_1TmMAgElyORhYDyXUPMIISly' },
  agency:       { monthly: 'price_1TmMBJElyORhYDyXpO1DFlO0', annual: 'price_1TmMBJElyORhYDyXWWGJXsQm' },
};

const PLANS = [
  {
    key: 'starter', name: 'Starter',
    monthlyPrice: '$79', annualPrice: '$790', annualNote: 'or $790/year',
    features: [
      'Full PA database access — 60,000+ contacts',
      '1,000 reveals per month',
      '1,000 exports per month',
      '1 user seat',
      'Search and filter by name, state, type',
      'Verification status per contact',
      'CSV export',
      'Credits accumulate and never expire',
    ],
    featured: false, cta: 'Choose Starter',
  },
  {
    key: 'professional', name: 'Professional',
    monthlyPrice: '$199', annualPrice: '$1,990', annualNote: 'or $1,990/year',
    features: [
      'Full PA database access — 60,000+ contacts',
      '3,500 reveals per month',
      '3,500 exports per month',
      '3 user seats',
      'All search and filter options',
      'Real-time re-verification',
      'CSV + CRM export',
      'Credits accumulate and never expire',
      'Weekly database refresh',
    ],
    featured: true, cta: 'Choose Professional',
  },
  {
    key: 'agency', name: 'Agency',
    monthlyPrice: '$499', annualPrice: '$4,990', annualNote: 'or $4,990/year',
    features: [
      'Full PA database access — 60,000+ contacts',
      '15,000 reveals per month',
      'Unlimited exports',
      'Unlimited user seats',
      'All filters + custom segmentation',
      'Priority real-time verification',
      'CSV + API + CRM export',
      'Credits accumulate and never expire',
      'Weekly refresh + priority support',
    ],
    featured: false, cta: 'Choose Agency',
  },
];

export default function Paywall() {
  const { user, signOut } = useAuth();
  const navigate          = useNavigate();
  const [billing,  setBilling]  = useState('monthly');
  const [loading,  setLoading]  = useState(null);
  const [error,    setError]    = useState('');

  const handleCheckout = async (planKey) => {
    if (!user) { navigate('/login'); return; }
    setError(''); setLoading(planKey);
    try {
      const priceId = PRICES[planKey][billing];
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, email: user.email, plan: planKey, billingCycle: billing }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please contact support@seasononehealthcare.com');
      setLoading(null);
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  return (
    <div className={`rsr-app ${styles.page}`}>
      <div className={styles.nav}>
        <div className={styles.navLogo}>Season<span> One</span></div>
        <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
      </div>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Choose Your Plan</div>
        <h1 className={styles.heading}>Get access to<br />the full database</h1>
        <p className={styles.sub}>Over 60,000 verified Physician Assistant contacts. Search, reveal, and export — starting at $79/month.</p>

        <div className={styles.billingToggle}>
          <button className={`${styles.toggleBtn} ${billing==='monthly'?styles.toggleActive:''}`} onClick={()=>setBilling('monthly')}>Monthly</button>
          <button className={`${styles.toggleBtn} ${billing==='annual'?styles.toggleActive:''}`} onClick={()=>setBilling('annual')}>Annual <span className={styles.saveBadge}>Save 2 months</span></button>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.grid}>
          {PLANS.map(plan => (
            <div key={plan.key} className={`${styles.card} ${plan.featured?styles.featured:''}`}>
              {plan.featured && <div className={styles.badge}>Most Popular</div>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.price}>
                {billing==='monthly'?plan.monthlyPrice:plan.annualPrice}
                <span className={styles.period}>{billing==='monthly'?'/month':'/year'}</span>
              </div>
              <div className={styles.annual}>{billing==='monthly'?plan.annualNote:'Billed annually'}</div>
              <div className={styles.divider} />
              <ul className={styles.features}>
                {plan.features.map(f=><li key={f}><span className={styles.check}>+</span>{f}</li>)}
              </ul>
              <button
                className={`btn btn-full ${plan.featured?styles.ctaFeatured:'btn-primary'}`}
                style={{marginTop:28}}
                onClick={()=>handleCheckout(plan.key)}
                disabled={loading!==null}
              >
                {loading===plan.key?'Redirecting...':plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className={styles.legalNote}>
          Secure payment via Stripe. Cancel anytime. By subscribing you agree to our{' '}
          <a href="https://seasononehealthcare.com/terms.html" target="_blank" rel="noreferrer">Terms of Service</a>.
          Service not available in CA, VT, OR, or TX.
        </p>
      </div>
    </div>
  );
}

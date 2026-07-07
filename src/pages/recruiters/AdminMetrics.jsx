import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import '../../styles/recruiters.css';
import styles from './AdminDashboard.module.css';

// Admin status is already enforced by <AdminRoute> in App.jsx.
export default function AdminMetrics() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [metrics,   setMetrics]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [recentSignups, setRecentSignups] = useState([]);
  const [recentRemovals, setRecentRemovals] = useState([]);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);

      // Total recruiter accounts (recruiters + admins — see
      // admin_subscriber_summary in migration 0002, which excludes
      // Season One's PA job-seeker accounts).
      const { count: totalAccounts } = await supabase.from('admin_subscriber_summary').select('*', { count: 'exact', head: true });

      // Active subscribers
      const { count: activeSubscribers } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');

      // Plan breakdown
      const { data: planData } = await supabase.from('subscriptions').select('plan').eq('status', 'active');
      const planCounts = { starter: 0, professional: 0, agency: 0, enterprise: 0 };
      planData?.forEach(s => { if (planCounts[s.plan] !== undefined) planCounts[s.plan]++; });

      // MRR estimate
      const planPrices = { starter: 79, professional: 199, agency: 499, enterprise: 999 };
      const mrr = Object.entries(planCounts).reduce((sum, [plan, count]) => sum + (planPrices[plan] || 0) * count, 0);

      // Total exports
      const { count: totalExports } = await supabase.from('export_log').select('*', { count: 'exact', head: true });

      // Waitlist count
      const { count: waitlistCount } = await supabase.from('waitlist').select('*', { count: 'exact', head: true });

      // Pending removals
      const { count: pendingRemovals } = await supabase.from('removal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      // PA contacts total
      const { count: totalContacts } = await supabase.from('pa_contacts').select('*', { count: 'exact', head: true });
      const { count: verifiedContacts } = await supabase.from('pa_contacts').select('*', { count: 'exact', head: true }).eq('verified', true);

      setMetrics({ totalAccounts, activeSubscribers, planCounts, mrr, totalExports, waitlistCount, pendingRemovals, totalContacts, verifiedContacts });

      // Recent signups
      const { data: signups } = await supabase.from('admin_subscriber_summary').select('email, joined_at').order('joined_at', { ascending: false }).limit(8);
      setRecentSignups(signups || []);

      // Pending removals list
      const { data: removals } = await supabase.from('removal_requests').select('full_name, email, submitted_at, status').eq('status', 'pending').order('submitted_at', { ascending: false }).limit(5);
      setRecentRemovals(removals || []);

      setLoading(false);
    }
    fetchMetrics();
  }, []);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  return (
    <div className={`rsr-app ${styles.layout}`}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Season<span> One</span></div>
        <div className={styles.adminBadge}>Admin</div>
        <nav className={styles.nav}>
          <div className={`${styles.navItem} ${styles.navActive}`}>Dashboard</div>
          <div className={styles.navItem} onClick={() => navigate('/admin/recruiters')}>Subscribers</div>
          <div className={styles.navItem} onClick={() => navigate('/recruiters/search')}>PA Search</div>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userEmail}>{user?.email}</div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSub}>Recruiter overview — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>Loading metrics...</div>
        ) : (
          <>
            {/* Key metrics */}
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.metricValue}>${(metrics.mrr || 0).toLocaleString()}</div>
                <div className={styles.metricLabel}>Est. MRR</div>
                <div className={styles.metricSub}>based on active plan prices</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>{metrics.activeSubscribers || 0}</div>
                <div className={styles.metricLabel}>Active Subscribers</div>
                <div className={styles.metricSub}>paying customers</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>{metrics.totalAccounts || 0}</div>
                <div className={styles.metricLabel}>Total Accounts</div>
                <div className={styles.metricSub}>including accounts without an active plan</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>{metrics.waitlistCount || 0}</div>
                <div className={styles.metricLabel}>Waitlist Signups</div>
                <div className={styles.metricSub}>full database purchase</div>
              </div>
            </div>

            {/* Plan breakdown + Database stats */}
            <div className={styles.twoCol}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Subscribers by Plan</div>
                {Object.entries(metrics.planCounts).map(([plan, count]) => (
                  <div key={plan} className={styles.planRow}>
                    <div className={styles.planName}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
                    <div className={styles.planBar}>
                      <div className={styles.planBarFill} style={{ width: `${metrics.activeSubscribers ? (count / metrics.activeSubscribers) * 100 : 0}%` }} />
                    </div>
                    <div className={styles.planCount}>{count}</div>
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <div className={styles.cardTitle}>Database Status</div>
                <div className={styles.dbRow}>
                  <span className={styles.dbLabel}>Total PA contacts</span>
                  <span className={styles.dbValue}>{(metrics.totalContacts || 0).toLocaleString()}</span>
                </div>
                <div className={styles.dbRow}>
                  <span className={styles.dbLabel}>Verified contacts</span>
                  <span className={styles.dbValue}>{(metrics.verifiedContacts || 0).toLocaleString()}</span>
                </div>
                <div className={styles.dbRow}>
                  <span className={styles.dbLabel}>Verification rate</span>
                  <span className={styles.dbValue}>
                    {metrics.totalContacts ? Math.round((metrics.verifiedContacts / metrics.totalContacts) * 100) : 0}%
                  </span>
                </div>
                <div className={styles.dbRow}>
                  <span className={styles.dbLabel}>Total exports</span>
                  <span className={styles.dbValue}>{(metrics.totalExports || 0).toLocaleString()}</span>
                </div>
                <div className={styles.dbRow}>
                  <span className={styles.dbLabel}>Pending removals</span>
                  <span className={styles.dbValue} style={{ color: metrics.pendingRemovals > 0 ? '#f59e0b' : 'inherit' }}>
                    {metrics.pendingRemovals || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent signups + pending removals */}
            <div className={styles.twoCol}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Recent Signups</div>
                {recentSignups.length === 0 ? (
                  <div className={styles.emptyMsg}>No signups yet.</div>
                ) : recentSignups.map((s, i) => (
                  <div key={i} className={styles.signupRow}>
                    <div className={styles.signupEmail}>{s.email}</div>
                    <div className={styles.signupDate}>{s.joined_at ? new Date(s.joined_at).toLocaleDateString() : '—'}</div>
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <div className={styles.cardTitle}>
                  Pending Removal Requests
                  {metrics.pendingRemovals > 0 && <span className={styles.alertBadge}>{metrics.pendingRemovals}</span>}
                </div>
                {recentRemovals.length === 0 ? (
                  <div className={styles.emptyMsg}>No pending removals.</div>
                ) : recentRemovals.map((r, i) => (
                  <div key={i} className={styles.removalRow}>
                    <div>
                      <div className={styles.removalName}>{r.full_name}</div>
                      <div className={styles.removalEmail}>{r.email}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/recruiters')}>Process</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

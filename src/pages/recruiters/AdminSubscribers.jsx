import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import '../../styles/recruiters.css';
import styles from './Admin.module.css';

const PLANS = ['starter', 'professional', 'agency', 'enterprise'];

// Admin status is already enforced by <AdminRoute> in App.jsx, so this
// page doesn't re-check it the way the original standalone recruiter
// app did.
export default function AdminSubscribers() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [subscribers,  setSubscribers]  = useState([]);
  const [removals,     setRemovals]     = useState([]);
  const [activeTab,    setActiveTab]    = useState('subscribers');
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [updating,     setUpdating]     = useState(null);
  const [stats,        setStats]        = useState({ total: 0, active: 0, noPlan: 0 });

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_subscriber_summary')
      .select('*')
      .order('joined_at', { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }
    setSubscribers(data || []);
    const total  = data.length;
    const active = data.filter(s => s.status === 'active').length;
    const noPlan = data.filter(s => !s.plan).length;
    setStats({ total, active, noPlan });

    // Also fetch removal requests
    const { data: rData } = await supabase
      .from('removal_requests')
      .select('*')
      .order('submitted_at', { ascending: false });
    setRemovals(rData || []);

    setLoading(false);
  }, []);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  // Update a user's plan
  const handlePlanChange = async (userId, newPlan) => {
    setUpdating(userId);
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: newPlan,
        status: 'active',
      }, { onConflict: 'user_id' });

    if (error) {
      alert('Error updating plan: ' + error.message);
    } else {
      await fetchSubscribers();
    }
    setUpdating(null);
  };

  const filtered = subscribers.filter(s =>
    !search || s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  return (
    <div className={`rsr-app ${styles.layout}`}>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Season<span> One</span></div>
        <div className={styles.adminBadge}>Admin</div>
        <nav className={styles.nav}>
          <div className={styles.navItem} onClick={() => navigate('/recruiters/search')}>PA Search</div>
          <div className={`${styles.navItem} ${activeTab === 'subscribers' ? styles.navActive : ''}`} onClick={() => setActiveTab('subscribers')}>Subscribers</div>
          <div className={`${styles.navItem} ${activeTab === 'removals' ? styles.navActive : ''}`} onClick={() => setActiveTab('removals')}>
            Removal Requests {removals.filter(r => r.status === 'pending').length > 0 && `(${removals.filter(r => r.status === 'pending').length})`}
          </div>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userEmail}>{user?.email}</div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>{activeTab === 'subscribers' ? 'Subscriber Management' : 'Removal Requests'}</h1>
            <p className={styles.pageSub}>{activeTab === 'subscribers' ? 'View and manage all recruiter accounts' : 'PA data removal requests submitted via the opt-out form'}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchSubscribers}>Refresh</button>
        </div>

        {activeTab === 'removals' ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Credential</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Mark Processed</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className={styles.emptyCell}>Loading...</td></tr>
                ) : removals.length === 0 ? (
                  <tr><td colSpan={6} className={styles.emptyCell}>No removal requests yet.</td></tr>
                ) : removals.map(r => (
                  <tr key={r.id}>
                    <td className={styles.emailCell}>{r.full_name}</td>
                    <td className={styles.emailCell}>{r.email}</td>
                    <td><span className="badge badge-gray">{r.credential || '—'}</span></td>
                    <td className={styles.dateCell}>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`badge ${r.status === 'processed' ? 'badge-green' : 'badge-yellow'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={async () => {
                            await supabase.from('removal_requests').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', r.id);
                            fetchSubscribers();
                          }}
                        >
                          Mark Processed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (<>


        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.total}</div>
            <div className={styles.statLabel}>Total accounts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.active}</div>
            <div className={styles.statLabel}>Active paid</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.noPlan}</div>
            <div className={styles.statLabel}>No active plan</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              ${((stats.active) * 199).toLocaleString()}
            </div>
            <div className={styles.statLabel}>Est. MRR</div>
          </div>
        </div>

        {/* Search */}
        <input
          className="form-input"
          style={{ maxWidth: 320 }}
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Credits</th>
                <th>Exports</th>
                <th>Override Plan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={styles.emptyCell}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyCell}>No subscribers found.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className={s.is_admin ? styles.adminRow : ''}>
                  <td className={styles.emailCell}>
                    {s.email}
                    {s.is_admin && <span className={styles.adminTag}>admin</span>}
                  </td>
                  <td className={styles.dateCell}>
                    {s.joined_at ? new Date(s.joined_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <span className={`badge ${
                      s.plan === 'agency'       ? 'badge-blue' :
                      s.plan === 'professional' ? 'badge-green' :
                      s.plan === 'starter'      ? 'badge-blue' :
                      'badge-gray'
                    }`}>
                      {s.plan || 'none'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      s.status === 'active'    ? 'badge-green' :
                      s.status === 'past_due'  ? 'badge-yellow' :
                      'badge-gray'
                    }`}>
                      {s.status || 'none'}
                    </span>
                  </td>
                  <td className={styles.numCell}>{s.credit_balance ?? 0}</td>
                  <td className={styles.numCell}>{s.total_exports ?? 0}</td>
                  <td>
                    <select
                      className={styles.planSelect}
                      value={s.plan || ''}
                      disabled={updating === s.id}
                      onChange={e => handlePlanChange(s.id, e.target.value)}
                    >
                      <option value="" disabled>No plan</option>
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {updating === s.id && (
                      <span className={styles.saving}>saving...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>)}
      </main>
    </div>
  );
}

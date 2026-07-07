import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import '../../styles/recruiters.css';
import styles from './Search.module.css';

const TYPE_FILTERS = ['All contacts', 'Professional only', 'Students only'];
const PAGE_SIZE = 25;

export default function Search() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const [planLoading, setPlanLoading] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [plan,        setPlan]        = useState(null);
  const [credits,     setCredits]     = useState(null);
  const [contacts,    setContacts]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [exporting,   setExporting]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('All contacts');
  const [verifiedOnly,setVerifiedOnly]= useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const [page,        setPage]        = useState(0);
  const [verifying,   setVerifying]   = useState(null);
  const [profileOpen, setProfileOpen] = useState(null);
  const [revealedEmails, setRevealedEmails] = useState(new Set());

  const urlParams = new URLSearchParams(window.location.search);
  const checkoutSuccess = urlParams.get('checkout') === 'success';

  // There's no free tier — every non-admin account needs an active paid
  // plan to be here at all. Admins always pass.
  useEffect(() => {
    async function fetchPlan() {
      const { data } = await supabase.from('subscriptions').select('plan, status').eq('user_id', user.id).single();
      const active = data?.status === 'active' && !!data.plan;
      setPlan(active ? data.plan : null);
      setHasActivePlan(active);
      setPlanLoading(false);
      if (!isAdmin && !active) navigate('/recruiters/upgrade', { replace: true });
    }
    fetchPlan();
  }, [user, isAdmin, navigate]);

  const effectivePlan = isAdmin ? 'agency' : plan;

  // Fetch credits
  const fetchCredits = useCallback(async () => {
    if (!isAdmin && !hasActivePlan) return;
    const { data } = await supabase.from('credit_balance').select('balance').eq('user_id', user.id).single();
    setCredits(data?.balance ?? 0);
  }, [isAdmin, hasActivePlan, user.id]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!isAdmin && !hasActivePlan) return;
    setLoading(true);

    let query = supabase
      .from('pa_contacts')
      .select('id, full_name, email, is_student, verified, verification_result, city, state, organization, specialty, npi', { count: 'exact' });

    if (search.trim()) query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
    if (typeFilter === 'Professional only') query = query.eq('is_student', false);
    if (typeFilter === 'Students only')     query = query.eq('is_student', true);
    if (verifiedOnly)                       query = query.eq('verified', true);
    if (stateFilter)                        query = query.eq('state', stateFilter);

    query = query.order('id', { ascending: true }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) { console.error(error); setLoading(false); return; }
    setContacts(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [isAdmin, hasActivePlan, search, typeFilter, verifiedOnly, stateFilter, page]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { setPage(0); }, [search, typeFilter, verifiedOnly, stateFilter]);

  // Reveal email — costs 1 credit from shared pool (admins reveal free, no deduction)
  const handleRevealEmail = async (id, email) => {
    if (!isAdmin) {
      if ((credits ?? 0) < 1) { alert('No credits remaining. Credits are added to your account each billing cycle and never expire.'); return; }
      await supabase.from('credit_ledger').insert({ user_id: user.id, amount: -1, action: 'reveal', contact_id: id });
      setCredits(prev => (prev ?? 0) - 1);
    }
    const next = new Set(revealedEmails);
    next.add(id);
    setRevealedEmails(next);
  };

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      if (!isAdmin) {
        const { data: balanceData } = await supabase.from('credit_balance').select('balance').eq('user_id', user.id).single();
        const balance = balanceData?.balance ?? 0;
        if (balance < 1) { alert('No export credits remaining. Purchase a credit bundle to continue.'); setExporting(false); return; }
      }

      const exportLimits = { starter: 1000, professional: 3500, agency: 100000 };
      const limit = exportLimits[effectivePlan] || 500;

      let query = supabase
        .from('pa_contacts')
        .select('id, full_name, email, is_student, verified, verification_result, city, state, organization, specialty, npi')
        .order('id', { ascending: true })
        .limit(limit);

      if (search.trim()) query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
      if (typeFilter === 'Professional only') query = query.eq('is_student', false);
      if (typeFilter === 'Students only')     query = query.eq('is_student', true);
      if (verifiedOnly)                       query = query.eq('verified', true);
      if (stateFilter)                        query = query.eq('state', stateFilter);

      const { data: exportData, error } = await query;
      if (error) throw error;
      if (!exportData?.length) { alert('No contacts match your filters.'); setExporting(false); return; }

      if (!isAdmin) {
        await supabase.from('credit_ledger').insert({ user_id: user.id, amount: -1, action: 'export' });
      }
      // One export_log row per contact exported, matching the live schema
      // (export_log.contact_id), not a single row with a count.
      await supabase.from('export_log').insert(
        exportData.map(c => ({ user_id: user.id, contact_id: c.id }))
      );

      const headers = ['Name', 'Email', 'Type', 'Verified', 'Verification Status', 'City', 'State', 'Organization', 'Specialty', 'NPI'];
      const rows = exportData.map(c => [
        `"${(c.full_name||'').replace(/"/g,'""')}"`,
        c.email||'', c.is_student ? 'Student' : 'Professional',
        c.verified ? 'Yes' : 'No', c.verification_result||'',
        c.city||'', c.state||'', `"${(c.organization||'').replace(/"/g,'""')}"`,
        c.specialty||'', c.npi||'',
      ]);

      const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `season-one-pa-contacts-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
      if (!isAdmin) setCredits(prev => (prev ?? 0) - 1);
    } catch (err) { alert('Export failed: ' + err.message); }
    setExporting(false);
  };

  // Real-time verify
  const handleVerify = async (contact) => {
    if (!isAdmin && (credits ?? 0) < 2) { alert('You need at least 2 credits to verify. Purchase a credit bundle to continue.'); return; }
    setVerifying(contact.id);
    try {
      if (!isAdmin) {
        await supabase.from('credit_ledger').insert({ user_id: user.id, amount: -2, action: 'verification', contact_id: contact.id });
      }
      const { data, error } = await supabase.functions.invoke('verify-email', { body: { email: contact.email } });
      if (error) throw error;
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, verified: data.result === 'Safe to Send', verification_result: data.result } : c));
      if (!isAdmin) setCredits(prev => (prev ?? 0) - 2);
    } catch (err) { alert('Verification failed: ' + err.message); }
    setVerifying(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  // Waiting on the plan check, or already being redirected to /recruiters/upgrade.
  if (planLoading || (!isAdmin && !hasActivePlan)) {
    return (
      <div className={`rsr-app ${styles.layout}`}>
        <div className={styles.emptyState} style={{ margin: 'auto' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`rsr-app ${styles.layout}`}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>Season<span> One</span></div>

        {isAdmin ? (
          <div className={styles.trialBox} style={{ background: 'rgba(110,180,63,0.15)', borderColor: 'rgba(110,180,63,0.4)' }}>
            <div className={styles.trialLabel}>Admin Access</div>
            <div className={styles.trialCount}>Unlimited</div>
            <div className={styles.trialSub}>Full database, no credit limits</div>
          </div>
        ) : credits !== null && (
          <div className={styles.trialBox} style={{ background: 'rgba(26,107,204,0.12)', borderColor: 'rgba(26,107,204,0.3)' }}>
            <div className={styles.trialLabel}>Credits</div>
            <div className={styles.trialCount}>{credits.toLocaleString()}</div>
            <div className={styles.trialSub}>remaining · never expire</div>
          </div>
        )}

        <nav className={styles.nav}>
          <div className={styles.navItem + ' ' + styles.navActive}>PA Search</div>
          <div className={styles.navItem} onClick={() => navigate('/recruiters/grants')}>Grant Tracker</div>
          <div className={styles.navItem} onClick={() => navigate('/recruiters/upgrade')}>Upgrade / Billing</div>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userEmail}>{user?.email}</div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        {checkoutSuccess && (
          <div className="success-msg" style={{ marginBottom: 16 }}>
            Payment successful — you now have full access to the PA database.
          </div>
        )}

        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>PA Contact Search</h1>
            <p className={styles.pageSub}>{total.toLocaleString()} contacts match your filters</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleExport} disabled={exporting || planLoading}>
            {exporting ? 'Exporting...' : `Export CSV (${total.toLocaleString()})`}
          </button>
        </div>

        <div className={styles.filters}>
          <input className={`form-input ${styles.searchInput}`} type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className={`form-input ${styles.tierSelect}`} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {TYPE_FILTERS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={`form-input`} style={{ width: 120 }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
            <option value="">All states</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className={styles.toggle}>
            <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
            Verified only
          </label>
        </div>

        <div className={styles.resultsBar}>
          {loading ? 'Loading...' : `${total.toLocaleString()} result${total !== 1 ? 's' : ''}`}
        </div>

        {/* Contact Cards */}
        <div className={styles.cardList}>
          {loading ? (
            <div className={styles.emptyState}>Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className={styles.emptyState}>No contacts match your filters.</div>
          ) : contacts.map(c => (
            <div key={c.id} className={styles.contactCard}>
              <div className={styles.cardAvatar}>
                {(c.full_name || '?').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{c.full_name}</div>
                <div className={styles.cardMeta}>
                  {c.specialty && <span>{c.specialty}</span>}
                  {c.specialty && (c.city || c.state) && <span className={styles.metaDot}>·</span>}
                  {(c.city || c.state) && <span>{[c.city, c.state].filter(Boolean).join(', ')}</span>}
                </div>
                {c.organization && <div className={styles.cardOrg}>{c.organization}</div>}
                <div className={styles.cardBadges}>
                  {c.is_student
                    ? <span className="badge badge-blue">Student</span>
                    : <span className="badge badge-gray">Professional</span>}
                  {c.verified
                    ? <span className="badge badge-green">Verified</span>
                    : <span className="badge badge-gray">Unverified</span>}
                </div>
              </div>
              <div className={styles.cardActions}>
                {revealedEmails.has(c.id) ? (
                  <div className={styles.emailRevealed}>{c.email}</div>
                ) : (
                  <button className={styles.revealBtn} onClick={(e) => { e.stopPropagation(); handleRevealEmail(c.id, c.email); }}>
                    Reveal Email
                  </button>
                )}
                <button
                  className={styles.profileBtn}
                  onClick={(e) => { e.stopPropagation(); setProfileOpen(c); }}
                >
                  View Profile
                </button>
                <button
                  className={styles.verifyBtn}
                  onClick={(e) => { e.stopPropagation(); handleVerify(c); }}
                  disabled={verifying === c.id}
                >
                  {verifying === c.id ? '...' : 'Re-Verify'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}>Previous</button>
            <span className={styles.pageInfo}>Page {page+1} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1}>Next</button>
          </div>
        )}
      </main>

      {/* Profile Modal */}
      {profileOpen && (
        <div className={styles.modalOverlay} onClick={() => setProfileOpen(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalAvatar}>
                {(profileOpen.full_name || '?').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <div>
                <div className={styles.modalName}>{profileOpen.full_name}</div>
                <div className={styles.modalSpecialty}>{profileOpen.specialty || 'Physician Assistant'}</div>
              </div>
              <button className={styles.modalClose} onClick={() => setProfileOpen(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Email</span>
                <span className={styles.modalValue}>{profileOpen.email}</span>
              </div>
              {profileOpen.organization && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Organization</span>
                  <span className={styles.modalValue}>{profileOpen.organization}</span>
                </div>
              )}
              {(profileOpen.city || profileOpen.state) && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Location</span>
                  <span className={styles.modalValue}>{[profileOpen.city, profileOpen.state, profileOpen.postal_code].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {profileOpen.npi && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>NPI</span>
                  <span className={styles.modalValue}>{profileOpen.npi}</span>
                </div>
              )}
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Type</span>
                <span className={styles.modalValue}>{profileOpen.is_student ? 'PA Student' : 'PA Professional'}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Email Status</span>
                <span className={styles.modalValue}>{profileOpen.verified ? 'Verified' : 'Unverified'} {profileOpen.verification_result ? `— ${profileOpen.verification_result}` : ''}</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 20, width: '100%' }}
                onClick={() => { handleVerify(profileOpen); setProfileOpen(null); }}
                disabled={verifying === profileOpen.id}
              >
                Re-Verify Email (2 credits)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

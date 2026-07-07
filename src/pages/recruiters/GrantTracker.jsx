import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import '../../styles/recruiters.css';
import shellStyles from './Search.module.css';

const PROGRAM_OPTIONS = [
  { value: '93.224', label: 'HRSA Health Center Program (93.224)' },
  { value: '93.913', label: 'HRSA Rural Health Workforce (93.913)' },
  { value: '93.301', label: 'Small Rural Hospital Improvement Program (93.301)' },
  { value: '93.970', label: 'IHS Workforce Development (93.970)' },
];

const STATE_OPTIONS = [
  { value: 'WA', label: 'Washington' },
  { value: 'OR', label: 'Oregon' },
  { value: 'ID', label: 'Idaho' },
  { value: 'MT', label: 'Montana' },
  { value: 'AK', label: 'Alaska' },
  { value: '', label: 'All States' },
];

function fmtMoney(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncateDesc(text, maxSentences = 4, maxChars = 420) {
  if (!text) return '';
  const sentences = text.split('. ').map((s) => s.trim()).filter(Boolean);
  const picked = sentences.slice(0, maxSentences).join('. ');
  const result = picked && !/[.!?]$/.test(picked) ? picked + '.' : picked;

  if (result.length > maxChars) {
    const cut = result.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
  }
  return sentences.length > maxSentences ? result + ' …' : result;
}

function mapsUrl(name, state) {
  const query = encodeURIComponent(`${name || ''} ${state || ''}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function awardUrl(generatedInternalId, name, state) {
  if (generatedInternalId) {
    return `https://www.usaspending.gov/award/${generatedInternalId}/`;
  }
  return mapsUrl(name, state);
}

// Rolling window ending today, so "recent" doesn't silently go stale.
function rollingWindow(monthsBack) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - monthsBack);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export default function GrantTracker() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  // No free tier — every non-admin account needs an active paid plan.
  const [planChecked, setPlanChecked] = useState(false);
  useEffect(() => {
    async function checkPlan() {
      if (isAdmin) { setPlanChecked(true); return; }
      const { data } = await supabase.from('subscriptions').select('plan, status').eq('user_id', user.id).single();
      if (data?.status === 'active' && data.plan) setPlanChecked(true);
      else navigate('/recruiters/upgrade', { replace: true });
    }
    checkPlan();
  }, [user, isAdmin, navigate]);

  const [program, setProgram] = useState('93.224');
  const [state, setState] = useState('WA');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [openOpps, setOpenOpps] = useState(null);
  const [oppsLoading, setOppsLoading] = useState(false);
  const [oppsError, setOppsError] = useState(null);

  async function loadAwards() {
    setLoading(true);
    setError(null);
    setResults(null);

    const { start: windowStartStr, end: windowEndStr } = rollingWindow(24);

    const filters = {
      award_type_codes: ['02', '03', '04', '05'],
      time_period: [{
        start_date: windowStartStr,
        end_date: windowEndStr,
      }],
      program_numbers: [program],
      award_amounts: [{ lower_bound: 25000 }],
    };

    if (state) {
      filters.place_of_performance_locations = [{ country: 'USA', state }];
    }

    const body = {
      filters,
      fields: [
        'Award ID',
        'Recipient Name',
        'Award Amount',
        'Start Date',
        'Awarding Agency',
        'Description',
        'Place of Performance State Code',
      ],
      page: 1,
      limit: 10,
      sort: 'Start Date',
      order: 'desc',
    };

    try {
      const res = await fetch(
        'https://api.usaspending.gov/api/v2/search/spending_by_award/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) throw new Error('Request failed: ' + res.status);

      const data = await res.json();
      const rawResults = data.results || [];

      // Client-side safety net: filter on Start Date, the only field
      // USASpending returns that reliably reflects real award activity.
      // Last Modified Date looked like a recency signal but turned out to
      // be a bulk sync timestamp shared across unrelated awards — it let
      // decades-old continuation grants show up as "recent."
      const windowStart = new Date(windowStartStr);
      const windowEnd = new Date(windowEndStr);
      const filtered = rawResults.filter((r) => {
        const d = r['Start Date'] ? new Date(r['Start Date']) : null;
        return d && d >= windowStart && d <= windowEnd;
      });

      setResults(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Grants.gov: currently OPEN funding opportunities (not yet awarded).
  // Complementary to USASpending, which only shows money already awarded.
  async function loadOpenOpportunities() {
    setOppsLoading(true);
    setOppsError(null);
    setOpenOpps(null);

    try {
      const res = await fetch('https://api.grants.gov/v1/api/search2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cfda: program,
          rows: 10,
          oppStatuses: 'posted',
        }),
      });

      if (!res.ok) throw new Error('Request failed: ' + res.status);

      const data = await res.json();
      const hits = data?.data?.oppHits || [];
      setOpenOpps(hits);
    } catch (err) {
      setOppsError(err.message);
    } finally {
      setOppsLoading(false);
    }
  }

  async function handleSearch() {
    loadAwards();
    loadOpenOpportunities();
  }

  if (!planChecked) {
    return (
      <div className={`rsr-app ${shellStyles.layout}`}>
        <div className={shellStyles.emptyState} style={{ margin: 'auto' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`rsr-app ${shellStyles.layout}`}>
      <aside className={shellStyles.sidebar}>
        <div className={shellStyles.sidebarLogo}>Season<span> One</span></div>

        <nav className={shellStyles.nav}>
          <div className={shellStyles.navItem} onClick={() => navigate('/recruiters/search')}>PA Search</div>
          <div className={shellStyles.navItem + ' ' + shellStyles.navActive}>Grant Tracker</div>
          <div className={shellStyles.navItem} onClick={() => navigate('/recruiters/upgrade')}>Upgrade / Billing</div>
        </nav>

        <div className={shellStyles.sidebarFooter}>
          <div className={shellStyles.userEmail}>{user?.email}</div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className={shellStyles.main}>
      <div style={styles.pageHead}>
        <div style={styles.eyebrow}>Live Data</div>
        <h1 style={styles.h1}>Grant Tracker</h1>
        <p style={styles.subtext}>
          Newly funded rural and underserved facilities from federal grant
          programs, plus currently open opportunities in the same programs.
          Each award is a facility with confirmed budget and a staffing
          mandate — click any awarded row to view the full award record.
        </p>
      </div>

      <div style={styles.panel}>
        <div style={styles.filters}>
          <select
            style={styles.select}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          >
            {PROGRAM_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            style={styles.select}
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            {STATE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            style={styles.button}
            onClick={handleSearch}
            disabled={loading || oppsLoading}
          >
            {loading || oppsLoading ? 'Searching…' : 'Search Awards'}
          </button>
        </div>

        {/* ── Recently Awarded (USASpending) ── */}
        <div style={styles.sectionLabel}>Recently Awarded</div>
        <div style={styles.rows}>
          {!results && !loading && !error && (
            <div style={styles.stateMsg}>
              Select a program and state, then search.
            </div>
          )}

          {loading && <div style={styles.stateMsg}>Loading recent awards…</div>}

          {error && (
            <div style={styles.stateMsg}>
              Couldn't load awards right now ({error}). The USASpending API
              may be temporarily unavailable — try again shortly.
            </div>
          )}

          {results && results.length === 0 && (
            <div style={styles.stateMsg}>
              No awards found for this program and state in the selected
              window.
            </div>
          )}

          {results &&
            results.map((r, i) => {
              const name = r['Recipient Name'] || 'Unknown Recipient';
              const stateCode =
                r['Place of Performance State Code'] || state || '';
              return (
                <a
                  key={r['Award ID'] || i}
                  href={awardUrl(r['generated_internal_id'], name, stateCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.row}
                >
                  <div style={styles.rowTop}>
                    <span style={styles.recipient}>{name}</span>
                    <span style={styles.amount}>
                      {fmtMoney(r['Award Amount'])}
                    </span>
                  </div>
                  <div style={styles.meta}>
                    {r['Awarding Agency'] || ''} · Awarded{' '}
                    {fmtDate(r['Start Date'])} · {stateCode ? `${stateCode} · ` : ''}
                    {r['Award ID'] || ''}
                  </div>
                  {r['Description'] && (
                    <div style={styles.desc}>{truncateDesc(r['Description'])}</div>
                  )}
                  <div style={styles.locPill}>🔗 View Award Details</div>
                </a>
              );
            })}
        </div>

        {/* ── Currently Open (Grants.gov) ── */}
        <div style={{ ...styles.sectionLabel, marginTop: 28 }}>
          Currently Open Opportunities
        </div>
        <div style={styles.rows}>
          {!openOpps && !oppsLoading && !oppsError && (
            <div style={styles.stateMsg}>
              Open opportunities for this program will appear here after you
              search.
            </div>
          )}

          {oppsLoading && (
            <div style={styles.stateMsg}>Loading open opportunities…</div>
          )}

          {oppsError && (
            <div style={styles.stateMsg}>
              Couldn't load open opportunities right now ({oppsError}).
              Grants.gov may be temporarily unavailable — try again shortly.
            </div>
          )}

          {openOpps && openOpps.length === 0 && (
            <div style={styles.stateMsg}>
              No currently open opportunities for this program.
            </div>
          )}

          {openOpps &&
            openOpps.map((o, i) => (
              <a
                key={o.id || i}
                href={`https://www.grants.gov/search-results-detail/${o.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.row}
              >
                <div style={styles.rowTop}>
                  <span style={styles.recipient}>{o.title}</span>
                </div>
                <div style={styles.meta}>
                  {o.agency || ''} · Closes {fmtDate(o.closeDate)} ·
                  Opportunity #{o.number}
                </div>
                <div style={styles.openPill}>Open for applications</div>
              </a>
            ))}
        </div>

        <div style={styles.footerNote}>
          Awarded data from the USASpending.gov public API. Open opportunities
          from the Grants.gov public API. Tap an awarded result to view its
          full award record on USASpending.gov, or an open opportunity to view its full listing.
        </div>
      </div>
      </main>
    </div>
  );
}

const styles = {
  pageHead: { marginBottom: 18 },
  eyebrow: {
    fontSize: 13,
    fontWeight: 500,
    color: '#4b5563',
    marginBottom: 6,
  },
  h1: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    marginBottom: 8,
    color: '#111827',
  },
  subtext: { fontSize: 15, color: '#4b5563', maxWidth: 560, lineHeight: 1.5 },
  panel: {
    background: 'transparent',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#4b5563',
    marginBottom: 10,
  },
  filters: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 20,
  },
  select: {
    fontFamily: 'inherit',
    fontSize: 15,
    border: '1px solid #111827',
    borderRadius: 10,
    background: '#fff',
    padding: '11px 14px',
    color: '#111827',
  },
  button: {
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    borderRadius: 10,
    background: '#2f5fdb',
    color: '#fff',
    padding: '12px 20px',
    cursor: 'pointer',
  },
  rows: { minHeight: 100, display: 'flex', flexDirection: 'column', gap: 12 },
  row: {
    display: 'block',
    background: '#fff',
    border: '1px solid #111827',
    borderRadius: 14,
    padding: '18px 20px',
    textDecoration: 'none',
    color: 'inherit',
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'baseline',
  },
  recipient: { fontSize: 17, fontWeight: 700, color: '#111827' },
  amount: { fontSize: 16, fontWeight: 700, color: '#2f5fdb', whiteSpace: 'nowrap' },
  meta: { marginTop: 4, fontSize: 13, color: '#4b5563' },
  desc: { marginTop: 10, fontSize: 14, lineHeight: 1.5, color: '#1f2937' },
  locPill: {
    display: 'inline-block',
    fontSize: 13,
    fontWeight: 700,
    color: '#2f5fdb',
    background: '#dbe4fb',
    borderRadius: 8,
    padding: '5px 12px',
    marginTop: 12,
  },
  openPill: {
    display: 'inline-block',
    fontSize: 13,
    fontWeight: 700,
    color: '#15803d',
    background: '#dcfce7',
    borderRadius: 8,
    padding: '5px 12px',
    marginTop: 12,
  },
  stateMsg: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#4b5563',
    fontSize: 14,
    background: '#fff',
    border: '1px solid #111827',
    borderRadius: 14,
  },
  footerNote: {
    marginTop: 20,
    fontSize: 12,
    color: '#6b7280',
  },
};

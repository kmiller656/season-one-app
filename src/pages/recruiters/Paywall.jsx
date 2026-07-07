import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/recruiters.css';
import styles from './Paywall.module.css';

// Stripe billing isn't live yet — this is a holding page shown to any
// recruiter without an active plan (see the redirect in Search.jsx /
// GrantTracker.jsx). Admins can still grant access manually via
// /admin/recruiters (AdminSubscribers.jsx sets subscriptions.status to
// 'active' directly, no Stripe involved).
export default function Paywall() {
  const { signOut } = useAuth();
  const navigate     = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  return (
    <div className={`rsr-app ${styles.page}`}>
      <div className={styles.nav}>
        <div className={styles.navLogo}>Season<span> One</span></div>
        <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
      </div>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Coming Soon</div>
        <h1 className={styles.heading}>Subscriptions aren't<br />open just yet</h1>
        <p className={styles.sub}>
          We're still finishing up billing for the PA contact database. Your account is created and ready to go —
          we'll reach out as soon as plans are available, or you can contact us directly with questions in the meantime.
        </p>
        <a href="mailto:support@seasononehealthcare.com" className="btn btn-primary">
          Contact Support
        </a>
        <p className={styles.legalNote}>
          Questions about the PA contact database? Email{' '}
          <a href="mailto:support@seasononehealthcare.com">support@seasononehealthcare.com</a>.
        </p>
      </div>
    </div>
  );
}

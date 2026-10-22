import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { initials } from '../utils/format';
import styles from './AppShell.module.css';

interface NavItem {
  to: string;
  label: string;
  roles: ('admin' | 'teacher' | 'student' | 'parent')[];
}

/** Screens by role, exactly as the brief lists them. */
const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', roles: ['admin'] },
  { to: '/students', label: 'Students', roles: ['admin', 'teacher'] },
  { to: '/staff', label: 'Staff', roles: ['admin'] },
  { to: '/classes', label: 'Classes', roles: ['admin'] },
  { to: '/subjects', label: 'Subjects', roles: ['admin'] },
  { to: '/sessions', label: 'Sessions & terms', roles: ['admin'] },
  { to: '/assignments', label: 'Assignments', roles: ['admin', 'teacher'] },
  { to: '/attendance', label: 'Attendance oversight', roles: ['admin'] },
  { to: '/results', label: 'Results workspace', roles: ['admin'] },
  { to: '/my/attendance', label: 'My attendance', roles: ['student', 'parent'] },
  { to: '/my/results', label: 'My results', roles: ['student', 'parent'] },
];

export function AppShell() {
  const { me, signOut } = useAuth();
  const navigate = useNavigate();

  const visible = NAV.filter((item) => me && item.roles.some((role) => me.roles.includes(role)));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to main content
      </a>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.crest} aria-hidden="true">
            SMS
          </span>
          <div>
            <p className={styles.schoolName}>Unity Secondary School</p>
            <p className={styles.session}>
              {me?.scope.currentSession ? `Session ${me.scope.currentSession.name}` : 'No active session'}
            </p>
          </div>
        </div>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(me?.displayName ?? '')}
          </span>
          <span className={styles.who}>
            <span className={styles.name}>{me?.displayName}</span>
            <span className={styles.roles}>{me?.roles.join(' · ')}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Main navigation">
          <ul className={styles.navList}>
            {visible.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => [styles.navLink, isActive ? styles.active : ''].filter(Boolean).join(' ')}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

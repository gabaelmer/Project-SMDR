import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ConnectionIndicator } from './components/ConnectionIndicator';
import { DashboardPage } from './pages/DashboardPage';
import { CallLogPage } from './pages/CallLogPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AlertsPage } from './pages/AlertsPage';
import { PageId, useAppStore } from './state/appStore';
import logo from './assets/logo.png';

const navItems: Array<{ id: PageId; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calls', label: 'Call Log' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'settings', label: 'Settings' }
];

export default function App() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123!');
  const [error, setError] = useState('');

  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const activePage = useAppStore((state) => state.activePage);
  const setActivePage = useAppStore((state) => state.setActivePage);
  const login = useAppStore((state) => state.login);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const theme = useAppStore((state) => state.theme);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const activeController = useAppStore((state) => state.activeController);
  const statusText = useAppStore((state) => state.statusText);
  const refreshDashboard = useAppStore((state) => state.refreshDashboard);
  const refreshAnalytics = useAppStore((state) => state.refreshAnalytics);
  const refreshRecords = useAppStore((state) => state.refreshRecords);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activePage === 'dashboard') {
      void refreshDashboard().catch((error) => {
        console.error('Dashboard refresh failed', error);
      });
    }
    if (activePage === 'analytics') {
      void refreshAnalytics().catch((error) => {
        console.error('Analytics refresh failed', error);
      });
    }
    if (activePage === 'calls') {
      void refreshRecords().catch((error) => {
        console.error('Records refresh failed', error);
      });
    }
  }, [activePage, isAuthenticated, refreshAnalytics, refreshDashboard, refreshRecords]);

  const pageNode = useMemo(() => {
    if (activePage === 'dashboard') return <DashboardPage />;
    if (activePage === 'calls') return <CallLogPage />;
    if (activePage === 'analytics') return <AnalyticsPage />;
    if (activePage === 'alerts') return <AlertsPage />;
    return <SettingsPage />;
  }, [activePage]);

  const isDesktopBridgeAvailable = typeof window.smdrInsight?.login === 'function';

  if (!isDesktopBridgeAvailable) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="card w-full max-w-xl p-6 text-center">
          <img src={logo} alt="Logo" className="mx-auto mb-4 h-24 w-auto rounded-2xl" />
          <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            SMDR Insight
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            This page is running in a regular browser without the Electron backend. Login and live SMDR features only work
            in the desktop app.
          </p>
          <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
            Use the app on the host machine via <code>npm run dev</code> (development) or install the packaged desktop
            build on the target PC.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="card w-full max-w-md p-6 text-center">
          <img src={logo} alt="Logo" className="mx-auto mb-4 h-24 w-auto rounded-2xl" />
          <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            SMDR Insight
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Login to continue
          </p>
          <div className="mt-4 space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-2xl border px-3 py-2"
              style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full rounded-2xl border px-3 py-2"
              style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
            />
            {error ? (
              <p className="text-sm text-rose-500" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="w-full rounded-2xl bg-brand-600 px-3 py-2 font-semibold text-white"
              onClick={async () => {
                try {
                  const ok = await login(username, password);
                  if (!ok) setError('Invalid username or password');
                } catch (loginError) {
                  console.error('Login failed', loginError);
                  setError('Login service error occurred');
                }
              }}
            >
              Sign In
            </button>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Default credentials: admin / admin123!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="card m-4 hidden p-4 lg:flex lg:flex-col">
        <img src={logo} alt="Logo" className="mb-4 h-16 w-auto self-start rounded-xl" />
        <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>
          SMDR Insight
        </p>
        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Mitel Edition
        </p>

        <nav className="mt-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={clsx(
                'w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold transition',
                activePage === item.id ? 'bg-brand-600 text-white' : 'border'
              )}
              style={activePage === item.id ? undefined : { borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <p className="mt-auto pt-4 text-xs" style={{ color: 'var(--muted)' }}>
          Publisher: elmertech (Elmer Gaba)
        </p>
      </aside>

      <main className="p-4 lg:p-6">
        <header className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <ConnectionIndicator status={connectionStatus} controller={activeController} />
          <div className="card flex items-center px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
            {statusText}
          </div>
          <button
            onClick={() => setActivePage('settings')}
            className="card px-4 py-3 text-sm font-semibold"
            style={{ color: 'var(--text)' }}
          >
            Connection Settings
          </button>
          <button
            onClick={() => toggleTheme()}
            className="card px-4 py-3 text-sm font-semibold"
            style={{ color: 'var(--text)' }}
          >
            Theme: {theme}
          </button>
        </header>

        <div className="mb-3 flex gap-2 lg:hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={clsx('rounded-2xl px-3 py-2 text-xs font-semibold', activePage === item.id ? 'bg-brand-600 text-white' : 'card')}
            >
              {item.label}
            </button>
          ))}
        </div>

        {pageNode}
      </main>
    </div>
  );
}

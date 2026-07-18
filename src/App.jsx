import { useState, useEffect, useRef } from 'react';
import api from './api.js';
import {
  X,
  Shield,
  Activity,
  HardDrive,
  Terminal,
  User,
  Users,
  Cpu,
  TrendingUp,
  Lock,
  Trash2,
  Plus,
  Server,
  CheckCircle2,
  Download,
  Laptop,
  Globe,
  Info,
  LayoutDashboard,
  Sliders,
  Key,
  LogOut,
  Clock,
  Edit2,
  AlertTriangle,
  Menu,
  ShieldOff,
  History,
  Mail,
  Phone,
  Briefcase,
  ArrowLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';

// Shared chart tooltip styling — was duplicated inline at every chart site.
const CHART_TOOLTIP = {
  backgroundColor: 'hsl(var(--popover))',
  borderColor: 'hsl(var(--border))',
  color: 'hsl(var(--popover-foreground))',
  borderRadius: '12px',
  fontSize: '11px',
};

// Small presentational primitives, shared across the detail pages and
// dashboards so spacing/'type scale stay consistent instead of every section
// hand-rolling its own sizes.
const SectionTitle = ({ children }) => (
  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">{children}</span>
);

const StatTile = ({ label, value, accent, small }) => (
  <div className="p-4 rounded-xl bg-card border border-border">
    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">{label}</span>
    <span className={`mt-1.5 block font-semibold tabular-nums ${small ? 'text-xs' : 'text-2xl'} ${accent || 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

// Honest empty state for charts — shown instead of an axis-only chart that
// looks broken. Absolutely positioned so the chart box keeps its height.
const EmptyChart = ({ children }) => (
  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground text-center px-4 pointer-events-none">
    {children}
  </div>
);

// Renders a recharts ResponsiveContainer only once its box has a real size —
// avoids the "width(-1)/height(-1)" console warning on first paint / tab switch.
function SizedChart({ children }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const el = ref.current;
      if (el) setSize({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      {size.w > 0 && size.h > 0 ? (
        // Pass NUMERIC dims (not "100%") so recharts never sees width/height -1.
        <ResponsiveContainer width={size.w} height={size.h}>{children}</ResponsiveContainer>
      ) : null}
    </div>
  );
}

// Fixed categorical color order for pie/donut charts (never cycled/rank-based) —
// matches the app's existing accent set used elsewhere for status/identity.
const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444', '#14b8a6', '#84cc16'];

// Build version, injected from package.json by vite (see vite.config.js) so the
// desktop-agent header always matches the actual installer version.
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

// Passkeys are bound to the web origin and can't work in the Electron desktop
// agent (127.0.0.1 can never satisfy the WebAuthn RP origin). Gate the passkey
// buttons on this so an admin signing into the agent isn't dead-ended — TOTP and
// recovery codes are origin-agnostic and always remain available.
const MFA_ON_ORIGIN =
  typeof window !== 'undefined' &&
  !!window.PublicKeyCredential &&
  window.location.protocol === 'https:';

// Plain checkbox-driven toggle switch — avoids pulling in @radix-ui/react-switch
// as a new dependency (this environment can't regenerate package-lock.json).
function ToggleSwitch({ checked, onChange, title }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer" title={title}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <div className="w-9 h-5 bg-muted border border-border rounded-full peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors" />
      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </label>
  );
}

// Real searchable select (replaces the flaky native <datalist>): filters an
// item list as you type and shows the matches in a dropdown you click. Generic
// over any {id,...} item via getLabel/getSub.
function SearchSelect({ items, value, onChange, placeholder = 'Search…', getLabel, getSub, emptyText = 'No matches' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const selected = items.find((i) => i.id === value);
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? items.filter((i) => getLabel(i).toLowerCase().includes(needle) || (getSub?.(i) || '').toLowerCase().includes(needle))
    : items;
  return (
    <div className="relative" ref={boxRef}>
      <input
        value={open ? q : (selected ? getLabel(selected) : q)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); if (value) onChange(''); }}
        onFocus={() => { setOpen(true); setQ(''); }}
        placeholder={placeholder}
        className="w-full bg-background border border-border focus:border-primary rounded-xl px-3 py-2 text-xs text-foreground outline-none"
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">{emptyText}</div>
          ) : filtered.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => { onChange(i.id); setOpen(false); setQ(''); }}
              className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors ${i.id === value ? 'bg-primary/10' : ''}`}
            >
              <div className="text-xs font-medium text-foreground truncate">{getLabel(i)}</div>
              {getSub && <div className="text-[10px] text-muted-foreground truncate">{getSub(i)}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// A plain-language "what this means" line so a dashboard number becomes a
// decision, not just a stat. tone drives the accent (good / watch / bad / info).
function DecisionNote({ tone = 'info', children }) {
  const tones = {
    good: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    watch: 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    bad: 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400',
    info: 'bg-primary/5 border-primary/15 text-muted-foreground',
  };
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'bad' ? AlertTriangle : tone === 'watch' ? AlertTriangle : Info;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${tones[tone] || tones.info}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// Productive / neutral / unproductive split. The daemon classifies every
// non-idle sample against the company's own Productivity Rules (ai_label) and
// stored it all along — this is the first thing that actually renders it, so
// the rules screen finally has a visible consequence. Uses the theme's
// positive/neutral/negative chart tokens (adapt to light/dark).
function ProductivitySplit({ data }) {
  if (!data || !data.total) {
    return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No classified activity yet</div>;
  }
  const segs = [
    { key: 'productive', label: 'Productive', pct: data.productive_pct, hours: data.productive_hours, color: 'hsl(var(--chart-positive))' },
    { key: 'neutral', label: 'Neutral', pct: data.neutral_pct, hours: data.neutral_hours, color: 'hsl(var(--chart-neutral))' },
    { key: 'unproductive', label: 'Unproductive', pct: data.unproductive_pct, hours: data.unproductive_hours, color: 'hsl(var(--chart-negative))' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
        {segs.map((s) => s.pct > 0 && (
          <div key={s.key} style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${s.label}: ${s.pct}%`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {segs.map((s) => (
          <div key={s.key} className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-sm font-semibold text-foreground">{s.pct}%</div>
            <div className="text-[10px] text-muted-foreground">{s.hours}h</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hour-of-day × weekday activity heatmap. Reveals real working patterns from
// timestamps the daemon has always logged. Cell intensity = active minutes,
// scaled to the busiest cell, tinted with the theme primary.
function ActivityHeatmap({ data }) {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (!data || !data.length) {
    return <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No activity recorded yet</div>;
  }
  const grid = {};
  let max = 0;
  for (const c of data) {
    grid[`${c.dow}-${c.hour}`] = c.active_minutes;
    if (c.active_minutes > max) max = c.active_minutes;
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="flex">
          <div className="w-9 shrink-0" />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[7px] text-muted-foreground">{h % 3 === 0 ? h : ''}</div>
          ))}
        </div>
        {DOW.map((label, dow) => (
          <div key={dow} className="flex items-center">
            <div className="w-9 shrink-0 text-[8px] uppercase font-semibold text-muted-foreground">{label}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const v = grid[`${dow}-${h}`] || 0;
              const intensity = max ? v / max : 0;
              return (
                <div key={h} className="flex-1 aspect-square m-[1px] rounded-[2px] border border-border/40"
                  style={{ backgroundColor: intensity ? `hsl(var(--primary) / ${0.12 + intensity * 0.78})` : 'transparent' }}
                  title={v ? `${label} ${h}:00 — ${v} active min` : ''} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// One-time recovery-code display. Codes are shown exactly once (the server only
// ever returns the plaintext at generation); the user must acknowledge before
// the panel lets them move on.
function RecoveryCodes({ codes, onClose }) {
  return (
    <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <Key className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Save your recovery codes</span>
      </div>
      <p className="text-[11px] text-muted-foreground">Each works once if you lose your authenticator or passkey. They won't be shown again.</p>
      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
        {codes.map((c) => <div key={c} className="rounded bg-background border border-border px-2 py-1 text-center">{c}</div>)}
      </div>
      <div className="flex gap-2">
        <button onClick={() => navigator.clipboard?.writeText(codes.join('\n'))} className="flex-1 py-2 bg-muted border border-border rounded-lg text-[10px] font-semibold uppercase">Copy all</button>
        <button onClick={onClose} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-[10px] font-semibold uppercase">I've saved them</button>
      </div>
    </div>
  );
}

// Security / 2FA enrollment panel — lives in the Profile modal for admin & lead.
// Self-contained: owns its status + enrollment state so the modal stays simple.
function MfaSection({ showToast }) {
  const [status, setStatus] = useState(null);
  const [totpSetup, setTotpSetup] = useState(null); // { secret, uri, qr }
  const [totpCode, setTotpCode] = useState('');
  const [recovery, setRecovery] = useState(null);
  const [busy, setBusy] = useState(false);
  const [disablePw, setDisablePw] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const load = () => api.mfa.status().then(setStatus).catch(() => {});
  useEffect(() => { load(); }, []);

  const startTotp = async () => {
    setBusy(true);
    try {
      const { secret, otpauth_uri } = await api.mfa.totpInit();
      const QR = await import('qrcode');
      const qr = await QR.toDataURL(otpauth_uri, { margin: 1, width: 180 });
      setTotpSetup({ secret, uri: otpauth_uri, qr });
    } catch (e) { showToast(e.message || 'Could not start TOTP setup.', 'error'); }
    finally { setBusy(false); }
  };

  const activateTotp = async () => {
    setBusy(true);
    try {
      const { recovery_codes } = await api.mfa.totpActivate(totpCode.trim());
      setTotpSetup(null); setTotpCode('');
      if (recovery_codes) setRecovery(recovery_codes);
      showToast('Authenticator enabled.', 'success');
      await load();
    } catch (e) { showToast(e.message || 'Activation failed.', 'error'); }
    finally { setBusy(false); }
  };

  const addPasskey = async () => {
    setBusy(true);
    try {
      const options = await api.mfa.passkeyRegisterOptions();
      const { startRegistration } = await import('@simplewebauthn/browser');
      const response = await startRegistration({ optionsJSON: options });
      const label = `${navigator.platform || 'Passkey'} · ${new Date().toLocaleDateString()}`;
      const { recovery_codes } = await api.mfa.passkeyRegisterVerify(response, label);
      if (recovery_codes) setRecovery(recovery_codes);
      showToast('Passkey registered.', 'success');
      await load();
    } catch (e) { showToast(e.message || 'Passkey registration failed or was cancelled.', 'error'); }
    finally { setBusy(false); }
  };

  const removePasskey = async (id) => {
    try { await api.mfa.passkeyRemove(id); await load(); showToast('Passkey removed.', 'info'); }
    catch (e) { showToast(e.message || 'Failed.', 'error'); }
  };

  const disable = async () => {
    setBusy(true);
    try { await api.mfa.disable(disablePw); setDisablePw(''); setShowDisable(false); showToast('2FA disabled.', 'info'); await load(); }
    catch (e) { showToast(e.message || 'Disable failed.', 'error'); }
    finally { setBusy(false); }
  };

  if (recovery) return <RecoveryCodes codes={recovery} onClose={() => setRecovery(null)} />;

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[9px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Two-Factor Authentication</label>
        {status?.mfa_enabled && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">On</span>}
      </div>

      {/* TOTP */}
      {status?.totp ? (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>Authenticator app</span><span className="text-emerald-500 font-semibold">Enabled</span></div>
      ) : totpSetup ? (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] text-muted-foreground">Scan in your authenticator app, then enter the 6-digit code.</p>
          <img src={totpSetup.qr} alt="TOTP QR" className="mx-auto rounded-lg bg-white p-2" width={160} height={160} />
          <p className="text-[9px] text-center font-mono text-muted-foreground break-all">{totpSetup.secret}</p>
          <div className="flex gap-2">
            <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="123456" inputMode="numeric"
              className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono tracking-widest text-center outline-none focus:border-primary" />
            <button onClick={activateTotp} disabled={busy || totpCode.trim().length < 6} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-semibold uppercase disabled:opacity-50">Activate</button>
          </div>
        </div>
      ) : (
        <button onClick={startTotp} disabled={busy} className="w-full py-2 bg-muted border border-border rounded-lg text-[10px] font-semibold uppercase hover:text-foreground">Set up authenticator app</button>
      )}

      {/* Passkeys — only where the origin can satisfy WebAuthn. */}
      {MFA_ON_ORIGIN ? (
        <div className="space-y-1.5">
          {status?.passkeys?.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[11px] rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
              <span className="text-foreground truncate">{p.label || 'Passkey'}</span>
              <button onClick={() => removePasskey(p.credential_id || p.id)} className="text-muted-foreground hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={addPasskey} disabled={busy} className="w-full py-2 bg-muted border border-border rounded-lg text-[10px] font-semibold uppercase hover:text-foreground">+ Add a passkey</button>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Passkeys can be added from the web console (they don't work inside the desktop agent).</p>
      )}

      {status?.mfa_enabled && (
        <div className="space-y-2 pt-1">
          <div className="text-[10px] text-muted-foreground">{status.recovery_remaining} recovery code(s) remaining.</div>
          {showDisable ? (
            <div className="flex gap-2">
              <input type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} placeholder="Confirm password"
                className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary" />
              <button onClick={disable} disabled={busy || !disablePw} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-semibold uppercase disabled:opacity-50">Confirm</button>
            </div>
          ) : (
            <button onClick={() => setShowDisable(true)} className="text-[10px] text-red-400/80 hover:text-red-400">Disable 2FA</button>
          )}
        </div>
      )}
    </div>
  );
}

// Visual timeline allocation: shows the day's real tracked active blocks and lets
// the employee assign each block to one of their projects. Hours are grounded in
// tracked activity (the server enforces the same), so ROI reflects real work.
function hourOfDay(ts) {
  const d = new Date(ts);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function rangesOverlap(aS, aE, bS, bE) {
  return new Date(aS) < new Date(bE) && new Date(bS) < new Date(aE);
}

function TimelineAllocator({ onLogged, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [projectId, setProjectId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const d = await api.analytics.timeline();
    setData(d);
    return d;
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await api.analytics.timeline();
        if (alive) setData(d);
      } catch (err) {
        if (alive) showToast(err.message || 'Could not load your timeline.', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blocks = data?.blocks || [];
  const entries = data?.entries || [];
  const projList = data?.projects || [];

  // Which tracked blocks are already covered by an allocation (so we grey them out).
  const isAllocated = (b) => entries.some((e) => rangesOverlap(b.start_ts, b.end_ts, e.start_ts, e.end_ts));

  // Timeline domain (hours). Clamp to the data with a sensible workday fallback.
  const allTs = [...blocks, ...entries].flatMap((x) => [hourOfDay(x.start_ts), hourOfDay(x.end_ts)]);
  const domainStart = allTs.length ? Math.floor(Math.min(...allTs)) : 9;
  const domainEnd = allTs.length ? Math.ceil(Math.max(...allTs)) : 18;
  const span = Math.max(1, domainEnd - domainStart);
  const xOf = (ts) => ((hourOfDay(ts) - domainStart) / span) * 100;
  const wOf = (s, e) => Math.max(0.6, ((hourOfDay(e) - hourOfDay(s)) / span) * 100);

  const selected = selectedIdx != null ? blocks[selectedIdx] : null;

  const allocate = async () => {
    if (!selected) return;
    if (!projectId) { showToast('Pick a project for this block.', 'error'); return; }
    setSaving(true);
    try {
      await api.timeEntries.create({
        project_id: projectId,
        start_ts: selected.start_ts,
        end_ts: selected.end_ts,
        hours: selected.hours,
        source: 'prompt',
        note: note || null,
      });
      showToast('Block allocated to project.', 'success');
      setSelectedIdx(null);
      setNote('');
      setProjectId('');
      await load();
      onLogged && onLogged();
    } catch (err) {
      showToast(err.message || 'Could not allocate this block.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-indigo-400">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Allocate Your Tracked Hours</span>
        </div>
        {data && (
          <div className="text-[10px] text-muted-foreground">
            <span className="text-foreground font-semibold">{data.summary.tracked_hours}h</span> tracked ·{' '}
            <span className="text-emerald-400 font-semibold">{data.summary.allocated_hours}h</span> allocated ·{' '}
            <span className="text-amber-400 font-semibold">{data.summary.remaining_hours}h</span> open
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        These are the active blocks the agent recorded today. Click a block, then tag it to the
        project you worked on. You can only allocate time you were actually active.
      </p>

      {loading ? (
        <div className="p-4 text-[11px] text-muted-foreground">Loading your day…</div>
      ) : blocks.length === 0 ? (
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground text-center">
          No tracked activity yet today. As you work, the agent records active blocks here for you to allocate.
        </div>
      ) : (
        <>
          {/* SVG lane: tracked blocks (top) + existing allocations (bottom). */}
          <div className="rounded-xl bg-background/60 border border-border/60 p-3 space-y-1">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none" className="w-full h-16">
              {/* hour gridlines */}
              {Array.from({ length: span + 1 }, (_, i) => (
                <line key={i} x1={(i / span) * 100} y1="0" x2={(i / span) * 100} y2="16"
                  stroke="currentColor" strokeWidth="0.1" className="text-border" />
              ))}
              {/* tracked blocks */}
              {blocks.map((b, i) => {
                const done = isAllocated(b);
                const sel = i === selectedIdx;
                return (
                  <rect key={`b${i}`} x={xOf(b.start_ts)} y="1" width={wOf(b.start_ts, b.end_ts)} height="6"
                    rx="0.6" style={{ cursor: done ? 'default' : 'pointer' }}
                    onClick={() => !done && setSelectedIdx(i)}
                    className={done ? 'text-emerald-500/40' : sel ? 'text-indigo-400' : 'text-indigo-500/60'}
                    fill="currentColor" stroke={sel ? '#a5b4fc' : 'none'} strokeWidth={sel ? 0.4 : 0} />
                );
              })}
              {/* existing allocations */}
              {entries.map((e, i) => (
                <rect key={`e${i}`} x={xOf(e.start_ts)} y="9" width={wOf(e.start_ts, e.end_ts)} height="5"
                  rx="0.6" className="text-emerald-500/70" fill="currentColor" />
              ))}
            </svg>
            <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
              <span>{String(domainStart).padStart(2, '0')}:00</span>
              <span>{String(domainEnd).padStart(2, '0')}:00</span>
            </div>
            <div className="flex items-center gap-3 text-[8px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500/60 inline-block" />Tracked (click to allocate)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/70 inline-block" />Already allocated</span>
            </div>
          </div>

          {selected ? (
            <div className="space-y-3 rounded-xl bg-background/60 border border-indigo-500/30 p-3">
              <div className="text-[11px] text-foreground font-bold">
                {fmtClock(selected.start_ts)}–{fmtClock(selected.end_ts)} · {selected.hours}h
                {selected.top_category && <span className="text-muted-foreground font-normal"> · mostly {selected.top_category}</span>}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-semibold text-muted-foreground">Project</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground outline-none">
                  <option value="">Select project…</option>
                  {projList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {projList.length === 0 && (
                  <p className="text-[9px] text-amber-400">You have no assigned projects yet — ask your team lead to add you to one.</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-semibold text-muted-foreground">Note (optional)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. NHAI Section D alignment"
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={allocate} disabled={saving || !projectId}
                  className="flex-1 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground font-semibold text-[10px] uppercase tracking-widest rounded-xl transition-all">
                  {saving ? 'Allocating…' : 'Allocate to Project'}
                </button>
                <button onClick={() => { setSelectedIdx(null); setNote(''); }}
                  className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground font-semibold text-[10px] uppercase tracking-widest rounded-xl">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground text-center py-2">Select a tracked block above to allocate it.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  const isEmployeeOnlyMode = new URLSearchParams(window.location.search).get('app') === 'employee';

  // Navigation / Routing State: 'landing' | 'login' | 'admin' | 'tl' | 'employee'
  const [currentRole, setCurrentRole] = useState(() => {
    if (isEmployeeOnlyMode) return 'employee';
    const saved = localStorage.getItem('civil_role');
    return saved || 'landing';
  });

  // Persist the active tab across a reload — losing your place every refresh
  // (always bouncing back to Dashboard) was a real, reported annoyance.
  const [activeAdminTab, setActiveAdminTabState] = useState(() => localStorage.getItem('ct_admin_tab') || 'overview'); // 'overview' | 'users' | 'contribution' | 'provision' | 'rules' | 'audit'
  const setActiveAdminTab = (tab) => { closeDetail(); setActiveAdminTabState(tab); localStorage.setItem('ct_admin_tab', tab); };
  const [activeTlTab, setActiveTlTabState] = useState(() => localStorage.getItem('ct_tl_tab') || 'overview'); // 'overview' | 'contribution' | 'members' | 'manage'
  const setActiveTlTab = (tab) => { closeDetail(); setActiveTlTabState(tab); localStorage.setItem('ct_tl_tab', tab); };
  
  // Custom Analytics & Team Lead State Variables
  const [selectedAttributionProject, setSelectedAttributionProject] = useState('Project Alpha');

  // Team Lead Add Employee Form States
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('50000');
  const [newEmpBenefits, setNewEmpBenefits] = useState('10000');
  const [newEmpRole, setNewEmpRole] = useState('Assistant Civil Engineer');
  const [newEmpDept, setNewEmpDept] = useState('Civil Engineering');
  const [newEmpProject, setNewEmpProject] = useState('');
  
  // Team Lead Add Project Form States
  const [newProjName, setNewProjName] = useState('');
  const [newProjBudget, setNewProjBudget] = useState('50000000');
  const [newProjMargin, setNewProjMargin] = useState('35');
  const [savingTLProject, setSavingTLProject] = useState(false);

  // Employee Validation Ping Prompt States
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(true);

  // Global Session Authentication State
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('civil_session_token') || '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // Second-factor challenge state (held in memory only — the pending token is
  // never persisted). mfaChallenge = { pendingToken, methods, recovery } | null.
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  // Real analytics from /api/analytics (overview/team/self), loaded after login.
  const [serverAnalytics, setServerAnalytics] = useState(null);
  // Real project time entries for the ROI attribution ledger.
  const [timeEntriesData, setTimeEntriesData] = useState([]);
  // Real audit trail + telemetry feed.
  const [serverAuditLogs, setServerAuditLogs] = useState([]);
  const [serverTelemetryFeed, setServerTelemetryFeed] = useState([]);
  // Employee's OWN analytics (transparency self-view in the desktop agent).
  const [selfAnalytics, setSelfAnalytics] = useState(null);

  // Project detail drill-down — who's assigned, per-day work breakdown, per-
  // employee totals. Built from time_entries already loaded (admin: all, lead:
  // own team) plus one fetch for the assignment roster.
  const [viewingProject, setViewingProject] = useState(null);
  const [viewingProjectAssignments, setViewingProjectAssignments] = useState([]);
  const openProjectDetail = async (project) => {
    setViewingUser(null);
    setViewingProject(project);
    setViewingProjectAssignments([]);
    pushDetailHistory();
    try {
      setViewingProjectAssignments(await api.projects.assignments(project.id));
    } catch { /* non-fatal — assignment roster just stays empty */ }
  };

  // User detail drill-down (admin: any user; lead: their own team; click a row
  // in User Directory / Manage Team to open). Backend RBAC already scopes
  // api.analytics.employee() correctly — self/own-team/admin-any.
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingUserAnalytics, setViewingUserAnalytics] = useState(null);
  const [viewingUserBusy, setViewingUserBusy] = useState(false);
  const openUserDetail = async (user) => {
    setViewingProject(null);
    setViewingUser(user);
    setViewingUserAnalytics(null);
    setViewingUserBusy(true);
    pushDetailHistory();
    try {
      setViewingUserAnalytics(await api.analytics.employee(user.id, 30));
    } catch (err) {
      showToast(err.message || 'Failed to load user analytics.', 'error');
    } finally {
      setViewingUserBusy(false);
    }
  };

  // Detail views are full pages, not modals — they replace the tab content.
  // There's no router here (navigation is React state), so Back is wired by
  // hand: opening a detail pushes one history entry, and popstate closes it.
  // Without this the browser/hardware Back button would leave the app entirely
  // from what looks like a sub-page.
  const detailActive = !!(viewingUser || viewingProject);
  const pushDetailHistory = () => {
    if (!detailActive) window.history.pushState({ ctDetail: true }, '');
  };
  const closeDetail = () => {
    setViewingUser(null);
    setViewingUserAnalytics(null);
    setViewingProject(null);
    setViewingProjectAssignments([]);
  };
  useEffect(() => {
    if (!detailActive) return;
    const onPop = () => closeDetail();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [detailActive]);
  // Back button: unwind our pushed entry so history doesn't accumulate.
  const goBackFromDetail = () => {
    if (window.history.state?.ctDetail) window.history.back();
    else closeDetail();
  };
  // Profile / change-password modal.
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');

  const openProfile = () => {
    const u = api.getUser();
    setProfileName(u?.name || '');
    setPwCurrent(''); setPwNew('');
    setShowProfile(true);
  };
  const saveProfileName = async () => {
    try { await api.auth.updateProfile({ name: profileName }); showToast('Profile updated.', 'success'); }
    catch (e) { showToast(e.message || 'Update failed.', 'error'); }
  };
  const changePassword = async () => {
    if (pwNew.length < 8) { showToast('New password must be 8+ characters.', 'error'); return; }
    try {
      await api.auth.updateProfile({ current_password: pwCurrent, new_password: pwNew });
      showToast('Password changed.', 'success');
      setPwCurrent(''); setPwNew('');
    } catch (e) { showToast(e.message || 'Password change failed.', 'error'); }
  };
  const [loginRole, setLoginRole] = useState('admin'); // 'admin' | 'tl' | 'employee'
  const [loginError, setLoginError] = useState('');

  // Directory search + add-team-lead form (admin).
  const [dirSearch, setDirSearch] = useState('');
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', dept: '', password: '' });

  const handleAddLead = async (e) => {
    if (e) e.preventDefault();
    if (!leadForm.name || !leadForm.email || leadForm.password.length < 8) {
      showToast('Name, email, and 8+ char password required.', 'error'); return;
    }
    try {
      await api.users.create({ name: leadForm.name, email: leadForm.email, phone: leadForm.phone || null,
        role: 'lead', dept: leadForm.dept, password: leadForm.password });
      await loadServerData();
      setShowAddLead(false); setLeadForm({ name: '', email: '', phone: '', dept: '', password: '' });
      showToast(`Team lead ${leadForm.name} created.`, 'success');
    } catch (err) { showToast(err.message || 'Failed to create team lead.', 'error'); }
  };

  const toggleLeadAuthority = async (lead) => {
    try {
      await api.users.update(lead.id, { can_manage_employees: !lead.canManage });
      await loadServerData();
      showToast(`Authority ${lead.canManage ? 'revoked' : 'granted'} for ${lead.name}.`, 'info');
    } catch (err) { showToast(err.message || 'Failed.', 'error'); }
  };

  const editLeadName = (lead) => {
    askText('Team lead name', lead.name, async (n) => {
      if (!n || n.trim() === lead.name) return;
      try { await api.users.update(lead.id, { name: n.trim() }); await loadServerData(); showToast('Updated.', 'success'); }
      catch (err) { showToast(err.message || 'Failed.', 'error'); }
    });
  };

  // Toggle switch: instant soft enable/disable — reversible, so no confirm
  // dialog friction (unlike the permanent delete below).
  const toggleLeadStatus = async (lead) => {
    const activate = lead.status !== 'Active';
    try {
      await api.users.update(lead.id, { status: activate ? 'active' : 'disabled' });
      await loadServerData();
      showToast(`${lead.name} ${activate ? 'enabled' : 'disabled'}.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleDeleteLead = (id, name) => {
    askConfirm(
      `Permanently delete ${name} and all their data? This cannot be undone. Employees reporting to them will be unassigned, not deleted.`,
      async () => {
        try { await api.users.remove(id); await loadServerData(); showToast(`${name} deleted.`, 'info'); }
        catch (err) { showToast(err.message || 'Delete failed.', 'error'); }
      },
      { title: 'Delete team lead', danger: true, confirmLabel: 'Delete permanently', requireTypedWord: 'DELETE' }
    );
  };

  // DPDP: export a user's data as JSON.
  const exportUserData = async (u) => {
    try {
      const data = await api.dataRights.export(u.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `chronotrack-${(u.name || 'user').replace(/\s+/g, '_')}.json`;
      a.click(); URL.revokeObjectURL(a.href);
      showToast('Data exported.', 'success');
    } catch (err) { showToast(err.message || 'Export failed.', 'error'); }
  };

  // DPDP: erase a user's telemetry + time entries (right to erasure).
  // This is the single most destructive action an admin can take from this
  // screen — it permanently deletes real activity history. Requires typing
  // ERASE to confirm, not just a click, since a mis-click here is unrecoverable.
  const purgeUserData = (u) => {
    askConfirm(
      `This will permanently erase ALL telemetry and time-entry history for ${u.name}. This cannot be undone and there is no backup.`,
      async () => {
        try {
          const r = await api.dataRights.purge(u.id);
          await loadServerData();
          showToast(`Erased ${r.telemetry_deleted} telemetry + ${r.time_entries_deleted} entries.`, 'info');
        } catch (err) { showToast(err.message || 'Purge failed.', 'error'); }
      },
      { title: 'Erase all activity data (DPDP right to erasure)', danger: true, confirmLabel: 'Erase permanently', requireTypedWord: 'ERASE' }
    );
  };

  // Create project (admin or lead).
  const [showAddProject, setShowAddProject] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [projForm, setProjForm] = useState({ name: '', client: '', billed_revenue: '' });

  const [savingProject, setSavingProject] = useState(false);
  const handleAddProject = async (e) => {
    if (e) e.preventDefault();
    if (savingProject) return; // guard against double-submit (rapid double-click) creating duplicates
    if (!projForm.name) { showToast('Project name required.', 'error'); return; }
    setSavingProject(true);
    try {
      await api.projects.create({
        name: projForm.name, client: projForm.client,
        billed_revenue: Number(projForm.billed_revenue) || 0,
      });
      await loadServerData();
      setShowAddProject(false); setProjForm({ name: '', client: '', billed_revenue: '' });
      showToast(`Project "${projForm.name}" created.`, 'success');
    } catch (err) { showToast(err.message || 'Failed to create project.', 'error'); }
    finally { setSavingProject(false); }
  };

  // Core data lists — empty until loaded from the API (no hardcoded demo data).
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [logs, setLogs] = useState({});

  // Multi-project employee assignment (admin + team lead, shared via renderContributionTab).
  const [projectAssignments, setProjectAssignments] = useState([]);
  const [assignPickerId, setAssignPickerId] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  useEffect(() => {
    const activeId = projects.find(p => p.id === selectedAttributionProject)?.id || projects[0]?.id;
    if (!activeId) { setProjectAssignments([]); return; }
    api.projects.assignments(activeId).then(setProjectAssignments).catch(() => setProjectAssignments([]));
  }, [selectedAttributionProject, projects]);
  const reloadAssignments = async () => {
    const activeId = projects.find(p => p.id === selectedAttributionProject)?.id || projects[0]?.id;
    if (!activeId) return;
    try { setProjectAssignments(await api.projects.assignments(activeId)); } catch { /* keep stale list on error */ }
  };
  const handleAssignEmployee = async (projectId) => {
    if (!assignPickerId) return;
    setAssignBusy(true);
    try {
      await api.projects.assign(projectId, assignPickerId);
      setAssignPickerId('');
      await reloadAssignments();
      showToast('Employee assigned to project.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to assign employee.', 'error');
    } finally {
      setAssignBusy(false);
    }
  };
  const handleUnassignEmployee = async (projectId, userId, userName) => {
    try {
      await api.projects.unassign(projectId, userId);
      await reloadAssignments();
      showToast(`${userName || 'Employee'} unassigned from project.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to unassign employee.', 'error');
    }
  };

  // Custom confirm modal — replaces window.confirm() everywhere. Native browser
  // dialogs are unstyled, block the whole tab (including automated testing),
  // and give no way to signal "this one is more dangerous than that one."
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmTypedInput, setConfirmTypedInput] = useState('');
  const askConfirm = (message, onConfirm, opts = {}) => {
    setConfirmTypedInput('');
    setConfirmModal({
      message, onConfirm,
      title: opts.title || 'Please confirm',
      danger: !!opts.danger,
      confirmLabel: opts.confirmLabel || 'Confirm',
      requireTypedWord: opts.requireTypedWord || null, // e.g. "DELETE" for the most destructive actions
    });
  };

  // Custom rename/text-prompt modal — replaces window.prompt().
  const [renameModal, setRenameModal] = useState(null);
  const askText = (label, initialValue, onConfirm) => {
    setRenameModal({ label, value: initialValue, onConfirm });
  };

  // Toast & Notifications State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync local data changes to localStorage
  useEffect(() => {
    localStorage.setItem('civil_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('civil_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('civil_team_leads', JSON.stringify(teamLeads));
  }, [teamLeads]);

  useEffect(() => {
    localStorage.setItem('civil_logs', JSON.stringify(logs));
  }, [logs]);

  // Session Token Validation on Mount
  useEffect(() => {
    if (isEmployeeOnlyMode) return;
    const verifySession = async () => {
      if (!api.getToken()) return;
      try {
        const { user } = await api.auth.me();
        const route = user.role === 'lead' ? 'tl' : user.role;
        localStorage.setItem('civil_role', route);
        setSessionToken(api.getToken());
        setCurrentRole(route);
        if (route !== 'employee') loadServerData();
      } catch {
        // Invalid/expired token → clear and return to landing.
        api.clearSession();
        localStorage.removeItem('civil_session_token');
        setSessionToken('');
        setCurrentRole('landing');
      }
    };
    verifySession();
  }, []);

  // Productivity Rule Configurations
  const [productiveKeywords, setProductiveKeywords] = useState(() => {
    const saved = localStorage.getItem('civil_productive_keys');
    return saved ? JSON.parse(saved) : ['vscode', 'terminal', 'autocad', 'revit', 'excel', 'chronotrack', 'app.tsx', 'code', 'github', 'dev'];
  });
  
  const [unproductiveKeywords, setUnproductiveKeywords] = useState(() => {
    const saved = localStorage.getItem('civil_unproductive_keys');
    return saved ? JSON.parse(saved) : ['youtube', 'facebook', 'twitter', 'netflix', 'game', 'gaming', 'social', 'idle', 'unknown'];
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [keywordTarget, setKeywordTarget] = useState('whitelist');
  // keyword -> rule id, for server-backed deletion.
  const [ruleIdByKeyword, setRuleIdByKeyword] = useState({});

  // Load productivity rules from the server into the keyword lists.
  const loadRules = async () => {
    try {
      const list = await api.rules.list();
      const wl = [], bl = [], ids = {};
      for (const r of list) {
        ids[`${r.category}:${r.keyword}`] = r.id;
        (r.category === 'whitelist' ? wl : bl).push(r.keyword);
      }
      setProductiveKeywords(wl);
      setUnproductiveKeywords(bl);
      setRuleIdByKeyword(ids);
    } catch (e) {
      console.warn('[rules] load failed:', e.message);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    const cleanKey = newKeyword.trim().toLowerCase();
    try {
      await api.rules.add(cleanKey, keywordTarget);
      await loadRules();
      showToast(`Added "${cleanKey}" to ${keywordTarget}.`, 'success');
      setNewKeyword('');
    } catch (err) {
      showToast(err.message || 'Failed to add rule.', 'error');
    }
  };

  const removeKeyword = async (key, category) => {
    const id = ruleIdByKeyword[`${category}:${key}`];
    if (!id) return;
    try {
      await api.rules.remove(id);
      await loadRules();
      showToast(`Removed rule: ${key}`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to remove rule.', 'error');
    }
  };

  // Local Daemon Polling Loop — neutral defaults (no fake data until daemon replies)
  const [localDaemonState, setLocalDaemonState] = useState({
    online: false,
    activeWindow: "Awaiting telemetry…",
    keystrokes: 0,
    mouseMovements: 0,
    status: "connecting",
    history: []
  });
  const [telemetryTicker, setTelemetryTicker] = useState([
    { time: '', event: 'Waiting for local daemon on port 5050…' }
  ]);
  // Real cloud-sync status from the daemon's /api/status — never simulated.
  const [cloudSyncStatus, setCloudSyncStatus] = useState({
    checked: false, lastSuccessAt: null, lastError: null, pendingSync: null,
  });

  // Desktop App states
  const [desktopActivated, setDesktopActivated] = useState(() => {
    return localStorage.getItem('civil_desktop_activated') === 'true';
  });

  useEffect(() => {
    // Only the Electron desktop agent talks to the local daemon (127.0.0.1:5050).
    // In a plain browser (admin/lead web dashboards) there is no daemon — skip the
    // poll entirely to avoid 401 spam.
    if (!window.electronAPI) return;
    let isMounted = true;
    let lastWindow = "";

    const pollDaemon = async () => {
      try {
        const token = window.electronAPI ? window.electronAPI.getApiToken() : '';
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch('http://localhost:5050/api/telemetry', { headers });
        if (!res.ok) throw new Error();
        const data = await res.json();

        const historyRes = await fetch('http://localhost:5050/api/history', { headers });
        const historyData = historyRes.ok ? await historyRes.json() : [];

        // If the daemon is already cloud-activated, skip the activation screen
        // (survives restarts even if localStorage was cleared).
        try {
          const st = await fetch('http://localhost:5050/api/status', { headers });
          if (st.ok) {
            const sj = await st.json();
            if (sj.cloud && sj.cloud.activated && isMounted) {
              setDesktopActivated(true);
              localStorage.setItem('civil_desktop_activated', 'true');
            }
            if (isMounted) {
              setCloudSyncStatus({
                checked: true,
                lastSuccessAt: sj.cloud?.last_success_at || null,
                lastError: sj.cloud?.last_error || null,
                pendingSync: typeof sj.pending_sync === 'number' ? sj.pending_sync : null,
              });
            }
          }
        } catch { /* ignore */ }

        if (isMounted) {
          setLocalDaemonState({
            online: true,
            activeWindow: data.active_window || "Unknown",
            keystrokes: data.keystrokes_interval || 0,
            mouseMovements: data.mouse_movements_interval || 0,
            status: data.status || "idle",
            history: historyData
          });

          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          let eventMsg = "";
          if (data.active_window && data.active_window !== lastWindow) {
            eventMsg = `Active Window: ${data.active_window}`;
            lastWindow = data.active_window;
          } else if (data.keystrokes_interval > 0 || data.mouse_movements_interval > 0) {
            eventMsg = `Local Input: ${data.keystrokes_interval} keys, ${data.mouse_movements_interval} mouse motions`;
          }

          if (eventMsg) {
            setTelemetryTicker(prev => [
              { time: timeStr, event: eventMsg },
              ...prev.slice(0, 4)
            ]);
          }
        }
      } catch {
        // Daemon unreachable — show honest offline state, never fake data.
        if (isMounted) {
          setLocalDaemonState(prev => ({
            ...prev,
            online: false,
            status: 'offline',
            activeWindow: 'Daemon offline',
          }));
          setCloudSyncStatus({
            checked: true, lastSuccessAt: null, pendingSync: null,
            lastError: 'Cannot reach the local desktop daemon.',
          });
        }
      }
    };

    pollDaemon();
    const interval = setInterval(pollDaemon, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Map backend role (admin|lead|employee) to UI route (admin|tl|employee).
  const roleToRoute = (role) => (role === 'lead' ? 'tl' : role);

  // Audit log targets are stored as raw IDs (user/project) or plain strings
  // (rule keywords, counts). Resolve IDs to a human-readable name instead of
  // showing a bare UUID fragment — fall back to a short ID only if nothing
  // matches (e.g. the record was since deleted).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const resolveAuditTarget = (target) => {
    const str = String(target);
    if (!UUID_RE.test(str)) return str;
    const person = employees.find(e => e.id === str) || teamLeads.find(t => t.id === str);
    if (person) return person.name;
    const project = projects.find(p => p.id === str);
    if (project) return project.name;
    return `${str.slice(0, 8)}… (deleted)`;
  };

  // Shared post-authentication routing — reached from both the direct login and
  // the MFA-verified path, so the two can't drift.
  const completeLogin = (user) => {
    const route = roleToRoute(user.role);
    localStorage.setItem('civil_role', route);
    setSessionToken(api.getToken());
    setCurrentRole(route);
    setLoginPassword('');
    setMfaChallenge(null);
    setMfaCode('');
    showToast(`Logged in as ${user.name || user.email}.`, 'success');
    if (route !== 'employee') loadServerData();
  };

  // Authentication Submission — real backend, email + password, then optional 2FA.
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Enter email and password.');
      return;
    }

    try {
      const res = await api.auth.login(loginEmail.trim(), loginPassword);
      if (res.mfaRequired) {
        // Second factor needed — hold the pending token in memory (never stored)
        // and show the challenge. Default method: passkey if available, else totp.
        setMfaChallenge(res);
        setMfaMethod(res.methods.includes('passkey') && MFA_ON_ORIGIN ? 'passkey' : (res.methods[0] || 'recovery'));
        setLoginPassword('');
        return;
      }
      completeLogin(res.user);
    } catch (err) {
      setLoginError(err.message || 'Authentication failed');
    }
  };

  // Complete the second factor. method: 'totp' | 'recovery' | 'passkey'.
  const handleMfaVerify = async (method, extra = {}) => {
    if (!mfaChallenge) return;
    setMfaError('');
    setMfaBusy(true);
    try {
      const user = await api.auth.mfaVerify(mfaChallenge.pendingToken, { method, ...extra });
      completeLogin(user);
    } catch (err) {
      setMfaError(err.message || 'Verification failed');
    } finally {
      setMfaBusy(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!mfaChallenge) return;
    setMfaError('');
    setMfaBusy(true);
    try {
      const options = await api.auth.mfaPasskeyAuthOptions(mfaChallenge.pendingToken);
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const response = await startAuthentication({ optionsJSON: options });
      await handleMfaVerify('passkey', { response });
    } catch (err) {
      setMfaError(err.message || 'Passkey sign-in failed or was cancelled.');
      setMfaBusy(false);
    }
  };

  const handleLogout = () => {
    api.clearSession();
    localStorage.removeItem('civil_session_token');
    localStorage.removeItem('civil_role');
    setSessionToken('');
    setCurrentRole('landing');
    showToast('Logged out successfully.', 'info');
  };

  // In the packaged desktop agent, "Exit Agent" should close the app window,
  // not drop the employee onto the marketing landing page. The telemetry
  // daemon is a separate autostarted background process and keeps collecting
  // regardless (see main.cjs). Web dashboard (no electronAPI) still logs out.
  const handleExitAgent = () => {
    if (window.electronAPI?.quitApp) window.electronAPI.quitApp();
    else handleLogout();
  };

  // Sign the employee out of the agent WITHOUT quitting: clears the cloud
  // session + local activation so a different employee can activate on this
  // machine, and returns to the onboarding screen. (The background daemon is
  // separate; withdrawing consent is the in-app "revoke" flow.)
  const handleDesktopSignOut = () => {
    askConfirm(
      'Sign out of the desktop agent? You will need an activation code to sign back in.',
      () => {
        api.clearSession();
        localStorage.removeItem('civil_desktop_activated');
        setDesktopActivated(false);
        setSessionToken('');
        showToast('Signed out of the agent.', 'info');
      },
      { title: 'Sign out', confirmLabel: 'Sign out' }
    );
  };

  // Map backend rows -> existing UI shapes and load real data from the server.
  // Source of truth is now the API; localStorage is only a transient cache.
  // Function declaration (not const arrow) so it's hoisted and safely callable
  // from handlers defined earlier in this component body.
  async function loadServerData() {
    try {
      const [srvUsers, srvProjects] = await Promise.all([
        api.users.list(),
        api.projects.list(),
      ]);

      const mappedProjects = srvProjects.map((p, i) => ({
        id: p.id,
        name: p.name,
        teamLeadId: p.team_lead_id,
        contractValue: Number(p.billed_revenue) || Number(p.budget) || 0,
        margin: p.roi != null ? Math.round(p.roi * 100) : 0,
        cost: Number(p.cost) || 0,
        totalHours: Number(p.total_hours) || 0,
        color: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 5],
        bgColor: 'bg-indigo-500/20',
        borderCol: 'border-indigo-500/30',
      }));

      const leads = srvUsers
        .filter((u) => u.role === 'lead')
        .map((u) => ({
          id: u.id,
          name: u.name,
          dept: u.dept || '—',
          activeSubordinates: srvUsers.filter((e) => e.team_lead_id === u.id).length,
          activeBenchHours: 0,
          telemetryScore: 0,
          email: u.email,
          canManage: u.can_manage_employees,
          status: u.status === 'active' ? 'Active' : u.status === 'disabled' ? 'Archived' : 'Inactive',
        }));

      const emps = srvUsers
        .filter((u) => u.role === 'employee')
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.title || 'Employee',
          dept: u.dept || '—',
          teamLeadId: u.team_lead_id,
          activeProject: u.active_project_id,
          baseSalary: Number(u.base_salary) || 0,
          benefits: Number(u.benefits) || 0,
          avgHours: u.avg_hours || 160,
          hourlyCost: Number(u.hourly_cost) || 0,
          status: u.status === 'active' ? 'Active' : u.status === 'disabled' ? 'Archived' : 'Inactive',
        }));

      setProjects(mappedProjects);
      setTeamLeads(leads);
      setEmployees(emps);

      // Real analytics (telemetry + time entries), role-scoped.
      //
      // These used to be awaited one after another — 7 sequential round trips
      // against a serverless backend, each paying its own latency (and possibly
      // a cold start) before the next even started. Nothing here depends on
      // anything else here, so they all go out at once instead; the slowest
      // call now sets the total, not the sum.
      //
      // Deliberately NOT fetched here (loaded lazily on first visit to the tab
      // that needs them, see ensureTabData): the audit log and the raw
      // telemetry feed. Both are large, both are one-tab-only, and paying for
      // them on every login was pure waste.
      const role = (api.getUser() && api.getUser().role) || '';
      const settle = (p, onOk) => p.then(onOk).catch(() => { /* non-fatal: section renders its empty state */ });

      await Promise.all([
        settle(loadRules(), () => {}),
        settle(api.timeEntries.list(), setTimeEntriesData),
        role === 'admin' || role === 'lead'
          ? settle(api.activation.pending(), setPersistedPending)
          : null,
        role === 'admin'
          ? Promise.all([api.analytics.overview(7), api.analytics.team(7)])
              .then(([overview, team]) => setServerAnalytics({ overview, team }))
              .catch((e) => console.warn('[analytics] load failed:', e.message))
          : role === 'lead'
            ? settle(api.analytics.team(7), (team) => setServerAnalytics({ team }))
            : role === 'employee'
              ? settle(api.analytics.employee(null, 7), (self) => setServerAnalytics({ self }))
              : null,
      ].filter(Boolean));
    } catch (err) {
      // Keep last-known data on transient failure; surface once.
      console.warn('[data] server load failed:', err.message);
    }
  }

  // Tab-scoped lazy loads. Fetched on first visit and then cached for the
  // session, so switching back is instant and login doesn't pay for tabs you
  // never open.
  const [tabDataLoaded, setTabDataLoaded] = useState({});
  const ensureTabData = async (key) => {
    if (tabDataLoaded[key]) return;
    setTabDataLoaded((prev) => ({ ...prev, [key]: true }));
    try {
      if (key === 'audit') setServerAuditLogs(await api.auditLogs.list());
      if (key === 'telemetry') setServerTelemetryFeed(await api.telemetryFeed.list(50));
    } catch (e) {
      // Allow a retry on the next visit rather than caching the failure.
      setTabDataLoaded((prev) => ({ ...prev, [key]: false }));
      console.warn(`[data] ${key} load failed:`, e.message);
    }
  };

  // Drives the lazy tab loads. An effect (rather than hanging it off the tab
  // click handler) because the active tab is also restored from localStorage on
  // reload, which never goes through a click.
  useEffect(() => {
    if (!api.getToken()) return;
    if (currentRole === 'admin' && activeAdminTab === 'audit') ensureTabData('audit');
    if (currentRole === 'admin' && activeAdminTab === 'overview') ensureTabData('telemetry');
    if (currentRole === 'tl' && activeTlTab === 'members') ensureTabData('telemetry');
  }, [currentRole, activeAdminTab, activeTlTab]);

  // Interactive CRUD State for User Management
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingEmployeeEdit, setSavingEmployeeEdit] = useState(false);
  const [empForm, setEmpForm] = useState({
    userType: 'employee', // 'employee' | 'lead'
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    dept: 'Civil Engineering',
    teamLeadId: '',
    activeProject: '',
    baseSalary: 50000,
    benefits: 10000,
    status: 'Active'
  });

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (savingEmployee) return; // guard against double-submit creating duplicates
    const isLead = empForm.userType === 'lead';
    if (!empForm.name) { showToast('Please enter a name.', 'error'); return; }
    if (!isLead && !empForm.role) { showToast('Please enter a designation.', 'error'); return; }
    if (isLead && (!empForm.email || empForm.password.length < 8)) {
      showToast('Team Lead needs an email and an 8+ char password.', 'error'); return;
    }
    const email =
      empForm.email ||
      `${empForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@chronotrack.app`;
    setSavingEmployee(true);
    try {
      if (isLead) {
        await api.users.create({
          name: empForm.name, email, phone: empForm.phone || null, role: 'lead',
          password: empForm.password, dept: empForm.dept,
          can_manage_employees: true,
        });
      } else {
        await api.users.create({
          name: empForm.name, email, phone: empForm.phone || null, role: 'employee',
          title: empForm.role, dept: empForm.dept,
          team_lead_id: empForm.teamLeadId || (teamLeads[0] && teamLeads[0].id) || null,
          active_project_id: empForm.activeProject || null,
          base_salary: Number(empForm.baseSalary) || 0,
          benefits: Number(empForm.benefits) || 0,
          avg_hours: 160,
        });
      }
      await loadServerData();
      setShowAddForm(false);
      setEmpForm({
        userType: 'employee', name: '', email: '', password: '', role: '', dept: 'Civil Engineering',
        teamLeadId: '', activeProject: '', baseSalary: 50000, benefits: 10000, status: 'Active',
      });
      showToast(`Added ${empForm.name} (${isLead ? 'Team Lead' : 'Employee'}).`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create user.', 'error');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    if (savingEmployeeEdit) return; // guard against double-submit
    if (!empForm.name || !empForm.role) {
      showToast('Please fill in name and role.', 'error');
      return;
    }
    setSavingEmployeeEdit(true);
    try {
      await api.users.update(selectedEmp.id, {
        name: empForm.name,
        phone: empForm.phone || null,
        title: empForm.role,
        dept: empForm.dept,
        team_lead_id: empForm.teamLeadId || null,
        active_project_id: empForm.activeProject || null,
        base_salary: Number(empForm.baseSalary) || 0,
        benefits: Number(empForm.benefits) || 0,
        status: empForm.status === 'Active' ? 'active' : empForm.status === 'Inactive' ? 'invited' : 'disabled',
      });
      await loadServerData();
      setShowEditForm(false);
      setSelectedEmp(null);
      showToast('Employee account updated successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Update failed.', 'error');
    } finally {
      setSavingEmployeeEdit(false);
    }
  };

  // Toggle switch: instant soft enable/disable — reversible, so no confirm
  // dialog friction (unlike the permanent delete below).
  const toggleEmployeeStatus = async (user) => {
    const activate = user.status !== 'Active';
    try {
      await api.users.update(user.id, { status: activate ? 'active' : 'disabled' });
      await loadServerData();
      showToast(`${user.name} ${activate ? 'enabled' : 'disabled'}.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleDeleteEmployee = (id) => {
    const target = employees.find((e) => e.id === id);
    askConfirm(
      `Permanently delete ${target?.name || 'this employee'} and all their data (telemetry, time entries, devices)? This cannot be undone.`,
      async () => {
        try {
          await api.users.remove(id);
          await loadServerData();
          showToast('Employee deleted.', 'info');
        } catch (err) {
          showToast(err.message || 'Delete failed.', 'error');
        }
      },
      { title: 'Delete employee', danger: true, confirmLabel: 'Delete permanently', requireTypedWord: 'DELETE' }
    );
  };

  const openEditForm = (emp) => {
    setSelectedEmp(emp);
    setEmpForm({
      name: emp.name,
      phone: emp.phone || '',
      role: emp.role,
      dept: emp.dept,
      teamLeadId: emp.teamLeadId,
      activeProject: emp.activeProject,
      baseSalary: emp.baseSalary,
      benefits: emp.benefits,
      status: emp.status
    });
    setShowEditForm(true);
  };

  // Manager Provisioning Activation Codes
  // Provisioning picks an EXISTING employee (created via User Directory)
  // rather than typing a name+email here — that free-text path was the
  // source of the 409 "email already exists" conflicts when the typed email
  // collided with a real account.
  const [provisionUserId, setProvisionUserId] = useState('');
  const [pendingActivations, setPendingActivations] = useState([]);
  // Server-persisted view of who has an outstanding code (survives a reload —
  // the plaintext code itself is only ever known during the session it was
  // generated in, since it's stored hashed at rest).
  const [persistedPending, setPersistedPending] = useState([]);

  const generateActivationCode = async (e) => {
    e.preventDefault();
    if (!provisionUserId) {
      showToast('Select an employee first.', 'error');
      return;
    }
    const emp = employees.find((u) => u.id === provisionUserId);
    if (!emp) { showToast('Employee not found — refresh and try again.', 'error'); return; }
    try {
      const { code, expires_at } = await api.activation.generate(emp.id);
      setPendingActivations([
        { user_id: emp.id, name: emp.name, email: emp.email, code, status: 'Pending', expires_at },
        ...pendingActivations,
      ]);
      await loadServerData();
      setProvisionUserId('');
      showToast(`Activation code (shown once): ${code}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to generate code.', 'error');
    }
  };
  const handleRevokePendingCode = async (userId, name) => {
    try {
      await api.activation.revoke(userId);
      setPersistedPending((prev) => prev.filter((p) => p.user_id !== userId));
      setPendingActivations((prev) => prev.filter((p) => p.user_id !== userId));
      showToast(`Revoked pending code for ${name || 'employee'}.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to revoke code.', 'error');
    }
  };

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMsg) {
      showToast('Please fill in all contact fields.', 'error');
      return;
    }
    // No email-sending backend exists yet — hand off to the visitor's own mail
    // client with everything prefilled, rather than faking an in-app "sent"
    // confirmation that never actually reached anyone.
    const subject = `Enterprise inquiry from ${contactName}`;
    const body = `${contactMsg}\n\n— ${contactName} (${contactEmail})`;
    window.location.href = `mailto:sales@chronotrack.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast('Opening your email client to send this inquiry…', 'success');
    setContactName('');
    setContactEmail('');
    setContactMsg('');
  };

  // Load the employee's own analytics for the transparency self-view + refresh.
  useEffect(() => {
    if (!desktopActivated || !api.getToken()) return;
    let alive = true;
    const load = async () => {
      try {
        const a = await api.analytics.employee(null, 7);
        if (alive) setSelfAnalytics(a);
      } catch { /* not an employee token / offline */ }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [desktopActivated]);

  // Employee's own historical logged time entries (My Logged Time panel).
  const [myTimeEntries, setMyTimeEntries] = useState([]);
  const reloadMyTimeEntries = async () => {
    try { setMyTimeEntries(await api.timeEntries.list()); } catch { /* not an employee token / offline */ }
  };
  useEffect(() => {
    if (!desktopActivated || !api.getToken()) return;
    reloadMyTimeEntries();
  }, [desktopActivated]);

  // Employee's own DPDP consent status (Privacy & Consent panel).
  const [myConsent, setMyConsent] = useState(null);
  const reloadMyConsent = async () => {
    try { setMyConsent(await api.consent.status()); } catch { /* not an employee token / offline */ }
  };
  useEffect(() => {
    if (!desktopActivated || !api.getToken()) return;
    reloadMyConsent();
  }, [desktopActivated]);
  const handleWithdrawConsent = () => {
    askConfirm(
      'Withdraw consent for activity monitoring? This stops the desktop agent from collecting new telemetry immediately — your historical data is unaffected.',
      async () => {
        try {
          await api.consent.withdraw();
          await reloadMyConsent();
          showToast('Consent withdrawn. Monitoring stopped.', 'info');
        } catch (err) {
          showToast(err.message || 'Failed to withdraw consent.', 'error');
        }
      },
      { title: 'Withdraw consent', danger: true, confirmLabel: 'Withdraw consent' }
    );
  };

  // Auto-prompt the "what project?" validation every N active hours.
  useEffect(() => {
    if (!desktopActivated) return;
    const PROMPT_EVERY_MS = 2 * 60 * 60 * 1000; // 2h
    const t = setInterval(() => setShowVerificationPrompt(true), PROMPT_EVERY_MS);
    return () => clearInterval(t);
  }, [desktopActivated]);

  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [activationEmailInput, setActivationEmailInput] = useState('');
  const [grantedPermissions, setGrantedPermissions] = useState({
    input: false,
    startup: false,
    notifications: false,
    storage: false
  });

  const handleActivateDesktop = async (e) => {
    e.preventDefault();
    if (!activationEmailInput.trim() || !activationCodeInput.trim()) {
      showToast('Enter your corporate email and activation code.', 'error');
      return;
    }
    try {
      // 1) Real cloud activation (records DPDP consent, issues device + user tokens).
      const platform = /win/i.test(navigator.platform) ? 'win32'
        : /mac/i.test(navigator.platform) ? 'darwin' : 'linux';
      const resp = await api.activation.verify({
        email: activationEmailInput.trim(),
        code: activationCodeInput.trim(),
        consent: true,
        platform,
        hostname: 'desktop-agent',
      });
      // 2) Persist the employee session so the "what project?" prompt can log time.
      localStorage.setItem('ct_token', resp.user_token);
      localStorage.setItem('ct_user', JSON.stringify(resp.user));
      // 3) Hand the device token to the local daemon so it starts cloud sync.
      const apiBase = import.meta.env.VITE_API_BASE || '';
      try {
        const daemonToken = window.electronAPI ? window.electronAPI.getApiToken() : '';
        await fetch('http://localhost:5050/api/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(daemonToken ? { Authorization: `Bearer ${daemonToken}` } : {}) },
          body: JSON.stringify({ cloud_url: apiBase || 'http://localhost:3031', device_token: resp.device_token }),
        });
      } catch (daemonErr) {
        console.warn('Daemon handoff failed (daemon may not be running):', daemonErr);
      }
      localStorage.setItem('civil_desktop_activated', 'true');
      setDesktopActivated(true);
      showToast('Activated! Telemetry now syncing to the cloud.', 'success');
    } catch (err) {
      showToast(err.message || 'Activation failed. Check email + code.', 'error');
    }
  };

  const renderContributionTab = () => {
    const activeProj = projects.find(p => p.id === selectedAttributionProject) || projects[0];
    const contractValue = activeProj ? activeProj.contractValue : 0;

    // Per-employee attribution from REAL time entries for the selected project.
    const projId = activeProj ? activeProj.id : null;
    const projEntries = timeEntriesData.filter(e => e.project_id === projId);
    let totalProjectHours = 0;
    const byUser = new Map();
    for (const e of projEntries) {
      const cur = byUser.get(e.user_id) || { hrs: 0, notes: [] };
      cur.hrs += Number(e.hours) || 0;
      if (e.note) cur.notes.push(e.note);
      byUser.set(e.user_id, cur);
    }
    const statsList = employees
      .filter(emp => byUser.has(emp.id))
      .map(emp => {
        const agg = byUser.get(emp.id);
        const totalHrs = agg.hrs;
        totalProjectHours += totalHrs;
        const hourlyRate = emp.hourlyCost || ((emp.baseSalary || 0) + (emp.benefits || 0)) / (emp.avgHours || 160);
        const adjustedCost = hourlyRate * totalHrs;
        return { emp, totalHrs, hourlyRate, adjustedCost, tasks: agg.notes };
      });

    return (
      <div className="space-y-6">
        <div className="border-b border-border pb-4 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Contribution & ROI Attribution</h2>
            <p className="text-xs text-muted-foreground mt-1">Calculates salary costs, logged hours, and revenue generation ratios per engineer.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedAttributionProject}
              onChange={(e) => setSelectedAttributionProject(e.target.value)}
              className="bg-card border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
            >
              {projects.length === 0 && <option value="">No projects yet</option>}
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.id}</option>
              ))}
            </select>
            {currentRole === 'admin' && (
              <button
                onClick={() => setShowAddProject(true)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /><span>New Project</span>
              </button>
            )}
            {activeProj && (
              <button
                onClick={() => openProjectDetail(activeProj)}
                title="View project details"
                className="p-2 rounded-xl border border-border bg-muted hover:text-foreground transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
            {activeProj && (
              <button
                onClick={() => {
                  askConfirm(
                    `Archive project "${activeProj.name}"? It will no longer accept new logged hours.`,
                    async () => {
                      try { await api.projects.archive(activeProj.id); await loadServerData(); showToast('Project archived.', 'info'); }
                      catch (err) { showToast(err.message || 'Failed.', 'error'); }
                    },
                    { title: 'Archive project', danger: true, confirmLabel: 'Archive' }
                  );
                }}
                title="Archive project"
                className="px-3 py-2 bg-muted border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {showAddProject && (
          <form onSubmit={handleAddProject} className="p-6 rounded-xl bg-card border border-primary/20 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">New Project</h3>
              <button type="button" onClick={() => setShowAddProject(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input value={projForm.name} onChange={(e) => setProjForm({ ...projForm, name: e.target.value })} placeholder="Project name" className="bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-xs text-foreground outline-none" />
              <input value={projForm.client} onChange={(e) => setProjForm({ ...projForm, client: e.target.value })} placeholder="Client (optional)" className="bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-xs text-foreground outline-none" />
              <input type="number" value={projForm.billed_revenue} onChange={(e) => setProjForm({ ...projForm, billed_revenue: e.target.value })} placeholder="Contract value (Rs.)" className="bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-xs text-foreground outline-none" />
            </div>
            <button type="submit" disabled={savingProject} className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-xl">{savingProject ? 'Creating…' : 'Create Project'}</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border shadow-md">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Project Contract Value</span>
            <span className="text-2xl font-semibold text-foreground mt-2 block">Rs. {(contractValue / 10000000).toFixed(2)} Cr</span>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border shadow-md">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Logged Project Hours</span>
            <span className="text-2xl font-semibold text-primary mt-2 block">{Number(activeProj?.totalHours || 0).toFixed(1)} hrs</span>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border shadow-md">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Attributed Resource Cost</span>
            <span className="text-2xl font-semibold text-emerald-400 mt-2 block">
              Rs. {Number(activeProj?.cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {activeProj && (
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Assigned Employees — {activeProj.name}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={assignPickerId}
                  onChange={(e) => setAssignPickerId(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground outline-none min-w-[180px]"
                >
                  <option value="">Select employee…</option>
                  {employees
                    .filter(emp => !projectAssignments.some(a => a.id === emp.id))
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!assignPickerId || assignBusy}
                  onClick={() => handleAssignEmployee(activeProj.id)}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /><span>Assign</span>
                </button>
              </div>
            </div>
            {projectAssignments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No employees assigned to this project yet — an employee can be assigned to multiple projects across different team leads.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {projectAssignments.map(a => (
                  <div key={a.id} className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs text-foreground/80 flex items-center space-x-2">
                    <span className="font-semibold">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{a.title || ''}</span>
                    <button
                      onClick={() => handleUnassignEmployee(activeProj.id, a.id, a.name)}
                      title="Unassign from project"
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">Individual Financial Attribution Ledger</span>
          <div className="border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                  <th className="p-3">Engineer & Designation</th>
                  <th className="p-3">Logged Hours</th>
                  <th className="p-3">Resource Cost</th>
                  <th className="p-3">Contribution Weight</th>
                  <th className="p-3">Attributed Value</th>
                  <th className="p-3 text-right">ROI Return</th>
                </tr>
              </thead>
              <tbody className="text-xs text-foreground/80 divide-y divide-border">
                {statsList.filter(s => s.totalHrs > 0 || s.emp.activeProject === selectedAttributionProject).map(item => {
                  const contribWeight = totalProjectHours > 0 ? (item.totalHrs / totalProjectHours) : 0;
                  const attributedVal = contractValue * contribWeight;
                  const roiMultiple = item.adjustedCost > 0 ? (attributedVal / item.adjustedCost) : 0;

                  return (
                    <tr key={item.emp.id} className="hover:bg-muted/10">
                      <td className="p-3">
                        <div className="font-extrabold text-foreground">{item.emp.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{item.emp.role}</div>
                      </td>
                      <td className="p-3 font-semibold">{item.totalHrs.toFixed(1)} hrs</td>
                      <td className="p-3 font-medium">Rs. {item.adjustedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-indigo-400">{(contribWeight * 100).toFixed(1)}%</span>
                          <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden border border-border/50">
                            <div className="bg-primary h-full" style={{ width: `${contribWeight * 100}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-extrabold text-muted-foreground">Rs. {(attributedVal / 100000).toFixed(2)} Lacs</td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                          roiMultiple > 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {roiMultiple > 0 ? `${roiMultiple.toFixed(1)}x ROI` : '0x'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- Detail pages -------------------------------------------------------
  // These render *inside* a portal's <main>, replacing the tab content, so the
  // sidebar stays put and it reads as a real page rather than a modal. Shared
  // by admin and lead (RBAC is enforced server-side by the analytics/assignment
  // endpoints, so the same view is safe for both).

  const DetailHeader = ({ icon, title, subtitle, crumb }) => (
    <div className="space-y-4 border-b border-border pb-5">
      <button
        onClick={goBackFromDetail}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to {crumb}</span>
      </button>
      <div className="flex items-center gap-4">
        {icon}
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground truncate">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  const renderUserDetailPage = () => {
    const a = viewingUserAnalytics;
    const myEntries = timeEntriesData.filter(e => e.user_id === viewingUser.id);
    const assignedProjectIds = new Set(myEntries.map(e => e.project_id).filter(Boolean));
    if (viewingUser.activeProject) assignedProjectIds.add(viewingUser.activeProject);
    const assignedProjects = projects.filter(p => assignedProjectIds.has(p.id));
    const idlePct = a ? Math.max(0, 100 - a.rollup.active_pct) : 0;
    // Team leads don't run the desktop agent, so activity analytics are always
    // empty/zero for them — show a lead-appropriate view (their team + the
    // projects they own) instead of a wall of meaningless 0s.
    const isLead = teamLeads.some(t => t.id === viewingUser.id);
    const managedEmployees = employees.filter(e => e.teamLeadId === viewingUser.id);
    const ledProjects = projects.filter(p => p.teamLeadId === viewingUser.id);

    return (
      <div className="space-y-8 animate-fade-in">
        <DetailHeader
          crumb={currentRole === 'admin' ? 'User Directory' : 'Team'}
          title={viewingUser.name}
          subtitle={`${isLead ? 'Team Lead' : (viewingUser.role || 'Employee')}${viewingUser.dept ? ` · ${viewingUser.dept}` : ''} · ${viewingUser.email}${viewingUser.phone ? ` · ${viewingUser.phone}` : ''}`}
          icon={
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-xl">
              {viewingUser.name?.[0]?.toUpperCase() || '?'}
            </div>
          }
        />

        {isLead && (
          <div className="space-y-6">
            <DecisionNote tone="info">
              {viewingUser.name} is a team lead. Team leads coordinate projects and people from the web console and don't run the desktop agent, so there's no activity telemetry for them — their team's activity is tracked individually below.
            </DecisionNote>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="p-6 rounded-xl bg-card border border-border">
                <SectionTitle>Team Members ({managedEmployees.length})</SectionTitle>
                {managedEmployees.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-3">No employees report to this lead yet.</p>
                ) : (
                  <div className="space-y-1.5 mt-3 max-h-80 overflow-y-auto">
                    {managedEmployees.map(e => (
                      <button key={e.id} onClick={() => openUserDetail(e)}
                        className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left hover:border-primary/40 transition-colors">
                        <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0">{e.name?.[0]?.toUpperCase() || '?'}</span>
                        <span className="min-w-0"><span className="block text-xs font-semibold text-foreground truncate">{e.name}</span><span className="block text-[10px] text-muted-foreground truncate">{e.role} · {e.email}</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <section className="p-6 rounded-xl bg-card border border-border">
                <SectionTitle>Projects Led ({ledProjects.length})</SectionTitle>
                {ledProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-3">No projects assigned to this lead.</p>
                ) : (
                  <div className="space-y-1.5 mt-3 max-h-80 overflow-y-auto">
                    {ledProjects.map(p => (
                      <button key={p.id} onClick={() => openProjectDetail(p)}
                        className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs hover:border-primary/40 transition-colors text-left">
                        <span className="font-semibold text-foreground truncate">{p.name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2 tabular-nums">Rs. {((p.contractValue || 0) / 1e7).toFixed(2)} Cr</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {!isLead && viewingUserBusy && !a && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        )}

        {!isLead && a && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatTile label="Active Hours (30d)" value={a.rollup.active_hours} accent="text-primary" />
              <StatTile label="Idle %" value={`${idlePct}%`} />
              <StatTile label="Avg Focus" value={a.rollup.avg_focus ?? '—'} accent={a.rollup.avg_focus >= 60 ? 'text-emerald-500' : a.rollup.avg_focus > 0 && a.rollup.avg_focus < 40 ? 'text-amber-500' : undefined} />
              <StatTile label="Input Density" value={a.rollup.avg_density ?? '—'} />
              <StatTile label="Anomalies" value={a.rollup.anomalies} accent={a.rollup.anomalies > 0 ? 'text-amber-500' : undefined} />
              <StatTile label="Last Seen" value={a.rollup.last_seen ? new Date(a.rollup.last_seen).toLocaleDateString() : 'Never'} small />
            </div>

            {a.productivity?.total > 0 && (() => {
              const p = a.productivity;
              const tone = p.productive_pct >= 60 ? 'good' : p.unproductive_pct >= 30 ? 'bad' : 'watch';
              return (
                <DecisionNote tone={tone}>
                  {p.productive_hours}h productive · {p.neutral_hours}h neutral · {p.unproductive_hours}h unproductive over 30 days
                  {a.rollup.avg_focus > 0 ? `, at an average focus score of ${a.rollup.avg_focus}/100.` : '.'}
                </DecisionNote>
              );
            })()}

            <section className="p-6 rounded-xl bg-card border border-border">
              <SectionTitle>Daily Active Hours (30d)</SectionTitle>
              <div className="h-56 w-full relative mt-3">
                {!a.trend?.length && <EmptyChart>No activity recorded in the last 30 days</EmptyChart>}
                <SizedChart>
                  <AreaChart data={a.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Area type="monotone" dataKey="active_hours" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Active Hours" />
                  </AreaChart>
                </SizedChart>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="p-6 rounded-xl bg-card border border-border">
                <SectionTitle>Productive vs Unproductive</SectionTitle>
                <div className="mt-3"><ProductivitySplit data={a.productivity} /></div>
              </section>
              <section className="p-6 rounded-xl bg-card border border-border">
                <SectionTitle>Working-Hours Pattern</SectionTitle>
                <div className="mt-3"><ActivityHeatmap data={a.heatmap} /></div>
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="p-6 rounded-xl bg-card border border-border">
                <SectionTitle>Apps Recorded</SectionTitle>
                {!a.top_apps?.length ? (
                  <p className="text-xs text-muted-foreground mt-3">No app data yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {a.top_apps.map(app => (
                      <span key={app.category} className="px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground/80">
                        {app.category} <span className="text-muted-foreground tabular-nums">({app.samples})</span>
                      </span>
                    ))}
                  </div>
                )}
              </section>
              <section className="p-6 rounded-xl bg-card border border-border">
                <SectionTitle>Assigned Projects</SectionTitle>
                {assignedProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-3">No projects assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {assignedProjects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => openProjectDetail(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="p-6 rounded-xl bg-card border border-border">
              <SectionTitle>Work Log</SectionTitle>
              {myEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-3">No logged time entries yet.</p>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden mt-3">
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-card z-10">
                        <tr className="border-b border-border bg-muted/30 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                          <th className="p-3">Date</th>
                          <th className="p-3">Project</th>
                          <th className="p-3">Hours</th>
                          <th className="p-3">Note</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-foreground/80 divide-y divide-border">
                        {myEntries.slice(0, 100).map(e => (
                          <tr key={e.id} className="hover:bg-muted/10">
                            <td className="p-3 whitespace-nowrap tabular-nums">{new Date(e.start_ts).toLocaleDateString()}</td>
                            <td className="p-3">{projects.find(p => p.id === e.project_id)?.name || 'Unassigned'}</td>
                            <td className="p-3 font-semibold tabular-nums">{Number(e.hours).toFixed(1)}</td>
                            <td className="p-3 text-muted-foreground">{e.note || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    );
  };

  const renderProjectDetailPage = () => {
    const entries = timeEntriesData.filter(e => e.project_id === viewingProject.id);
    const byEmployee = new Map();
    const byDay = new Map();
    for (const e of entries) {
      const hrs = Number(e.hours) || 0;
      const emp = byEmployee.get(e.user_id) || { hrs: 0, entries: 0 };
      emp.hrs += hrs; emp.entries += 1;
      byEmployee.set(e.user_id, emp);
      const day = new Date(e.start_ts).toLocaleDateString();
      byDay.set(day, (byDay.get(day) || 0) + hrs);
    }
    const dayTrend = Array.from(byDay.entries())
      .map(([day, hours]) => ({ day, hours: Math.round(hours * 10) / 10 }))
      .slice(-30);
    const totalHours = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);

    return (
      <div className="space-y-8 animate-fade-in">
        <DetailHeader
          crumb={currentRole === 'admin' ? 'Contribution ROI' : 'Projects'}
          title={viewingProject.name}
          subtitle={`${viewingProject.client ? `${viewingProject.client} · ` : ''}Rs. ${((viewingProject.contractValue || 0) / 10000000).toFixed(2)} Cr contract`}
          icon={
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <LayoutDashboard className="w-6 h-6" />
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile label="Total Logged Hours" value={totalHours.toFixed(1)} accent="text-primary" />
          <StatTile label="Assigned Employees" value={viewingProjectAssignments.length} />
          <StatTile label="Contributors Logged" value={byEmployee.size} />
        </div>

        <section className="p-6 rounded-xl bg-card border border-border">
          <SectionTitle>Hours by Day</SectionTitle>
          <div className="h-56 w-full relative mt-3">
            {!dayTrend.length && <EmptyChart>No hours logged against this project yet</EmptyChart>}
            <SizedChart>
              <BarChart data={dayTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={0} angle={-20} textAnchor="end" height={44} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="hours" fill="hsl(var(--chart-positive))" radius={[4, 4, 0, 0]} name="Hours" />
              </BarChart>
            </SizedChart>
          </div>
        </section>

        <section className="p-6 rounded-xl bg-card border border-border">
          <SectionTitle>Assigned Employees</SectionTitle>
          {viewingProjectAssignments.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-3">No employees assigned to this project.</p>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden mt-3 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Logged Hours</th>
                    <th className="p-3">Entries</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-foreground/80 divide-y divide-border">
                  {viewingProjectAssignments.map(as => {
                    const stats = byEmployee.get(as.id) || { hrs: 0, entries: 0 };
                    return (
                      <tr key={as.id} className="hover:bg-muted/10">
                        <td className="p-3">
                          <button
                            onClick={() => openUserDetail({ id: as.id, name: as.name, role: as.title, email: as.email, dept: as.dept })}
                            className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                          >
                            {as.name}
                          </button>
                        </td>
                        <td className="p-3 font-semibold tabular-nums">{stats.hrs.toFixed(1)}</td>
                        <td className="p-3 tabular-nums">{stats.entries}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderDetailPage = () =>
    viewingUser ? renderUserDetailPage() : viewingProject ? renderProjectDetailPage() : null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-foreground font-sans antialiased">
      
      {/* TOAST SYSTEM */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-slide-in-bottom">
          <div className={`px-5 py-3 rounded-xl border flex items-center space-x-3 shadow-2xl backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-muted/90 border-border text-foreground/80'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL — replaces window.confirm() */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-muted/70 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-xl border p-6 space-y-4 shadow-2xl bg-card ${confirmModal.danger ? 'border-red-500/30' : 'border-border'}`}>
            <div className="flex items-center space-x-2">
              {confirmModal.danger && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${confirmModal.danger ? 'text-red-400' : 'text-foreground'}`}>{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{confirmModal.message}</p>
            {confirmModal.requireTypedWord && (
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-semibold text-muted-foreground">Type {confirmModal.requireTypedWord} to confirm</label>
                <input
                  autoFocus
                  value={confirmTypedInput}
                  onChange={(e) => setConfirmTypedInput(e.target.value)}
                  className="w-full bg-background border border-red-500/30 rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                  placeholder={confirmModal.requireTypedWord}
                />
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => { setConfirmModal(null); setConfirmTypedInput(''); }}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={confirmModal.requireTypedWord && confirmTypedInput !== confirmModal.requireTypedWord}
                onClick={async () => {
                  const fn = confirmModal.onConfirm;
                  setConfirmModal(null);
                  setConfirmTypedInput('');
                  await fn();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  confirmModal.danger ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME / TEXT-PROMPT MODAL — replaces window.prompt() */}
      {renameModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-muted/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border p-6 space-y-4 shadow-2xl bg-card">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{renameModal.label}</h3>
            <input
              autoFocus
              value={renameModal.value}
              onChange={(e) => setRenameModal({ ...renameModal, value: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setRenameModal(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const fn = renameModal.onConfirm;
                  const val = renameModal.value;
                  setRenameModal(null);
                  await fn(val);
                }}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE / CHANGE PASSWORD MODAL */}
      {showProfile && (() => {
        const u = api.getUser() || {};
        return (
          <div className="fixed inset-0 z-50 bg-muted/70 flex items-center justify-center p-6" onClick={() => setShowProfile(false)}>
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                  <User className="w-4 h-4 text-primary" /><span>My Profile</span>
                </h3>
                <button onClick={() => setShowProfile(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Email</span><span className="text-foreground">{u.email}</span></div>
                <div className="flex justify-between"><span>Role</span><span className="text-foreground uppercase">{u.role}</span></div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-semibold text-muted-foreground">Display Name</label>
                <div className="flex gap-2">
                  <input value={profileName} onChange={(e) => setProfileName(e.target.value)}
                    className="flex-1 bg-background border border-border focus:border-primary rounded-xl px-3 py-2 text-xs text-foreground outline-none" />
                  <button onClick={saveProfileName} className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-[10px] font-semibold uppercase">Save</button>
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <label className="text-[9px] uppercase font-semibold text-muted-foreground">Change Password</label>
                <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="Current password"
                  className="w-full bg-background border border-border focus:border-primary rounded-xl px-3 py-2 text-xs text-foreground outline-none" />
                <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="New password (8+ chars)"
                  className="w-full bg-background border border-border focus:border-primary rounded-xl px-3 py-2 text-xs text-foreground outline-none" />
                <button onClick={changePassword} className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-[10px] font-semibold uppercase tracking-widest">Update Password</button>
              </div>
              {(u.role === 'admin' || u.role === 'lead') && <MfaSection showToast={showToast} />}
            </div>
          </div>
        );
      })()}

      {/* APPLE-STYLE MARKETING LANDING PAGE */}
      {currentRole === 'landing' && (
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-extrabold text-sm tracking-widest bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent uppercase">CHRONOTRACK</span>
              </div>
              <nav className="hidden md:flex items-center space-x-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                <a href="#about" className="hover:text-foreground transition-colors">Security</a>
                <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
              </nav>
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={() => setCurrentRole('login')}
                  className="px-4 py-2 bg-secondary hover:bg-muted text-foreground font-bold text-xs uppercase rounded-full border border-border transition-all duration-200"
                >
                  Console Access
                </button>
                <button
                  onClick={() => window.open('https://github.com/harsh-pandhe/ChronoTrack/releases/latest', '_blank', 'noopener')}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase rounded-full transition-all duration-200 active:scale-[0.98]"
                >
                  Download Agent
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                className="md:hidden p-2 rounded-lg border border-border bg-secondary text-foreground"
                aria-label="Toggle menu"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
            {mobileNavOpen && (
              <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-4 animate-fade-in">
                <nav className="flex flex-col space-y-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <a href="#features" onClick={() => setMobileNavOpen(false)} className="hover:text-foreground transition-colors">Features</a>
                  <a href="#about" onClick={() => setMobileNavOpen(false)} className="hover:text-foreground transition-colors">Security</a>
                  <a href="#contact" onClick={() => setMobileNavOpen(false)} className="hover:text-foreground transition-colors">Contact</a>
                </nav>
                <div className="flex flex-col space-y-3 pt-2">
                  <button
                    onClick={() => { setMobileNavOpen(false); setCurrentRole('login'); }}
                    className="w-full px-4 py-2.5 bg-secondary hover:bg-muted text-foreground font-bold text-xs uppercase rounded-full border border-border transition-all duration-200"
                  >
                    Console Access
                  </button>
                  <button
                    onClick={() => { setMobileNavOpen(false); window.open('https://github.com/harsh-pandhe/ChronoTrack/releases/latest', '_blank', 'noopener'); }}
                    className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase rounded-full transition-all duration-200 active:scale-[0.98]"
                  >
                    Download Agent
                  </button>
                </div>
              </div>
            )}
          </header>

          {/* Hero Section */}
          <section className="relative pt-32 pb-24 md:pt-40 md:pb-36 bg-dot-pattern max-w-7xl mx-auto px-6 text-center space-y-8 flex flex-col items-center">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-semibold uppercase tracking-widest">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Next-Gen Telemetry Pipeline</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground max-w-4xl leading-tight">
              Privacy-First Telemetry for <br />
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-blue-500 bg-clip-text text-transparent">High-Trust Teams</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
              Verify resource utilization, map project costs, and prevent profitability leaks with transparent desktop analytics. No keystroke content or screen content is ever recorded — only activity counts and window titles, with full employee consent.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => setCurrentRole('login')} 
                className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-full transition-all active:scale-[0.98]"
              >
                Access Work Console
              </button>
              <button
                onClick={() => setCurrentRole('employee')}
                className="w-full sm:w-auto px-8 py-3.5 bg-secondary hover:bg-muted text-foreground font-bold text-xs uppercase tracking-widest rounded-full border border-border transition-all"
              >
                Download Desktop App
              </button>
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="py-20 bg-background/40 border-t border-b border-border">
            <div className="max-w-7xl mx-auto px-6 space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-semibold text-foreground uppercase tracking-wider">Engine Capabilities</h2>
                <p className="text-xs text-muted-foreground max-w-xl mx-auto uppercase tracking-wide">Structured tracking features mapped directly to organizational workflows.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-xl bg-card border border-border space-y-4 hover:border-border transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-foreground">Non-Intrusive Polling</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Queries active window titles and maps keyboard/mouse events per interval. Does not capture sensitive inputs, logs, or tabs.
                  </p>
                </div>

                <div className="p-8 rounded-xl bg-card border border-border space-y-4 hover:border-border transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-foreground">At-Rest Database Encryption</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Telemetry logs are stored in a local SQLite file securely locked with AES-256 Fernet ciphers to prevent administrative data tampering.
                  </p>
                </div>

                <div className="p-8 rounded-xl bg-card border border-border space-y-4 hover:border-border transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-foreground">AI-Driven Anomaly Mapping</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Predictive models forecast idle benches and flag active outliers without disrupting employee focus.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section id="about" className="py-20 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground uppercase tracking-wider">High Trust Telemetry</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Organizations must operate at scale without compromising privacy. ChronoTrack replaces legacy screen recorders with metadata-driven pipelines. By tracking active applications and input density counters, it provides clear workforce analytics while preserving absolute employee safety.
              </p>
              <div className="space-y-3">
                {[
                  'Zero key-logging guarantees credential security',
                  'Local SQLite caches allow offline mapping capabilities',
                  'Fully signed installer targets for Linux, macOS & Windows'
                ].map((txt, idx) => (
                  <div key={idx} className="flex items-center space-x-3 text-xs text-foreground/80">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-xl bg-muted/40 border border-border space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Telemetry Profile</span>
                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">Active</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground space-y-2">
                <div>[SYSTEM] Initiating local daemon port check on 5050...</div>
                <div className="text-emerald-400">[SYSTEM] Connection secure. Auth token accepted.</div>
                <div>[DAEMON] Active Window: AutoCAD 2026 (Focus verified)</div>
                <div>[DAEMON] Keystrokes: 18 | Mouse Movements: 104</div>
                <div className="text-muted-foreground">[DAEMON] Encrypting SQLite telemetry block [AES-256]</div>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="py-20 bg-background/40 border-t border-border">
            <div className="max-w-xl mx-auto px-6 space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold text-foreground uppercase tracking-wider">Enterprise Inquiries</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Request a sandbox instance for your organization.</p>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Full Name</label>
                    <input 
                      type="text" 
                      value={contactName} 
                      onChange={(e) => setContactName(e.target.value)} 
                      className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Corporate Email</label>
                    <input 
                      type="email" 
                      value={contactEmail} 
                      onChange={(e) => setContactEmail(e.target.value)} 
                      className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors"
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Message</label>
                  <textarea 
                    rows="4" 
                    value={contactMsg} 
                    onChange={(e) => setContactMsg(e.target.value)} 
                    className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors resize-none"
                    placeholder="Describe your organization and requirement..."
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-xl transition-all"
                >
                  Submit Inquiry
                </button>
              </form>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-auto border-t border-border bg-background py-8 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
            ChronoTrack Telemetry Systems License MIT.
          </footer>
        </div>
      )}

      {/* SECURE CARD LOGIN PAGE */}
      {currentRole === 'login' && (
        <div className="min-h-screen flex items-center justify-center px-6 bg-muted/30">
          <div className="absolute top-5 right-5">
            <ThemeToggle />
          </div>
          <Card className="w-full max-w-md p-8 space-y-6 shadow-lg relative">
            <button
              onClick={() => setCurrentRole('landing')}
              className="absolute top-5 right-5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Back to home"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex p-2.5 bg-primary/10 rounded-xl text-primary">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{mfaChallenge ? 'Two-factor verification' : 'Sign in to ChronoTrack'}</h2>
              <p className="text-sm text-muted-foreground">{mfaChallenge ? 'Confirm your identity with your second factor.' : 'Access your workspace console.'}</p>
            </div>

            {mfaChallenge ? (
              <div className="space-y-5">
                {mfaChallenge.methods.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {mfaChallenge.methods.includes('passkey') && MFA_ON_ORIGIN && (
                      <button type="button" onClick={() => setMfaMethod('passkey')} className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${mfaMethod === 'passkey' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'}`}>Passkey</button>
                    )}
                    {mfaChallenge.methods.includes('totp') && (
                      <button type="button" onClick={() => setMfaMethod('totp')} className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${mfaMethod === 'totp' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'}`}>Authenticator</button>
                    )}
                  </div>
                )}

                {mfaMethod === 'passkey' && MFA_ON_ORIGIN ? (
                  <Button type="button" size="lg" className="w-full" disabled={mfaBusy} onClick={handlePasskeyLogin}>
                    {mfaBusy ? 'Waiting for passkey…' : 'Use a passkey'}
                  </Button>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleMfaVerify(mfaMethod === 'recovery' ? 'recovery' : 'totp', { code: mfaCode.trim() }); }} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="mfa-code">{mfaMethod === 'recovery' ? 'Recovery code' : '6-digit code'}</Label>
                      <Input id="mfa-code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)}
                        placeholder={mfaMethod === 'recovery' ? 'XXXX-XXXX-XXXX-XXXX' : '123456'}
                        inputMode={mfaMethod === 'recovery' ? 'text' : 'numeric'} autoComplete="one-time-code" autoFocus className="font-mono tracking-widest text-center" />
                    </div>
                    <Button type="submit" size="lg" className="w-full" disabled={mfaBusy || !mfaCode.trim()}>
                      {mfaBusy ? 'Verifying…' : 'Verify'}
                    </Button>
                  </form>
                )}

                {mfaError && (
                  <div className="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-center">{mfaError}</div>
                )}

                <div className="flex items-center justify-between text-xs">
                  {mfaChallenge.recovery && mfaMethod !== 'recovery' && (
                    <button type="button" onClick={() => { setMfaMethod('recovery'); setMfaError(''); }} className="text-muted-foreground hover:text-foreground">Use a recovery code</button>
                  )}
                  {mfaMethod === 'recovery' && mfaChallenge.methods.length > 0 && (
                    <button type="button" onClick={() => { setMfaMethod(mfaChallenge.methods[0]); setMfaError(''); }} className="text-muted-foreground hover:text-foreground">Back to {mfaChallenge.methods[0] === 'passkey' ? 'passkey' : 'authenticator'}</button>
                  )}
                  <button type="button" onClick={() => { setMfaChallenge(null); setMfaCode(''); setMfaError(''); }} className="text-muted-foreground hover:text-foreground ml-auto">Cancel</button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {/* Admin + Team Lead only — employees never sign into the web
                  console; they onboard through the desktop agent. */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Corporate email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {loginError && (
                <div className="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-center">
                  {loginError}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full">
                Sign in
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Are you an employee?{' '}
                <button type="button" onClick={() => setCurrentRole('employee')} className="text-primary font-medium hover:underline">
                  Get the desktop agent
                </button>
              </p>
            </form>
            )}
          </Card>
        </div>
      )}

      {/* ADMIN CONSOLE PORTAL (SIDEBAR LAYOUT) */}
      {currentRole === 'admin' && (
        <div className="min-h-screen flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col shrink-0">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-extrabold text-xs tracking-widest text-foreground uppercase">ADMIN PANEL</span>
              </div>
              <button onClick={handleLogout} className="p-1 text-muted-foreground hover:text-foreground transition-colors md:hidden">
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {[
                { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'users', label: 'User Directory', icon: Users },
                { id: 'contribution', label: 'Contribution ROI', icon: TrendingUp },
                { id: 'provision', label: 'Provision Keys', icon: Key },
                { id: 'rules', label: 'Productivity Rules', icon: Sliders },
                { id: 'audit', label: 'Immutable Audit', icon: Terminal }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase flex items-center space-x-3 transition-all ${
                    activeAdminTab === tab.id 
                      ? 'bg-primary/10 border border-primary/20 text-primary' 
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold uppercase tracking-wider">Session Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={openProfile}
                  className="px-2.5 py-1 bg-muted hover:bg-muted border border-border hover:text-foreground rounded-lg transition-all flex items-center space-x-1 uppercase text-[10px] font-bold">
                  <User className="w-3 h-3" /><span>Profile</span>
                </button>
                <button onClick={handleLogout}
                  className="px-2.5 py-1 bg-muted hover:bg-muted border border-border hover:text-foreground rounded-lg transition-all flex items-center space-x-1 uppercase text-[10px] font-bold">
                  <LogOut className="w-3 h-3" /><span>Logout</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-w-7xl 2xl:max-w-[96rem] mx-auto w-full">

            {/* A detail drill-down takes over the content area as a real page —
                the sidebar stays, so you keep your bearings and the Back button
                returns you to whichever tab you came from. */}
            {detailActive ? renderDetailPage() : (<>

            {/* Overview Panel with AI/ML Analytics */}
            {activeAdminTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Workspace Analytics</h2>
                    <p className="text-xs text-muted-foreground mt-1">Live utilisation, bench capacity, and project ROI from real telemetry.</p>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-full text-primary font-semibold uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Live Modeling: Active</span>
                  </div>
                </div>

                {serverAnalytics?.overview && serverAnalytics.overview.telemetry.samples === 0 && (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
                    <span>No telemetry yet. Create team leads &amp; employees, then have them install and activate the agent — analytics fill in automatically.</span>
                  </div>
                )}

                {/* Bento Grid KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-6 rounded-xl bg-card border border-border space-y-3 hover:border-border transition-all">
                    <span className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground block">Total Portfolio Revenue</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-semibold text-foreground">{serverAnalytics?.overview ? `Rs. ${(serverAnalytics.overview.portfolio.revenue/1e7).toFixed(2)} Cr` : '—'}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">real</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-3/4"></div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border space-y-3 hover:border-border transition-all">
                    <span className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground block">Total Resource Costs</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-semibold text-foreground">{serverAnalytics?.overview ? `Rs. ${(serverAnalytics.overview.portfolio.cost/1e7).toFixed(2)} Cr` : '—'}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">Actual (logged)</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[66%]"></div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border space-y-3 hover:border-border transition-all">
                    <span className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground block">Net Profit Margin</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-semibold text-foreground">
                        {serverAnalytics?.overview
                          ? (serverAnalytics.overview.portfolio.margin_pct == null ? 'No cost data yet' : `${serverAnalytics.overview.portfolio.margin_pct}%`)
                          : '—'}
                      </span>
                      {serverAnalytics?.overview?.portfolio.margin_pct != null && <span className="text-[10px] text-emerald-400 font-bold">real</span>}
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[85%]"></div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border space-y-3 hover:border-border transition-all">
                    <span className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground block">Idle Bench %</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-semibold text-foreground">{serverAnalytics?.overview ? `${serverAnalytics.overview.portfolio.bench_pct}%` : '—'}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{serverAnalytics?.overview ? `${serverAnalytics.overview.telemetry.active_hours}h active` : ''}</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full w-[96%]"></div>
                    </div>
                  </div>
                </div>

                {/* AI / ML Forecast Panel */}
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full font-semibold uppercase tracking-widest inline-block">Insights (Real Telemetry)</span>
                    <h3 className="text-sm font-extrabold text-foreground">Workforce Utilisation & Bench Capacity</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {serverAnalytics?.overview ? (() => {
                        const o = serverAnalytics.overview;
                        const top = o.categories && o.categories[0] ? o.categories[0].category : 'n/a';
                        return `Active utilisation ${o.telemetry.active_pct}% across ${o.headcount.employees} employee(s) — ${o.telemetry.active_hours}h logged over the last ${o.days}d. Idle bench ${o.portfolio.bench_pct}%. Most-used category: ${top}.`;
                      })() : 'Loading real telemetry insights…'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-center p-3.5 bg-card border border-border rounded-2xl w-24">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">Idle Bench</span>
                      <span className="text-sm font-semibold text-emerald-400">{serverAnalytics?.overview ? `${serverAnalytics.overview.portfolio.bench_pct}%` : '—'}</span>
                    </div>
                    <div className="text-center p-3.5 bg-card border border-border rounded-2xl w-24">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">Risk Status</span>
                      <span className="text-sm font-semibold text-primary">{serverAnalytics?.overview ? (serverAnalytics.overview.telemetry.active_pct < 40 ? 'HIGH' : serverAnalytics.overview.telemetry.active_pct < 70 ? 'MED' : 'LOW') : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Recharts Area / Bar / Pie Graphs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Daily Active Hours (last {serverAnalytics?.overview?.days || 7}d)</span>
                    <div className="h-64 w-full relative">
                      {!serverAnalytics?.overview?.trend?.length && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
                          No activity data yet
                        </div>
                      )}
                      <SizedChart>
                        <AreaChart data={serverAnalytics?.overview?.trend || []}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '12px', fontSize: '10px' }} />
                          <Area type="monotone" dataKey="active_hours" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} name="Active Hours" />
                        </AreaChart>
                      </SizedChart>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Activity by Category (samples)</span>
                    <div className="h-64 w-full relative">
                      {!serverAnalytics?.overview?.categories?.length && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
                          No activity data yet
                        </div>
                      )}
                      <SizedChart>
                        <BarChart data={serverAnalytics?.overview?.categories || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={0} angle={-20} textAnchor="end" height={50} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '12px', fontSize: '10px' }} />
                          <Bar dataKey="samples" fill="#10b981" radius={[4, 4, 0, 0]} name="Samples" />
                        </BarChart>
                      </SizedChart>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Category Share</span>
                    <div className="h-64 w-full relative">
                      {!serverAnalytics?.overview?.categories?.length && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
                          No activity data yet
                        </div>
                      )}
                      <SizedChart>
                        <PieChart>
                          <Pie
                            data={serverAnalytics?.overview?.categories || []}
                            dataKey="samples"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius="45%"
                            outerRadius="75%"
                            paddingAngle={2}
                          >
                            {(serverAnalytics?.overview?.categories || []).map((_, i) => (
                              <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '12px', fontSize: '10px' }} />
                          <Legend wrapperStyle={{ fontSize: '9px' }} formatter={(v) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{v}</span>} />
                        </PieChart>
                      </SizedChart>
                    </div>
                  </div>
                </div>

                {/* Productivity split + working-pattern heatmap — surfaces
                    ai_label (classified by the company's own Productivity Rules)
                    and the hour×weekday pattern, both collected all along but
                    never shown until now. */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Productive vs Unproductive</span>
                    <ProductivitySplit data={serverAnalytics?.overview?.productivity} />
                    {serverAnalytics?.overview?.productivity?.total > 0 && (() => {
                      const p = serverAnalytics.overview.productivity;
                      const tone = p.productive_pct >= 60 ? 'good' : p.unproductive_pct >= 30 ? 'bad' : 'watch';
                      return (
                        <DecisionNote tone={tone}>
                          {p.productive_pct}% of tracked activity is productive and {p.unproductive_pct}% unproductive by your current rules.
                          {p.unproductive_pct >= 30 ? ' Worth reviewing which apps are landing in the unproductive bucket.'
                            : p.productive_pct >= 60 ? ' Healthy split — the workforce is largely on-task.'
                            : ' A large neutral share — tighten the Productivity Rules to classify more of it.'}
                        </DecisionNote>
                      );
                    })()}
                  </div>
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Working-Hours Pattern</span>
                    <ActivityHeatmap data={serverAnalytics?.overview?.heatmap} />
                  </div>
                </div>

                {/* Portfolio by Team Lead — who owns what, and the return per lead. */}
                {serverAnalytics?.overview?.leads?.length > 0 && (
                  <div className="rounded-xl bg-card border border-border p-6 space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Portfolio by Team Lead</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[9px] uppercase text-muted-foreground border-b border-border">
                            <th className="py-2 font-semibold">Team Lead</th>
                            <th className="py-2 font-semibold">Projects</th>
                            <th className="py-2 font-semibold">Employees</th>
                            <th className="py-2 font-semibold">Revenue</th>
                            <th className="py-2 font-semibold">Resource Cost</th>
                            <th className="py-2 font-semibold">Return</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverAnalytics.overview.leads.map((l) => (
                            <tr key={l.lead_id} className="text-xs text-foreground/80 border-b border-border/40">
                              <td className="py-2.5 font-bold text-foreground">{l.lead_name}</td>
                              <td className="py-2.5">{l.projects}</td>
                              <td className="py-2.5">{l.employees}</td>
                              <td className="py-2.5">Rs. {(l.revenue / 1e7).toFixed(2)} Cr</td>
                              <td className="py-2.5">Rs. {(l.cost / 1e7).toFixed(2)} Cr</td>
                              <td className={`py-2.5 font-semibold ${l.roi == null ? 'text-muted-foreground' : l.roi >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {l.roi == null ? 'No cost yet' : `${l.roi}x`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Directory (CRUD Table) */}
            {activeAdminTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">User Directory & Assignments</h2>
                    <p className="text-xs text-muted-foreground mt-1">Manage corporate accounts, roles, and project mapping.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowAddLead(true); setShowAddForm(false); setShowEditForm(false); }}
                      className="px-4 py-2 bg-muted border border-border hover:text-foreground text-foreground/80 font-semibold text-xs uppercase tracking-widest rounded-full transition-all flex items-center space-x-1.5"
                    >
                      <Users className="w-4 h-4" />
                      <span>Add Team Lead</span>
                    </button>
                    <button
                      onClick={() => { setShowAddForm(true); setShowEditForm(false); setShowAddLead(false); }}
                      className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-full transition-all flex items-center space-x-1.5 active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Employee</span>
                    </button>
                  </div>
                </div>

                {/* Add Team Lead Dialog */}
                <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <DialogTitle className="text-sm uppercase tracking-widest text-foreground">Create Team Lead</DialogTitle>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Add a new lead who can manage their own team and projects.</p>
                        </div>
                      </div>
                    </DialogHeader>
                    <form onSubmit={handleAddLead} className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} placeholder="Full name" className="w-full bg-background border border-border focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-foreground outline-none" />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} placeholder="Corporate email" className="w-full bg-background border border-border focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-foreground outline-none" />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input type="tel" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} placeholder="Phone number (optional)" className="w-full bg-background border border-border focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-foreground outline-none" />
                        </div>
                        <div className="relative">
                          <LayoutDashboard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input value={leadForm.dept} onChange={(e) => setLeadForm({ ...leadForm, dept: e.target.value })} placeholder="Department" className="w-full bg-background border border-border focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-foreground outline-none" />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input type="password" value={leadForm.password} onChange={(e) => setLeadForm({ ...leadForm, password: e.target.value })} placeholder="Temp password (8+ chars)" className="w-full bg-background border border-border focus:border-primary rounded-xl pl-10 pr-4 py-3 text-xs text-foreground outline-none" />
                        </div>
                      </div>
                      <button type="submit" className="w-full px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-xl transition-all">Create Team Lead</button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Add Employee Dialog */}
                <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <DialogTitle className="text-sm uppercase tracking-widest text-foreground">Provision New User</DialogTitle>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Register an employee or team lead and assign their reporting line.</p>
                        </div>
                      </div>
                    </DialogHeader>
                    <form onSubmit={handleAddEmployee} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Account Type</label>
                        <select
                          value={empForm.userType}
                          onChange={(e) => setEmpForm({...empForm, userType: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        >
                          <option value="employee">Employee</option>
                          <option value="lead">Team Lead</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Full Name</label>
                        <input
                          type="text"
                          required
                          value={empForm.name}
                          onChange={(e) => setEmpForm({...empForm, name: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Corporate Email</label>
                        <input
                          type="email"
                          value={empForm.email}
                          onChange={(e) => setEmpForm({...empForm, email: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                          placeholder="name@chronotrack.app"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Phone (optional)</label>
                        <input
                          type="tel"
                          value={empForm.phone}
                          onChange={(e) => setEmpForm({...empForm, phone: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      {empForm.userType === 'lead' && (
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Temp Password (8+)</label>
                          <input
                            type="text"
                            value={empForm.password}
                            onChange={(e) => setEmpForm({...empForm, password: e.target.value})}
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                            placeholder="lead login password"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Designation / Role</label>
                        <input 
                          type="text" 
                          required
                          value={empForm.role} 
                          onChange={(e) => setEmpForm({...empForm, role: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                          placeholder="CAD Designer"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Department</label>
                        <select 
                          value={empForm.dept} 
                          onChange={(e) => setEmpForm({...empForm, dept: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        >
                          <option value="Civil Engineering">Civil Engineering</option>
                          <option value="Structural Design">Structural Design</option>
                          <option value="Site Planning">Site Planning</option>
                          <option value="Costing & Estimating">Costing & Estimating</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Assign Team Lead</label>
                        <select 
                          value={empForm.teamLeadId} 
                          onChange={(e) => setEmpForm({...empForm, teamLeadId: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        >
                          <option value="">Select team lead…</option>
                          {teamLeads.map(tl => (
                            <option key={tl.id} value={tl.id}>{tl.name} ({tl.dept})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Active Project</label>
                        <select 
                          value={empForm.activeProject} 
                          onChange={(e) => setEmpForm({...empForm, activeProject: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        >
                          <option value="">No project assigned</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Base Salary (Rs/mo)</label>
                        <input 
                          type="number" 
                          value={empForm.baseSalary} 
                          onChange={(e) => setEmpForm({...empForm, baseSalary: Number(e.target.value)})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        />
                      </div>
                    </div>
                    <button type="submit" disabled={savingEmployee} className="px-5 py-2.5 bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs uppercase tracking-widest rounded-xl transition-all">
                      {savingEmployee ? 'Adding…' : 'Add to Registry'}
                    </button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit Employee Dialog */}
                <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <Edit2 className="w-5 h-5" />
                        </div>
                        <div>
                          <DialogTitle className="text-sm uppercase tracking-widest text-foreground">Edit Employee Profile</DialogTitle>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{selectedEmp?.id}</p>
                        </div>
                      </div>
                    </DialogHeader>
                    <form onSubmit={handleEditEmployee} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Full Name</label>
                        <input
                          type="text"
                          required
                          value={empForm.name}
                          onChange={(e) => setEmpForm({...empForm, name: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Phone</label>
                        <input
                          type="tel"
                          value={empForm.phone}
                          onChange={(e) => setEmpForm({...empForm, phone: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Designation / Role</label>
                        <input 
                          type="text" 
                          required
                          value={empForm.role} 
                          onChange={(e) => setEmpForm({...empForm, role: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Department</label>
                        <select 
                          value={empForm.dept} 
                          onChange={(e) => setEmpForm({...empForm, dept: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        >
                          <option value="Civil Engineering">Civil Engineering</option>
                          <option value="Structural Design">Structural Design</option>
                          <option value="Site Planning">Site Planning</option>
                          <option value="Costing & Estimating">Costing & Estimating</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Team Lead</label>
                        <select 
                          value={empForm.teamLeadId} 
                          onChange={(e) => setEmpForm({...empForm, teamLeadId: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        >
                          <option value="">Select team lead…</option>
                          {teamLeads.map(tl => (
                            <option key={tl.id} value={tl.id}>{tl.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Active Project</label>
                        <select 
                          value={empForm.activeProject} 
                          onChange={(e) => setEmpForm({...empForm, activeProject: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        >
                          <option value="">No project assigned</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Account Status</label>
                        <select
                          value={empForm.status}
                          onChange={(e) => setEmpForm({...empForm, status: e.target.value})}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive (hasn't activated the desktop agent yet)</option>
                          <option value="Archived">Disabled</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="w-full px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-xl transition-all">
                      Update Profile
                    </button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Directory search */}
                <div className="relative">
                  <input
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    placeholder="Search by name, email, or department…"
                    className="w-full bg-card border border-border focus:border-primary rounded-xl pl-4 pr-4 py-2.5 text-xs text-foreground placeholder-zinc-600 outline-none"
                  />
                </div>

                {/* Directory Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                          <th className="p-4">Employee ID</th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Team Lead</th>
                          <th className="p-4">Active Project</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-foreground/80 divide-y divide-border">
                        {teamLeads.length === 0 && employees.length === 0 && (
                          <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users yet — add a team lead, then employees under them.</td></tr>
                        )}
                        {teamLeads.filter(l => { const q = dirSearch.trim().toLowerCase(); return !q || `${l.name} ${l.email || ''} ${l.dept || ''}`.toLowerCase().includes(q); }).map(lead => (
                          <tr key={lead.id} className="hover:bg-muted/30 transition-colors bg-primary/[0.03]">
                            <td className="p-4 font-mono font-bold text-muted-foreground">{lead.id.slice(0, 8)}</td>
                            <td className="p-4 font-extrabold text-foreground">
                              <button onClick={() => openUserDetail(lead)} className="hover:text-primary hover:underline transition-colors text-left">{lead.name}</button>
                            </td>
                            <td className="p-4"><span className="px-2 py-0.5 rounded text-[8px] font-semibold uppercase bg-primary/10 text-primary">Team Lead</span></td>
                            <td className="p-4 text-muted-foreground">—</td>
                            <td className="p-4 text-muted-foreground">{lead.dept || '—'}</td>
                            <td className="p-4">
                              <button onClick={() => toggleLeadAuthority(lead)} title="Toggle manage-employees authority"
                                className={`inline-flex px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${lead.canManage ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                {lead.canManage ? 'Can manage ✓' : 'No authority'}
                              </button>
                            </td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              <ToggleSwitch
                                checked={lead.status === 'Active'}
                                onChange={() => toggleLeadStatus(lead)}
                                title={lead.status === 'Active' ? 'Disable' : 'Enable'}
                              />
                              <button onClick={() => editLeadName(lead)} title="Edit" className="p-1.5 rounded-lg border border-border bg-muted hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteLead(lead.id, lead.name)} title="Delete permanently" className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                        {employees.filter(e => { const q = dirSearch.trim().toLowerCase(); return !q || `${e.name} ${e.email || ''} ${e.dept || ''} ${e.role || ''}`.toLowerCase().includes(q); }).map(emp => {
                          const tl = teamLeads.find(l => l.id === emp.teamLeadId);
                          const proj = projects.find(p => p.id === emp.activeProject);
                          return (
                            <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-4 font-mono font-bold text-muted-foreground">{emp.id.slice(0, 8)}</td>
                              <td className="p-4 font-extrabold text-foreground">
                                <button onClick={() => openUserDetail(emp)} className="hover:text-primary hover:underline transition-colors text-left">{emp.name}</button>
                              </td>
                              <td className="p-4 text-muted-foreground">{emp.role}</td>
                              <td className="p-4">{tl ? tl.name : '—'}</td>
                              <td className="p-4 font-semibold">{proj ? proj.name : '—'}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${
                                  emp.status === 'Active' 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {emp.status}
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                <ToggleSwitch
                                  checked={emp.status === 'Active'}
                                  onChange={() => toggleEmployeeStatus(emp)}
                                  title={emp.status === 'Active' ? 'Disable' : 'Enable'}
                                />
                                <button onClick={() => exportUserData(emp)} title="Export data (DPDP)"
                                  className="p-1.5 rounded-lg border border-border bg-muted hover:text-foreground transition-colors">
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => openEditForm(emp)} title="Edit"
                                  className="p-1.5 rounded-lg border border-border bg-muted hover:text-foreground transition-colors">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => purgeUserData(emp)} title="Erase data (DPDP)"
                                  className="p-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 transition-colors">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteEmployee(emp.id)} title="Delete permanently"
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeAdminTab === 'contribution' && renderContributionTab()}

            {/* Account Provisioning (Activation code generator) */}
            {activeAdminTab === 'provision' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Account Provisioning Console</h2>
                  <p className="text-xs text-muted-foreground mt-1">Generate dynamic keys to register standalone desktop clients and coordinate onboarding flows.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left input card */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Generate Activation Key</span>
                    <form onSubmit={generateActivationCode} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground">Employee</label>
                        <SearchSelect
                          items={employees}
                          value={provisionUserId}
                          onChange={setProvisionUserId}
                          placeholder="Search employees by name or email…"
                          getLabel={(e) => e.name}
                          getSub={(e) => e.email}
                          emptyText="No matching employees"
                        />
                        {employees.length === 0 && (
                          <p className="text-[9px] text-muted-foreground">No employees yet — create one in User Directory first.</p>
                        )}
                      </div>
                      <button type="submit" disabled={!provisionUserId} className="w-full py-3 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-xl transition-all">
                        Generate Key
                      </button>
                    </form>
                  </div>

                  {/* Middle pending activations list */}
                  <div className="md:col-span-2 p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Pending Registration Keys</span>
                    <p className="text-[10px] text-muted-foreground -mt-2">
                      Keys are only shown once, right after generating — codes are stored hashed and can't be
                      retrieved again later, so copy it before navigating away.
                    </p>
                    <div className="border border-border rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                            <th className="p-3">Candidate</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Activation Key</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs text-foreground/80 divide-y divide-border font-mono">
                          {pendingActivations.length === 0 && persistedPending.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-muted-foreground font-sans">No pending activation keys.</td></tr>
                          )}
                          {pendingActivations.map((p, idx) => (
                            <tr key={`session-${idx}`} className="hover:bg-muted/10">
                              <td className="p-3 font-sans font-extrabold text-foreground">{p.name}</td>
                              <td className="p-3 text-[10px] text-muted-foreground">{p.email}</td>
                              <td className="p-3 text-primary font-bold">{p.code}</td>
                              <td className="p-3">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${
                                  p.status === 'Active'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button onClick={() => handleRevokePendingCode(p.user_id, p.name)} title="Revoke code"
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {/* Persisted (across-reload) view — codes generated in an earlier
                              session are hashed at rest and can't be redisplayed, only
                              confirmed as still outstanding. */}
                          {persistedPending
                            .filter(p => !pendingActivations.some(s => s.email?.toLowerCase() === p.email?.toLowerCase()))
                            .map(p => (
                              <tr key={`persisted-${p.user_id}`} className="hover:bg-muted/10">
                                <td className="p-3 font-sans font-extrabold text-foreground">{p.name}</td>
                                <td className="p-3 text-[10px] text-muted-foreground">{p.email}</td>
                                <td className="p-3 text-muted-foreground text-[10px] italic">generated earlier — not recoverable</td>
                                <td className="p-3">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400">
                                    Pending
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button onClick={() => handleRevokePendingCode(p.user_id, p.name)} title="Revoke code"
                                    className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Productivity Rules */}
            {activeAdminTab === 'rules' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Productivity Keyword Configurator</h2>
                  <p className="text-xs text-muted-foreground mt-1">Configure whitelisted (productive) and blacklisted (unproductive) software triggers for telemetry activity ratings.</p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Add Rule Keyword</label>
                      <input 
                        type="text" 
                        value={newKeyword} 
                        onChange={(e) => setNewKeyword(e.target.value)} 
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                        placeholder="e.g. autocad, netflix, slither.io"
                      />
                    </div>
                    <div className="space-y-1.5 w-40">
                      <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Rule Category</label>
                      <select 
                        value={keywordTarget} 
                        onChange={(e) => setKeywordTarget(e.target.value)} 
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                      >
                        <option value="whitelist">Whitelist</option>
                        <option value="blacklist">Blacklist</option>
                      </select>
                    </div>
                    <button 
                      onClick={addKeyword}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-xl transition-all h-10 flex items-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Rule</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Whitelist keywords */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Whitelisted (Productive App Keywords)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {productiveKeywords.map(key => (
                        <div key={key} className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs text-muted-foreground flex items-center space-x-2">
                          <span className="font-mono">{key}</span>
                          <button onClick={() => removeKeyword(key, 'whitelist')} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blacklist keywords */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span>Blacklisted (Unproductive App Keywords)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {unproductiveKeywords.map(key => (
                        <div key={key} className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs text-muted-foreground flex items-center space-x-2">
                          <span className="font-mono">{key}</span>
                          <button onClick={() => removeKeyword(key, 'blacklist')} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Trail */}
            {activeAdminTab === 'audit' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Immutable System Audit Log Trail</h2>
                  <p className="text-xs text-muted-foreground mt-1">Read-only ledger logging access actions, manager key configurations, and telemetry events.</p>
                </div>

                <div className="bg-card border border-border p-6 rounded-xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span>Ledger Storage Block Feed</span>
                    </span>
                    <span className="text-[8px] bg-muted border border-border px-2.5 py-1 rounded-full text-muted-foreground font-bold uppercase">SECURED</span>
                  </div>

                  <div className="bg-muted/80 border border-border p-5 rounded-2xl font-mono text-[10px] text-muted-foreground space-y-2.5 max-h-96 overflow-y-auto">
                    {serverAuditLogs.length === 0 && <span className="text-muted-foreground">No audit events yet.</span>}
                    {serverAuditLogs.map(log => (
                      <div key={log.id} className="flex justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0 gap-3">
                        <span>[{new Date(log.ts).toLocaleString()}] <strong className="text-foreground/80">{log.actor_name || 'system'}:</strong> {log.action}{log.target ? ` (${resolveAuditTarget(log.target)})` : ''}</span>
                        <span className="text-muted-foreground shrink-0">{log.ip || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            </>)}
          </main>
        </div>
      )}

      {/* TEAM LEAD CONSOLE PORTAL */}
      {currentRole === 'tl' && (
        <div className="min-h-screen flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col shrink-0">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span className="font-extrabold text-xs tracking-widest text-foreground uppercase">TEAM LEAD PORTAL</span>
              </div>
              <button onClick={handleLogout} className="p-1 text-muted-foreground hover:text-foreground transition-colors md:hidden">
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {[
                { id: 'overview', label: 'Team Live Board', icon: LayoutDashboard },
                { id: 'contribution', label: 'Contribution ROI', icon: TrendingUp },
                { id: 'members', label: 'Telemetry Logs', icon: Clock },
                { id: 'manage', label: 'Manage Team & Projects', icon: Users }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTlTab(tab.id)}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase flex items-center space-x-3 transition-all ${
                    activeTlTab === tab.id 
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' 
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">TL Mode active</span>
              <button onClick={openProfile} className="px-2.5 py-1 bg-muted border border-border hover:text-foreground rounded-lg transition-all uppercase text-[10px] font-bold mr-2">
                Profile
              </button>
              <button onClick={handleLogout} className="px-2.5 py-1 bg-muted border border-border hover:text-foreground rounded-lg transition-all uppercase text-[10px] font-bold">
                Logout
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-w-7xl 2xl:max-w-[96rem] mx-auto w-full">

            {detailActive ? renderDetailPage() : (<>

            {activeTlTab === 'overview' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Team Activity & Uptime Live Board</h2>
                  <p className="text-xs text-muted-foreground mt-1">Real-time application polling and timesheet validations for assigned engineers.</p>
                </div>

                {/* Team charts — real telemetry */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Team Daily Active Hours</span>
                    <div className="h-56 w-full relative">
                      {!serverAnalytics?.team?.trend?.length && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
                          No activity data yet
                        </div>
                      )}
                      <SizedChart>
                        <AreaChart data={serverAnalytics?.team?.trend || []}>
                          <defs>
                            <linearGradient id="tlRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '12px', fontSize: '10px' }} />
                          <Area type="monotone" dataKey="active_hours" stroke="#3b82f6" fillOpacity={1} fill="url(#tlRev)" strokeWidth={2} name="Active Hours" />
                        </AreaChart>
                      </SizedChart>
                    </div>
                  </div>
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Per-Employee Active %</span>
                    <div className="h-56 w-full relative">
                      {!serverAnalytics?.team?.members?.length && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
                          No activity data yet
                        </div>
                      )}
                      <SizedChart>
                        <BarChart data={(serverAnalytics?.team?.members || []).map(m => ({ name: m.name.split(' ')[0], active_pct: m.active_pct }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={0} angle={-20} textAnchor="end" height={50} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '12px', fontSize: '10px' }} />
                          <Bar dataKey="active_pct" fill="#10b981" radius={[4, 4, 0, 0]} name="Active %" />
                        </BarChart>
                      </SizedChart>
                    </div>
                  </div>
                </div>

                {/* Team member status grid — real telemetry rollup (last 7 days) */}
                {(!serverAnalytics?.team?.members || serverAnalytics.team.members.length === 0) && (
                  <p className="text-xs text-muted-foreground">No team telemetry yet. Provision employees and have them activate the desktop agent.</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(serverAnalytics?.team?.members || []).map(m => (
                    <div key={m.id} onClick={() => openUserDetail({ id: m.id, name: m.name, role: m.title, email: m.email, phone: m.phone })} className="p-6 rounded-xl bg-card border border-border space-y-4 hover:border-primary/40 transition-all cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-extrabold text-foreground">{m.name}</h3>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">{m.title || 'Employee'}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${
                          m.active_pct >= 50 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>{m.active_pct}% active</span>
                      </div>
                      <div className="space-y-2 border-t border-b border-border/40 py-3 font-mono text-[10px] text-muted-foreground">
                        <div className="flex justify-between"><span>Active hours (7d):</span><span className="text-foreground font-semibold">{m.active_hours}h</span></div>
                        <div className="flex justify-between"><span>Samples:</span><span className="text-foreground">{m.samples}</span></div>
                        <div className="flex justify-between"><span>Anomalies:</span><span className={m.anomalies > 0 ? 'text-amber-400' : 'text-emerald-400'}>{m.anomalies}</span></div>
                        <div className="flex justify-between"><span>Last seen:</span><span className="text-foreground font-sans">{m.last_seen ? new Date(m.last_seen).toLocaleString() : 'never'}</span></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground font-bold uppercase">Cost rate</span>
                        <span className="font-semibold text-foreground">Rs. {Math.round(m.hourly_cost)}/hr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTlTab === 'members' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Detailed Team Telemetry Logs</h2>
                  <p className="text-xs text-muted-foreground mt-1">Review verified active application logs, keystroke/pointer densities, and manual inputs.</p>
                </div>

                {/* Team idle/focus + most-used apps summary. */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="p-6 rounded-xl bg-card border border-border space-y-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Team Idle (last 7d)</span>
                    <span className="text-3xl font-semibold text-amber-400">{serverAnalytics?.team?.idle?.idle_pct ?? '—'}%</span>
                    <p className="text-[10px] text-muted-foreground">{serverAnalytics?.team?.idle?.idle_hours ?? 0}h idle across {serverAnalytics?.team?.idle?.samples ?? 0} samples</p>
                  </div>
                  <div className="p-6 rounded-xl bg-card border border-border space-y-3 lg:col-span-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Most-Used Applications</span>
                    {(serverAnalytics?.team?.top_apps?.length || 0) === 0 ? (
                      <p className="text-xs text-muted-foreground">No activity data yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {serverAnalytics.team.top_apps.map((a, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-muted border border-border text-[10px] text-foreground/80">
                            <span className="font-bold text-foreground">{a.category || 'uncategorised'}</span>
                            <span className="text-muted-foreground"> · {a.samples}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Per-employee → per-project logged hours drill-down. */}
                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">Hours by Employee &amp; Project</span>
                  {(serverAnalytics?.team?.project_hours?.length || 0) === 0 ? (
                    <p className="text-xs text-muted-foreground">No project hours logged yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[9px] uppercase text-muted-foreground border-b border-border">
                            <th className="py-2 font-semibold">Employee</th>
                            <th className="py-2 font-semibold">Project</th>
                            <th className="py-2 font-semibold text-right">Hours</th>
                            <th className="py-2 font-semibold text-right">Resource Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverAnalytics.team.project_hours.map((ph, i, arr) => {
                            const firstForUser = i === 0 || arr[i - 1].user_id !== ph.user_id;
                            return (
                              <tr key={i} className="text-xs text-foreground/80 border-b border-border/40">
                                <td className="py-2.5 font-bold text-foreground">{firstForUser ? ph.user_name : ''}</td>
                                <td className="py-2.5">{ph.project_name || <span className="text-muted-foreground">Unassigned</span>}</td>
                                <td className="py-2.5 text-right font-mono">{Number(ph.hours).toFixed(1)}h</td>
                                <td className="py-2.5 text-right font-mono text-muted-foreground">Rs. {Math.round(ph.cost).toLocaleString('en-IN')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">Raw Telemetry Ledger (latest {serverTelemetryFeed.length})</span>
                  {serverTelemetryFeed.length === 0 && <p className="text-xs text-muted-foreground">No telemetry yet — employees need to activate the desktop agent.</p>}
                  <div className="border border-border rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                          <th className="p-3">Time</th>
                          <th className="p-3">Member</th>
                          <th className="p-3">Active Window</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Density</th>
                          <th className="p-3 text-right">State</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-foreground/80 divide-y divide-border">
                        {serverTelemetryFeed.map((l, i) => (
                          <tr key={i} className="hover:bg-muted/10">
                            <td className="p-3 font-mono text-[10px] text-muted-foreground">{new Date(l.ts).toLocaleTimeString()}</td>
                            <td className="p-3 font-extrabold text-foreground">{l.employee}</td>
                            <td className="p-3 text-muted-foreground font-medium truncate max-w-[220px]">{l.window_title}</td>
                            <td className="p-3 font-mono text-[10px]">{l.app_category}</td>
                            <td className="p-3 font-bold text-indigo-400">{l.input_density}</td>
                            <td className="p-3 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[8px] border font-semibold uppercase tracking-wider ${
                                l.anomaly_flag ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : l.is_idle ? 'bg-muted text-muted-foreground border-border'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                {l.anomaly_flag ? 'anomaly' : l.is_idle ? 'idle' : 'active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTlTab === 'contribution' && renderContributionTab()}

            {activeTlTab === 'manage' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Manage Team & Projects</h2>
                  <p className="text-xs text-muted-foreground mt-1">Provision new employee nodes, generate workspace access credentials, and register contracts.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Issue a code to an EXISTING employee — separate from creating
                      a new one, so a lead doesn't have to fake a new account just to
                      re-issue an activation code to someone already on their team. */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Issue Activation Code</span>
                    <p className="text-[10px] text-muted-foreground -mt-2">For an employee who's already on your team.</p>
                    <form onSubmit={generateActivationCode} className="space-y-3">
                      <SearchSelect
                        items={employees}
                        value={provisionUserId}
                        onChange={setProvisionUserId}
                        placeholder="Search your employees…"
                        getLabel={(e) => e.name}
                        getSub={(e) => e.email}
                        emptyText="No employees on your team yet"
                      />
                      <button type="submit" disabled={!provisionUserId} className="w-full py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        Generate Code
                      </button>
                    </form>
                  </div>

                  {/* Register Employee Form — only shown if this lead actually has
                      authority to add employees; otherwise they'd fill out the whole
                      form only to be rejected by the server at submit time. */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Create New Employee Account</span>
                    {!api.getUser()?.can_manage_employees ? (
                      <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 text-xs text-muted-foreground flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>You don't have permission to add employees yet. Ask your admin to grant "Can Manage" authority for your account.</span>
                      </div>
                    ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newEmpName || !newEmpEmail) {
                        showToast('Please fill out all fields.', 'error');
                        return;
                      }
                      try {
                        // Backend assigns this employee under the logged-in lead.
                        const created = await api.users.create({
                          name: newEmpName,
                          email: newEmpEmail,
                          role: 'employee',
                          title: newEmpRole,
                          dept: newEmpDept,
                          active_project_id: newEmpProject || null,
                          base_salary: parseFloat(newEmpSalary) || 0,
                          benefits: parseFloat(newEmpBenefits) || 0,
                          avg_hours: 160,
                        });
                        const { code } = await api.activation.generate(created.id);
                        await loadServerData();
                        showToast(`Registered! Activation key (shown once): ${code}`, 'success');
                        setNewEmpName('');
                        setNewEmpEmail('');
                      } catch (err) {
                        showToast(err.message || 'Failed to register employee.', 'error');
                      }
                    }} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground">Employee Name</label>
                        <input
                          type="text"
                          required
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          placeholder="e.g. Rajesh Kumar"
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-semibold text-muted-foreground">Corporate Email</label>
                        <input
                          type="email"
                          required
                          value={newEmpEmail}
                          onChange={(e) => setNewEmpEmail(e.target.value)}
                          placeholder="e.g. rajesh@chronotrack.app"
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-semibold text-muted-foreground">Base Salary (Rs/mo)</label>
                          <input
                            type="number"
                            required
                            value={newEmpSalary}
                            onChange={(e) => setNewEmpSalary(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-semibold text-muted-foreground">Benefits (Rs/mo)</label>
                          <input
                            type="number"
                            required
                            value={newEmpBenefits}
                            onChange={(e) => setNewEmpBenefits(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-semibold text-muted-foreground">Role Designation</label>
                          <input
                            type="text"
                            value={newEmpRole}
                            onChange={(e) => setNewEmpRole(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-semibold text-muted-foreground">Active Project</label>
                          <select
                            value={newEmpProject}
                            onChange={(e) => setNewEmpProject(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
                          >
                            <option value="">No project assigned</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs uppercase tracking-widest rounded-xl transition-all">
                        Generate ID & Activate Key
                      </button>
                    </form>
                    )}
                  </div>

                  {/* Projects are created by the admin and assigned to a lead;
                      a lead assigns their own employees onto those projects. */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-3">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Your Projects</span>
                    <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                      <span>Projects are set up by your administrator and assigned to you. Once assigned, they appear in your Team Board and Contribution ROI, where you can allocate your employees to them.</span>
                    </div>
                    {projects.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">No projects assigned to you yet — ask your admin to assign one.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {projects.map((p) => (
                          <button key={p.id} onClick={() => openProjectDetail(p)}
                            className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs hover:border-primary/40 transition-colors text-left">
                            <span className="font-semibold text-foreground truncate">{p.name}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">Rs. {((p.contractValue || 0) / 1e7).toFixed(2)} Cr</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            </>)}
          </main>
        </div>
      )}

      {/* EMPLOYEE CLIENT INTERACTION BOARD (STANDALONE DESKTOP VIEW) */}
      {currentRole === 'employee' && (() => {
        const isElectron = window.navigator.userAgent.toLowerCase().includes('electron') || !!window.electronAPI;
        return (
          <div className="min-h-screen flex flex-col bg-background">
            {!isElectron ? (
              /* WEB DOWNLOADER PORTAL FOR EMPLOYEE ONBOARDING */
              <div className="flex-grow flex flex-col">
                {/* Web Header */}
                <header className="px-6 h-16 border-b border-border bg-card flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Laptop className="w-5 h-5 text-primary" />
                    <span className="font-extrabold text-xs text-foreground uppercase tracking-wider">ChronoTrack Web Portal</span>
                  </div>
                  <button onClick={handleLogout} className="px-3 py-1 bg-muted hover:bg-muted border border-border text-muted-foreground hover:text-foreground rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all">
                    {api.getToken() ? 'Sign Out' : 'Back to Home'}
                  </button>
                </header>

                <main className="flex-grow max-w-4xl mx-auto w-full p-6 md:p-8 flex flex-col justify-center space-y-8 my-auto">
                  <div className="text-center space-y-3">
                    <div className="inline-flex p-3.5 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
                      <Download className="w-6 h-6 animate-bounce" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground uppercase tracking-wider">Workstation Onboarding Portal</h1>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      To start syncing logged timesheet hours and accessing project details, please download and run the background telemetry agent.
                    </p>
                  </div>

                  {/* Activation Key Banner */}
                  <div className="p-6 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] font-semibold uppercase text-indigo-400 block tracking-wider">Step 1: Secure Activation Key</span>
                      <p className="text-xs text-muted-foreground">Use this unique key when launching the desktop app for the first time.</p>
                    </div>
                    <div className="bg-background border border-border/80 px-6 py-3 rounded-2xl font-mono text-xs text-muted-foreground tracking-wide">
                      Use the 8-digit code your admin emailed you
                    </div>
                  </div>

                  {/* Downloader Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { os: 'Windows Agent', ext: 'exe', size: '96 MB', icon: Laptop, desc: 'NSIS installer with the bundled telemetry daemon — no Python needed.', file: 'https://github.com/harsh-pandhe/ChronoTrack/releases/latest/download/ChronoTrackAgent.Setup.3.0.0.exe' },
                      { os: 'macOS Agent', ext: 'Client.dmg', size: '52 MB', icon: Globe, desc: 'Includes Apple Silicon and Intel universal bundle configurations.', file: null },
                      { os: 'Linux (AppImage)', ext: 'AppImage', size: '132 MB', icon: HardDrive, desc: 'Self-contained portable executable. chmod +x and run — no install needed.', file: 'https://github.com/harsh-pandhe/ChronoTrack/releases/latest/download/ChronoTrackAgent-3.0.0.AppImage' },
                      { os: 'Linux (.deb)', ext: 'deb', size: '94 MB', icon: HardDrive, desc: 'Debian/Ubuntu package. Installs to your app menu like any native app.', file: 'https://github.com/harsh-pandhe/ChronoTrack/releases/latest/download/chronotrack_3.0.0_amd64.deb' }
                    ].map(dl => (
                      <div key={dl.os} className="p-6 rounded-xl bg-card border border-border hover:border-border transition-all flex flex-col justify-between h-56">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-primary">
                            <dl.icon className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase text-foreground tracking-wider">{dl.os}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{dl.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!dl.file) {
                              showToast(`${dl.os} build not available yet.`, 'info');
                              return;
                            }
                            // Navigate to the GitHub Release asset (served as attachment).
                            window.open(dl.file, '_blank', 'noopener');
                            showToast(`Downloading ChronoTrack ${dl.os}…`, 'success');
                          }}
                          className="w-full py-2.5 bg-muted border border-border hover:bg-muted hover:text-foreground text-foreground/80 text-[10px] font-semibold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download .{dl.ext}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-muted/40 border border-border/60 rounded-2xl flex items-start space-x-3 text-[11px] text-muted-foreground">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Auto-Start Policy:</strong> Once installed, the client app configures a local startup lock task. The agent daemon boots automatically on system launch, verifying connectivity on local loopback port 5050.
                    </p>
                  </div>
                </main>
              </div>
            ) : (
              <div className="flex-grow flex flex-col">
                {/* Header */}
                <header className="px-6 h-16 border-b border-border bg-card flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Laptop className="w-5 h-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-extrabold text-xs text-foreground uppercase tracking-wider">ChronoTrack Desktop Agent</span>
                      <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Version {APP_VERSION}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`w-2 h-2 rounded-full ${localDaemonState.online ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {localDaemonState.online ? 'Daemon Active (Port 5050)' : 'Daemon Offline'}
                    </span>
                    {desktopActivated && (
                      <button
                        onClick={handleDesktopSignOut}
                        className="px-3 py-1 bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        <LogOut className="w-3 h-3" /> Sign Out
                      </button>
                    )}
                    <button
                      onClick={handleExitAgent}
                      className="px-3 py-1 bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all"
                    >
                      Exit Agent
                    </button>
                  </div>
                </header>

          {!desktopActivated ? (
            /* ONBOARDING ACTIVATION CARD */
            <div className="flex-1 flex items-center justify-center p-6 bg-dot-pattern">
              <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
                    <Laptop className="w-6 h-6 animate-bounce" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground uppercase tracking-wider">Desktop Agent Onboarding</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verify consent permissions and connect your local workspace node with the corporate Vercel database cloud.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-muted/50 border border-border rounded-xl">
                    <input 
                      type="checkbox" 
                      id="perm_input"
                      checked={grantedPermissions.input}
                      onChange={(e) => setGrantedPermissions({...grantedPermissions, input: e.target.checked})}
                      className="mt-1 accent-primary" 
                    />
                    <label htmlFor="perm_input" className="text-[11px] text-foreground/80 font-medium">
                      <strong>Input Counters Consent:</strong> Record keystroke and mouse movement counts in 30s buckets. No logs of input contents.
                    </label>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-muted/50 border border-border rounded-xl">
                    <input 
                      type="checkbox" 
                      id="perm_focus"
                      checked={grantedPermissions.startup}
                      onChange={(e) => setGrantedPermissions({...grantedPermissions, startup: e.target.checked})}
                      className="mt-1 accent-primary" 
                    />
                    <label htmlFor="perm_focus" className="text-[11px] text-foreground/80 font-medium">
                      <strong>Window Focus Tracking:</strong> Monitor active foreground window titles to verify productive tasks.
                    </label>
                  </div>
                </div>

                <form onSubmit={handleActivateDesktop} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Corporate Email</label>
                    <input
                      type="email"
                      required
                      value={activationEmailInput}
                      onChange={(e) => setActivationEmailInput(e.target.value)}
                      placeholder="you@chronotrack.app"
                      className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">8-Digit Activation Code</label>
                    <input
                      type="text"
                      required
                      value={activationCodeInput}
                      onChange={(e) => setActivationCodeInput(e.target.value)}
                      placeholder="00000000"
                      className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none uppercase font-mono"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!grantedPermissions.input || !grantedPermissions.startup}
                    className="w-full py-3 bg-primary hover:bg-primary/95 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground font-semibold text-xs uppercase tracking-widest rounded-xl transition-all"
                  >
                    Activate Workspace Node
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* ACTIVE WORKSPACE CLIENT CONSOLE */
            <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
              
              {/* Connected Banner */}
              <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground uppercase tracking-wider">Active Workspace Telemetry</h2>
                  <p className="text-xs text-muted-foreground mt-1">This node is verified and syncing logs securely with the Cloud Database.</p>
                </div>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-full flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Syncing Live Logs</span>
                </span>
              </div>

              {/* My Productivity — employee's own data (transparency self-view) */}
              <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>My Productivity (last 7 days) — your data, transparent</span>
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-background border border-border">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Active %</span>
                    <span className="text-xl font-semibold text-emerald-400">{selfAnalytics?.rollup?.active_pct ?? '—'}%</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-background border border-border">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Active Hours</span>
                    <span className="text-xl font-semibold text-foreground">{selfAnalytics?.rollup?.active_hours ?? '—'}h</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-background border border-border">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Samples</span>
                    <span className="text-xl font-semibold text-foreground">{selfAnalytics?.rollup?.samples ?? '—'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-background border border-border">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">Flagged</span>
                    <span className="text-xl font-semibold text-amber-400">{selfAnalytics?.rollup?.anomalies ?? '—'}</span>
                  </div>
                </div>
                <div className="h-44 w-full relative">
                  {!selfAnalytics?.trend?.length && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
                      No activity data yet
                    </div>
                  )}
                  <SizedChart>
                    <AreaChart data={selfAnalytics?.trend || []}>
                      <defs>
                        <linearGradient id="selfRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '12px', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="active_hours" stroke="#10b981" fillOpacity={1} fill="url(#selfRev)" strokeWidth={2} name="Active Hours" />
                    </AreaChart>
                  </SizedChart>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Live Console Tracking Details */}
                <div className="md:col-span-2 p-6 rounded-xl bg-card border border-border space-y-4">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-primary animate-pulse" />
                    <span>Real-Time Local Tracking Event Log</span>
                  </span>

                  <div className="bg-background border border-border p-5 rounded-2xl font-mono text-[10px] text-muted-foreground space-y-2.5 max-h-48 overflow-y-auto">
                    {telemetryTicker.map((t, idx) => (
                      <div key={idx} className="flex justify-between border-b border-border/30 pb-2 last:border-0 last:pb-0">
                        <span>[{t.time}] {t.event}</span>
                        <span className="text-emerald-500">[encrypted]</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="p-4 bg-muted/50 border border-border/80 rounded-2xl text-center">
                      <span className="text-[8px] uppercase font-bold text-muted-foreground block">Active App</span>
                      <span className="text-xs font-extrabold text-foreground mt-1 block truncate">{localDaemonState.activeWindow}</span>
                    </div>
                    <div className="p-4 bg-muted/50 border border-border/80 rounded-2xl text-center">
                      <span className="text-[8px] uppercase font-bold text-muted-foreground block">Keystroke Count</span>
                      <span className="text-xs font-mono font-bold text-indigo-400 mt-1 block">{localDaemonState.keystrokes}</span>
                    </div>
                    <div className="p-4 bg-muted/50 border border-border/80 rounded-2xl text-center">
                      <span className="text-[8px] uppercase font-bold text-muted-foreground block">Mouse Count</span>
                      <span className="text-xs font-mono font-bold text-indigo-400 mt-1 block">{localDaemonState.mouseMovements}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Validation & Cloud Sync */}
                <div className="space-y-6">
                  {/* Visual timeline allocation — assign real tracked blocks to projects. */}
                  {showVerificationPrompt && (
                    <div className="flex items-center justify-between px-1 text-[10px] text-indigo-300/80">
                      <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Time to log your hours — allocate your tracked blocks below.</span>
                      <button onClick={() => setShowVerificationPrompt(false)} className="text-muted-foreground hover:text-foreground uppercase font-semibold">Dismiss</button>
                    </div>
                  )}
                  <TimelineAllocator
                    showToast={showToast}
                    onLogged={async () => {
                      try { setSelfAnalytics(await api.analytics.employee(null, 7)); } catch { /* non-fatal */ }
                      reloadMyTimeEntries();
                    }}
                  />

                  {/* Right Cloud Database Sync Log status — real, from the daemon's /api/status, never simulated */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <Server className="w-4 h-4 text-indigo-400" />
                      <span>Cloud Sync Status</span>
                    </span>

                    <div className="space-y-3">
                      {!cloudSyncStatus.checked ? (
                        <div className="p-3 bg-muted/50 border border-border/40 rounded-xl text-[10px] text-muted-foreground">
                          Checking connection to the cloud database…
                        </div>
                      ) : cloudSyncStatus.lastError ? (
                        <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl space-y-1">
                          <div className="flex justify-between font-bold text-[10px]">
                            <span className="text-red-400">Not syncing</span>
                          </div>
                          <p className="text-[10px] text-red-300/80">{cloudSyncStatus.lastError}</p>
                          {cloudSyncStatus.pendingSync != null && cloudSyncStatus.pendingSync > 0 && (
                            <p className="text-[9px] text-muted-foreground">{cloudSyncStatus.pendingSync} record(s) waiting to upload — kept safely on this device, not lost.</p>
                          )}
                        </div>
                      ) : cloudSyncStatus.lastSuccessAt ? (
                        <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-1">
                          <div className="flex justify-between font-bold text-[10px]">
                            <span className="text-emerald-400">Synced</span>
                            <span className="text-muted-foreground">{new Date(cloudSyncStatus.lastSuccessAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {cloudSyncStatus.pendingSync ? `${cloudSyncStatus.pendingSync} record(s) queued for the next sync.` : 'All recorded activity is up to date in the cloud.'}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-muted/50 border border-border/40 rounded-xl text-[10px] text-muted-foreground">
                          No successful sync yet on this device.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* My Logged Time — historical entries, not just today's blocks. */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <History className="w-4 h-4 text-indigo-400" />
                      <span>My Logged Time</span>
                    </span>
                    {myTimeEntries.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">No logged time entries yet.</p>
                    ) : (
                      <div className="border border-border rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-card">
                            <tr className="border-b border-border bg-muted/30 text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Project</th>
                              <th className="p-2.5">Hours</th>
                              <th className="p-2.5">Note</th>
                            </tr>
                          </thead>
                          <tbody className="text-[10px] text-foreground/80 divide-y divide-border">
                            {myTimeEntries.slice(0, 50).map(e => (
                              <tr key={e.id}>
                                <td className="p-2.5 whitespace-nowrap">{new Date(e.start_ts).toLocaleDateString()}</td>
                                <td className="p-2.5">{projects.find(p => p.id === e.project_id)?.name || 'Unassigned'}</td>
                                <td className="p-2.5 font-semibold">{Number(e.hours).toFixed(1)}</td>
                                <td className="p-2.5 text-muted-foreground truncate max-w-[140px]">{e.note || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Privacy & Consent — review status, withdraw at any time (DPDP). */}
                  <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <ShieldOff className="w-4 h-4 text-indigo-400" />
                      <span>Privacy & Consent</span>
                    </span>
                    {!myConsent ? (
                      <p className="text-[10px] text-muted-foreground">No consent record found yet.</p>
                    ) : myConsent.withdrawn_at ? (
                      <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-red-400">Consent withdrawn</span>
                        <p className="text-[10px] text-red-300/80">Monitoring stopped on {new Date(myConsent.withdrawn_at).toLocaleString()}.</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-emerald-400">Consent granted (v{myConsent.consent_version})</span>
                          <p className="text-[10px] text-muted-foreground">Since {new Date(myConsent.granted_at).toLocaleString()}. Only activity counts and window titles are recorded — never keystroke content or screen content.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleWithdrawConsent}
                          className="w-full py-2 bg-muted border border-red-500/20 text-red-400 hover:bg-red-500/10 text-[10px] font-semibold uppercase tracking-wider rounded-xl transition-all"
                        >
                          Withdraw Consent
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>

            </main>
          )}
          </div>
          )}
          </div>
        );
      })()}

    </div>
  );
}

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import {
  Activity as ActivityIcon,
  ArrowLeft,
  ArrowRight,
  Bot as BotIcon,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Code2,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileCode2,
  FileJson2,
  FileText,
  Folder,
  Gauge,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  PanelLeft,
  Play,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Square,
  Terminal,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetAuthStatusQueryKey,
  getGetBotQueryKey,
  getGetDashboardSummaryQueryKey,
  getListActivityQueryKey,
  getListBotFilesQueryKey,
  getListBotsQueryKey,
  getListToolsQueryKey,
  getReadBotFileQueryKey,
  useCreateBot,
  useDeleteBot,
  useDeleteBotToken,
  useGetAuthStatus,
  useGetBot,
  useGetDashboardSummary,
  useListActivity,
  useListBotFiles,
  useListBots,
  useListTools,
  useLogin,
  useLogout,
  useReadBotFile,
  useSaveBotToken,
  useStartBot,
  useStopBot,
  useUpdateBot,
  useWriteBotFile,
} from '@workspace/api-client-react';
import type {
  Activity,
  Bot,
  BotDetail,
  BotFile,
  DashboardSummary,
  Tool,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import '@/index.css';

const queryClient = new QueryClient();

const iconForFile = (file: BotFile) => {
  if (file.kind === 'directory') return <Folder size={16} />;
  if (file.language === 'json') return <FileJson2 size={16} />;
  if (file.language === 'typescript' || file.language === 'javascript') return <FileCode2 size={16} />;
  return <FileText size={16} />;
};

const relativeTime = (value?: string) => {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
};

function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-logo">
      <div className="relative grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/.22)]">
        <BotIcon size={19} strokeWidth={2.2} />
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-sidebar bg-accent" />
      </div>
      <div>
        <div className="text-[14px] font-extrabold leading-none tracking-[-.02em] text-sidebar-accent-foreground">signal<span className="text-primary">/</span>bot</div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/50">control room</div>
      </div>
    </div>
  );
}

function Sidebar({ username, onLogout, mobileOpen, closeMobile }: { username?: string | null; onLogout: () => void; mobileOpen: boolean; closeMobile: () => void }) {
  const [location] = useLocation();
  const nav = [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/dashboard#bots', label: 'Bot projects', icon: BotIcon },
    { href: '/admin/settings', label: 'Provider settings', icon: Settings },
  ];
  return (
    <>
      {mobileOpen && <button aria-label="Close navigation" data-testid="button-close-navigation" onClick={closeMobile} className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2"><Logo /><button onClick={closeMobile} data-testid="button-mobile-close" className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white md:hidden"><X size={17} /></button></div>
        <div className="mt-10 px-2 font-mono text-[9px] font-medium uppercase tracking-[.2em] text-sidebar-foreground/40">Workspace</div>
        <nav className="mt-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href.includes('#') ? location.startsWith('/admin/dashboard') : location === href;
            return <Link key={href} href={href} onClick={closeMobile} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors ${active ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-white'}`}>
              <Icon size={16} className={active ? 'text-primary' : 'text-sidebar-foreground/45 group-hover:text-primary'} /><span>{label}</span>{active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
            </Link>;
          })}
        </nav>
        <div className="mt-9 px-2 font-mono text-[9px] font-medium uppercase tracking-[.2em] text-sidebar-foreground/40">System</div>
        <div className="mt-3 space-y-1">
          <button data-testid="button-command-palette" onClick={() => window.alert('Command palette is ready for your next action.')} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-white"><Terminal size={16} className="text-sidebar-foreground/45 group-hover:text-primary" />Command center<span className="ml-auto rounded border border-sidebar-border px-1.5 py-0.5 font-mono text-[9px] text-sidebar-foreground/45">⌘ K</span></button>
          <button data-testid="button-help" onClick={() => window.alert('Need a hand? Check provider health or open a bot project to inspect files.')} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-white"><CircleHelp size={16} className="text-sidebar-foreground/45 group-hover:text-primary" />Help & docs</button>
        </div>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-3">
          <div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary"><ShieldCheck size={16} /></div><div className="min-w-0"><div className="truncate text-[11px] font-bold text-white">{username || 'Admin operator'}</div><div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-sidebar-foreground/50"><span className="size-1.5 rounded-full bg-primary" />session active</div></div><button onClick={onLogout} data-testid="button-logout" className="ml-auto rounded-lg p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-white" title="Sign out"><LogOut size={14} /></button></div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ title, eyebrow, username, onLogout }: { title: string; eyebrow?: string; username?: string | null; onLogout: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <>
    <Sidebar username={username} onLogout={onLogout} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
    <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-border bg-background/90 px-5 backdrop-blur-xl md:ml-[248px] md:px-9">
      <button data-testid="button-open-navigation" onClick={() => setMobileOpen(true)} className="mr-4 rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"><Menu size={19} /></button>
      <div><div className="font-mono text-[9px] uppercase tracking-[.22em] text-muted-foreground">{eyebrow || 'Workspace'}</div><h1 className="mt-1 text-[19px] font-extrabold tracking-[-.03em] text-foreground">{title}</h1></div>
      <div className="ml-auto flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 md:flex"><span className="size-1.5 rounded-full bg-primary" /><span className="font-mono text-[10px] text-muted-foreground">API connected</span></div><button onClick={() => window.alert(`Signed in as ${username || 'admin'}`)} data-testid="button-profile" className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"><UserRound size={16} /></button></div>
    </header>
  </>;
}

function Shell({ children, title, eyebrow, username }: { children: ReactNode; title: string; eyebrow?: string; username?: string | null }) {
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const handleLogout = () => logout.mutate(undefined, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() }); setLocation('/login'); } });
  return <div className="noise min-h-[100dvh] bg-background"><Topbar title={title} eyebrow={eyebrow} username={username} onLogout={handleLogout} /><main className="min-h-[calc(100dvh-72px)] md:ml-[248px]">{children}</main></div>;
}

function Protected({ children, title, eyebrow }: { children: (username?: string | null) => ReactNode; title: string; eyebrow?: string }) {
  const [, setLocation] = useLocation();
  const auth = useGetAuthStatus();
  useEffect(() => {
    if (auth.data && !auth.data.authenticated) setLocation('/login');
  }, [auth.data, setLocation]);
  if (auth.isLoading) return <div className="min-h-[100dvh] bg-background p-6"><div className="mx-auto max-w-[1380px] space-y-5"><div className="h-8 w-48 animate-pulse rounded-lg bg-muted" /><div className="grid gap-4 md:grid-cols-4"><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div></div></div>;
  if (auth.isError) return <div className="grid min-h-[100dvh] place-items-center bg-background p-6"><div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center"><TriangleAlert className="mx-auto text-destructive" /><h2 className="mt-3 font-bold">Session check failed</h2><p className="mt-1 text-sm text-muted-foreground">The control room could not verify your session.</p><button onClick={() => auth.refetch()} data-testid="button-retry-auth" className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Retry connection</button></div></div>;
  if (!auth.data?.authenticated) return null;
  return <Shell title={title} eyebrow={eyebrow} username={auth.data.username}>{children(auth.data.username)}</Shell>;
}

function Login() {
  const [, setLocation] = useLocation();
  const auth = useGetAuthStatus();
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (auth.data?.authenticated) setLocation('/admin/dashboard'); }, [auth.data, setLocation]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    login.mutate({ data: { username, password } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() }); setLocation('/admin/dashboard'); }, onError: () => setError('Those credentials did not unlock the control room.') });
  };
  return <div className="noise flex min-h-[100dvh] bg-sidebar text-sidebar-foreground">
    <div className="relative hidden w-[52%] overflow-hidden border-r border-sidebar-border p-12 lg:flex lg:flex-col">
      <Logo />
      <div className="relative z-10 mt-auto max-w-xl pb-5"><div className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.24em] text-primary"><span className="size-1.5 rounded-full bg-primary" />Operator console / v0.1</div><h1 className="text-[clamp(42px,5vw,76px)] font-extrabold leading-[.96] tracking-[-.065em] text-white">Ship bots<br /><span className="text-primary">without drift.</span></h1><p className="mt-7 max-w-md text-[14px] leading-7 text-sidebar-foreground/60">A focused command surface for building, testing, and running Discord bots from one place.</p></div>
      <div className="absolute -right-24 top-1/4 size-[420px] rounded-full border border-primary/15" /><div className="absolute -right-12 top-[29%] size-[280px] rounded-full border border-primary/10" /><div className="absolute bottom-12 right-16 font-mono text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/30">signal / 001</div>
    </div>
    <div className="flex flex-1 items-center justify-center px-6 py-12"><div className="w-full max-w-[390px] reveal"><div className="mb-10 lg:hidden"><Logo /></div><div className="mb-8"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Admin sign-in</div><h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-white">Welcome back.</h2><p className="mt-2 text-sm text-sidebar-foreground/55">Continue to your bot workspace.</p></div><form onSubmit={submit} className="space-y-5">
      <label className="block"><span className="mb-2 block text-[11px] font-bold text-sidebar-foreground/70">Username</span><div className="flex items-center rounded-xl border border-sidebar-border bg-sidebar-accent/50 px-3 transition focus-within:border-primary/70"><UserRound size={16} className="text-sidebar-foreground/40" /><input required value={username} onChange={(e) => setUsername(e.target.value)} data-testid="input-username" className="h-12 w-full bg-transparent px-3 text-sm text-white outline-none placeholder:text-sidebar-foreground/30" placeholder="operator" /></div></label>
      <label className="block"><span className="mb-2 block text-[11px] font-bold text-sidebar-foreground/70">Password</span><div className="flex items-center rounded-xl border border-sidebar-border bg-sidebar-accent/50 px-3 transition focus-within:border-primary/70"><KeyRound size={16} className="text-sidebar-foreground/40" /><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" className="h-12 w-full bg-transparent px-3 text-sm text-white outline-none placeholder:text-sidebar-foreground/30" placeholder="••••••••••••" /></div></label>
      {error && <div data-testid="status-login-error" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-red-200">{error}</div>}
      <button disabled={login.isPending} data-testid="button-submit-login" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/.18)] transition hover:-translate-y-0.5 disabled:opacity-60">{login.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}Enter control room</button>
    </form><div className="mt-8 flex items-center gap-2 border-t border-sidebar-border pt-5 font-mono text-[9px] uppercase tracking-[.14em] text-sidebar-foreground/40"><ShieldCheck size={13} className="text-primary" />Session protected by workspace auth</div></div></div>
  </div>;
}

function MetricCard({ label, value, note, icon: Icon, accent = 'primary', loading }: { label: string; value?: number; note: string; icon: typeof ActivityIcon; accent?: 'primary' | 'accent' | 'blue' | 'purple'; loading?: boolean }) {
  const colors = { primary: 'text-primary bg-primary/10', accent: 'text-accent bg-accent/10', blue: 'text-sky-600 bg-sky-500/10', purple: 'text-violet-600 bg-violet-500/10' };
  return <div className="scanline rounded-2xl border border-border bg-card p-5 shadow-[0_10px_30px_hsl(var(--foreground)/.03)] transition hover:-translate-y-0.5 hover:border-primary/30"><div className="flex items-start justify-between"><div className={`grid size-9 place-items-center rounded-xl ${colors[accent]}`}><Icon size={17} /></div><MoreHorizontal size={16} className="text-muted-foreground/40" /></div><div className={`mt-5 text-3xl font-extrabold tracking-[-.055em] ${loading ? 'animate-pulse text-muted' : 'text-foreground'}`}>{loading ? '—' : value}</div><div className="mt-1 text-[11px] font-bold text-foreground">{label}</div><div className="mt-2 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{note}</div></div>;
}

function ProviderHealth({ providers }: { providers?: DashboardSummary['providers'] }) {
  const entries = providers ? Object.entries(providers) : [];
  return <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><div className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">External services</div><h2 className="mt-1 text-[15px] font-extrabold tracking-[-.02em]">Provider health</h2></div><button onClick={() => window.location.reload()} data-testid="button-refresh-providers" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><RefreshCw size={15} /></button></div><div className="mt-5 space-y-3">{entries.length ? entries.map(([name, status]) => <div key={name} className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-3"><div className="flex items-center gap-3"><div className="grid size-8 place-items-center rounded-lg bg-card text-muted-foreground">{name === 'discord' ? <BotIcon size={15} /> : name === 'ollama' ? <Cpu size={15} /> : <Search size={15} />}</div><div><div className="text-[12px] font-bold capitalize">{name}</div><div className="font-mono text-[9px] text-muted-foreground">{name === 'discord' ? 'Gateway' : name === 'ollama' ? 'Local inference' : 'Discovery API'}</div></div></div><span className={`flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[.12em] ${status.toLowerCase().includes('ok') || status.toLowerCase().includes('healthy') || status.toLowerCase().includes('connected') ? 'text-primary' : 'text-accent'}`}><span className="size-1.5 rounded-full bg-current" />{status}</span></div>) : [1, 2, 3].map((x) => <div key={x} className="h-[58px] animate-pulse rounded-xl bg-muted" />)}</div></section>;
}

function ActivityList({ activities, loading }: { activities?: Activity[]; loading?: boolean }) {
  const items = activities?.slice(0, 5) || [];
  return <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><div className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Latest signals</div><h2 className="mt-1 text-[15px] font-extrabold tracking-[-.02em]">Recent activity</h2></div><ActivityIcon size={17} className="text-muted-foreground/50" /></div><div className="mt-5">{loading ? [1, 2, 3, 4].map((x) => <div key={x} className="mb-4 h-10 animate-pulse rounded-lg bg-muted" />) : items.length ? items.map((item, index) => <div key={item.id} data-testid={`activity-${item.id}`} className="group relative flex gap-3 pb-5 last:pb-0"><div className="relative flex w-5 justify-center"><span className={`mt-1.5 size-2 rounded-full border-2 ${index === 0 ? 'border-primary bg-primary' : 'border-border bg-card'}`} />{index < items.length - 1 && <span className="absolute top-4 h-full w-px bg-border`} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="truncate text-[11px] font-bold">{item.title}</div><span className="shrink-0 font-mono text-[9px] text-muted-foreground">{relativeTime(item.createdAt)}</span></div><div className="mt-1 truncate text-[10px] text-muted-foreground">{item.detail}</div></div></div>) : <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center"><Clock3 className="mx-auto text-muted-foreground/50" size={20} /><div className="mt-2 text-xs font-bold">No activity yet</div><p className="mt-1 text-[10px] text-muted-foreground">Your workspace signals will appear here.</p></div>}</div></section>;
}

function BotStatus({ status }: { status: Bot['status'] }) {
  const config = { running: ['Running', 'bg-primary'], stopped: ['Stopped', 'bg-muted-foreground'], error: ['Needs attention', 'bg-destructive'], building: ['Building', 'bg-accent'] }[status] || ['Unknown', 'bg-muted-foreground'];
  return <span data-testid={`status-bot-${status}`} className="inline-flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[.12em] text-muted-foreground"><span className={`size-1.5 rounded-full ${config[1]} ${status === 'running' ? 'animate-pulse' : ''}`} />{config[0]}</span>;
}

function BotRow({ bot, onDelete }: { bot: Bot; onDelete: (bot: Bot) => void }) {
  return <Link href={`/admin/bots/${bot.id}`} data-testid={`row-bot-${bot.id}`} className="group flex items-center gap-4 border-t border-border px-5 py-4 transition hover:bg-muted/50 md:px-6"><div className={`grid size-9 shrink-0 place-items-center rounded-xl ${bot.status === 'running' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><BotIcon size={17} /></div><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-bold">{bot.name}</div><div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.08em] text-muted-foreground"><span>{bot.framework}</span><span className="size-0.5 rounded-full bg-border" /><span>{bot.language}</span></div></div><div className="hidden w-28 md:block"><BotStatus status={bot.status} /></div><div className="hidden w-24 items-center gap-1.5 text-[10px] text-muted-foreground md:flex">{bot.tokenConfigured ? <><CheckCircle2 size={13} className="text-primary" />Token set</> : <><TriangleAlert size={13} className="text-accent" />No token</>}</div><div className="hidden w-24 font-mono text-[9px] text-muted-foreground lg:block">{relativeTime(bot.updatedAt)}</div><button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(bot); }} data-testid={`button-delete-bot-${bot.id}`} title="Delete project" className="rounded-lg p-2 text-muted-foreground/40 opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"><Trash2 size={14} /></button><ArrowRight size={15} className="text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-primary" /></Link>;
}

function CreateBotDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateBot();
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState('discord.js');
  const [language, setLanguage] = useState('typescript');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); setError(''); create.mutate({ data: { name, description, framework, language } }, { onSuccess: (bot) => { queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setLocation(`/admin/bots/${bot.id}`); }, onError: () => setError('Could not create this project. Check the API connection and try again.') }); };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm"><div className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 shadow-2xl reveal"><div className="flex items-start justify-between"><div><div className="font-mono text-[9px] uppercase tracking-[.2em] text-primary">New project</div><h2 className="mt-2 text-xl font-extrabold tracking-[-.035em]">Create a bot workspace</h2><p className="mt-1 text-xs text-muted-foreground">Start with a clean project scaffold.</p></div><button onClick={onClose} data-testid="button-close-create-bot" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={17} /></button></div><form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-[11px] font-bold">Project name</span><input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} data-testid="input-bot-name" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary" placeholder="e.g. moderation-core" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold">Description <span className="font-normal text-muted-foreground">(optional)</span></span><textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-bot-description" className="min-h-20 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary" placeholder="What will this bot do?" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold">Framework</span><select value={framework} onChange={(e) => setFramework(e.target.value)} data-testid="select-bot-framework" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"><option value="discord.js">discord.js</option><option value="discord.py">discord.py</option><option value="eris">Eris</option></select></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold">Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)} data-testid="select-bot-language" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="python">Python</option></select></label></div>{error && <div data-testid="status-create-error" className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} data-testid="button-cancel-create-bot" className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button><button disabled={create.isPending} data-testid="button-submit-create-bot" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground disabled:opacity-60">{create.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}Create project</button></div></form></div></div>;
}

function Dashboard() {
  const summary = useGetDashboardSummary();
  const bots = useListBots();
  const activity = useListActivity();
  const tools = useListTools();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bot | null>(null);
  const del = useDeleteBot();
  const deleteBot = () => { if (!deleteTarget) return; del.mutate({ id: deleteTarget.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setDeleteTarget(null); } }); };
  const toolCount = summary.data?.toolCount ?? tools.data?.length ?? 0;
  return <Protected title="Overview" eyebrow="Command center">{(username) => <><div className="workspace-grid min-h-[calc(100dvh-72px)] px-5 py-7 md:px-9"><div className="mx-auto max-w-[1380px]"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end reveal"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Good to see you, {username || 'operator'}</div><h2 className="mt-2 text-[27px] font-extrabold tracking-[-.055em] md:text-[32px]">Your bots, in formation.</h2><p className="mt-2 max-w-lg text-[12px] leading-5 text-muted-foreground">A compact read on your fleet and the services powering it.</p></div><button onClick={() => setShowCreate(true)} data-testid="button-create-bot" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/.16)] transition hover:-translate-y-0.5"><Plus size={15} />New bot project</button></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 reveal reveal-delay-1"><MetricCard label="Total projects" value={summary.data?.totalBots} note="Across this workspace" icon={BotIcon} loading={summary.isLoading} /><MetricCard label="Running now" value={summary.data?.runningBots} note="Live on Discord gateway" icon={Power} accent="accent" loading={summary.isLoading} /><MetricCard label="Files managed" value={summary.data?.filesManaged} note="Tracked in all projects" icon={Database} accent="blue" loading={summary.isLoading} /><MetricCard label="Tools available" value={toolCount} note="Ready for your agents" icon={Zap} accent="purple" loading={summary.isLoading && !tools.data} /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.8fr]"><section id="bots" className="overflow-hidden rounded-2xl border border-border bg-card reveal reveal-delay-2"><div className="flex items-center justify-between px-5 py-5 md:px-6"><div><div className="font-mono text-[9px] uppercase tracking-[.2em] text-muted-foreground">Projects</div><h2 className="mt-1 text-[15px] font-extrabold tracking-[-.02em]">Bot fleet</h2></div><div className="flex items-center gap-2"><span className="hidden rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.1em] text-primary sm:block">{summary.data?.runningBots ?? 0} online</span><Link href="/admin/settings" data-testid="link-manage-settings" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Settings size={15} /></Link></div></div>{bots.isError ? <div className="m-5 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center"><TriangleAlert className="mx-auto text-destructive" size={19} /><div className="mt-2 text-xs font-bold">Could not load projects</div><button onClick={() => bots.refetch()} data-testid="button-retry-bots" className="mt-3 text-[11px] font-bold text-primary">Try again</button></div> : bots.isLoading ? <div className="space-y-2 px-5 pb-5">{[1, 2, 3].map((x) => <div key={x} className="h-[68px] animate-pulse rounded-xl bg-muted" />)}</div> : bots.data?.length ? bots.data.map((bot) => <BotRow key={bot.id} bot={bot} onDelete={setDeleteTarget} />) : <div className="m-5 rounded-xl border border-dashed border-border px-5 py-10 text-center"><div className="mx-auto grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BotIcon size={19} /></div><div className="mt-3 text-sm font-bold">Your fleet is empty</div><p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-muted-foreground">Create your first project and get a Discord bot into formation.</p><button onClick={() => setShowCreate(true)} data-testid="button-empty-create-bot" className="mt-4 rounded-xl bg-primary px-3.5 py-2 text-[11px] font-extrabold text-primary-foreground">Create first bot</button></div>}</section><div className="space-y-5 reveal reveal-delay-3"><ProviderHealth providers={summary.data?.providers} /><ActivityList activities={activity.data} loading={activity.isLoading} /></div></div>
      <div className="mt-5 rounded-2xl border border-border bg-sidebar p-5 text-sidebar-foreground md:p-6 reveal"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-primary"><Gauge size={13} />Operator tools</div><h2 className="mt-2 text-lg font-extrabold tracking-[-.03em] text-white">Everything you need to keep bots steady.</h2><p className="mt-1 text-[11px] text-sidebar-foreground/55">Providers are configured in one place. Projects inherit the workspace connection.</p></div><Link href="/admin/settings" data-testid="link-configure-providers" className="inline-flex items-center justify-center gap-2 rounded-xl border border-sidebar-border px-4 py-2.5 text-xs font-bold text-white transition hover:border-primary/50 hover:text-primary">Configure providers <ArrowRight size={14} /></Link></div></div>
      </div></div>{showCreate && <CreateBotDialog onClose={() => setShowCreate(false)} />}{deleteTarget && <ConfirmDialog title={`Delete ${deleteTarget.name}?`} description="This removes the project and its managed files. This action cannot be undone." confirmLabel="Delete project" pending={del.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={deleteBot} />}</>}</Protected>;
}

function ConfirmDialog({ title, description, confirmLabel, pending, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; pending?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm"><div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 shadow-2xl reveal"><div className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive"><Trash2 size={18} /></div><h2 className="mt-4 text-lg font-extrabold tracking-[-.03em]">{title}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p><div className="mt-6 flex justify-end gap-2"><button onClick={onCancel} data-testid="button-cancel-confirm" className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted">Keep it</button><button onClick={onConfirm} disabled={pending} data-testid="button-confirm-destructive" className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-extrabold text-destructive-foreground disabled:opacity-60">{pending && <LoaderCircle size={14} className="animate-spin" />}{confirmLabel}</button></div></div></div>;
}

function FilesPanel({ bot, selected, onSelect }: { bot: BotDetail; selected?: string; onSelect: (path: string) => void }) {
  const files = useListBotFiles(bot.id, { query: { queryKey: getListBotFilesQueryKey(bot.id) } });
  const list = files.data || bot.files || [];
  return <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-4 py-3.5"><div className="flex items-center gap-2"><PanelLeft size={15} className="text-muted-foreground" /><span className="text-[11px] font-extrabold">Project files</span></div><span className="font-mono text-[9px] text-muted-foreground">{list.filter((f) => f.kind === 'file').length} files</span></div><div className="p-2">{files.isLoading ? [1, 2, 3, 4].map((x) => <div key={x} className="m-1 h-9 animate-pulse rounded-lg bg-muted" />) : list.length ? list.map((file) => <button key={file.path} onClick={() => file.kind === 'file' && onSelect(file.path)} data-testid={`button-file-${file.path.replaceAll('/', '-')}`} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] transition ${selected === file.path ? 'bg-primary/10 font-bold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{iconForFile(file)}<span className="min-w-0 flex-1 truncate">{file.path}</span>{file.kind === 'file' && <span className="font-mono text-[9px] text-muted-foreground/55">{file.language}</span>}</button>) : <div className="px-3 py-7 text-center text-[11px] text-muted-foreground">No files in this project.</div>}</div></section>;
}

function CodeEditor({ bot, path }: { bot: BotDetail; path: string }) {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [notice, setNotice] = useState('');
  const read = useReadBotFile(bot.id, { path }, { query: { queryKey: getReadBotFileQueryKey(bot.id, { path }), enabled: Boolean(path) } });
  const write = useWriteBotFile();
  useEffect(() => { if (read.data) { setContent(read.data.content); setSavedContent(read.data.content); } }, [read.data]);
  const dirty = content !== savedContent;
  const save = () => write.mutate({ id: bot.id, data: { path, content } }, { onSuccess: (file) => { setContent(file.content); setSavedContent(file.content); setNotice('Saved'); queryClient.invalidateQueries({ queryKey: getListBotFilesQueryKey(bot.id) }); setTimeout(() => setNotice(''), 1800); }, onError: () => setNotice('Save failed') });
  const language = bot.files?.find((file) => file.path === path)?.language || 'text';
  return <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-[#172032] text-slate-200"><div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3"><div className="flex min-w-0 items-center gap-2.5"><FileCode2 size={15} className="shrink-0 text-primary" /><span className="truncate font-mono text-[11px] text-slate-200">{path}</span>{dirty && <span className="size-1.5 rounded-full bg-accent" />}</div><div className="flex items-center gap-2"><span className="font-mono text-[9px] uppercase tracking-[.12em] text-slate-500">{language}</span><button disabled={!dirty || write.isPending} onClick={save} data-testid="button-save-file" className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 font-mono text-[10px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-35"><Save size={12} />{write.isPending ? 'Saving' : notice || 'Save'}</button></div></div>{read.isLoading ? <div className="flex-1 space-y-3 p-5"><div className="h-3 w-2/3 animate-pulse rounded bg-slate-700" /><div className="h-3 w-1/2 animate-pulse rounded bg-slate-700" /><div className="h-3 w-4/5 animate-pulse rounded bg-slate-700" /></div> : read.isError ? <div className="grid flex-1 place-items-center p-8 text-center"><TriangleAlert className="text-accent" /><div className="mt-2 text-xs font-bold">Could not read this file</div><button onClick={() => read.refetch()} data-testid="button-retry-file" className="mt-3 text-[11px] font-bold text-primary">Try again</button></div> : <div className="flex flex-1 overflow-hidden"><div className="select-none border-r border-slate-700/60 px-3 py-4 text-right font-mono text-[10px] leading-[1.65] text-slate-600">{Array.from({ length: Math.max(1, content.split('\n').length) }, (_, i) => <div key={i}>{i + 1}</div>)}</div><textarea value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} data-testid="textarea-file-content" className="min-h-[420px] flex-1 resize-none bg-transparent p-4 font-mono text-[11px] leading-[1.65] text-slate-300 outline-none" /></div>}</section>;
}

function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const botQuery = useGetBot(id || '');
  const bot = botQuery.data;
  const [selected, setSelected] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [presence, setPresence] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const start = useStartBot();
  const stop = useStopBot();
  const saveToken = useSaveBotToken();
  const removeToken = useDeleteBotToken();
  const update = useUpdateBot();
  const del = useDeleteBot();
  useEffect(() => { if (bot) { setPresence(bot.presence || ''); setName(bot.name); setDescription(bot.description || ''); if (!selected) setSelected(bot.files?.find((f) => f.kind === 'file')?.path || ''); } }, [bot, selected]);
  if (botQuery.isLoading) return <Protected title="Bot workspace" eyebrow="Project">{() => <div className="p-5 md:p-9"><div className="mx-auto max-w-[1380px] space-y-5"><div className="h-6 w-48 animate-pulse rounded bg-muted" /><div className="h-28 animate-pulse rounded-2xl bg-muted" /><div className="h-[500px] animate-pulse rounded-2xl bg-muted" /></div></div>}</Protected>;
  if (botQuery.isError || !bot) return <Protected title="Bot workspace" eyebrow="Project">{() => <div className="grid min-h-[calc(100dvh-72px)] place-items-center p-6"><div className="text-center"><TriangleAlert className="mx-auto text-destructive" /><h2 className="mt-3 font-bold">Project not found</h2><p className="mt-1 text-sm text-muted-foreground">This bot may have been removed.</p><button onClick={() => setLocation('/admin/dashboard')} data-testid="button-back-dashboard-error" className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Back to overview</button></div></div>}</Protected>;
  const runAction = (running: boolean) => (running ? stop.mutate({ id: bot.id }, { onSuccess: (updated) => queryClient.setQueryData(getGetBotQueryKey(bot.id), { ...bot, ...updated }) }) : start.mutate({ id: bot.id }, { onSuccess: (updated) => queryClient.setQueryData(getGetBotQueryKey(bot.id), { ...bot, ...updated }) }));
  const saveDetails = (event: FormEvent) => { event.preventDefault(); update.mutate({ id: bot.id, data: { name, description, presence } }, { onSuccess: (updated) => { queryClient.setQueryData(getGetBotQueryKey(bot.id), { ...bot, ...updated }); setEditMode(false); } }); };
  const saveBotToken = (event: FormEvent) => { event.preventDefault(); saveToken.mutate({ id: bot.id, data: { token } }, { onSuccess: () => { setToken(''); setShowToken(false); queryClient.setQueryData(getGetBotQueryKey(bot.id), { ...bot, tokenConfigured: true }); } }); };
  const deleteProject = () => del.mutate({ id: bot.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setLocation('/admin/dashboard'); } });
  return <Protected title={bot.name} eyebrow="Project workspace">{(username) => <><div className="bg-background px-5 py-6 md:px-9"><div className="mx-auto max-w-[1380px]"><div className="mb-5 flex items-center justify-between"><Link href="/admin/dashboard" data-testid="link-back-dashboard" className="inline-flex items-center gap-2 text-[11px] font-bold text-muted-foreground transition hover:text-primary"><ArrowLeft size={14} />All projects</Link><div className="font-mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">Last updated {relativeTime(bot.updatedAt)}</div></div><section className="rounded-2xl border border-border bg-card p-5 shadow-[0_10px_30px_hsl(var(--foreground)/.03)] md:p-6 reveal"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div className="flex items-center gap-4"><div className={`grid size-12 place-items-center rounded-2xl ${bot.status === 'running' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><BotIcon size={24} /></div><div><div className="flex flex-wrap items-center gap-3"><h2 data-testid="text-bot-name" className="text-2xl font-extrabold tracking-[-.05em]">{bot.name}</h2><BotStatus status={bot.status} /></div><p data-testid="text-bot-description" className="mt-1 max-w-2xl text-xs text-muted-foreground">{bot.description || 'No description added yet.'}</p><div className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground"><span className="rounded bg-muted px-2 py-1">{bot.framework}</span><span className="rounded bg-muted px-2 py-1">{bot.language}</span><span className="rounded bg-muted px-2 py-1">{bot.tokenConfigured ? 'Token configured' : 'Token required'}</span></div></div></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => setEditMode(true)} data-testid="button-edit-bot" className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-bold transition hover:border-primary/40 hover:text-primary">Edit details</button>{bot.status === 'running' ? <button onClick={() => runAction(true)} disabled={stop.isPending} data-testid="button-stop-bot" className="flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-xs font-extrabold text-accent-foreground disabled:opacity-60"><Square size={13} fill="currentColor" />Stop bot</button> : <button onClick={() => runAction(false)} disabled={start.isPending || !bot.tokenConfigured} data-testid="button-start-bot" title={!bot.tokenConfigured ? 'Configure a token first' : 'Start bot'} className="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-extrabold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><Play size={13} fill="currentColor" />Start bot</button>}<button onClick={() => setDeleteOpen(true)} data-testid="button-open-delete-bot" className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"><Trash2 size={15} /></button></div></div></section>
      <div className="mt-5 grid gap-5 xl:grid-cols-[250px_1fr_280px]"><div className="space-y-5"><FilesPanel bot={bot} selected={selected} onSelect={setSelected} /><section className="rounded-2xl border border-border bg-card p-4"><div className="font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground">Runtime</div><div className="mt-4 space-y-3"><div className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Process</span><BotStatus status={bot.status} /></div><div className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Last activity</span><span className="font-mono text-[9px]">{relativeTime(bot.lastActivity)}</span></div></div></section></div><div>{selected ? <CodeEditor bot={bot} path={selected} /> : <div className="grid min-h-[480px] place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center"><Code2 className="text-muted-foreground/50" size={27} /><div className="mt-3 text-sm font-bold">Select a file to inspect</div><p className="mt-1 max-w-xs text-[11px] leading-5 text-muted-foreground">Choose a file from the project tree to read and edit its contents.</p></div>}</div><div className="space-y-5"><section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><div className="font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground">Discord gateway</div><h2 className="mt-1 text-[14px] font-extrabold">Bot token</h2></div><KeyRound size={16} className="text-muted-foreground/50" /></div><div className="mt-4 rounded-xl bg-muted/70 p-3"><div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><span className={`size-1.5 rounded-full ${bot.tokenConfigured ? 'bg-primary' : 'bg-accent'}`} />{bot.tokenConfigured ? 'Token configured' : 'No token saved'}</div>{bot.tokenConfigured && <div className="mt-2 font-mono text-[11px] tracking-[.1em] text-foreground">••••••••••••••••</div>}</div>{bot.tokenConfigured ? <button onClick={() => removeToken.mutate({ id: bot.id }, { onSuccess: () => queryClient.setQueryData(getGetBotQueryKey(bot.id), { ...bot, tokenConfigured: false }) })} disabled={removeToken.isPending} data-testid="button-remove-token" className="mt-3 w-full rounded-xl border border-border py-2 text-[11px] font-bold text-muted-foreground hover:border-destructive/40 hover:text-destructive">Remove token</button> : <button onClick={() => setShowToken(true)} data-testid="button-configure-token" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[11px] font-extrabold text-primary-foreground"><KeyRound size={13} />Configure token</button>}</section><section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><div className="font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground">Presence</div><h2 className="mt-1 text-[14px] font-extrabold">What Discord sees</h2></div><ActivityIcon size={16} className="text-muted-foreground/50" /></div><form onSubmit={saveDetails} className="mt-4"><input value={presence} onChange={(e) => setPresence(e.target.value)} data-testid="input-bot-presence" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[11px] outline-none transition focus:border-primary" placeholder="Watching your server" /><button disabled={update.isPending || presence === (bot.presence || '')} data-testid="button-save-presence" className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-[11px] font-bold transition hover:border-primary/40 hover:text-primary disabled:opacity-45"><Save size={13} />Save presence</button></form></section></div></div></div></div>{showToken && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm"><div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 reveal"><div className="flex items-start justify-between"><div><div className="font-mono text-[9px] uppercase tracking-[.2em] text-primary">Encrypted credential</div><h2 className="mt-2 text-lg font-extrabold">Add bot token</h2><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Your token is sent directly to the workspace and never shown in full again.</p></div><button onClick={() => setShowToken(false)} data-testid="button-close-token" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={17} /></button></div><form onSubmit={saveBotToken} className="mt-5"><label className="block"><span className="mb-1.5 block text-[11px] font-bold">Discord bot token</span><input required minLength={10} value={token} onChange={(e) => setToken(e.target.value)} data-testid="input-bot-token" type="password" className="h-11 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs outline-none focus:border-primary" placeholder="Paste token" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowToken(false)} data-testid="button-cancel-token" className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button><button disabled={saveToken.isPending} data-testid="button-save-token" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground disabled:opacity-60">{saveToken.isPending && <LoaderCircle size={14} className="animate-spin" />}Save securely</button></div></form></div></div>}{editMode && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm"><div className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 reveal"><div className="flex justify-between"><div><div className="font-mono text-[9px] uppercase tracking-[.2em] text-primary">Project details</div><h2 className="mt-2 text-lg font-extrabold">Edit workspace</h2></div><button onClick={() => setEditMode(false)} data-testid="button-close-edit-bot" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={17} /></button></div><form onSubmit={saveDetails} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-[11px] font-bold">Name</span><input required value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-bot-name" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold">Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-edit-bot-description" className="min-h-24 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditMode(false)} data-testid="button-cancel-edit-bot" className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button><button disabled={update.isPending} data-testid="button-save-edit-bot" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground"><Save size={13} />Save changes</button></div></form></div></div>}{deleteOpen && <ConfirmDialog title={`Delete ${bot.name}?`} description="This removes the project and its managed files. This action cannot be undone." confirmLabel="Delete project" pending={del.isPending} onCancel={() => setDeleteOpen(false)} onConfirm={deleteProject} />}</>}</Protected>;
}

function SettingsPage() {
  const toolsQuery = useListTools();
  const [discordEndpoint, setDiscordEndpoint] = useState('https://discord.com/api');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [searchEndpoint, setSearchEndpoint] = useState('https://api.search.brave.com');
  const [saved, setSaved] = useState(false);
  useEffect(() => { const stored = localStorage.getItem('signalbot-provider-settings'); if (stored) { try { const parsed = JSON.parse(stored) as Record<string, string>; setDiscordEndpoint(parsed.discord || discordEndpoint); setOllamaEndpoint(parsed.ollama || ollamaEndpoint); setSearchEndpoint(parsed.search || searchEndpoint); } catch { /* keep defaults */ } } }, []);
  const save = (event: FormEvent) => { event.preventDefault(); localStorage.setItem('signalbot-provider-settings', JSON.stringify({ discord: discordEndpoint, ollama: ollamaEndpoint, search: searchEndpoint })); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  return <Protected title="Provider settings" eyebrow="Workspace configuration">{() => <div className="workspace-grid min-h-[calc(100dvh-72px)] px-5 py-7 md:px-9"><div className="mx-auto max-w-[1000px]"><div className="mb-7 reveal"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">System configuration</div><h2 className="mt-2 text-[28px] font-extrabold tracking-[-.055em]">Provider settings</h2><p className="mt-2 max-w-lg text-[12px] leading-5 text-muted-foreground">Set the endpoints your bot projects can reach. Changes are stored for this workspace.</p></div><form onSubmit={save} className="space-y-5"><section className="rounded-2xl border border-border bg-card p-5 md:p-6 reveal reveal-delay-1"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-primary"><Server size={13} />Connected services</div><h2 className="mt-2 text-[15px] font-extrabold">Provider endpoints</h2></div><span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.1em] text-primary">Workspace scope</span></div><div className="mt-6 space-y-5"><EndpointField label="Discord gateway" icon={<BotIcon size={15} />} value={discordEndpoint} onChange={setDiscordEndpoint} status="Primary runtime" testId="discord" /><EndpointField label="Ollama" icon={<Cpu size={15} />} value={ollamaEndpoint} onChange={setOllamaEndpoint} status="Local inference" testId="ollama" /><EndpointField label="Search provider" icon={<Search size={15} />} value={searchEndpoint} onChange={setSearchEndpoint} status="Discovery and docs" testId="search" /></div></section><section className="rounded-2xl border border-border bg-card p-5 md:p-6 reveal reveal-delay-2"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-primary"><Package size={13} />Automation surface</div><h2 className="mt-2 text-[15px] font-extrabold">Available tools</h2></div><span className="font-mono text-[10px] text-muted-foreground">{toolsQuery.data?.length || 0} registered</span></div>{toolsQuery.isLoading ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((x) => <div key={x} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div> : toolsQuery.data?.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{toolsQuery.data.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No tools are registered yet.</div>}</section><div className="flex justify-end"><button disabled={saved} data-testid="button-save-settings" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground disabled:opacity-80">{saved ? <Check size={14} /> : <Save size={14} />}{saved ? 'Settings saved' : 'Save configuration'}</button></div></form></div></div>}</Protected>;
}

function EndpointField({ label, icon, value, onChange, status, testId }: { label: string; icon: ReactNode; value: string; onChange: (value: string) => void; status: string; testId: string }) {
  return <label className="block"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-[11px] font-bold">{icon}{label}</span><span className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{status}</span></div><div className="flex items-center rounded-xl border border-input bg-background transition focus-within:border-primary/70"><span className="hidden pl-3 font-mono text-[10px] text-muted-foreground/50 sm:block">URL</span><input value={value} onChange={(e) => onChange(e.target.value)} data-testid={`input-endpoint-${testId}`} className="h-11 w-full bg-transparent px-3 font-mono text-[11px] outline-none" /></div></label>;
}

function ToolCard({ tool }: { tool: Tool }) {
  const [enabled, setEnabled] = useState(tool.enabled);
  return <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/45 p-3.5"><div className={`grid size-8 place-items-center rounded-lg ${enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><Zap size={15} /></div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold">{tool.name}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{tool.description}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-[.1em] text-muted-foreground/70">{tool.category}</div></div><button onClick={() => setEnabled(!enabled)} aria-pressed={enabled} data-testid={`button-toggle-tool-${tool.id}`} className={`relative h-5 w-9 rounded-full transition ${enabled ? 'bg-primary' : 'bg-border'}`}><span className={`absolute top-0.5 size-4 rounded-full bg-card shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} /></button></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/login" component={Login} /><Route path="/admin/dashboard" component={Dashboard} /><Route path="/admin/bots/:id" component={BotDetailPage} /><Route path="/admin/settings" component={SettingsPage} /><Route path="/"><RedirectToDashboard /></Route><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function RedirectToDashboard() {
  const [, setLocation] = useLocation();
  useEffect(() => setLocation('/admin/dashboard'), [setLocation]);
  return <div className="grid min-h-[100dvh] place-items-center bg-background"><LoaderCircle className="animate-spin text-primary" /></div>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
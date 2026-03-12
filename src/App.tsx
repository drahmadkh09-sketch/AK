import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  ClipboardCheck, 
  Lightbulb, 
  Settings as SettingsIcon,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  MessageSquare,
  Send,
  X,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { format, formatDistanceToNow, isAfter, subHours, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { api } from './api';
import { Account, Metric, AuditLog, Insight, Settings } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <motion.div 
        animate={{ rotate: [0, 90, 180, 270, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-brand-primary/20 rounded-xl" 
      />
      <div className="relative z-10 w-full h-full bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50" />
        <svg viewBox="0 0 24 24" fill="none" className="w-2/3 h-2/3 text-black" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4V20L12 12L20 20V4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 4V12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'NIO2026') {
      localStorage.setItem('nio_auth', 'true');
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      <BackgroundAnimation />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-16 w-full max-w-md border-white/10 relative z-10 text-center"
      >
        <Logo className="w-24 h-24 mx-auto mb-10" />
        <h1 className="text-4xl font-serif font-light luxury-text-gradient mb-4">Relay Access</h1>
        <p className="text-white/40 text-sm mb-10 font-light tracking-wide">Enter shared credentials to initialize session.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input 
              type="password" 
              className={cn(
                "w-full p-5 bg-white/[0.03] border rounded-2xl text-center text-sm tracking-[0.5em] focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all",
                error ? "border-rose-500/50 ring-2 ring-rose-500/20" : "border-white/10"
              )}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <button 
            type="submit"
            className="w-full py-5 bg-brand-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-brand-primary/90 transition-all shadow-2xl shadow-brand-primary/20"
          >
            Initialize
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('nio_auth') === 'true');
  const [showHero, setShowHero] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'metrics' | 'audit' | 'insights' | 'settings'>('overview');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accs, logs, ins, sets] = await Promise.all([
        api.getAccounts(),
        api.getAuditLogs(),
        api.getInsights(),
        api.getSettings()
      ]);
      setAccounts(accs);
      setAuditLogs(logs);
      setInsights(ins);
      setSettings(sets);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <Overview accounts={accounts} auditLogs={auditLogs} insights={insights} settings={settings} />;
      case 'accounts': return <AccountRegistry accounts={accounts} onUpdate={fetchData} />;
      case 'metrics': return <MetricsView accounts={accounts} />;
      case 'audit': return <AuditLogInterface accounts={accounts} auditLogs={auditLogs} onUpdate={fetchData} />;
      case 'insights': return <InsightsFeed insights={insights} accounts={accounts} onUpdate={fetchData} />;
      case 'settings': return <SettingsPanel settings={settings} onUpdate={fetchData} />;
      default: return <Overview accounts={accounts} auditLogs={auditLogs} insights={insights} settings={settings} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#050505] text-white/90 font-sans">
      <BackgroundAnimation />

      <AnimatePresence mode="wait">
        {showHero ? (
          <Hero onEnter={() => setShowHero(false)} />
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full w-full"
          >
            {/* Sidebar */}
            <aside className="w-72 glass-panel border-r border-white/5 flex flex-col z-20">
              <div className="p-10">
                <div className="flex items-center gap-3">
                  <Logo className="w-10 h-10" />
                  <span className="font-serif text-2xl font-semibold tracking-tighter gold-text-gradient">NIO Relay</span>
                </div>
              </div>

              <nav className="flex-1 px-6 space-y-2">
                <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <SidebarItem icon={Users} label="Accounts" active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} />
                <SidebarItem icon={BarChart3} label="Metrics" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} />
                <SidebarItem icon={ClipboardCheck} label="Audit Logs" active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
                <SidebarItem icon={Lightbulb} label="Insights" active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
                <SidebarItem icon={SettingsIcon} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
              </nav>

              <div className="p-8 border-t border-white/5">
                <div className="flex items-center gap-4 px-4 py-5 glass-card border-white/5 bg-white/[0.02]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary via-amber-500 to-amber-900 flex items-center justify-center text-xs font-black text-black shadow-2xl">
                    AD
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/90 truncate">Admin</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">NIO Ops</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="p-12 max-w-7xl mx-auto"
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* Moving Grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
      <motion.div 
        animate={{ y: [0, 100] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-[0.01] pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(to bottom, transparent, white, transparent)', backgroundSize: '100% 200px', backgroundRepeat: 'no-repeat' }}
      />

      {/* Animated Mesh Gradients */}
      <motion.div 
        animate={{ 
          x: [0, 100, -100, 0],
          y: [0, -100, 100, 0],
          scale: [1, 1.2, 0.8, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-brand-primary/5 blur-[150px] rounded-full" 
      />
      <motion.div 
        animate={{ 
          x: [0, -120, 120, 0],
          y: [0, 120, -120, 0],
          scale: [1, 0.9, 1.1, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-emerald-500/5 blur-[150px] rounded-full" 
      />
      <motion.div 
        animate={{ 
          x: [0, 80, -80, 0],
          y: [0, 80, -80, 0],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" 
      />

      {/* Floating Glass Shards (Subtle) */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            rotate: Math.random() * 360,
            opacity: 0.1
          }}
          animate={{ 
            y: [null, "-=100", "+=100"],
            rotate: [null, "+=45", "-=45"],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ 
            duration: 10 + Math.random() * 10, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute w-32 h-32 border border-white/5 bg-white/[0.01] backdrop-blur-sm rounded-3xl"
        />
      ))}
    </div>
  );
}

function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center z-50 p-6 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="text-center space-y-12 max-w-4xl relative z-50"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex justify-center mb-8"
          >
            <Logo className="w-32 h-32" />
          </motion.div>
          
          <h1 className="text-8xl md:text-9xl font-serif font-extralight tracking-tighter leading-none">
            <span className="luxury-text-gradient block">NIO</span>
            <span className="gold-text-gradient italic block -mt-4">Intelligence Relay</span>
          </h1>
          
          <p className="text-xl md:text-2xl font-serif italic text-white/40 max-w-2xl mx-auto leading-relaxed">
            The definitive command center for high-fidelity brand management and strategic virality.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="flex flex-col items-center gap-8"
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEnter();
            }}
            className="group relative px-16 py-6 bg-white text-black rounded-full font-black text-xs uppercase tracking-[0.4em] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)] cursor-pointer z-[60]"
          >
            <span className="relative z-10">Enter Dashboard</span>
            <div className="absolute inset-0 bg-brand-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </button>

          <div className="flex items-center gap-12 text-white/20">
            <div className="text-center">
              <p className="text-2xl font-serif font-light text-white/60">2.4M</p>
              <p className="text-[8px] font-black uppercase tracking-widest">Reach</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-serif font-light text-white/60">12.8K</p>
              <p className="text-[8px] font-black uppercase tracking-widest">Insights</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-serif font-light text-white/60">99.8%</p>
              <p className="text-[8px] font-black uppercase tracking-widest">Accuracy</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 flex flex-col items-center gap-4"
      >
        <div className="w-px h-16 bg-gradient-to-b from-white to-transparent" />
        <span className="text-[8px] font-black uppercase tracking-[0.4em] rotate-90 origin-left translate-x-1">System Ready</span>
      </motion.div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
        active 
          ? "text-brand-primary bg-white/[0.03] shadow-inner" 
          : "text-white/40 hover:text-white hover:bg-white/[0.02]"
      )}
    >
      {active && (
        <>
          <motion.div 
            layoutId="sidebar-active"
            className="absolute left-0 w-1 h-6 bg-brand-primary rounded-r-full"
          />
          <motion.div 
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-primary/5 to-transparent pointer-events-none"
          />
        </>
      )}
      <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", active ? "text-brand-primary" : "text-white/20 group-hover:text-white/60")} />
      <span className="tracking-wide">{label}</span>
    </button>
  );
}

// --- Sub-components ---

function Overview({ accounts, auditLogs, insights, settings }: { accounts: Account[], auditLogs: AuditLog[], insights: Insight[], settings: Settings | null }) {
  const alerts = accounts.filter(a => {
    if (!a.last_post_ts) return true;
    const lastPost = new Date(a.last_post_ts);
    const threshold = subHours(new Date(), settings?.thresholds.cadence_gap_hours || 48);
    return isAfter(threshold, lastPost);
  });

  const platformData = Array.from(new Set(accounts.map(a => a.platform))).map(p => ({
    name: p,
    value: accounts.filter(a => a.platform === p).length
  }));

  const COLORS = ['#D4AF37', '#10B981', '#3B82F6', '#F43F5E'];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <motion.div 
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-primary/[0.03] to-transparent pointer-events-none"
        />
        <div className="max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-8"
          >
            <span className="w-16 h-[1px] bg-brand-primary/50" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-primary/80">Ecosystem Intelligence</span>
          </motion.div>
          
          <h1 className="text-9xl font-serif font-extralight leading-[0.85] tracking-tighter mb-10 luxury-text-gradient">
            Command your <br />
            <span className="italic font-medium gold-text-gradient">Digital Presence.</span>
          </h1>
          
          <p className="text-2xl text-white/30 font-light max-w-2xl leading-relaxed font-serif italic">
            A high-fidelity control center for your social media infrastructure. 
            Monitor health, audit quality, and ingest real-time metrics with precision.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard 
            label="Managed Infrastructure" 
            value={accounts.length} 
            subValue={`${accounts.filter(a => a.status_tag === 'active').length} Active Nodes`}
            icon={Users}
            color="blue"
          />
          <StatCard 
            label="System Anomalies" 
            value={alerts.length} 
            subValue="Requires immediate intervention"
            icon={AlertCircle}
            color="rose"
            trend={alerts.length > 0 ? 'down' : 'up'}
          />
          <StatCard 
            label="Quality Inspections" 
            value={auditLogs.length} 
            subValue="Completed in last cycle"
            icon={ClipboardCheck}
            color="emerald"
          />
        </div>
        <div className="glass-card p-6 border-white/5 flex flex-col items-center justify-center">
          <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Platform Distribution</h4>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {platformData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[8px] font-black uppercase tracking-tighter text-white/40">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="glass-card p-10 border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-serif font-medium flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              Critical Interventions
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Real-time Priority</span>
          </div>
          
          <div className="space-y-6">
            {alerts.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
                <p className="text-white/30 font-serif italic">All systems operating within nominal parameters.</p>
              </div>
            ) : (
              alerts.map(a => (
                <div key={a.id} className="group flex items-center justify-between p-6 bg-white/[0.02] rounded-[24px] border border-white/5 hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <PlatformIcon platform={a.platform} className="w-12 h-12 p-3 bg-white/5 rounded-2xl shadow-sm" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-500/50" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">@{a.handle}</p>
                      <p className="text-xs text-rose-400 font-medium">Cadence Gap: 48h+ Inactivity</p>
                    </div>
                  </div>
                  <button className="px-6 py-2 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">
                    Resolve
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-10 border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-serif font-medium flex items-center gap-3">
              <Clock className="w-6 h-6 text-brand-primary" />
              Deployment Pipeline
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Next 24 Hours</span>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 bg-white/[0.02] rounded-[24px] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Instagram Carousel</p>
                  <p className="text-xs text-white/40 font-medium">Scheduled: Today, 18:00</p>
                </div>
              </div>
              <span className="status-badge status-on-target">Ready</span>
            </div>
            <div className="p-6 bg-white/[0.02] rounded-[24px] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                  <Twitter className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Twitter Thread</p>
                  <p className="text-xs text-white/40 font-medium">Status: Composition in progress</p>
                </div>
              </div>
              <span className="status-badge bg-amber-500/10 text-amber-400 border-amber-500/20">Drafting</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-10 border-white/5">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-3xl font-serif font-medium flex items-center gap-4">
            <ClipboardCheck className="w-8 h-8 text-emerald-500" />
            Creative Assets
          </h3>
          <button className="text-xs font-black uppercase tracking-[0.2em] text-brand-primary hover:underline">View Library</button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="group relative aspect-[3/4] rounded-[24px] overflow-hidden bg-white/5 border border-white/10">
              <img 
                src={`https://picsum.photos/seed/asset${i}/600/800`} 
                alt="Asset" 
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Asset 0{i}</p>
                <p className="text-xs font-bold text-white mb-4">High-Res Master</p>
                <button className="w-full py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl">
                  Inspect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 glass-card p-10 border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-serif font-medium flex items-center gap-3">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              Strategic Intelligence
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">AI Generated</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.slice(0, 2).map(i => (
              <div key={i.id} className="p-8 bg-white/[0.02] rounded-[32px] border border-white/5 hover:border-brand-primary/20 transition-all group">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Lightbulb className="w-5 h-5 text-brand-primary" />
                </div>
                <p className="text-lg font-serif italic text-white/80 leading-relaxed mb-6">"{i.content}"</p>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{formatDistanceToNow(new Date(i.created_at))} ago</span>
                  <button className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline">Deep Dive</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-10 border-white/5 bg-gradient-to-br from-brand-primary/10 to-transparent">
          <h3 className="text-2xl font-serif font-medium mb-6">System Status</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">API Connectivity</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Database Latency</span>
              <span className="text-xs font-mono text-emerald-400">12ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Ingestion Rate</span>
              <span className="text-xs font-mono text-white">4.2k/min</span>
            </div>
            <div className="pt-6 border-t border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Active Nodes</p>
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-[#050505] bg-slate-800 overflow-hidden">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-4 border-[#050505] bg-brand-primary flex items-center justify-center text-[10px] font-black text-black">
                  +12
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountRegistry({ accounts, onUpdate }: { accounts: Account[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    platform: 'Instagram',
    priority_level: 'medium',
    cadence_target_per_week: 1,
    status_tag: 'active'
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createAccount(newAccount);
    setShowAdd(false);
    onUpdate();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      await api.updateAccount(editingAccount.id, editingAccount);
      setEditingAccount(null);
      onUpdate();
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <header>
          <h1 className="text-6xl font-serif font-light luxury-text-gradient mb-2">Account Registry</h1>
          <p className="text-white/40 font-light tracking-wide">Manage your social media infrastructure.</p>
        </header>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv';
              input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (!file) return;
                const text = await file.text();
                const lines = text.split('\n').filter(l => l.trim());
                const headers = lines[0].split(',').map(h => h.trim());
                const data = lines.slice(1).map(line => {
                  const values = line.split(',').map(v => v.trim());
                  return headers.reduce((acc: any, header, i) => {
                    acc[header] = values[i];
                    return acc;
                  }, {});
                });
                for (const item of data) {
                  await api.createAccount(item);
                }
                onUpdate();
              };
              input.click();
            }}
            className="flex items-center gap-3 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all shadow-xl"
          >
            <Download className="w-4 h-4" />
            <span className="gold-text-gradient">Upload CSV</span>
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-3 px-8 py-4 bg-brand-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-primary/90 transition-all shadow-2xl shadow-brand-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden border-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5">
              <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Entity</th>
              <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Governance</th>
              <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Priority</th>
              <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Last Pulse</th>
              <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {accounts.map(a => (
              <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-8 py-8">
                  <div className="flex items-center gap-5">
                    <PlatformIcon platform={a.platform} className="w-12 h-12 p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-lg font-bold text-white">@{a.handle}</p>
                      <a href={a.profile_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline flex items-center gap-2 mt-1">
                        Live Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-8">
                  <div className="text-sm">
                    <p className="font-serif italic text-white/80 text-lg">{a.pod_owner}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-1">Backup: {a.backup_owner}</p>
                  </div>
                </td>
                <td className="px-8 py-8">
                  <span className={cn(
                    "status-badge",
                    a.priority_level === 'high' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : 
                    a.priority_level === 'medium' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                    "bg-white/5 text-white/40 border-white/10"
                  )}>
                    {a.priority_level}
                  </span>
                </td>
                <td className="px-8 py-8">
                  <span className={cn(
                    "status-badge",
                    a.status_tag === 'active' ? "status-on-target" : "bg-white/5 text-white/20 border-white/10"
                  )}>
                    {a.status_tag}
                  </span>
                </td>
                <td className="px-8 py-8">
                  <p className="text-sm font-medium text-white/40 italic font-serif">
                    {a.last_post_ts ? formatDistanceToNow(new Date(a.last_post_ts)) + ' ago' : 'No recent activity'}
                  </p>
                </td>
                <td className="px-8 py-8 text-right">
                  <button 
                    onClick={() => setEditingAccount(a)}
                    className="p-3 bg-white/5 rounded-xl text-white/20 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="glass-card p-12 w-full max-w-2xl border-white/10"
          >
            <h2 className="text-4xl font-serif font-light luxury-text-gradient mb-10">Register New Entity</h2>
            <form onSubmit={handleAdd} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Platform Architecture</label>
                  <select 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all appearance-none"
                    value={newAccount.platform}
                    onChange={e => setNewAccount({...newAccount, platform: e.target.value})}
                  >
                    <option className="bg-[#050505]">Instagram</option>
                    <option className="bg-[#050505]">X</option>
                    <option className="bg-[#050505]">YouTube</option>
                    <option className="bg-[#050505]">Facebook</option>
                    <option className="bg-[#050505]">TikTok</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Digital Handle</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                    placeholder="@username"
                    required
                    onChange={e => setNewAccount({...newAccount, handle: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Profile URL</label>
                <input 
                  type="url" 
                  className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                  placeholder="https://..."
                  onChange={e => setNewAccount({...newAccount, profile_url: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Primary Governance</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                    placeholder="Entity Owner"
                    onChange={e => setNewAccount({...newAccount, pod_owner: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Secondary Backup</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                    placeholder="Backup Personnel"
                    onChange={e => setNewAccount({...newAccount, backup_owner: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Priority Level</label>
                  <select 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all appearance-none"
                    value={newAccount.priority_level}
                    onChange={e => setNewAccount({...newAccount, priority_level: e.target.value as any})}
                  >
                    <option className="bg-[#050505]">high</option>
                    <option className="bg-[#050505]">medium</option>
                    <option className="bg-[#050505]">low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Cadence Target (Weekly)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                    value={newAccount.cadence_target_per_week}
                    onChange={e => setNewAccount({...newAccount, cadence_target_per_week: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex gap-6 mt-12">
                <button 
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-4 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 rounded-2xl transition-all"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-brand-primary text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all"
                >
                  Commit Registration
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {editingAccount && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="glass-card p-12 w-full max-w-2xl border-white/10"
          >
            <h2 className="text-4xl font-serif font-light luxury-text-gradient mb-10">Modify Entity</h2>
            <form onSubmit={handleEdit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Platform Architecture</label>
                  <select 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all appearance-none"
                    value={editingAccount.platform}
                    onChange={e => setEditingAccount({...editingAccount, platform: e.target.value})}
                  >
                    <option className="bg-[#050505]">Instagram</option>
                    <option className="bg-[#050505]">X</option>
                    <option className="bg-[#050505]">YouTube</option>
                    <option className="bg-[#050505]">Facebook</option>
                    <option className="bg-[#050505]">TikTok</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Digital Handle</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                    value={editingAccount.handle}
                    required
                    onChange={e => setEditingAccount({...editingAccount, handle: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Profile URL</label>
                <input 
                  type="url" 
                  className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                  value={editingAccount.profile_url}
                  onChange={e => setEditingAccount({...editingAccount, profile_url: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Primary Governance</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                    value={editingAccount.pod_owner}
                    onChange={e => setEditingAccount({...editingAccount, pod_owner: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Secondary Backup</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
                    value={editingAccount.backup_owner}
                    onChange={e => setEditingAccount({...editingAccount, backup_owner: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Priority Level</label>
                  <select 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all appearance-none"
                    value={editingAccount.priority_level}
                    onChange={e => setEditingAccount({...editingAccount, priority_level: e.target.value as any})}
                  >
                    <option className="bg-[#050505]">high</option>
                    <option className="bg-[#050505]">medium</option>
                    <option className="bg-[#050505]">low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Status Tag</label>
                  <select 
                    className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all appearance-none"
                    value={editingAccount.status_tag}
                    onChange={e => setEditingAccount({...editingAccount, status_tag: e.target.value as any})}
                  >
                    <option className="bg-[#050505]">active</option>
                    <option className="bg-[#050505]">paused</option>
                    <option className="bg-[#050505]">archived</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-6 mt-12">
                <button 
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 py-4 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 rounded-2xl transition-all"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-brand-primary text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function MetricsView({ accounts }: { accounts: Account[] }) {
  const [selectedAccount, setSelectedAccount] = useState<number | null>(accounts[0]?.id || null);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    if (selectedAccount) {
      api.getMetrics(selectedAccount).then(setMetrics);
    }
  }, [selectedAccount]);

  const chartData = metrics.map(m => ({
    date: format(new Date(m.date), 'MMM dd'),
    reach: m.reach,
    engagement: m.saves + m.shares,
    followers: m.follower_delta
  })).reverse();

  return (
    <div className="space-y-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-6xl font-serif font-light luxury-text-gradient mb-2">Metrics Ingest</h1>
          <p className="text-white/40 font-light tracking-wide">Performance tracking and high-fidelity data pulls.</p>
        </div>
        <div className="relative">
          <select 
            className="p-4 pr-12 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all appearance-none min-w-[240px]"
            value={selectedAccount || ''}
            onChange={e => setSelectedAccount(Number(e.target.value))}
          >
            {accounts.map(a => <option key={a.id} value={a.id} className="bg-[#050505]">@{a.handle} ({a.platform})</option>)}
          </select>
          <ChevronRight className="w-4 h-4 text-white/20 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="glass-card p-8 border-white/5">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">Avg Reach (7D)</h3>
          <p className="text-4xl font-serif font-medium gold-text-gradient">{(metrics.reduce((acc, m) => acc + m.reach, 0) / (metrics.length || 1)).toLocaleString()}</p>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">+12.4% vs prev</p>
        </div>
        <div className="glass-card p-8 border-white/5">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">Total Engagement</h3>
          <p className="text-4xl font-serif font-medium text-white">{(metrics.reduce((acc, m) => acc + m.saves + m.shares, 0)).toLocaleString()}</p>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">+5.2% vs prev</p>
        </div>
        <div className="glass-card p-8 bg-brand-primary text-black border-none flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em] mb-2">System Health</h3>
            <p className="text-2xl font-serif font-medium">Optimal</p>
          </div>
          <CheckCircle2 className="w-10 h-10 opacity-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card p-10 border-white/5">
          <h3 className="text-2xl font-serif font-medium mb-10">Reach Trajectory</h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(5, 5, 5, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    color: '#fff'
                  }} 
                  itemStyle={{ color: '#D4AF37' }}
                />
                <Area type="monotone" dataKey="reach" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorReach)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-10 border-white/5">
          <h3 className="text-2xl font-serif font-medium mb-10">Engagement Mix</h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(5, 5, 5, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    color: '#fff'
                  }} 
                />
                <Bar dataKey="engagement" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, trend, isStatic }: { label: string, value: number, trend: string, isStatic?: boolean }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-serif italic text-white/60">{label}</span>
      <div className="text-right">
        <p className="text-xl font-bold text-white font-mono">{value.toLocaleString()}</p>
        {!isStatic && (
          <p className={cn("text-[10px] font-black uppercase tracking-widest mt-1", isPositive ? "text-emerald-400" : "text-rose-400")}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}

function AuditLogInterface({ accounts, auditLogs, onUpdate }: { accounts: Account[], auditLogs: AuditLog[], onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterReviewer, setFilterReviewer] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [formData, setFormData] = useState<Partial<AuditLog>>({
    account_id: accounts[0]?.id,
    reviewer: 'Admin',
    thumbnail_ok: true,
    captions_ok: true,
    cta_ok: true,
    cadence_ok: true,
    notes: ''
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterAccount, filterReviewer, filterStartDate, filterEndDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addAuditLog(formData);
    setShowForm(false);
    onUpdate();
  };

  const reviewers = Array.from(new Set(auditLogs.map(log => log.reviewer)));

  const filteredLogs = auditLogs.filter(log => {
    const accountMatch = filterAccount === 'all' || log.account_id.toString() === filterAccount;
    const reviewerMatch = filterReviewer === 'all' || log.reviewer === filterReviewer;
    
    const logDate = new Date(log.timestamp);
    const startMatch = !filterStartDate || logDate >= new Date(filterStartDate);
    const endMatch = !filterEndDate || logDate <= new Date(new Date(filterEndDate).setHours(23, 59, 59, 999));
    
    return accountMatch && reviewerMatch && startMatch && endMatch;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Visualization Data: Quality Metrics over time (Last 7 Days)
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const qualityOverTime = last7Days.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const logsOnDate = auditLogs.filter(l => format(new Date(l.timestamp), 'yyyy-MM-dd') === dateStr);
    return {
      date: format(date, 'MMM dd'),
      thumbnail: logsOnDate.filter(l => l.thumbnail_ok).length,
      captions: logsOnDate.filter(l => l.captions_ok).length,
      cta: logsOnDate.filter(l => l.cta_ok).length,
      cadence: logsOnDate.filter(l => l.cadence_ok).length,
      total: logsOnDate.length
    };
  });

  // Visualization Data: Reviewer Activity per week
  const reviewerWeeks = auditLogs.reduce((acc, log) => {
    const week = format(startOfWeek(new Date(log.timestamp)), 'MMM dd');
    const reviewer = log.reviewer;
    if (!acc[week]) acc[week] = {};
    if (!acc[week][reviewer]) acc[week][reviewer] = 0;
    acc[week][reviewer]++;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const reviewerActivityData = Object.entries(reviewerWeeks).map(([week, reviewers]) => ({
    week,
    ...reviewers
  })).sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

  const handleExportCSV = (logsToExport = filteredLogs) => {
    const headers = ['ID', 'Account', 'Platform', 'Reviewer', 'Timestamp', 'Thumbnail', 'Captions', 'CTA', 'Cadence', 'Notes', 'Reviewed'];
    const rows = logsToExport.map(log => [
      log.id,
      log.handle,
      log.platform,
      log.reviewer,
      format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      log.thumbnail_ok ? 'PASS' : 'FAIL',
      log.captions_ok ? 'PASS' : 'FAIL',
      log.cta_ok ? 'PASS' : 'FAIL',
      log.cadence_ok ? 'PASS' : 'FAIL',
      `"${(log.notes || '').replace(/"/g, '""')}"`,
      log.reviewed ? 'YES' : 'NO'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map(l => l.id));
    }
  };

  const handleBatchMarkReviewed = async () => {
    if (selectedIds.length === 0) return;
    await api.batchUpdateAuditLogs(selectedIds, { reviewed: true });
    setSelectedIds([]);
    onUpdate();
  };

  const handleBatchExport = () => {
    if (selectedIds.length === 0) return;
    const logsToExport = auditLogs.filter(l => selectedIds.includes(l.id));
    handleExportCSV(logsToExport);
  };

  return (
    <div className="space-y-12 relative">
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-10 py-6 rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.5)] flex items-center gap-12 border border-white/20 backdrop-blur-3xl"
          >
            <div className="flex items-center gap-4 pr-12 border-r border-black/10">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-xs font-black text-white">
                {selectedIds.length}
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Selected Items</span>
            </div>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={handleBatchMarkReviewed}
                className="flex items-center gap-3 px-6 py-3 bg-black text-white hover:bg-black/80 rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Mark Reviewed
              </button>
              <button 
                onClick={handleBatchExport}
                className="flex items-center gap-3 px-6 py-3 bg-brand-primary text-black hover:bg-brand-primary/80 rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="flex items-center gap-2 px-4 py-2 text-black/40 hover:text-black transition-colors text-xs font-black uppercase tracking-widest"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <header>
          <h1 className="text-6xl font-serif font-light luxury-text-gradient mb-2">Audit Logs</h1>
          <p className="text-white/40 font-light tracking-wide">High-fidelity quality control inspections.</p>
        </header>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleExportCSV()}
            className="flex items-center gap-3 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all shadow-xl"
          >
            <Download className="w-4 h-4" />
            <span className="gold-text-gradient">Export Master CSV</span>
          </button>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-3 px-8 py-4 bg-brand-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-primary/90 transition-all shadow-2xl shadow-brand-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Inspection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card p-10 border-white/5">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-serif font-medium">Quality Pass Rates</h3>
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Last 7 Days</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(5, 5, 5, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    color: '#fff'
                  }} 
                />
                <Bar dataKey="thumbnail" name="Thumb" fill="#D4AF37" radius={[2, 2, 0, 0]} />
                <Bar dataKey="captions" name="Hook" fill="#10B981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cta" name="CTA" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cadence" name="Flow" fill="#F43F5E" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-10 border-white/5">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-serif font-medium">Personnel Velocity</h3>
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Inspections / Week</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reviewerActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="week" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(5, 5, 5, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    color: '#fff'
                  }} 
                />
                {reviewers.map((reviewer, index) => (
                  <Line 
                    key={reviewer}
                    type="monotone" 
                    dataKey={reviewer} 
                    stroke={['#D4AF37', '#10B981', '#3B82F6', '#F43F5E', '#8B5CF6'][index % 5]} 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: ['#D4AF37', '#10B981', '#3B82F6', '#F43F5E', '#8B5CF6'][index % 5], strokeWidth: 2, stroke: '#050505' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card p-12 border-white/10 space-y-10 relative overflow-hidden bg-white/[0.01] backdrop-blur-3xl shadow-[0_32px_128px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 blur-[120px] rounded-full -mr-48 -mt-48 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -ml-32 -mb-32" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 relative z-10">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">Temporal Start</label>
            <div className="relative group">
              <input 
                type="date" 
                className="glass-input w-full p-5 appearance-none group-hover:border-white/20 transition-all"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/[0.03] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">Temporal End</label>
            <div className="relative group">
              <input 
                type="date" 
                className="glass-input w-full p-5 appearance-none group-hover:border-white/20 transition-all"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/[0.03] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 pt-10 border-t border-white/5 relative z-10">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">Account Entity</label>
            <div className="relative group">
              <select 
                className="glass-input w-full p-5 appearance-none group-hover:border-white/20 transition-all"
                value={filterAccount}
                onChange={e => setFilterAccount(e.target.value)}
              >
                <option value="all" className="bg-[#050505]">All Entities</option>
                {accounts.map(a => <option key={a.id} value={a.id} className="bg-[#050505]">@{a.handle}</option>)}
              </select>
              <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-white/20 group-hover:text-white/40 transition-colors">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">Personnel Filter</label>
            <div className="relative group">
              <select 
                className="glass-input w-full p-5 appearance-none group-hover:border-white/20 transition-all"
                value={filterReviewer}
                onChange={e => setFilterReviewer(e.target.value)}
              >
                <option value="all" className="bg-[#050505]">All Personnel</option>
                {reviewers.map(r => <option key={r} value={r} className="bg-[#050505]">{r}</option>)}
              </select>
              <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-white/20 group-hover:text-white/40 transition-colors">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>
          <div className="flex items-end gap-5">
            <button 
              onClick={toggleSelectAll}
              className="glass-button flex-1 p-5 text-white/40"
            >
              {selectedIds.length === filteredLogs.length && filteredLogs.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button 
              onClick={() => {
                setFilterAccount('all');
                setFilterReviewer('all');
                setFilterStartDate('');
                setFilterEndDate('');
                setSelectedIds([]);
              }}
              className="glass-button flex-1 p-5 text-white/20 border-dashed"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {paginatedLogs.map(log => (
            <motion.div 
              key={log.id} 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedLog(log)}
              className={cn(
                "group glass-card overflow-hidden flex flex-col transition-all duration-500 border cursor-pointer bg-white/[0.01] backdrop-blur-2xl hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(212,175,55,0.1)] hover:border-white/20",
                selectedIds.includes(log.id) ? "border-brand-primary ring-4 ring-brand-primary/10" : "border-white/5"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              
              {/* Subtle Card Animation */}
              <motion.div 
                animate={{ 
                  opacity: [0.01, 0.03, 0.01],
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, 0]
                }}
                transition={{ 
                  duration: 5 + Math.random() * 5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -top-1/2 -right-1/2 w-full h-full bg-brand-primary/10 blur-[80px] rounded-full pointer-events-none"
              />
              <motion.div 
                animate={{ 
                  x: ['-100%', '100%'],
                  opacity: [0, 0.1, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: Math.random() * 2
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none"
              />

              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={cn(
              "h-2 w-full flex items-center justify-end px-6",
              log.thumbnail_ok && log.captions_ok && log.cta_ok && log.cadence_ok 
                ? "bg-emerald-500/40" 
                : "bg-amber-500/40"
            )}>
              <div 
                onClick={(e) => toggleSelect(log.id, e)}
                className={cn(
                  "w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center shadow-lg",
                  selectedIds.includes(log.id) 
                    ? "bg-white border-white text-black" 
                    : "bg-black/20 border-white/20 hover:bg-black/40"
                )}
              >
                {selectedIds.includes(log.id) && <CheckCircle2 className="w-4 h-4" />}
              </div>
            </div>
            
            <div className="p-10 flex flex-col h-full relative">
              {log.reviewed && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-500/20">
                  <span className="gold-text-gradient">Reviewed</span>
                </div>
              )}
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <PlatformIcon platform={log.platform || ''} className="w-16 h-16 p-4 bg-white/5 rounded-[24px] border border-white/10 shadow-2xl group-hover:scale-110 group-hover:shadow-brand-primary/20 transition-all duration-500" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#050505] border-2 border-white/10 flex items-center justify-center shadow-xl">
                      {log.thumbnail_ok && log.captions_ok && log.cta_ok && log.cadence_ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-serif font-medium text-white group-hover:text-brand-primary transition-colors luxury-text-gradient">@{log.handle}</h3>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-500 group-hover:scale-110",
                        log.thumbnail_ok && log.captions_ok && log.cta_ok && log.cadence_ok 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}>
                        <span className={cn(log.thumbnail_ok && log.captions_ok && log.cta_ok && log.cadence_ok && "gold-text-gradient")}>
                          {log.thumbnail_ok && log.captions_ok && log.cta_ok && log.cadence_ok ? 'Approved' : 'Issue Found'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{log.platform}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      <div className="flex items-center gap-2 text-white/30">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{format(new Date(log.timestamp), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-500 flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] mb-1">
                    <span className="gold-text-gradient">View Details</span> <ChevronRight className="w-4 h-4" />
                  </div>
                  <span className="px-4 py-1.5 bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10">
                    {log.reviewer}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                <AuditBadge label="Thumb" ok={log.thumbnail_ok} />
                <AuditBadge label="Hook" ok={log.captions_ok} />
                <AuditBadge label="CTA" ok={log.cta_ok} />
                <AuditBadge label="Flow" ok={log.cadence_ok} />
              </div>

              {log.notes && (
                <div className="mt-auto">
                  <div className="p-6 bg-white/[0.02] rounded-[24px] border border-white/5 relative group-hover:bg-white/[0.04] transition-colors">
                    <MessageSquare className="w-4 h-4 text-white/10 absolute top-4 right-4" />
                    <p className="text-sm text-white/60 leading-relaxed font-serif italic">
                      "{log.notes}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-8">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-4 glass-button disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          
          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "w-10 h-10 rounded-xl text-[10px] font-black transition-all",
                  currentPage === i + 1 
                    ? "bg-brand-primary text-black shadow-lg shadow-brand-primary/20" 
                    : "bg-white/5 text-white/40 hover:bg-white/10"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-4 glass-button disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}


      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-6"
            onClick={() => setShowForm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-12 w-full max-w-2xl border-white/10 relative"
            >
            <button 
              onClick={() => setShowForm(false)}
              className="absolute top-8 right-8 p-3 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-4xl font-serif font-light luxury-text-gradient mb-10">Account Inspection</h2>
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Account Entity</label>
                <select 
                  className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all appearance-none"
                  value={formData.account_id}
                  onChange={e => setFormData({...formData, account_id: Number(e.target.value)})}
                >
                  {accounts.map(a => <option key={a.id} value={a.id} className="bg-[#050505]">@{a.handle}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <Toggle label="Thumbnail Quality" value={formData.thumbnail_ok!} onChange={v => setFormData({...formData, thumbnail_ok: v})} />
                <Toggle label="Captions & Hooks" value={formData.captions_ok!} onChange={v => setFormData({...formData, captions_ok: v})} />
                <Toggle label="CTA Presence" value={formData.cta_ok!} onChange={v => setFormData({...formData, cta_ok: v})} />
                <Toggle label="Posting Cadence" value={formData.cadence_ok!} onChange={v => setFormData({...formData, cadence_ok: v})} />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Strategic Observations</label>
                <textarea 
                  className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-2xl h-32 text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10 font-serif italic"
                  placeholder="Any specific feedback..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-6 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-4 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 rounded-2xl transition-all"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-brand-primary text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all"
                >
                  Commit Audit
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      <AnimatePresence>
        {selectedLog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-50 p-6"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-4xl border-white/10 overflow-hidden relative"
            >
              <button 
                onClick={() => setSelectedLog(null)}
                className="absolute top-10 right-10 p-4 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className={cn(
                "h-2 w-full",
                selectedLog.thumbnail_ok && selectedLog.captions_ok && selectedLog.cta_ok && selectedLog.cadence_ok 
                  ? "bg-emerald-500" 
                  : "bg-amber-500"
              )} />

              <div className="p-16 sm:p-24">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-20">
                  <div className="flex items-center gap-10">
                    <div className="relative">
                      <PlatformIcon platform={selectedLog.platform || ''} className="w-32 h-32 p-8 bg-white/5 rounded-[40px] border border-white/10 shadow-2xl" />
                      <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full bg-[#050505] border-4 border-[#050505] shadow-2xl flex items-center justify-center">
                        {selectedLog.thumbnail_ok && selectedLog.captions_ok && selectedLog.cta_ok && selectedLog.cadence_ok ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-amber-400" />
                        )}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-6xl font-serif font-light text-white tracking-tight mb-2 luxury-text-gradient">@{selectedLog.handle}</h2>
                      <div className="flex items-center gap-5">
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] gold-text-gradient">{selectedLog.platform}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Audit ID: <span className="gold-text-gradient">#{selectedLog.id}</span></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col lg:items-end gap-3">
                    <div className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full">
                      Reviewer: <span className="gold-text-gradient">{selectedLog.reviewer}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/30">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">{format(new Date(selectedLog.timestamp), 'MMMM dd, yyyy')}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-20">
                  <AuditBadge label="Thumbnail" ok={selectedLog.thumbnail_ok} />
                  <AuditBadge label="Hook/Caption" ok={selectedLog.captions_ok} />
                  <AuditBadge label="CTA" ok={selectedLog.cta_ok} />
                  <AuditBadge label="Cadence" ok={selectedLog.cadence_ok} />
                </div>

                {selectedLog.notes && (
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Strategic Observations</h4>
                    <div className="p-12 bg-white/[0.02] rounded-[40px] border border-white/5 relative">
                      <MessageSquare className="w-8 h-8 text-white/5 absolute top-8 right-8" />
                      <p className="text-3xl font-serif italic text-white/70 leading-relaxed">
                        "{selectedLog.notes}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuditBadge({ label, ok }: { label: string, ok: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-2 p-4 rounded-[24px] border transition-all duration-500 group/badge glass-card",
      ok 
        ? "bg-emerald-500/[0.02] text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/30" 
        : "bg-rose-500/[0.02] text-rose-400 border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/30"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center mb-1 shadow-inner backdrop-blur-sm",
        ok ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
      )}>
        {ok ? <CheckCircle2 className="w-4 h-4 group-hover/badge:scale-110 transition-transform" /> : <AlertCircle className="w-4 h-4 group-hover/badge:scale-110 transition-transform" />}
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center leading-none opacity-60">{label}</span>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between group/toggle">
      <span className="text-sm font-serif italic text-white/60 group-hover/toggle:text-white transition-colors">{label}</span>
      <button 
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "w-12 h-6 rounded-full transition-all relative border",
          value ? "bg-brand-primary border-brand-primary" : "bg-white/5 border-white/10"
        )}
      >
        <div className={cn(
          "absolute top-1 w-3.5 h-3.5 rounded-full transition-all shadow-lg",
          value ? "right-1 bg-black" : "left-1 bg-white/20"
        )} />
      </button>
    </div>
  );
}

function InsightsFeed({ insights, accounts, onUpdate }: { insights: Insight[], accounts: Account[], onUpdate: () => void }) {
  const [newInsight, setNewInsight] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const tagCounts = accounts.map(a => {
    const count = insights.filter(i => {
      try {
        const tags = JSON.parse(i.tags);
        return Array.isArray(tags) && tags.includes(a.id);
      } catch {
        return false;
      }
    }).length;
    return { name: a.handle, value: count };
  }).filter(t => t.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

  const handlePost = async () => {
    if (!newInsight.trim()) return;
    await api.addInsight({ content: newInsight, tags: selectedTags });
    setNewInsight('');
    setSelectedTags([]);
    onUpdate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-6xl font-serif font-light luxury-text-gradient mb-4">Strategic Intelligence</h1>
          <p className="text-white/40 font-light tracking-wide">Virality notes and engagement strategies.</p>
        </div>
        {tagCounts.length > 0 && (
          <div className="glass-card px-6 py-3 border-white/5 flex items-center gap-6">
            <div className="h-12 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagCounts}>
                  <Bar dataKey="value" fill="#D4AF37" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Top Focus</p>
              <p className="text-lg font-serif font-medium text-white">@{tagCounts[0].name}</p>
            </div>
          </div>
        )}
      </header>

      <div className="glass-card p-10 space-y-8 border-white/5">
        <textarea 
          className="w-full p-8 bg-white/[0.02] border border-white/10 rounded-[32px] h-48 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-lg font-serif italic text-white/80 placeholder:text-white/10"
          placeholder="Share a strategic observation..."
          value={newInsight}
          onChange={e => setNewInsight(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {accounts.slice(0, 8).map(a => (
              <button 
                key={a.id}
                onClick={() => setSelectedTags(prev => prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id])}
                className={cn(
                  "text-[10px] px-4 py-2 rounded-full border transition-all font-black uppercase tracking-widest",
                  selectedTags.includes(a.id) ? "bg-brand-primary text-black border-brand-primary" : "bg-white/5 text-white/40 border-white/10 hover:border-brand-primary"
                )}
              >
                @{a.handle}
              </button>
            ))}
          </div>
          <button 
            onClick={handlePost}
            className="flex items-center gap-3 px-10 py-4 bg-brand-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-primary/90 transition-all shadow-2xl shadow-brand-primary/20"
          >
            <Send className="w-4 h-4" />
            Deploy Insight
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {insights.map(i => (
          <motion.div 
            key={i.id} 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 border-white/5 hover:border-brand-primary/20 transition-all group"
          >
            <div className="flex items-center gap-5 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/10 group-hover:scale-110 transition-transform">
                <Lightbulb className="w-7 h-7" />
              </div>
              <div>
                <p className="text-lg font-serif font-medium text-white">Strategic Note</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{formatDistanceToNow(new Date(i.created_at))} ago</p>
              </div>
            </div>
            <p className="text-xl font-serif italic text-white/70 leading-relaxed mb-8">"{i.content}"</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-8 border-t border-white/5">
              {JSON.parse(i.tags).map((tagId: number) => {
                const acc = accounts.find(a => a.id === tagId);
                return acc ? (
                  <span key={tagId} className="text-[10px] font-black uppercase tracking-widest text-brand-primary bg-brand-primary/5 px-3 py-1 rounded-full border border-brand-primary/10">
                    @{acc.handle}
                  </span>
                ) : null;
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onUpdate }: { settings: Settings | null, onUpdate: () => void }) {
  if (!settings) return null;

  const handleUpdate = async (key: string, value: any) => {
    await api.updateSettings(key, value);
    onUpdate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      <header>
        <h1 className="text-6xl font-serif font-light luxury-text-gradient mb-4">System Configuration</h1>
        <p className="text-white/40 font-light tracking-wide">Configure alert protocols and operational thresholds.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <section className="glass-card p-10 border-white/5 space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-serif font-medium">Alert Channels</h3>
          </div>
          
          <div className="space-y-8">
            <SettingsInput 
              label="Email Protocol" 
              value={settings.alert_destinations.email} 
              onChange={v => handleUpdate('alert_destinations', { ...settings.alert_destinations, email: v })}
            />
            <SettingsInput 
              label="Slack Integration" 
              value={settings.alert_destinations.slack} 
              onChange={v => handleUpdate('alert_destinations', { ...settings.alert_destinations, slack: v })}
            />
            <SettingsInput 
              label="WhatsApp Secure" 
              value={settings.alert_destinations.whatsapp} 
              onChange={v => handleUpdate('alert_destinations', { ...settings.alert_destinations, whatsapp: v })}
            />
          </div>
        </section>

        <section className="glass-card p-10 border-white/5 space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-serif font-medium">Anomaly Thresholds</h3>
          </div>
          
          <div className="space-y-8">
            <SettingsInput 
              label="Reach Variance (%)" 
              type="number"
              value={settings.thresholds.reach_drop} 
              onChange={v => handleUpdate('thresholds', { ...settings.thresholds, reach_drop: Number(v) })}
            />
            <SettingsInput 
              label="Cadence Gap (Hours)" 
              type="number"
              value={settings.thresholds.cadence_gap_hours} 
              onChange={v => handleUpdate('thresholds', { ...settings.thresholds, cadence_gap_hours: Number(v) })}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsInput({ label, value, onChange, type = 'text' }: { label: string, value: string | number, onChange: (v: string) => void, type?: string }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">{label}</label>
      <input 
        type={type}
        className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-white/10"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function PlatformIcon({ platform, className }: { platform: string, className?: string }) {
  switch (platform.toLowerCase()) {
    case 'instagram': return <Instagram className={cn("text-white/60", className)} />;
    case 'twitter': return <Twitter className={cn("text-white/60", className)} />;
    case 'youtube': return <Youtube className={cn("text-white/60", className)} />;
    case 'facebook': return <Facebook className={cn("text-white/60", className)} />;
    default: return <MessageSquare className={cn("text-white/60", className)} />;
  }
}

function StatCard({ label, value, subValue, icon: Icon, color, trend }: { label: string, value: number | string, subValue: string, icon: any, color: 'blue' | 'rose' | 'emerald', trend?: 'up' | 'down' }) {
  return (
    <motion.div 
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="glass-card p-10 border-white/5 relative overflow-hidden group"
    >
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-brand-primary/10 transition-all duration-700" 
      />
      
      <div className="flex items-start justify-between mb-10">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 group-hover:scale-110",
          color === 'rose' ? "bg-rose-500/10 text-rose-400 shadow-rose-500/20" : 
          color === 'emerald' ? "bg-emerald-500/10 text-emerald-400 shadow-emerald-500/20" :
          "bg-brand-primary/10 text-brand-primary shadow-brand-primary/20"
        )}>
          <Icon className="w-7 h-7" />
        </div>
        {trend && (
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
            trend === 'up' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          )}>
            {trend === 'up' ? 'Optimal' : 'Critical'}
          </div>
        )}
      </div>
      
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-3">{label}</p>
      <div className="flex items-baseline gap-3">
        <h4 className={cn(
          "text-6xl font-serif font-light",
          color === 'rose' ? "text-rose-400" : 
          color === 'emerald' ? "jewel-text-gradient" :
          "luxury-text-gradient"
        )}>{value}</h4>
      </div>
      <p className="text-sm text-white/30 mt-6 font-serif italic">{subValue}</p>
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage.tsx';
import './App.css';

interface User {
  email: string;
  name: string;
  tenantId: string;
}

interface Tenant {
  id: string;
  name: string;
  brandVoice?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface Post {
  id: string;
  platform: string;
  status: string;
  scheduledTime: string;
  publishedTime?: string;
  headline: string;
  productName: string;
  latestViews: number;
  errorMessage?: string;
}

interface Analytics {
  summary: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalPosts: number;
    scheduledPosts: number;
    publishedPosts: number;
    failedPosts: number;
  };
  platformBreakdown: Record<string, { views: number; likes: number; shares: number; postCount: number }>;
  recentPosts: Post[];
  timeline: Array<{ platform: string; views: number; likes: number; recordedAt: string }>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'accounts' | 'admin'>('dashboard');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Connection states
  const [accountConnections, setAccountConnections] = useState<Record<string, boolean>>({
    x: true,
    linkedin: true,
    facebook: false,
    tiktok: false,
    discord: true,
    whatsapp: false
  });

  const [mcpSnapshots, setMcpSnapshots] = useState<Array<{ id: string; name: string; url: string; status: string; detail: string }>>([]);

  // Campaign Creator Form
  const [formProductId, setFormProductId] = useState<string>('');
  const [formCampaignMode, setFormCampaignMode] = useState<'new' | 'existing'>('existing');
  const [formCampaignName, setFormCampaignName] = useState<string>('');
  const [formSelectedCampaignId, setFormSelectedCampaignId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [brandVoice, setBrandVoice] = useState<string>('');
  const [offerType, setOfferType] = useState<string>('');
  const [primaryPain, setPrimaryPain] = useState<string>('');
  const [primaryGain, setPrimaryGain] = useState<string>('');
  const [psychologicalHook, setPsychologicalHook] = useState<string>('curiosity');

  // Generated results
  const [headline, setHeadline] = useState<string>('Your Headline Appears Here');
  const [bodyText, setBodyText] = useState<string>('Your generated ad copy will appear here once you hit "Generate Ad with AI".');
  const [hashtags, setHashtags] = useState<string>('#trending, #mcp');
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['x', 'linkedin']);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [leads, setLeads] = useState<Array<{ id: string; name?: string; email?: string; score?: number; status?: string; source?: string; createdAt?: string }>>([]);
  void leads;

  const loadUsers = async () => {
    if (!selectedTenantId || !user) return;
    try {
      const res = await fetch(`${API_URL}/users?tenantId=${selectedTenantId}`, { headers: authHeaders() });
      const data = (await res.json()) as any[];
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  // Admin users state
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string; role: string; tenantId: string }>>([]);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<string>('ADMIN');

  // Loaders
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';

  const [authToken, setAuthToken] = useState<string>(localStorage.getItem('smm_auth_token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(!!authToken);
  const [authError, setAuthError] = useState<string>('');

  const authHeaders = () => ({ 'Authorization': `Bearer ${authToken}` } as Record<string, string>);

  const startGoogleLogin = () => {
    const clientId = (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      setAuthError('Google sign-in is not configured yet.');
      return;
    }
    setAuthError('');
    fetch(`${API_URL}/auth/google/url`)
      .then(res => res.json())
      .then((data: any) => data?.url ? (window.location.href = data.url) : setAuthError('Could not start Google sign-in.'))
      .catch(() => setAuthError('Failed to reach auth endpoint.'));
  };

  const logout = () => {
    localStorage.removeItem('smm_auth_token');
    setAuthToken('');
    setUser(null);
  };

  const verifyAuth = () => {
    const token = localStorage.getItem('smm_auth_token') || '';
    if (!token) {
      setAuthLoading(false);
      return;
    }
    setAuthToken(token);
    fetch(`${API_URL}/auth/verify`, { headers: authHeaders() })
      .then(res => res.json())
      .then((data: any) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user as User);
        } else {
          localStorage.removeItem('smm_auth_token');
          setAuthToken('');
          setUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('smm_auth_token');
        setAuthToken('');
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get('token');
    if (callbackToken) {
      localStorage.setItem('smm_auth_token', callbackToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
    verifyAuth();
  }, []);

  // Fetch tenants on mount
  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/tenants`, { headers: authHeaders() })
      .then(res => res.json())
      .then((data: Tenant[]) => {
        setTenants(data);
        if (data.length > 0 && !selectedTenantId) {
          setSelectedTenantId(data[0].id);
        }
      })
      .catch(err => console.error('Error fetching tenants:', err));
  }, [user]);

  // Fetch products, campaigns, and analytics whenever selected tenant changes
  useEffect(() => {
    if (!selectedTenantId || !user) return;

    const headers = authHeaders();

    // Fetch Products
    fetch(`${API_URL}/products?tenantId=${selectedTenantId}`, { headers })
      .then(res => res.json())
      .then((data: Product[]) => {
        setProducts(data);
        if (data.length > 0) {
          setFormProductId(data[0].id);
          const p = data[0];
          setProductName(p.name);
          setProductDescription(p.description);
          setTargetAudience(p.targetAudience);
        } else {
          setFormProductId('');
          setProductName('');
          setProductDescription('');
          setTargetAudience('');
        }
      });

    // Fetch Campaigns
    fetch(`${API_URL}/campaigns?tenantId=${selectedTenantId}`, { headers })
      .then(res => res.json())
      .then((data: Campaign[]) => {
        setCampaigns(data);
        if (data.length > 0) {
          setFormSelectedCampaignId(data[0].id);
        } else {
          setFormSelectedCampaignId('');
        }
      });

    // Initial Analytics Fetch
    fetchAnalytics();
    fetchLeads();

    fetch(`${API_URL}/users?tenantId=${selectedTenantId}`, { headers: authHeaders() })
      .then(res => res.json())
      .then((data: any[]) => setUsers(data))
      .catch(() => setUsers([]));
    
    // Setup polling every 5 seconds to get live views updates
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [selectedTenantId, user]);

  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchMcpStatus();
    }
  }, [activeTab]);

  const fetchAnalytics = () => {
    if (!selectedTenantId || !user) return;
    fetch(`${API_URL}/analytics?tenantId=${selectedTenantId}`, { headers: authHeaders() })
      .then(res => res.json())
      .then((data: Analytics) => {
        setAnalytics(data);
      })
      .catch(err => console.error('Error loading analytics:', err));
  };

  const fetchMcpStatus = () => {
    fetch(`${API_URL}/mcp/status`, { headers: authHeaders() })
      .then(res => res.json())
      .then((data: any) => {
        setMcpSnapshots(data.snapshots || []);
      })
      .catch(err => console.error('Error loading MCP status:', err));
  };

  const fetchLeads = () => {
    if (!selectedTenantId || !user) return;
    fetch(`${API_URL}/leads?tenantId=${selectedTenantId}`, { headers: authHeaders() })
      .then(res => res.json())
      .then((data: any[]) => {
        setLeads(data);
      })
      .catch(err => console.error('Error loading leads:', err));
  };

  const renderSVGChart = () => {
    if (!analytics || !analytics.timeline || analytics.timeline.length < 2) return <div style={{ color: 'var(--text-muted)' }}>Accumulating live timeline metrics...</div>;
    const points = analytics.timeline.map((item, idx) => {
      const x = 20 + idx / (analytics.timeline!.length - 1) * 460;
      const maxVal = Math.max(...analytics.timeline!.map(i => i.views), 120);
      const y = 180 - (item.views / maxVal) * 160;
      return { x, y, views: item.views };
    });
    const polyline = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    const area = `${polyline} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`;
    return (
      <svg viewBox="0 0 500 200" className="svg-chart">
        <defs>
          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="20" y1="20" x2="480" y2="20" stroke="var(--border-glass)" strokeWidth="0.5" />
        <line x1="20" y1="100" x2="480" y2="100" stroke="var(--border-glass)" strokeWidth="0.5" />
        <line x1="20" y1="180" x2="480" y2="180" stroke="var(--border-glass)" strokeWidth="1" />
        <path d={area} fill="url(#chartGlow)" />
        <path d={polyline} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r={idx % 3 === 0 ? 5 : 3} fill="var(--secondary)" stroke="#fff" strokeWidth={idx % 3 === 0 ? 1.5 : 1} />
            {idx % 3 === 0 && <text x={p.x} y={p.y - 10} fill="var(--text-primary)" fontSize="8" fontWeight="700" textAnchor="middle">{p.views}</text>}
          </g>
        ))}
      </svg>
    );
  };

  const handleProductChange = (productId: string) => {
    setFormProductId(productId);
    if (!productId) {
      setProductName('');
      setProductDescription('');
      setTargetAudience('');
      return;
    }
    const p = products.find(prod => prod.id === productId);
    if (p) {
      setProductName(p.name);
      setProductDescription(p.description);
      setTargetAudience(p.targetAudience);
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]);
  };

  const triggerAIGeneration = async () => {
    if (!productName || !productDescription) {
      alert('Please fill out Product Name and Description first!');
      return;
    }
    setIsGenerating(true);
    try {
      const activeTenant = tenants.find(t => t.id === selectedTenantId);
      const res = await fetch(`${API_URL}/generate-ad-from-theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          productName,
          productDescription,
          targetAudience,
          brandVoice: brandVoice || activeTenant?.brandVoice || 'Professional',
          psychologicalHook,
          offerType: offerType || productName,
          primaryPain,
          primaryGain
        })
      });
      const data = await res.json();
      setHeadline(data.headline);
      setBodyText(data.bodyText);
      setHashtags(data.hashtags);

      // Update preview image with a relevant placeholder search
      const imgKeywords = productName.toLowerCase().includes('skin') ? 'skincare' : 'dashboard';
      setImageUrl(imgKeywords === 'skincare'
        ? 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600'
        : 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600'
      );
    } catch (err) {
      console.error(err);
      alert('Failed to generate ad. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeployCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one social media platform!');
      return;
    }
    if (!scheduledTime) {
      alert('Please select a scheduled post time!');
      return;
    }

    setIsDeploying(true);

    try {
      let campaignId = formSelectedCampaignId;

      if (formCampaignMode === 'new' && formCampaignName) {
        const campaignRes = await fetch(`${API_URL}/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            name: formCampaignName,
            tenantId: selectedTenantId
          })
        });
        const campaignData = await campaignRes.json();
        campaignId = campaignData.id;

        const freshCampRes = await fetch(`${API_URL}/campaigns?tenantId=${selectedTenantId}`, { headers: authHeaders() });
        const freshCamps = await freshCampRes.json();
        setCampaigns(freshCamps);
        setFormSelectedCampaignId(campaignId);
      }

      await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          campaignId,
          productId: formProductId,
          headline,
          bodyText,
          hashtags,
          imageUrl,
          platforms: selectedPlatforms,
          scheduledTime: new Date(scheduledTime).toISOString()
        })
      });
      alert('Ad campaign scheduled successfully!');
      fetchAnalytics();
      setActiveTab('dashboard');
      setFormCampaignName('');
      setFormCampaignMode('existing');
    } catch (err) {
      console.error(err);
      alert('Failed to deploy campaign.');
    } finally {
      setIsDeploying(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'x':
        return '𝕏';
      case 'linkedin':
        return 'in';
      case 'facebook':
        return 'f';
      case 'tiktok':
        return '🎵';
      case 'discord':
        return '👾';
      case 'whatsapp':
        return '💬';
      default:
        return '📣';
    }
  };

  const getPlatformBg = (platform: string) => {
    switch (platform) {
      case 'x':
        return 'var(--color-x)';
      case 'linkedin':
        return 'var(--color-linkedin)';
      case 'facebook':
        return 'var(--color-facebook)';
      case 'tiktok':
        return 'var(--color-tiktok)';
      case 'discord':
        return 'var(--color-discord)';
      case 'whatsapp':
        return 'var(--color-whatsapp)';
      default:
        return 'var(--primary)';
    }
  };

  const [showLanding, setShowLanding] = useState<boolean>(false);

  const goToDashboard = () => {
    setShowLanding(false);
    startGoogleLogin();
  };

  return (
    <div className="app-container">
      {!user && !authLoading ? (
        showLanding ? (
          <LandingPage onGetStarted={goToDashboard} onGoogleLogin={startGoogleLogin} authError={authError} />
        ) : (
          <div className="glass" style={{ padding: '2rem', maxWidth: '480px', margin: '4rem auto', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
            <h2 style={{ fontWeight: 700 }}>Welcome to OmniSocial AI</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Generate, schedule, and track cross-platform ads.</p>
            <button className="btn-primary" style={{ marginTop: '1.25rem', width: '100%', justifyContent: 'center' }} onClick={() => setShowLanding(true)}>
              <span style={{ fontWeight: 700 }}>Get Started</span>
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>By continuing, you agree to the workspace access terms.</p>
          </div>
        )
      ) : (
        <div>
          <aside className="sidebar">
            <div>
              <div className="brand">
                <div className="brand-logo">💡</div>
                <span className="brand-name">OmniSocial AI</span>
              </div>
              <nav className="nav-links">
                <div
                  className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
                  Dashboard
                </div>
                <div
                  className={`nav-item ${activeTab === 'create' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create')}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Campaign Planner
                </div>
                <div
                  className={`nav-item ${activeTab === 'accounts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('accounts')}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  MCP Integrations
                </div>
                <div
                  className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a1 1 0 011 1.397l-7 10a1 1 0 01-1.397-.242L3 13.5V10a1 1 0 011-1h2a1 1 0 000-2H4a3 3 0 00-3 3v3.5a3 3 0 003 3h14a3 3 0 003-3V10a3 3 0 00-3-3h-2a1 1 0 000 2h2a1 1 0 011 1v3.5a1 1 0 01-1 1H7.414l6.586-4.707a1 1 0 011-1.397z" /></svg>
                  User Management
                </div>
              </nav>
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {user ? (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{user.name}</div>
                  <div style={{ marginBottom: '0.5rem' }}>{user.email}</div>
                  <button className="btn-secondary" style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }} onClick={logout}>Logout</button>
                </div>
              ) : (
                <>
                  <div>DO MCP Service: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>ONLINE</span></div>
                  <div>Tenant ID: {selectedTenantId.slice(0, 8)}...</div>
                </>
              )}
            </div>
          </aside>

          <main className="main-window">
            {/* Top Header Bar */}
            <header className="top-bar">
              <div className="tenant-selector">
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Tenant:</span>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="tenant-select"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="user-profile">
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {tenants.find(t => t.id === selectedTenantId)?.name || 'Loading...'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Co-Pilot Marketer</div>
                </div>
                <div className="avatar">AI</div>
              </div>
            </header>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Top Stat Cards */}
                <div className="metrics-grid">
                  <div className="metric-card glass glass-hover">
                    <div className="metric-label">Total Platform Views</div>
                    <div className="metric-val">{analytics?.summary.totalViews || 0}</div>
                    <div className="metric-badge">↗ +14.2%</div>
                  </div>
                  <div className="metric-card glass glass-hover">
                    <div className="metric-label">Campaign Engagement</div>
                    <div className="metric-val">
                      {(analytics?.summary.totalLikes || 0) + (analytics?.summary.totalShares || 0)}
                    </div>
                    <div className="metric-badge">↗ +8.7%</div>
                  </div>
                  <div className="metric-card glass glass-hover">
                    <div className="metric-label">Published / Scheduled</div>
                    <div className="metric-val">
                      {analytics?.summary.publishedPosts || 0} <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/ {analytics?.summary.totalPosts || 0}</span>
                    </div>
                    <div className="metric-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--secondary)' }}>Active</div>
                  </div>
                  <div className="metric-card glass glass-hover">
                    <div className="metric-label">DO MCP Tool Execution</div>
                    <div className="metric-val" style={{ color: 'var(--accent)' }}>100%</div>
                    <div className="metric-badge" style={{ background: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent)' }}>Stable</div>
                  </div>
                </div>

                {/* Platform grid pills */}
                <div className="platforms-list">
                  {analytics && Object.entries(analytics.platformBreakdown).map(([plat, stats]) => (
                    <div key={plat} className="platform-pill glass glass-hover">
                      <div className="platform-pill-icon" style={{ backgroundColor: getPlatformBg(plat) }}>
                        {getPlatformIcon(plat)}
                      </div>
                      <div className="platform-pill-views">{stats.views}</div>
                      <div className="platform-pill-label">{plat}</div>
                    </div>
                  ))}
                </div>

                {/* Charts & Graphs */}
                <div className="charts-grid">
                  <div className="chart-card glass">
                    <div className="chart-header">
                      <h3 className="chart-title">Real-Time Performance (All Channels)</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Polling Live View Metrics via DO MCP</span>
                    </div>
                    <div className="chart-canvas">
                      {renderSVGChart()}
                    </div>
                  </div>

                  <div className="chart-card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                    <h3 className="chart-title">Connected social tools</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {Object.entries(accountConnections).map(([plat, conn]) => (
                        <div key={plat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: conn ? 'var(--accent)' : 'var(--text-muted)' }} />
                            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{plat}</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: conn ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {conn ? 'Active' : 'Unlinked'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Scheduled Posts Queue */}
                <div className="table-card glass">
                  <div className="table-header">
                    <h3 className="table-title">Live Post Queue & Historical Actions</h3>
                    <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={fetchAnalytics}>
                      Force Refresh
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="post-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Headline</th>
                          <th>Platform</th>
                          <th>Scheduled Time</th>
                          <th>Status</th>
                          <th>Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics?.recentPosts && analytics.recentPosts.length > 0 ? (
                          analytics.recentPosts.map((post) => (
                            <tr key={post.id}>
                              <td style={{ fontWeight: 600 }}>{post.productName}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{post.headline}</td>
                              <td>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  backgroundColor: getPlatformBg(post.platform),
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem'
                                }}>
                                  {getPlatformIcon(post.platform)}
                                </span>
                              </td>
                              <td>{formatDate(post.scheduledTime)}</td>
                              <td>
                                <span className={`badge-status badge-${post.status.toLowerCase()}`}>
                                  {post.status}
                                </span>
                                {post.errorMessage && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>⚠️ {post.errorMessage}</div>}
                              </td>
                              <td style={{ fontWeight: 700 }}>{post.latestViews}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                              No campaigns found. Go to "Campaign Planner" to create one!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Planner Tab */}
            {activeTab === 'create' && (
              <div className="creator-layout">
                <div className="glass" style={{ padding: '2rem' }}>
                  <h2 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Launch AI Ad Campaign</h2>
                  <form onSubmit={handleDeployCampaign}>
                    {/* Product context inputs */}
                    <div className="form-group">
                      <label className="form-label">Select product context</label>
                      <select
                        className="form-input"
                        value={formProductId}
                        onChange={(e) => handleProductChange(e.target.value)}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        <option value="">+ Define New Product</option>
                      </select>
                    </div>

                    {formProductId === '' && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 10, marginBottom: '1.25rem' }}>
                        <div className="form-group">
                          <label className="form-label">Product Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="e.g. FitSync Smart Ring"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">What does it do?</label>
                          <textarea
                            className="form-textarea"
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                            placeholder="e.g. Tracks fitness metrics, heart rate variability, sleep patterns with a 7-day battery life."
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Target Audience Description</label>
                          <input
                            type="text"
                            className="form-input"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            placeholder="e.g. Health-conscious athletes, tech adopters, busy corporate staff"
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Brand Voice Override (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={brandVoice}
                        onChange={(e) => setBrandVoice(e.target.value)}
                        placeholder="e.g. Playful & humorous, or Educational"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Offer Type</label>
                        <select className="form-input" value={offerType} onChange={(e) => setOfferType(e.target.value)}>
                          <option value="">Select offer type</option>
                          <option value="hmis">Hospital / Clinic System</option>
                          <option value="saas">SaaS Tool</option>
                          <option value="service">Service / Agency</option>
                          <option value="product">Physical / Digital Product</option>
                          <option value="event">Event / Webinar</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Psychology Hook</label>
                        <select className="form-input" value={psychologicalHook} onChange={(e) => setPsychologicalHook(e.target.value)}>
                          <option value="curiosity">Curiosity Gap</option>
                          <option value="loss_aversion">Loss Aversion</option>
                          <option value="social_proof">Social Proof</option>
                          <option value="authority">Authority</option>
                          <option value="problem_solution_proof">Problem → Solution → Proof</option>
                          <option value="shareable_hook">Shareable Hook / Listicle</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Primary Pain</label>
                        <input className="form-input" value={primaryPain} onChange={(e) => setPrimaryPain(e.target.value)} placeholder="e.g. long queues and missed invoices" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Primary Gain</label>
                        <input className="form-input" value={primaryGain} onChange={(e) => setPrimaryGain(e.target.value)} placeholder="e.g. faster billing and happier patients" />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <button
                        type="button"
                        className="btn-primary pulse"
                        onClick={triggerAIGeneration}
                        disabled={isGenerating}
                      >
                        {isGenerating ? 'Generating Ad Copy with Gemini...' : '🪄 Generate Ad with AI'}
                      </button>
                    </div>

                    <hr style={{ borderColor: 'var(--border-glass)', margin: '1.5rem 0' }} />

                    {/* Campaign Selection */}
                    <div className="form-group">
                      <label className="form-label">Campaign Setup</label>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            checked={formCampaignMode === 'existing'}
                            onChange={() => setFormCampaignMode('existing')}
                          />
                          Add to Existing Campaign
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            checked={formCampaignMode === 'new'}
                            onChange={() => setFormCampaignMode('new')}
                          />
                          Create New Campaign
                        </label>
                      </div>

                      {formCampaignMode === 'existing' ? (
                        <select
                          className="form-input"
                          value={formSelectedCampaignId}
                          onChange={(e) => setFormSelectedCampaignId(e.target.value)}
                        >
                          {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Fall Product Expansion"
                          value={formCampaignName}
                          onChange={(e) => setFormCampaignName(e.target.value)}
                        />
                      )}
                    </div>

                    {/* Platforms selection */}
                    <div className="form-group">
                      <label className="form-label">Select Platforms to Publish</label>
                      <div className="platforms-select-grid">
                        {['x', 'linkedin', 'facebook', 'tiktok', 'discord', 'whatsapp'].map(p => (
                          <div
                            key={p}
                            className={`platform-checkbox ${selectedPlatforms.includes(p) ? 'selected' : ''}`}
                            onClick={() => handlePlatformToggle(p)}
                          >
                            <span style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              backgroundColor: getPlatformBg(p),
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.75rem'
                            }}>
                              {getPlatformIcon(p)}
                            </span>
                            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Schedule Time</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-primary pulse" disabled={isDeploying}>
                      {isDeploying ? 'Deploying...' : 'Deploy Campaign'}
                    </button>
                  </form>
                </div>

                {/* Preview Panel */}
                <div className="preview-card glass">
                  <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Live Preview</h3>
                  <div className="mock-phone">
                    <div className="mock-phone-header">
                      <div className="mock-avatar"></div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {tenants.find(t => t.id === selectedTenantId)?.name || 'Your Brand'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>Sponsored Ad</div>
                      </div>
                    </div>

                    <div className="mock-ad-image" style={{ backgroundImage: `url(${imageUrl})` }} />

                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {headline}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: '1.4', marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
                      {bodyText}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                      {hashtags}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Users Tab */}
            {activeTab === 'admin' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>User Management</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Manage workspace users and roles for this tenant.</p>
                </div>

                <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Add New User</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Full Name</label>
                      <input className="form-input" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Email</label>
                      <input className="form-input" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="name@company.com" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Role</label>
                      <select className="form-input" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                        <option value="ADMIN">Admin</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ height: 42 }}
                      onClick={async () => {
                        if (!newUserName || !newUserEmail) {
                          alert('Name and email are required');
                          return;
                        }
                        if (!selectedTenantId) return;
                        await fetch(`${API_URL}/users`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...authHeaders() },
                          body: JSON.stringify({ name: newUserName, email: newUserEmail, role: newUserRole, tenantId: selectedTenantId }),
                        });
                        setNewUserName('');
                        setNewUserEmail('');
                        setNewUserRole('ADMIN');
                        loadUsers();
                      }}
                    >
                      Add User
                    </button>
                  </div>
                </div>

                <div className="table-card glass">
                  <div className="table-header">
                    <h3 className="table-title">Workspace Users</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="post-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 600 }}>{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`badge-status badge-${u.role.toLowerCase()}`}>{u.role}</span>
                            </td>
                            <td>
                              <button
                                className="btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                                onClick={async () => {
                                  const newRole = prompt('Enter new role: ADMIN, EDITOR, or VIEWER', u.role);
                                  if (!newRole) return;
                                  await fetch(`${API_URL}/users/${u.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                    body: JSON.stringify({ role: newRole.toUpperCase() }),
                                  });
                                  loadUsers();
                                }}
                              >
                                Update Role
                              </button>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No users found for this tenant.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Linked Accounts Tab */}
            {activeTab === 'accounts' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Project Services & MCP Gateway</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Active campaign channels plus configured Hermes MCP services. Use this panel to confirm which integrations are enabled for this project.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  {[
                    { id: 'supabase', name: 'Supabase', desc: 'Migrations, auth, storage, and DB operations.' },
                    { id: 'vercel', name: 'Vercel', desc: 'Deployments, project metadata, and domain checks.' },
                    { id: 'notion', name: 'Notion', desc: 'Pages, databases, and task workspace sync.' },
                    { id: 'digitalocean', name: 'DigitalOcean', desc: 'Droplet and app platform resource management.' },
                    { id: 'figma', name: 'Figma', desc: 'Design tokens and UI asset retrieval.' },
                    { id: 'jarvis', name: 'Jarvis', desc: 'Voice I/O and browser-driven conversation layer.' }
                  ].map(item => {
                    const snap = mcpSnapshots.find(s => s.id === item.id);
                    const status = snap?.status || 'unknown';
                    const detail = snap?.detail || 'idle';
                    return (
                      <div key={item.id} className="account-card glass glass-hover">
                        <div className="account-icon" style={{ backgroundColor: 'rgba(148,163,184,.15)' }}>
                          {item.name.charAt(0)}
                        </div>
                        <h3 style={{ fontWeight: 700 }}>{item.name}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{item.desc}</div>
                        <div
                          className="account-status"
                          style={{
                            backgroundColor: status === 'online' ? 'rgba(20, 184, 166, 0.15)' : status === 'disabled' ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.12)',
                            color: status === 'online' ? 'var(--accent)' : status === 'disabled' ? 'var(--text-muted)' : '#ef4444'
                          }}
                        >
                          {status === 'online' ? `✓ Online ${detail}` : status === 'disabled' ? '○ Not configured' : `✗ ${status}: ${detail}`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Connected Social Tools</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Per-tenant publishing channels for this workspace.
                  </p>
                </div>

                <div className="accounts-grid">
                  {Object.entries(accountConnections).map(([platform, isConnected]) => (
                    <div key={platform} className="account-card glass glass-hover">
                      <div className="account-icon" style={{ backgroundColor: getPlatformBg(platform) }}>
                        {getPlatformIcon(platform)}
                      </div>
                      <h3 style={{ textTransform: 'capitalize', fontWeight: 700 }}>{platform} Network</h3>
                      <div
                        className="account-status"
                        style={{
                          backgroundColor: isConnected ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255,255,255,0.05)',
                          color: isConnected ? 'var(--accent)' : 'var(--text-muted)'
                        }}
                      >
                        {isConnected ? '✓ Connection Active' : '✗ Integration Offline'}
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ width: '100%', fontSize: '0.8rem' }}
                        onClick={() => {
                          setAccountConnections({
                            ...accountConnections,
                            [platform]: !isConnected
                          });
                        }}
                      >
                        {isConnected ? 'Disconnect Channel' : 'Authorize OAuth Link'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

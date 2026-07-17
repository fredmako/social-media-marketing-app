import React, { useState, useEffect } from 'react';
import './App.css';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'accounts'>('dashboard');
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

  // Campaign Creator Form
  const [formProductId, setFormProductId] = useState<string>('');
  const [formCampaignMode, setFormCampaignMode] = useState<'new' | 'existing'>('existing');
  const [formCampaignName, setFormCampaignName] = useState<string>('');
  const [formSelectedCampaignId, setFormSelectedCampaignId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [brandVoice, setBrandVoice] = useState<string>('');

  // Generated results
  const [headline, setHeadline] = useState<string>('Your Headline Appears Here');
  const [bodyText, setBodyText] = useState<string>('Your generated ad copy will appear here once you hit "Generate Ad with AI".');
  const [hashtags, setHashtags] = useState<string>('#trending, #mcp');
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['x', 'linkedin']);
  const [scheduledTime, setScheduledTime] = useState<string>('');

  // Loaders
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  const API_URL = 'http://localhost:3000/api';

  // Fetch tenants on mount
  useEffect(() => {
    fetch(`${API_URL}/tenants`)
      .then(res => res.json())
      .then((data: Tenant[]) => {
        setTenants(data);
        if (data.length > 0) {
          setSelectedTenantId(data[0].id);
        }
      })
      .catch(err => console.error('Error fetching tenants:', err));
  }, []);

  // Fetch products, campaigns, and analytics whenever selected tenant changes
  useEffect(() => {
    if (!selectedTenantId) return;

    // Fetch Products
    fetch(`${API_URL}/products?tenantId=${selectedTenantId}`)
      .then(res => res.json())
      .then((data: Product[]) => {
        setProducts(data);
        if (data.length > 0) {
          setFormProductId(data[0].id);
          // Prepopulate product fields from selection
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
    fetch(`${API_URL}/campaigns?tenantId=${selectedTenantId}`)
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

    // Setup polling every 5 seconds to get live views updates
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [selectedTenantId]);

  const fetchAnalytics = () => {
    if (!selectedTenantId) return;
    fetch(`${API_URL}/analytics?tenantId=${selectedTenantId}`)
      .then(res => res.json())
      .then((data: Analytics) => {
        setAnalytics(data);
      })
      .catch(err => console.error('Error loading analytics:', err));
  };

  const handleProductChange = (productId: string) => {
    setFormProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setProductName(prod.name);
      setProductDescription(prod.description);
      setTargetAudience(prod.targetAudience);
    }
  };

  const triggerAIGeneration = async () => {
    if (!productName || !productDescription) {
      alert('Please fill out Product Name and Description first!');
      return;
    }
    setIsGenerating(true);
    try {
      const activeTenant = tenants.find(t => t.id === selectedTenantId);
      const res = await fetch(`${API_URL}/generate-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDescription,
          targetAudience,
          brandVoice: brandVoice || activeTenant?.brandVoice || 'Professional'
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

  const handlePlatformToggle = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
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

      // 1. Create a campaign if new mode is selected
      if (formCampaignMode === 'new' && formCampaignName) {
        const campaignRes = await fetch(`${API_URL}/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formCampaignName,
            tenantId: selectedTenantId
          })
        });
        const campaignData = await campaignRes.json();
        campaignId = campaignData.id;
        
        // Refresh campaigns
        const freshCampRes = await fetch(`${API_URL}/campaigns?tenantId=${selectedTenantId}`);
        const freshCamps = await freshCampRes.json();
        setCampaigns(freshCamps);
        setFormSelectedCampaignId(campaignId);
      }

      // 2. Create ad creative & scheduled posts
      await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      alert('Ad campaign scheduled successfully! The background worker will process the posts at the selected time.');
      fetchAnalytics();
      setActiveTab('dashboard');
      
      // Reset form variables
      setFormCampaignName('');
      setFormCampaignMode('existing');
    } catch (err) {
      console.error(err);
      alert('Failed to deploy campaign.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Helper to format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render Custom SVG line graph
  const renderSVGChart = () => {
    if (!analytics || !analytics.timeline || analytics.timeline.length < 2) {
      return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Accumulating campaign views timeline metrics...
        </div>
      );
    }

    const width = 500;
    const height = 200;
    const padding = 20;

    const views = analytics.timeline.map(t => t.views);
    const minViews = 0;
    const maxViews = Math.max(...views, 100);

    const points = analytics.timeline.map((item, idx) => {
      const x = padding + (idx / (analytics.timeline.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((item.views - minViews) / (maxViews - minViews)) * (height - 2 * padding);
      return { x, y, ...item };
    });

    const pathData = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    const areaData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        <defs>
          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-glass)" strokeWidth="0.5" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-glass)" strokeWidth="0.5" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-glass)" strokeWidth="1" />

        {/* Filled Area */}
        <path d={areaData} fill="url(#chartGlow)" />

        {/* Line */}
        <path d={pathData} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />

        {/* Interactive Dots */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--secondary)" stroke="#fff" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 10} fill="var(--text-primary)" fontSize="8" fontWeight="700" textAnchor="middle">
              {p.views}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'x': return '𝕏';
      case 'linkedin': return 'in';
      case 'facebook': return 'f';
      case 'tiktok': return '🎵';
      case 'discord': return '👾';
      case 'whatsapp': return '💬';
      default: return '📣';
    }
  };

  const getPlatformBg = (platform: string) => {
    switch (platform) {
      case 'x': return 'var(--color-x)';
      case 'linkedin': return 'var(--color-linkedin)';
      case 'facebook': return 'var(--color-facebook)';
      case 'tiktok': return 'var(--color-tiktok)';
      case 'discord': return 'var(--color-discord)';
      case 'whatsapp': return 'var(--color-whatsapp)';
      default: return 'var(--primary)';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
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
          </nav>
        </div>

        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <div>DO MCP Service: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>ONLINE</span></div>
          <div>Tenant ID: {selectedTenantId.slice(0, 8)}...</div>
        </div>
      </aside>

      {/* Main content frame */}
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
                            {post.errorMessage && (
                              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                ⚠️ {post.errorMessage}
                              </div>
                            )}
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
                          fontSize: '0.65rem'
                        }}>
                          {getPlatformIcon(p)}
                        </span>
                        <span style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scheduled Time */}
                <div className="form-group">
                  <label className="form-label">Scheduling Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-input"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        // Set scheduled time to 15 seconds in future for immediate check
                        const d = new Date(Date.now() + 15000);
                        // format to local string required by input
                        const tzoffset = d.getTimezoneOffset() * 60000;
                        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
                        setScheduledTime(localISOTime);
                      }}
                    >
                      🚀 Set to Publish in 15 seconds (Demo Mode)
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={isDeploying}
                >
                  {isDeploying ? 'Deploying campaign...' : 'Schedule Campaign & Deploy to MCP'}
                </button>
              </form>
            </div>

            {/* Live mockup preview */}
            <div className="preview-card glass">
              <h3 style={{ marginBottom: '1.25rem', fontWeight: 600 }}>Social Ad Layout Preview</h3>
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

        {/* Linked Accounts Tab */}
        {activeTab === 'accounts' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>MCP Client & Gateway Settings</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                This portal connects the AI campaign scheduler with the remote Model Context Protocol (MCP) server on DigitalOcean. 
                Below are the integration pipelines for individual tenant channels.
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
  );
}

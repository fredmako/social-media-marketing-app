
interface LandingPageProps {
  onGetStarted: () => void;
  onGoogleLogin: () => void;
  authError?: string;
}

export default function LandingPage({ onGetStarted, onGoogleLogin, authError }: LandingPageProps) {
  const handleStart = () => {
    onGoogleLogin();
    onGetStarted();
  };
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-brand">OmniSocial AI</div>
        <h1>Turn one product idea into a full social marketing engine.</h1>
        <p>Generate ad creative, schedule cross-platform posts, and track live performance — without leaving this app.</p>
        <div style={{ marginTop: '2rem' }}>
          <button className="btn-get-started" onClick={handleStart}>
            Get Started
          </button>
        </div>
        {authError && (
          <p style={{ color: '#fca5a5', marginTop: '1rem', fontSize: '0.9rem' }}>{authError}</p>
        )}
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '1rem' }}>
          Requires workspace Google sign-in.
        </p>
      </div>

      <div className="landing-features">
        {[
          { title: 'AI Creative', desc: 'Generate on-brand headlines, body text, and hooks from a single product description.' },
          { title: 'Multi-Channel', desc: 'Publish to X, LinkedIn, Facebook, TikTok, Discord, and WhatsApp from one queue.' },
          { title: 'Live Analytics', desc: 'Track views, likes, and shares across platforms in real time.' },
        ].map((item) => (
          <div key={item.title} className="landing-feature glass">
            <div style={{ fontSize: '1.75rem' }}>•</div>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{item.title}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Page d'accueil publique (landing page) - Design QE.tn
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

// Animated ECG line
function ECGLine() {
  return (
    <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', overflow: 'hidden' }}>
      <style>{`
        .ecg-path {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: ecgDraw 3s ease-in-out infinite;
        }
        @keyframes ecgDraw {
          0%   { stroke-dashoffset: 2000; opacity: 1; }
          70%  { stroke-dashoffset: 0;    opacity: 1; }
          85%  { stroke-dashoffset: 0;    opacity: 1; }
          100% { stroke-dashoffset: -2000; opacity: 0; }
        }
      `}</style>
      <svg viewBox="0 0 1200 100" preserveAspectRatio="none" style={{ width: '100%', height: 70 }}>
        <path
          className="ecg-path"
          d="M0,50 L80,50 L110,15 L120,85 L130,5 L140,80 L150,50 L260,50
             L290,15 L300,85 L310,5 L320,80 L330,50 L440,50
             L470,15 L480,85 L490,5 L500,80 L510,50 L620,50
             L650,15 L660,85 L670,5 L680,80 L690,50 L800,50
             L830,15 L840,85 L850,5 L860,80 L870,50 L980,50
             L1010,15 L1020,85 L1030,5 L1040,80 L1050,50 L1200,50"
          fill="none" stroke="#3B82F6" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Fonctionnalités', id: 'fonctionnalites' },
    { label: 'Cours',           id: 'specialites'    },
    { label: 'À propos',        id: 'apropos'        },
  ];

  const stats = [
    { value: '92%',     label: 'Taux de réussite', color: '#3B82F6' },
    { value: '15,000+', label: 'QCM disponibles',  color: '#F59E0B' },
    { value: '24/7',    label: 'Support',           color: '#10B981' },
    { value: '500+',    label: 'Étudiants actifs',  color: '#EF4444' },
  ];

  const features = [
    {
      iconSvg: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
      iconBg: '#EFF6FF',
      title: 'Cours Structurés',
      desc: 'Contenu pédagogique organisé par spécialités médicales',
      badge: '100+ Heures',
      badgeColor: '#3B82F6',
      cardBg: '#FFFDF7',
      borderStyle: '1px solid #E2E8F0',
    },
    {
      iconSvg: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      ),
      iconBg: '#FFFBEB',
      title: 'QCM Intelligents',
      desc: 'Questions adaptatives avec explications détaillées',
      badge: '15,000+ Questions',
      badgeColor: '#F59E0B',
      cardBg: '#FFFFFF',
      borderStyle: '2px solid #F59E0B',
    },
    {
      iconSvg: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
      iconBg: '#ECFDF5',
      title: 'Suivi Médical',
      desc: 'Progression personnalisée selon votre spécialité',
      badge: 'Temps Réel',
      badgeColor: '#10B981',
      cardBg: '#FAFFFD',
      borderStyle: '1px solid #E2E8F0',
    },
  ];



  const btn = {
    base: {
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '14px 32px', borderRadius: 10, fontSize: 16,
      fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
    },
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: 'rgba(255,255,255,0.93)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => scrollTo('hero')}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#3B82F6' }}>QE</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B' }}>.tn</span>
            <svg width="50" height="18" viewBox="0 0 50 18" style={{ marginLeft: 4 }}>
              <path d="M0,9 L5,9 L8,3 L11,15 L14,1 L17,17 L20,9 L26,9 L29,3 L32,15 L35,1 L38,17 L41,9 L50,9"
                fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {navLinks.map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 15, color: '#475569', fontWeight: 500, padding: 0,
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#3B82F6'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Auth buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/login')} style={{
              padding: '8px 20px', borderRadius: 8,
              border: '1.5px solid #3B82F6', backgroundColor: 'transparent',
              color: '#3B82F6', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >Connexion</button>
            <button onClick={() => navigate('/register')} style={{
              padding: '8px 22px', borderRadius: 8, border: 'none',
              backgroundColor: '#3B82F6', color: '#fff', fontWeight: 600,
              fontSize: 14, cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563EB'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3B82F6'}
            >S'inscrire</button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="hero" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(36px,5vw,56px)', fontWeight: 700, color: '#1E293B', lineHeight: 1.2, marginBottom: 20 }}>
          Réussissez votre <span style={{ color: '#3B82F6' }}>Résidanat</span><br />
          avec <span style={{ color: '#F59E0B' }}>QE.tn</span>
        </h1>
        <p style={{ fontSize: 17, color: '#64748B', maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.7 }}>
          La plateforme de référence pour préparer le concours de résidanat en médecine en
          Tunisie. Excellence médicale et innovation pédagogique réunies.
        </p>
        <div style={{ marginBottom: 10 }}><ECGLine /></div>
        <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 48, letterSpacing: '0.06em' }}>
          Battements d'excellence • Innovation médicale
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{
            ...btn.base, border: 'none',
            backgroundColor: '#3B82F6', color: '#fff',
            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
          }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2563EB'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#3B82F6'; e.currentTarget.style.transform = 'none'; }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Commencer Maintenant
          </button>
          <button onClick={() => navigate('/demo')} style={{
            ...btn.base,
            border: '1.5px solid #CBD5E1', backgroundColor: '#fff', color: '#334155',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.transform = 'none'; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Voir la Démo
          </button>
        </div>
        
      {/* ── Stats with separators ── */}
      <section style={{ padding: '40px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {stats.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ textAlign: 'center', padding: '0 44px' }}>
                <div style={{ fontSize: 'clamp(30px,3vw,44px)', fontWeight: 800, color: s.color, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 14, color: '#64748B', marginTop: 7, fontWeight: 500 }}>{s.label}</div>
              </div>
              {i < stats.length - 1 && (
                <div style={{ width: 1, height: 52, backgroundColor: '#E2E8F0', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>
      </section>


      {/* ── Fonctionnalités ── */}
      <section id="fonctionnalites" style={{ backgroundColor: '#F8FAFC', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            Fonctionnalités d'Excellence
          </h2>
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: 16, marginBottom: 52 }}>
            Des outils innovants pour la réussite au résidanat tunisien
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                backgroundColor: f.cardBg, border: f.borderStyle, borderRadius: 16,
                padding: '40px 28px 32px', textAlign: 'center',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{
                  width: 62, height: 62, borderRadius: '50%',
                  backgroundColor: f.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 22px',
                }}>
                  {f.iconSvg}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 22 }}>{f.desc}</p>
                <span style={{
                  display: 'inline-block', padding: '6px 18px', borderRadius: 20,
                  backgroundColor: f.badgeColor, color: '#fff', fontSize: 13, fontWeight: 600,
                }}>
                  {f.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Spécialités Médicales ── */}
      <section id="specialites" style={{ backgroundColor: '#F1F5F9', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            Spécialités Médicales
          </h2>
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: 16, marginBottom: 52 }}>
            Préparation complète pour toutes les spécialités
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {[
              { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, iconBg: '#FEF2F2', label: 'Cardiologie',     cours: 45 },
              { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>, iconBg: '#EFF6FF', label: 'Neurologie',      cours: 38 },
              { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, iconBg: '#ECFDF5', label: 'Chirurgie',       cours: 52 },
              { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, iconBg: '#FFFBEB', label: 'Pédiatrie',       cours: 41 },
              { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>, iconBg: '#F5F3FF', label: 'Médecine Interne', cours: 60 },
              { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, iconBg: '#ECFEFF', label: 'Orthopédie',      cours: 33 },
              { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="1.8"><circle cx="12" cy="12" r="2"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>, iconBg: '#FDF2F8', label: 'Ophtalmologie',   cours: 29 },
              { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="1.8"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>, iconBg: '#F0FDFA', label: 'Pneumologie',     cours: 36 },
            ].map((s, i) => (
              <div key={i} style={{
                backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
                padding: '28px 20px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', backgroundColor: s.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>{s.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>{s.cours} cours</div>
                <button onClick={() => navigate('/login')} style={{
                  width: '100%', padding: '8px 0', borderRadius: 8,
                  border: '1.5px solid #E2E8F0', backgroundColor: '#fff',
                  color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#3B82F6'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#334155'; }}
                >Accéder</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA "Commencez Votre Préparation" ── */}
      <section id="apropos" style={{
        background: 'linear-gradient(135deg, #4F8EF7 0%, #3B82F6 40%, #2563EB 100%)',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, color: '#fff', marginBottom: 14 }}>
          Commencez Votre Préparation
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.88)', marginBottom: 40 }}>
          Rejoignez des centaines d'étudiants qui font confiance à QE.tn
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 30px', borderRadius: 10,
            border: '2px solid rgba(255,255,255,0.7)', backgroundColor: 'transparent',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Inscription Gratuite
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <button onClick={() => navigate('/login')} style={{
            padding: '13px 30px', borderRadius: 10,
            border: '2px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.15)',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
          >
            Se Connecter
          </button>
        </div>
      </section>

      {/* ── Footer dark ── */}
      <footer style={{ backgroundColor: '#0F172A', padding: '60px 24px 36px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Top row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
                <span style={{ fontWeight: 900, color: '#3B82F6', fontSize: 20 }}>QE</span>
                <span style={{ fontWeight: 900, color: '#F59E0B', fontSize: 20 }}>.tn</span>
                <svg width="44" height="16" viewBox="0 0 44 16" style={{ marginLeft: 4 }}>
                  <path d="M0,8 L4,8 L7,2 L10,14 L13,1 L16,15 L19,8 L24,8 L27,2 L30,14 L33,1 L36,15 L39,8 L44,8"
                    fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, maxWidth: 260 }}>
                Plateforme d'excellence pour la préparation au résidanat médical
              </p>
            </div>

            {/* Plateforme */}
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Plateforme</h4>
              {['Cours', 'QCM', 'Examens'].map(l => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#fff'}
                    onMouseLeave={e => e.target.style.color = '#94A3B8'}
                  >{l}</a>
                </div>
              ))}
            </div>

            {/* Support */}
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Support</h4>
              {['Aide', 'Contact', 'FAQ'].map(l => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#fff'}
                    onMouseLeave={e => e.target.style.color = '#94A3B8'}
                  >{l}</a>
                </div>
              ))}
            </div>

            {/* Légal */}
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Légal</h4>
              {['CGU', 'Confidentialité'].map(l => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#fff'}
                    onMouseLeave={e => e.target.style.color = '#94A3B8'}
                  >{l}</a>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom border + copyright */}
          <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#475569' }}>
              © 2025 QE.tn — Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
/**
 * StudentDashboard - Design fidèle à la maquette (image 1)
 * Fichier : src/pages/StudentDashboard.tsx
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts';
import { Card } from '../components/ui/card';
import {
  Calendar,
  CheckSquare,
  Square,
  Clock,
  MapPin,
  Play,
  Brain,
  BarChart2,
  Flame,
  BookMarked,
  Activity,
} from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatDate() {
  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const time = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
  return `${date} • ${time}`;
}

const initialTasks = [
  {
    id: 1, done: false, emoji: '📘',
    title: 'Révision Cardiologie',
    subtitle: 'SCA - Syndrome Coronarien Aigu',
    time: '09:00', duration: '2h', location: '',
  },
  {
    id: 2, done: false, emoji: '🫁',
    title: 'QCM Pneumologie',
    subtitle: 'Série 2024 - Sousse',
    time: '14:30', duration: '1h30', location: 'Sousse',
  },
];

export function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (id: number) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const displayName = user?.fullName
    ? `Dr. ${user.fullName}`
    : user?.email ?? 'Dr. Étudiant';

  return (
    <div className="space-y-6">

      {/* ── Bienvenue ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-800">
            {getGreeting()} {displayName} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Prêt(e) pour votre session d'étude ?</p>
          <div className="flex items-center gap-2 mt-3 text-slate-400 text-sm">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="capitalize">{formatDate()}</span>
          </div>
        </Card>
      </motion.div>

      {/* ── Programme du jour ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
        <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-slate-500 text-lg">◎</span>
            <h2 className="text-base font-semibold text-slate-700">Votre Programme Aujourd'hui</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="flex items-start gap-3 cursor-pointer group py-4 first:pt-0 last:pb-0"
              >
                <div className="mt-0.5 shrink-0 text-slate-300 group-hover:text-blue-400 transition-colors">
                  {task.done
                    ? <CheckSquare className="w-5 h-5 text-blue-500" />
                    : <Square className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{task.emoji}</span>
                    <span className={`font-semibold text-sm text-slate-800 ${task.done ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 mt-1 text-xs text-slate-400">
                    <span>{task.subtitle}</span>
                    {task.location && (<><span>•</span><span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{task.location}</span></>)}
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{task.time}</span>
                    <span>•</span>
                    <span>⏱ {task.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Boutons d'action — grille 3 colonnes égales ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.16 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}
      >
        {/* QCM Séries */}
        <button
          onClick={() => navigate('/train/series')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '12px', padding: '28px 8px',
            borderRadius: '16px', backgroundColor: '#4f7cff', color: 'white',
            border: 'none', cursor: 'pointer', transition: 'background 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3d6dee')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4f7cff')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>QCM Séries</span>
        </button>

        {/* QCM à la Carte */}
        <button
          onClick={() => navigate('/train/custom')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '12px', padding: '28px 8px',
            borderRadius: '16px', backgroundColor: '#4f7cff', color: 'white',
            border: 'none', cursor: 'pointer', transition: 'background 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3d6dee')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4f7cff')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>QCM à la Carte</span>
        </button>

        {/* Test QCM */}
        <button
          onClick={() => navigate('/exam')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '12px', padding: '28px 8px',
            borderRadius: '16px', backgroundColor: 'white', color: '#64748b',
            border: '2px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f7cff'; e.currentTarget.style.color = '#4f7cff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '18px' }}>🎯</span>
            <Activity size={20} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Test QCM</span>
        </button>
      </motion.div>

      {/* ── 3 Cartes inférieures ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.24 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}
      >
        {/* Continuer */}
        <Card className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Play className="w-4 h-4" />
            <span>Continuer</span>
          </div>
          <p className="font-bold text-slate-800 text-lg">Cardio - Chapitre 3</p>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: '78%', height: '100%', backgroundColor: '#4f7cff', borderRadius: '999px' }} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <BookMarked className="w-3.5 h-3.5" />
            <span>78% terminé</span>
          </div>
          <button
            onClick={() => navigate('/learn/courses')}
            style={{
              marginTop: 'auto', width: '100%', padding: '12px',
              borderRadius: '12px', backgroundColor: '#4f7cff', color: 'white',
              border: 'none', fontWeight: 700, fontSize: '12px',
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3d6dee')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4f7cff')}
          >
            REPRENDRE
          </button>
        </Card>

        {/* Citation du Jour */}
        <Card className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Brain className="w-4 h-4" />
            <span>Citation du Jour</span>
          </div>
          <p className="text-slate-700 text-sm italic leading-relaxed" style={{ flex: 1 }}>
            "Le succès est la somme de petits efforts répétés jour après jour."
          </p>
          <p className="text-slate-400 text-xs">- Robert Collier</p>
        </Card>

        {/* Progression */}
        <Card className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <BarChart2 className="w-4 h-4" />
            <span>Progression</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame className="w-5 h-5 text-orange-500" />
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>7</span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>Jours Série</span>
            </div>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#4f7cff' }}>85%</span>
              <span style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>Objectif</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>📚</span>
            <span>12 cours terminés</span>
          </div>
        </Card>
      </motion.div>

    </div>
  );
}
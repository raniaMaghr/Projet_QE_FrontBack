# Guide d'intégration Backend pour QE.tn

## 🎯 État actuel

Le frontend QE.tn est **fonctionnel avec des données mock** et prêt pour l'intégration backend. Supabase est déjà connecté et configuré.

---

## 📊 Structure de données nécessaire

### 1. Tables Supabase à créer

#### **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  faculte TEXT CHECK (faculte IN ('FMT', 'FMS', 'FMM', 'FMSf')),
  annee_etude TEXT CHECK (annee_etude IN ('J1', 'J2')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Gamification
  points_total INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  -- Settings
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN DEFAULT TRUE
);
```

#### **cas_cliniques**
```sql
CREATE TABLE cas_cliniques (
  id TEXT PRIMARY KEY,
  numero INTEGER UNIQUE NOT NULL,
  contenu TEXT NOT NULL,
  specialite TEXT NOT NULL,
  niveau TEXT CHECK (niveau IN ('J1', 'J2')),
  faculte TEXT CHECK (faculte IN ('FMT', 'FMS', 'FMM', 'FMSf', 'ALL')),
  annee TEXT, -- 2022-2025
  difficulte TEXT CHECK (difficulte IN ('Facile', 'Moyen', 'Difficile')),
  tags TEXT[], -- ex: ['cardiologie', 'urgence']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **questions**
```sql
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  cas_clinique_id TEXT REFERENCES cas_cliniques(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  enonce TEXT NOT NULL,
  type_reponse TEXT CHECK (type_reponse IN ('unique', 'multiple')) DEFAULT 'unique',
  reponse_correcte TEXT[] NOT NULL, -- ex: ['A', 'C']
  explication TEXT NOT NULL,
  difficulte TEXT CHECK (difficulte IN ('Facile', 'Moyen', 'Difficile')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **qcm_results**
```sql
CREATE TABLE  qcm_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  series_id uuid,

  correct_answers int,
  incorrect_answers int,
  not_answered int,

  total_questions int,
  score int,

  total_time int,

  answers jsonb, 
  created_at timestamp default now()
);
```

#### **options_questions**
```sql
CREATE TABLE options_questions (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  letter TEXT NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
  text TEXT NOT NULL,
  ordre INTEGER NOT NULL,
  UNIQUE(question_id, letter)
);
```

#### **series_qcm**
```sql
CREATE TABLE series_qcm (
  id TEXT PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT,
  specialite TEXT,
  niveau TEXT CHECK (niveau IN ('J1', 'J2')),
  faculte TEXT,
  annee TEXT,
  cas_cliniques_ids TEXT[] NOT NULL,
  nb_questions INTEGER,
  duree_estimee INTEGER, -- en minutes
  difficulte TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **user_answers**
```sql
CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- pour regrouper les réponses d'une session
  selected TEXT[] NOT NULL, -- les lettres sélectionnées
  is_correct BOOLEAN NOT NULL,
  time_spent INTEGER, -- en secondes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, question_id, session_id)
);
```

#### **user_sessions**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('entrainement', 'examen', 'serie')) NOT NULL,
  serie_id TEXT REFERENCES series_qcm(id),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  total_questions INTEGER,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score_percent DECIMAL(5,2),
  time_spent INTEGER, -- en secondes
  completed BOOLEAN DEFAULT FALSE
);
```

#### **user_progress**
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  specialite TEXT NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  avg_time_per_question INTEGER,
  last_practiced TIMESTAMP WITH TIME ZONE,
  mastery_level DECIMAL(3,2) DEFAULT 0, -- 0-1
  
  UNIQUE(user_id, specialite)
);
```

#### **user_highlights**
```sql
CREATE TABLE user_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  highlighted_text TEXT NOT NULL,
  container_type TEXT CHECK (container_type IN ('cas', 'question', 'option')),
  container_id TEXT NOT NULL,
  color TEXT DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 Points d'intégration API

### Endpoints nécessaires

#### **Authentification** (géré par Supabase Auth)
- `POST /auth/signup` - Inscription
- `POST /auth/login` - Connexion
- `POST /auth/logout` - Déconnexion
- `GET /auth/user` - Informations utilisateur

#### **QCM et Questions**
```typescript
// GET /api/cas-cliniques?specialite=X&niveau=J1&faculte=FMT&annee=2024
// POST /api/sessions - Créer une session d'entraînement
// POST /api/sessions/:id/answers - Soumettre une réponse
// GET /api/sessions/:id - Récupérer l'état d'une session
// PUT /api/sessions/:id/complete - Terminer une session
```

#### **Séries**
```typescript
// GET /api/series?niveau=J1&specialite=X
// GET /api/series/:id - Détails d'une série
```

#### **Progression et Stats**
```typescript
// GET /api/users/:id/progress
// GET /api/users/:id/stats
// GET /api/users/:id/streak
// POST /api/users/:id/activity - Enregistrer une activité
```

#### **Highlights**
```typescript
// GET /api/highlights/:questionId
// POST /api/highlights - Créer un surlignage
// DELETE /api/highlights/:id - Supprimer un surlignage
```

---

## 🔧 Modifications frontend nécessaires

### 1. Créer un service API centralisé

```typescript
// /utils/api/client.ts
import { createClient } from '@supabase/supabase-js';
import { publicAnonKey, projectId } from '../supabase/info';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// Service QCM
export const qcmService = {
  async getCasCliniques(filters: QCMFilters) {
    const { data, error } = await supabase
      .from('cas_cliniques')
      .select(`
        *,
        questions (
          *,
          options_questions (*)
        )
      `)
      .match(filters);
    
    if (error) throw error;
    return data;
  },
  
  async createSession(type: string, userId: string) {
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({ user_id: userId, type })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async submitAnswer(sessionId: string, questionId: number, selected: string[], timeSpent: number) {
    // Vérifier si la réponse est correcte
    const { data: question } = await supabase
      .from('questions')
      .select('reponse_correcte')
      .eq('id', questionId)
      .single();
    
    const isCorrect = 
      selected.length === question.reponse_correcte.length &&
      selected.every(s => question.reponse_correcte.includes(s));
    
    const { data, error } = await supabase
      .from('user_answers')
      .insert({
        session_id: sessionId,
        question_id: questionId,
        selected,
        is_correct: isCorrect,
        time_spent: timeSpent
      })
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, isCorrect };
  }
};

// Service Highlights
export const highlightService = {
  async getHighlights(questionId: number, userId: string) {
    const { data, error } = await supabase
      .from('user_highlights')
      .select('*')
      .eq('question_id', questionId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },
  
  async createHighlight(highlight: Omit<Highlight, 'id'>, userId: string) {
    const { data, error } = await supabase
      .from('user_highlights')
      .insert({ ...highlight, user_id: userId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async deleteHighlight(highlightId: string) {
    const { error } = await supabase
      .from('user_highlights')
      .delete()
      .eq('id', highlightId);
    
    if (error) throw error;
  }
};
```

### 2. Adapter QCMPage.tsx pour utiliser l'API

Remplacer les données mock par des appels API :

```typescript
// Dans QCMPage.tsx
import { qcmService, highlightService } from '../../utils/api/client';

export default function QCMPage({ userId, ...props }: QCMPageProps) {
  const [casCliniques, setCasCliniques] = useState<CasClinique[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initSession() {
      try {
        // Créer une session
        const session = await qcmService.createSession('entrainement', userId);
        setSessionId(session.id);
        
        // Charger les cas cliniques
        const data = await qcmService.getCasCliniques({
          niveau: 'J1',
          faculte: 'FMT'
        });
        setCasCliniques(data);
        
        // Charger les highlights
        if (data[0]?.questions[0]) {
          const highlights = await highlightService.getHighlights(
            data[0].questions[0].id,
            userId
          );
          setHighlights(highlights);
        }
      } catch (error) {
        console.error('Erreur initialisation:', error);
      } finally {
        setLoading(false);
      }
    }
    
    initSession();
  }, [userId]);

  const handleValidate = async () => {
    if (!sessionId) return;
    
    try {
      const result = await qcmService.submitAnswer(
        sessionId,
        currentQuestion.id,
        currentAnswer.selected,
        currentAnswer.timeSpent
      );
      
      setUserAnswers(
        new Map(userAnswers.set(currentQuestion.id, {
          ...currentAnswer,
          isValidated: true,
          isCorrect: result.isCorrect
        }))
      );
    } catch (error) {
      console.error('Erreur validation:', error);
    }
  };
  
  const handleCreateHighlight = async (highlight: Highlight) => {
    try {
      const saved = await highlightService.createHighlight(highlight, userId);
      setHighlights([...highlights, saved]);
    } catch (error) {
      console.error('Erreur surlignage:', error);
    }
  };
}
```

### 3. Ajouter un contexte d'authentification

```typescript
// /utils/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Écouter les changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## ✅ Checklist d'intégration

### Phase 1: Configuration Supabase
- [ ] Créer les tables dans Supabase
- [ ] Configurer les Row Level Security (RLS) policies
- [ ] Activer Supabase Auth
- [ ] Importer les données de base (cas cliniques, questions)

### Phase 2: Services API
- [ ] Créer `/utils/api/client.ts`
- [ ] Implémenter `qcmService`
- [ ] Implémenter `highlightService`
- [ ] Implémenter `progressService`
- [ ] Implémenter `statsService`

### Phase 3: Authentification
- [ ] Créer `AuthContext`
- [ ] Adapter `SimpleLoginPage` pour utiliser Supabase Auth
- [ ] Ajouter protection des routes
- [ ] Gérer la persistance de session

### Phase 4: Adaptation composants
- [ ] Adapter `QCMPage` pour l'API
- [ ] Adapter `SimpleHomePage` (dashboard)
- [ ] Adapter `StatsPage`
- [ ] Ajouter gestion d'erreurs
- [ ] Ajouter états de chargement

### Phase 5: Fonctionnalités avancées
- [ ] Système de highlights persistant
- [ ] Calcul automatique des stats
- [ ] Système de streaks
- [ ] Notifications
- [ ] Système de répétition espacée

---

## 🔒 Row Level Security (RLS) Policies

```sql
-- Users peuvent lire uniquement leurs propres données
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Cas cliniques publics en lecture
ALTER TABLE cas_cliniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cas cliniques"
  ON cas_cliniques FOR SELECT
  TO authenticated
  USING (true);

-- Questions publiques en lecture
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- User answers - privées
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers"
  ON user_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
  ON user_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User highlights - privées
ALTER TABLE user_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own highlights"
  ON user_highlights FOR ALL
  USING (auth.uid() = user_id);
```

---

## 📦 Packages supplémentaires à installer

```bash
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-react
npm install react-query  # Pour la gestion du cache et des requêtes
```

---

## 🎨 Résumé

**OUI, le frontend est prêt pour l'intégration backend !**

### Points forts:
✅ Interface complète avec toutes les sections
✅ Composants bien structurés et réutilisables
✅ Design system cohérent
✅ Supabase déjà connecté
✅ Types TypeScript bien définis
✅ Fonctionnalités UI complètes (surlignage, navigation, feedback)

### À faire:
🔧 Créer les tables Supabase
🔧 Implémenter les services API
🔧 Connecter les composants à l'API
🔧 Ajouter l'authentification
🔧 Gérer les états de chargement/erreurs

Le frontend est **production-ready** d'un point de vue UI/UX. L'intégration backend est clairement définie et peut être faite progressivement, fonctionnalité par fonctionnalité.

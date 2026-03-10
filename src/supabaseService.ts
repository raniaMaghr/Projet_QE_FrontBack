import { supabase } from './supabaseClient';
import { QCMEntry, SeriesMetadata } from './types/qcm.types';

export interface SupabaseSeries {
  id: string;
  user_id: string;
  objective: string;
  faculty: string;
  year: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseQuestion {
  id: string;
  series_id: string;
  question: string;
  options: string[];
  correct_answers: string[];
  ai_justification: string;
  type: 'QCM' | 'Cas clinique';
  tags: string[];
  sub_course: string | null;
  clinical_case_id: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionWithSeries extends SupabaseQuestion {
  series?: SupabaseSeries;
}

// ===== AUTHENTIFICATION =====

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// ===== SÉRIES DE QCM =====

export async function createSeries(metadata: SeriesMetadata): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('qcm_series')
    .insert({
      user_id: user.id,
      objective: metadata.objective,
      faculty: metadata.faculty,
      year: metadata.year,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function getAllSeries(): Promise<SupabaseSeries[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('qcm_series')
    .select('*')
    //.eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSeriesById(seriesId: string): Promise<SupabaseSeries | null> {
  const { data, error } = await supabase
    .from('qcm_series')
    .select('*')
    .eq('id', seriesId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateSeries(seriesId: string, metadata: Partial<SeriesMetadata>) {
  const { error } = await supabase
    .from('qcm_series')
    .update(metadata)
    .eq('id', seriesId);

  if (error) throw error;
}

export async function deleteSeries(seriesId: string) {
  const { error } = await supabase
    .from('qcm_series')
    .delete()
    .eq('id', seriesId);

  if (error) throw error;
}

// ===== QUESTIONS =====

export async function createQuestions(seriesId: string, questions: QCMEntry[]) {
  const questionsToInsert = questions.map(q => ({
    series_id: seriesId,
    question: q.question,
    options: q.options,
    correct_answers: q.correctAnswers,
    ai_justification: q.aiJustification,
    type: q.type,
    tags: q.tags,
    sub_course: q.subCourse,
    clinical_case_id: q.clinicalCaseId,
  }));

  const { data, error } = await supabase
    .from('qcm_questions')
    .insert(questionsToInsert)
    .select();

  if (error) throw error;
  return data;
}

export async function getQuestionsBySeriesId(seriesId: string): Promise<SupabaseQuestion[]> {
  const { data, error } = await supabase
    .from('qcm_questions')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: true });
    console.log("seriesId:", seriesId);
    
  if (error) throw error;
  return data || [];
}

export async function updateQuestion(questionId: string, updates: Partial<QCMEntry>) {
  const updateData: any = {};
  
  if (updates.question !== undefined) updateData.question = updates.question;
  if (updates.options !== undefined) updateData.options = updates.options;
  if (updates.correctAnswers !== undefined) updateData.correct_answers = updates.correctAnswers;
  if (updates.aiJustification !== undefined) updateData.ai_justification = updates.aiJustification;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.subCourse !== undefined) updateData.sub_course = updates.subCourse;
  if (updates.clinicalCaseId !== undefined) updateData.clinical_case_id = updates.clinicalCaseId;
  if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;


  const { error } = await supabase
    .from('qcm_questions')
    .update(updateData)
    .eq('id', questionId);

  if (error) throw error;
}

export async function deleteQuestion(questionId: string) {
  const { error } = await supabase
    .from('qcm_questions')
    .delete()
    .eq('id', questionId);

  if (error) throw error;
}

// ===== SOUS-COURS =====

export async function createSubCourse(name: string) {
  return { name };
}

export async function getAllSubCourses(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data: series, error: seriesError } = await supabase
    .from('qcm_series')
    .select('id')
    .eq('user_id', user.id);

  if (seriesError) throw seriesError;
  if (!series || series.length === 0) return [];

  const seriesIds = series.map((s: any) => s.id);

  const { data, error } = await supabase
    .from('qcm_questions')
    .select('sub_course')
    .in('series_id', seriesIds)
    .not('sub_course', 'is', null);

  if (error) throw error;

  const unique = Array.from(new Set(
    (data?.map((r: any) => r.sub_course).filter(Boolean) as string[]) || []
  ));
  return unique.sort();
}

// ===== DÉTECTION DE DOUBLONS AVEC FILTRES =====

/**
 * Récupère toutes les séries de l'utilisateur avec leurs métadonnées
 * Utilisé pour alimenter les filtres (année, faculté, QCM)
 */
export async function getAllSeriesWithMetadata(): Promise<SupabaseSeries[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('qcm_series')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Récupère les années distinctes de toutes les séries
 */
export async function getDistinctYears(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('qcm_series')
    .select('year')
    .eq('user_id', user.id)
    .not('year', 'is', null);

  if (error) throw error;

  const unique = Array.from(new Set(
    (data?.map((r: any) => r.year).filter(Boolean) as string[]) || []
  ));
  return unique.sort().reverse(); // Plus récent d'abord
}

/**
 * Récupère les facultés distinctes de toutes les séries
 */
export async function getDistinctFaculties(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('qcm_series')
    .select('faculty')
    .eq('user_id', user.id)
    .not('faculty', 'is', null);

  if (error) throw error;

  const unique = Array.from(new Set(
    (data?.map((r: any) => r.faculty).filter(Boolean) as string[]) || []
  ));
  return unique.sort();
}

/**
 * Récupère les questions paginées avec filtres optionnels
 * @param pageNumber - Numéro de la page (0-indexed)
 * @param filters - Filtres optionnels (seriesId, year, faculty, searchText)
 * @param itemsPerPage - Nombre d'éléments par page
 */
export async function getQuestionsPageWithFilters(
  pageNumber: number,
  filters?: {
    seriesId?: string;
    year?: string;
    faculty?: string;
    searchText?: string;
  },
  itemsPerPage: number = 50
): Promise<{
  questions: QCMEntry[];
  total: number;
  hasMore: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const offset = pageNumber * itemsPerPage;

  try {
    // Étape 1: Récupérer les IDs des séries selon les filtres (année, faculté, seriesId)
    let seriesQuery = supabase
      .from('qcm_series')
      .select('id')
      .eq('user_id', user.id);

    if (filters?.year) {
      seriesQuery = seriesQuery.eq('year', filters.year);
    }

    if (filters?.faculty) {
      seriesQuery = seriesQuery.eq('faculty', filters.faculty);
    }

    if (filters?.seriesId) {
      seriesQuery = seriesQuery.eq('id', filters.seriesId);
    }

    const { data: seriesData, error: seriesError } = await seriesQuery;

    if (seriesError) throw seriesError;

    if (!seriesData || seriesData.length === 0) {
      return { questions: [], total: 0, hasMore: false };
    }

    const seriesIds = seriesData.map((s: any) => s.id);

    // Étape 2: Récupérer les questions avec count exact
    let questionsQuery = supabase
      .from('qcm_questions')
      .select('*', { count: 'exact' })
      .in('series_id', seriesIds)
      .order('created_at', { ascending: false });

    // Si searchText est fourni, chercher dans le texte de la question
    if (filters?.searchText) {
      questionsQuery = questionsQuery.ilike('question', `%${filters.searchText}%`);
    }

    const { data: questionsData, error: questionsError, count } = await questionsQuery
      .range(offset, offset + itemsPerPage - 1);

    if (questionsError) throw questionsError;

    const questions = (questionsData || []).map(convertSupabaseQuestionToQCMEntry);
    const total = count || 0;
    const hasMore = (pageNumber + 1) * itemsPerPage < total;

    return { questions, total, hasMore };
  } catch (error) {
    console.error('Erreur lors de la récupération des questions filtrées:', error);
    throw error;
  }
}

// ===== UTILITAIRES DE CONVERSION =====

export function convertSupabaseQuestionToQCMEntry(sq: SupabaseQuestion): QCMEntry {
  return {
    id: sq.id,
    series_id: sq.series_id,           
    question: sq.question,
    options: sq.options ?? [],          
    correctAnswers: sq.correct_answers ?? [],  
    aiJustification: sq.ai_justification ?? '',
    type: sq.type ?? 'QCM',
    tags: sq.tags ?? [],
    subCourse: sq.sub_course ?? null,
    clinicalCaseId: sq.clinical_case_id ?? undefined,
    imageUrl: sq.image_url ?? null,
    createdAt: sq.created_at,
    updatedAt: sq.updated_at,
  };
}

export function convertSupabaseSeriesToMetadata(series: SupabaseSeries): SeriesMetadata {
  return {
    objective: series.objective,
    faculty: series.faculty,
    year: series.year,
  };
}

// ===== SYNCHRONISATION =====

export async function syncLocalDataToSupabase(
  metadata: SeriesMetadata,
  questions: QCMEntry[]
): Promise<string> {
  try {
    const seriesId = await createSeries(metadata);
    await createQuestions(seriesId, questions);
    return seriesId;
  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error);
    throw error;
  }
}

export async function loadSeriesFromSupabase(seriesId: string): Promise<{
  metadata: SeriesMetadata;
  questions: QCMEntry[];
}> {
  console.log(seriesId);
  try {
    console.log("➡️ Loading series for ID:", seriesId);
    const series = await getSeriesById(seriesId);
    console.log("✅ Series loaded:", series);

    if (!series) throw new Error("Series not found");

    console.log("➡️ Loading questions for ID:", seriesId);
    const supabaseQuestions = await getQuestionsBySeriesId(seriesId);
    console.log("✅ Questions loaded:", supabaseQuestions.length);

    return {
      metadata: convertSupabaseSeriesToMetadata(series),
      questions: supabaseQuestions.map(convertSupabaseQuestionToQCMEntry),
    };
  } catch (error) {
    console.error("❌ Erreur lors du chargement:", error);
    throw error;
  }
}

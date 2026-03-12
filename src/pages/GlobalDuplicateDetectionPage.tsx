import React, { useEffect, useState } from 'react';
import { QCMEntry } from '../types/qcm.types';
import { supabase } from '../supabaseClient';
import {
  convertSupabaseQuestionToQCMEntry,
  getQuestionsPageWithFilters,
  getAllSeriesWithMetadata,
  getDistinctYears,
  getDistinctFaculties,
  getDistinctObjectives,
  SupabaseSeries,
} from '../supabaseService';
import DuplicateDetection from '../components/DuplicateDetection';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useLocation } from "react-router-dom";

/**
 * DESIGN PHILOSOPHY: Détection de doublons avec filtrage et pagination intelligente
 * - Champ QCM : écrire ou sélectionner ou "Tous"
 * - Filtres par année, faculté et objectif
 * - Pagination par lots de 100 questions pour éviter la saturation mémoire
 * - Requêtes Supabase optimisées (groupées au lieu de boucles)
 * - Spinner jusqu'à la fin complète de l'analyse
 */

const ITEMS_PER_PAGE = 100; // Réduit de 10000 à 100 pour éviter la saturation

interface FilterState {
  seriesId?: string;
  year?: string;
  faculty?: string;
  objective?: string;
  searchText?: string;
}

export default function GlobalDuplicateDetectionPage() {
  // État des questions
  const [questions, setQuestions] = useState<QCMEntry[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingDuplicateDetection, setLoadingDuplicateDetection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // État des filtres
  const [filters, setFilters] = useState<FilterState>({});
  const [qcmInput, setQcmInput] = useState('');
  const [series, setSeries] = useState<SupabaseSeries[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  /**
   * Charge les options de filtres
   */
  const loadFilterOptions = async () => {
    try {
      setLoadingFilters(true);
      const [seriesData, yearsData, facultiesData, objectivesData] = await Promise.all([
        getAllSeriesWithMetadata(),
        getDistinctYears(),
        getDistinctFaculties(),
        getDistinctObjectives(),
      ]);

      setSeries(seriesData);
      setYears(yearsData);
      setFaculties(facultiesData);
      setObjectives(objectivesData);
    } catch (err) {
      console.error('Erreur chargement des filtres:', err);
      setError('Impossible de charger les options de filtres.');
    } finally {
      setLoadingFilters(false);
    }
  };

  /**
   * Récupère une page de questions avec les filtres appliqués
   */
  const fetchQuestionsPage = async (pageNumber: number, appliedFilters: FilterState) => {
    try {
      const { questions: newQuestions, total, hasMore } = await getQuestionsPageWithFilters(
        pageNumber,
        appliedFilters,
        ITEMS_PER_PAGE
      );

      if (pageNumber === 0) {
        setQuestions(newQuestions);
      } else {
        setQuestions(prev => [...prev, ...newQuestions]);
      }

      setTotalCount(total);
      setHasMorePages(hasMore);
      return true;
    } catch (err) {
      console.error('Erreur chargement questions:', err);
      throw err;
    }
  };

  /**
   * Gère le changement du champ QCM (saisie texte)
   */
  const handleQcmInputChange = (value: string) => {
    setQcmInput(value);
  };

  /**
   * Gère la sélection du QCM (dropdown ou "Tous")
   */
  const handleQcmSelect = async (value: string) => {
    try {
      setLoadingQuestions(true);
      setError(null);

      let newFilters: FilterState = {
        year: filters.year,
        faculty: filters.faculty,
        objective: filters.objective,
      };

      if (value === 'all') {
        setQcmInput('');
      } else if (value === 'write') {
        return;
      } else {
        newFilters.seriesId = value;
        setQcmInput('');
      }

      setFilters(newFilters);
      setCurrentPage(0);

      await fetchQuestionsPage(0, newFilters);
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur sélection QCM:', err);
      setError('Erreur lors de la sélection du QCM.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  /**
   * Applique les filtres (année, faculté, objectif)
   */
  const handleFilterChange = async (filterKey: keyof FilterState, value: string | undefined) => {
    try {
      setLoadingQuestions(true);
      setError(null);

      const newFilters: FilterState = {
        ...filters,
        [filterKey]: value,
      };

      setFilters(newFilters);
      setCurrentPage(0);

      await fetchQuestionsPage(0, newFilters);
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur application des filtres:', err);
      setError('Erreur lors de l\'application des filtres.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  /**
   * Applique la recherche manuelle du QCM
   */
  const handleSearchQcm = async () => {
    try {
      setLoadingQuestions(true);
      setError(null);

      const newFilters: FilterState = {
        year: filters.year,
        faculty: filters.faculty,
        objective: filters.objective,
        searchText: qcmInput || undefined,
      };

      setFilters(newFilters);
      setCurrentPage(0);

      await fetchQuestionsPage(0, newFilters);
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur recherche:', err);
      setError('Erreur lors de la recherche.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  /**
   * Charge la page suivante (pagination infinie)
   */
  const loadMoreQuestions = async () => {
    if (!hasMorePages || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      await fetchQuestionsPage(currentPage, filters);
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      console.error('Erreur chargement page suivante:', err);
      setError('Erreur lors du chargement de la page suivante.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  /**
   * Réinitialise les filtres
   */
  const handleResetFilters = async () => {
    try {
      setLoadingQuestions(true);
      setQcmInput('');
      setFilters({});
      setCurrentPage(0);

      await fetchQuestionsPage(0, {});
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur réinitialisation:', err);
      setError('Erreur lors de la réinitialisation.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  /**
   * CORRIGÉ : Supprime une question et ajoute l'année et la faculté de sa série 
   * au champ 'tags' (de type ARRAY) de la question conservée
   */
  const handleDeleteQuestion = async (idToDelete: string, idToKeep?: string) => {
    try {
      const { data: questionToDeleteData, error: fetchDeleteError } = await supabase
        .from('qcm_questions')
        .select('series_id')
        .eq('id', idToDelete)
        .single();

      if (fetchDeleteError) throw fetchDeleteError;

      if (idToKeep && questionToDeleteData?.series_id) {
        const { data: seriesDelete, error: fetchSeriesDeleteError } = await supabase
          .from('qcm_series')
          .select('year, faculty')
          .eq('id', questionToDeleteData.series_id)
          .single();

        if (fetchSeriesDeleteError) throw fetchSeriesDeleteError;

        const { data: questionToKeepData, error: fetchKeepError } = await supabase
          .from('qcm_questions')
          .select('tags')
          .eq('id', idToKeep)
          .single();

        if (fetchKeepError) throw fetchKeepError;

        let finalTagsArray: string[] = [];
        if (questionToKeepData?.tags) {
          if (Array.isArray(questionToKeepData.tags)) {
            finalTagsArray = [...questionToKeepData.tags];
          } else if (typeof questionToKeepData.tags === 'string') {
            finalTagsArray = questionToKeepData.tags.split(',').map(t => t.trim()).filter(t => t !== "");
          }
        }

        const initialTagsLength = finalTagsArray.length;

        if (seriesDelete?.year) {
          const yearTag = `year:${seriesDelete.year}`;
          if (!finalTagsArray.includes(yearTag)) {
            finalTagsArray.push(yearTag);
          }
        }

        if (seriesDelete?.faculty) {
          const facultyTag = `faculty:${seriesDelete.faculty}`;
          if (!finalTagsArray.includes(facultyTag)) {
            finalTagsArray.push(facultyTag);
          }
        }

        if (finalTagsArray.length > initialTagsLength) {
          const { error: updateError } = await supabase
            .from('qcm_questions')
            .update({ tags: finalTagsArray })
            .eq('id', idToKeep);

          if (updateError) throw updateError;

          console.log(`Tags mis à jour pour la question ${idToKeep}:`, finalTagsArray);
        }
      }

      const { error: deleteError } = await supabase
        .from('qcm_questions')
        .delete()
        .eq('id', idToDelete);

      if (deleteError) throw deleteError;

      setQuestions(prev => prev.filter(q => q.id !== idToDelete));
      setTotalCount(prev => Math.max(0, prev - 1));

      console.log(`Question ${idToDelete} supprimée avec succès`);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  /**
   * Callback appelé quand DuplicateDetection termine son chargement
   */
  const handleDuplicateDetectionLoadingComplete = (hasError: boolean) => {
    setLoadingDuplicateDetection(false);
    if (hasError) {
      console.warn('DuplicateDetection a terminé avec des erreurs');
    }
  };

  /**
   * Charge les filtres au montage
   */
  useEffect(() => {
    loadFilterOptions();
  }, []);

  /**
   * Charge la première page au montage
   */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingQuestions(true);
        await fetchQuestionsPage(0, {});
        setCurrentPage(1);
      } catch (err) {
        console.error('Erreur chargement initial:', err);
        setError('Impossible de charger les questions.');
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadInitialData();
  }, []);

  if (loadingFilters) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" message="Chargement des filtres..." />
      </div>
    );
  }

  const isLoading = loadingQuestions || loadingDuplicateDetection;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Spinner de chargement global */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <LoadingSpinner 
              size="lg" 
              message={loadingQuestions ? "Chargement des questions..." : "Analyse des doublons et chargement des métadonnées..."} 
            />
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">Détection des Doublons</h1>
        <p className="text-muted-foreground">
          Analysez et détectez les questions dupliquées dans votre base de données
        </p>
      </div>

      {/* Panneau de filtres */}
      <Card className="p-6 bg-card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-4">Filtres de Recherche</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* QCM : Écrire ou Sélectionner */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">QCM / Série</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Écrire le QCM..."
                value={qcmInput}
                onChange={(e) => handleQcmInputChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchQcm();
                  }
                }}
                disabled={isLoading}
                className="flex-1"
              />
              {qcmInput && (
                <Button
                  onClick={handleSearchQcm}
                  variant="default"
                  size="sm"
                  disabled={isLoading}
                >
                  Chercher
                </Button>
              )}
            </div>
          </div>

          {/* Filtre Année */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Année</label>
            <Select
              value={filters.year || 'all'}
              onValueChange={(value) => {
                handleFilterChange('year', value === 'all' ? undefined : value);
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les années" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les années</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtre Faculté */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Faculté</label>
            <Select
              value={filters.faculty || 'all'}
              onValueChange={(value) => {
                handleFilterChange('faculty', value === 'all' ? undefined : value);
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les facultés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les facultés</SelectItem>
                {faculties.map(faculty => (
                  <SelectItem key={faculty} value={faculty}>
                    {faculty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtre Objectif */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Objectif</label>
            <Select
              value={filters.objective || 'all'}
              onValueChange={(value) => {
                handleFilterChange('objective', value === 'all' ? undefined : value);
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les objectifs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les objectifs</SelectItem>
                {objectives.map(objective => (
                  <SelectItem key={objective} value={objective}>
                    {objective}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bouton réinitialiser */}
        <div className="flex justify-end">
          <Button
            onClick={handleResetFilters}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      </Card>

      {/* Compteur de résultats */}
      {totalCount > 0 && !isLoading && (
        <div className="text-sm text-muted-foreground">
          {questions.length} question{questions.length > 1 ? 's' : ''} affichée{questions.length > 1 ? 's' : ''} sur {totalCount}
        </div>
      )}

      {/* État d'erreur */}
      {error && !isLoading && (
        <div className="p-8 text-red-600 text-center bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      {/* Bouton charger plus */}
          {hasMorePages && !loadingDuplicateDetection && totalCount > 0 && (
            <div className="flex justify-center p-4">
              <Button
                onClick={loadMoreQuestions}
                disabled={isLoadingMore}
                variant="outline"
              >
                {isLoadingMore ? 'Chargement...' : `Charger plus (${questions.length}/${totalCount})`}
              </Button>
            </div>
          )}

      {/* Aucun résultat */}
      {!isLoading && questions.length === 0 && !error && (
        <div className="p-8 text-center text-muted-foreground bg-muted rounded-lg">
          Aucune question trouvée avec les filtres sélectionnés.
        </div>
      )}

      {/* Contenu principal - visible uniquement quand les données sont chargées */}
      {!isLoading && questions.length > 0 && (
        <>
          {/* Composant de détection avec callback de fin de chargement */}
          <DuplicateDetection
            questions={questions}
            onDeleteQuestion={handleDeleteQuestion}
            onBack={() => window.history.back()}
            onLoadingComplete={handleDuplicateDetectionLoadingComplete}
          />

          {/* Message de fin */}
          {!hasMorePages && questions.length > 0 && !loadingDuplicateDetection && (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              Toutes les {totalCount} question{totalCount > 1 ? 's' : ''} ont été chargées.
            </div>
          )}
        </>
      )}
      
    </div>
  );
}

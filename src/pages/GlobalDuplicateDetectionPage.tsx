import React, { useEffect, useState } from 'react';
import { QCMEntry } from '../types/qcm.types';
import { supabase } from '../supabaseClient';
import {
  convertSupabaseQuestionToQCMEntry,
  getQuestionsPageWithFilters,
  getAllSeriesWithMetadata,
  getDistinctYears,
  getDistinctFaculties,
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
 * DESIGN PHILOSOPHY: Détection de doublons avec filtrage simple
 * - Champ QCM : écrire ou sélectionner ou "Tous"
 * - Filtres par année et faculté
 * - Pagination côté fetch (50 items par page)
 */

const ITEMS_PER_PAGE = 50;

interface FilterState {
  seriesId?: string;
  year?: string;
  faculty?: string;
  searchText?: string;
}

export default function GlobalDuplicateDetectionPage() {
  // État des questions et pagination
  const [questions, setQuestions] = useState<QCMEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // État des filtres
  const [filters, setFilters] = useState<FilterState>({});
  const [qcmInput, setQcmInput] = useState('');
  const [series, setSeries] = useState<SupabaseSeries[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  /**
   * Charge les options de filtres
   */
  const loadFilterOptions = async () => {
    try {
      setLoadingFilters(true);
      const [seriesData, yearsData, facultiesData] = await Promise.all([
        getAllSeriesWithMetadata(),
        getDistinctYears(),
        getDistinctFaculties(),
      ]);

      setSeries(seriesData);
      setYears(yearsData);
      setFaculties(facultiesData);
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
      setLoading(true);
      setError(null);

      let newFilters: FilterState = {
        year: filters.year,
        faculty: filters.faculty,
      };

      if (value === 'all') {
        // Tous les QCM
        setQcmInput('');
      } else if (value === 'write') {
        // Mode écriture - ne rien faire ici
        return;
      } else {
        // QCM sélectionné
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
      setLoading(false);
    }
  };

  /**
   * Applique les filtres (année, faculté)
   */
  const handleFilterChange = async (filterKey: keyof FilterState, value: string | undefined) => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  /**
   * Applique la recherche manuelle du QCM
   */
  const handleSearchQcm = async () => {
    try {
      setLoading(true);
      setError(null);

      const newFilters: FilterState = {
        year: filters.year,
        faculty: filters.faculty,
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
      setLoading(false);
    }
  };

  /**
   * Charge la page suivante
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
      setLoading(true);
      setQcmInput('');
      setFilters({});
      setCurrentPage(0);

      await fetchQuestionsPage(0, {});
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur réinitialisation:', err);
      setError('Erreur lors de la réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * CORRIGÉ : Supprime une question et ajoute l'année et la faculté de sa série 
   * au champ 'tags' (de type ARRAY) de la question conservée
   * 
   * @param idToDelete - ID de la question à supprimer
   * @param idToKeep - ID de la question à conserver (recevra les tags)
   */
  const handleDeleteQuestion = async (idToDelete: string, idToKeep?: string) => {
    try {
      // Récupère la question à supprimer avec sa série associée
      const { data: questionToDeleteData, error: fetchDeleteError } = await supabase
        .from('qcm_questions')
        .select('series_id')
        .eq('id', idToDelete)
        .single();

      if (fetchDeleteError) throw fetchDeleteError;

      // Si une question à conserver est spécifiée, transfère les tags
      if (idToKeep && questionToDeleteData?.series_id) {
        // Récupère les données de la série de la question à supprimer
        const { data: seriesDelete, error: fetchSeriesDeleteError } = await supabase
          .from('qcm_series')
          .select('year, faculty')
          .eq('id', questionToDeleteData.series_id)
          .single();

        if (fetchSeriesDeleteError) throw fetchSeriesDeleteError;

        // Récupère les tags existants de la question à conserver
        const { data: questionToKeepData, error: fetchKeepError } = await supabase
          .from('qcm_questions')
          .select('tags')
          .eq('id', idToKeep)
          .single();

        if (fetchKeepError) throw fetchKeepError;

        // Construit le tableau de tags final à partir des tags existants
        let finalTagsArray: string[] = [];
        if (questionToKeepData?.tags) {
          if (Array.isArray(questionToKeepData.tags)) {
            finalTagsArray = [...questionToKeepData.tags];
          } else if (typeof questionToKeepData.tags === 'string') {
            finalTagsArray = questionToKeepData.tags.split(',').map(t => t.trim()).filter(t => t !== "");
          }
        }

        const initialTagsLength = finalTagsArray.length;

        // Vérifie et ajoute le tag 'year' s'il n'est pas déjà présent
        if (seriesDelete?.year) {
          const yearTag = `year:${seriesDelete.year}`;
          if (!finalTagsArray.includes(yearTag)) {
            finalTagsArray.push(yearTag);
          }
        }

        // Vérifie et ajoute le tag 'faculty' s'il n'est pas déjà présent
        if (seriesDelete?.faculty) {
          const facultyTag = `faculty:${seriesDelete.faculty}`;
          if (!finalTagsArray.includes(facultyTag)) {
            finalTagsArray.push(facultyTag);
          }
        }

        // Met à jour la question uniquement si des tags ont été ajoutés
        if (finalTagsArray.length > initialTagsLength) {
          const { error: updateError } = await supabase
            .from('qcm_questions')
            .update({ tags: finalTagsArray })
            .eq('id', idToKeep);

          if (updateError) throw updateError;

          console.log(`Tags mis à jour pour la question ${idToKeep}:`, finalTagsArray);
        }
      }

      // Supprime la question
      const { error: deleteError } = await supabase
        .from('qcm_questions')
        .delete()
        .eq('id', idToDelete);

      if (deleteError) throw deleteError;

      // Met à jour l'état local
      setQuestions(prev => prev.filter(q => q.id !== idToDelete));
      setTotalCount(prev => Math.max(0, prev - 1));

      console.log(`Question ${idToDelete} supprimée avec succès`);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
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
        setLoading(true);
        await fetchQuestionsPage(0, {});
        setCurrentPage(1);
      } catch (err) {
        console.error('Erreur chargement initial:', err);
        setError('Impossible de charger les questions.');
      } finally {
        setLoading(false);
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

  return (
    <div className="flex flex-col gap-6 p-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                className="flex-1"
              />
              {qcmInput && (
                <Button
                  onClick={handleSearchQcm}
                  variant="default"
                  size="sm"
                >
                  Chercher
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Ou sélectionner :
            </div>
            <Select
              value={filters.seriesId || 'all'}
              onValueChange={handleQcmSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les QCM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les QCM</SelectItem>
                {series.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.objective || `Série ${s.id.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtre Année */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Année</label>
            <Select
              value={filters.year || 'all'}
              onValueChange={(value) => {
                handleFilterChange('year', value === 'all' ? undefined : value);
              }}
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
        </div>

        {/* Bouton réinitialiser */}
        <div className="flex justify-end">
          <Button
            onClick={handleResetFilters}
            variant="outline"
            size="sm"
          >
            Réinitialiser les filtres
          </Button>
        </div>
      </Card>

      {/* Compteur de résultats */}
      {totalCount > 0 && (
        <div className="text-sm text-muted-foreground">
          {questions.length} question{questions.length > 1 ? 's' : ''} affichée{questions.length > 1 ? 's' : ''} sur {totalCount}
        </div>
      )}

      {/* État de chargement */}
      {loading && questions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" message="Analyse des questions..." />
        </div>
      ) : error ? (
        <div className="p-8 text-red-600 text-center bg-red-50 rounded-lg">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground bg-muted rounded-lg">
          Aucune question trouvée avec les filtres sélectionnés.
        </div>
      ) : (
        <>
          {/* Composant de détection */}
          <DuplicateDetection
            questions={questions}
            onDeleteQuestion={handleDeleteQuestion}
            onBack={() => window.history.back()}
          />

          {/* Bouton charger plus */}
          {hasMorePages && (
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

          {/* Message de fin */}
          {!hasMorePages && questions.length > 0 && (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              Toutes les {totalCount} question{totalCount > 1 ? 's' : ''} ont été chargées.
            </div>
          )}
        </>
      )}
    </div>
  );
}

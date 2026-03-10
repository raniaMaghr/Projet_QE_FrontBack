import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Trash2, Plus, Search, Filter, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import {
  getAllSeries,
  getQuestionsBySeriesId,
  deleteSeries as deleteSeriesService,
  SupabaseSeries,
} from "../supabaseService";

interface SeriesData {
  id: string;
  name: string; // This will be faculty
  objective: string;
  description?: string; // This will be year
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function SeriesManagementPage() {
  const navigate = useNavigate();

  const [series, setSeries] = useState<SeriesData[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<SeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterObjective, setFilterObjective] = useState("all");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "date" | "questions">("name");

  // Charger toutes les séries
  useEffect(() => {
    fetchAllSeries();
  }, []);

  // Filtrer et trier les séries
  useEffect(() => {
    let result = [...series];

    // Filtrer par objectif
    if (filterObjective !== "all") {
      result = result.filter(s => s.objective === filterObjective);
    }

    // Filtrer par recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(term) ||
          s.objective.toLowerCase().includes(term) ||
          (s.description?.toLowerCase().includes(term) ?? false)
      );
    }

    // Trier
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "questions":
          return b.questionCount - a.questionCount;
        default:
          return 0;
      }
    });

    setFilteredSeries(result);
  }, [series, searchTerm, filterObjective, sortBy]);

  const fetchAllSeries = async () => {
    setLoading(true);
    try {
      const seriesData: SupabaseSeries[] = await getAllSeries();
      console.log(seriesData?.length)

      if (!seriesData || seriesData.length === 0) {
        setSeries([]);
        setObjectives([]);
        setLoading(false);
        return;
      }

      // Traiter les séries et compter les questions
      const processedSeries: SeriesData[] = [];
      const uniqueObjectives = new Set<string>();

      for (const s of seriesData) {
        try {
          const questions = await getQuestionsBySeriesId(s.id);

          processedSeries.push({
            id: s.id,
            name: s.faculty, // Using faculty as name
            objective: s.objective,
            description: s.year, // Using year as description
            questionCount: questions.length,
            createdAt: s.created_at || new Date().toISOString(),
            updatedAt: s.updated_at || new Date().toISOString(),
          });

          uniqueObjectives.add(s.objective);
        } catch (err) {
          console.error(`Erreur traitement série ${s.id}:`, err);
        }
      }

      setSeries(processedSeries);
      setObjectives(Array.from(uniqueObjectives).sort());
      console.log(`✅ ${processedSeries.length} séries chargées`);
    } catch (err) {
      console.error("Erreur chargement séries:", err);
      toast.error("Impossible de charger les séries");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (seriesId: string) => {
    console.log(`👁️ Affichage de la série: ${seriesId}`);
    navigate(`/series/${seriesId}`);
  };

  const handleEdit = (seriesId: string) => {
    navigate(`/series/${seriesId}/edit`);
  };

  const handleDelete = async (seriesId: string, seriesName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la série "${seriesName}" ? Cette action est irréversible.`)) {
      return;
    }

    setDeleting(seriesId);
    try {
      // Récupérer toutes les questions de la série
      const { data: questions, error: questionsError } = await supabase
        .from("qcm_questions")
        .select("id")
        .eq("series_id", seriesId);

      if (questionsError) throw questionsError;

      // Supprimer les images associées
      if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id);
        
        // Supprimer les fichiers du storage
        const { data: files } = await supabase.storage
          .from("question-images")
          .list();

        if (files && files.length > 0) {
          const filesToDelete = files
            .filter(f => questionIds.some(qId => f.name.includes(qId)))
            .map(f => f.name);

          if (filesToDelete.length > 0) {
            await supabase.storage
              .from("question-images")
              .remove(filesToDelete);
            console.log(`🗑️ ${filesToDelete.length} images supprimées`);
          }
        }

        // Supprimer les questions
        const { error: deleteQuestionsError } = await supabase
          .from("qcm_questions")
          .delete()
          .eq("series_id", seriesId);

        if (deleteQuestionsError) throw deleteQuestionsError;
        console.log(`🗑️ ${questions.length} questions supprimées`);
      }

      // Supprimer la série en utilisant la fonction du service
      await deleteSeriesService(seriesId);

      // Mettre à jour l'état local
      setSeries(prev => prev.filter(s => s.id !== seriesId));
      toast.success(`✅ Série "${seriesName}" supprimée avec succès`);
      console.log(`✅ Série ${seriesId} supprimée`);
    } catch (err) {
      console.error("Erreur suppression série:", err);
      toast.error("Erreur lors de la suppression de la série");
    } finally {
      setDeleting(null);
    }
  };

  const handleRefresh = () => {
    toast.loading("Actualisation en cours...");
    fetchAllSeries();
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: "linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des séries...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900">📚 Gestion des Séries</h1>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              🔄 Actualiser
            </button>
          </div>
          <p className="text-gray-600">Gérez vos séries de questions QCM</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Nombre de séries</p>
                <p className="text-3xl font-bold text-indigo-600">{series.length}</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total de questions</p>
                <p className="text-3xl font-bold text-green-600">
                  {series.reduce((sum, s) => sum + s.questionCount, 0)}
                </p>
              </div>
              <div className="text-4xl">❓</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Objectifs uniques</p>
                <p className="text-3xl font-bold text-blue-600">{objectives.length}</p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filter by Objective */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterObjective}
                onChange={(e) => setFilterObjective(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les objectifs</option>
                {objectives.map(obj => (
                  <option key={obj} value={obj}>{obj}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "date" | "questions")}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="name">Trier par nom</option>
                <option value="date">Trier par date</option>
                <option value="questions">Trier par nombre de questions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Series List */}
        {filteredSeries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune série trouvée</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterObjective !== "all"
                ? "Essayez de modifier vos critères de recherche"
                : "Créez votre première série pour commencer"}
            </p>
            <button
              onClick={() => navigate("/insert-question")}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer une série
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSeries.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{s.name}</h3>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                        {s.objective}
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-gray-600 mb-3">{s.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">❓</span>
                        <span>{s.questionCount} question{s.questionCount > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <span>
                          Modifiée le {new Date(s.updatedAt).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 ml-4">
                    <button
                      onClick={() => handleView(s.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      title="Voir la série"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Voir</span>
                    </button>
                    <button
                      onClick={() => handleEdit(s.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium"
                      title="Modifier la série"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      disabled={deleting === s.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Supprimer la série"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {deleting === s.id ? "Suppression..." : "Supprimer"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results count */}
        {filteredSeries.length > 0 && (
          <div className="mt-6 text-center text-gray-600">
            Affichage de <strong>{filteredSeries.length}</strong> série{filteredSeries.length > 1 ? "s" : ""} sur <strong>{series.length}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuestionsGridView from "../components/QuestionsGridView";
import DuplicateDetection from "../components/DuplicateDetection";
import { QCMEntry, SeriesMetadata } from "../types";
import { loadSeriesFromSupabase, deleteQuestion } from "../supabaseService"; // adapte le chemin

export default function SeriesPageWrapper() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QCMEntry[]>([]);
  const [metadata, setMetadata] = useState<SeriesMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'duplicates'>('grid');

  const fetchData = async () => {
    if (!seriesId) return;
    try {
      setLoading(true);
      const data = await loadSeriesFromSupabase(seriesId);
      setQuestions(data.questions);
      setMetadata(data.metadata);
    } catch (err) {
      console.error("Erreur chargement série:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!seriesId) {
      setError("Aucun ID de série fourni dans l'URL !");
      setLoading(false);
      return;
    }
    fetchData();
  }, [seriesId]);

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error("Erreur suppression question:", err);
      alert("Erreur lors de la suppression de la question");
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Chargement des questions...</div>;
  }

  if (error || !metadata) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (view === 'duplicates') {
    return (
      <DuplicateDetection 
        questions={questions}
        onDeleteQuestion={handleDeleteQuestion}
        onBack={() => setView('grid')}
      />
    );
  }

  return (
    <QuestionsGridView
      questions={questions}
      metadata={metadata}
      onQuestionSelect={(questionId) => {
        navigate(`/question/${questionId}`);
      }}
      onBack={() => navigate(-1)}
      onDetectDuplicates={() => setView('duplicates')}
    />
  );
}

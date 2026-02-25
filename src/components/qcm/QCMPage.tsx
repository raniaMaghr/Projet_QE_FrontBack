import React, { useState, useEffect } from "react";
import { QCMEntry, SeriesMetadata } from "../types";
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface QuestionDetailPageProps {
  currentQuestionId: string;
  allQuestions: QCMEntry[];
  metadata: SeriesMetadata;
  onBack: () => void;
  onSave: (questions: QCMEntry[]) => void;
}

const TAGS = ["Clinique", "Anatomie", "Biologie", "Physiologie", "Épidémiologie"];

export default function QuestionDetailPage({
  currentQuestionId,
  allQuestions,
  metadata,
  onBack,
  onSave,
}: QuestionDetailPageProps) {
  const [questions, setQuestions] = useState<QCMEntry[]>(allQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [subCourses, setSubCourses] = useState<string[]>([]);
  const [newSubCourse, setNewSubCourse] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentQuestion = questions.find((q: QCMEntry) => q.id === currentQuestionId);
  const relatedQuestions = currentQuestion?.clinicalCaseId
    ? questions.filter((q: QCMEntry) => q.clinicalCaseId === currentQuestion.clinicalCaseId)
    : currentQuestion ? [currentQuestion] : [];

  useEffect(() => {
    const savedSubCourses = localStorage.getItem("qcm-subcourses");
    if (savedSubCourses) {
      try {
        setSubCourses(JSON.parse(savedSubCourses));
      } catch (e) {
        console.error("Erreur chargement sous-cours:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("qcm-subcourses", JSON.stringify(subCourses));
  }, [subCourses]);

  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem("qcm-questions", JSON.stringify(questions));
    }
  }, [questions]);

  const currentQ = relatedQuestions[currentIndex];
  const optionLetters = currentQ ? currentQ.options.map((_: string, i: number) => String.fromCharCode(65 + i)) : [];

  const updateCurrentQuestion = (updates: Partial<QCMEntry>) => {
    const updatedQuestions = questions.map((q: QCMEntry) =>
      q.id === currentQ.id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q
    );
    setQuestions(updatedQuestions);
    setHasUnsavedChanges(true);
  };

  const toggleCorrectAnswer = (letter: string) => {
    const currentAnswers: string[] = currentQ.correctAnswers || [];
    const newAnswers = currentAnswers.includes(letter)
      ? currentAnswers.filter((a: string) => a !== letter)
      : [...currentAnswers, letter];
    updateCurrentQuestion({ correctAnswers: newAnswers });
  };

  const toggleTag = (tag: string) => {
    const currentTags: string[] = currentQ.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t: string) => t !== tag)
      : [...currentTags, tag];
    updateCurrentQuestion({ tags: newTags });
  };

  const addSubCourse = () => {
    if (newSubCourse.trim() && !subCourses.includes(newSubCourse.trim())) {
      setSubCourses([...subCourses, newSubCourse.trim()]);
      setNewSubCourse("");
      toast.success(`Sous-cours "${newSubCourse.trim()}" ajouté`);
    }
  };

  const handleSave = () => {
    onSave(questions);
    toast.success('✅ Modifications sauvegardées', {
      description: 'Les données sont sauvegardées localement'
    });
    setHasUnsavedChanges(false);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions: string[] = [...currentQ.options];
    newOptions[index] = value;
    updateCurrentQuestion({ options: newOptions });
  };

  const addOption = () => {
    if (currentQ.options.length < 10) {
      updateCurrentQuestion({ options: [...currentQ.options, ""] });
      toast.success('Option ajoutée');
    } else {
      toast.warning('Maximum 10 options atteint');
    }
  };

  const removeOption = (index: number) => {
    if (currentQ.options.length > 2) {
      const newOptions: string[] = currentQ.options.filter((_: string, i: number) => i !== index);
      const letter = String.fromCharCode(65 + index);
      const newCorrectAnswers: string[] = currentQ.correctAnswers.filter((a: string) => a !== letter);
      updateCurrentQuestion({ options: newOptions, correctAnswers: newCorrectAnswers });
      toast.success('Option supprimée');
    } else {
      toast.warning('Minimum 2 options requises');
    }
  };

  const navigateQuestion = (direction: 'prev' | 'next') => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Vous avez des modifications non sauvegardées. Continuer sans sauvegarder ?')) {
        return;
      }
    }

    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setHasUnsavedChanges(false);
    } else if (direction === 'next' && currentIndex < relatedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setHasUnsavedChanges(false);
    }
  };

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Question introuvable</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retour à la grille
          </button>
        </div>
      </div>
    );
  }

  const isClinicalCase = relatedQuestions.length > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                if (window.confirm('Vous avez des modifications non sauvegardées. Quitter sans sauvegarder ?')) {
                  onBack();
                }
              } else {
                onBack();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la grille
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-full ${isClinicalCase ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {isClinicalCase ? `Cas clinique (${relatedQuestions.length} questions)` : 'QCM simple'}
                </div>
                <div className="text-gray-600 text-sm">
                  {metadata.objective} • {metadata.faculty} • {metadata.year}
                </div>
              </div>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
            </div>

            {hasUnsavedChanges && (
              <div className="mt-2 text-orange-600 text-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                Modifications non sauvegardées
              </div>
            )}
          </div>
        </div>

        {/* Navigation entre questions du cas clinique */}
        {isClinicalCase && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateQuestion('prev')}
                disabled={currentIndex === 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Question précédente"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm mr-2">Question {currentIndex + 1} / {relatedQuestions.length}</span>
                {relatedQuestions.map((_: QCMEntry, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        if (window.confirm('Modifications non sauvegardées. Continuer ?')) {
                          setCurrentIndex(idx);
                          setHasUnsavedChanges(false);
                        }
                      } else {
                        setCurrentIndex(idx);
                      }
                    }}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      idx === currentIndex
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigateQuestion('next')}
                disabled={currentIndex === relatedQuestions.length - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Question suivante"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Question */}
          <div className="mb-6">
            <label className="block mb-2 text-gray-700 font-medium">Question</label>
            <textarea
              value={currentQ.question}
              onChange={(e) => updateCurrentQuestion({ question: e.target.value })}
              rows={3}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-shadow"
              placeholder="Saisir la question..."
            />
            <div className="mt-1 text-xs text-gray-500">
              {currentQ.question.length} caractères
            </div>
          </div>

          {/* Options */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-gray-700 font-medium">Propositions</label>
              <span className="text-xs text-gray-500">
                {currentQ.options.length} option{currentQ.options.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {currentQ.options.map((option: string, i: number) => {
                const letter = String.fromCharCode(65 + i);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full flex-shrink-0 font-medium">
                      {letter}
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      placeholder={`Option ${letter}`}
                    />
                    {currentQ.options.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer cette option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {currentQ.options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-3 flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter une option
              </button>
            )}
          </div>

          {/* Correct Answers */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Réponse(s) correcte(s)</label>
            <div className="flex flex-wrap gap-2">
              {optionLetters.map((letter: string, i: number) => (
                <button
                  key={letter}
                  onClick={() => toggleCorrectAnswer(letter)}
                  disabled={!currentQ.options[i]?.trim()}
                  className={`
                    w-12 h-12 rounded-full border-2 transition-all font-medium
                    ${currentQ.correctAnswers.includes(letter)
                      ? 'bg-green-600 text-white border-green-600 shadow-lg scale-110'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:scale-105'
                    }
                    ${!currentQ.options[i]?.trim() ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  title={currentQ.options[i] || 'Option vide'}
                >
                  {letter}
                </button>
              ))}
            </div>
            {currentQ.correctAnswers.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-lg">
                ✓ Réponse(s) sélectionnée(s) : <strong>{currentQ.correctAnswers.join(', ')}</strong>
              </div>
            )}
            {currentQ.correctAnswers.length === 0 && (
              <div className="mt-3 p-3 bg-orange-50 text-orange-700 rounded-lg text-sm">
                ⚠️ Aucune réponse correcte sélectionnée
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Tags thématiques</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full border transition-all ${
                    currentQ.tags?.includes(tag)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-indigo-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {currentQ.tags && currentQ.tags.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                {currentQ.tags.length} tag{currentQ.tags.length > 1 ? 's' : ''} sélectionné{currentQ.tags.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Sous-cours */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Sous-cours</label>
            <div className="flex gap-3 mb-3">
              <select
                value={currentQ.subCourse || ""}
                onChange={(e) => updateCurrentQuestion({ subCourse: e.target.value || null })}
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              >
                <option value="">-- Choisir un sous-cours --</option>
                {subCourses.map((sc: string) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newSubCourse}
                onChange={(e) => setNewSubCourse(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSubCourse()}
                placeholder="Ajouter un nouveau sous-cours"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
              <button
                onClick={addSubCourse}
                disabled={!newSubCourse.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Ajouter
              </button>
            </div>
            {subCourses.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                {subCourses.length} sous-cours disponible{subCourses.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Justification AI */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Justification / Explication</label>
            <textarea
              value={currentQ.aiJustification}
              onChange={(e) => updateCurrentQuestion({ aiJustification: e.target.value })}
              rows={4}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-shadow"
              placeholder="Ajouter une justification ou explication pour cette question..."
            />
            <div className="mt-1 text-xs text-gray-500">
              {currentQ.aiJustification.length} caractères
            </div>
          </div>

          {/* Stats de la question */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Statut de la question</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Options :</span>
                <span className="ml-2 font-medium">{currentQ.options.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Réponses :</span>
                <span className={`ml-2 font-medium ${currentQ.correctAnswers.length > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {currentQ.correctAnswers.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Tags :</span>
                <span className="ml-2 font-medium">{currentQ.tags?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Sous-cours :</span>
                <span className="ml-2 font-medium">{currentQ.subCourse ? '✓' : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
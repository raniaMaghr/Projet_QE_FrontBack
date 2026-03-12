// src/pages/SeriesEditPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QCMEntry } from "../types/qcm.types";
import {
  ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, Plus, X, ImagePlus, Settings, Copy
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import {
  getQuestionsBySeriesId,
  updateQuestion,
  getSeriesById,
  convertSupabaseQuestionToQCMEntry,
} from "../supabaseService";

const TAGS = ["Clinique", "Anatomie", "Biologie", "Physiologie", "Épidémiologie","pharmacologie"];

interface SubCourse {
  id: string;
  name: string;
  course_id: string;
}

interface SeriesMeta {
  faculty: string;
  objective: string;
  year: string;
}

interface EditableQuestion extends QCMEntry {
  _isNew?: boolean;
  _deleted?: boolean;
  _imageFile?: File | null;
  _imagePreview?: string | null;
  _imageRemoved?: boolean;
}

interface CaseNumbering {
  caseNumber: number;
  totalCases: number;
  questionsInCase: number;
  questionIndexInCase: number;
}


const useKeyboardNavigation = (
  onPrevious: () => void,
  onNext: () => void,
  onSave: () => void,
  enabled: boolean = true
) => {
  const saveRef = useRef(onSave);
  const prevRef = useRef(onPrevious);
  const nextRef = useRef(onNext);

  // Mise à jour des refs à chaque render — sans re-enregistrer l'écouteur
  useEffect(() => { saveRef.current = onSave; });
  useEffect(() => { prevRef.current = onPrevious; });
  useEffect(() => { nextRef.current = onNext; });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tag = target.tagName;

      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable;

      if (!isEditable) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          prevRef.current();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          nextRef.current();
        }
        if (event.key === "Enter") {
          event.preventDefault();
          saveRef.current();
        }
      }

      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // L'écouteur est enregistré une seule fois — les refs gardent les valeurs fraîches
  }, [enabled]);
};

export default function SeriesEditPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [meta, setMeta]           = useState<SeriesMeta>({ faculty: "", objective: "", year: "" });
  const [showMetaEditor, setShowMetaEditor] = useState(false);

  // SOURCE DE VÉRITÉ : toutes les questions (y compris supprimées)
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);

  // Navigation par ID — jamais par index
  const [currentId, setCurrentId] = useState<string | null>(null);



  const [subCourses, setSubCourses] = useState<SubCourse[]>([]);
  const [courseId, setCourseId]     = useState<string | null>(null);
  const [newSubCourse, setNewSubCourse]     = useState("");
  const [showAddSubCourse, setShowAddSubCourse] = useState(false);
  const [addingSubCourse, setAddingSubCourse]   = useState(false);

  // ── Dérivés — recalculés à chaque render ─────────────────────────────────
  const activeQuestions = questions.filter(q => !q._deleted);
  const displayedQuestions = activeQuestions;

  const currentQ = displayedQuestions.find(q => q.id === currentId) ?? displayedQuestions[0] ?? null;
  const currentIndex = currentQ ? displayedQuestions.findIndex(q => q.id === currentQ.id) : 0;

  // ── Calcul de la numérotation du cas clinique ──────────────────────────────
  const getCaseNumbering = (
    allQuestions: EditableQuestion[],
    currentQuestion: EditableQuestion
  ): CaseNumbering | null => {
    if (!currentQuestion.clinicalCaseId) {
      return null;
    }

    const caseMap = new Map<string, EditableQuestion[]>();
    const caseOrder: string[] = [];

    allQuestions.forEach((q) => {
      if (q.clinicalCaseId) {
        if (!caseMap.has(q.clinicalCaseId)) {
          caseMap.set(q.clinicalCaseId, []);
          caseOrder.push(q.clinicalCaseId);
        }
        caseMap.get(q.clinicalCaseId)!.push(q);
      }
    });

    const caseNumber = caseOrder.indexOf(currentQuestion.clinicalCaseId) + 1;
    const totalCases = caseOrder.length;
    const questionsInCase = caseMap.get(currentQuestion.clinicalCaseId)?.length || 0;
    const questionsOfCase = caseMap.get(currentQuestion.clinicalCaseId) || [];
    const questionIndexInCase = questionsOfCase.findIndex((q) => q.id === currentQuestion.id) + 1;

    return {
      caseNumber,
      totalCases,
      questionsInCase,
      questionIndexInCase,
    };
  };

  // ── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesId) return;
    (async () => {
      setLoading(true);
      try {
        const series = await getSeriesById(seriesId);
        if (!series) { toast.error("Série introuvable"); navigate(-1); return; }

        setMeta({
          faculty:   series.faculty   || "",
          objective: series.objective || "",
          year:      series.year      || "",
        });

        // Sous-cours liés au cours
        const { data: courseData } = await supabase
          .from("courses")
          .select("id, name")
          .eq("name", series.objective)
          .single();

        if (courseData) {
          setCourseId(courseData.id);
          const { data: scData } = await supabase
            .from("sub_courses")
            .select("id, name, course_id")
            .eq("course_id", courseData.id)
            .order("name", { ascending: true });
          setSubCourses(scData || []);
        }

        // Questions
        const raw = await getQuestionsBySeriesId(seriesId);
        const converted: EditableQuestion[] = raw.map(q => {
          const entry = convertSupabaseQuestionToQCMEntry(q);
          return {
            ...entry,
            _isNew:        false,
            _deleted:      false,
            _imageFile:    null,
            _imagePreview: entry.imageUrl || null,
          };
        });
        setQuestions(converted);
        if (converted.length > 0) setCurrentId(converted[0].id);

      } catch (err) {
        console.error(err);
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [seriesId]);

  // ── Mise à jour d'une question dans le state ─────────────────────────────
  const updateCurrentQuestion = (updates: Partial<EditableQuestion>) => {
    if (!currentId) return;
    setQuestions(prev =>
      prev.map(q =>
        q.id === currentId
          ? { ...q, ...updates, updatedAt: new Date().toISOString() }
          : q
      )
    );
    setHasUnsavedChanges(true);
  };

const goTo = (id: string) => setCurrentId(id);
const goPrev = () => {
  if (currentIndex > 0) goTo(displayedQuestions[currentIndex - 1].id);
};
const goNext = () => {
  if (currentIndex < displayedQuestions.length - 1) goTo(displayedQuestions[currentIndex + 1].id);
};
const handleSaveRef = useRef<() => void>(() => {});
useKeyboardNavigation(goPrev, goNext, () => handleSaveRef.current());


  const updateOption = (index: number, value: string) => {
    if (!currentQ) return;
    const newOptions = [...currentQ.options];
    newOptions[index] = value;
    updateCurrentQuestion({ options: newOptions });
  };

  const addOption = () => {
    if (!currentQ) return;
    if (currentQ.options.length >= 10) { toast.warning("Maximum 10 options"); return; }
    updateCurrentQuestion({ options: [...currentQ.options, ""] });
  };

  const removeOption = (index: number) => {
    if (!currentQ) return;
    if (currentQ.options.length <= 2) { toast.warning("Minimum 2 options"); return; }
    const letter = String.fromCharCode(65 + index);
    updateCurrentQuestion({
      options:        currentQ.options.filter((_: string, i: number) => i !== index),
      correctAnswers: currentQ.correctAnswers.filter((a: string) => a !== letter),
    });
  };

  const toggleCorrectAnswer = (letter: string) => {
    if (!currentQ) return;
    const current = currentQ.correctAnswers || [];
    updateCurrentQuestion({
      correctAnswers: current.includes(letter)
        ? current.filter((a: string) => a !== letter)
        : [...current, letter],
    });
  };

  const toggleTag = (tag: string) => {
    if (!currentQ) return;
    const current = currentQ.tags || [];
    updateCurrentQuestion({
      tags: current.includes(tag)
        ? current.filter((t: string) => t !== tag)
        : [...current, tag],
    });
  };

  // ── Image ─────────────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Image requise (PNG, JPG...)"); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error("Max 5 Mo"); return; }
    updateCurrentQuestion({
      _imageFile:    file,
      _imagePreview: URL.createObjectURL(file),
      _imageRemoved: false,
    });
  };

  const handleRemoveImage = () => {
    updateCurrentQuestion({
      _imageFile:    null,
      _imagePreview: null,
      imageUrl:      null,
      _imageRemoved: true,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Ajouter / Supprimer une question ──────────────────────────────────────
  const addQuestion = () => {
    const newQ: EditableQuestion = {
      id:             `new_${Date.now()}`,
      series_id:      seriesId!,
      question:       "",
      options:        ["", "", "", ""],
      correctAnswers: [],
      tags:           [],
      type:           "QCM",
      subCourse:      null,
      aiJustification: "",
      imageUrl:       null,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
      _isNew:         true,
      _deleted:       false,
      _imageFile:     null,
      _imagePreview:  null,
    };
    setQuestions(prev => [...prev, newQ]);
    setCurrentId(newQ.id);
  };

  const deleteCurrentQuestion = () => {
    if (!currentQ) return;
    if (!window.confirm("Supprimer cette question ?")) return;

    const remainingActive = displayedQuestions.filter(q => q.id !== currentQ.id);
    const nextQ = remainingActive[Math.max(0, currentIndex - 1)] ?? remainingActive[0] ?? null;

    if (currentQ._isNew) {
      setQuestions(prev => prev.filter(q => q.id !== currentQ.id));
    } else {
      setQuestions(prev =>
        prev.map(q => q.id === currentQ.id ? { ...q, _deleted: true } : q)
      );
    }
    setCurrentId(nextQ?.id ?? null);
  };

  // ── Sous-cours ────────────────────────────────────────────────────────────
  const handleAddSubCourse = async () => {
    const trimmed = newSubCourse.trim();
    if (!trimmed || !courseId) return;
    if (subCourses.some(sc => sc.name === trimmed)) { toast.warning("Sous-cours déjà existant"); return; }
    setAddingSubCourse(true);
    try {
      const { data, error } = await supabase
        .from("sub_courses")
        .insert({ name: trimmed, course_id: courseId })
        .select("id, name, course_id")
        .single();
      if (error) throw error;
      setSubCourses(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSubCourse("");
      setShowAddSubCourse(false);
      toast.success(`"${trimmed}" ajouté`);
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setAddingSubCourse(false);
    }
  };

  // ── Copier la question ────────────────────────────────────────────────────
  const handleCopyQuestion = () => {
    if (!currentQ) return;

    const optionsText = currentQ.options
      .map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`)
      .join("\n");

    const answersText = currentQ.correctAnswers.length > 0
      ? `Réponse(s) : ${currentQ.correctAnswers.sort().join(", ")}`
      : "Aucune réponse sélectionnée";

    const tagsText = (currentQ.tags && currentQ.tags.length > 0)
      ? `\n\nTags: ${currentQ.tags.join(", ")}`
      : "";

    const subCourseText = currentQ.subCourse
      ? `\nSous-cours: ${currentQ.subCourse}`
      : "";

    const fullText = `${currentQ.question}\n\n${optionsText}\n\n${answersText}${tagsText}${subCourseText}`;

    navigator.clipboard.writeText(fullText)
      .then(() => toast.success("Question copiée dans le presse-papier !"))
      .catch(() => toast.error("Erreur lors de la copie"));
  };

  // ── SAUVEGARDE ────────────────────────────────────────────────────────────
  const handleBack = async () => {
    if (hasUnsavedChanges) {
      const res = window.confirm("Voulez-vous sauvegarder vos modifications avant de quitter ?\n\n— Cliquez sur \"OK\" pour SAUVEGARDER et quitter.\n— Cliquez sur \"Annuler\" pour QUITTER SANS sauvegarder.");
      if (res) {
        try {
          await handleSave();
          navigate(`/series/list`);
        } catch (err) {
          console.error("Erreur lors de la sauvegarde automatique:", err);
        }
        return;
      }
    }
    navigate(`/series/list`);
  };

  const handleSave = async () => {
    setSaving(true);
    setHasUnsavedChanges(false);
    try {
      // 1. Mettre à jour les métadonnées de la série
      const { error: metaError } = await supabase
        .from("qcm_series")
        .update({
          faculty:    meta.faculty,
          objective:  meta.objective,
          year:       meta.year,
          updated_at: new Date().toISOString(),
        })
        .eq("id", seriesId);
      if (metaError) throw metaError;

      // 2. Supprimer les questions marquées _deleted
      for (const q of questions.filter(q => q._deleted && !q._isNew)) {
        const { error } = await supabase.from("qcm_questions").delete().eq("id", q.id);
        if (error) throw error;
      }

      // 3. Insérer ou mettre à jour les questions actives
      for (const q of questions.filter(q => !q._deleted)) {
        let imageUrl = q.imageUrl;
        if (q._imageFile) {
          setUploadingImage(true);
          const ext      = q._imageFile.name.split(".").pop();
          const fileName = `${q._isNew ? `new_${Date.now()}` : q.id}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("question-images")
            .upload(fileName, q._imageFile, { upsert: true });
          if (upErr) throw upErr;
          imageUrl = supabase.storage.from("question-images").getPublicUrl(fileName).data.publicUrl;
          setUploadingImage(false);
        }

        if (q._isNew) {
          // INSERT
          const { error } = await supabase.from("qcm_questions").insert({
            series_id:       seriesId,
            question:        q.question,
            options:         q.options,
            correct_answers: q.correctAnswers,
            tags:            q.tags ?? [],
            sub_course:      q.subCourse ?? null,
            ai_justification: q.aiJustification ?? null,
            type:            q.type ?? "QCM",
            image_url:       imageUrl,
            created_at:      new Date().toISOString(),
            updated_at:      new Date().toISOString(),
          });
          if (error) throw error;
        } else {
          // UPDATE
          await updateQuestion(q.id, {
            question:        q.question,
            options:         q.options,
            correctAnswers:  q.correctAnswers,
            aiJustification: q.aiJustification,
            type:            q.type,
            tags:            q.tags ?? [],
            subCourse:       q.subCourse ?? null,
            imageUrl:        imageUrl,
          });
        }
      }

      toast.success("✅ Série sauvegardée avec succès");
      navigate(`/series/${seriesId}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });
  // ── États de chargement / vide ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement...
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="min-h-screen p-6" style={{ background: "linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)" }}>
        <div className="max-w-6xl mx-auto">
          <button onClick={handleBack} className="flex items-center gap-2 text-indigo-600 mb-6">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-600 mb-6">Aucune question dans cette série.</p>
            <button onClick={addQuestion} className="px-6 py-3 text-white rounded-xl font-semibold flex items-center gap-2 mx-auto" style={{ background: "#4f46e5" }}>
              <Plus className="w-4 h-4" /> Ajouter une question
            </button>
          </div>
        </div>
      </div>
    );
  }

  const optionLetters = currentQ.options.map((_: string, i: number) => String.fromCharCode(65 + i));
  const imagePreview  = currentQ._imagePreview ?? currentQ.imageUrl ?? null;
  const pendingCount  = displayedQuestions.filter(q => !q._deleted).length;
  const caseNumbering = getCaseNumbering(activeQuestions, currentQ);
  const isClinicalCase = currentQ.clinicalCaseId ? true : false;

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)" }}>
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Retour 
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-medium text-sm">
                  ✏️ Mode édition — {activeQuestions.length} question{activeQuestions.length > 1 ? "s" : ""}
                </div>
                <div className="text-gray-500 text-sm">{meta.objective} • {meta.faculty} • {meta.year}</div>
                <button
                  onClick={() => setShowMetaEditor(v => !v)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <Settings className="w-3.5 h-3.5" /> Modifier infos
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || uploadingImage}
                className="flex items-center gap-2 px-5 py-2 p-1 text-white rounded-lg font-semibold disabled:opacity-60 transition-colors"
                style={{ background: "#16a34a" }}
              >
                <Save className="w-4 h-4" />
                {saving ? "Sauvegarde…" : uploadingImage ? "Upload…" : `Sauvegarder Tous`}
              </button>
            </div>

            {showMetaEditor && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["faculty", "objective", "year"] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {field === "faculty" ? "Faculté" : field === "objective" ? "Objectif" : "Année"}
                    </label>
                    <input
                      type="text"
                      value={meta[field]}
                      onChange={e => setMeta(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* 🎹 INDICATEUR DE NAVIGATION CLAVIER */}
        {/* ═══════════════════════════════════════════════════════════════════════════ 
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
          <span>⌨️ Utilisez les flèches</span>
          <span className="font-mono bg-blue-100 px-2 py-1 rounded">←</span>
          <span className="font-mono bg-blue-100 px-2 py-1 rounded">→</span>
          <span>pour naviguer entre les questions</span>
        </div>
*/}


        {/* ── Barre de navigation ── */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* Gauche */}
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Question précédente (← flèche gauche)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Centre */}
            <div className="text-sm text-gray-600 font-medium">
              Question <strong>{currentIndex + 1}</strong> / <strong>{displayedQuestions.length}</strong>
            </div>

            {/* Droite */}
            <div className="flex items-center gap-2">
              <button
                onClick={addQuestion}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                style={{ background: "#4f46e5" }}
              >
                <Plus className="w-3.5 h-3.5" /> Nouvelle question
              </button>

              <button
                onClick={deleteCurrentQuestion}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>

              <button
                onClick={goNext}
                disabled={currentIndex === displayedQuestions.length - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Question suivante (→ flèche droite)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* 📋 BARRE DE NUMÉROTATION DES CAS CLINIQUES */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {isClinicalCase && caseNumbering && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-6">
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "#3b82f6",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                📋 CAS {caseNumbering.caseNumber} / {caseNumbering.totalCases}
              </div>

              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#1f2937",
                }}
              >
                Question{" "}
                <span style={{ color: "#059669", fontWeight: 700 }}>
                  {caseNumbering.questionIndexInCase}
                </span>{" "}
                /{" "}
                <span style={{ color: "#059669", fontWeight: 700 }}>
                  {caseNumbering.questionsInCase}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Formulaire — key=currentId force le re-render complet à chaque question ── */}
        <div key={currentId} className="bg-white rounded-2xl shadow-lg p-8">

          {/* Texte de la question */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-700 font-medium">Question</label>
              <button
                onClick={handleCopyQuestion}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-medium border border-indigo-100"
              >
                <Copy className="w-3.5 h-3.5" /> Copier
              </button>
            </div>
            <textarea
              value={currentQ.question}
              onChange={e => updateCurrentQuestion({ question: e.target.value })}
              rows={3}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Saisir la question…"
            />
            <div className="mt-1 text-xs text-gray-400">{currentQ.question.length} caractères</div>
          </div>

          {/* Image */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Image</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {imagePreview ? (
              <div style={{ display: "inline-flex", flexDirection: "column", maxWidth: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div style={{ position: "relative" }}>
                  <img src={imagePreview} alt="Aperçu" style={{ display: "block", maxHeight: 288, maxWidth: "100%", objectFit: "contain" }} />
                  <button onClick={handleRemoveImage}
                    style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(220,38,38,0.9)", border: "none", borderRadius: "50%", cursor: "pointer", color: "white" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "white", borderTop: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>✅ Image chargée</span>
                  <button onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: 12, color: "#4f46e5", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}>
                    Remplacer
                  </button>
                </div>
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 24px", borderRadius: 16, border: "2px dashed #d1d5db", background: "#fafafa", cursor: "pointer" }}>
                <ImagePlus className="w-8 h-8 text-gray-400" />
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}>Cliquez pour ajouter une image</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>PNG, JPG, GIF · max 5 Mo</p>
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-gray-700 font-medium">Propositions</label>
              <span className="text-xs text-gray-400">{currentQ.options.length} options</span>
            </div>
            <div className="space-y-3">
              {currentQ.options.map((option: string, i: number) => {
                const letter = String.fromCharCode(65 + i);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full flex-shrink-0 font-medium text-sm">{letter}</span>
                    <input
                      type="text"
                      value={option}
                      onChange={e => updateOption(i, e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder={`Option ${letter}`}
                    />
                    {currentQ.options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {currentQ.options.length < 10 && (
              <button onClick={addOption} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-indigo-600 hover:bg-indigo-50">
                <Plus className="w-4 h-4" /> Ajouter une option
              </button>
            )}
          </div>

          {/* Réponses correctes */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Réponse(s) correcte(s)</label>
            <div className="flex flex-wrap gap-2">
              {optionLetters.map((letter: string, i: number) => (
                <button
                  key={letter}
                  onClick={() => toggleCorrectAnswer(letter)}
                  disabled={!currentQ.options[i]?.trim()}
                  className={`w-12 h-12 rounded-full border-2 font-bold transition-all
                    ${currentQ.correctAnswers.includes(letter)
                      ? "text-white border-transparent shadow-lg scale-110"
                      : "bg-white text-gray-600 border-gray-300"}
                    ${!currentQ.options[i]?.trim() ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                  style={{ background: currentQ.correctAnswers.includes(letter) ? "#16a34a" : "" }}
                >
                  {letter}
                </button>
              ))}
            </div>
            {currentQ.correctAnswers.length > 0 ? (
              <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                ✓ Réponse(s) : <strong>{currentQ.correctAnswers.sort().join(", ")}</strong>
              </div>
            ) : (
              <div className="mt-3 p-3 bg-orange-50 text-orange-600 rounded-lg text-sm">
                ⚠️ Aucune réponse correcte sélectionnée
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full border transition-all text-sm ${
                    currentQ.tags?.includes(tag)
                      ? "text-white border-transparent"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-300"
                  }`}
                  style={{ background: currentQ.tags?.includes(tag) ? "#4f46e5" : "" }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Sous-cours */}
          <div className="mb-6">
            <label className="block mb-2 text-gray-700 font-medium">Sous-cours</label>
            {!courseId && (
              <p className="text-xs text-orange-500 mb-2">⚠️ Aucun cours trouvé pour « {meta.objective} »</p>
            )}
            <div className="flex gap-2">
              <select
                value={currentQ.subCourse || ""}
                onChange={e => updateCurrentQuestion({ subCourse: e.target.value || null })}
                disabled={!courseId}
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">-- Choisir un sous-cours --</option>
                {subCourses.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
              </select>
              <button
                onClick={() => { setShowAddSubCourse(v => !v); setNewSubCourse(""); }}
                disabled={!courseId}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border disabled:opacity-40"
                style={{
                  background: showAddSubCourse ? "#f3f4f6" : "#4f46e5",
                  borderColor: showAddSubCourse ? "#d1d5db" : "#4f46e5",
                  color: showAddSubCourse ? "#4b5563" : "white",
                }}>
                {showAddSubCourse ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddSubCourse ? "Annuler" : "Nouveau"}
              </button>
            </div>
            {showAddSubCourse && courseId && (
              <div className="mt-3 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                <div className="flex gap-2">
                  <input type="text" value={newSubCourse} onChange={e => setNewSubCourse(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddSubCourse(); } }}
                    placeholder="Ex: Cardiologie…" autoFocus
                    className="flex-1 p-3 border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <button onClick={handleAddSubCourse} disabled={addingSubCourse || !newSubCourse.trim()}
                    className="px-4 py-2 text-white rounded-lg disabled:opacity-50"
                    style={{ background: "#4f46e5" }}>
                    {addingSubCourse ? "…" : "Ajouter"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Justification */}
          <div className="mb-6">
            <label className="block mb-2 text-gray-700 font-medium">Justification / Explication</label>
            <textarea
              value={currentQ.aiJustification || ""}
              onChange={e => updateCurrentQuestion({ aiJustification: e.target.value })}
              rows={4}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Ajouter une justification…"
            />
          </div>

          {/* Statut */}
          <div className="p-4 bg-gray-50 rounded-xl text-sm mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><span className="text-gray-500">Options :</span> <strong>{currentQ.options.filter(o => o.trim()).length}/{currentQ.options.length}</strong></div>
              <div><span className="text-gray-500">Réponses :</span> <strong className={currentQ.correctAnswers.length > 0 ? "text-green-600" : "text-orange-500"}>{currentQ.correctAnswers.length}</strong></div>
              <div><span className="text-gray-500">Tags :</span> <strong>{currentQ.tags?.length || 0}</strong></div>
              <div><span className="text-gray-500">Sous-cours :</span> <strong>{currentQ.subCourse ? "✓" : "—"}</strong></div>
            </div>
          </div>

          {/* Navigation bas de page */}
          <div className="flex items-center justify-between">
            <button onClick={goPrev} disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              title="Question précédente (← flèche gauche)">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            <button onClick={goNext} disabled={currentIndex === displayedQuestions.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              title="Question suivante (→ flèche droite)">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/pages/SeriesEditPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QCMEntry } from "../types/qcm.types";
import {
  ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, Plus, X, ImagePlus, Settings
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import {
  getQuestionsBySeriesId,
  updateQuestion,
  getSeriesById,
  convertSupabaseQuestionToQCMEntry,
} from "../supabaseService";

const TAGS = ["Clinique", "Anatomie", "Biologie", "Physiologie", "Épidémiologie"];

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
  // Flag to track if user explicitly removed an existing image
  _imageRemoved?: boolean;
}

export default function SeriesEditPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
  const currentQ        = activeQuestions.find(q => q.id === currentId) ?? activeQuestions[0] ?? null;
  const currentIndex    = currentQ ? activeQuestions.findIndex(q => q.id === currentQ.id) : 0;

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
console.log("Premier question raw:", JSON.stringify(raw[0], null, 2));
        const converted: EditableQuestion[] = raw.map(q => {
          const entry = convertSupabaseQuestionToQCMEntry(q);
          // ✅ FIX: Correctly initialize image state from DB
          // _imagePreview shows the current image (from DB URL or new file)
          // _imageFile is null until user selects a new file
          // _imageRemoved tracks if user explicitly clicked "remove"
          return {
            ...entry,
            _isNew:        false,
            _deleted:      false,
            _imageFile:    null,
            _imagePreview: entry.imageUrl || null,
            _imageRemoved: false,
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
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = (id: string) => setCurrentId(id);
  const goPrev = () => {
    if (currentIndex > 0) goTo(activeQuestions[currentIndex - 1].id);
  };
  const goNext = () => {
    if (currentIndex < activeQuestions.length - 1) goTo(activeQuestions[currentIndex + 1].id);
  };

  // ── Options ───────────────────────────────────────────────────────────────
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
    // ✅ FIX: Set new file + preview, mark as NOT removed
    updateCurrentQuestion({
      _imageFile:    file,
      _imagePreview: URL.createObjectURL(file),
      _imageRemoved: false,
    });
  };

  const handleRemoveImage = () => {
    // ✅ FIX: Mark image as removed so save knows to set imageUrl to null in DB
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
      _imageRemoved:  false,
    };
    setQuestions(prev => [...prev, newQ]);
    setCurrentId(newQ.id);
  };

  const deleteCurrentQuestion = () => {
    if (!currentQ) return;
    if (!window.confirm("Supprimer cette question ?")) return;

    const remainingActive = activeQuestions.filter(q => q.id !== currentQ.id);
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

  // ── SAUVEGARDE ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
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
        // ✅ FIX: Determine final imageUrl correctly:
        // - If user selected a new file → upload it and use new URL
        // - If user removed the image (_imageRemoved) → set to null
        // - Otherwise → keep the existing imageUrl from DB (no change)
        let imageUrl: string | null;

        if (q._imageFile) {
          // New file selected → upload
          setUploadingImage(true);
          const ext      = q._imageFile.name.split(".").pop();
          const fileName = `${q._isNew ? `new_${Date.now()}` : q.id}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("question-images")
            .upload(fileName, q._imageFile, { upsert: true });
          if (upErr) throw upErr;
          imageUrl = supabase.storage.from("question-images").getPublicUrl(fileName).data.publicUrl;
          setUploadingImage(false);
        } else if (q._imageRemoved) {
          // User explicitly removed the image → null
          imageUrl = null;
        } else {
          // No change → preserve existing imageUrl from DB
          imageUrl = q.imageUrl ?? null;
        }

        if (q._isNew) {
          // INSERT
          const { error } = await supabase.from("qcm_questions").insert({
            series_id:        seriesId,
            question:         q.question,
            options:          q.options,
            correct_answers:  q.correctAnswers,
            tags:             q.tags ?? [],
            sub_course:       q.subCourse ?? null,
            ai_justification: q.aiJustification ?? null,
            type:             q.type ?? "QCM",
            image_url:        imageUrl,
            created_at:       new Date().toISOString(),
            updated_at:       new Date().toISOString(),
          });
          if (error) throw error;
        } else {
          // UPDATE — mapping camelCase → snake_case explicite
          await updateQuestion(q.id, {
            question:        q.question,
            options:         q.options,
            correctAnswers:  q.correctAnswers,
            aiJustification: q.aiJustification,
            type:            q.type,
            tags:            q.tags ?? [],
            subCourse:       q.subCourse ?? null,
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
          <button onClick={() => navigate(`/series/${seriesId}`)} className="flex items-center gap-2 text-indigo-600 mb-6">
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
  const imagePreview = currentQ._imagePreview || currentQ.imageUrl || null;
  const pendingCount  = questions.filter(q => !q._deleted).length;

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)" }}>
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/series/${seriesId}`)}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à la série
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
                className="flex items-center gap-2 px-5 py-2 text-white rounded-lg font-semibold disabled:opacity-60 transition-colors"
                style={{ background: "#16a34a" }}
              >
                <Save className="w-4 h-4" />
                {saving ? "Sauvegarde…" : uploadingImage ? "Upload…" : `Sauvegarder (${pendingCount})`}
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

        {/* ── Barre de navigation ── */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <button onClick={goPrev} disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              <span className="text-sm text-gray-600 font-medium">
                Question <strong>{currentIndex + 1}</strong> / <strong>{activeQuestions.length}</strong>
                {currentQ._isNew && <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Nouvelle</span>}
              </span>
              <button onClick={addQuestion}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                style={{ background: "#4f46e5" }}>
                <Plus className="w-3.5 h-3.5" /> Nouvelle question
              </button>
              <button onClick={deleteCurrentQuestion}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
            </div>

            <button onClick={goNext} disabled={currentIndex === activeQuestions.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Mini-liste des questions pour navigation rapide */}
          {activeQuestions.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {activeQuestions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => goTo(q.id)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    q.id === currentId
                      ? "text-white shadow-md scale-110"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={{ background: q.id === currentId ? "#4f46e5" : undefined }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Formulaire — key=currentId force le re-render complet à chaque question ── */}
        <div key={currentId} className="bg-white rounded-2xl shadow-lg p-8">

          {/* Texte de la question */}
          <div className="mb-6">
            <label className="block mb-2 text-gray-700 font-medium">Question</label>
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
                  {/* ✅ FIX: Show whether image is from DB or newly uploaded */}
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {currentQ._imageFile ? "✅ Nouvelle image sélectionnée" : "🖼️ Image existante (BD)"}
                  </span>
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
          <div className="p-4 bg-gray-50 rounded-xl text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><span className="text-gray-500">Options :</span> <strong>{currentQ.options.filter(o => o.trim()).length}/{currentQ.options.length}</strong></div>
              <div><span className="text-gray-500">Réponses :</span> <strong className={currentQ.correctAnswers.length > 0 ? "text-green-600" : "text-orange-500"}>{currentQ.correctAnswers.length}</strong></div>
              <div><span className="text-gray-500">Tags :</span> <strong>{currentQ.tags?.length || 0}</strong></div>
              <div><span className="text-gray-500">Sous-cours :</span> <strong>{currentQ.subCourse ? "✓" : "—"}</strong></div>
            </div>
          </div>

          {/* Navigation bas de page */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={goPrev} disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            <button onClick={goNext} disabled={currentIndex === activeQuestions.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
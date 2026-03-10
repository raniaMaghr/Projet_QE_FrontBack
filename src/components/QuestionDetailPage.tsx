import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QCMEntry, SeriesMetadata } from "../types";
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Trash2, Plus, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import {
  getQuestionsBySeriesId,
  updateQuestion,
  getSeriesById,
  convertSupabaseQuestionToQCMEntry,
  convertSupabaseSeriesToMetadata,
} from "../supabaseService";

const TAGS = ["Clinique", "Anatomie", "Biologie", "Physiologie", "Épidémiologie","Pharmacologie"];

interface SubCourse {
  id: string;
  name: string;
  course_id: string;
  description?: string;
}

export default function QuestionDetailPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QCMEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [metadata, setMetadata] = useState<SeriesMetadata | null>(null);
  const [subCourses, setSubCourses] = useState<SubCourse[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [newSubCourse, setNewSubCourse] = useState("");
  const [showAddSubCourse, setShowAddSubCourse] = useState(false);
  const [addingSubCourse, setAddingSubCourse] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seriesId, setSeriesId] = useState<string | null>(null);

  // ── Image states ──────────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ─────────────────────────────────────────────────────────────────────────

useEffect(() => {
    if (!questionId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Récupérer la question actuelle
        const { data: qData, error: qError } = await supabase
          .from("qcm_questions")
          .select("*")
          .eq("id", questionId)
          .single();

        if (qError || !qData) {
          toast.error("Question introuvable");
          setLoading(false);
          return;
        }

        const foundSeriesId: string = qData.series_id;
        setSeriesId(foundSeriesId);

        // 2. Récupérer les métadonnées de la série
        const series = await getSeriesById(foundSeriesId);
        if (series) {
          const meta = convertSupabaseSeriesToMetadata(series);
          setMetadata(meta);

          const { data: courseData, error: courseError } = await supabase
            .from("courses")
            .select("id, name")
            .eq("name", meta.objective)
            .single();

          if (!courseError && courseData) {
            const foundCourseId = courseData.id;
            setCourseId(foundCourseId);
            await fetchSubCourses(foundCourseId);
          } else {
            console.warn("Cours introuvable pour l'objectif:", meta.objective);
          }
        }

        // 3. Récupérer TOUTES les questions de la série (triées par ordre d'insertion)
        const supabaseQuestions = await getQuestionsBySeriesId(foundSeriesId);
        const converted = supabaseQuestions.map(convertSupabaseQuestionToQCMEntry);

        if (converted.length === 0) {
          toast.error("Aucune question trouvée dans cette série");
          setLoading(false);
          return;
        }

        // 4. Trouver l'index de la question actuelle
        const clickedIndex = converted.findIndex(q => q.id === questionId);
        if (clickedIndex === -1) {
          toast.error("Question introuvable dans la série");
          setLoading(false);
          return;
        }

        // 5. Initialiser l'aperçu avec l'image existante si elle existe
        const clickedQ = converted[clickedIndex];
        if (clickedQ.imageUrl) {
          setImagePreview(clickedQ.imageUrl);
        }

        // 6. Charger TOUTES les questions de la série (pas seulement les cas cliniques)
        setQuestions(converted);
        setCurrentIndex(clickedIndex);

        console.log(`✅ Série chargée: ${converted.length} questions trouvées`);
        console.log(`📍 Position actuelle: ${clickedIndex + 1}/${converted.length}`);

      } catch (err) {
        console.error("Erreur chargement:", err);
        toast.error("Impossible de charger la question");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [questionId]);

  const fetchSubCourses = async (cid: string) => {
    const { data, error } = await supabase
      .from("sub_courses")
      .select("id, name, course_id, description")
      .eq("course_id", cid)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erreur chargement sous-cours:", error);
      toast.error("Impossible de charger les sous-cours");
    } else {
      setSubCourses(data || []);
    }
  };

  // ── Navigation entre les questions ────────────────────────────────────────
  const handlePreviousQuestion = () => {
    if (currentIndex > 0) {
      const prevQuestion = questions[currentIndex - 1];
      console.log(`⬅️ Navigation vers question précédente: ${prevQuestion.id}`);
      navigate(`/question/${prevQuestion.id}`);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextQuestion = questions[currentIndex + 1];
      console.log(`➡️ Navigation vers question suivante: ${nextQuestion.id}`);
      navigate(`/question/${nextQuestion.id}`);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement...
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  if (!currentQ || !metadata) {
    return (
      <div className="min-h-screen p-6" style={{ background: "linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)" }}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Question introuvable</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-white rounded-lg" style={{ background: "#4f46e5" }}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  const isClinicalCase = questions.length > 1;
  const optionLetters = currentQ.options.map((_: string, i: number) => String.fromCharCode(65 + i));

  const updateCurrentQuestion = (updates: Partial<QCMEntry>) => {
    setQuestions(prev =>
      prev.map(q => q.id === currentQ.id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q)
    );
    setHasUnsavedChanges(true);
  };

  const toggleCorrectAnswer = (letter: string) => {
    const current = currentQ.correctAnswers || [];
    updateCurrentQuestion({
      correctAnswers: current.includes(letter)
        ? current.filter(a => a !== letter)
        : [...current, letter],
    });
  };

const toggleTag = (tag: string) => {
  const current = currentQ.tags || [];
  const newTags = current.includes(tag)
    ? current.filter(t => t !== tag)
    : [...current, tag];

  if (currentQ.clinicalCaseId) {
    setQuestions(prev =>
      prev.map(q =>
        q.clinicalCaseId === currentQ.clinicalCaseId
          ? { ...q, tags: newTags, updatedAt: new Date().toISOString() }
          : q
      )
    );
    console.log(`✅ Tag "${tag}" appliqué à toutes les questions du cas clinique: ${currentQ.clinicalCaseId}`);
    setHasUnsavedChanges(true);
  } else {
    updateCurrentQuestion({ tags: newTags });
    console.log(`✅ Tag "${tag}" appliqué à la question: ${currentQ.id}`);
  }
};

  // ── Sélection d'image depuis le PC ────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image (PNG, JPG, GIF...)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde — maximum 5 Mo");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setHasUnsavedChanges(true);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    updateCurrentQuestion({ imageUrl: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      // ✅ FIX: 3 cas distincts pour imageUrl
      let imageUrl: string | null;

      if (imageFile) {
        // Nouveau fichier sélectionné → upload
        setUploadingImage(true);
        const ext = imageFile.name.split(".").pop();
        const fileName = `${currentQ.id}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("question-images")
          .upload(fileName, imageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("question-images")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
        console.log("✅ imageUrl générée:", imageUrl);
        setUploadingImage(false);
        setImageFile(null);
      } else if (imagePreview === null) {
        // Utilisateur a supprimé l'image → null en BD
        imageUrl = null;
      } else {
        // Pas de changement → garder l'URL existante en BD
        imageUrl = currentQ.imageUrl ?? null;
      }

      // Sauvegarder la question courante avec la bonne imageUrl
      await updateQuestion(currentQ.id, {
        ...currentQ,
        imageUrl,
      });

      // ✅ FIX: exclure currentQ du Promise.all pour ne pas écraser son imageUrl
      await Promise.all(
        questions
          .filter(q => q.id !== currentQ.id)
          .map(q =>
            updateQuestion(q.id, {
              ...q,
              tags: q.tags && q.tags.length > 0 ? q.tags : ["Clinique"],
            })
          )
      );

      toast.success("✅ Modifications sauvegardées");
      setHasUnsavedChanges(false);
      navigate(`/series/${seriesId}`);
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      toast.error("Erreur lors de la sauvegarde");
      setUploadingImage(false);
    }
  };

  const handleAddSubCourse = async () => {
    const trimmed = newSubCourse.trim();
    if (!trimmed) {
      toast.warning("Veuillez saisir un nom");
      return;
    }
    if (!courseId) {
      toast.error("Aucun cours associé à cet objectif");
      return;
    }
    if (subCourses.some(sc => sc.name === trimmed)) {
      toast.warning("Ce sous-cours existe déjà");
      return;
    }

    setAddingSubCourse(true);
    try {
      const { data, error } = await supabase
        .from("sub_courses")
        .insert({ name: trimmed, course_id: courseId })
        .select("id, name, course_id, description")
        .single();

      if (error) throw error;

      setSubCourses(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSubCourse("");
      setShowAddSubCourse(false);
      toast.success(`"${trimmed}" ajouté à ${metadata.objective}`);
    } catch (err) {
      console.error("Erreur ajout sous-cours:", err);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setAddingSubCourse(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...currentQ.options];
    newOptions[index] = value;
    updateCurrentQuestion({ options: newOptions });
  };

  const addOption = () => {
    if (currentQ.options.length < 10) {
      updateCurrentQuestion({ options: [...currentQ.options, ""] });
    } else {
      toast.warning("Maximum 10 options atteint");
    }
  };

  const removeOption = (index: number) => {
    if (currentQ.options.length <= 2) {
      toast.warning("Minimum 2 options requises");
      return;
    }
    const newOptions = currentQ.options.filter((_: string, i: number) => i !== index);
    const letter = String.fromCharCode(65 + index);
    updateCurrentQuestion({
      options: newOptions,
      correctAnswers: currentQ.correctAnswers.filter(a => a !== letter),
    });
  };

  const navigateQuestion = (direction: "prev" | "next") => {
    if (hasUnsavedChanges && !window.confirm("Modifications non sauvegardées. Continuer ?")) return;
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    setCurrentIndex(newIndex);
    setHasUnsavedChanges(false);
    navigate(`/question/${questions[newIndex].id}`);
  };

  const handleBack = () => {
    if (hasUnsavedChanges && !window.confirm("Modifications non sauvegardées. Quitter sans sauvegarder ?")) return;
    navigate(-1);
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)" }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate(`/series/${seriesId}`)} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Retour à la série
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-full ${isClinicalCase ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                  {isClinicalCase ? `Cas clinique (${questions.length} questions)` : "QCM simple"}
                </div>
                <div className="text-gray-600 text-sm">
                  {metadata.objective} • {metadata.faculty} • {metadata.year}
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={uploadingImage}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-60"
                style={{ background: "#16a34a" }}
              >
                <Save className="w-4 h-4" />
                {uploadingImage ? "Upload image..." : "Sauvegarder"}
              </button>
            </div>

            {hasUnsavedChanges && (
              <div className="mt-2 text-orange-600 text-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-500 rounded-full inline-block" />
                Modifications non sauvegardées
              </div>
            )}
          </div>
        </div>

        {/* Navigation cas clinique */}
        {isClinicalCase && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <button onClick={() => navigateQuestion("prev")} disabled={currentIndex === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm text-gray-600 font-medium">
            Question <strong>{currentIndex + 1}</strong> / <strong>{questions.length}</strong>
          </div>
              <button onClick={() => navigateQuestion("next")} disabled={currentIndex === questions.length - 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
            <div className="mt-1 text-xs text-gray-500">{currentQ.question.length} caractères</div>
          </div>

          {/* ── IMAGE UPLOAD — PRO DESIGN ──────────────────────────────────── */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Image de la question</label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {imagePreview ? (
              /* ── Preview card ── */
              <div
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  maxWidth: "100%",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 24px rgba(79,70,229,0.08)",
                  background: "#f9fafb",
                }}
              >
                {/* Image wrapper */}
                <div style={{ position: "relative" }}>
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    style={{
                      display: "block",
                      maxHeight: "288px",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                  {/* Top gradient for button legibility */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, transparent 38%)",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Remove button */}
                  <button
                    onClick={handleRemoveImage}
                    title="Supprimer l'image"
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      width: "30px",
                      height: "30px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(220,38,38,0.9)",
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
                      color: "white",
                      zIndex: 2,
                      transition: "transform 0.15s, background 0.15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.12)";
                      (e.currentTarget as HTMLButtonElement).style.background = "#b91c1c";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.9)";
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Footer action bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "white",
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#22c55e",
                        display: "inline-block",
                        boxShadow: "0 0 0 3px rgba(34,197,94,0.15)",
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
                      Image chargée
                    </span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 13px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#4f46e5",
                      background: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#e0e7ff";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#a5b4fc";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#eef2ff";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#c7d2fe";
                    }}
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    Remplacer
                  </button>
                </div>
              </div>
            ) : (
              /* ── Drop zone ── */
              <div
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "14px",
                  padding: "52px 24px",
                  borderRadius: "16px",
                  border: "2px dashed #d1d5db",
                  background: "linear-gradient(145deg, #fafafa 0%, #f4f4f5 100%)",
                  cursor: "pointer",
                  overflow: "hidden",
                  transition: "border-color 0.2s, background 0.2s",
                  outline: "none",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#818cf8";
                  el.style.background = "linear-gradient(145deg, #eef2ff 0%, #e0e7ff 100%)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#d1d5db";
                  el.style.background = "linear-gradient(145deg, #fafafa 0%, #f4f4f5 100%)";
                }}
                onFocus={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#818cf8"; }}
                onBlur={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#d1d5db"; }}
              >
                {/* Decorative blobs */}
                <div style={{
                  position: "absolute", width: "140px", height: "140px", borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
                  top: "-40px", right: "-40px", pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", width: "100px", height: "100px", borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
                  bottom: "-30px", left: "-30px", pointerEvents: "none",
                }} />

                {/* Icon container */}
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 20px rgba(99,102,241,0.28)",
                    flexShrink: 0,
                  }}
                >
                  <ImagePlus style={{ width: "26px", height: "26px", color: "white" }} />
                </div>

                {/* Text */}
                <div style={{ textAlign: "center", zIndex: 1 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#374151", lineHeight: 1.4 }}>
                    Cliquez pour ajouter une image
                  </p>
                  <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                    PNG, JPG, GIF · max 5 Mo
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* ──────────────────────────────────────────────────────────────── */}

          {/* Options */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-gray-700 font-medium">Propositions</label>
              <span className="text-xs text-gray-500">{currentQ.options.length} option{currentQ.options.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-3">
              {currentQ.options.map((option: string, i: number) => {
                const letter = String.fromCharCode(65 + i);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full flex-shrink-0 font-medium">{letter}</span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      placeholder={`Option ${letter}`}
                    />
                    {currentQ.options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="p-2 rounded-lg transition-colors" style={{ color: "#dc2626" }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {currentQ.options.length < 10 && (
              <button onClick={addOption} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors" style={{ color: "#4f46e5" }}>
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
                  className={`w-12 h-12 rounded-full border-2 transition-all font-medium
                    ${currentQ.correctAnswers.includes(letter) ? "text-white border-transparent shadow-lg scale-110" : "bg-white text-gray-700 border-gray-300"}
                    ${!currentQ.options[i]?.trim() ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                  title={currentQ.options[i] || "Option vide"}
                  style={{ background: currentQ.correctAnswers.includes(letter) ? "#16a34a" : "" }}
                >
                  {letter}
                </button>
              ))}
            </div>
            {currentQ.correctAnswers.length > 0 ? (
              <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-lg">
                ✓ Réponse(s) sélectionnée(s) : <strong>{currentQ.correctAnswers.join(", ")}</strong>
              </div>
            ) : (
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
                  className={`px-4 py-2 rounded-full border transition-all ${currentQ.tags?.includes(tag) ? "text-white border-transparent shadow-md" : "bg-white text-gray-700 border-gray-300"}`}
                  style={{ background: currentQ.tags?.includes(tag) ? "#4f46e5" : "" }}
                >
                  {tag}
                </button>
              ))}
            </div>
            {currentQ.tags && currentQ.tags.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                {currentQ.tags.length} tag{currentQ.tags.length > 1 ? "s" : ""} sélectionné{currentQ.tags.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Sous-cours */}
          <div className="mb-6">
            <label className="block mb-1 text-gray-700 font-medium">Sous-cours</label>

            {courseId ? (
              <p className="text-xs text-indigo-600 mb-3">
                📚 Sous-cours de : <strong>{metadata.objective}</strong> ({subCourses.length} disponible{subCourses.length > 1 ? "s" : ""})
              </p>
            ) : (
              <p className="text-xs text-orange-500 mb-3">
                ⚠️ Aucun cours trouvé pour l'objectif « {metadata.objective} »
              </p>
            )}

            <div className="flex gap-2">
              <select
                value={currentQ.subCourse || ""}
                onChange={(e) => updateCurrentQuestion({ subCourse: e.target.value || null })}
                disabled={!courseId}
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">-- Choisir un sous-cours --</option>
                {subCourses.map((sc) => (
                  <option key={sc.id} value={sc.name}>{sc.name}</option>
                ))}
              </select>

              <button
                onClick={() => { setShowAddSubCourse(v => !v); setNewSubCourse(""); }}
                disabled={!courseId}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: showAddSubCourse ? "#f3f4f6" : "#4f46e5",
                  borderColor: showAddSubCourse ? "#d1d5db" : "#4f46e5",
                  color: showAddSubCourse ? "#4b5563" : "white",
                }}
              >
                {showAddSubCourse ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddSubCourse ? "Annuler" : "Nouveau"}
              </button>
            </div>

            {showAddSubCourse && courseId && (
              <div className="mt-3 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                <p className="text-sm text-indigo-700 font-medium mb-2">
                  Nouveau sous-cours pour <strong>{metadata.objective}</strong>
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubCourse}
                    onChange={(e) => setNewSubCourse(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubCourse(); } }}
                    placeholder="Ex: Cardiologie, Neurologie..."
                    autoFocus
                    className="flex-1 p-3 border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
                  <button
                    onClick={handleAddSubCourse}
                    disabled={addingSubCourse || !newSubCourse.trim()}
                    className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ background: "#4f46e5" }}
                  >
                    {addingSubCourse ? "..." : "Ajouter"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Justification */}
          <div className="mb-6">
            <label className="block mb-3 text-gray-700 font-medium">Justification / Explication</label>
            <textarea
              value={currentQ.aiJustification || ""}
              onChange={(e) => updateCurrentQuestion({ aiJustification: e.target.value })}
              rows={4}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-shadow"
              placeholder="Ajouter une justification ou explication pour cette question..."
            />
            <div className="mt-1 text-xs text-gray-500">{(currentQ.aiJustification || "").length} caractères</div>
          </div>

          {/* Stats */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Statut de la question</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-600">Options :</span><span className="ml-2 font-medium">{currentQ.options.length}</span></div>
              <div><span className="text-gray-600">Réponses :</span><span className={`ml-2 font-medium ${currentQ.correctAnswers.length > 0 ? "text-green-600" : "text-orange-600"}`}>{currentQ.correctAnswers.length}</span></div>
              <div><span className="text-gray-600">Tags :</span><span className="ml-2 font-medium">{currentQ.tags?.length || 0}</span></div>
              <div><span className="text-gray-600">Sous-cours :</span><span className="ml-2 font-medium">{currentQ.subCourse ? "✓" : "—"}</span></div>
            </div>
          </div>
            {/* Quick navigation buttons */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
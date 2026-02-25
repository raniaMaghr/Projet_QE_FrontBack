import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Save, ChevronLeft, ChevronRight, Trash2, Plus,
  Upload, ArrowRight, Target, Building2, Calendar, List,
} from "lucide-react";

interface QCMEntry {
  id: string;
  question: string;
  options: string[];
  correctAnswers: string[];
  tags: string[];
  subCourse: string | null;
  aiJustification: string;
  clinicalCaseId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SeriesMetadata {
  objective: string;
  faculty: string;
  year: string;
}

const TAGS = ["Clinique", "Anatomie", "Biologie", "Physiologie", "Épidémiologie"];

const FACULTIES = [
  "Faculté de Médecine d'Alger",
  "Faculté de Médecine d'Oran",
  "Faculté de Médecine de Constantine",
  "Faculté de Médecine de Annaba",
  "Faculté de Médecine de Tlemcen",
  "Autre",
];

const YEARS = Array.from({ length: 10 }, (_, i) => `${2024 - i}/${2025 - i}`);

const DISEASES = [
  "Hypertension artérielle", "Diabète mellitus", "Insuffisance cardiaque", "Pneumonie",
  "Tuberculose", "Hépatite virale", "Cirrhose hépatique", "Insuffisance rénale chronique",
  "Épilepsie", "AVC", "Méningite", "Septicémie", "Anémie", "Leucémie",
  "Cancer du sein", "Cancer colorectal", "Appendicite", "Cholécystite",
  "Ulcère gastroduodénal", "Reflux gastro-oesophagien",
];

function Toast({ message, type, onClose }: { message: string; type: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium
      ${type === "success" ? "bg-emerald-600" : type === "warning" ? "bg-amber-500" : "bg-red-600"}`}>
      {message}
    </div>
  );
}

function UploadPage({ onContinue }: { onContinue: (q: QCMEntry[], m: SeriesMetadata) => void }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [objective, setObjective] = useState("");
  const [faculty, setFaculty] = useState("");
  const [year, setYear] = useState("");
  const [diseaseSearch, setDiseaseSearch] = useState("");
  const [showDiseaseList, setShowDiseaseList] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredDiseases = DISEASES.filter(d => d.toLowerCase().includes(diseaseSearch.toLowerCase()));
  const canContinue = !!(file && objective && faculty && year);

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["csv", "json"].includes(ext ?? "")) {
      setToast({ message: "Format non supporté. Utilisez CSV ou JSON.", type: "error" });
      return;
    }
    setFile(f);
    setToast({ message: `✅ Fichier "${f.name}" chargé`, type: "success" });
  };

  const handleContinue = () => {
    if (!canContinue || !file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let questions: QCMEntry[] = [];
        const ext = file.name.split(".").pop()?.toLowerCase();
        const result = e.target?.result as string;
        if (ext === "json") {
          questions = JSON.parse(result);
        } else {
          const lines = result.split("\n").filter(Boolean);
          questions = lines.slice(1).map((line, idx) => {
            const cols = line.match(/(".*?"|[^,]+)/g) || [];
            const clean = (s: string) => (s || "").replace(/"/g, "").trim();
            const options = clean(cols[1] || "").split(/[;|]/).map(o => o.trim()).filter(Boolean);
            return {
              id: `q-${Date.now()}-${idx}`,
              question: clean(cols[0] || `Question ${idx + 1}`),
              options: options.length ? options : ["Option A", "Option B"],
              correctAnswers: [], tags: [], subCourse: null, aiJustification: "",
              clinicalCaseId: clean(cols[2] || "") || null,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
          });
        }
        onContinue(questions, { objective, faculty, year });
      } catch {
        const demo: QCMEntry[] = Array.from({ length: 5 }, (_, i) => ({
          id: `q-demo-${i}`,
          question: `Question de démonstration ${i + 1} concernant ${objective} ?`,
          options: ["Option A", "Option B", "Option C", "Option D", "Option E"],
          correctAnswers: [], tags: [], subCourse: null, aiJustification: "",
          clinicalCaseId: i < 3 ? "cas-1" : null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }));
        onContinue(demo, { objective, faculty, year });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-3xl mx-auto">

        <div className="text-center mb-8 pt-6">
          <h1 className="text-2xl font-bold text-indigo-700 mb-1">QCM Database Builder</h1>
          <p className="text-gray-500 text-sm">Uploadez votre série et configurez les paramètres</p>
        </div>

        {/* Upload Zone */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-500" />
            Uploader la série de QCM
          </h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all
              ${dragging ? "border-indigo-400 bg-indigo-50" : file ? "border-emerald-400 bg-emerald-50" : "border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
          >
            <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${file ? "bg-emerald-100" : "bg-gray-100"}`}>
              <Upload className={`w-7 h-7 ${file ? "text-emerald-600" : "text-gray-400"}`} />
            </div>
            {file ? (
              <>
                <p className="text-emerald-700 font-semibold text-lg">{file.name}</p>
                <p className="text-emerald-600 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <p className="text-gray-500 mb-3">Glissez-déposez votre fichier ici</p>
                <p className="text-gray-400 text-sm mb-4">ou</p>
                <span className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm">
                  Parcourir les fichiers
                </span>
                <p className="text-gray-400 text-xs mt-4">Formats acceptés : CSV, JSON</p>
              </>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="relative">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 text-red-400" /> Objectif (Maladie)
              </label>
              <div className="flex gap-2">
                <input
                  value={diseaseSearch || objective}
                  onChange={e => { setDiseaseSearch(e.target.value); setObjective(e.target.value); setShowDiseaseList(true); }}
                  onFocus={() => setShowDiseaseList(true)}
                  onBlur={() => setTimeout(() => setShowDiseaseList(false), 150)}
                  placeholder="Rechercher une maladie..."
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                <button type="button" className="p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <List className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              {showDiseaseList && filteredDiseases.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {filteredDiseases.map(d => (
                    <button key={d} type="button"
                      onClick={() => { setObjective(d); setDiseaseSearch(""); setShowDiseaseList(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 text-amber-500" /> Faculté
              </label>
              <select value={faculty} onChange={e => setFaculty(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                <option value="">Sélectionner...</option>
                {FACULTIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" /> Année
              </label>
              <select value={year} onChange={e => setYear(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                <option value="">Sélectionner...</option>
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 flex items-center gap-2">
          <span className="text-lg">💡</span>
          <p className="text-sm text-gray-700">
            <strong className="text-gray-900">{DISEASES.length} objectifs de maladies</strong> disponibles pour classification
          </p>
        </div>

        {/* Continue button */}
        <button type="button" onClick={handleContinue} disabled={!canContinue}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-base
            ${canContinue ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
          Continuer vers les questions
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* CSV format */}
        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📋</span> Format CSV attendu :
          </h3>
          <div className="bg-white rounded-lg px-4 py-3 font-mono text-sm text-gray-700 mb-3 border border-blue-100">
            question,propositions,cas_clinique_id
          </div>
          <p className="text-indigo-600 text-sm mb-3">
            Exemple : "Question?","Réponse A;Réponse B;Réponse C",""
          </p>
          <div className="space-y-2">
            {[
              <React.Fragment key="1">Séparateur de propositions : <strong>;</strong> ou <strong>|</strong></React.Fragment>,
              <React.Fragment key="2">Questions d'un même cas clinique : même <strong>cas_clinique_id</strong></React.Fragment>,
              <React.Fragment key="3">QCM simple : laissez <strong>cas_clinique_id</strong> vide</React.Fragment>,
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 w-4 h-4 rounded bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionGridPage({
  questions, metadata, onSelectQuestion, onBack,
}: {
  questions: QCMEntry[];
  metadata: SeriesMetadata;
  onSelectQuestion: (id: string, related: QCMEntry[]) => void;
  onBack: () => void;
}) {
  const clinicalCases: Record<string, QCMEntry[]> = {};
  const standalone: QCMEntry[] = [];

  questions.forEach(q => {
    if (q.clinicalCaseId) {
      if (!clinicalCases[q.clinicalCaseId]) clinicalCases[q.clinicalCaseId] = [];
      clinicalCases[q.clinicalCaseId].push(q);
    } else {
      standalone.push(q);
    }
  });

  const completion = questions.filter(q => q.correctAnswers.length > 0).length;
  const total = questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-indigo-700">{metadata.objective}</h1>
            <p className="text-sm text-gray-500">{metadata.faculty} • {metadata.year}</p>
          </div>
          <div className="text-sm text-gray-500">{completion}/{total} complétées</div>
        </div>

        <div className="bg-white rounded-full h-2 mb-6 overflow-hidden shadow-inner">
          <div className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${total > 0 ? (completion / total) * 100 : 0}%` }} />
        </div>

        {Object.entries(clinicalCases).map(([caseId, qs]) => (
          <div key={caseId} className="bg-white rounded-2xl shadow-md p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                Cas clinique • {qs.length} questions
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {qs.map((q, idx) => (
                <button key={q.id} type="button" onClick={() => onSelectQuestion(q.id, qs)}
                  className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-105 hover:shadow-md
                    ${q.correctAnswers.length > 0 ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-indigo-300"}`}>
                  <div className="text-xs font-bold text-gray-500 mb-1">Q{idx + 1}</div>
                  <div className="text-xs text-gray-600 line-clamp-2">{q.question}</div>
                  {q.correctAnswers.length > 0 && (
                    <div className="mt-1 text-xs text-emerald-600 font-medium">✓ {q.correctAnswers.join(", ")}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {standalone.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                QCM simples • {standalone.length} questions
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {standalone.map(q => (
                <button key={q.id} type="button" onClick={() => onSelectQuestion(q.id, [q])}
                  className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-105 hover:shadow-md
                    ${q.correctAnswers.length > 0 ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-indigo-300"}`}>
                  <div className="text-xs font-bold text-gray-500 mb-1">QCM</div>
                  <div className="text-xs text-gray-600 line-clamp-2">{q.question}</div>
                  {q.correctAnswers.length > 0 && (
                    <div className="mt-1 text-xs text-emerald-600 font-medium">✓ {q.correctAnswers.join(", ")}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionDetailPage({
  currentQuestionId, relatedQuestions: initRelated, allQuestions, metadata, onBack, onSave,
}: {
  currentQuestionId: string;
  relatedQuestions: QCMEntry[];
  allQuestions: QCMEntry[];
  metadata: SeriesMetadata;
  onBack: () => void;
  onSave: (questions: QCMEntry[]) => void;
}) {
  const safeRelated = initRelated ?? [];
  const [questions, setQuestions] = useState<QCMEntry[]>(allQuestions ?? []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [subCourses, setSubCourses] = useState<string[]>([]);
  const [newSubCourse, setNewSubCourse] = useState("");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const relatedIds = safeRelated.map(q => q.id);
  const relatedQuestions = questions.filter(q => relatedIds.includes(q.id));
  const currentQ = relatedQuestions[currentIndex];
  const optionLetters = currentQ ? currentQ.options.map((_, i) => String.fromCharCode(65 + i)) : [];
  const isClinicalCase = relatedQuestions.length > 1;

  useEffect(() => {
    const saved = localStorage.getItem("qcm-subcourses");
    if (saved) { try { setSubCourses(JSON.parse(saved)); } catch { /* ignore */ } }
    const idx = safeRelated.findIndex(q => q.id === currentQuestionId);
    if (idx >= 0) setCurrentIndex(idx);
  }, []); // eslint-disable-line

  useEffect(() => {
    localStorage.setItem("qcm-subcourses", JSON.stringify(subCourses));
  }, [subCourses]);

  const update = (updates: Partial<QCMEntry>) => {
    if (!currentQ) return;
    setQuestions(prev => prev.map(q =>
      q.id === currentQ.id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q
    ));
    setHasUnsaved(true);
  };

  const toggleAnswer = (letter: string) => {
    const cur = currentQ?.correctAnswers ?? [];
    update({ correctAnswers: cur.includes(letter) ? cur.filter(a => a !== letter) : [...cur, letter] });
  };

  const toggleTag = (tag: string) => {
    const cur = currentQ?.tags ?? [];
    update({ tags: cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag] });
  };

  const addOption = () => {
    if (currentQ && currentQ.options.length < 10) update({ options: [...currentQ.options, ""] });
  };

  const removeOption = (i: number) => {
    if (!currentQ || currentQ.options.length <= 2) return;
    const newOpts = currentQ.options.filter((_, idx) => idx !== i);
    const letter = String.fromCharCode(65 + i);
    update({ options: newOpts, correctAnswers: currentQ.correctAnswers.filter(a => a !== letter) });
  };

  const navigate = (dir: "prev" | "next") => {
    if (hasUnsaved && !window.confirm("Modifications non sauvegardées. Continuer ?")) return;
    if (dir === "prev" && currentIndex > 0) { setCurrentIndex(i => i - 1); setHasUnsaved(false); }
    if (dir === "next" && currentIndex < relatedQuestions.length - 1) { setCurrentIndex(i => i + 1); setHasUnsaved(false); }
  };

  const handleSave = () => {
    onSave(questions);
    setHasUnsaved(false);
    setToast({ message: "✅ Modifications sauvegardées", type: "success" });
  };

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Question introuvable</p>
          <button type="button" onClick={onBack} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Retour à la grille
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-5">
          <button type="button"
            onClick={() => { if (!hasUnsaved || window.confirm("Quitter sans sauvegarder ?")) onBack(); }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour à la grille
          </button>
          <div className="bg-white rounded-2xl shadow-md px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${isClinicalCase ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                {isClinicalCase ? `Cas clinique (${relatedQuestions.length} questions)` : "QCM simple"}
              </span>
              <span className="text-gray-400 text-sm">{metadata.objective} • {metadata.faculty} • {metadata.year}</span>
            </div>
            <div className="flex items-center gap-3">
              {hasUnsaved && (
                <span className="flex items-center gap-1.5 text-amber-600 text-sm">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Non sauvegardé
                </span>
              )}
              <button type="button" onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
                <Save className="w-4 h-4" /> Sauvegarder
              </button>
            </div>
          </div>
        </div>

        {/* Clinical navigation */}
        {isClinicalCase && (
          <div className="bg-white rounded-2xl shadow-md px-5 py-3 mb-5 flex items-center justify-between">
            <button type="button" onClick={() => navigate("prev")} disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm mr-2">Question {currentIndex + 1} / {relatedQuestions.length}</span>
              {relatedQuestions.map((_, idx) => (
                <button key={idx} type="button"
                  onClick={() => { if (!hasUnsaved || window.confirm("Continuer ?")) { setCurrentIndex(idx); setHasUnsaved(false); } }}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                    ${idx === currentIndex ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {idx + 1}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => navigate("next")} disabled={currentIndex === relatedQuestions.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-md p-8 space-y-7">

          {/* Question */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Question</label>
            <textarea value={currentQ.question} onChange={e => update({ question: e.target.value })}
              rows={3} placeholder="Saisir la question..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-sm transition-shadow" />
            <div className="mt-1 text-xs text-gray-400">{currentQ.question.length} caractères</div>
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Propositions</label>
              <span className="text-xs text-gray-400">{currentQ.options.length} option{currentQ.options.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2.5">
              {currentQ.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full text-sm font-bold text-gray-600">
                      {letter}
                    </span>
                    <input value={opt} onChange={e => {
                      const opts = [...currentQ.options]; opts[i] = e.target.value; update({ options: opts });
                    }} placeholder={`Option ${letter}`}
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-shadow" />
                    {currentQ.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {currentQ.options.length < 10 && (
              <button type="button" onClick={addOption} className="mt-3 flex items-center gap-1.5 text-indigo-600 text-sm hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Ajouter une option
              </button>
            )}
          </div>

          {/* Correct answers */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Réponse(s) correcte(s)</label>
            <div className="flex flex-wrap gap-2">
              {optionLetters.map((letter, i) => (
                <button key={letter} type="button" onClick={() => toggleAnswer(letter)}
                  disabled={!currentQ.options[i]?.trim()}
                  className={`w-11 h-11 rounded-full border-2 font-semibold text-sm transition-all
                    ${currentQ.correctAnswers.includes(letter)
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-110"
                      : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:scale-105"
                    } ${!currentQ.options[i]?.trim() ? "opacity-30 cursor-not-allowed" : ""}`}>
                  {letter}
                </button>
              ))}
            </div>
            {currentQ.correctAnswers.length > 0 ? (
              <div className="mt-3 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                ✓ Réponse(s) : <strong>{currentQ.correctAnswers.join(", ")}</strong>
              </div>
            ) : (
              <div className="mt-3 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-lg text-sm">
                ⚠️ Aucune réponse correcte sélectionnée
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Tags thématiques</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`px-4 py-1.5 rounded-full border text-sm transition-all
                    ${currentQ.tags?.includes(tag)
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-indigo-300"
                    }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Sous-cours */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Sous-cours</label>
            <select value={currentQ.subCourse || ""} onChange={e => update({ subCourse: e.target.value || null })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-3">
              <option value="">-- Choisir un sous-cours --</option>
              {subCourses.map(sc => <option key={sc}>{sc}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={newSubCourse} onChange={e => setNewSubCourse(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newSubCourse.trim() && !subCourses.includes(newSubCourse.trim())) {
                    setSubCourses(prev => [...prev, newSubCourse.trim()]);
                    setNewSubCourse("");
                  }
                }}
                placeholder="Ajouter un nouveau sous-cours"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              <button type="button" disabled={!newSubCourse.trim()}
                onClick={() => {
                  if (newSubCourse.trim() && !subCourses.includes(newSubCourse.trim())) {
                    setSubCourses(prev => [...prev, newSubCourse.trim()]);
                    setNewSubCourse("");
                  }
                }}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Ajouter
              </button>
            </div>
          </div>

          {/* Justification */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Justification / Explication</label>
            <textarea value={currentQ.aiJustification} onChange={e => update({ aiJustification: e.target.value })}
              rows={4} placeholder="Ajouter une justification ou explication..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-sm transition-shadow" />
            <div className="mt-1 text-xs text-gray-400">{currentQ.aiJustification.length} caractères</div>
          </div>

          {/* Stats */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Statut de la question</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              {([
                ["Options", String(currentQ.options.length), ""],
                ["Réponses", String(currentQ.correctAnswers.length), currentQ.correctAnswers.length > 0 ? "text-emerald-600" : "text-amber-600"],
                ["Tags", String(currentQ.tags?.length ?? 0), ""],
                ["Sous-cours", currentQ.subCourse ? "✓" : "—", currentQ.subCourse ? "text-emerald-600" : ""],
              ] as [string, string, string][]).map(([label, val, cls]) => (
                <div key={label}>
                  <div className="text-gray-500 text-xs">{label}</div>
                  <div className={`font-semibold mt-0.5 ${cls}`}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export principal — utilisé directement par React Router ─────────────────
export default function QCMInsertForm() {
  const [page, setPage] = useState<"upload" | "grid" | "detail">("upload");
  const [questions, setQuestions] = useState<QCMEntry[]>([]);
  const [metadata, setMetadata] = useState<SeriesMetadata>({ objective: "", faculty: "", year: "" });
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [selectedRelated, setSelectedRelated] = useState<QCMEntry[]>([]);

  const handleContinue = (qs: QCMEntry[], meta: SeriesMetadata) => {
    setQuestions(qs);
    setMetadata(meta);
    setPage("grid");
  };

  const handleSelectQuestion = (qId: string, related: QCMEntry[]) => {
    setSelectedQuestionId(qId);
    setSelectedRelated(related);
    setPage("detail");
  };

  const handleSave = (updatedQuestions: QCMEntry[]) => {
    setQuestions(updatedQuestions);
    localStorage.setItem("qcm-questions", JSON.stringify(updatedQuestions));
  };

  if (page === "upload") {
    return <UploadPage onContinue={handleContinue} />;
  }

  if (page === "grid") {
    return (
      <QuestionGridPage
        questions={questions}
        metadata={metadata}
        onSelectQuestion={handleSelectQuestion}
        onBack={() => setPage("upload")}
      />
    );
  }

  return (
    <QuestionDetailPage
      currentQuestionId={selectedQuestionId}
      relatedQuestions={selectedRelated}
      allQuestions={questions}
      metadata={metadata}
      onBack={() => setPage("grid")}
      onSave={handleSave}
    />
  );
}
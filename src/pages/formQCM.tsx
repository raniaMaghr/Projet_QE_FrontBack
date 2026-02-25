import { useState } from "react";

type QuestionType = "QCM" | "QCM-multiple" | "QROC" | "QCS" | string;
type StatusType = "draft" | "published" | "archived";
type LevelType = "L1" | "L2" | "L3" | "M1" | "M2" | "D1" | "D2" | "D3" | string;

interface QuestionFormData {
  numero: number;
  type: QuestionType;
  question: string;
  difficulty: number;
  year: number;
  options: Record<string, string>;
  tags: string[];
  image_url: string;
  status: StatusType;
  correct_answers: string[];
  explanation: string;
  level: LevelType;
  specialty: string;
  course: string;
  faculty: string;
}

const defaultForm: QuestionFormData = {
  numero: 1,
  type: "QCM",
  question: "",
  difficulty: 1,
  year: new Date().getFullYear(),
  options: { A: "", B: "", C: "", D: "", E: "" },
  tags: [],
  image_url: "",
  status: "draft",
  correct_answers: [],
  explanation: "",
  level: "L1",
  specialty: "",
  course: "",
  faculty: "",
};

const QUESTION_TYPES: QuestionType[] = ["QCM", "QCM-multiple", "QROC", "QCS"];
const STATUSES: StatusType[] = ["draft", "published", "archived"];
const LEVELS: LevelType[] = ["L1", "L2", "L3", "M1", "M2", "D1", "D2", "D3"];

export default function QuestionForm() {
  const [form, setForm] = useState<QuestionFormData>(defaultForm);
  const [tagInput, setTagInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof QuestionFormData>(key: K, value: QuestionFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleCorrectAnswer = (key: string) => {
    set(
      "correct_answers",
      form.correct_answers.includes(key)
        ? form.correct_answers.filter((a) => a !== key)
        : [...form.correct_answers, key]
    );
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set("tags", [...form.tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (t: string) => set("tags", form.tags.filter((x) => x !== t));

  const handleOptionChange = (key: string, val: string) =>
    set("options", { ...form.options, [key]: val });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data:", form);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const inputClass =
    "w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4d5e] focus:outline-none focus:border-[#6366f1] transition-colors";
  const labelClass = "block text-xs font-semibold text-[#8b8fa8] uppercase tracking-widest mb-1.5";
  const sectionClass = "bg-[#161821] border border-[#1e2030] rounded-xl p-5 space-y-4";

  return (
    <div
      style={{ fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace" }}
      className="min-h-screen bg-[#0a0b0f] text-white"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0b0f; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 2px; }
        select option { background: #161821; }
        .badge-correct { background: linear-gradient(135deg, #10b981, #059669); }
        .badge-wrong { background: #1e2030; border: 1px solid #2a2d3a; }
        @keyframes slideIn { from { opacity:0; transform: translateY(-8px); } to { opacity:1; transform: translateY(0); } }
        .slide-in { animation: slideIn 0.3s ease; }
        .diff-btn { transition: all 0.15s; }
        .diff-btn:hover { transform: scale(1.08); }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-8 rounded-full bg-gradient-to-b from-[#6366f1] to-[#a855f7]" />
            <h1
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
              className="text-3xl font-extrabold text-white"
            >
              Nouvelle Question
            </h1>
          </div>
          <p className="text-[#4a4d5e] text-sm ml-5">Base de données médicale · Saisie structurée</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-4">
            <div className={sectionClass}>
              <label className={labelClass}>Numéro</label>
              <input
                type="number"
                className={inputClass}
                value={form.numero}
                onChange={(e) => set("numero", Number(e.target.value))}
                min={1}
              />
            </div>
            <div className={sectionClass}>
              <label className={labelClass}>Année</label>
              <input
                type="number"
                className={inputClass}
                value={form.year}
                onChange={(e) => set("year", Number(e.target.value))}
                min={2000}
                max={2100}
              />
            </div>
            <div className={sectionClass}>
              <label className={labelClass}>Type</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty */}
          <div className={sectionClass}>
            <label className={labelClass}>Difficulté</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => set("difficulty", d)}
                  className={`diff-btn flex-1 py-2 rounded-lg text-sm font-medium ${
                    form.difficulty === d
                      ? "bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white"
                      : "bg-[#0f1117] border border-[#2a2d3a] text-[#4a4d5e] hover:border-[#6366f1] hover:text-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div className={sectionClass}>
            <label className={labelClass}>Question <span className="text-[#6366f1]">*</span></label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={4}
              placeholder="Énoncé de la question..."
              value={form.question}
              onChange={(e) => set("question", e.target.value)}
            />
          </div>

          {/* Options */}
          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass} style={{ marginBottom: 0 }}>
                Options de réponse
              </label>
              <span className="text-xs text-[#4a4d5e]">Cliquez sur la lettre pour marquer correcte</span>
            </div>
            <div className="space-y-2 mt-3">
              {Object.entries(form.options).map(([key, val]) => {
                const isCorrect = form.correct_answers.includes(key);
                return (
                  <div key={key} className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => toggleCorrectAnswer(key)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold flex-shrink-0 transition-all ${
                        isCorrect ? "badge-correct text-white" : "badge-wrong text-[#4a4d5e] hover:text-white"
                      }`}
                    >
                      {key}
                    </button>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder={`Option ${key}...`}
                      value={val}
                      onChange={(e) => handleOptionChange(key, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
            {form.correct_answers.length > 0 && (
              <p className="text-xs text-[#10b981] mt-2">
                ✓ Réponses correctes : {form.correct_answers.join(", ")}
              </p>
            )}
          </div>

          {/* Explanation */}
          <div className={sectionClass}>
            <label className={labelClass}>Explication</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Explication de la réponse correcte..."
              value={form.explanation}
              onChange={(e) => set("explanation", e.target.value)}
            />
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-4">
            <div className={sectionClass}>
              <label className={labelClass}>Niveau</label>
              <select
                className={inputClass}
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
              >
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className={sectionClass}>
              <label className={labelClass}>Statut</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => set("status", e.target.value as StatusType)}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className={sectionClass}>
              <label className={labelClass}>Faculté <span className="text-[#6366f1]">*</span></label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex: Médecine Tunis"
                value={form.faculty}
                onChange={(e) => set("faculty", e.target.value)}
              />
            </div>
            <div className={sectionClass}>
              <label className={labelClass}>Spécialité</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex: Cardiologie"
                value={form.specialty}
                onChange={(e) => set("specialty", e.target.value)}
              />
            </div>
            <div className={sectionClass}>
              <label className={labelClass}>Cours</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex: Physiologie"
                value={form.course}
                onChange={(e) => set("course", e.target.value)}
              />
            </div>
          </div>

          {/* Image URL */}
          <div className={sectionClass}>
            <label className={labelClass}>URL de l'image</label>
            <input
              type="url"
              className={inputClass}
              placeholder="https://..."
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
            />
            {form.image_url && (
              <img
                src={form.image_url}
                alt="preview"
                className="mt-3 rounded-lg max-h-40 object-cover border border-[#2a2d3a]"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )}
          </div>

          {/* Tags */}
          <div className={sectionClass}>
            <label className={labelClass}>Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                className={`${inputClass} flex-1`}
                placeholder="Ajouter un tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-[#1e2030] border border-[#2a2d3a] text-sm text-[#8b8fa8] rounded-lg hover:border-[#6366f1] hover:text-white transition-colors"
              >
                + Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="slide-in flex items-center gap-1.5 bg-[#1e2030] border border-[#2a2d3a] text-[#8b8fa8] text-xs px-3 py-1 rounded-full"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="text-[#4a4d5e] hover:text-[#ef4444] transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setForm(defaultForm)}
              className="px-5 py-3 bg-[#161821] border border-[#2a2d3a] text-[#8b8fa8] text-sm rounded-xl hover:border-[#4a4d5e] hover:text-white transition-all"
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: submitted
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #6366f1, #a855f7)",
              }}
            >
              {submitted ? "✓ Question enregistrée !" : "Enregistrer la question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
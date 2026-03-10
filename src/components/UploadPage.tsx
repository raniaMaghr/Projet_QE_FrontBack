import React, { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, ArrowRight } from "lucide-react";
import { QCMEntry } from "../types/qcm.types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { syncLocalDataToSupabase } from "../supabaseService";
import { supabase } from "../supabaseClient"; // adapte le chemin si nécessaire

interface UploadPageProps {
  onSeriesUploaded: (data: {
    questions: QCMEntry[];
    objective: string;
    faculty: string;
    year: string;
  }) => void;
}

interface ObjectiveOption {
  id: string;
  name: string;
  specialty: string;
  level: string;
  bank_size: number;
}

const FACULTIES = ["FMT", "FMM", "FMS", "FMSF"];

const YEARS = Array.from({ length: 2035 - 2019 + 1 }, (_, i) => String(2019 + i));

function generateUniqueId(prefix: string = "qcm"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export default function UploadPage({ onSeriesUploaded }: UploadPageProps) {
  const navigate = useNavigate();
  const [objective, setObjective] = useState("");
  const [faculty, setFaculty] = useState("");
  const [year, setYear] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Objectifs depuis Supabase
  const [objectives, setObjectives] = useState<ObjectiveOption[]>([]);
  const [loadingObjectives, setLoadingObjectives] = useState(false);
  const [objectivesError, setObjectivesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchObjectives = async () => {
      setLoadingObjectives(true);
      setObjectivesError(null);
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, specialty, level, bank_size")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erreur chargement objectifs:", error);
        setObjectivesError("Impossible de charger les objectifs.");
      } else if (data) {
        setObjectives(data);
      }
      setLoadingObjectives(false);
    };

    fetchObjectives();
  }, []);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const processAndContinue = async () => {
    if (!uploadedFile) {
      setError("Veuillez uploader un fichier.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!objective || !faculty || !year) {
      setError("Veuillez remplir tous les champs.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const fileExtension = uploadedFile.name.split(".").pop()?.toLowerCase();

        let questions: QCMEntry[] = [];

        if (fileExtension === "csv") {
          questions = parseCSV(text);
        } else if (fileExtension === "json") {
          questions = JSON.parse(text);
        } else {
          setError("Format de fichier non supporté. Utilisez CSV ou JSON.");
          setTimeout(() => setError(null), 3000);
          setIsProcessing(false);
          return;
        }

        localStorage.setItem("qcm-questions", JSON.stringify(questions));
        localStorage.setItem("qcm-metadata", JSON.stringify({ objective, faculty, year }));

        toast.success("✅ Série créée avec succès !", {
          description: `${questions.length} question${questions.length > 1 ? "s" : ""} chargée${questions.length > 1 ? "s" : ""}`,
        });

        const seriesId = await syncLocalDataToSupabase(
          { objective, faculty, year },
          questions
        );

        toast.success("Série sauvegardée dans le cloud !");
        navigate(`/series/${seriesId}`);
      } catch (err) {
        console.error("Erreur import fichier:", err);
        setError("Erreur lors de la lecture du fichier.");
        setTimeout(() => setError(null), 3000);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(uploadedFile);
  };

  function parseCSV(text: string): QCMEntry[] {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) throw new Error("Fichier CSV vide ou invalide.");

    const entries: QCMEntry[] = [];
    const clinicalCaseIdMap: { [key: string]: string } = {};

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < 2) continue;

      const question = row[0]?.trim();
      if (!question) continue;

      const propositionsStr = row[1]?.trim() || "";
      const options = propositionsStr
        .split(/[;|]/)
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0);

      if (options.length < 2) continue;

      const csvCaseId = row[2]?.trim() || null;
      let finalClinicalCaseId = null;

      if (csvCaseId) {
        if (!clinicalCaseIdMap[csvCaseId]) {
          clinicalCaseIdMap[csvCaseId] = generateUniqueId("cas");
        }
        finalClinicalCaseId = clinicalCaseIdMap[csvCaseId];
      }

      const entry: QCMEntry = {
        id: generateUniqueId("qcm"),
        question,
        options,
        correctAnswers: [],
        aiJustification: "",
        type: finalClinicalCaseId ? "Cas clinique" : "QCM",
        tags: [],
        subCourse: null,
        clinicalCaseId: finalClinicalCaseId ?? undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      entries.push(entry);
    }

    return entries;
  }

  const isFormValid = uploadedFile && objective && faculty && year && !isProcessing;

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-2 text-indigo-600">QCM Database Builder</h1>
          <p className="text-gray-600">Uploadez votre série et configurez les paramètres</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Upload Section */}
          <div className="mb-8">
            <label className="block mb-3 text-gray-700">📤 Uploader la série de QCM</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-300 hover:border-indigo-400"
              }`}
            >
              {uploadedFile ? (
                <div className="space-y-3">
                  <FileSpreadsheet className="w-16 h-16 mx-auto text-green-600" />
                  <p className="text-green-600 font-medium">{uploadedFile.name}</p>
                  <p className="text-gray-500 text-sm">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="underline"
                    style={{ color: "#6366f1" }}
                  >
                    Changer de fichier
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-16 h-16 mx-auto text-gray-400" />
                  <p className="text-gray-600">Glissez-déposez votre fichier ici</p>
                  <p className="text-gray-500">ou</p>
                  <label className="inline-block">
                    <span
                      className="px-6 py-3 text-white rounded-lg cursor-pointer transition-colors"
                      style={{ background: "#4f46e5" }}
                    >
                      Parcourir les fichiers
                    </span>
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                  <p className="text-gray-500 mt-2">Formats acceptés : CSV, JSON</p>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Objectif depuis Supabase */}
            <div>
              <label className="block mb-2 text-gray-700">🎯 Objectif (Cours)</label>
              {objectivesError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {objectivesError}
                  <button
                    onClick={() => window.location.reload()}
                    className="block mt-1 underline text-red-500"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  disabled={loadingObjectives}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">
                    {loadingObjectives ? "⏳ Chargement..." : "Sélectionner un cours..."}
                  </option>
                  {objectives.map((obj) => (
                    <option key={obj.id} value={obj.name}>
                      {obj.name}
                      {obj.specialty ? ` — ${obj.specialty}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {!loadingObjectives && objectives.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{objectives.length} cours disponibles</p>
              )}
            </div>

            {/* Faculté */}
            <div>
              <label className="block mb-2 text-gray-700">🏛️ Faculté</label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Sélectionner...</option>
                {FACULTIES.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>

            {/* Année */}
            <div>
              <label className="block mb-2 text-gray-700">📅 Année</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Sélectionner...</option>
                {YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={processAndContinue}
            disabled={!isFormValid}
            className="w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg"
            style={{
              background: isFormValid
                ? "linear-gradient(to right, #4f46e5, #9333ea)"
                : "#e5e7eb",
              color: isFormValid ? "white" : "#9ca3af",
              cursor: isFormValid ? "pointer" : "not-allowed",
            }}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Traitement en cours...
              </>
            ) : (
              <>
                Continuer vers les questions
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 mb-2">📋 Format CSV attendu :</p>
            <code className="text-xs bg-white px-2 py-1 rounded block overflow-x-auto mb-2">
              question,propositions,cas_clinique_id
            </code>
            <p className="text-blue-700 text-sm mb-3">
              Exemple : "Question?","Réponse A;Réponse B;Réponse C",""
            </p>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                ✅ Séparateur de propositions : <strong>;</strong> ou <strong>|</strong>
              </p>
              <p>
                ✅ Questions d'un même cas clinique : même <strong>cas_clinique_id</strong>
              </p>
              <p>
                ✅ QCM simple : laissez <strong>cas_clinique_id</strong> vide
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
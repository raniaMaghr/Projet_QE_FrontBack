import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft, Loader2 } from "lucide-react";
import QCMPage from "@/components/qcm/QCMPage";

// ── Types ────────────────────────────────────────────────────────────────────

interface Option {
  letter: string;
  text: string;
}

interface Question {
  id: number;
  casCliniqueId: string;
  numero: number;
  enonce: string;
  options: Option[];
  typeReponse: "unique" | "multiple";
  reponseCorrecte: string[];
  explication: string;
  specialite: string;
  tags: string[];
}

interface CasClinique {
  id: string;
  numero: number;
  contenu: string;
  specialite: string;
  questions: number[];
}

interface RawQuestion {
  id: string;
  series_id: string;
  question: string;
  options: string[];
  correct_answers: string[];
  ai_justification: string;
  type: string;
  tags: string[];
  sub_course: string;
  clinical_case_id: string;
  order_index: number;
  image_url?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseOptions(raw: string[]): Option[] {
  const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
  return raw.map((opt, i) => {
    const match = opt.match(/^([A-H])[\.\s\)\-:]\s*(.+)/i);
    if (match) return { letter: match[1].toUpperCase(), text: match[2].trim() };
    return { letter: LETTERS[i] ?? String(i + 1), text: opt.trim() };
  });
}

function parseCorrectAnswers(raw: string[]): string[] {
  return raw.map((a) => {
    const match = a.match(/^([A-H])[\.\s\)\-:]/i);
    return match ? match[1].toUpperCase() : a.toUpperCase().trim();
  });
}

function parseType(type: string): "unique" | "multiple" {
  const t = (type || "").toLowerCase();
  if (t.includes("multiple") || t.includes("multi")) return "multiple";
  return "unique";
}

function transformQuestions(rows: RawQuestion[]): {
  questions: Question[];
  casCliniques: CasClinique[];
} {
  const sorted = [...rows].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const casMap = new Map<string, CasClinique>();
  const questions: Question[] = [];

  sorted.forEach((row, index) => {
    const options = parseOptions(row.options ?? []);
    const reponseCorrecte = parseCorrectAnswers(row.correct_answers ?? []);

    const question: Question = {
      id: index + 1,
      casCliniqueId: row.clinical_case_id ?? "default",
      numero: row.order_index ?? index + 1,
      enonce: row.question ?? "",
      options,
      typeReponse: parseType(row.type),
      reponseCorrecte,
      explication: row.ai_justification ?? "",
      specialite: row.sub_course ?? "",
      tags: row.tags ?? [],
    };

    questions.push(question);

    const caseId = row.clinical_case_id ?? "default";
    if (!casMap.has(caseId)) {
      casMap.set(caseId, {
        id: caseId,
        numero: casMap.size + 1,
        contenu: caseId,
        specialite: row.sub_course ?? "",
        questions: [],
      });
    }
    casMap.get(caseId)!.questions.push(question.id);
  });

  return { questions, casCliniques: Array.from(casMap.values()) };
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function QCMSeriesPage() {
  const navigate = useNavigate();
  const { seriesId } = useParams<{ seriesId: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [casCliniques, setCasCliniques] = useState<CasClinique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seriesId) return;

    const fetchQuestions = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("qcm_questions")
        .select("*")
        .eq("series_id", seriesId)
        .order("order_index", { ascending: true });

      setIsLoading(false);

      if (error) {
        console.error(error);
        setError("Impossible de charger les questions. Veuillez réessayer.");
        return;
      }

      if (!data || data.length === 0) {
        setError("Cette série ne contient aucune question.");
        return;
      }

      const { questions: q, casCliniques: c } = transformQuestions(data as RawQuestion[]);
      setQuestions(q);
      setCasCliniques(c);
    };

    fetchQuestions();
  }, [seriesId]);

  const goBack = () => navigate(-1);

  // ── Chargement ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={goBack} className="hidden md:flex">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">🔄 Chargement de la série…</h1>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-16 flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-sm">Chargement des questions en cours…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Erreur ──
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={goBack} className="hidden md:flex">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">❌ Erreur</h1>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-8 flex items-center gap-4">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">{error}</p>
              <Button variant="link" className="p-0 h-auto text-red-600 mt-1" onClick={goBack}>
                Retour aux séries
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Aller directement au QCM sans écran de lancement ──
  return (
    <QCMPage
      mode="serie"
      onExit={goBack}
      externalQuestions={questions}
      externalCasCliniques={casCliniques}
    />
  );
}
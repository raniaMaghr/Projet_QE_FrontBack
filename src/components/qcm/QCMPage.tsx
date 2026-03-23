import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock, Flag, CheckCircle, XCircle, ChevronLeft,
  ChevronRight, Menu, X, BookOpen, Activity, Target, Eye, Highlighter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from "../ui/dialog";
import { Separator } from "../ui/separator";
import { supabase } from "@/lib/supabase";
import { useParams, useNavigate } from "react-router-dom";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface Option {
  letter: string;
  text: string;
}

export interface Question {
  id: string;
  casCliniqueId: string;
  numero: number;
  enonce: string;
  options: Option[];
  typeReponse: "unique" | "multiple";
  reponseCorrecte: string[];
  explication: string;
  specialite: string;
  tags: string[];
  imageUrl?: string;
}

export interface CasClinique {
  id: string;
  numero: number;
  contenu: string;
  specialite: string;
  questions: string[];
}

interface UserAnswer {
  questionId: string;
  selected: string[];
  isMarked: boolean;
  isValidated: boolean;
  isCorrect?: boolean;
}

interface Highlight {
  id: string;
  text: string;
  containerType: "cas" | "question" | "option";
  containerId: string;
}

// ─── DB row → Question ───────────────────────────────────────────────────────
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function mapRow(row: any): Question {
  const rawOptions: string[] = (row.options as string[]) ?? [];
  const optionsList: Option[] = rawOptions.map((text: string, i: number) => ({
    letter: LETTERS[i] ?? String(i + 1),
    text,
  }));

  const rawCorrect: string[] = (row.correct_answers as string[]) ?? [];
  const reponseCorrecte: string[] = rawCorrect.map((val: string) => {
    const trimmed = val.trim().toUpperCase();
    if (LETTERS.includes(trimmed)) return trimmed;
    const idx = rawOptions.findIndex((opt) => opt === val);
    return idx !== -1 ? (LETTERS[idx] ?? String(idx + 1)) : val;
  });

  return {
    id: row.id,
    casCliniqueId: row.clinical_case_id ?? "",
    numero: row.order_index ?? 0,
    enonce: row.question ?? "",
    options: optionsList,
    reponseCorrecte,
    typeReponse: row.type === "multiple" ? "multiple" : "unique",
    explication: row.ai_justification ?? "",
    specialite: row.sub_course ?? "",
    tags: (row.tags as string[]) ?? [],
    imageUrl: row.image_url ?? undefined,
  };
}

function mapCasRow(row: any): CasClinique {
  return {
    id: row.id,
    numero: row.order_index ?? 0,
    contenu: row.content ?? "",
    specialite: row.specialite ?? row.sub_course ?? "",
    questions: (row.question_ids as string[]) ?? [],
  };
}

// ─── Highlight biological values ─────────────────────────────────────────────
function highlightBiologicalValues(text: string): React.ReactNode {
  const regex = /(\d[\d\s,.]*\s*(?:g\/dl|g\/L|mm³|µmol\/L|mmol\/L|\/mm³|%|000\/mm³))/gi;
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface QCMPageProps {
  seriesId?: string;
  mode?: "entrainement" | "examen" | "serie";
  onExit?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function QCMPage({
  seriesId: seriesIdProp,
  mode = "entrainement",
  onExit,
}: QCMPageProps) {
  const { seriesId: seriesIdParam } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const seriesId = seriesIdProp ?? seriesIdParam ?? "";
  const handleExit = onExit ?? (() => navigate(-1));

  // ── Data state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [casCliniquesMap, setCasCliniquesMap] = useState<Map<string, CasClinique>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<string, UserAnswer>>(new Map());
  const [showNavigation, setShowNavigation] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [timer, setTimer] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightMode, setHighlightMode] = useState(false);
const [saving, setSaving] = useState(false);
  // ── Fetch questions + cas cliniques from Supabase
  useEffect(() => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);

    supabase
      .from("qcm_questions")
      .select("*")
      .eq("series_id", seriesId)
      .order("order_index", { ascending: true })
      .then(async ({ data: qData, error: qErr }) => {
        if (qErr) {
          setError(qErr.message);
          setLoading(false);
          return;
        }

        const mappedQuestions = (qData ?? []).map(mapRow);
        setQuestions(mappedQuestions);

        // Fetch associated clinical cases
        const caseIds = [...new Set(mappedQuestions.map((q) => q.casCliniqueId).filter(Boolean))];
        if (caseIds.length > 0) {
          const { data: casData } = await supabase
            .from("clinical_cases")
            .select("*")
            .in("id", caseIds);

          const map = new Map<string, CasClinique>(
            (casData ?? []).map((row: any) => [row.id, mapCasRow(row)])
          );
          setCasCliniquesMap(map);
        }

        setLoading(false);
      });
  }, [seriesId]);
  
  // ── Derived
  const currentQuestion = questions[currentIndex];
  const currentCas = currentQuestion ? casCliniquesMap.get(currentQuestion.casCliniqueId) : undefined;
  const currentAnswer = currentQuestion ? userAnswers.get(currentQuestion.id) : undefined;
  const progressPercent = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const correctCount = Array.from(userAnswers.values()).filter((a) => a.isCorrect).length;
    // ── Timer
  const [isFinished, setIsFinished] = useState(false);
  const [questionTimers, setQuestionTimers] = useState<Map<string, number>>(new Map());
  const currentQuestionTime = currentQuestion ? questionTimers.get(currentQuestion.id) ?? 0 : 0;

  useEffect(() => {
    if (loading || isFinished) return;

    const interval = setInterval(() => {
      setTimer((t) => t + 1);

      if (currentQuestion) {
        setQuestionTimers((prev) => {
          const newMap = new Map(prev);
          const prevTime = newMap.get(currentQuestion.id) ?? 0;
          newMap.set(currentQuestion.id, prevTime + 1);
          return newMap;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, isFinished, currentQuestion]);

    async function saveTimer() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not logged in or auth error:", userError);
        return;
      }

      // Prepare per-question time array
      const perQuestionTime = Array.from(questionTimers.entries()).map(
        ([questionId, time]) => ({
          question_id: questionId,
          time_spent: time,
        }),
      );

      const sessionData = {
        user_id: user.id,
        series_id: seriesId,
        total_time: timer,
        score: correctCount,
        questions_time: perQuestionTime,
      };

      console.log("DATA TO INSERT", sessionData);

      const { data, error } = await supabase
        .from("qcm_timer")
        .insert(sessionData)
        .select();

      if (error) {
        console.error("SESSION ERROR", error);
      } else {
        console.log("SESSION INSERTED", data);
      }
    } catch (err) {
      console.error("Unexpected error saving session:", err);
    }
  }


  async function saveResultTestQCM() {
    console.log("SAVE RESULTS TRIGGERED");
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not logged in");
        return;
      }

      const incorrectCount = Array.from(userAnswers.values()).filter(
        (a) => a.isValidated && !a.isCorrect,
      ).length;

      const answeredCount = Array.from(userAnswers.values()).filter(
        (a) => a.isValidated,
      ).length;

      const notAnsweredCount = questions.length - answeredCount;

      //  answers détaillées
      const answers = questions.map((q) => {
        const userAns = userAnswers.get(q.id);

        return {
          question_id: q.id,
          selected: userAns?.selected ?? [],
          is_correct: userAns?.isCorrect ?? false,
          is_validated: userAns?.isValidated ?? false,
        };
      });

      const resultData = {
        user_id: user.id,
        series_id: seriesId,

        correct_answers: correctCount,
        incorrect_answers: incorrectCount,
        not_answered: notAnsweredCount,

        total_questions: questions.length,
        score: correctCount,

        total_time: timer,

        answers: answers,
      };

      const { error } = await supabase.from("qcm_results").insert(resultData);

      if (error) {
        console.error("RESULT ERROR", error);
      } else {
        console.log("RESULT SAVED");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Answer handlers
  const handleSelectOption = (letter: string) => {
    if (!currentQuestion || currentAnswer?.isValidated) return;
    const prev = userAnswers.get(currentQuestion.id) ?? {
      questionId: currentQuestion.id,
      selected: [],
      isMarked: false,
      isValidated: false,
    };
    const newSelected =
      currentQuestion.typeReponse === "unique"
        ? [letter]
        : prev.selected.includes(letter)
        ? prev.selected.filter((l) => l !== letter)
        : [...prev.selected, letter];

    setUserAnswers(new Map(userAnswers.set(currentQuestion.id, { ...prev, selected: newSelected })));
  };

  const handleValidate = () => {
    if (!currentQuestion) return;
    const answer = userAnswers.get(currentQuestion.id);
    if (!answer || answer.selected.length === 0) return;

    const correct = currentQuestion.reponseCorrecte;
    const isCorrect =
      answer.selected.length === correct.length &&
      answer.selected.every((s) => correct.includes(s));

    setUserAnswers(
      new Map(userAnswers.set(currentQuestion.id, { ...answer, isValidated: true, isCorrect }))
    );
  };

  const handleToggleMark = () => {
    if (!currentQuestion) return;
    const prev = userAnswers.get(currentQuestion.id) ?? {
      questionId: currentQuestion.id,
      selected: [],
      isMarked: false,
      isValidated: false,
    };
    setUserAnswers(new Map(userAnswers.set(currentQuestion.id, { ...prev, isMarked: !prev.isMarked })));
  };

  // ── Highlight handlers
  const handleTextSelection = () => {
    if (!highlightMode || !currentQuestion) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    const container = selection.getRangeAt(0).commonAncestorContainer.parentElement;
    setHighlights((h) => [
      ...h,
      {
        id: `hl-${Date.now()}`,
        text: selectedText,
        containerType: (container?.dataset.highlightType as any) ?? "cas",
        containerId: container?.dataset.highlightId ?? (currentCas?.id ?? currentQuestion.id),
      },
    ]);
    selection.removeAllRanges();
  };

  const removeHighlight = (id: string) => setHighlights((h) => h.filter((x) => x.id !== id));

  const renderWithHighlights = (text: string, type: string, cid: string) => {
    const hl = highlights.filter((h) => h.containerType === type && h.containerId === cid);
    if (!hl.length) return <>{text}</>;
    const parts: { text: string; isHighlighted: boolean; id?: string }[] = [];
    let last = 0;
    hl.forEach((h) => {
      const idx = text.indexOf(h.text, last);
      if (idx !== -1) {
        if (idx > last) parts.push({ text: text.slice(last, idx), isHighlighted: false });
        parts.push({ text: h.text, isHighlighted: true, id: h.id });
        last = idx + h.text.length;
      }
    });
    if (last < text.length) parts.push({ text: text.slice(last), isHighlighted: false });
    return (
      <>
        {parts.map((p, i) =>
          p.isHighlighted ? (
            <mark
              key={i}
              className="bg-yellow-200 dark:bg-yellow-700 cursor-pointer rounded px-0.5"
              onClick={() => p.id && removeHighlight(p.id)}
              title="Cliquer pour supprimer"
            >
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </>
    );
  };

  // ── Question status helpers
  const getStatus = (id: string) => {
    const a = userAnswers.get(id);
    if (!a) return "unanswered";
    if (a.isMarked) return "marked";
    if (a.isValidated && a.isCorrect) return "correct";
    if (a.isValidated && !a.isCorrect) return "incorrect";
    if (a.selected.length > 0) return "answered";
    return "unanswered";
  };

  const statusClass = (s: string) => {
    switch (s) {
      case "correct":   return "bg-success text-white border-success";
      case "incorrect": return "bg-destructive text-white border-destructive";
      case "answered":  return "bg-primary text-white border-primary";
      case "marked":    return "bg-accent text-white border-accent";
      default:          return "bg-muted text-muted-foreground";
    }
  };

  // ─── Loading / Error / Empty states ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Activity className="text-primary animate-pulse" size={40} />
        <p className="text-muted-foreground text-lg">Chargement des questions…</p>
        <Progress value={undefined} className="w-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <XCircle className="text-destructive" size={40} />
        <p className="text-destructive font-semibold text-lg">Erreur de chargement</p>
        <p className="text-muted-foreground text-sm max-w-md">{error}</p>
        <Button onClick={handleExit}>Retour</Button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Aucune question trouvée pour cette série.</p>
        <Button onClick={handleExit}>Retour</Button>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background qcm-professional">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExit}
                title="Retour"
              >
                <ChevronLeft size={20} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNavigation(!showNavigation)}
              >
                {showNavigation ? <X size={20} /> : <Menu size={20} />}
              </Button>
              <div className="flex items-center gap-2">
                <Activity className="text-primary" size={24} />
                <div>
                  <h1 className="text-sm">QCM — Mode {mode}</h1>
                  <p className="text-xs text-muted-foreground">
                    Question {currentIndex + 1} / {questions.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-muted-foreground" />
                <span>{formatTime(timer)}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsFinished(true);
                setShowResults(true);
              }}
            >
              Terminer
            </Button>
          </div>

          {/* Mobile Progress */}
          <div className="md:hidden mt-3">
            <Progress value={progressPercent} className="w-full" />
          </div>
        </div>
      </header>

      {/* ── Highlight toolbar ── */}
      <div className="sticky top-[73px] z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant={highlightMode ? "default" : "outline"}
              size="sm"
              onClick={() => setHighlightMode(!highlightMode)}
              className="gap-2"
            >
              <Highlighter size={16} />
              {highlightMode
                ? "Mode surlignage activé"
                : "Activer le surlignage"}
            </Button>
            {highlights.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHighlights([])}
                className="text-muted-foreground"
              >
                Effacer tout ({highlights.length})
              </Button>
            )}
            {highlightMode && (
              <span className="text-xs text-muted-foreground ml-2">
                Sélectionnez du texte pour le surligner · Cliquez sur un
                surlignage pour le retirer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left column ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Cas Clinique card */}
            {currentCas && currentCas.contenu && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 border-primary/20">
                  <CardHeader className="bg-primary/5">
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="text-primary" size={20} />
                        Cas clinique N°{currentCas.numero}
                      </CardTitle>
                      <Badge variant="outline" className="bg-primary/10">
                        {currentCas.specialite}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert qcm-content"
                      onMouseUp={handleTextSelection}
                      data-highlight-type="cas"
                      data-highlight-id={currentCas.id}
                    >
                      {currentCas.contenu.split("\n").map((line, index) => (
                        <p
                          key={index}
                          className="whitespace-pre-wrap leading-relaxed"
                        >
                          {highlightBiologicalValues(line)}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Question card */}
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-accent/20">
                <CardHeader className="bg-accent/5">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="text-accent" size={20} />
                      Question {currentQuestion.numero}
                      {currentQuestion.typeReponse === "multiple" && (
                        <Badge variant="secondary" className="ml-2">
                          Réponses multiples
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      {/* Timer question */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Target size={16} className="text-muted-foreground" />
                        <span>{formatTime(currentQuestionTime)}</span>
                      </div>
                      <Button
                        variant={
                          currentAnswer?.isMarked ? "default" : "outline"
                        }
                        size="sm"
                        onClick={handleToggleMark}
                      >
                        <Flag size={16} className="mr-1" />
                        {currentAnswer?.isMarked ? "Marquée" : "Marquer"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  {/* Énoncé */}
                  <div
                    className="text-lg qcm-content"
                    onMouseUp={handleTextSelection}
                    data-highlight-type="question"
                    data-highlight-id={currentQuestion.id}
                  >
                    {renderWithHighlights(
                      currentQuestion.enonce,
                      "question",
                      currentQuestion.id,
                    )}
                  </div>

                  {/* Image (si présente) */}
                  {currentQuestion.imageUrl && (
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Illustration de la question"
                      className="rounded-lg max-h-64 object-contain border"
                    />
                  )}

                  {/* Options */}
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isSelected =
                        currentAnswer?.selected.includes(option.letter) ??
                        false;
                      const isValidated = currentAnswer?.isValidated ?? false;
                      const isCorrect =
                        currentQuestion.reponseCorrecte.includes(option.letter);
                      const showFeedback =
                        isValidated &&
                        (mode === "entrainement" || mode === "serie");

                      return (
                        <motion.div
                          key={option.letter}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div
                            onClick={() => handleSelectOption(option.letter)}
                            className={[
                              "relative p-4 rounded-lg border-2 transition-all",
                              isValidated
                                ? "cursor-not-allowed"
                                : "cursor-pointer",
                              isSelected && !showFeedback
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50",
                              showFeedback && isCorrect
                                ? "border-success bg-success/5"
                                : "",
                              showFeedback && !isCorrect && isSelected
                                ? "border-destructive bg-destructive/5"
                                : "",
                            ].join(" ")}
                          >
                            <div className="flex items-start gap-3">
                              {/* Letter badge */}
                              <div
                                className={[
                                  "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm",
                                  isSelected && !showFeedback
                                    ? "border-primary bg-primary text-white"
                                    : "border-muted-foreground text-muted-foreground",
                                  showFeedback && isCorrect
                                    ? "border-success bg-success text-white"
                                    : "",
                                  showFeedback && !isCorrect && isSelected
                                    ? "border-destructive bg-destructive text-white"
                                    : "",
                                ].join(" ")}
                              >
                                {option.letter}
                              </div>

                              {/* Option text */}
                              <span
                                className="flex-1 qcm-content leading-relaxed"
                                onMouseUp={handleTextSelection}
                                data-highlight-type="option"
                                data-highlight-id={`${currentQuestion.id}-${option.letter}`}
                              >
                                {renderWithHighlights(
                                  option.text,
                                  "option",
                                  `${currentQuestion.id}-${option.letter}`,
                                )}
                              </span>

                              {/* Feedback icons */}
                              {showFeedback && isCorrect && (
                                <CheckCircle
                                  className="text-success flex-shrink-0"
                                  size={20}
                                />
                              )}
                              {showFeedback && !isCorrect && isSelected && (
                                <XCircle
                                  className="text-destructive flex-shrink-0"
                                  size={20}
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Explication (après validation) */}
                  <AnimatePresence>
                    {currentAnswer?.isValidated && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Separator className="my-4" />
                        <div
                          className={`p-4 rounded-lg ${
                            currentAnswer.isCorrect
                              ? "bg-success/10 border border-success/20"
                              : "bg-destructive/10 border border-destructive/20"
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {currentAnswer.isCorrect ? (
                              <CheckCircle
                                className="text-success flex-shrink-0"
                                size={20}
                              />
                            ) : (
                              <XCircle
                                className="text-destructive flex-shrink-0"
                                size={20}
                              />
                            )}
                            <h4 className="font-semibold">
                              {currentAnswer.isCorrect
                                ? "Bonne réponse !"
                                : "Réponse incorrecte"}
                            </h4>
                          </div>

                          {/* Correct answer(s) hint */}
                          {!currentAnswer.isCorrect && (
                            <p className="text-sm text-muted-foreground mb-3 ml-7">
                              Réponse
                              {currentQuestion.reponseCorrecte.length > 1
                                ? "s"
                                : ""}{" "}
                              correcte
                              {currentQuestion.reponseCorrecte.length > 1
                                ? "s"
                                : ""}{" "}
                              :{" "}
                              <strong>
                                {currentQuestion.reponseCorrecte.join(", ")}
                              </strong>
                            </p>
                          )}

                          {/* AI justification */}
                          {currentQuestion.explication && (
                            <div
                              className="prose prose-sm max-w-none dark:prose-invert ml-7 qcm-content"
                              onMouseUp={handleTextSelection}
                              data-highlight-type="question"
                              data-highlight-id={`${currentQuestion.id}-explication`}
                            >
                              {currentQuestion.explication
                                .split("\n")
                                .map((line, i) => {
                                  const isBold =
                                    line.startsWith("**") &&
                                    line.endsWith("**");
                                  return isBold ? (
                                    <p key={i} className="font-semibold mt-2">
                                      {line.replace(/\*\*/g, "")}
                                    </p>
                                  ) : (
                                    <p key={i}>{line}</p>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    {!currentAnswer?.isValidated && (
                      <Button
                        onClick={handleValidate}
                        disabled={
                          !currentAnswer || currentAnswer.selected.length === 0
                        }
                        className="flex-1"
                      >
                        Valider ma réponse
                      </Button>
                    )}
                    <div className="flex gap-3 ml-auto">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentIndex((i) => Math.max(0, i - 1))
                        }
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentIndex((i) =>
                            Math.min(questions.length - 1, i + 1),
                          )
                        }
                        disabled={currentIndex === questions.length - 1}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── Right column — navigation ── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24">
              {/* Navigation rapide */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye size={18} />
                    Navigation rapide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, i) => {
                      const status = getStatus(q.id);
                      return (
                        <Button
                          key={q.id}
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentIndex(i)}
                          className={[
                            statusClass(status),
                            i === currentIndex ? "ring-2 ring-primary" : "",
                          ].join(" ")}
                        >
                          {q.numero}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 space-y-2 text-xs">
                    {[
                      { color: "bg-muted", label: "Non répondu" },
                      { color: "bg-primary", label: "Répondu" },
                      { color: "bg-success", label: "Correct" },
                      { color: "bg-destructive", label: "Incorrect" },
                      { color: "bg-accent", label: "Marquée" },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color}`} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {currentQuestion.tags.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {currentQuestion.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Score live */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle size={16} className="text-success" />
                    Score en cours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold text-center">
                    {correctCount}
                    <span className="text-muted-foreground text-base font-normal">
                      {" "}
                      / {questions.length}
                    </span>
                  </div>
                  <Progress
                    value={
                      questions.length
                        ? (correctCount / questions.length) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    {
                      Array.from(userAnswers.values()).filter(
                        (a) => a.isValidated,
                      ).length
                    }{" "}
                    validée(s)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ── Results dialog ── */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résultats de la session</DialogTitle>
            <DialogDescription>
              Série : <code className="text-xs">{seriesId}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center">
              <div className="text-5xl font-bold mb-1">
                {correctCount}
                <span className="text-muted-foreground text-2xl font-normal">
                  {" "}
                  / {questions.length}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                Questions correctes
              </p>
            </div>
            <Progress
              value={
                questions.length ? (correctCount / questions.length) * 100 : 0
              }
              className="h-3"
            />
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg bg-success/10 p-3">
                <p className="text-xl font-bold text-success">{correctCount}</p>
                <p className="text-xs text-muted-foreground">Correctes</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-xl font-bold text-destructive">
                  {
                    Array.from(userAnswers.values()).filter(
                      (a) => a.isValidated && !a.isCorrect,
                    ).length
                  }
                </p>
                <p className="text-xs text-muted-foreground">Incorrectes</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xl font-bold">
                  {questions.length -
                    Array.from(userAnswers.values()).filter(
                      (a) => a.isValidated,
                    ).length}
                </p>
                <p className="text-xs text-muted-foreground">Non répondues</p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Temps total : {formatTime(timer)}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResults(false);
                setIsFinished(false);
              }}
            >
              Continuer
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);

                await Promise.all([saveTimer(), saveResultTestQCM()]);

                handleExit();
              }}
            >
              {saving ? "Saving..." : "Terminer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
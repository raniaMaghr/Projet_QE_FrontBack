import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ChevronLeft,
  BookOpen,
  Building2,
  Calendar,
  PlayCircle,
  AlertCircle,
  Loader2,
  ListChecks,
} from "lucide-react";

interface Series {
  id: string;
  title?: string;
  faculty: string;
  year: string;
  objective: string;
  question_count?: number;
}

export function SeriesListPage() {
  const navigate = useNavigate();
  const { speciality, course, year } = useParams<{
    speciality: string;
    course: string;
    year: string;
  }>();

  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Regroupement par faculté
  const seriesByFaculty = series.reduce((acc, s) => {
    const fac = s.faculty || "Autre";
    if (!acc[fac]) acc[fac] = [];
    acc[fac].push(s);
    return acc;
  }, {} as Record<string, Series[]>);

  useEffect(() => {
    if (!course || !year) return;
    const fetchSeries = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("qcm_series")
        .select("*")
        .eq("objective", decodeURIComponent(course))
        .eq("year", decodeURIComponent(year))
        .order("faculty", { ascending: true });
      setIsLoading(false);
      if (error) {
        console.error(error);
        setError("Impossible de charger les séries. Veuillez réessayer.");
        return;
      }
      setSeries(data || []);
    };
    fetchSeries();
  }, [course, year]);

  const goBack = () => navigate(-1);
  const startSeries = (seriesId: string) => navigate(`/qcm/series/${seriesId}`);
  const cleanName = (name: string) =>
    decodeURIComponent(name || "").replace(/Item\s*\d+\s*:\s*/i, "");

  return (
    <div className="space-y-6">

      {/* ── Header (même style que SeriesPage) ── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={goBack} className="hidden md:flex">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">
              📋 {cleanName(course || "")}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {decodeURIComponent(year || "")}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {decodeURIComponent(speciality || "")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            Sélectionnez une série pour commencer le QCM
          </p>
        </CardContent>
      </Card>

      {/* ── Chargement ── */}
      {isLoading && (
        <Card>
          <CardContent className="p-16 flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm">Chargement des séries disponibles...</p>
          </CardContent>
        </Card>
      )}

      {/* ── Erreur ── */}
      {!isLoading && error && (
        <Card className="border-red-200">
          <CardContent className="p-8 flex items-center gap-4">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">{error}</p>
              <Button variant="link" className="p-0 h-auto text-red-600 mt-1"
                onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Aucune série ── */}
      {!isLoading && !error && series.length === 0 && (
        <Card>
          <CardContent className="p-14 flex flex-col items-center gap-4 text-center">
            <div className="text-5xl">📭</div>
            <div>
              <p className="font-semibold text-lg">Aucune série disponible</p>
              <p className="text-sm text-muted-foreground mt-1">
                Il n'y a pas encore de séries pour ce cours en {decodeURIComponent(year || "")}.
              </p>
            </div>
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Séries groupées par faculté ── */}
      {!isLoading && !error && series.length > 0 && (
        <>
          <div className="px-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{series.length}</span>{" "}
              série{series.length > 1 ? "s" : ""} disponible{series.length > 1 ? "s" : ""}
            </p>
          </div>

          {Object.entries(seriesByFaculty).map(([faculty, facultySeries]) => (
            <div key={faculty} className="space-y-3">

              {/* En-tête faculté */}
              <div className="flex items-center gap-2 px-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-base">{faculty}</h2>
                <Badge variant="secondary" className="text-xs">
                  {facultySeries.length} série{facultySeries.length > 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Cartes séries */}
              <div className="grid gap-4">
                {facultySeries.map((s) => (
                  <Card
                    key={s.id}
                    className="hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => startSeries(s.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                            {faculty.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">
                              {s.title || `Série — ${faculty}`}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {faculty}
                              </span>
                              {s.question_count && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ListChecks className="h-3 w-3" />
                                  {s.question_count} questions
                                </span>
                              )}
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                {decodeURIComponent(year || "")}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="gap-2 ml-4 flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); startSeries(s.id); }}
                        >
                          <PlayCircle className="h-4 w-4" />
                          Commencer
                        </Button>

                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

            </div>
          ))}
        </>
      )}

    </div>
  );
}
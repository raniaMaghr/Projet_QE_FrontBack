import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ChevronLeft, Heart, Brain, Stethoscope, Check, AlertCircle, ChevronRight } from "lucide-react";

export function SeriesPage() {

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("j1");
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<{
    speciality: string;
    course: string;
  } | null>(null);

  const [years, setYears] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");

  const [isLoadingYears, setIsLoadingYears] = useState(false);

  const goBack = () => navigate("/dashboard");

  const toggleCourses = (key: string) => {
    if (openCourse === key) {
      setOpenCourse(null);
    } else {
      if (selectedCourse?.speciality !== key) {
        setSelectedCourse(null);
        setYears([]);
        setFaculties([]);
        setSelectedYear("");
        setSelectedFaculty("");
      }
      setOpenCourse(key);
    }
  };

  const goToCourse = async (speciality: string, course: string) => {
    setSelectedCourse({ speciality, course });
    setIsLoadingYears(true);

    const { data, error } = await supabase
      .from("qcm_series")
      .select("year")
      .eq("objective", course);

    setIsLoadingYears(false);

    if (error) {
      console.error(error);
      setYears([]);
      return;
    }

    const uniqueYears = [...new Set(data.map((s: any) => s.year))].sort((a, b) => b.localeCompare(a));
    setYears(uniqueYears);

    setFaculties([]);
    setSelectedYear("");
    setSelectedFaculty("");
  };

  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    setSelectedFaculty("");

    if (!selectedCourse) return;

    const { data, error } = await supabase
      .from("qcm_series")
      .select("faculty")
      .eq("objective", selectedCourse.course)
      .eq("year", year);

    if (error) {
      console.error(error);
      setFaculties([]);
      return;
    }

    const uniqueFaculties = [...new Set(data.map((s: any) => s.faculty))].sort((a, b) => a.localeCompare(b));
    setFaculties(uniqueFaculties);
  };

  const goNext = () => {
    if (!selectedCourse || !selectedYear || !selectedFaculty) return;

    navigate(
      `/series/${encodeURIComponent(selectedCourse.speciality)}/${encodeURIComponent(selectedCourse.course)}/${encodeURIComponent(selectedYear)}`
    );
  };

  const resetSelection = () => {
    setSelectedCourse(null);
    setYears([]);
    setFaculties([]);
    setSelectedYear("");
    setSelectedFaculty("");
  };

  // ---------------- J1 ----------------

  const j1Courses = [
    {
      icon: <Brain className="h-6 w-6 text-blue-500" />,
      title: "Neurologie",
      key: "neurologie",
      courses: [
        "Item 1 : AVC",
        "Item 16 : Céphalées",
        "Item 26 : Épilepsies",
      ],
    },
    {
      icon: <Brain className="h-6 w-6 text-purple-500" />,
      title: "Psychiatrie",
      key: "psychiatrie",
      courses: [
        "États confusionnels",
        "Schizophrénie",
        "Troubles de l'humeur",
        "Troubles anxieux",
      ],
    },
    {
      icon: "👁️",
      title: "Ophtalmologie",
      key: "ophta",
      courses: ["Œil rouge"],
    },
    {
      icon: "👂",
      title: "ORL",
      key: "orl",
      courses: ["IVAS", "Cancer du cavum"],
    },
    {
      icon: <Stethoscope className="h-6 w-6 text-green-500" />,
      title: "Pneumologie – Allergologie",
      key: "pneumo",
      courses: [
        "CBP",
        "Infections respiratoires basses",
        "Tuberculose pulmonaire",
        "Asthme",
        "BPCO",
      ],
    },
    {
      icon: <Heart className="h-6 w-6 text-red-500" />,
      title: "Cardiologie – CCVT",
      key: "cardio",
      courses: [
        "SCA",
        "Douleur thoracique",
        "HTA",
        "Endocardite infectieuse",
        "Ischémie des membres",
        "MVTE",
      ],
    },
    {
      icon: "🍽️",
      title: "Gastro-entérologie",
      key: "gastro",
      courses: [
        "Dysphagies",
        "Ictères",
        "Diarrhées chroniques",
        "Ulcère gastro-duodénal",
        "Hémorragies digestives",
      ],
    },
    {
      icon: "🔪",
      title: "Chirurgie générale",
      key: "chirurgie",
      courses: [
        "Péritonite aiguë",
        "Appendicite aiguë",
        "Cancer colorectal",
        "Occlusion intestinale aiguë",
      ],
    },
    {
      icon: "👩‍⚕️",
      title: "Gynécologie – Obstétrique",
      key: "gyneco",
      courses: [
        "Cancer du col",
        "Cancer du sein",
        "Contraception",
        "Grossesse extra-utérine",
        "Prééclampsie – éclampsie",
        "Métrorragies",
      ],
    },
  ];


  const j2Courses = [
    {
      icon: "🟢",
      title: "Urologie",
      key: "urologie",
      courses: [
        "Tumeurs de la prostate",
        "Lithiase urinaire",
        "Hématuries",
        "Infections urinaires",
      ],
    },
    {
      icon: "🟢",
      title: "Néphrologie",
      key: "nephro",
      courses: [
        "Troubles acido-basiques",
        "Dyskaliémies",
        "Troubles de l'hydratation",
        "Œdèmes",
        "Insuffisance rénale aiguë",
      ],
    },
    {
      icon: "🔥",
      title: "Réanimation",
      key: "reanimation",
      courses: [
        "Intoxication",
        "Polytraumatisme",
        "État de choc hémorragique",
        "État de choc cardiogénique",
        "États septiques graves",
        "Arrêt cardio-circulatoire",
        "Brûlures cutanées",
        "Traumatisme crânien",
        "Comas",
        "Prise en charge d'une douleur aiguë",
      ],
    },
    {
      icon: "🧬",
      title: "Endocrinologie",
      key: "endocrino",
      courses: [
        "Insuffisance surrénalienne aiguë",
        "Hyperthyroïdie",
        "Hypothyroïdie",
        "Dyslipidémies",
        "Diabète sucré",
      ],
    },
    {
      icon: "🧬",
      title: "Médecine Interne",
      key: "interne",
      courses: ["Hypercalcémies", "Purpura"],
    },
    {
      icon: "🦠",
      title: "Infectiologie",
      key: "infectio",
      courses: ["Méningite", "IST", "Hépatites virales"],
    },
    {
      icon: "🩸",
      title: "Hématologie",
      key: "hemato",
      courses: [
        "Splénomégalies",
        "Adénopathies superficielles",
        "Anémie",
        "Transfusion sanguine",
      ],
    },
    {
      icon: "🦴",
      title: "Orthopédie – Rhumatologie",
      key: "ortho",
      courses: [
        "Arthrite septique",
        "Fractures ouvertes de la jambe",
        "Polyarthrite rhumatoïde",
      ],
    },
    {
      icon: "👶",
      title: "Pédiatrie",
      key: "pediatrie",
      courses: [
        "Bronchiolite",
        "Déshydratation aiguë de l'enfant",
        "Vaccinations",
      ],
    },
  ];

  const renderCourses = (courses: any[]) => (
    <div className="grid gap-4">
      {courses.map((course, index) => {
        const isSelectedSpecialty = selectedCourse?.speciality === course.key;

        return (
          <Card
            key={index}
            className={`transition-all ${
              isSelectedSpecialty
                ? "ring-2 ring-blue-500 shadow-lg"
                : "hover:shadow-lg"
            } cursor-pointer`}
          >
            <CardContent className="p-6">

              {/* Header de la spécialité */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{course.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                    <Badge variant="secondary">{course.courses.length} cours</Badge>
                  </div>
                </div>
                <Button
                  variant={openCourse === course.key ? "default" : "outline"}
                  onClick={() => toggleCourses(course.key)}
                >
                  {openCourse === course.key ? "FERMER" : "EXPLORER"}
                </Button>
              </div>

              {/* ── ÉTAPE 1 : Liste des cours ── */}
              {openCourse === course.key && (
                <div className="mt-5">
                  <p className="text-sm text-muted-foreground mb-3 font-medium">
                    Choisissez un cours :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {course.courses.map((c: string, i: number) => {
                      const cleanName = c.replace(/Item\s*\d+\s*:\s*/i, "");
                      const isSelected = selectedCourse?.course === c;
                      return (
                        <Button
                          key={i}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="rounded-full"
                          onClick={() => goToCourse(course.key, c)}
                        >
                          {cleanName}
                          {isSelected && <Check className="ml-2 h-4 w-4" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── ÉTAPE 2 : Année + Faculté ── */}
              {isSelectedSpecialty && selectedCourse && (
                <div className="mt-6 pt-5 border-t space-y-4">

                  {/* Chargement */}
                  {isLoadingYears && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                      <span className="text-sm">Chargement des années disponibles...</span>
                    </div>
                  )}

                  {/* Aucune donnée */}
                  {!isLoadingYears && years.length === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Aucune année disponible</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Ce cours n'a pas de données pour le moment.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Années ── */}
                  {!isLoadingYears && years.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground font-medium">
                        Choisissez une année :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {years.map((year) => (
                          <Button
                            key={year}
                            variant={selectedYear === year ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleYearChange(year)}
                          >
                            {year}
                            {selectedYear === year && <Check className="ml-2 h-4 w-4" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Facultés (affichées après sélection d'une année) ── */}
                  {selectedYear && faculties.length > 0 && (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm text-muted-foreground font-medium">
                        Choisissez une faculté :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {faculties.map((faculty) => (
                          <Button
                            key={faculty}
                            variant={selectedFaculty === faculty ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedFaculty(faculty)}
                          >
                            {faculty}
                            {selectedFaculty === faculty && <Check className="ml-2 h-4 w-4" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Boutons d'action ── */}
                  {years.length > 0 && (
                    <div className="pt-4 border-t flex gap-3">
                      <Button
                        onClick={goNext}
                        disabled={!selectedYear || !selectedFaculty}
                        className="flex-1"
                        size="lg"
                      >
                        Voir les séries disponibles
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button onClick={resetSelection} variant="outline" size="lg">
                        Réinitialiser
                      </Button>
                    </div>
                  )}

                </div>
              )}

            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goBack}
              className="hidden md:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">📚 QCM Par Séries</h1>
          </div>
          <p className="text-muted-foreground">
            Navigation : J1/J2 → Spécialité → Cours → Année → Faculté → Séries
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger value="j1">Jour 1</TabsTrigger>
          <TabsTrigger value="j2">Jour 2</TabsTrigger>
        </TabsList>
        <TabsContent value="j1">{renderCourses(j1Courses)}</TabsContent>
        <TabsContent value="j2">{renderCourses(j2Courses)}</TabsContent>
      </Tabs>

    </div>
  );
}
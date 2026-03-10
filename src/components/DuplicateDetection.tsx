import React, { useState, useEffect } from 'react';
import { QCMEntry } from '../types/qcm.types';
import { detectDuplicates, DuplicatePair } from '../services/duplicateService';
import { AlertCircle, CheckCircle2, Trash2, Layers, ArrowLeft, Search, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from '../supabaseClient';

interface DuplicateDetectionProps {
  questions: QCMEntry[];
  onDeleteQuestion: (idToDelete: string, idToKeep?: string) => void;
  onBack: () => void;
}

interface QCMMetadata {
  year?: string;
  faculty?: string;
}

export default function DuplicateDetection({ questions, onDeleteQuestion, onBack }: DuplicateDetectionProps) {
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [threshold, setThreshold] = useState(0.85);
  const [isScanning, setIsScanning] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, QCMMetadata>>({});
  const location = useLocation();
  const fromExternal = location.state?.fromExternal;
  const navigate = useNavigate();
  
  const scanForDuplicates = () => {
    setIsScanning(true);
    // Simulation d'un scan asynchrone pour l'UX
    setTimeout(() => {
      const detected = detectDuplicates(questions, threshold);
      setDuplicates(detected);
      setIsScanning(false);
    }, 500);
  };

  useEffect(() => {
    scanForDuplicates();
  }, [questions, threshold]);

  // Récupérer les métadonnées (année et faculté) pour chaque QCM
  useEffect(() => {
    const fetchMetadata = async () => {
      const newMetadata: Record<string, QCMMetadata> = { ...metadata };
      let changed = false;

      // Liste unique des questions dans les doublons pour éviter les appels inutiles
      const uniqueQuestions = new Set<QCMEntry>();
      duplicates.forEach(pair => {
        uniqueQuestions.add(pair.question1);
        uniqueQuestions.add(pair.question2);
      });

      for (const qcm of uniqueQuestions) {
        if (newMetadata[qcm.id]) continue;

        try {
          // 1. Récupérer le series_id depuis qcm_questions
          const { data: questionData, error: qError } = await supabase
            .from('qcm_questions')
            .select('series_id')
            .eq('id', qcm.id)
            .single();

          if (qError || !questionData?.series_id) continue;

          // 2. Récupérer year et faculty depuis qcm_series
          const { data: seriesData, error: sError } = await supabase
            .from('qcm_series')
            .select('year, faculty')
            .eq('id', questionData.series_id)
            .single();

          if (seriesData && !sError) {
            newMetadata[qcm.id] = {
              year: seriesData.year,
              faculty: seriesData.faculty
            };
            changed = true;
          }
        } catch (err) {
          console.error(`Erreur métadonnées QCM ${qcm.id}:`, err);
        }
      }

      if (changed) {
        setMetadata(newMetadata);
      }
    };

    if (duplicates.length > 0) {
      fetchMetadata();
    }
  }, [duplicates]);

  /**
   * MODIFIÉ : Supprime question2 et transfère ses tags à question1
   */
  const handleKeepOld = (pair: DuplicatePair) => {
    onDeleteQuestion(pair.question2.id, pair.question1.id);
  };

  /**
   * MODIFIÉ : Supprime question1 et transfère ses tags à question2
   */
  const handleKeepNew = (pair: DuplicatePair) => {
    onDeleteQuestion(pair.question1.id, pair.question2.id);
  };

  const handleKeepBoth = (pair: DuplicatePair) => {
    setDuplicates(prev => prev.filter(p => p !== pair));
  };

  const renderQCMHeader = (qcm: QCMEntry, label: string) => {
    const qMetadata = metadata[qcm.id];
    return (
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{label}</span>
          {qMetadata && (qMetadata.year || qMetadata.faculty) && (
            <div className="flex gap-2 mt-1">
              {qMetadata.year && (
                <Badge variant="outline" className="text-[10px] py-0 bg-blue-50 text-blue-700 border-blue-200">
                  {qMetadata.year}
                </Badge>
              )}
              {qMetadata.faculty && (
                <Badge variant="outline" className="text-[10px] py-0 bg-purple-50 text-purple-700 border-purple-200">
                  {qMetadata.faculty}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Badge variant="secondary" className="text-[10px] py-0">ID: {qcm.id.substring(0, 8)}</Badge>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Détection des doublons</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Seuil de similitude :</span>
              <input 
                type="range" 
                min="0.5" 
                max="1" 
                step="0.05" 
                value={threshold} 
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-32 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
              />
              <Badge variant="secondary" className="ml-2">
                {Math.round(threshold * 100)}%
              </Badge>
            </div>
            <Button 
              onClick={scanForDuplicates} 
              disabled={isScanning}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Scanner
            </Button>
          </div>
          <div className="flex items-center gap-4">
          {!fromExternal && (
          <button
            onClick={() => navigate("/tools/duplicates", { state: { fromExternal: true } })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-md transition-all"
            style={{ background: "#16a34a" }}
          >
            <Copy className="w-4 h-4" />
            Analyser la base de données
          </button> )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mb-6">
          {duplicates.length > 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5" />
              <p>
                <strong>{duplicates.length} doublons potentiels</strong> détectés. Veuillez les examiner ci-dessous.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              <p>Aucun doublon détecté avec le seuil actuel.</p>
            </div>
          )}
        </div>

        {/* Duplicates List */}
        <div className="space-y-8">
          {duplicates.map((pair, index) => (
            <Card key={`${pair.question1.id}-${pair.question2.id}`} className="overflow-hidden border-2 border-indigo-100 shadow-md">
              <CardHeader className="bg-indigo-50 border-b border-indigo-100 py-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">
                    Doublon Potentiel #{index + 1}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200">
                  {Math.round(pair.similarity * 100)}% de similitude
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  {/* Question 1 */}
                  <div className="p-6 bg-white">
                    {renderQCMHeader(pair.question1, "Question A")}
                    <p className="text-gray-800 font-medium mb-4">{pair.question1.question}</p>
                    <div className="space-y-2">
                      {pair.question1.options.map((opt, i) => (
                        <div key={i} className={`text-sm p-2 rounded ${pair.question1.correctAnswers.includes(String.fromCharCode(65 + i)) ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Question 2 */}
                  <div className="p-6 bg-gray-50">
                    {renderQCMHeader(pair.question2, "Question B")}
                    <p className="text-gray-800 font-medium mb-4">{pair.question2.question}</p>
                    <div className="space-y-2">
                      {pair.question2.options.map((opt, i) => (
                        <div key={i} className={`text-sm p-2 rounded ${pair.question2.correctAnswers.includes(String.fromCharCode(65 + i)) ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-gray-100 p-4 flex flex-wrap gap-3 justify-center border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    className="bg-white hover:bg-red-50 hover:text-red-600 border-red-200"
                    onClick={() => handleKeepNew(pair)}
                    title="Supprime A et transfère ses tags (année, faculté) à B"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer A (Garder B)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-white hover:bg-red-50 hover:text-red-600 border-red-200"
                    onClick={() => handleKeepOld(pair)}
                    title="Supprime B et transfère ses tags (année, faculté) à A"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer B (Garder A)
                  </Button>
                  <Button 
                    variant="secondary"
                    className="bg-white hover:bg-green-50 hover:text-green-600 border-green-200"
                    onClick={() => handleKeepBoth(pair)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Garder les deux
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

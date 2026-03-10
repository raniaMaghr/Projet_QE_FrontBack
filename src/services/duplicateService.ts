import { QCMEntry } from '../types/qcm.types';

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, (_, j) => j)
  );
  for (let i = 1; i <= a.length; i++) matrix[i][0] = i;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

const MEDICAL_ABBREVIATIONS: { [key: string]: string } = {
  'hta': 'hypertension arterielle',
  'idm': 'infarctus du myocarde',
  'avc': 'accident vasculaire cerebral',
  'irc': 'insuffisance renale chronique',
  'ins': 'insuffisance',
  'diag': 'diagnostic',
  'ttt': 'traitement',
  'atb': 'antibiotique',
  'pno': 'pneumothorax',
  'ep': 'embolie pulmonaire',
};

function normalizeMedicalText(text: string): string {
  let normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  Object.keys(MEDICAL_ABBREVIATIONS).forEach(abbr => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    normalized = normalized.replace(regex, MEDICAL_ABBREVIATIONS[abbr]);
  });
  return normalized.replace(/\s+/g, ' ');
}

/**
 * Calcule un score de similitude entre 0 et 1.
 */
export function calculateSimilarity(a: string, b: string): number {
  const normalizedA = normalizeMedicalText(a);
  const normalizedB = normalizeMedicalText(b);
  
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  return 1 - distance / maxLength;
}

export interface DuplicatePair {
  question1: QCMEntry;
  question2: QCMEntry;
  similarity: number;
}

/**
 * Détecte les doublons dans une liste de questions.
 */
export function detectDuplicates(questions: QCMEntry[], threshold: number = 0.85): DuplicatePair[] {
  const duplicates: DuplicatePair[] = [];
  
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const similarity = calculateSimilarity(questions[i].question, questions[j].question);
      if (similarity >= threshold) {
        duplicates.push({
          question1: questions[i],
          question2: questions[j],
          similarity
        });
      }
    }
  }
  
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

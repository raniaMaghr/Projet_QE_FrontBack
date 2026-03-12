import { QCMEntry } from '../types/qcm.types'

/**
 * Distance de Levenshtein
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, (_, j) => j)
  )

  for (let i = 1; i <= a.length; i++) matrix[i][0] = i

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[a.length][b.length]
}

const MEDICAL_ABBREVIATIONS: { [key: string]: string } = {
  hta: 'hypertension arterielle',
  idm: 'infarctus du myocarde',
  avc: 'accident vasculaire cerebral',
  irc: 'insuffisance renale chronique',
  ins: 'insuffisance',
  diag: 'diagnostic',
  ttt: 'traitement',
  atb: 'antibiotique',
  pno: 'pneumothorax',
  ep: 'embolie pulmonaire',
}

/**
 * Normalisation du texte médical
 */
function normalizeMedicalText(text: string): string {
  let normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim()

  Object.keys(MEDICAL_ABBREVIATIONS).forEach(abbr => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g')
    normalized = normalized.replace(regex, MEDICAL_ABBREVIATIONS[abbr])
  })

  return normalized.replace(/\s+/g, ' ')
}

/**
 * Similarité texte simple
 */
export function calculateSimilarity(a: string, b: string): number {
  const normalizedA = normalizeMedicalText(a)
  const normalizedB = normalizeMedicalText(b)

  if (normalizedA === normalizedB) return 1
  if (!normalizedA.length || !normalizedB.length) return 0

  const distance = levenshteinDistance(normalizedA, normalizedB)
  const maxLength = Math.max(normalizedA.length, normalizedB.length)

  return 1 - distance / maxLength
}

/**
 * Similarité entre options A,B,C,D,E
 */
function optionsSimilarity(opts1: string[], opts2: string[]): number {
  if (!opts1?.length || !opts2?.length) return 0

  const max = Math.max(opts1.length, opts2.length)
  let total = 0

  for (let i = 0; i < max; i++) {
    const o1 = opts1[i] || ''
    const o2 = opts2[i] || ''

    total += calculateSimilarity(o1, o2)
  }

  return total / max
}

/**
 * Similarité complète d'un QCM
 */
export function calculateQCMSimilarity(q1: QCMEntry, q2: QCMEntry): number {
  const questionSim = calculateSimilarity(q1.question, q2.question)

  const optionsSim = optionsSimilarity(q1.options, q2.options)

  // pondération
  return questionSim * 0.6 + optionsSim * 0.4
}

export interface DuplicatePair {
  question1: QCMEntry
  question2: QCMEntry
  similarity: number
}

/**
 * Détection des doublons
 */
export function detectDuplicates(
  questions: QCMEntry[],
  threshold: number = 0.75
): DuplicatePair[] {
  const duplicates: DuplicatePair[] = []

  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {

      const similarity = calculateQCMSimilarity(
        questions[i],
        questions[j]
      )

      if (similarity >= threshold) {
        duplicates.push({
          question1: questions[i],
          question2: questions[j],
          similarity,
        })
      }
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity)
}
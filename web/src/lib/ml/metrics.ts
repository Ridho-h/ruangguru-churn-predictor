import type { ConfusionMatrix, ModelMetrics } from "../types";

export interface SplitIndices {
  trainIdx: number[];
  testIdx: number[];
}

/**
 * Deterministic stratified 80/20 split — picks every 5th sample per class for test set.
 */
export function stratifiedSplit(y: number[], testEvery = 5): SplitIndices {
  const trainIdx: number[] = [];
  const testIdx: number[] = [];
  let posCounter = 0;
  let negCounter = 0;

  for (let i = 0; i < y.length; i += 1) {
    if (y[i] === 1) {
      if (posCounter % testEvery === testEvery - 1) testIdx.push(i);
      else trainIdx.push(i);
      posCounter += 1;
    } else {
      if (negCounter % testEvery === testEvery - 1) testIdx.push(i);
      else trainIdx.push(i);
      negCounter += 1;
    }
  }

  return { trainIdx, testIdx };
}

export function computeRocAuc(yTrue: number[], yProb: number[]): number {
  const pairs = yTrue.map((label, idx) => ({ label, prob: yProb[idx] ?? 0 }));
  pairs.sort((a, b) => b.prob - a.prob);

  const totalPos = pairs.filter((p) => p.label === 1).length;
  const totalNeg = pairs.length - totalPos;
  if (totalPos === 0 || totalNeg === 0) return 0.5;

  let tp = 0;
  let fp = 0;
  let prevTp = 0;
  let prevFp = 0;
  let auc = 0;

  for (let i = 0; i < pairs.length; i += 1) {
    if (pairs[i].label === 1) tp += 1;
    else fp += 1;

    const isLastOrChanged =
      i === pairs.length - 1 || pairs[i + 1].prob !== pairs[i].prob;
    if (isLastOrChanged) {
      const tprPrev = prevTp / totalPos;
      const tprCurr = tp / totalPos;
      const fprPrev = prevFp / totalNeg;
      const fprCurr = fp / totalNeg;
      auc += ((fprCurr - fprPrev) * (tprPrev + tprCurr)) / 2;
      prevTp = tp;
      prevFp = fp;
    }
  }

  return Math.max(0, Math.min(1, Number(auc.toFixed(4))));
}

export function computeClassificationMetrics(
  yTrue: number[],
  yProb: number[],
  trainSize: number,
  threshold = 0.5,
): ModelMetrics {
  const cm: ConfusionMatrix = { tp: 0, fp: 0, tn: 0, fn: 0 };

  for (let i = 0; i < yTrue.length; i += 1) {
    const actual = yTrue[i];
    const pred = (yProb[i] ?? 0) >= threshold ? 1 : 0;
    if (actual === 1 && pred === 1) cm.tp += 1;
    else if (actual === 0 && pred === 1) cm.fp += 1;
    else if (actual === 0 && pred === 0) cm.tn += 1;
    else cm.fn += 1;
  }

  const total = Math.max(1, yTrue.length);
  const accuracy = (cm.tp + cm.tn) / total;
  const precision = cm.tp + cm.fp > 0 ? cm.tp / (cm.tp + cm.fp) : 0;
  const recall = cm.tp + cm.fn > 0 ? cm.tp / (cm.tp + cm.fn) : 0;
  const f1Score =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const rocAuc = computeRocAuc(yTrue, yProb);
  const positiveRate = yTrue.filter((v) => v === 1).length / total;

  return {
    rocAuc,
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1Score: Number(f1Score.toFixed(4)),
    trainSize,
    testSize: yTrue.length,
    positiveRate: Number(positiveRate.toFixed(4)),
    confusionMatrix: cm,
  };
}

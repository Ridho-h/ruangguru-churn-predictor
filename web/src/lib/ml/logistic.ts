export interface LogisticModel {
  weights: number[];
  bias: number;
}

export interface TrainLogisticOptions {
  l2Lambda?: number;
  iterations?: number;
  learningRate?: number;
}

export function sigmoid(z: number): number {
  const clamped = Math.max(-30, Math.min(30, z));
  return 1 / (1 + Math.exp(-clamped));
}

/**
 * Deterministic L2-regularized Logistic Regression with class-balanced weighting.
 * Zero randomness: weights and bias initialize to 0 and update via full-batch gradient descent.
 */
export function trainLogisticRegression(
  X: number[][],
  y: number[],
  options: TrainLogisticOptions = {},
): LogisticModel {
  const n = X.length;
  const d = X[0]?.length ?? 0;
  if (n === 0 || d === 0) {
    return { weights: new Array(d).fill(0), bias: 0 };
  }

  const l2Lambda = options.l2Lambda ?? 0.5;
  const iterations = options.iterations ?? 350;
  let lr = options.learningRate ?? 0.35;

  const posCount = y.reduce((acc, v) => acc + (v === 1 ? 1 : 0), 0);
  const negCount = n - posCount;
  const posWeight = posCount > 0 ? n / (2 * posCount) : 1;
  const negWeight = negCount > 0 ? n / (2 * negCount) : 1;

  const weights = new Array<number>(d).fill(0);
  let bias = 0;

  const computeLoss = (w: number[], b: number): number => {
    let loss = 0;
    for (let i = 0; i < n; i += 1) {
      let z = b;
      const row = X[i];
      for (let j = 0; j < d; j += 1) z += w[j] * row[j];
      const p = sigmoid(z);
      const sw = y[i] === 1 ? posWeight : negWeight;
      loss += -sw * (y[i] * Math.log(p + 1e-12) + (1 - y[i]) * Math.log(1 - p + 1e-12));
    }
    let reg = 0;
    for (let j = 0; j < d; j += 1) reg += w[j] * w[j];
    return loss / n + (l2Lambda / (2 * n)) * reg;
  };

  let prevLoss = computeLoss(weights, bias);

  for (let iter = 0; iter < iterations; iter += 1) {
    const gradW = new Array<number>(d).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i += 1) {
      const row = X[i];
      let z = bias;
      for (let j = 0; j < d; j += 1) z += weights[j] * row[j];
      const p = sigmoid(z);
      const sw = y[i] === 1 ? posWeight : negWeight;
      const diff = sw * (p - y[i]);
      gradB += diff;
      for (let j = 0; j < d; j += 1) {
        gradW[j] += diff * row[j];
      }
    }

    const nextW = new Array<number>(d);
    for (let j = 0; j < d; j += 1) {
      const g = gradW[j] / n + (l2Lambda / n) * weights[j];
      nextW[j] = weights[j] - lr * g;
    }
    const nextB = bias - lr * (gradB / n);

    const nextLoss = computeLoss(nextW, nextB);
    if (nextLoss <= prevLoss + 1e-9) {
      for (let j = 0; j < d; j += 1) weights[j] = nextW[j];
      bias = nextB;
      if (Math.abs(prevLoss - nextLoss) < 1e-7) break;
      prevLoss = nextLoss;
      lr = Math.min(lr * 1.05, 1.0);
    } else {
      lr *= 0.5;
      if (lr < 1e-5) break;
    }
  }

  return { weights, bias };
}

export function predictProba(X: number[][], model: LogisticModel): number[] {
  return X.map((row) => {
    let z = model.bias;
    for (let j = 0; j < model.weights.length; j += 1) {
      z += model.weights[j] * (row[j] ?? 0);
    }
    return sigmoid(z);
  });
}

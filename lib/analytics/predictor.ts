export interface Prediction {
  predictedScore: number;
  confidence: number;
  factors: string[];
}

export interface RankPrediction {
  keyword: string;
  currentRank: number;
  predictedRank30d: number;
  confidence: number;
}

export class Predictor {
  async predictLLMVisibility(_brandId: string, _days: number): Promise<Prediction> {
    void _brandId;
    void _days;
    return {
      predictedScore: 76,
      confidence: 0.62,
      factors: ["Steady mention growth", "New comparison content planned"],
    };
  }

  async predictKeywordRank(brandId: string, keyword: string, days: number): Promise<RankPrediction> {
    void brandId;
    void days;
    return {
      keyword,
      currentRank: 18,
      predictedRank30d: 12,
      confidence: 0.55,
    };
  }

  async predictTraffic(_brandId: string, _days: number): Promise<{ clicks: number }> {
    void _brandId;
    void _days;
    return { clicks: 6200 };
  }
}

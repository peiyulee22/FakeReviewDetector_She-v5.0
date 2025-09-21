import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Brain, FileText, Globe, ArrowLeft } from "lucide-react";

type Risk = "low" | "medium" | "high";

interface AnalysisData {
  reviewText: string;
  isFake: boolean;
  confidence: number;      // 0..100
  sentimentScore: number;  // 0..10
  keyIndicators: string[];
  aiAnalysis: string;
  riskLevel: Risk;

  // multilingual
  detectedLanguage?: string;
  // Some backends send a boolean flag; others might return the translation string.
  translatedForBedrock?: boolean | string;
  englishText?: string;
}

export default function PageReviewAnalysis() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { analysisData?: AnalysisData; error?: boolean; message?: string };
  };

  const [showEnglish, setShowEnglish] = useState(false);

  // Prefer navigation state; fallback to sessionStorage for refreshes
  const data = useMemo<AnalysisData | null>(() => {
    if (location.state?.analysisData) return location.state.analysisData;
    try {
      const raw = sessionStorage.getItem("analysisData");
      return raw ? (JSON.parse(raw) as AnalysisData) : null;
    } catch {
      return null;
    }
  }, [location.state]);

  // Redirect home if we have neither data nor an explicit error
  useEffect(() => {
    if (!data && !location.state?.error) navigate("/", { replace: true });
  }, [data, location, navigate]);

  if (location.state?.error) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Analysis Error</h2>
          <p className="text-muted-foreground mb-6">
            {location.state.message || "Something went wrong."}
          </p>
          <Button onClick={() => navigate("/")}>Back</Button>
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  // --- helpers ---------------------------------------------------------------
  const getRiskColor = (level: Risk) =>
    level === "low" ? "text-green-500" : level === "medium" ? "text-yellow-500" : "text-red-500";

  const getRiskBadgeVariant = (level: Risk) =>
    level === "low" ? "outline" : level === "medium" ? "secondary" : "destructive";

  // Safely pick the English text (prefer englishText, else translatedForBedrock if it’s a string)
  const englishCandidate: string = useMemo(() => {
    if (typeof data.englishText === "string" && data.englishText.trim()) {
      return data.englishText.trim();
    }
    if (typeof data.translatedForBedrock === "string" && data.translatedForBedrock.trim()) {
      return data.translatedForBedrock.trim();
    }
    return "";
  }, [data.englishText, data.translatedForBedrock]);

  const hasEnglish = Boolean(englishCandidate);

  // --------------------------------------------------------------------------

  return (
    <Layout>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Review Analysis</h1>
            <p className="text-muted-foreground">AI-powered fake review detection results</p>
          </div>
        </div>

        {/* Detection Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Detection Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Fake or Authentic */}
              <div className="text-center p-6 rounded-lg bg-gradient-to-br from-background to-muted/50">
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    data.isFake ? "bg-destructive/10" : "bg-green-100/10"
                  }`}
                >
                  {data.isFake ? (
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  ) : (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {data.isFake ? "Likely Fake" : "Likely Authentic"}
                </h3>
                <Badge variant={data.isFake ? "destructive" : "outline"} className="mb-2">
                  {data.isFake ? "FAKE DETECTED" : "AUTHENTIC"}
                </Badge>
              </div>

              {/* Confidence */}
              <div className="text-center p-6 rounded-lg bg-gradient-to-br from-background to-muted/50">
                <div className="text-4xl font-bold text-primary mb-2">
                  {Math.round(data.confidence)}%
                </div>
                <h3 className="font-semibold text-lg mb-2">Confidence</h3>
                <p className="text-sm text-muted-foreground">AI detection score</p>
              </div>

              {/* Risk Level */}
              <div className="text-center p-6 rounded-lg bg-gradient-to-br from-background to-muted/50">
                <div className={`text-4xl font-bold mb-2 ${getRiskColor(data.riskLevel)}`}>
                  {data.riskLevel.toUpperCase()}
                </div>
                <h3 className="font-semibold text-lg mb-2">Risk Level</h3>
                <Badge variant={getRiskBadgeVariant(data.riskLevel)}>
                  {data.riskLevel} risk
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Info */}
        {(data.detectedLanguage || data.translatedForBedrock) && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Language Info
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm">
                Detected language:{" "}
                <strong>{data.detectedLanguage || "unknown"}</strong>
                {!!data.translatedForBedrock && (
                  <span className="ml-2 text-muted-foreground">
                    (translated to English for analysis)
                  </span>
                )}
              </p>

              {/* Show toggle only if non-English and we actually have an English string */}
              {data.detectedLanguage &&
                data.detectedLanguage.toLowerCase() !== "en" &&
                hasEnglish && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showEnglish}
                      onChange={(e) => setShowEnglish(e.target.checked)}
                      className="accent-primary"
                    />
                    Show English text
                  </label>
                )}
            </CardContent>
          </Card>
        )}

        {/* Analyzed Review */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Analyzed Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
              <p className="text-foreground leading-relaxed italic">
                {showEnglish && hasEnglish ? `"${englishCandidate}"` : `"${data.reviewText}"`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Indicators & AI analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Indicators</CardTitle>
              <p className="text-sm text-muted-foreground">Signals influencing detection</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.keyIndicators.map((indicator, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2" />
                    <p className="text-sm">{indicator}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">Short explanation</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{data.aiAnalysis}</p>
            </CardContent>
          </Card>
        </div>

        {/* Back Button */}
        <div className="flex gap-4 justify-center mt-8">
          <Button onClick={() => navigate("/")} variant="outline" className="px-8">
            Analyze Another Review
          </Button>
        </div>
      </div>
    </Layout>
  );
}

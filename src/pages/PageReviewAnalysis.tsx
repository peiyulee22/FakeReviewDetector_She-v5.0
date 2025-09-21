import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Brain, FileText, ArrowLeft } from "lucide-react";

interface AnalysisData {
  reviewText: string;
  isFake: boolean;
  confidence: number;
  sentimentScore: number;
  keyIndicators: string[];
  aiAnalysis: string;
  riskLevel: "low" | "medium" | "high";
}

const ReviewAnalyze = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // In a real app, this would come from the location state or API
  const data: AnalysisData = location.state?.analysisData || {
    reviewText: "This product is absolutely amazing! Best purchase I've ever made. 5 stars!!!",
    isFake: true,
    confidence: 87,
    sentimentScore: 9.2,
    keyIndicators: [
      "Excessive use of superlatives",
      "Generic positive language",
      "Lack of specific product details",
      "Suspicious posting pattern"
    ],
    aiAnalysis: "The review exhibits several characteristics commonly found in fake reviews. The language is overly enthusiastic without providing specific details about the product's features or usage experience. The excessive use of superlatives and generic praise suggests automated or incentivized content.",
    riskLevel: "high"
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-success";
      case "medium": return "text-warning";
      case "high": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "low": return "outline";
      case "medium": return "secondary";
      case "high": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Review Analysis</h1>
              <p className="text-muted-foreground mt-2">
                AI-powered fake review detection results
              </p>
            </div>
          </div>

          {/* Main Analysis Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Detection Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Fake Detection */}
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-background to-muted/50">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    data.isFake ? 'bg-destructive/10' : 'bg-success/10'
                  }`}>
                    {data.isFake ? 
                      <AlertTriangle className="h-8 w-8 text-destructive" /> :
                      <CheckCircle className="h-8 w-8 text-success" />
                    }
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {data.isFake ? "Likely Fake" : "Likely Authentic"}
                  </h3>
                  <Badge variant={data.isFake ? "destructive" : "outline"} className="mb-2">
                    {data.isFake ? "FAKE DETECTED" : "AUTHENTIC"}
                  </Badge>
                </div>

                {/* Confidence Score */}
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-background to-muted/50">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {data.confidence}%
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Confidence</h3>
                  <p className="text-sm text-muted-foreground">
                    AI detection accuracy
                  </p>
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

          {/* Review Text */}
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
                  "{data.reviewText}"
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Key Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Indicators</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Factors that influenced the detection
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.keyIndicators.map((indicator, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-foreground">{indicator}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed explanation from our AI model
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">
                  {data.aiAnalysis}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button 
              onClick={() => navigate("/")}
              variant="outline"
              className="px-8"
            >
              Analyze Another Review
            </Button>
            <Button 
              onClick={() => navigate("/bulk-analyze")}
              className="px-8"
            >
              Bulk Analysis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewAnalyze;
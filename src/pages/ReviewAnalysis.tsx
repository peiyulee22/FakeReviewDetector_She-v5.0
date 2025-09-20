import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

type Recommendation = "Worth a Go!" | "Mixed" | "Avoid" | string;

interface AnalysisData {
  shopName: string;
  fakePercentage: number;
  sentimentScore: number;
  reviewsAnalyzed: number;
  recommendation: Recommendation;
  pros: string[];
  cons: string[];
}

export default function ReviewAnalysis() {
  const { state } = useLocation() as { state?: { data?: AnalysisData } };
  const navigate = useNavigate();

  // Prefer navigation state; fallback to sessionStorage on refresh
  let data: AnalysisData | null =
    (state?.data as AnalysisData | undefined) ?? null;

  if (!data) {
    try {
      const raw = sessionStorage.getItem("analysis");
      if (raw) data = JSON.parse(raw) as AnalysisData;
    } catch {
      data = null;
    }
  }

  if (!data) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Missing analysis data</h2>
          <p className="text-foreground-secondary mb-4">
            Go back and run an analysis first.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg"
          >
            Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Review Analysis</h1>
          <p className="text-foreground-secondary mt-2">
            Insights for <span className="font-semibold">{data.shopName}</span>
          </p>
        </header>

        <section className="bg-card p-6 rounded-xl border border-card-border card-shadow mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
              <span className="text-4xl font-bold text-destructive">{data.fakePercentage}%</span>
              <p className="text-sm text-foreground-muted mt-1">Fake Reviews</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
              <div className="flex items-center text-success">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2A8,8 0 0,0 6,10A8,8 0 0,0 14,18A8,8 0 0,0 22,10A8,8 0 0,0 14,2M14,16A6,6 0 0,1 8,10A6,6 0 0,1 14,4A6,6 0 0,1 20,10A6,6 0 0,1 14,16M10.5,7.5L13.5,10.5L18.5,5.5L19.9,6.9L13.5,13.3L9.1,8.9L10.5,7.5Z" />
                </svg>
              </div>
              <p className="text-sm text-foreground-muted mt-2">{data.recommendation}</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
              <span className="text-4xl font-bold text-primary">{data.sentimentScore}/10</span>
              <p className="text-sm text-foreground-muted mt-1">Sentiment Score</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
              <span className="text-4xl font-bold text-primary">{data.reviewsAnalyzed}</span>
              <p className="text-sm text-foreground-muted mt-1">Reviews Analyzed</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
            Sentiment Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border border-card-border card-shadow">
              <h4 className="font-bold text-lg text-success mb-3">Pros</h4>
              <ul className="space-y-2 text-foreground-secondary list-disc list-inside">
                {data.pros?.length
                  ? data.pros.map((pro, i) => <li key={i}>{pro}</li>)
                  : <li className="list-none text-foreground-muted">No pros provided</li>}
              </ul>
            </div>

            <div className="bg-card p-6 rounded-lg border border-card-border card-shadow">
              <h4 className="font-bold text-lg text-destructive mb-3">Cons</h4>
              <ul className="space-y-2 text-foreground-secondary list-disc list-inside">
                {data.cons?.length
                  ? data.cons.map((con, i) => <li key={i}>{con}</li>)
                  : <li className="list-none text-foreground-muted">No cons provided</li>}
              </ul>
            </div>
          </div>
        </section>

        <div className="flex justify-center pt-6">
          <button
            onClick={() => navigate("/")}
            className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-lg hover:bg-accent-hover transition-all"
          >
            Analyze Another Shop
          </button>
        </div>
      </div>
    </Layout>
  );
}

import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

interface AnalysisData {
  shopName: string;
  fakePercentage: number;
  sentimentScore: number;
  reviewsAnalyzed: number;
  recommendation: 'positive' | 'negative' | 'neutral';
  pros: string[];
  cons: string[];
}

const ReviewAnalysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and generating analysis data
    const timer = setTimeout(() => {
      const { shopName = 'The Italian Corner' } = location.state || {};
      
      setAnalysisData({
        shopName,
        fakePercentage: 15,
        sentimentScore: 8.2,
        reviewsAnalyzed: 124,
        recommendation: 'positive',
        pros: [
          'Authentic and delicious pasta dishes',
          'Cozy and romantic ambiance',
          'Friendly and attentive service',
          'Excellent Tiramisu dessert'
        ],
        cons: [
          'Portions can be small for the price',
          'Can get crowded and noisy on weekends',
          'Limited vegetarian options',
          'Booking a table is highly recommended'
        ]
      });
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [location.state]);

  const handleAnalyzeAnother = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Analyzing Reviews</h2>
              <p className="text-foreground-secondary">Our AI is processing the data...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!analysisData) {
    return (
      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">No Analysis Data</h2>
              <p className="text-foreground-secondary mb-4">Something went wrong. Please try again.</p>
              <button 
                onClick={handleAnalyzeAnother}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-accent-hover transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <header className="mb-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground animate-slide-up">
              Shop Analysis: {analysisData.shopName}
            </h2>
            <p className="mt-2 text-lg text-foreground-secondary animate-slide-up" style={{ animationDelay: '0.1s' }}>
              AI-powered insights based on customer reviews.
            </p>
          </header>

          <div className="space-y-8">
            {/* Stats Section */}
            <section className="bg-card p-6 rounded-xl border border-card-border card-shadow animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
                  <span className="text-4xl font-bold text-destructive">{analysisData.fakePercentage}%</span>
                  <p className="text-sm font-medium text-foreground-muted mt-1">Fake Reviews</p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
                  <div className="flex items-center text-success">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2A8,8 0 0,0 6,10A8,8 0 0,0 14,18A8,8 0 0,0 22,10A8,8 0 0,0 14,2M14,16A6,6 0 0,1 8,10A6,6 0 0,1 14,4A6,6 0 0,1 20,10A6,6 0 0,1 14,16M10.5,7.5L13.5,10.5L18.5,5.5L19.9,6.9L13.5,13.3L9.1,8.9L10.5,7.5Z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground-muted mt-2">Worth a Go!</p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
                  <span className="text-4xl font-bold text-primary">{analysisData.sentimentScore}/10</span>
                  <p className="text-sm font-medium text-foreground-muted mt-1">Sentiment Score</p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background-secondary">
                  <span className="text-4xl font-bold text-primary">{analysisData.reviewsAnalyzed}</span>
                  <p className="text-sm font-medium text-foreground-muted mt-1">Reviews Analyzed</p>
                </div>
              </div>
            </section>

            {/* Sentiment Summary */}
            <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                Sentiment Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-lg border border-card-border card-shadow">
                  <h4 className="font-bold text-lg text-success flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V11H19V21H5V3H13V7A2,2 0 0,0 15,9H21Z"/>
                    </svg>
                    Pros
                  </h4>
                  <ul className="space-y-2 text-foreground-secondary list-disc list-inside">
                    {analysisData.pros.map((pro, index) => (
                      <li key={index}>{pro}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-card p-6 rounded-lg border border-card-border card-shadow">
                  <h4 className="font-bold text-lg text-destructive flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M12,15C13.1,15 14,15.9 14,17C14,18.1 13.1,19 12,19C10.9,19 10,18.1 10,17C10,15.9 10.9,15 12,15M13,7H11V13H13"/>
                    </svg>
                    Cons
                  </h4>
                  <ul className="space-y-2 text-foreground-secondary list-disc list-inside">
                    {analysisData.cons.map((con, index) => (
                      <li key={index}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <div className="flex justify-center pt-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <button 
                onClick={handleAnalyzeAnother}
                className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-lg hover:bg-accent-hover transition-all transform hover:scale-105 flex items-center gap-2 shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                </svg>
                Analyze Another Shop
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReviewAnalysis;
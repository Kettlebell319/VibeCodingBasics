'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuthButton from '@/components/auth/auth-button';
import TierBadge from '@/components/ui/tier-badge';
import UpgradeModal from '@/components/billing/upgrade-modal';
import { supabase } from '@/lib/supabase-client';

export default function HomePage() {
  const [question, setQuestion] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [similarQuestions, setSimilarQuestions] = useState<Array<{id: string; title: string; slug: string; view_count: number; category: string}>>([]);
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({ 
    questionsUsed: 0, 
    questionsRemaining: 3, 
    questionsLimit: 5,
    tier: 'explorer' as 'explorer' | 'builder' | 'expert',
    canAskQuestion: true,
    upgradeRequired: false
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    // Get user and usage data
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Fetch usage data for authenticated users
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            fetch('/api/usage', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
              .then(res => res.json())
              .then(data => {
                if (!data.error) {
                  setUsage(data);
                }
              })
              .catch(console.error);
          }
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Refresh usage when user signs in
        fetch('/api/usage', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
          .then(res => res.json())
          .then(data => {
            if (!data.error) {
              setUsage(data);
            }
          })
          .catch(console.error);
      } else {
        // Reset to default for signed out users
        setUsage({ 
          questionsUsed: 0, 
          questionsRemaining: 3, 
          questionsLimit: 5,
          tier: 'explorer',
          canAskQuestion: true,
          upgradeRequired: false
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = async () => {
    if (!question.trim()) return;
    
    setIsSearching(true);
    
    try {
      // Search for similar questions first
      const response = await fetch('/api/questions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: question })
      });
      
      const data = await response.json();
      setSimilarQuestions(data.similar || []);
      
      // If no similar questions, generate new answer
      if (data.similar.length === 0) {
        await generateNewAnswer();
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const generateNewAnswer = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in to ask questions');
        return;
      }

      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: question,
          content: question
        })
      });
      
      const data = await response.json();
      
      if (data.upgradeRequired) {
        // Show upgrade modal
        setShowUpgradeModal(true);
        return;
      }
      
      if (data.question?.slug) {
        window.location.href = `/question/${data.question.slug}`;
      }
    } catch (error) {
      console.error('Error generating answer:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">VibeCodingBasics.com</span>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              <a href="/blog" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Blog
              </a>
              <a href="/subscription" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Pricing
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <TierBadge tier={usage.tier} />
                <a href="/my-questions" className="text-gray-600 hover:text-gray-900 font-medium">
                  My Questions
                </a>
                <a href="/explore" className="text-gray-600 hover:text-gray-900 font-medium">
                  Explore
                </a>
                {usage.tier === 'explorer' && (
                  <Button 
                    onClick={() => setShowUpgradeModal(true)}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Crown className="h-4 w-4 mr-1" />
                    Upgrade
                  </Button>
                )}
              </>
            )}
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Ask anything about vibe coding
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Get instant AI-powered answers to your questions about modern web development, AI tools, and coding workflows.
          </p>
        </div>

        {/* Search Interface */}
        <div className="mb-8">
          <div className="relative">
            <Input
              type="text"
              placeholder="How do I add Stripe payments to my Bolt.new app?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="text-lg py-6 pl-6 pr-16 rounded-xl border-2 border-gray-200 focus:border-blue-500 shadow-lg"
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !question.trim()}
              className="absolute right-2 top-2 bottom-2 px-6 rounded-lg"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Usage indicator */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="px-4 py-2">
            <Zap className="h-4 w-4 mr-2" />
            Questions this month: {usage.questionsUsed}/
            {usage.tier === 'explorer' ? usage.questionsLimit : 'unlimited'} 
            {usage.tier === 'explorer' && ' (Explorer)'}
            {usage.tier === 'builder' && ' (Builder)'}
            {usage.tier === 'expert' && ' (Expert)'}
          </Badge>
          {!user && (
            <p className="text-sm text-gray-500 mt-2">
              <Button variant="link" className="p-0 h-auto font-normal">
                Sign in for more questions
              </Button>
            </p>
          )}
          {user && usage.tier === 'explorer' && usage.questionsUsed >= usage.questionsLimit - 1 && (
            <p className="text-sm text-amber-600 mt-2">
              <Button 
                variant="link" 
                className="p-0 h-auto font-normal text-amber-600 hover:text-amber-700"
                onClick={() => setShowUpgradeModal(true)}
              >
                Running low on questions? Upgrade for unlimited access
              </Button>
            </p>
          )}
        </div>

        {/* Similar Questions */}
        {similarQuestions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Similar questions found:</h3>
            <div className="space-y-3">
              {similarQuestions.map((q) => (
                <Card 
                  key={q.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = `/question/${q.slug}`}
                >
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-600 hover:text-blue-800">
                      {q.title}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {q.view_count} views • {q.category}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={generateNewAnswer} variant="outline" className="flex-1">
                Ask New Question Anyway
              </Button>
              <Button onClick={() => setSimilarQuestions([])} variant="ghost" className="flex-1">
                Start New Search
              </Button>
            </div>
            <p className="text-sm text-gray-500 text-center mt-2">
              💡 Click any question above to view the existing answer
            </p>
          </div>
        )}

        {/* Recent Questions */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Recently answered:</h3>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">React + Claude API</Badge>
            <Badge variant="secondary">Stripe webhooks</Badge>
            <Badge variant="secondary">Bolt.new deployment</Badge>
            <Badge variant="secondary">Cursor shortcuts</Badge>
            <Badge variant="secondary">Replit secrets</Badge>
          </div>
        </div>

        {/* Upgrade Modal */}
        <UpgradeModal 
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentUsage={{
            questionsUsed: usage.questionsUsed,
            questionsLimit: usage.questionsLimit
          }}
        />
      </div>
    </div>
  );
}

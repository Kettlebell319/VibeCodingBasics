'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Sync user to local database when they sign in
      if (session?.user && event === 'SIGNED_IN') {
        try {
          await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: session.user })
          });
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    
    // Simple email magic link - no OAuth setup needed!
    const email = prompt('Enter your email address:');
    if (!email) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        alert(`Error: ${error.message}`);
        setLoading(false);
      } else {
        alert('Check your email for the magic link!');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Button disabled size="sm" variant="ghost">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
      </Button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UserIcon className="h-4 w-4" />
          <span className="hidden sm:inline">
            {user.user_metadata?.full_name || user.email?.split('@')[0]}
          </span>
        </div>
        <Button onClick={handleSignOut} variant="outline" size="sm">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleSignIn} size="sm">
      <LogIn className="h-4 w-4 mr-2" />
      Sign In
    </Button>
  );
}
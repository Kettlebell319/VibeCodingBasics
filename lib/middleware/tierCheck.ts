// lib/middleware/tierCheck.ts
import { createClient } from '@supabase/supabase-js';
import db from '@/lib/db';

interface TierAccess {
  hasAccess: boolean;
  currentTier: string;
  upgradeRequired: boolean;
}

interface QuestionLimit {
  canAsk: boolean;
  questionsUsed: number;
  questionsLimit: number;
  resetDate: string;
}

export async function checkTierAccess(
  userId: string, 
  requiredTier: 'free' | 'pro'
): Promise<TierAccess> {
  try {
    const result = await db.query(
      'SELECT tier, subscription_status FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { hasAccess: false, currentTier: 'free', upgradeRequired: true };
    }
    
    const user = result.rows[0];
    const tierOrder = { free: 0, pro: 1 };
    const hasAccess = tierOrder[user.tier] >= tierOrder[requiredTier];
    
    return {
      hasAccess,
      currentTier: user.tier,
      upgradeRequired: !hasAccess
    };
  } catch (error) {
    console.error('Error checking tier access:', error);
    return { hasAccess: false, currentTier: 'free', upgradeRequired: true };
  }
}

export async function checkQuestionLimit(userId: string): Promise<QuestionLimit> {
  try {
    // First check and reset monthly usage if needed
    await db.query('SELECT check_monthly_reset($1)', [userId]);
    
    const result = await db.query(`
      SELECT 
        questions_used_this_month,
        monthly_limit,
        tier,
        last_reset_date,
        email
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return { canAsk: false, questionsUsed: 0, questionsLimit: 30, resetDate: '' };
    }
    
    const user = result.rows[0];
    
    // Check if user is admin
    const adminEmails = [
      'kevin@kevinbellco.com',
      'hello.kevinbell@gmail.com', 
      'kevin@chronoscapitalus.com',
      'kevinbell@me.com', // backup
      'kevin@vibecodingbasics.com' // backup
    ];
    const isAdmin = adminEmails.includes(user.email);
    
    // Admins and pro tier have unlimited questions
    const canAsk = isAdmin || user.tier === 'pro' || 
                   user.questions_used_this_month < user.monthly_limit;
    
    // Calculate next reset date
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    return {
      canAsk,
      questionsUsed: isAdmin ? 0 : (user.questions_used_this_month || 0), // Show 0 usage for admins
      questionsLimit: isAdmin || user.tier === 'pro' ? -1 : user.monthly_limit, // -1 = unlimited for admins and pro tier
      resetDate: nextMonth.toISOString()
    };
  } catch (error) {
    console.error('Error checking question limit:', error);
    return { canAsk: false, questionsUsed: 0, questionsLimit: 30, resetDate: '' };
  }
}

export async function incrementQuestionUsage(userId: string): Promise<void> {
  try {
    // Check if user is admin first
    const adminEmails = [
      'kevin@kevinbellco.com',
      'hello.kevinbell@gmail.com', 
      'kevin@chronoscapitalus.com',
      'kevinbell@me.com',
      'kevin@vibecodingbasics.com'
    ];
    
    const userResult = await db.query('SELECT email, tier FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return;
    
    const user = userResult.rows[0];
    const isAdmin = adminEmails.includes(user.email);
    
    // Only increment for free tier users who are NOT admin
    if (!isAdmin && user.tier === 'free') {
      await db.query(`
        UPDATE users 
        SET questions_used_this_month = questions_used_this_month + 1 
        WHERE id = $1
      `, [userId]);
    }
  } catch (error) {
    console.error('Error incrementing question usage:', error);
  }
}

export async function getUserTierInfo(userId: string) {
  try {
    const result = await db.query(`
      SELECT 
        tier,
        subscription_status,
        questions_used_this_month,
        monthly_limit,
        subscription_expires_at,
        last_reset_date
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    const usage = await checkQuestionLimit(userId);
    
    return {
      tier: user.tier,
      subscriptionStatus: user.subscription_status,
      questionsUsed: usage.questionsUsed,
      questionsLimit: usage.questionsLimit,
      canAskQuestion: usage.canAsk,
      subscriptionExpiresAt: user.subscription_expires_at,
      nextResetDate: usage.resetDate
    };
  } catch (error) {
    console.error('Error getting user tier info:', error);
    return null;
  }
}
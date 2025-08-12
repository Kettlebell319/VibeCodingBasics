import db from './db';

export const FREE_QUESTIONS_PER_DAY = 3;

export interface UsageInfo {
  canAsk: boolean;
  questionsUsed: number;
  questionsRemaining: number;
  resetTime: Date;
}

export async function checkUsageLimit(userId: string): Promise<UsageInfo> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const result = await db.query(`
      SELECT questions_asked 
      FROM daily_usage 
      WHERE user_id = $1 AND date = $2
    `, [userId, today]);
    
    const questionsUsed = result.rows[0]?.questions_asked || 0;
    const questionsRemaining = Math.max(0, FREE_QUESTIONS_PER_DAY - questionsUsed);
    
    return {
      canAsk: questionsUsed < FREE_QUESTIONS_PER_DAY,
      questionsUsed,
      questionsRemaining,
      resetTime: new Date(new Date().setHours(24, 0, 0, 0))
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    throw new Error('Failed to check usage limit');
  }
}

export async function incrementUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    await db.query(`
      INSERT INTO daily_usage (user_id, date, questions_asked)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET questions_asked = daily_usage.questions_asked + 1
    `, [userId, today]);
  } catch (error) {
    console.error('Error incrementing usage:', error);
    throw new Error('Failed to track usage');
  }
}

export async function isUserPremium(userId: string): Promise<boolean> {
  try {
    const result = await db.query(`
      SELECT subscription_tier 
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    return result.rows[0]?.subscription_tier === 'premium';
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}
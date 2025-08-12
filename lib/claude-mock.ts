// Mock Claude API for testing without API key
export interface ClaudeResponse {
  content: string;
  seoTitle: string;
  seoDescription: string;
  category: string;
  tags: string[];
  responseTime: number;
}

export async function generateAnswer(
  title: string,
  content: string,
  userTier: 'free' | 'premium' = 'free'
): Promise<ClaudeResponse> {
  const startTime = Date.now();
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Blog-style response with VibeCoding format
  const mockAnswer = `# ${title}

> Asked by @vibedev

## 🧠 TL;DR
${content.includes('Stripe') ? 'Set up Stripe payments by installing their SDK, creating payment intents on your backend, and handling the frontend with their pre-built components. Takes about 30 minutes if you follow the steps.' : content.includes('Claude') ? 'Connect Claude API by getting your API key, installing the SDK, and making your first API call. The hardest part is usually managing API keys properly.' : `Build this feature by breaking it into small pieces, testing each part, and connecting them gradually. Most vibecoding problems solve themselves when you go step-by-step.`}

## 🚀 The Why
${content.includes('Stripe') ? 'Every vibecoding project eventually needs payments. Whether you\'re selling AI tools, SaaS subscriptions, or digital products, Stripe handles the complexity so you can focus on building.' : content.includes('Claude') ? 'Claude is basically having a coding partner who never gets tired. Once you connect the API, you can generate content, analyze data, or build chatbots that actually understand context.' : `This problem shows up in every vibecoding project. The trick isn't knowing every framework—it's knowing how to connect things that weren't designed to work together.`}

## 🔧 The How

### Step 1: Set Up Your Environment

${content.includes('Stripe') ? `Install Stripe and get your API keys from the dashboard:

\`\`\`bash
npm install stripe @stripe/stripe-js
\`\`\`

Add your keys to \`.env.local\`:
\`\`\`bash
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
\`\`\`` : content.includes('Claude') ? `Get your Claude API key and install the SDK:

\`\`\`bash
npm install @anthropic-ai/sdk
\`\`\`

Add your key to \`.env.local\`:
\`\`\`bash
ANTHROPIC_API_KEY=sk-ant-your_key_here
\`\`\`` : `Start with the basics—get your development environment ready:

\`\`\`bash
npm install next react
npm run dev
\`\`\``}

### Step 2: Build the Core Logic

${content.includes('Stripe') ? `Create a payment intent on your backend:

\`\`\`javascript
// pages/api/create-payment.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 2000, // $20.00
    currency: 'usd',
  });
  
  res.json({ clientSecret: paymentIntent.client_secret });
}
\`\`\`` : content.includes('Claude') ? `Make your first Claude API call:

\`\`\`javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1000,
  messages: [{ role: 'user', content: 'Hello Claude!' }]
});

console.log(message.content);
\`\`\`` : `Build your feature step by step:

\`\`\`javascript
export default function MyComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Start simple, add complexity later
    console.log('Component loaded');
  }, []);
  
  return <div>Your feature here</div>;
}
\`\`\``}

### Step 3: Connect Everything

${content.includes('Stripe') ? 'Use Stripe Elements on your frontend to collect payment info securely. The magic happens when your frontend talks to your backend API.' : content.includes('Claude') ? 'Build a simple interface where users can input text and get Claude responses. Start with basic chat, then add features.' : 'Connect your components, test each piece, and gradually add the features you need. Most bugs happen at the connection points.'}

## 📝 Real Talk

${content.includes('Stripe') ? 'I spent 2 hours debugging why payments weren\'t working—turns out I was using the wrong API key environment. Always double-check your .env files!' : content.includes('Claude') ? 'First time I used Claude API, I forgot to handle rate limits and burned through my quota in 10 minutes. Always add error handling from day one.' : 'The biggest mistake new vibecoders make? Trying to build everything at once. Start with one feature, make it work, then add the next piece.'}

## 🔗 Bonus Resources

- ${content.includes('Stripe') ? 'Stripe Documentation: stripe.com/docs' : content.includes('Claude') ? 'Claude API Docs: docs.anthropic.com' : 'Next.js Tutorial: nextjs.org/learn'}
- ${content.includes('Stripe') ? 'Test with: 4242 4242 4242 4242' : content.includes('Claude') ? 'Start with simple prompts first' : 'Build in small iterations'}

## 🧵 Quote This

**"${content.includes('Stripe') ? 'Stripe payments are like LEGO blocks—once you understand the pieces, you can build anything.' : content.includes('Claude') ? 'Claude API is basically having a really smart intern who never sleeps and costs $0.01 per conversation.' : 'Vibecoding isn\'t about being perfect—it\'s about being relentlessly iterative.'}"**`;

  const responseTime = Date.now() - startTime;

  // Determine category and tags based on content
  let category = 'general';
  let tags = ['vibecoding'];

  if (content.toLowerCase().includes('stripe')) {
    category = 'stripe';
    tags = ['stripe', 'payments', 'integration'];
  } else if (content.toLowerCase().includes('claude')) {
    category = 'claude';
    tags = ['claude', 'api', 'ai'];
  } else if (content.toLowerCase().includes('cursor')) {
    category = 'cursor';
    tags = ['cursor', 'ai-coding', 'shortcuts'];
  } else if (content.toLowerCase().includes('bolt')) {
    category = 'bolt.new';
    tags = ['bolt.new', 'deployment', 'hosting'];
  } else if (content.toLowerCase().includes('replit')) {
    category = 'replit';
    tags = ['replit', 'development', 'environment'];
  }

  return {
    content: mockAnswer,
    seoTitle: `How to ${title} - Complete Guide`,
    seoDescription: `Learn how to ${title.toLowerCase()} with step-by-step instructions and code examples.`,
    category,
    tags,
    responseTime
  };
}
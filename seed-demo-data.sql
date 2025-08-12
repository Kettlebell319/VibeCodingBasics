-- Insert demo user
INSERT INTO users (id, email, username, full_name, subscription_tier) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com', 'demo_user', 'Demo User', 'free');

-- Insert demo questions and answers
INSERT INTO questions (id, user_id, title, content, slug, status, category, tags, view_count) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'How do I add Stripe payments to my Bolt.new app?', 'I''m building an app in Bolt.new and need to integrate Stripe for payments. What''s the best way to do this?', 'how-do-i-add-stripe-payments-to-my-bolt-new-app', 'published', 'bolt.new', ARRAY['stripe', 'payments', 'bolt.new'], 45),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'How to connect Claude API to my Replit project?', 'I want to use the Claude API in my Replit project but I''m getting CORS errors. How do I fix this?', 'how-to-connect-claude-api-to-my-replit-project', 'published', 'replit', ARRAY['claude', 'api', 'replit', 'cors'], 32),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Best practices for Cursor AI coding shortcuts?', 'What are the most useful Cursor shortcuts and features for AI-assisted coding?', 'best-practices-for-cursor-ai-coding-shortcuts', 'published', 'cursor', ARRAY['cursor', 'shortcuts', 'ai-coding'], 28);

-- Insert demo answers
INSERT INTO answers (question_id, content, seo_title, seo_description, claude_model, response_time_ms) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'To integrate Stripe payments into your Bolt.new app, follow these steps:

**1. Install Stripe in your project**
```bash
npm install stripe @stripe/stripe-js
```

**2. Set up environment variables**
Add your Stripe keys to your project''s environment:
```
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

**3. Create a payment endpoint**
```javascript
// app/api/create-payment-intent/route.js
import Stripe from ''stripe'';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const { amount } = await request.json();
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Stripe uses cents
    currency: ''usd'',
  });
  
  return Response.json({ 
    clientSecret: paymentIntent.client_secret 
  });
}
```

**4. Add the payment form component**
```jsx
import { loadStripe } from ''@stripe/stripe-js'';
import { Elements, CardElement, useStripe, useElements } from ''@stripe/react-stripe-js'';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const { clientSecret } = await fetch(''/api/create-payment-intent'', {
      method: ''POST'',
      headers: { ''Content-Type'': ''application/json'' },
      body: JSON.stringify({ amount: 20 }) // $20
    }).then(res => res.json());
    
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)
      }
    });
    
    if (result.error) {
      console.error(result.error);
    } else {
      console.log(''Payment succeeded!'');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Pay $20
      </button>
    </form>
  );
}

export default function App() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
```

**Common Pitfalls to Avoid:**
- Never expose your secret key in client-side code
- Always validate payments on your server
- Handle errors gracefully with user-friendly messages
- Test with Stripe''s test cards before going live

**Official Documentation:**
- [Stripe React Guide](https://stripe.com/docs/stripe-js/react)
- [Bolt.new Environment Variables](https://bolt.new/docs/environment-variables)', 'How to Add Stripe Payments to Bolt.new App - Complete Guide', 'Learn how to integrate Stripe payments into your Bolt.new application with step-by-step code examples and best practices.', 'claude-3-haiku-20240307', 2500),

('550e8400-e29b-41d4-a716-446655440002', 'To connect the Claude API to your Replit project and fix CORS errors, here''s the solution:

**1. The CORS Issue**
CORS errors happen because browsers block direct API calls to external services from client-side code. You need to make API calls from your server instead.

**2. Set up environment variables in Replit**
Go to your Replit project settings and add:
```
ANTHROPIC_API_KEY=your_claude_api_key_here
```

**3. Create a server-side API endpoint**
```javascript
// pages/api/claude.js (or app/api/claude/route.js for App Router)
import Anthropic from ''@anthropic-ai/sdk'';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { message } = await request.json();
    
    const response = await anthropic.messages.create({
      model: ''claude-3-haiku-20240307'',
      max_tokens: 1000,
      messages: [{ role: ''user'', content: message }]
    });
    
    return Response.json({ 
      content: response.content[0].text 
    });
  } catch (error) {
    return Response.json(
      { error: ''Failed to call Claude API'' }, 
      { status: 500 }
    );
  }
}
```

**4. Call your API from the frontend**
```javascript
// In your React component
async function askClaude(question) {
  try {
    const response = await fetch(''/api/claude'', {
      method: ''POST'',
      headers: { ''Content-Type'': ''application/json'' },
      body: JSON.stringify({ message: question })
    });
    
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error(''Error:'', error);
  }
}
```

**5. Full example component**
```jsx
import { useState } from ''react'';

export default function ClaudeChat() {
  const [question, setQuestion] = useState('''');
  const [answer, setAnswer] = useState('''');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const response = await askClaude(question);
    setAnswer(response);
    setLoading(false);
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Claude anything..."
        />
        <button type="submit" disabled={loading}>
          {loading ? ''Thinking...'' : ''Ask Claude''}
        </button>
      </form>
      
      {answer && (
        <div>
          <h3>Claude''s Answer:</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
```

**Key Points:**
- Always make API calls from server-side code to avoid CORS
- Store API keys as environment variables in Replit
- Handle errors gracefully with try-catch blocks
- Add loading states for better user experience

This approach works for any Replit project structure and eliminates CORS issues completely.', 'Fix Claude API CORS Errors in Replit - Complete Solution', 'Solve CORS errors when connecting Claude API to Replit projects with server-side implementation and code examples.', 'claude-3-haiku-20240307', 1800),

('550e8400-e29b-41d4-a716-446655440003', 'Here are the most useful Cursor AI coding shortcuts and features for maximum productivity:

**Essential Keyboard Shortcuts:**

**1. AI Code Generation**
- `Cmd+K` (Mac) / `Ctrl+K` (Windows): Open AI command palette
- `Cmd+L` (Mac) / `Ctrl+L` (Windows): Chat with AI about selected code
- `Tab`: Accept AI suggestions
- `Escape`: Dismiss AI suggestions

**2. Smart Selection & Editing**
- `Cmd+D` (Mac) / `Ctrl+D` (Windows): Select next occurrence
- `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows): Select all occurrences
- `Alt+Click`: Multi-cursor editing
- `Cmd+/` (Mac) / `Ctrl+/` (Windows): Toggle line comment

**3. AI-Powered Features**
- `Cmd+I` (Mac) / `Ctrl+I` (Windows): Inline AI edit
- `Cmd+Shift+1` (Mac) / `Ctrl+Shift+1` (Windows): Explain code
- `Cmd+Shift+2` (Mac) / `Ctrl+Shift+2` (Windows): Generate tests

**Best Practices for AI Assistance:**

**1. Context Selection**
Always select relevant code before using AI commands:
```javascript
// Select this function before asking for improvements
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**2. Specific Prompts**
Instead of "fix this code", try:
- "Add error handling for network requests"
- "Convert this to TypeScript with proper types"
- "Optimize this function for better performance"

**3. Incremental Changes**
Use `Cmd+K` for small, focused changes:
- "Add JSDoc comments to this function"
- "Extract this logic into a separate function"
- "Add loading state to this component"

**Pro Tips for Vibecoding:**

**1. Project Context**
Cursor learns from your entire project. Keep related files open in tabs so AI understands your coding patterns.

**2. Comment-Driven Development**
Write comments describing what you want, then use AI to implement:
```javascript
// TODO: Create a function that validates email addresses and returns boolean
// AI will generate the function when you use Cmd+K
```

**3. Rapid Prototyping**
Use AI to generate boilerplate quickly:
- "Create a React component for user authentication"
- "Generate a REST API endpoint for user management"
- "Build a responsive navbar with Tailwind CSS"

**4. Learning Mode**
Use `Cmd+L` to ask questions about unfamiliar code:
- "How does this React hook work?"
- "Explain this regex pattern"
- "What design pattern is this implementing?"

**Advanced Workflows:**

**1. Code Review Helper**
Select questionable code and use `Cmd+L` to ask:
- "Are there any potential bugs in this code?"
- "How can I improve the performance here?"
- "Is this following React best practices?"

**2. Refactoring Assistant**
- Select large functions and ask to "break this into smaller functions"
- Convert class components to hooks with "modernize this React component"
- Improve naming with "suggest better variable names"

**3. Documentation Generator**
- Select functions and use "generate comprehensive documentation"
- Create README sections with "explain how to use this module"

**Common Pitfalls to Avoid:**
- Don''t rely on AI for critical business logic without review
- Always test AI-generated code before committing
- Be specific with prompts - vague requests get vague results
- Keep your coding standards consistent even with AI help

These shortcuts and practices will dramatically speed up your development workflow while maintaining code quality.', 'Master Cursor AI Shortcuts - Complete Productivity Guide', 'Discover the most powerful Cursor AI shortcuts and features to supercharge your coding productivity with practical examples.', 'claude-3-haiku-20240307', 2200);

-- Insert demo usage data
INSERT INTO daily_usage (user_id, date, questions_asked) VALUES
('550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE, 2);
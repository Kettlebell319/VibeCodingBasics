require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
  console.log('Please add your Stripe secret key to .env.local first');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  try {
    console.log('Creating Stripe products and prices...\n');

    // Explorer Tier
    const explorerProduct = await stripe.products.create({
      name: 'VibeCoding Explorer',
      description: 'Up to 50 questions per month with basic AI coding help',
    });

    const explorerPrice = await stripe.prices.create({
      unit_amount: 999, // $9.99 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
      product: explorerProduct.id,
    });

    console.log(`✅ Explorer Product ID: ${explorerProduct.id}`);
    console.log(`✅ Explorer Price ID: ${explorerPrice.id}\n`);

    // Builder Tier
    const builderProduct = await stripe.products.create({
      name: 'VibeCoding Builder',
      description: 'Up to 200 questions per month with advanced AI assistance',
    });

    const builderPrice = await stripe.prices.create({
      unit_amount: 1999, // $19.99 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
      product: builderProduct.id,
    });

    console.log(`✅ Builder Product ID: ${builderProduct.id}`);
    console.log(`✅ Builder Price ID: ${builderPrice.id}\n`);

    // Expert Tier
    const expertProduct = await stripe.products.create({
      name: 'VibeCoding Expert',
      description: 'Up to 1000 questions per month with expert-level AI assistance',
    });

    const expertPrice = await stripe.prices.create({
      unit_amount: 4999, // $49.99 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
      product: expertProduct.id,
    });

    console.log(`✅ Expert Product ID: ${expertProduct.id}`);
    console.log(`✅ Expert Price ID: ${expertPrice.id}\n`);

    console.log('🎉 All products created successfully!\n');
    console.log('Add these to your .env.local file:');
    console.log(`STRIPE_EXPLORER_PRICE_ID=${explorerPrice.id}`);
    console.log(`STRIPE_BUILDER_PRICE_ID=${builderPrice.id}`);
    console.log(`STRIPE_EXPERT_PRICE_ID=${expertPrice.id}`);

  } catch (error) {
    console.error('Error creating products:', error);
  }
}

createProducts();
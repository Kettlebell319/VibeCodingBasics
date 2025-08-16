require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
  console.log('Please add your Stripe secret key to .env.local first');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createProTier() {
  try {
    console.log('Creating VibeCoding Pro tier...\n');

    // Pro Tier
    const proProduct = await stripe.products.create({
      name: 'VibeCoding Pro',
      description: 'Ask up to 300 questions per month with priority support',
    });

    const proPrice = await stripe.prices.create({
      unit_amount: 800, // $8.00 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
      product: proProduct.id,
    });

    console.log(`✅ Pro Product ID: ${proProduct.id}`);
    console.log(`✅ Pro Price ID: ${proPrice.id}\n`);

    console.log('🎉 Pro tier created successfully!\n');
    console.log('Update your .env.local file:');
    console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`);

    // Optionally deactivate old products
    console.log('\n💡 Remember to deactivate old products in Stripe dashboard if needed');

  } catch (error) {
    console.error('Error creating Pro tier:', error);
  }
}

createProTier();
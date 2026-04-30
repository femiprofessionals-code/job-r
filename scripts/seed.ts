import 'dotenv/config';
import { db } from '../src/db/client';
import { companies } from '../src/db/schema/companies';
import { slugify } from '../src/lib/utils';

type Seed = {
  name: string;
  source: 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'fallback';
  sourceBoardId: string | null;
  careersUrl: string;
  website?: string;
  industry?: string;
  hqCity?: string;
  hqCountry?: string;
  sizeBucket?: string;
  tags?: string[];
};

// 31 seed companies spanning ATS sources. Sourced from public boards only.
const COMPANIES: Seed[] = [
  { name: 'Airbnb', source: 'greenhouse', sourceBoardId: 'airbnb', careersUrl: 'https://careers.airbnb.com/', industry: 'travel' },
  { name: 'Stripe', source: 'greenhouse', sourceBoardId: 'stripe', careersUrl: 'https://stripe.com/jobs' },
  { name: 'Anthropic', source: 'greenhouse', sourceBoardId: 'anthropic', careersUrl: 'https://www.anthropic.com/careers' },
  { name: 'OpenAI', source: 'greenhouse', sourceBoardId: 'openai', careersUrl: 'https://openai.com/careers' },
  { name: 'DoorDash', source: 'greenhouse', sourceBoardId: 'doordash', careersUrl: 'https://careers.doordash.com' },
  { name: 'Instacart', source: 'greenhouse', sourceBoardId: 'instacart', careersUrl: 'https://instacart.careers' },
  { name: 'Coinbase', source: 'greenhouse', sourceBoardId: 'coinbase', careersUrl: 'https://coinbase.com/careers' },
  { name: 'Reddit', source: 'greenhouse', sourceBoardId: 'reddit', careersUrl: 'https://www.redditinc.com/careers' },
  { name: 'Plaid', source: 'lever', sourceBoardId: 'plaid', careersUrl: 'https://plaid.com/careers' },
  { name: 'Netflix', source: 'lever', sourceBoardId: 'netflix', careersUrl: 'https://jobs.netflix.com' },
  { name: 'Ramp', source: 'ashby', sourceBoardId: 'ramp', careersUrl: 'https://ramp.com/careers' },
  { name: 'Linear', source: 'ashby', sourceBoardId: 'linear', careersUrl: 'https://linear.app/careers' },
  { name: 'Vercel', source: 'greenhouse', sourceBoardId: 'vercel', careersUrl: 'https://vercel.com/careers' },
  { name: 'Figma', source: 'greenhouse', sourceBoardId: 'figma', careersUrl: 'https://www.figma.com/careers' },
  { name: 'Notion', source: 'greenhouse', sourceBoardId: 'notion', careersUrl: 'https://www.notion.so/careers' },
  { name: 'Datadog', source: 'greenhouse', sourceBoardId: 'datadog', careersUrl: 'https://careers.datadoghq.com/' },
  { name: 'Cloudflare', source: 'greenhouse', sourceBoardId: 'cloudflare', careersUrl: 'https://www.cloudflare.com/careers/' },
  { name: 'Snowflake', source: 'greenhouse', sourceBoardId: 'snowflake', careersUrl: 'https://careers.snowflake.com/' },
  { name: 'HashiCorp', source: 'greenhouse', sourceBoardId: 'hashicorp', careersUrl: 'https://www.hashicorp.com/jobs' },
  { name: 'GitLab', source: 'greenhouse', sourceBoardId: 'gitlab', careersUrl: 'https://about.gitlab.com/jobs/' },
  { name: 'Elastic', source: 'greenhouse', sourceBoardId: 'elastic', careersUrl: 'https://www.elastic.co/about/careers' },
  { name: 'MongoDB', source: 'greenhouse', sourceBoardId: 'mongodb', careersUrl: 'https://www.mongodb.com/careers' },
  { name: 'Shopify', source: 'lever', sourceBoardId: 'shopify', careersUrl: 'https://www.shopify.com/careers' },
  { name: 'Asana', source: 'greenhouse', sourceBoardId: 'asana', careersUrl: 'https://asana.com/jobs' },
  { name: 'Duolingo', source: 'greenhouse', sourceBoardId: 'duolingo', careersUrl: 'https://careers.duolingo.com/' },
  { name: 'Discord', source: 'greenhouse', sourceBoardId: 'discord', careersUrl: 'https://discord.com/jobs' },
  { name: 'Dropbox', source: 'greenhouse', sourceBoardId: 'dropbox', careersUrl: 'https://jobs.dropbox.com' },
  { name: 'Pinterest', source: 'greenhouse', sourceBoardId: 'pinterest', careersUrl: 'https://www.pinterestcareers.com' },
  { name: 'Robinhood', source: 'greenhouse', sourceBoardId: 'robinhood', careersUrl: 'https://careers.robinhood.com/' },
  { name: 'Affirm', source: 'greenhouse', sourceBoardId: 'affirm', careersUrl: 'https://www.affirm.com/careers' },
  { name: 'Brex', source: 'greenhouse', sourceBoardId: 'brex', careersUrl: 'https://www.brex.com/careers' },
];

async function main() {
  console.log(`Seeding ${COMPANIES.length} companies…`);
  for (const c of COMPANIES) {
    await db
      .insert(companies)
      .values({
        name: c.name,
        slug: slugify(c.name),
        careersUrl: c.careersUrl,
        source: c.source,
        sourceBoardId: c.sourceBoardId,
        website: c.website ?? null,
        industry: c.industry ?? null,
        hqCity: c.hqCity ?? null,
        hqCountry: c.hqCountry ?? null,
        sizeBucket: c.sizeBucket ?? null,
        tags: c.tags ?? [],
        status: 'approved',
      })
      .onConflictDoNothing({ target: companies.slug });
  }
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

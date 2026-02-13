
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSummaries() {
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('summary')
    .limit(5);

  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }

  const allKeys = new Set<string>();
  const samples: Record<string, any> = {};

  sessions.forEach((session, idx) => {
    const summary = session.summary as any;
    if (summary && summary.summaries) {
      console.log(`\n--- Session ${idx + 1} ---`);
      summary.summaries.forEach((s: any) => {
        const key = s.canonical_key || s.parameter_key || s.label;
        allKeys.add(key);
        if (!samples[key]) {
            samples[key] = s;
        }
        console.log(`Key: "${key}", Label: "${s.label}", Canonical: "${s.canonical_key}", Param: "${s.parameter_key}", Max: ${s.max}, Avg: ${s.avg}`);
      });
    }
  });

  console.log('\n\n=== Unique Keys Found ===');
  console.log(Array.from(allKeys).sort().join('\n'));
}

inspectSummaries();

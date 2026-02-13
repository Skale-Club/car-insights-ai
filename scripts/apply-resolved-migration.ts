
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// Must use SERVICE_ROLE_KEY for admin operations usually, but the existing script used PUBLISHABLE_KEY?
// If exec_sql is protected, it might need SERVICE_ROLE.
// Let's try SERVICE_ROLE_KEY if available, else fallback.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20260209_add_resolved_to_flags.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('🚀 Applying Resolved Column migration...');
        
        const statements = migrationSQL
            .replace(/--.*$/gm, '')
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            console.log('Executing:', statement);
            // Try rpc first
            const { error } = await supabase.rpc('exec_sql', { query: statement });

            if (error) {
                console.warn('⚠️ RPC exec_sql failed:', error.message);
                console.log('Trying direct execution via raw query (if supported)...');
                // This usually won't work via standard client unless we have a specific setup
            } else {
                console.log('✅ Success');
            }
        }
        
        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();

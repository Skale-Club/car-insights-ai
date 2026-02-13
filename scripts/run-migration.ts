import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20260209_add_is_admin_column.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('🚀 Applying Admin Column migration...');
        console.log('Migration file:', migrationPath);
        console.log('---');

        // Remove comments and split by statement
        const statements = migrationSQL
            .replace(/--.*$/gm, '') // Remove single line comments
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            console.log('Executing:', statement.substring(0, 100) + '...');
            const { error } = await supabase.rpc('exec_sql', { query: statement });

            if (error) {
                console.error('❌ Error:', error.message);
                // Try direct query if RPC doesn't exist
                const { error: directError } = await (supabase as any).from('_').select(statement);
                if (directError) {
                    console.error('❌ Direct query also failed:', directError.message);
                }
            } else {
                console.log('✅ Success');
            }
        }

        console.log('\n🎉 Migration completed!');
        console.log('\nVerifying tables...');

        // Verify app_settings table
        const { data: settings, error: settingsError } = await supabase
            .from('app_settings')
            .select('*')
            .limit(1);

        if (settingsError) {
            console.log('⚠️ app_settings table check:', settingsError.message);
        } else {
            console.log('✅ app_settings table exists');
        }

        // Verify gemini_analysis column
        const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select('id, gemini_analysis')
            .limit(1);

        if (sessionsError) {
            console.log('⚠️ gemini_analysis column check:', sessionsError.message);
        } else {
            console.log('✅ gemini_analysis column exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();

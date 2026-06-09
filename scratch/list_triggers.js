const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf-8');
  fileContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      envConfig[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

const supabaseUrl = envConfig['SUPABASE_PROJECT_URL'] ? envConfig['SUPABASE_PROJECT_URL'].replace('/rest/v1/', '') : '';
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'] || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Service Key not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- DATABASE TRIGGERS & FUNCTIONS AUDIT ---');
  
  // Query triggers on public.users
  const { data: triggers, error: triggerError } = await supabase.rpc('pg_catalog_query', {
    query: `
      SELECT 
        tgname AS trigger_name,
        relname AS table_name,
        proname AS function_name
      FROM pg_trigger
      JOIN pg_class ON pg_class.oid = tgrelid
      JOIN pg_proc ON pg_proc.oid = tgfoid
      JOIN pg_namespace ON pg_namespace.oid = relnamespace
      WHERE nspname = 'public' AND relname = 'users';
    `
  });

  if (triggerError) {
    // Fallback: Query triggers using direct SQL if rpc is not configured
    console.log('Using SQL query for triggers instead of RPC...');
    const { data: sqlTriggers, error: sqlError } = await supabase.from('_raw_sql').select('*').csv();
    // Since _raw_sql might not exist, let's execute query via a standard postgres query or just log the error
    console.error('Could not run query:', triggerError);
  } else {
    console.log('Triggers on public.users:', triggers);
  }
  
  // Let's run a generic query to see active database triggers using postgres connection if possible,
  // or let's read the migration files carefully again.
  // Wait, let's see if we can query triggers via REST API if we query pg_catalog tables.
}

run();

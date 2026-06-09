const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf-8');
  fileContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      envConfig[key] = val;
    }
  });
}

const supabaseUrl = envConfig['SUPABASE_PROJECT_URL'] ? envConfig['SUPABASE_PROJECT_URL'].replace('/rest/v1/', '') : '';
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'] || '';

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'PRESENT' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Service Key not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('institutions').select('*');
  if (error) {
    console.error('Database Error:', error);
  } else {
    console.log('Institutions in DB:', data);
  }
}

run();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Service Key not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- DIAGNOSTIC RUN ---');
  
  // 1. Query institutions to find an ID
  const { data: insts, error: instError } = await supabase.from('institutions').select('*');
  if (instError) {
    console.error('Failed to select institutions:', instError);
    return;
  }
  console.log('Available institutions:', insts.map(i => ({ id: i.id, name: i.name, subdomain: i.subdomain })));
  
  if (insts.length === 0) {
    console.error('No institutions in DB.');
    return;
  }
  const tenantId = insts[0].id;

  // 2. Query anonymous_users
  const { data: anonUsers, error: anonUsersError } = await supabase.from('anonymous_users').select('*');
  if (anonUsersError) {
    console.error('Failed to query anonymous_users table:', anonUsersError);
  } else {
    console.log('Total anonymous_users:', anonUsers.length);
    console.log('Recent 5 anonymous_users:', anonUsers.slice(-5));
  }

  // 3. Simulate signup flow manually to trace exceptions
  const mockUserId = crypto.randomUUID();
  const mockTokenId = `NMIMS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const mockPseudonym = `Test Sparrow ${Math.floor(Math.random() * 900) + 100}`;
  
  console.log(`\nSimulating signup for mockUserId: ${mockUserId}, mockTokenId: ${mockTokenId}, mockPseudonym: ${mockPseudonym}...`);

  // Step A: Insert into anonymous_users
  console.log('Step A: Inserting into anonymous_users...');
  const { data: aData, error: aError } = await supabase.from('anonymous_users').insert({
    id: mockUserId,
    token_id: mockTokenId,
    anonymous_name: mockPseudonym,
    hashed_pin: 'mock_hash',
    institution_id: tenantId
  }).select();
  
  if (aError) {
    console.error('Step A failed:', aError);
    return;
  }
  console.log('Step A succeeded:', aData);

  // Step B: Insert into users
  console.log('Step B: Inserting into users...');
  const { data: bData, error: bError } = await supabase.from('users').insert({
    id: mockUserId,
    institution_id: tenantId,
    email: `${mockTokenId}@mindspire.local`,
    role: 'student',
    real_first_name: null,
    real_last_name: null
  }).select();
  
  if (bError) {
    console.error('Step B failed:', bError);
    
    // Clean up anonymous_users
    await supabase.from('anonymous_users').delete().eq('id', mockUserId);
    return;
  }
  console.log('Step B succeeded:', bData);

  // Step C: Insert into anonymous_profiles
  console.log('Step C: Inserting into anonymous_profiles...');
  const { data: cData, error: cError } = await supabase.from('anonymous_profiles').insert({
    user_id: mockUserId,
    institution_id: tenantId,
    pseudonym: mockPseudonym,
    avatar_config: { icon: 'otter', color: '#0F4C81' },
    token_id: mockTokenId
  }).select();

  if (cError) {
    console.error('Step C failed:', cError);
  } else {
    console.log('Step C succeeded:', cData);
  }

  // Clean up mock entries
  console.log('\nCleaning up mock entries...');
  await supabase.from('anonymous_profiles').delete().eq('user_id', mockUserId);
  await supabase.from('users').delete().eq('id', mockUserId);
  await supabase.from('anonymous_users').delete().eq('id', mockUserId);
  console.log('Cleanup finished.');
}

diagnose();

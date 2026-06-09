import fs from 'fs';
import path from 'path';

// 1. Load env variables immediately before importing anything else
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf-8');
  fileContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key) {
        process.env[key] = val;
      }
    }
  });
}

// 2. Setup mock cookies store
interface Cookie {
  name: string;
  value: string;
  options?: any;
}

const mockCookiesStore: Cookie[] = [];

// 3. Mock next/headers and next/navigation
import Module from 'module';
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function(id: string) {
  if (id === 'next/headers') {
    return {
      cookies: () => ({
        getAll: () => mockCookiesStore,
        get: (name: string) => {
          const match = mockCookiesStore.find(c => c.name === name);
          return match ? { value: match.value } : undefined;
        },
        set: (name: string, value: string, options: any) => {
          console.log(`[COOKIES.SET] ${name} = ${value.substring(0, 35)}...`);
          const idx = mockCookiesStore.findIndex(c => c.name === name);
          if (idx !== -1) {
            mockCookiesStore[idx] = { name, value, options };
          } else {
            mockCookiesStore.push({ name, value, options });
          }
        },
        delete: (name: string) => {
          console.log(`[COOKIES.DELETE] ${name}`);
          const idx = mockCookiesStore.findIndex(c => c.name === name);
          if (idx !== -1) {
            mockCookiesStore.splice(idx, 1);
          }
        }
      })
    };
  }
  if (id === 'next/navigation') {
    return {
      redirect: (target: string) => {
        console.log(`[REDIRECT] -> ${target}`);
        const err: any = new Error('NEXT_REDIRECT');
        err.digest = `NEXT_REDIRECT;307;${target};;`;
        throw err;
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

// 4. Run the rest of the test asynchronously by dynamically importing modules
async function testFullFlow() {
  console.log('=== STARTING FULL FLOW TEST ===');
  
  // Dynamically import to ensure env variables and require mocks are in place
  const { signUpStudentAnonymously } = await import('../src/lib/actions/auth.actions');
  const { default: DashboardLayout } = await import('../src/app/dashboard/layout');
  const { default: StudentDashboardPage } = await import('../src/app/dashboard/page');

  const mockPseudonym = `Otter ${Math.floor(Math.random() * 900) + 100}`;
  const mockTokenId = `NMIMS-T${Math.floor(Math.random() * 90000) + 10000}`;
  const mockPin = '123456';

  console.log(`Step 1: Sign up anonymously with pseudonym "${mockPseudonym}", Token ID "${mockTokenId}"`);
  
  let signupSucceeded = false;
  try {
    const res = await signUpStudentAnonymously({
      pseudonym: mockPseudonym,
      tokenId: mockTokenId,
      pin: mockPin,
      tenantSubdomain: 'nmims',
    });
    console.log('[SIGNUP RESULT]:', res);
    if (res && !res.success) {
      console.error('[SIGNUP ERROR]:', res.error);
    }
  } catch (err: any) {
    if (err.message === 'NEXT_REDIRECT' || (err.digest && err.digest.startsWith('NEXT_REDIRECT'))) {
      console.log('[SIGNUP SUCCESSFUL] Next.js redirect thrown');
      signupSucceeded = true;
    } else {
      console.error('[SIGNUP EXCEPTION]:', err);
    }
  }

  if (!signupSucceeded) {
    console.log('Signup did not succeed, aborting dashboard rendering test.');
    return;
  }

  console.log('\nStep 2: Checking cookie store content...');
  console.log('Cookies in store:', mockCookiesStore.map(c => ({ name: c.name, valueLength: c.value.length })));

  console.log('\nStep 3: Rendering Dashboard Layout...');
  try {
    await DashboardLayout({ children: 'Mock Dashboard Content' });
    console.log('[LAYOUT RENDER SUCCESS]');
  } catch (err: any) {
    if (err.message === 'NEXT_REDIRECT' || (err.digest && err.digest.startsWith('NEXT_REDIRECT'))) {
      console.log('[LAYOUT REDIRECTED]:', err.digest);
    } else {
      console.error('[LAYOUT EXCEPTION]:', err);
    }
  }

  console.log('\nStep 4: Rendering Student Dashboard Page...');
  try {
    await StudentDashboardPage();
    console.log('[PAGE RENDER SUCCESS]');
  } catch (err: any) {
    if (err.message === 'NEXT_REDIRECT' || (err.digest && err.digest.startsWith('NEXT_REDIRECT'))) {
      console.log('[PAGE REDIRECTED]:', err.digest);
    } else {
      console.error('[PAGE EXCEPTION]:', err);
    }
  }

  console.log('=== FULL FLOW TEST FINISHED ===');
}

testFullFlow().catch(console.error);

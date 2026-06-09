const fs = require('fs');
const path = require('path');

// 1. Mock Next.js next/headers and next/navigation
const mockCookies = {
  cookies: []
};

// Set env variables
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf-8');
  fileContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

// Mock modules in Node require cache before importing actions
require('module').prototype.require = (function(originalRequire) {
  return function(id) {
    if (id === 'next/headers') {
      return {
        cookies: () => ({
          getAll: () => [],
          get: (name) => {
            const match = mockCookies.cookies.find(c => c.name === name);
            return match ? { value: match.value } : undefined;
          },
          set: (name, value, options) => {
            console.log(`[MOCK COOKIE SET] ${name} = ${value.substring(0, 30)}...`);
            mockCookies.cookies.push({ name, value, options });
          },
          delete: (name) => {
            mockCookies.cookies = mockCookies.cookies.filter(c => c.name !== name);
          }
        })
      };
    }
    if (id === 'next/navigation') {
      return {
        redirect: (target) => {
          console.log(`[MOCK REDIRECT SUCCESS] -> ${target}`);
          // Throw the standard NEXT_REDIRECT error that Next.js expects
          const err = new Error('NEXT_REDIRECT');
          err.digest = `NEXT_REDIRECT;307;${target};;`;
          throw err;
        }
      };
    }
    return originalRequire.apply(this, arguments);
  };
})(require('module').prototype.require);

// Now import the action
const { signUpStudentAnonymously } = require('../src/lib/actions/auth.actions');

async function testAction() {
  console.log('--- TEST ACTION START ---');
  
  const mockPseudonym = `Sparrow ${Math.floor(Math.random() * 900) + 100}`;
  const mockTokenId = `NMIMS-T${Math.floor(Math.random() * 90000) + 10000}`;
  const mockPin = '123456';
  
  console.log(`Input - Pseudonym: ${mockPseudonym}, Token: ${mockTokenId}, PIN: ${mockPin}`);
  
  try {
    const res = await signUpStudentAnonymously({
      pseudonym: mockPseudonym,
      tokenId: mockTokenId,
      pin: mockPin,
      tenantSubdomain: 'nmims',
    });
    console.log('[ACTION RESPONSE]:', res);
  } catch (err) {
    if (err.message === 'NEXT_REDIRECT' || (err.digest && err.digest.startsWith('NEXT_REDIRECT'))) {
      console.log('[REDIRECT EXCEPTION CAPTURED CORRECTLY] - Next.js will perform the client redirect successfully!');
    } else {
      console.error('[UNEXPECTED ERROR THROWN]:', err);
    }
  }
}

testAction();

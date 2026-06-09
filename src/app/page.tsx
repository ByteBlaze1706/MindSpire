// src/app/page.tsx
'use client';

import React, { useState } from 'react';
import { searchInstitutionsByName, verifyInstitutionCode } from '../lib/actions/discovery.actions';

export default function GlobalDiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [codeQuery, setCodeQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; subdomain: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    const result = await searchInstitutionsByName(searchQuery);
    
    if (result.success && result.data) {
      setSearchResults(result.data);
      if (result.data.length === 0) {
        setErrorMsg('No universities found matching your search query.');
      }
    } else {
      setErrorMsg(result.error || 'Search failed.');
    }
    setLoading(false);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeQuery.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    const result = await verifyInstitutionCode(codeQuery);

    if (result.success && result.subdomain) {
      window.location.href = `/${result.subdomain}/login`;
    } else {
      setErrorMsg(result.error || 'Verification failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#FDFBF7] via-[#F5EBE6] to-[#E3EFF3] flex flex-col items-center justify-center p-6 antialiased">
      <div className="w-full max-w-2xl text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-semibold text-neutral-800 tracking-tight leading-tight">
          Find Your University on MindSpire
        </h1>
        <p className="mt-4 text-md sm:text-lg text-neutral-500 max-w-lg mx-auto font-light">
          A secure, digital wellness space designed for student communities.
        </p>
      </div>

      <div className="w-full max-w-md bg-white/70 backdrop-blur-md border border-neutral-100/50 p-8 rounded-3xl shadow-xl shadow-neutral-100/30 space-y-8">
        {errorMsg && (
          <div className="p-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl">
            {errorMsg}
          </div>
        )}

        {/* Search by Name */}
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Search College Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Stanford University"
              className="flex-1 px-5 py-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none text-sm transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-sm font-medium transition cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto border-t border-neutral-100 pt-4">
            {searchResults.map((item) => (
              <a
                key={item.id}
                href={`/${item.subdomain}/login`}
                className="flex items-center justify-between p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/50 rounded-xl transition text-sm font-medium text-neutral-700"
              >
                <span>{item.name}</span>
                <span className="text-xs text-neutral-400 tracking-wider font-light">
                  {item.subdomain}.mindspire.app →
                </span>
              </a>
            ))}
          </div>
        )}

        <div className="relative text-center">
          <span className="relative z-10 px-4 text-xs font-medium uppercase tracking-wider text-neutral-400 bg-white">
            Or Join via Access Code
          </span>
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-neutral-100 -z-0" />
        </div>

        {/* Code Verification */}
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Enter Join Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="COL-123-ABC"
              className="flex-1 px-5 py-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-2xl outline-none text-sm transition uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-sm font-medium transition cursor-pointer"
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

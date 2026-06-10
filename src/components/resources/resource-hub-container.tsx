'use client';

import React, { useState, useTransition } from 'react';
import { ResourceArticle } from '../../lib/repositories/cms.repository';
import { toggleBookmarkResource } from '../../lib/actions/cms.actions';

interface ResourceHubContainerProps {
  allResources: ResourceArticle[];
  initialBookmarks: ResourceArticle[];
  recentlyViewed: ResourceArticle[];
  recommendedResources: ResourceArticle[];
  recommendationReason: string;
  isCrisis: boolean;
  tenantSubdomain: string;
}

type TabType = 'all' | 'articles' | 'videos' | 'sounds';

// Categories with matching background styles and SVGs
const CATEGORY_META: Record<string, { gradient: string; text: string; bg: string; icon: React.ReactNode }> = {
  'Anxiety Management': {
    gradient: 'from-amber-400/10 to-orange-500/10 border-orange-200/50',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  'Stress Relief': {
    gradient: 'from-emerald-400/10 to-teal-500/10 border-teal-200/50',
    text: 'text-teal-700',
    bg: 'bg-teal-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  'Depression Support': {
    gradient: 'from-indigo-400/10 to-purple-500/10 border-purple-200/50',
    text: 'text-purple-700',
    bg: 'bg-purple-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  'Burnout Recovery': {
    gradient: 'from-rose-400/10 to-pink-500/10 border-pink-200/50',
    text: 'text-pink-700',
    bg: 'bg-pink-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  'Sleep Improvement': {
    gradient: 'from-slate-700/10 to-indigo-900/10 border-slate-300/50',
    text: 'text-slate-700',
    bg: 'bg-slate-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m14.071 8.071l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  'Mindfulness & Meditation': {
    gradient: 'from-teal-400/10 to-cyan-500/10 border-cyan-200/50',
    text: 'text-cyan-700',
    bg: 'bg-cyan-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  'Academic Pressure': {
    gradient: 'from-blue-400/10 to-indigo-500/10 border-blue-200/50',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  'Self-Esteem & Confidence': {
    gradient: 'from-yellow-400/10 to-amber-500/10 border-amber-200/50',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  'Relationships & Social Support': {
    gradient: 'from-pink-400/10 to-rose-500/10 border-pink-200/50',
    text: 'text-pink-700',
    bg: 'bg-pink-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20H22V18C22 15.7909 20.2091 14 18 14C17.0694 14 16.2163 14.319 15.5418 14.8568M17 20H7M17 20V18C17 16.6393 16.3151 15.4389 15.2676 14.7303M7 20H2V18C2 15.7909 3.79086 14 6 14C6.93064 14 7.78368 14.319 8.45823 14.8568M7 20V18C7 16.6393 7.68487 15.4389 8.73241 14.7303M12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14ZM12 14C11.2676 14 10.5849 14.7303 10.2676 15.7303M12 14C12.7324 14 13.4151 14.7303 13.7324 15.7303" />
      </svg>
    ),
  },
  'Crisis Support': {
    gradient: 'from-red-500/10 to-rose-600/10 border-red-200/55',
    text: 'text-red-700',
    bg: 'bg-red-50',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

const DEFAULT_META = {
  gradient: 'from-neutral-400/10 to-neutral-500/10 border-neutral-200/50',
  text: 'text-neutral-700',
  bg: 'bg-neutral-50',
  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" />
    </svg>
  ),
};

export function ResourceHubContainer({
  allResources,
  initialBookmarks,
  recentlyViewed,
  recommendedResources,
  recommendationReason,
  isCrisis,
  tenantSubdomain,
}: ResourceHubContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<ResourceArticle[]>(initialBookmarks);
  const [activeResource, setActiveResource] = useState<ResourceArticle | null>(null);
  const [isPending, startTransition] = useTransition();

  // Set selected category from URL search params on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      if (catParam) {
        setSelectedCategory(catParam);
        // If there's an active tab, keep it, but default category will apply
      }
    }
  }, []);

  const handleToggleBookmark = async (resourceId: string) => {
    startTransition(async () => {
      const res = await toggleBookmarkResource(tenantSubdomain, resourceId);
      if (res.success) {
        if (res.isBookmarked) {
          const added = allResources.find((r) => r.id === resourceId);
          if (added) setBookmarks((prev) => [...prev, added]);
        } else {
          setBookmarks((prev) => prev.filter((r) => r.id !== resourceId));
        }
      }
    });
  };

  // Filter resources based on tabs, search query, and category selection
  const filteredResources = allResources.filter((res) => {
    // 1. Tab filter
    if (activeTab === 'articles' && res.media_type !== 'article') return false;
    if (activeTab === 'videos' && res.media_type !== 'video') return false;
    if (activeTab === 'sounds' && res.media_type !== 'audio') return false;

    // 2. Category filter
    if (selectedCategory && res.category !== selectedCategory) return false;

    // 3. Search query
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = res.title.toLowerCase().includes(query);
      const matchesSummary = (res.summary ?? '').toLowerCase().includes(query);
      const matchesCategory = res.category.toLowerCase().includes(query);
      return matchesTitle || matchesSummary || matchesCategory;
    }

    return true;
  });

  const categories = Array.from(new Set(allResources.map((r) => r.category)));

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. CRISIS SUPREME BANNER */}
      {isCrisis && (
        <div className="p-6 bg-red-600 text-white rounded-3xl border border-red-700 shadow-xl space-y-4 animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Immediate Crisis Support Available</h3>
              <p className="text-xs opacity-90 mt-0.5">
                Our clinical systems have detected indicators of high distress. Please connect with immediate professional services.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <a
              href="tel:14416"
              className="px-4 py-2.5 bg-white text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xl transition shadow-md"
            >
              📞 Call Tele-MANAS (14416)
            </a>
            <button
              onClick={() => {
                const crisisResource = allResources.find((r) => r.category === 'Crisis Support');
                if (crisisResource) setActiveResource(crisisResource);
              }}
              className="px-4 py-2.5 bg-red-800 border border-red-500 hover:bg-red-900 text-white text-xs font-semibold rounded-xl transition"
            >
              📖 Open Mental Safety Guide
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2.5 bg-red-900/50 hover:bg-red-950 text-white text-xs font-semibold rounded-xl transition border border-red-500/20"
            >
              📅 Schedule Urgent Counselor Session
            </a>
          </div>
        </div>
      )}

      {/* 2. PERSONALIZED RECOMMENDATIONS PANEL */}
      {!isCrisis && recommendationReason && recommendedResources.length > 0 && (
        <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-indigo-900">Recommended for You</h4>
              <p className="text-xs text-indigo-700/95 leading-relaxed">{recommendationReason}</p>
            </div>
          </div>

          {/* Quick Recommendations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedResources.map((res) => {
              const meta = CATEGORY_META[res.category] || DEFAULT_META;
              const isBookmarked = bookmarks.some((b) => b.id === res.id);
              return (
                <div
                  key={res.id}
                  className={`p-4 bg-white border border-neutral-100 rounded-2xl flex flex-col justify-between hover:shadow-md transition duration-200 group`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.text}`}>
                        {res.category}
                      </span>
                      <button
                        onClick={() => handleToggleBookmark(res.id)}
                        disabled={isPending}
                        className="text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                      >
                        {isBookmarked ? '★' : '☆'}
                      </button>
                    </div>
                    <h5 className="text-xs font-bold text-neutral-800 line-clamp-2 group-hover:text-indigo-600 transition">
                      {res.title}
                    </h5>
                    <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                      {res.summary}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-neutral-50">
                    <span className="text-[10px] text-neutral-400 font-medium">{res.reading_time || '5 min read'}</span>
                    <button
                      onClick={() => setActiveResource(res)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold tracking-tight cursor-pointer"
                    >
                      Open Resource &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CONTROL BAR: TABS, SEARCH, CATEGORIES */}
      <div className="bg-white/80 backdrop-blur-md p-6 border border-neutral-100 rounded-3xl space-y-4 shadow-sm">
        {/* Tab Headers */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-100 pb-4 justify-between items-center">
          <div className="flex flex-wrap gap-1">
            {(['all', 'articles', 'videos', 'sounds'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedCategory(null); // Reset category selection on tab changes for better UX
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === tab
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                }`}
              >
                {tab === 'all' && 'All Resources'}
                {tab === 'articles' && 'Articles'}
                {tab === 'videos' && 'Guided Videos'}
                {tab === 'sounds' && 'Calming Content'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search content or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200/70 focus:border-neutral-400 focus:bg-white rounded-xl text-xs outline-none transition"
            />
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              selectedCategory === null
                ? 'bg-neutral-100 text-neutral-800 border-neutral-200'
                : 'bg-white text-neutral-500 border-neutral-100 hover:bg-neutral-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const meta = CATEGORY_META[cat] || DEFAULT_META;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? null : cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  isSelected
                    ? `${meta.bg} ${meta.text} ${meta.gradient.split(' ')[2]}`
                    : 'bg-white text-neutral-500 border-neutral-100 hover:bg-neutral-50'
                }`}
              >
                {meta.icon}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. BOOKMARKED ARTICLES PANEL */}
      {bookmarks.length > 0 && !selectedCategory && !searchQuery && activeTab === 'all' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            Your Bookmarked Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bookmarks.map((res) => {
              const meta = CATEGORY_META[res.category] || DEFAULT_META;
              return (
                <div
                  key={res.id}
                  className="p-5 bg-white border border-neutral-100 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${meta.bg} ${meta.text}`}>
                        {res.category}
                      </span>
                      <button
                        onClick={() => handleToggleBookmark(res.id)}
                        disabled={isPending}
                        className="text-rose-500 hover:text-rose-700 transition cursor-pointer text-sm"
                      >
                        ★
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-neutral-800 line-clamp-2">
                      {res.title}
                    </h4>
                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                      {res.summary}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-50">
                    <span className="text-[10px] text-neutral-400 font-medium">{res.reading_time || '5 min read'}</span>
                    <button
                      onClick={() => setActiveResource(res)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Open &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. MAIN LIBRARY GRID */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
          {activeTab === 'all' && 'All Curated Resources'}
          {activeTab === 'articles' && 'Curated Articles'}
          {activeTab === 'videos' && 'Guided Wellness Videos'}
          {activeTab === 'sounds' && 'Calming Audio & Ambience'}
          {selectedCategory && ` in ${selectedCategory}`}
        </h3>

        {filteredResources.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-neutral-200 rounded-3xl bg-white/50 space-y-3">
            <span className="text-3xl">🌿</span>
            <p className="text-sm text-neutral-500 font-medium">No resources found matching your filters.</p>
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((res) => {
              const meta = CATEGORY_META[res.category] || DEFAULT_META;
              const isBookmarked = bookmarks.some((b) => b.id === res.id);
              return (
                <div
                  key={res.id}
                  className="group bg-white border border-neutral-100 rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Card Header & Thumbnail */}
                  <div className="relative h-40 bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center p-6 overflow-hidden border-b border-neutral-50">
                    {/* Thematic Background Elements based on category */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-90`} />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        onClick={() => handleToggleBookmark(res.id)}
                        disabled={isPending}
                        className="p-1.5 bg-white/95 rounded-xl text-neutral-400 hover:text-rose-500 shadow-sm transition cursor-pointer text-xs"
                      >
                        {isBookmarked ? '★' : '☆'}
                      </button>
                    </div>

                    <div className="relative text-center z-10 space-y-2">
                      <div className={`mx-auto w-10 h-10 rounded-2xl ${meta.bg} ${meta.text} flex items-center justify-center shadow-sm`}>
                        {meta.icon}
                      </div>
                      <span className="block text-[9px] uppercase font-extrabold tracking-widest text-neutral-400">
                        {res.media_type === 'article' && 'Article'}
                        {res.media_type === 'video' && 'Guided Video'}
                        {res.media_type === 'audio' && 'Calming Audio'}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${meta.bg} ${meta.text}`}>
                          {res.category}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-semibold">
                          {res.reading_time || '5 min read'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-neutral-800 leading-snug group-hover:text-neutral-900 transition">
                        {res.title}
                      </h4>
                      <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3">
                        {res.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-50 flex justify-end">
                      <button
                        onClick={() => setActiveResource(res)}
                        className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border border-neutral-100 hover:border-neutral-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        {res.media_type === 'article' ? 'Read Article' : 'Open Resource'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. DYNAMIC OVERLAY MODAL FOR VIEWING RESOURCES */}
      {activeResource && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-neutral-100 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-100 flex justify-between items-start bg-neutral-50/50">
              <div className="space-y-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600">
                  {activeResource.category} &bull; {activeResource.reading_time || '5 min read'}
                </span>
                <h3 className="text-lg font-bold text-neutral-800 leading-tight">
                  {activeResource.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveResource(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {/* YouTube Embed Player for Video & Audio media types */}
              {(activeResource.media_type === 'video' || activeResource.media_type === 'audio') && activeResource.media_url ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-neutral-100">
                  <iframe
                    src={activeResource.media_url}
                    title={activeResource.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              ) : null}

              {/* Resource Content Body */}
              <div className="prose prose-neutral max-w-none text-sm text-neutral-700 leading-relaxed space-y-4">
                {activeResource.content_markdown ? (
                  activeResource.content_markdown.split('\n\n').map((paragraph, index) => {
                    if (paragraph.startsWith('# ')) {
                      return <h1 key={index} className="text-xl font-bold text-neutral-800 mt-4 mb-2">{paragraph.replace('# ', '')}</h1>;
                    }
                    if (paragraph.startsWith('## ')) {
                      return <h2 key={index} className="text-lg font-bold text-neutral-800 mt-3 mb-2">{paragraph.replace('## ', '')}</h2>;
                    }
                    if (paragraph.startsWith('### ')) {
                      return <h3 key={index} className="text-base font-bold text-neutral-800 mt-2 mb-1">{paragraph.replace('### ', '')}</h3>;
                    }
                    if (paragraph.startsWith('* ')) {
                      return (
                        <ul key={index} className="list-disc list-inside space-y-1 my-2">
                          {paragraph.split('\n').map((li, liIdx) => (
                            <li key={liIdx} className="text-neutral-600">{li.replace('* ', '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={index} className="whitespace-pre-line">{paragraph}</p>;
                  })
                ) : (
                  <p>No article content available.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <button
                onClick={() => handleToggleBookmark(activeResource.id)}
                disabled={isPending}
                className="px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-600 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {bookmarks.some((b) => b.id === activeResource.id) ? '★ Bookmarked' : '☆ Bookmark Resource'}
              </button>
              <button
                onClick={() => setActiveResource(null)}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

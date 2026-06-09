// src/app/[tenant]/community/feed-container.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CommunityPost, createPostAction } from '../../lib/actions/community.actions';
import { CommunityCard } from '../../components/community/community-card';
import { PIIWarning } from '../../components/community/pii-warning';
import { CrisisAlertModal } from '../../components/community/crisis-alert-modal';

interface FeedContainerProps {
  posts: CommunityPost[];
  currentUserId: string;
  currentUserRole: string;
  tenantSubdomain: string;
  activeFilter: 'recent' | 'trending';
  activeCategory: string;
  activeSearch: string;
  hasError: boolean;
}

const CATEGORIES = [
  'All',
  'Academic Stress',
  'Exam Anxiety',
  'Relationships',
  'Motivation',
  'Career',
  'Wellness',
  'General Support',
];

export function FeedContainer({
  posts,
  currentUserId,
  currentUserRole,
  tenantSubdomain,
  activeFilter,
  activeCategory,
  activeSearch,
  hasError,
}: FeedContainerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<CommunityPost['category']>('General Support');
  const [postAnon, setPostAnon] = useState(true);

  // Validation warnings
  const [isPiiClean, setIsPiiClean] = useState(true);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

  // Search input state
  const [searchInput, setSearchInput] = useState(activeSearch);

  const applyFilters = (updates: { filter?: string; category?: string; search?: string }) => {
    const params = new URLSearchParams();
    const f = updates.filter !== undefined ? updates.filter : activeFilter;
    const c = updates.category !== undefined ? updates.category : activeCategory;
    const s = updates.search !== undefined ? updates.search : activeSearch;

    if (f) params.set('filter', f);
    if (c && c !== 'All') params.set('category', c);
    if (s) params.set('search', s);

    router.push(`/${tenantSubdomain}/community?${params.toString()}`);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim() || !isPiiClean || isPending) return;

    startTransition(async () => {
      const res = await createPostAction(tenantSubdomain, postTitle, postContent, postCategory, postAnon);
      if (res.success) {
        // Clear and close
        setPostTitle('');
        setPostContent('');
        setPostCategory('General Support');
        setPostAnon(true);
        setIsWriteModalOpen(false);
        
        if (res.crisisTriggered) {
          setShowCrisisModal(true);
        }
      } else {
        alert(res.message || 'Failed to create post. Please try again.');
      }
    });
  };

  const triggerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search: searchInput });
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-3xl border border-neutral-100/70">
        {/* Search */}
        <form onSubmit={triggerSearch} className="w-full md:max-w-md flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search discussions..."
            className="w-full px-4 py-2 bg-white border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-2xl text-xs font-semibold transition"
          >
            Search
          </button>
        </form>

        {/* Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Feed Filter (Recent / Trending) */}
          <div className="flex bg-neutral-100 p-1 rounded-2xl">
            <button
              onClick={() => applyFilters({ filter: 'recent' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition duration-150 ${
                activeFilter === 'recent' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => applyFilters({ filter: 'trending' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition duration-150 ${
                activeFilter === 'trending' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Trending
            </button>
          </div>

          <button
            onClick={() => setIsWriteModalOpen(true)}
            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-2xl text-xs font-semibold transition shadow-sm"
          >
            ✍️ Write a Post
          </button>
        </div>
      </div>

      {/* Category Pill Picker */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => applyFilters({ category: cat })}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold border transition duration-150 ${
              activeCategory === cat
                ? 'bg-neutral-800 text-white border-neutral-800 shadow-sm'
                : 'bg-white text-neutral-600 border-neutral-100 hover:bg-neutral-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading/Error/Empty States */}
      {hasError ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-neutral-100 space-y-4">
          <span className="text-3xl">⚠️</span>
          <h3 className="text-lg font-semibold text-neutral-800">Unable to load discussion feed</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
            There was a connection issue loading the community posts. Please refresh the page to try again.
          </p>
          <button
            onClick={() => applyFilters({})}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Retry Connection
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-100 space-y-3">
          <span className="text-3xl">🌱</span>
          <h3 className="text-lg font-semibold text-neutral-800">No posts in this category</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
            Be the first to share an encouragement, question, or story in the {activeCategory === 'All' ? 'community' : `"${activeCategory}"`} channel!
          </p>
          <button
            onClick={() => setIsWriteModalOpen(true)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Create First Post
          </button>
        </div>
      ) : (
        /* Posts Feed */
        <div className="space-y-4">
          {posts.map((post) => (
            <CommunityCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              tenantSubdomain={tenantSubdomain}
            />
          ))}
        </div>
      )}

      {/* Write Post Dialog Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 border border-neutral-100 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-neutral-800 tracking-tight">Create Community Post</h3>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Title</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Summarize your thought..."
                  className="w-full p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition"
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Category Channel</label>
                <select
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value as any)}
                  className="w-full p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content body */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Discussion Content</label>
                <textarea
                  required
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What is on your mind? Share safely..."
                  rows={5}
                  className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition"
                />
              </div>

              {/* Safety warning scanner */}
              <PIIWarning text={`${postTitle} ${postContent}`} onValidationChange={setIsPiiClean} />

              <div className="flex justify-between items-center pt-2 flex-wrap gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postAnon}
                    onChange={(e) => setPostAnon(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-800 focus:ring-0"
                  />
                  Post Anonymously
                </label>

                <button
                  type="submit"
                  disabled={!postTitle.trim() || !postContent.trim() || !isPiiClean || isPending}
                  className="px-6 py-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-2xl text-xs font-semibold disabled:opacity-50 transition duration-150"
                >
                  {isPending ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crisis warning Modal */}
      <CrisisAlertModal isOpen={showCrisisModal} onClose={() => setShowCrisisModal(false)} />
    </div>
  );
}

// src/app/[tenant]/resources/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { CMSRepository } from '../../lib/repositories/cms.repository';
import { RecommendationService } from '../../lib/services/recommendation.service';
import { toggleBookmarkResource, logResourceViewEvent } from '../../lib/actions/cms.actions';

const cmsRepo = new CMSRepository();
const recommendationService = new RecommendationService();

export default async function StudentResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const viewArticleId = resolvedSearchParams.view || null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('institution_id, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // 1. If user clicked to view a specific article
  if (viewArticleId) {
    await logResourceViewEvent(viewArticleId);
  }

  // 2. Fetch list categories
  const allArticles = await cmsRepo.getResources(profile.institution_id);
  const bookmarks = await cmsRepo.getBookmarkedResources(user.id);
  const recentlyViewed = await cmsRepo.getRecentlyViewed(user.id);
  const recommended = await recommendationService.getPersonalizedRecommendations(user.id, profile.institution_id);

  // Server Action inline trigger for bookmarks form
  const handleToggleBookmark = async (formData: FormData) => {
    'use server';
    const resId = formData.get('resourceId') as string;
    if (resId) {
      await toggleBookmarkResource(process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims', resId);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-semibold text-neutral-800 tracking-tight">
          Resource Hub
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Explore articles, coping strategies, and wellness guides curated by your campus counseling center.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recommended & Recently Viewed Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          {/* Recommended Resources (Based on latest mood) */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Recommended for You
            </h3>
            <div className="space-y-3">
              {recommended.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No recommendations available.</p>
              ) : (
                recommended.map((art) => (
                  <div key={art.id} className="p-4 bg-white/70 border border-neutral-100 rounded-2xl space-y-2">
                    <span className="text-[9px] uppercase font-bold text-neutral-400">{art.category}</span>
                    <a
                      href={`/resources?view=${art.id}`}
                      className="block text-sm font-semibold text-neutral-700 hover:text-neutral-900"
                    >
                      {art.title}
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Viewed */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Recently Viewed
            </h3>
            <div className="space-y-3">
              {recentlyViewed.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No articles viewed recently.</p>
              ) : (
                recentlyViewed.map((art) => (
                  <div key={art.id} className="p-4 bg-white/70 border border-neutral-100 rounded-2xl">
                    <a
                      href={`/resources?view=${art.id}`}
                      className="block text-sm font-semibold text-neutral-700 hover:text-neutral-900"
                    >
                      {art.title}
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bookmarks & All Articles Listing */}
        <div className="lg:col-span-2 space-y-8">
          {/* Bookmarks Section */}
          {bookmarks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                Bookmarked Articles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bookmarks.map((art) => (
                  <div
                    key={art.id}
                    className="p-5 bg-white/70 border border-neutral-100 rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-400">{art.category}</span>
                      <a
                        href={`/resources?view=${art.id}`}
                        className="block text-sm font-semibold text-neutral-700 hover:text-neutral-900 mt-2"
                      >
                        {art.title}
                      </a>
                    </div>

                    <form action={handleToggleBookmark} className="mt-4 border-t border-neutral-50 pt-3 flex justify-between">
                      <input type="hidden" name="resourceId" value={art.id} />
                      <button type="submit" className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer">
                        Remove Bookmark
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Articles Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              All Wellness Articles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allArticles.length === 0 ? (
                <div className="sm:col-span-2 p-12 text-center border border-dashed border-neutral-200 rounded-3xl text-sm text-neutral-400">
                  No published articles found in your institution hub.
                </div>
              ) : (
                allArticles.map((art) => {
                  const isBookmarked = bookmarks.some((b) => b.id === art.id);
                  return (
                    <div
                      key={art.id}
                      className="p-5 bg-white/70 border border-neutral-100 rounded-2xl flex flex-col justify-between shadow-sm"
                    >
                      <div>
                        <span className="text-[9px] uppercase font-bold text-neutral-400">{art.category}</span>
                        <a
                          href={`/resources?view=${art.id}`}
                          className="block text-sm font-semibold text-neutral-700 hover:text-neutral-900 mt-2"
                        >
                          {art.title}
                        </a>
                      </div>

                      <form action={handleToggleBookmark} className="mt-4 border-t border-neutral-50 pt-3 flex justify-between">
                        <input type="hidden" name="resourceId" value={art.id} />
                        <button type="submit" className="text-xs text-neutral-500 hover:text-neutral-700 font-medium cursor-pointer">
                          {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
                        </button>
                      </form>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

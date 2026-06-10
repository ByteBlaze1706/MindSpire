// src/app/resources/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { CMSRepository } from '../../lib/repositories/cms.repository';
import { RecommendationService } from '../../lib/services/recommendation.service';
import { logResourceViewEvent } from '../../lib/actions/cms.actions';
import { ResourceHubContainer } from '../../components/resources/resource-hub-container';

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
  const allResources = await cmsRepo.getResources(profile.institution_id);
  const bookmarks = await cmsRepo.getBookmarkedResources(user.id);
  const recentlyViewed = await cmsRepo.getRecentlyViewed(user.id);
  
  // 3. Fetch personalized recommendations
  const {
    resources: recommendedResources,
    reason: recommendationReason,
    isCrisis,
  } = await recommendationService.getPersonalizedRecommendations(user.id, profile.institution_id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-800 tracking-tight">
          Resource Hub & Wellness Library
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Explore articles, coping strategies, guided videos, and calming audio playlists curated for NMIMS.
        </p>
      </div>

      <ResourceHubContainer
        allResources={allResources}
        initialBookmarks={bookmarks}
        recentlyViewed={recentlyViewed}
        recommendedResources={recommendedResources}
        recommendationReason={recommendationReason}
        isCrisis={isCrisis}
        tenantSubdomain="nmims"
      />
    </div>
  );
}

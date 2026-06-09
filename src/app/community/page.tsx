// src/app/[tenant]/community/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { UserRepository } from '../../lib/repositories/user.repository';
import { CommunityRepository, CommunityPost } from '../../lib/repositories/community.repository';
import { FeedContainer } from './feed-container'; // Client side container

const userRepo = new UserRepository();
const communityRepo = new CommunityRepository();

export default async function CommunityFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: 'recent' | 'trending'; category?: string; search?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await userRepo.getById(user.id);
  if (!profile) {
    redirect('/login');
  }

  const activeFilter = resolvedSearchParams.filter || 'recent';
  const activeCategory = resolvedSearchParams.category || 'All';
  const activeSearch = resolvedSearchParams.search || '';

  // Fetch posts from repository
  let posts: CommunityPost[] = [];
  let fetchError = false;
  try {
    posts = await communityRepo.getPosts(
      profile.institution_id,
      user.id,
      activeFilter,
      activeCategory,
      activeSearch
    );
  } catch (err) {
    fetchError = true;
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-neutral-800 tracking-tight">Community Feed</h1>
        <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">
          Connect anonymously with fellow students. Share, react, and support each other through academic, personal, and wellness journeys.
        </p>
      </div>

      <FeedContainer
        posts={posts}
        currentUserId={user.id}
        currentUserRole={profile.role}
        tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}
        activeFilter={activeFilter}
        activeCategory={activeCategory}
        activeSearch={activeSearch}
        hasError={fetchError}
      />
    </div>
  );
}

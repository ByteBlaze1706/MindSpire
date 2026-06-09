// src/app/[tenant]/community/post/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { UserRepository } from '../../../../lib/repositories/user.repository';
import { CommunityRepository } from '../../../../lib/repositories/community.repository';
import { CommunityCard } from '../../../../components/community/community-card';
import { CommentSection } from '../../../../components/community/comment-section';

const userRepo = new UserRepository();
const communityRepo = new CommunityRepository();

export default async function PostDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await userRepo.getById(user.id);
  if (!profile) {
    redirect('/login');
  }

  // Load post details and comments list
  const post = await communityRepo.getPostById(resolvedParams.id, user.id);
  if (!post) {
    notFound();
  }

  const comments = await communityRepo.getComments(resolvedParams.id, user.id);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition"
        >
          ← Back to Community Feed
        </Link>
      </div>

      {/* Main Post Card detailed */}
      <CommunityCard
        post={post}
        currentUserId={user.id}
        currentUserRole={profile.role}
        tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}
        isDetailed={true}
      />

      {/* Comment Section thread */}
      <div className="border-t border-neutral-100/70 pt-6">
        <CommentSection
          comments={comments}
          postId={post.id}
          currentUserId={user.id}
          currentUserRole={profile.role}
          tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}
        />
      </div>
    </div>
  );
}

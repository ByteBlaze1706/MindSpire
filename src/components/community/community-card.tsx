// src/components/community/community-card.tsx
'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { CommunityPost, toggleReactionAction, reportContentAction } from '../../lib/actions/community.actions';
import { AvatarGenerator } from './avatar-generator';

interface CommunityCardProps {
  post: CommunityPost;
  currentUserId: string;
  currentUserRole: string;
  tenantSubdomain: string;
  isDetailed?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Academic Stress': 'bg-orange-50 border-orange-100 text-orange-700',
  'Exam Anxiety': 'bg-rose-50 border-rose-100 text-rose-700',
  'Relationships': 'bg-purple-50 border-purple-100 text-purple-700',
  'Motivation': 'bg-amber-50 border-amber-100 text-amber-700',
  'Career': 'bg-indigo-50 border-indigo-100 text-indigo-700',
  'Wellness': 'bg-emerald-50 border-emerald-100 text-emerald-700',
  'General Support': 'bg-sky-50 border-sky-100 text-sky-700',
};

const REACTION_EMOJIS: Record<string, string> = {
  support: '🤗',
  helpful: '💡',
  relatable: '🌱',
  encouraging: '✨',
};

export function CommunityCard({
  post,
  currentUserId,
  currentUserRole,
  tenantSubdomain,
  isDetailed = false,
}: CommunityCardProps) {
  const [isPending, startTransition] = useTransition();
  const [reactions, setReactions] = useState(post.reaction_counts || {});
  const [userReacted, setUserReacted] = useState(post.user_reacted || {});
  const [isReported, setIsReported] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');

  const handleReaction = (type: 'support' | 'helpful' | 'relatable' | 'encouraging') => {
    if (isPending) return;

    // Optimistic UI update
    const currentlyReacted = userReacted[type];
    setUserReacted((prev) => ({ ...prev, [type]: !currentlyReacted }));
    setReactions((prev) => ({
      ...prev,
      [type]: Math.max(0, (prev[type] || 0) + (currentlyReacted ? -1 : 1)),
    }));

    startTransition(async () => {
      const res = await toggleReactionAction(tenantSubdomain, post.id, 'post', post.id, type);
      if (!res.success) {
        // Revert on failure
        setUserReacted((prev) => ({ ...prev, [type]: currentlyReacted }));
        setReactions((prev) => ({
          ...prev,
          [type]: Math.max(0, (prev[type] || 0) + (currentlyReacted ? 1 : -1)),
        }));
      }
    });
  };

  const handleReport = async () => {
    const res = await reportContentAction(tenantSubdomain, post.id, 'post', post.id, reportReason);
    if (res.success) {
      setIsReported(true);
      setShowReportModal(false);
    }
  };

  const isStaff = ['moderator', 'inst_admin', 'super_admin'].includes(currentUserRole);

  return (
    <div className="bg-white rounded-3xl border border-neutral-100 p-6 space-y-4 shadow-sm hover:shadow-md transition duration-200">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AvatarGenerator seed={post.is_anonymous ? post.pseudonym || 'Anon' : 'Staff'} size={36} />
          <div>
            <span className="block text-xs font-semibold text-neutral-800">
              {post.pseudonym}
            </span>
            <span className="block text-[10px] text-neutral-400">
              {new Date(post.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Category Tag */}
        <span
          className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-wider rounded-full ${
            CATEGORY_COLORS[post.category] || 'bg-neutral-50 text-neutral-700'
          }`}
        >
          {post.category}
        </span>
      </div>

      {/* Post Content */}
      <div className="space-y-2">
        {isDetailed ? (
          <h1 className="text-xl font-semibold text-neutral-800 tracking-tight">{post.title}</h1>
        ) : (
          <Link href={`/community/post/${post.id}`}>
            <h3 className="text-base font-semibold text-neutral-800 hover:text-neutral-600 transition duration-150 tracking-tight">
              {post.title}
            </h3>
          </Link>
        )}
        <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
          {isDetailed ? post.content : post.content.length > 200 ? `${post.content.slice(0, 200)}...` : post.content}
        </p>
      </div>

      {/* Moderator Statistics Panel */}
      {isStaff && post.is_anonymous && (
        <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-2xl flex flex-wrap justify-between items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
            🛡️ Mod View: Reputation Info
          </span>
          <div className="flex gap-4 text-xs font-medium text-neutral-600">
            <span>Helpful Score: <strong className="text-neutral-800">{(post as any).helpful_score ?? 0}</strong></span>
            <span>Reports: <strong className="text-neutral-800">{(post as any).report_count ?? 0}</strong></span>
            <span>Contributions: <strong className="text-neutral-800">{(post as any).positive_contributions ?? 0}</strong></span>
          </div>
        </div>
      )}

      {/* Toolbar / Actions Footer */}
      <div className="flex items-center justify-between border-t border-neutral-50 pt-4 flex-wrap gap-3">
        {/* Reactions List */}
        <div className="flex items-center gap-2">
          {(['support', 'helpful', 'relatable', 'encouraging'] as const).map((type) => {
            const count = reactions[type] || 0;
            const reacted = userReacted[type];
            return (
              <button
                key={type}
                onClick={() => handleReaction(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition duration-150 ${
                  reacted
                    ? 'bg-neutral-800 text-white border-neutral-800'
                    : 'bg-white hover:bg-neutral-50 text-neutral-500 border-neutral-100'
                }`}
              >
                <span>{REACTION_EMOJIS[type]}</span>
                {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Reply Link & Report */}
        <div className="flex items-center gap-3">
          {!isDetailed && (
            <Link
              href={`/community/post/${post.id}`}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition"
            >
              💬 Comment ({post.comment_count || 0})
            </Link>
          )}

          {isReported ? (
            <span className="text-xs font-semibold text-neutral-400">🚨 Reported</span>
          ) : (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs font-semibold text-neutral-400 hover:text-rose-600 transition"
            >
              🚨 Report
            </button>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 border border-neutral-100 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-800">Report Inappropriate Content</h3>
            <p className="text-xs text-neutral-500">
              Select the reason why this content violates community guidelines.
            </p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-700 outline-none"
            >
              <option value="Spam">Spam & Advertising</option>
              <option value="PII Exposure">Personal Details Exposed (PII)</option>
              <option value="Harassment">Harassment or Abuse</option>
              <option value="Self-Harm">Self-Harm Reference</option>
              <option value="Inappropriate">Inappropriate Language</option>
            </select>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

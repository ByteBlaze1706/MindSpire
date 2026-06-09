// src/components/community/comment-section.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { CommunityComment, createCommentAction, deleteCommentAction, toggleReactionAction } from '../../lib/actions/community.actions';
import { AvatarGenerator } from './avatar-generator';
import { PIIWarning } from './pii-warning';
import { CrisisAlertModal } from './crisis-alert-modal';

interface CommentSectionProps {
  comments: CommunityComment[];
  postId: string;
  currentUserId: string;
  currentUserRole: string;
  tenantSubdomain: string;
}

export function CommentSection({
  comments,
  postId,
  currentUserId,
  currentUserRole,
  tenantSubdomain,
}: CommentSectionProps) {
  const [commentText, setCommentText] = useState('');
  const [isAnonComment, setIsAnonComment] = useState(true);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const [isPiiCleanPost, setIsPiiCleanPost] = useState(true);
  const [isPiiCleanReply, setIsPiiCleanReply] = useState(true);
  
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Organise comments into top-level comments and replies
  const topLevelComments = comments.filter((c) => c.parent_id === null);
  const commentReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const handleCreateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isPiiCleanPost || isPending) return;

    startTransition(async () => {
      const res = await createCommentAction(tenantSubdomain, postId, commentText, isAnonComment, null);
      if (res.success) {
        setCommentText('');
        if (res.crisisTriggered) {
          setShowCrisisModal(true);
        }
      }
    });
  };

  const handleCreateReply = (parentId: string) => {
    if (!replyText.trim() || !isPiiCleanReply || isPending) return;

    startTransition(async () => {
      const res = await createCommentAction(tenantSubdomain, postId, replyText, isAnonComment, parentId);
      if (res.success) {
        setReplyText('');
        setReplyToId(null);
        if (res.crisisTriggered) {
          setShowCrisisModal(true);
        }
      }
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      startTransition(async () => {
        await deleteCommentAction(tenantSubdomain, postId, commentId);
      });
    }
  };

  const handleCommentReaction = (commentId: string, type: 'support' | 'helpful' | 'relatable' | 'encouraging') => {
    startTransition(async () => {
      await toggleReactionAction(tenantSubdomain, postId, 'comment', commentId, type);
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-neutral-800 tracking-tight">
        Comments ({comments.length})
      </h3>

      {/* Main Comment Box */}
      <form onSubmit={handleCreateComment} className="space-y-4 bg-white p-6 rounded-3xl border border-neutral-100">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Share your thoughts supportively..."
          rows={3}
          className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm text-neutral-700 outline-none focus:border-neutral-200 transition"
        />

        {/* PII warnings */}
        <PIIWarning text={commentText} onValidationChange={setIsPiiCleanPost} />

        <div className="flex justify-between items-center flex-wrap gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonComment}
              onChange={(e) => setIsAnonComment(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-800 focus:ring-0"
            />
            Comment Anonymously
          </label>

          <button
            type="submit"
            disabled={!commentText.trim() || !isPiiCleanPost || isPending}
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-2xl text-xs font-semibold disabled:opacity-50 transition duration-150"
          >
            {isPending ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200/50">
            <span className="text-2xl">💬</span>
            <p className="text-xs font-medium text-neutral-400 mt-2">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          topLevelComments.map((comment) => {
            const replies = commentReplies(comment.id);
            const isOwn = comment.user_id === currentUserId;

            return (
              <div key={comment.id} className="space-y-4">
                {/* Top Level Comment Card */}
                <div className="bg-white p-5 rounded-3xl border border-neutral-100/70 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <AvatarGenerator seed={comment.is_anonymous ? comment.pseudonym || 'Anon' : 'Staff'} size={28} />
                      <div>
                        <span className="block text-xs font-semibold text-neutral-700">
                          {comment.pseudonym}
                        </span>
                        <span className="block text-[10px] text-neutral-400">
                          {new Date(comment.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {isOwn && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition uppercase tracking-wider"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                    {comment.content}
                  </p>

                  {/* Comment Actions Footer */}
                  <div className="flex items-center justify-between border-t border-neutral-50/50 pt-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      {(['support', 'helpful', 'relatable', 'encouraging'] as const).map((type) => {
                        const count = comment.reaction_counts?.[type] || 0;
                        const reacted = comment.user_reacted?.[type];
                        return (
                          <button
                            key={type}
                            onClick={() => handleCommentReaction(comment.id, type)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium border flex items-center gap-1 transition ${
                              reacted
                                ? 'bg-neutral-800 text-white border-neutral-800'
                                : 'bg-white text-neutral-400 border-neutral-100 hover:bg-neutral-50'
                            }`}
                          >
                            <span>{type === 'support' ? '🤗' : type === 'helpful' ? '💡' : type === 'relatable' ? '🌱' : '✨'}</span>
                            {count > 0 && <span className="font-bold">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setReplyToId(replyToId === comment.id ? null : comment.id);
                        setReplyText('');
                      }}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-700 uppercase tracking-wider"
                    >
                      Reply
                    </button>
                  </div>
                </div>

                {/* Reply Form */}
                {replyToId === comment.id && (
                  <div className="pl-8 space-y-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${comment.pseudonym}...`}
                      rows={2}
                      className="w-full p-3 bg-white border border-neutral-100 rounded-2xl text-xs text-neutral-700 outline-none focus:border-neutral-200 transition shadow-inner"
                    />
                    <PIIWarning text={replyText} onValidationChange={setIsPiiCleanReply} />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyToId(null)}
                        className="py-1.5 px-3 bg-neutral-100 text-neutral-600 rounded-xl text-[10px] font-bold transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreateReply(comment.id)}
                        disabled={!replyText.trim() || !isPiiCleanReply || isPending}
                        className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-[10px] font-bold transition disabled:opacity-50"
                      >
                        Submit Reply
                      </button>
                    </div>
                  </div>
                )}

                {/* Nested Replies (Depth 2) */}
                {replies.length > 0 && (
                  <div className="pl-8 border-l border-neutral-100/70 space-y-4">
                    {replies.map((reply) => {
                      const isReplyOwn = reply.user_id === currentUserId;
                      return (
                        <div key={reply.id} className="bg-neutral-50/50 p-4 rounded-3xl border border-neutral-100/50 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                              <AvatarGenerator seed={reply.is_anonymous ? reply.pseudonym || 'Anon' : 'Staff'} size={24} />
                              <div>
                                <span className="block text-xs font-semibold text-neutral-700">
                                  {reply.pseudonym}
                                </span>
                                <span className="block text-[9px] text-neutral-400">
                                  {new Date(reply.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>

                            {isReplyOwn && (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="text-[9px] font-bold text-rose-500 hover:text-rose-700 transition uppercase tracking-wider"
                              >
                                Delete
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                            {reply.content}
                          </p>

                          {/* Reply Reactions toolbar */}
                          <div className="flex gap-1 pt-1">
                            {(['support', 'helpful', 'relatable', 'encouraging'] as const).map((type) => {
                              const count = reply.reaction_counts?.[type] || 0;
                              const reacted = reply.user_reacted?.[type];
                              return (
                                <button
                                  key={type}
                                  onClick={() => handleCommentReaction(reply.id, type)}
                                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium border flex items-center gap-1 transition ${
                                    reacted
                                      ? 'bg-neutral-800 text-white border-neutral-800'
                                      : 'bg-white text-neutral-400 border-neutral-100 hover:bg-neutral-50'
                                  }`}
                                >
                                  <span>{type === 'support' ? '🤗' : type === 'helpful' ? '💡' : type === 'relatable' ? '🌱' : '✨'}</span>
                                  {count > 0 && <span className="font-bold">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Crisis warning Modal */}
      <CrisisAlertModal isOpen={showCrisisModal} onClose={() => setShowCrisisModal(false)} />
    </div>
  );
}

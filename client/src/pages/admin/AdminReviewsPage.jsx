import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductImage from '../../components/ProductImage';
import { Stars } from '../../components/StarRating';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../components/motion/variants';

export default function AdminReviewsPage() {
  const { addToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyEditId, setReplyEditId] = useState(null);
  const [replyValue, setReplyValue] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    api
      .fetchAdminReviews()
      .then(setReviews)
      .catch(() => addToast('Failed to load reviews', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const openReply = (r) => {
    setReplyEditId(r._id);
    setReplyValue(r.reply?.text || '');
  };

  const saveReply = async (r) => {
    const text = replyValue.trim();
    if (!text) {
      addToast('Reply cannot be empty', 'error');
      return;
    }
    setSavingReply(true);
    try {
      const updated = await api.replyToReview(r._id, text);
      setReviews((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      addToast('Reply posted — it now shows on the product page');
      setReplyEditId(null);
      setReplyValue('');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save reply', 'error');
    } finally {
      setSavingReply(false);
    }
  };

  const onDelete = async (r) => {
    if (confirmDeleteId !== r._id) {
      setConfirmDeleteId(r._id);
      setTimeout(() => setConfirmDeleteId((id) => (id === r._id ? null : id)), 3000);
      return;
    }
    try {
      await api.deleteReview(r._id);
      setReviews((prev) => prev.filter((x) => x._id !== r._id));
      addToast('Review deleted');
    } catch {
      addToast('Failed to delete review', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-36 bg-bg-alt rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h1 className="font-heading text-3xl text-ink mb-1">Reviews</h1>
      <p className="text-ink-light text-sm mb-5">
        Customer reviews from delivered orders — replies appear publicly on the product page
      </p>

      {reviews.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-ink-light">No reviews yet.</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="enter" className="space-y-4">
          {reviews.map((r) => (
            <motion.div key={r._id} variants={staggerItem} className="card p-5">
              {/* header: product + customer + rating */}
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <ProductImage
                  src={r.productId?.imageUrl}
                  alt={r.productId?.name ?? 'Product'}
                  padding="p-1"
                  className="w-10 h-10 flex-shrink-0 !bg-white border border-border/60"
                />
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-medium text-ink truncate">
                    {r.productId?.name ?? 'Deleted product'}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {r.userId?.name ?? 'Unknown customer'}
                    {r.userId?.email ? ` · ${r.userId.email}` : ''} ·{' '}
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <Stars value={r.rating} />
                <button
                  onClick={() => onDelete(r)}
                  className={`text-xs px-2.5 py-1 rounded-card transition-all duration-150 ${
                    confirmDeleteId === r._id
                      ? 'bg-danger text-white'
                      : 'text-ink-faint hover:text-danger hover:bg-danger-light'
                  }`}
                >
                  {confirmDeleteId === r._id ? 'Confirm' : 'Delete'}
                </button>
              </div>

              {r.comment && <p className="text-sm text-ink-light leading-relaxed mb-2">{r.comment}</p>}

              {r.images?.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {r.images.map((url, i) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
                      <img
                        src={url}
                        alt={`Customer photo ${i + 1}`}
                        className="w-16 h-16 object-cover rounded-card border border-border hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}

              {/* reply area */}
              {replyEditId === r._id ? (
                <div className="mt-2">
                  <textarea
                    value={replyValue}
                    onChange={(e) => setReplyValue(e.target.value)}
                    placeholder="Write a public response as Annz Bricks..."
                    rows={3}
                    maxLength={1000}
                    className="input-field resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveReply(r)}
                      disabled={savingReply}
                      className="btn-primary !px-3 !py-1.5 text-xs"
                    >
                      {savingReply ? 'Posting...' : 'Post reply'}
                    </button>
                    <button
                      onClick={() => { setReplyEditId(null); setReplyValue(''); }}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : r.reply?.text ? (
                <div className="mt-2 ml-3 pl-3 border-l-2 border-accent/40 bg-bg-alt/50 rounded-r-card py-2.5 pr-3">
                  <p className="text-xs font-medium text-ink mb-0.5">
                    Your response
                    {r.reply.at && (
                      <span className="text-ink-faint font-normal">
                        {' · '}
                        {new Date(r.reply.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <button
                      onClick={() => openReply(r)}
                      className="text-accent hover:text-accent-hover font-medium ml-2"
                    >
                      Edit
                    </button>
                  </p>
                  <p className="text-sm text-ink-light leading-relaxed">{r.reply.text}</p>
                </div>
              ) : (
                <button
                  onClick={() => openReply(r)}
                  className="btn-secondary !px-3 !py-1.5 text-xs mt-1"
                >
                  Reply
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

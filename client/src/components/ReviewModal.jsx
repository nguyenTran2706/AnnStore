import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';
import ProductImage from './ProductImage';
import { StarInput } from './StarRating';

const MAX_IMAGES = 3;
const MAX_SIZE = 5 * 1024 * 1024;

export default function ReviewModal({ order, item, onClose, onSubmitted }) {
  const { addToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState([]); // [{ file, url }]
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [googleUrl, setGoogleUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.fetchConfig().then((c) => setGoogleUrl(c.googleReviewUrl)).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Release object URLs on unmount
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  const addFiles = (list) => {
    setError(null);
    const incoming = Array.from(list);
    const next = [...files];
    for (const file of incoming) {
      if (next.length >= MAX_IMAGES) {
        setError(`Up to ${MAX_IMAGES} photos`);
        break;
      }
      if (!file.type.startsWith('image/')) {
        setError('Photos only (JPG, PNG, WebP, GIF)');
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError('Each photo must be under 5MB');
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setFiles(next);
  };

  const removeFile = (i) => {
    URL.revokeObjectURL(files[i].url);
    setFiles(files.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Pick a star rating first');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('productId', item.productId);
      fd.append('orderId', order._id);
      fd.append('rating', String(rating));
      fd.append('comment', comment.trim());
      files.forEach((f) => fd.append('images', f.file));
      await api.createReview(fd);
      onSubmitted?.();
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-card w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-modal anim-scale">
        {done ? (
          /* success state */
          <div className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="w-14 h-14 rounded-full bg-success/10 border-2 border-success flex items-center justify-center mx-auto mb-4"
            >
              <motion.svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
                />
              </motion.svg>
            </motion.div>
            <h2 className="font-heading text-2xl text-ink mb-2">Thanks for your review!</h2>
            <p className="text-ink-light text-sm mb-6">
              Your review helps other collectors — it will appear on the product page.
            </p>
            {googleUrl && (
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full flex items-center justify-center gap-2 mb-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Also review us on Google
              </a>
            )}
            <button onClick={onClose} className="btn-primary w-full">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-heading text-lg text-ink">Review your purchase</h2>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-alt text-ink-light hover:text-ink transition-colors" aria-label="Close">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-5 space-y-4">
              {/* product being reviewed */}
              <div className="flex items-center gap-3 bg-bg-alt/50 rounded-card p-3">
                <ProductImage src={item.imageUrl} alt={item.name} padding="p-1" className="w-12 h-12 flex-shrink-0 !bg-white border border-border/60" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                  <p className="text-xs text-ink-faint">Order {order.orderNumber}</p>
                </div>
              </div>

              {error && (
                <div className="bg-danger-light text-danger text-sm rounded-card px-3.5 py-2.5">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-ink-light mb-1.5">Your rating</label>
                <StarInput value={rating} onChange={(v) => { setRating(v); setError(null); }} />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="review-comment">
                  Your review (optional)
                </label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How's the set? Build experience, part quality, missing pieces..."
                  rows={4}
                  maxLength={1000}
                  className="input-field resize-none"
                />
              </div>

              {/* photos */}
              <div>
                <label className="block text-xs font-medium text-ink-light mb-1.5">
                  Photos (optional, up to {MAX_IMAGES})
                </label>
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={f.url} className="relative w-20 h-20">
                      <img src={f.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-card border border-border" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center hover:bg-danger transition-colors"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {files.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="w-20 h-20 rounded-card border-2 border-dashed border-border hover:border-accent hover:text-accent text-ink-faint flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      <span className="text-[10px]">Add photo</span>
                    </button>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit review'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

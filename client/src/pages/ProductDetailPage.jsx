import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';
import { Stars } from '../components/StarRating';

const infoStagger = {
  initial: {},
  enter: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const infoItem = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [reviewData, setReviewData] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setQuantity(1);
      try {
        setProduct(await api.fetchProduct(id));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
    api.fetchProductReviews(id).then(setReviewData).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-6">
        <div className="card p-4">
          <div className="aspect-square bg-bg-alt rounded-card animate-pulse" />
        </div>
        <div className="space-y-4 pt-4">
          <div className="h-4 w-32 bg-bg-alt rounded animate-pulse" />
          <div className="h-10 w-3/4 bg-bg-alt rounded animate-pulse" />
          <div className="h-6 w-24 bg-bg-alt rounded animate-pulse" />
          <div className="h-20 w-full bg-bg-alt rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-heading text-2xl text-ink mb-2">Product not found</h1>
        <p className="text-ink-light max-w-sm mb-6">
          This product may have been removed from the catalogue.
        </p>
        <Link to="/" className="btn-primary">
          Back to the shop
        </Link>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  const onAdd = async () => {
    if (outOfStock || adding) return;
    setAdding(true);
    const ok = await addToCart(product, quantity);
    setAdding(false);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 pt-6">
      {/* image */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="card p-4"
      >
        <ProductImage src={product.imageUrl} alt={product.name} aspect="square" padding="p-10" eager>
          {outOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-card">
              <span className="bg-red-600 text-white text-sm font-bold px-5 py-2 rounded-full uppercase tracking-wider shadow-lg">
                Sold Out
              </span>
            </div>
          )}
        </ProductImage>
      </motion.div>

      {/* info */}
      <motion.div variants={infoStagger} initial="initial" animate="enter" className="flex flex-col">
        <motion.nav variants={infoItem} className="text-xs text-ink-faint mb-3">
          <Link to="/" className="hover:text-ink transition-colors">Shop</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-light">{product.category}</span>
        </motion.nav>

        <motion.h1 variants={infoItem} className="font-heading text-3xl sm:text-4xl text-ink mb-3">
          {product.name}
        </motion.h1>

        {reviewData?.count > 0 && (
          <motion.a
            variants={infoItem}
            href="#reviews"
            className="flex items-center gap-1.5 mb-3 text-sm text-ink-light hover:text-ink transition-colors w-fit"
          >
            <Stars value={reviewData.avg} />
            <span className="font-medium text-ink">{reviewData.avg}</span>
            <span>
              · {reviewData.count} review{reviewData.count !== 1 ? 's' : ''}
            </span>
          </motion.a>
        )}

        <motion.div variants={infoItem} className="flex items-baseline gap-3 mb-4">
          <span className="text-2xl font-semibold text-ink">${product.price.toFixed(2)}</span>
          {outOfStock ? (
            <span className="badge bg-danger-light text-danger">Sold out</span>
          ) : product.stock <= 5 ? (
            <span className="text-sm text-yellow-600 font-medium">Only {product.stock} left!</span>
          ) : (
            <span className="text-sm text-success font-medium">{product.stock} in stock</span>
          )}
        </motion.div>

        <motion.p variants={infoItem} className="text-ink-light text-sm leading-relaxed mb-4">
          {product.description}
        </motion.p>

        <motion.div variants={infoItem} className="mb-8">
          <span className="badge bg-bg-alt text-ink-light border border-border">{product.category}</span>
        </motion.div>

        {!outOfStock && (
          <motion.div variants={infoItem} className="flex items-center gap-4 mb-4">
            <span className="text-sm text-ink-light">Quantity</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-card border border-border text-ink-light hover:border-border-hover hover:text-ink flex items-center justify-center transition-colors disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="text-sm font-medium text-ink w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
                className="w-8 h-8 rounded-card border border-border text-ink-light hover:border-border-hover hover:text-ink flex items-center justify-center transition-colors disabled:opacity-40"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </motion.div>
        )}

        <motion.div variants={infoItem}>
          <motion.button
            onClick={onAdd}
            disabled={outOfStock || adding}
            whileTap={outOfStock ? undefined : { scale: 0.98 }}
            className={`w-full sm:w-80 !py-3.5 flex items-center justify-center gap-2 font-medium rounded-card transition-colors duration-200 ${
              outOfStock ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'btn-primary'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {adding ? (
                <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                </motion.span>
              ) : added ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Added to cart
                </motion.span>
              ) : (
                <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {outOfStock ? 'Sold Out' : 'Add to cart'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>

    {/* reviews */}
    <section id="reviews" className="mt-14 max-w-3xl scroll-mt-20">
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="font-heading text-2xl text-ink">Reviews</h2>
        {reviewData?.count > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-ink-light">
            <Stars value={reviewData.avg} />
            <span className="font-medium text-ink">{reviewData.avg}</span> · {reviewData.count} review
            {reviewData.count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!reviewData || reviewData.count === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-ink-light text-sm">
            No reviews yet — order this set and be the first to review it once it's delivered.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewData.reviews.map((r) => (
            <div key={r._id} className="card p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Stars value={r.rating} />
                <span className="text-sm font-medium text-ink">{r.userId?.name ?? 'Customer'}</span>
                <span className="text-xs text-ink-faint">
                  {new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="badge bg-success/10 text-success text-[10px]">Verified purchase</span>
              </div>

              {r.comment && <p className="text-sm text-ink-light leading-relaxed">{r.comment}</p>}

              {r.images?.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {r.images.map((url, i) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
                      <img
                        src={url}
                        alt={`Customer photo ${i + 1}`}
                        className="w-20 h-20 object-cover rounded-card border border-border hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}

              {r.reply?.text && (
                <div className="mt-3 ml-3 pl-3 border-l-2 border-accent/40 bg-bg-alt/50 rounded-r-card py-2.5 pr-3">
                  <p className="text-xs font-medium text-ink mb-0.5">
                    Response from Annz Bricks
                    {r.reply.at && (
                      <span className="text-ink-faint font-normal">
                        {' · '}
                        {new Date(r.reply.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-ink-light leading-relaxed">{r.reply.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
    </>
  );
}

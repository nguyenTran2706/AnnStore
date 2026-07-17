import { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import ProductImage from './ProductImage';
import { useStaggerItem } from './motion/variants';

const MotionLink = motion(Link);

// forwardRef is required: AnimatePresence mode="popLayout" measures its
// direct children via ref, and without it exit animations never complete.
const ProductCard = forwardRef(function ProductCard({ product }, ref) {
  const { addToCart } = useCart();
  const itemVariants = useStaggerItem();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock <= 0;

  const onAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || adding) return;
    setAdding(true);
    const ok = await addToCart(product, 1);
    setAdding(false);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 800);
    }
  };

  return (
    <MotionLink
      ref={ref}
      to={`/products/${product._id}`}
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className={`card-interactive overflow-hidden flex flex-col ${outOfStock ? 'opacity-80' : ''}`}
    >
      {/* image */}
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        aspect="square"
        padding="p-6"
        className="!rounded-b-none"
      >
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
              Sold Out
            </span>
          </div>
        )}

        {!outOfStock && product.stock <= 3 && (
          <div className="absolute top-2 right-2">
            <span className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              Only {product.stock} left!
            </span>
          </div>
        )}
      </ProductImage>

      {/* info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-ink text-sm leading-snug line-clamp-1">
            {product.name}
          </h3>
          <span className="badge bg-bg-alt text-ink-light border border-border flex-shrink-0">
            {product.category}
          </span>
        </div>

        <p className="text-ink-faint text-xs leading-relaxed mb-3 line-clamp-2 flex-1">
          {product.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div>
            <span className="text-lg font-semibold text-ink">${product.price.toFixed(2)}</span>
            {!outOfStock && (
              <span className={`text-xs ml-1.5 ${product.stock <= 5 ? 'text-yellow-600 font-medium' : 'text-ink-faint'}`}>
                {product.stock} left
              </span>
            )}
          </div>

          <motion.button
            onClick={onAdd}
            disabled={outOfStock || adding}
            whileTap={outOfStock ? undefined : { scale: 0.95 }}
            className={`!px-3 !py-1.5 text-xs flex items-center gap-1.5 font-medium rounded-card transition-colors duration-200 min-w-[86px] justify-center ${
              outOfStock ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'btn-primary'
            }`}
            aria-label={outOfStock ? `${product.name} is sold out` : `Add ${product.name} to cart`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {adding ? (
                <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </motion.span>
              ) : added ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </motion.span>
              ) : (
                <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {outOfStock ? 'Sold Out' : 'Add to cart'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </MotionLink>
  );
});

export default ProductCard;

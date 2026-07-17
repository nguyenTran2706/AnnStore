import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import ProductImage from './ProductImage';
import { drawerSpring } from './motion/variants';

export default function CartDrawer() {
  const { items, subtotal, cartOpen, setCartOpen, updateQty, removeItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && cartOpen) setCartOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cartOpen, setCartOpen]);

  const onCheckout = () => {
    setCartOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setCartOpen(false)}
          />

          {/* drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={drawerSpring}
            className="fixed top-0 right-0 z-50 h-full w-full sm:w-[380px] bg-white border-l border-border shadow-modal flex flex-col"
            role="dialog"
            aria-label="Shopping cart"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-heading text-lg text-ink">Your cart</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1.5 rounded-card hover:bg-bg-alt text-ink-light hover:text-ink transition-colors"
                aria-label="Close cart"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <svg className="w-12 h-12 text-ink-faint/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-ink-light text-sm mb-1">Your cart is empty</p>
                  <p className="text-ink-faint text-xs mb-4">Browse our collection to get started</p>
                  <button onClick={() => setCartOpen(false)} className="btn-secondary text-xs">
                    Browse products
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item._id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-3 p-3 rounded-card bg-bg-alt/50"
                    >
                      <ProductImage
                        src={item.imageUrl}
                        alt={item.name}
                        padding="p-1.5"
                        className="w-16 h-16 flex-shrink-0 !bg-white border border-border/60"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-ink truncate">{item.name}</h4>
                        <p className="text-ink-light text-xs">${item.price.toFixed(2)}</p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => updateQty(item, item.quantity - 1)}
                            className="w-6 h-6 rounded border border-border text-ink-light hover:border-border-hover hover:text-ink flex items-center justify-center text-xs transition-colors"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="text-xs font-medium text-ink w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item, item.quantity + 1)}
                            className="w-6 h-6 rounded border border-border text-ink-light hover:border-border-hover hover:text-ink flex items-center justify-center text-xs transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <span className="text-sm font-medium text-ink">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item)}
                          className="text-ink-faint hover:text-danger transition-colors p-0.5"
                          aria-label={`Remove ${item.name}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* summary */}
            {items.length > 0 && (
              <div className="px-5 py-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm text-ink-light">
                  <span>Subtotal</span>
                  <span className="font-medium text-ink">${subtotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-ink-faint">Taxes calculated at checkout</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onCheckout}
                  className="btn-primary w-full mt-2"
                >
                  Checkout
                </motion.button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

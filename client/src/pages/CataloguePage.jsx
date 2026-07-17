import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import * as api from '../services/api';
import ProductCard from '../components/ProductCard';
import { staggerContainer } from '../components/motion/variants';

const heroStagger = {
  initial: {},
  enter: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const heroItem = {
  initial: { opacity: 0, y: 16 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function CataloguePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const gridRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setProducts(await api.fetchProducts());
      } catch {
        setError('Could not load products. Please check that the server is running.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    return ['All', ...cats.sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === 'All' || p.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <>
      {/* hero */}
      <section
        className="relative -mx-4 sm:-mx-6 -mt-6 mb-10 overflow-hidden"
        style={{
          backgroundImage: `url('/images/Minifigure%20Heads%20-%20Pile%20-%20Desktop%20widescreeen.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/30" />
        <motion.div
          variants={heroStagger}
          initial="initial"
          animate="enter"
          className="relative px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto"
        >
          <motion.h1 variants={heroItem} className="font-heading text-4xl sm:text-6xl text-ink mb-3">
            Annz Bricks
          </motion.h1>
          <motion.p variants={heroItem} className="text-ink-light text-base sm:text-lg max-w-md mb-6">
            Vintage LEGO sets, rare and hard to find — hand-picked for collectors.
          </motion.p>
          <motion.div variants={heroItem}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="btn-primary !px-6 !py-3"
            >
              Shop the collection
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      <section ref={gridRef} className="scroll-mt-20">
        {/* heading */}
        <div className="mb-6">
          <h2 className="font-heading text-3xl sm:text-4xl text-ink mb-1">Our Collection</h2>
          <p className="text-ink-light text-sm">Vintage Lego Sets, Rare and Hard to Find!</p>
        </div>

        {/* filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-card text-xs font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-ink text-white scale-105'
                    : 'bg-bg-alt text-ink-light hover:text-ink border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative sm:ml-auto">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9 !py-2 sm:w-56 text-sm"
              aria-label="Search products"
            />
          </div>
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink-light mb-3">No products match your search.</p>
            <button
              onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
              className="btn-secondary text-xs"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="enter"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </motion.div>
        )}
      </section>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 pt-8">
      <div className="h-8 w-48 bg-bg-alt rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-0 overflow-hidden">
            <div className="bg-bg-alt h-52 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 bg-bg-alt rounded animate-pulse" />
              <div className="h-3 w-full bg-bg-alt rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-bg-alt rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="font-heading text-2xl text-ink mb-2">Something went wrong</h2>
      <p className="text-ink-light max-w-sm mb-6">{message}</p>
      <button onClick={() => window.location.reload()} className="btn-primary">
        Try again
      </button>
    </div>
  );
}

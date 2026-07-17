import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import CartDrawer from '../CartDrawer';
import { usePageVariants } from '../motion/variants';

export default function RootLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const pageVariants = usePageVariants();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Navbar />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16"
        >
          {outlet}
        </motion.main>
      </AnimatePresence>

      <CartDrawer />
    </div>
  );
}

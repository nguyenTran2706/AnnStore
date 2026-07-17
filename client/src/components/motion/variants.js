import { useReducedMotion } from 'framer-motion';

/* ── Page transitions (RootLayout) ── */
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

const pageVariantsReduced = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export function usePageVariants() {
  return useReducedMotion() ? pageVariantsReduced : pageVariants;
}

/* ── Staggered grids / lists ── */
export const staggerContainer = {
  initial: {},
  enter: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function useStaggerItem() {
  return useReducedMotion()
    ? { initial: { opacity: 0 }, enter: { opacity: 1, transition: { duration: 0.25 } } }
    : staggerItem;
}

/* ── Drawer / modal springs ── */
export const drawerSpring = { type: 'spring', damping: 30, stiffness: 300 };

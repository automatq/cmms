import type { Variants, Transition } from 'framer-motion'

// Re-export so consumers gate animations on the user's reduced-motion setting:
//   const reduce = useReducedMotion()
//   <motion.div {...(reduce ? {} : { variants: fadeInUp })} />
// App-wide, prefer wrapping a subtree in <MotionConfig reducedMotion="user"> so
// framer respects the OS setting automatically.
export { useReducedMotion } from 'framer-motion'

/** Smooth, slightly-overshooting ease (easeOutExpo-like) for entrances. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** Snappy spring for layout/drag reflow. */
export const SPRING: Transition = { type: 'spring', stiffness: 400, damping: 32 }

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: EASE_OUT } },
}

/** Parent that staggers its children's `show` transitions (list reveal). */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}

/** Child for use inside `staggerContainer`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
}

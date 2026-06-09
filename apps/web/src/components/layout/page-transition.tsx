'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { fadeInUp, useReducedMotion } from '@/lib/motion'

/**
 * Subtle enter animation on each route change (keyed by pathname). Enter-only —
 * App Router unmounts the previous tree before the next renders, so there is no
 * exit phase to coordinate. Skipped entirely under prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduce = useReducedMotion()

  if (reduce) return <>{children}</>

  return (
    <motion.div key={pathname} initial="hidden" animate="show" variants={fadeInUp}>
      {children}
    </motion.div>
  )
}

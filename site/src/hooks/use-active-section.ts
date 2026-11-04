import { useEffect, useState } from 'react'

/** The id of the section currently crossing the band that `rootMargin` leaves in the
 *  viewport. Keeps the last match when none crosses it, such as over the footer.
 *  `sectionIds` must be a stable reference. */
export function useActiveSection(sectionIds: readonly string[], rootMargin: string) {
  const [activeId, setActiveId] = useState(sectionIds[0])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const crossing = entries.find((entry) => entry.isIntersecting)
        if (crossing) setActiveId(crossing.target.id)
      },
      { rootMargin },
    )

    for (const id of sectionIds) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [sectionIds, rootMargin])

  return activeId
}

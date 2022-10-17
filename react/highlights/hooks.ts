import { useEffect, useState } from 'react'
import { useStore } from './Store'

export function useHydration() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated)
  const setGlobalHydrationStatus = useStore((s) => s._setHasHydrated)

  useEffect(() => {
    // register onHydrate listener and handler for unsubscribing
    const unsubOnHydrate = useStore.persist.onHydrate(() => {
      // update _hasHydrated in global store
      setGlobalHydrationStatus(false)

      // update local hydration state for hook
      setHydrated(false)
    })

    // register onFinishHydration listener and handler for unsubscribing
    const unsubOnFinishHydration = useStore.persist.onFinishHydration(() => {
      // update _hasHydrated in global store
      setGlobalHydrationStatus(true)

      // update local hydration state for hook
      setHydrated(true)
    })

    // set hydration status on mount
    setHydrated(useStore.persist.hasHydrated())

    // unsubscribe listeners on unmount
    return () => {
      unsubOnHydrate()
      unsubOnFinishHydration()
    }
  }, [])

  return hydrated
}

import { useCallback, useEffect, useState } from 'react'

export function useRemoteResource<T>(
  fetcher: () => Promise<T>,
  fallback: T
) {
  const [data, setData] = useState<T>(fallback)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      try {
        const response = await fetcher()
        if (response !== null && response !== undefined) {
          setData(response)
        } else {
          setData(fallback)
        }
      } catch (fetchError) {
        setData(fallback)
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to fetch latest data'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [fallback, fetcher]
  )

  useEffect(() => {
    void load()
  }, [load])

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    reload: () => load(true)
  }
}

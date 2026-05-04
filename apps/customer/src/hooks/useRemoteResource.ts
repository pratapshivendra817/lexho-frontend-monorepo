import { useCallback, useEffect, useState } from 'react'

export function useRemoteResource<T>(
  fetcher: () => Promise<T>,
  fallback: T
) {
  const [data, setData] = useState<T>(fallback)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      try {
        const response = await fetcher()
        if (response !== undefined && response !== null) {
          setData(response)
        } else {
          setData(fallback)
        }
      } catch (requestError) {
        setData(fallback)
        setError(
          requestError instanceof Error
            ? requestError.message
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
    void load(false)
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

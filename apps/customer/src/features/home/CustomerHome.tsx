import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card } from '@lexho/ui'

import {
  fetchHomepageBanners,
  fetchCustomerHomeFeed,
  fetchCustomerMetrics,
  fetchPopularServicesByCategoryIds,
  redeemBanner,
  trackBannerClick,
  trackBannerImpression
} from '@/api/customer'
import {
  customerHomeFeed,
  customerMetrics,
  type CustomerMetric,
  type PopularService
} from '@/data/customerData'
import { useRemoteResource } from '@/hooks/useRemoteResource'

const ACCENT_GRADIENTS = [
  'linear-gradient(140deg, #0ea5e9 0%, #1d4ed8 100%)',
  'linear-gradient(140deg, #22c55e 0%, #15803d 100%)',
  'linear-gradient(140deg, #f97316 0%, #c2410c 100%)',
  'linear-gradient(140deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(140deg, #14b8a6 0%, #0f766e 100%)'
] as const

function getCategoryAccent(categoryId: string) {
  const hash = Array.from(categoryId).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return ACCENT_GRADIENTS[hash % ACCENT_GRADIENTS.length]
}

function getServiceRating(serviceId: string) {
  const hash = Array.from(serviceId).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const rating = 4 + (hash % 10) / 10
  return Math.min(4.9, Number(rating.toFixed(1)))
}

export function CustomerHome() {
  const metricsResource = useRemoteResource(fetchCustomerMetrics, customerMetrics)
  const feedResource = useRemoteResource(fetchCustomerHomeFeed, customerHomeFeed)
  const feed = feedResource.data ?? customerHomeFeed
  const popularCategoryIds = useMemo(
    () => feed.categories.map((category) => category.id).filter((id) => id.trim().length > 0),
    [feed.categories]
  )
  const popularByCategoryResource = useRemoteResource(
    () => fetchPopularServicesByCategoryIds(popularCategoryIds),
    {}
  )
  const allBannerResource = useRemoteResource(
    () => fetchHomepageBanners({ platformType: 'ANDROID' }),
    []
  )
  const topBannerResource = useRemoteResource(
    () => fetchHomepageBanners({ placement: 'TOP', platformType: 'ANDROID' }),
    []
  )
  const bottomBannerResource = useRemoteResource(
    () => fetchHomepageBanners({ placement: 'BOTTOM', platformType: 'ANDROID' }),
    []
  )

  const trackedBannerIdsRef = useRef<Set<string>>(new Set())
  const [brokenBannerIds, setBrokenBannerIds] = useState<Record<string, boolean>>({})

  const metrics = metricsResource.data.length > 0 ? metricsResource.data : customerMetrics
  const popularSections = useMemo(
    () =>
      feed.categories.map((category) => {
        const services = popularByCategoryResource.data[category.id] ?? []
        return {
          category,
          services: services.length > 0 ? services : feed.popularServices
        }
      }),
    [feed.categories, popularByCategoryResource.data, feed.popularServices]
  )
  const sortPlacementBanners = (rows: typeof topBannerResource.data) =>
    [...rows]
      .filter((item) => item.id && (item.title || item.imageUrl))
      .sort((a, b) => {
        const priorityA = Number(a.priority ?? 0)
        const priorityB = Number(b.priority ?? 0)
        if (priorityA !== priorityB) return priorityB - priorityA
        const slotA = Number(a.slotNumber ?? 1)
        const slotB = Number(b.slotNumber ?? 1)
        return slotA - slotB
      })

  const allBanners = useMemo(() => sortPlacementBanners(allBannerResource.data), [allBannerResource.data])
  const topBanners = useMemo(() => {
    const fromAll = allBanners.filter((banner) => banner.placement === 'TOP')
    if (fromAll.length > 0) return fromAll
    return sortPlacementBanners(topBannerResource.data)
  }, [allBanners, topBannerResource.data])
  const bottomBanners = useMemo(() => {
    const fromAll = allBanners.filter((banner) => banner.placement !== 'TOP')
    if (fromAll.length > 0) return fromAll
    return sortPlacementBanners(bottomBannerResource.data)
  }, [allBanners, bottomBannerResource.data])
  const visibleBanners = useMemo(() => [...topBanners, ...bottomBanners], [topBanners, bottomBanners])
  const featuredBanner = topBanners[0] ?? bottomBanners[0]
  const featuredCategory = feed.categories[0]

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(
        '[web:bannerImage:beforeRender]',
        visibleBanners.map((banner) => ({ id: banner.id, imageUrl: banner.imageUrl }))
      )
    }
  }, [visibleBanners])

  useEffect(() => {
    visibleBanners.forEach((banner) => {
      if (trackedBannerIdsRef.current.has(banner.id)) {
        return
      }
      trackedBannerIdsRef.current.add(banner.id)
      void trackBannerImpression(banner.id).catch(() => {
        trackedBannerIdsRef.current.delete(banner.id)
      })
    })
  }, [visibleBanners])

  const refresh = async () => {
    await Promise.all([
      metricsResource.reload(),
      feedResource.reload(),
      popularByCategoryResource.reload(),
      allBannerResource.reload(),
      topBannerResource.reload(),
      bottomBannerResource.reload()
    ])
  }

  return (
    <div className="stack">
      <header className="customer-header">
        <h2>Home</h2>
        <p>{feed.location.label}</p>
      </header>

      <Card className="panel light-panel featured-hero">
        <div className="featured-hero-content">
          <p className="featured-kicker">Featured Collection</p>
          <h2>{featuredBanner?.title ?? `Premium ${featuredCategory?.title ?? 'Home'} Services`}</h2>
          <p>Handpicked professionals, transparent pricing, and priority slots for your next booking.</p>
          <button className="book-now-btn featured-cta" type="button">
            Explore Collection
          </button>
        </div>
        <div className="featured-hero-media">
          {featuredBanner?.imageUrl && !brokenBannerIds[featuredBanner.id] ? (
            <img
              src={featuredBanner.imageUrl}
              alt={featuredBanner.title ?? 'Featured service'}
              className="featured-hero-image"
              onError={() => {
                setBrokenBannerIds((prev) => ({ ...prev, [featuredBanner.id]: true }))
              }}
            />
          ) : (
            <div className="featured-hero-fallback" aria-hidden>
              {featuredCategory?.title?.slice(0, 1) ?? 'S'}
            </div>
          )}
        </div>
      </Card>

      <section className="metrics">
        {metrics.map((metric: CustomerMetric) => (
          <Card key={metric.label} className="metric-card">
            <p className="metric-label">{metric.label}</p>
            <h3 className="metric-value">{metric.value}</h3>
          </Card>
        ))}
      </section>

      <Card className="panel light-panel">
        <div className="panel-header">
          <h2>Service Categories</h2>
          <Button
            label={
              metricsResource.refreshing ||
              feedResource.refreshing ||
              popularByCategoryResource.refreshing
                ? 'Refreshing...'
                : 'Refresh'
            }
            variant="green"
            loading={
              metricsResource.refreshing ||
              feedResource.refreshing ||
              popularByCategoryResource.refreshing ||
              allBannerResource.refreshing ||
              topBannerResource.refreshing ||
              bottomBannerResource.refreshing
            }
            onClick={() => void refresh()}
          />
        </div>

        {metricsResource.error ||
        feedResource.error ||
        popularByCategoryResource.error ||
        allBannerResource.error ||
        topBannerResource.error ||
        bottomBannerResource.error ? (
          <p className="error-text">Unable to fetch latest feed. Showing fallback data.</p>
        ) : null}

        <div className="category-scroll" role="list">
          {feed.categories.map((category) => (
            <div className="category-item" key={category.id} role="listitem">
              <div className="category-image-wrap">
                {'imageUrl' in category && (category as { imageUrl?: string }).imageUrl ? (
                  <img
                    src={(category as { imageUrl?: string }).imageUrl}
                    alt={category.title}
                    className="category-image"
                  />
                ) : (
                  <div className="category-image-fallback" aria-hidden>
                    {category.title.slice(0, 1)}
                  </div>
                )}
              </div>
              <p className="category-title">{category.title}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="panel light-panel">
        <h2>Lexho - Trusted Help for Every Home</h2>
        <p className="item-subtitle">Sit back while we take care of your home</p>
        {bottomBanners.length > 0 ? (
          <div className="banner-grid">
            {bottomBanners.map((banner) => (
              <div className="banner-card" key={banner.id}>
                {banner.imageUrl && !brokenBannerIds[banner.id] ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title ?? 'Banner'}
                    className="banner-image"
                    onError={() => {
                      if (import.meta.env.DEV) {
                        console.log('[web:bannerImage:onError]', { id: banner.id, imageUrl: banner.imageUrl })
                      }
                      setBrokenBannerIds((prev) => ({ ...prev, [banner.id]: true }))
                    }}
                  />
                ) : banner.imageUrl ? (
                  <div className="banner-image" style={{ display: 'grid', placeItems: 'center', color: '#64748b', fontSize: 12 }}>
                    Image unavailable
                  </div>
                ) : null}
                <div className="banner-content">
                  <p className="item-title">{banner.title ?? 'Special Offer'}</p>
                  <p className="item-subtitle">
                    {(banner.promoType ?? 'PROMO').toUpperCase()} | {(banner.platformType ?? 'WEB').toUpperCase()}
                  </p>
                  <div className="inline-actions">
                    <button
                      className="small-action"
                      onClick={() => {
                        void trackBannerClick(banner.id)
                        if (banner.redirectUrl) {
                          window.open(banner.redirectUrl, '_blank', 'noopener,noreferrer')
                        }
                      }}
                    >
                      Open
                    </button>
                    <button
                      className="small-action"
                      onClick={() => {
                        void redeemBanner(banner.id)
                      }}
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="item-subtitle">No bottom banners available right now.</p>
        )}
      </Card>

      {popularSections.map(({ category, services }) => (
        <Card className="panel light-panel" key={`popular-${category.id}`}>
          <div className="popular-section-header">
            <h2>{`Popular ${category.title} Services`}</h2>
            <span
              className="popular-chip"
              style={{ backgroundImage: getCategoryAccent(category.id) }}
            >
              Top Picks
            </span>
          </div>
          <div className="services-scroll" role="list">
            {popularByCategoryResource.loading || popularByCategoryResource.refreshing ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div className="service-media-card skeleton-card" key={`${category.id}-skeleton-${index}`} role="listitem">
                  <div className="service-media skeleton-block" aria-hidden />
                  <div className="skeleton-line long" aria-hidden />
                  <div className="skeleton-line short" aria-hidden />
                </div>
              ))
            ) : (
              services.map((service) => (
                <div
                  className="service-media-card"
                  key={`${category.id}-${service.id}`}
                  role="listitem"
                  style={{
                    ['--category-accent' as string]: getCategoryAccent(category.id),
                    ['--stagger-delay' as string]: `${(Number(service.id.length) % 6) * 40}ms`
                  }}
                >
                  {'imageUrl' in service && (service as { imageUrl?: string }).imageUrl ? (
                    <img
                      src={(service as { imageUrl?: string }).imageUrl}
                      alt={service.title}
                      className="service-media"
                    />
                  ) : (
                    <div className="service-media-fallback" aria-hidden>
                      {service.title.slice(0, 1)}
                    </div>
                  )}
                  <p className="service-media-title">{service.title}</p>
                  <div className="service-media-meta">
                    <p className="item-status">{service.badge}</p>
                    <p className="service-rating" aria-label={`Rated ${getServiceRating(service.id)} out of 5`}>
                      {`★ ${getServiceRating(service.id)}`}
                    </p>
                    <p className="item-price">Rs {service.price}</p>
                  </div>
                  <button className="book-now-btn" type="button">
                    Book Now
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}



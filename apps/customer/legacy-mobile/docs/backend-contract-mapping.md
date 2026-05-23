# Customer Backend Contract Mapping (Production Path)

Active runtime path is now locked to:
- `src/App.tsx`
- `src/navigation/AppNavigator.tsx`
- modular screens under `src/screens/{auth,home,booking,profile,cart,payment,notifications,support}`
- modular API clients under `src/api/*.ts`

## Alignment Status Legend
- `Aligned`: endpoint and payload usage implemented.
- `Needs Backend Confirm`: endpoint used, but response shape/error codes need backend-admin confirmation.
- `Needs UI Context`: endpoint wired but screen still requires runtime-selected ids from user flow.

## Auth
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/otp/send` | POST | `authApi.sendOtp` | `{ mobile }` | Needs Backend Confirm |
| `/otp/verify` | POST | `authApi.verifyOtp` | `{ mobile, otp }` expecting token/user | Needs Backend Confirm |
| `/auth/logout` | POST | `authApi.logoutApi` | no body | Aligned |
| `/auth/refresh-token` | POST | `authApi.refreshTokenApi` | `{ refreshToken }` | Needs Backend Confirm |

## Home
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/home/dashboard` | GET | `homeApi.getDashboard` | greeting/location/recentBookings optional | Needs Backend Confirm |
| `/api/banners` | GET | `homeApi.getBanners` | list | Needs Backend Confirm |
| `/api/categories` | GET | `homeApi.getCategories` | list | Needs Backend Confirm |
| `/api/services/popular` | GET | `homeApi.getPopularServices` | list | Needs Backend Confirm |
| `/api/services/recommended` | GET | `homeApi.getRecommendedServices` | list | Needs Backend Confirm |
| `/api/services/quick` | GET | `homeApi.getQuickServices` | list | Needs Backend Confirm |
| `/api/search/services` | GET | `homeApi.searchServices` | `keyword` query | Needs Backend Confirm |

## Profile
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/user/profile` | GET | `userApi.getProfile` | profile object | Needs Backend Confirm |
| `/api/user/profile/update` | PUT | `userApi.updateProfile` | currently `{ name }` from input | Needs Backend Confirm |
| `/api/user/profile/upload-image` | POST | not implemented yet | pending upload flow | Needs UI Context |

## Address
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/address/add` | POST | `addressApi.addAddress` | `{ label, line1, city }` | Needs Backend Confirm |
| `/api/address/list` | GET | `addressApi.getAddressList` | list | Aligned |
| `/api/address/update` | PUT | `addressApi.updateAddress` | generic payload | Needs Backend Confirm |
| `/api/address/delete` | DELETE | `addressApi.deleteAddress` | `{ id }` in body | Needs Backend Confirm |
| `/api/address/default` | PUT | `addressApi.setDefaultAddress` | `{ id }` | Needs Backend Confirm |

## Cart
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/cart/add` | POST | `cartApi.addToCart` | `{ serviceId, quantity }` | Needs Backend Confirm |
| `/api/cart` | GET | `cartApi.getCart` | list | Aligned |
| `/api/cart/update` | PUT | `cartApi.updateCart` | `{ id, quantity }` | Needs Backend Confirm |
| `/api/cart/remove` | DELETE | `cartApi.removeFromCart` | `{ id }` in body | Needs Backend Confirm |

## Booking & Live Tracking
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/bookings/create` | POST | `bookingApi.createBooking` | generic payload | Needs UI Context |
| `/api/bookings/history` | GET | `bookingApi.getBookingsHistory` | list | Aligned |
| `/api/bookings/details/{id}` | GET | `bookingExtrasApi.getBookingDetails` | ID input based | Needs UI Context |
| `/api/bookings/cancel/{id}` | PUT | `bookingExtrasApi.cancelBooking` | ID input based | Needs UI Context |
| `/api/bookings/reschedule/{id}` | PUT | `bookingExtrasApi.rescheduleBooking` | currently `{ date }` | Needs Backend Confirm |
| `/api/partner/live-location/{bookingId}` | GET | `bookingExtrasApi.getPartnerLiveLocation` | ID input based | Needs UI Context |

## Payments
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/payments/initiate` | POST | `paymentApi.initiatePayment` | `{ mode }` | Needs Backend Confirm |
| `/api/payments/status/{bookingId}` | GET | `paymentExtrasApi.getPaymentStatus` | bookingId input | Needs UI Context |
| `/api/payments/refund` | POST | `paymentExtrasApi.refundPayment` | `{ bookingId, amount }` | Needs Backend Confirm |

## Coupon
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/coupon/apply` | POST | `couponApi.applyCoupon` | `{ code }` | Needs Backend Confirm |
| `/api/coupon/list` | GET | `couponApi.getCoupons` | list | Aligned |

## Reviews
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/reviews/add` | POST | `reviewApi.addReview` | `{ serviceId, rating, comment }` | Needs Backend Confirm |
| `/api/reviews/service/{id}` | GET | `reviewApi.getServiceReviews` | service id input | Needs UI Context |

## Favorites
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/favorites/add` | POST | `favoritesApi.addFavorite` | `{ serviceId }` | Needs Backend Confirm |
| `/api/favorites/list` | GET | `favoritesApi.getFavorites` | list | Aligned |
| `/api/favorites/remove` | DELETE | `favoritesApi.removeFavorite` | `{ id }` in body | Needs Backend Confirm |

## Notifications
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/notifications` | GET | `notificationApi.getNotifications` | list | Aligned |
| `/api/notifications/read` | PUT | `notificationApi.markNotificationRead` | `{ id }` | Needs Backend Confirm |
| `/api/customer/notifications/unread-count` | GET | `notificationApi.getUnreadNotificationCount` | count | Needs Backend Confirm |

## Referral
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/referral/generate` | POST | `referralApi.generateReferral` | no body | Needs Backend Confirm |
| `/api/referral/apply` | POST | `referralApi.applyReferral` | `{ code }` | Needs Backend Confirm |

## Subscription
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/subscription/create` | POST | `subscriptionApi.createSubscription` | `{ planId }` from UI action | Needs Backend Confirm |
| `/api/subscription/list` | GET | `subscriptionApi.getSubscriptions` | list | Aligned |

## Support
| Endpoint | Method | Client | Current Contract Use | Status |
|---|---|---|---|---|
| `/api/support/create` | POST | `supportApi.createSupportTicket` | `{ subject, message }` | Needs Backend Confirm |
| `/api/support/history` | GET | `supportApi.getSupportHistory` | list | Aligned |

## Admin Alignment Checklist
1. Confirm shared enums/status values: booking status, payment status, ticket status.
2. Confirm ID semantics: `serviceId`, `bookingId`, `favorite id`, `address id` across admin panels.
3. Confirm list wrappers (`data`, `content`, plain array) and pagination format.
4. Confirm validation rules/messages match admin backend constraints.
5. Confirm notification read/delete contract (`PUT /read` vs `DELETE /...`).


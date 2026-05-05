const CACHE_NAME    = "biggs-fitness-v1";
const OFFLINE_PAGE  = "/frontend/offline.html";

/*  Assets to cache on install  */
const STATIC_ASSETS = [
    "/frontend/dashboard/index.html",
    "/frontend/dashboard/dashboard.css",
    "/frontend/dashboard/dashboard.js",
    "/frontend/global.css",
    "/frontend/form/supabase/supabase.js",
    "/frontend/features/plans/index.html",
    "/frontend/features/plans/plan.css",
    "/frontend/features/workout/index.html",
    "/frontend/features/workout/workout.css",
    "/frontend/features/quick-suggestion/index.html",
    "/frontend/features/quick-suggestion/quick.css",
    "/frontend/features/progress/index.html",
    "/frontend/features/progress/progress.css",
    "/frontend/features/profile/index.html",
    "/frontend/features/profile/profile.css",
    "/frontend/features/coaches/index.html",
    "/frontend/features/coaches/coaches.css",
    "/frontend/assets/icons/icon-192.png",
    "/frontend/assets/icons/icon-512.png",
    OFFLINE_PAGE
];

/*  Install: cache static assets  */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

/*  Activate: clean up old caches  */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

/*  Fetch: serve from cache, fall back to network  */
self.addEventListener("fetch", event => {
    const { request } = event;
    const url = new URL(request.url);

    // skip non-GET and cross-origin requests (Supabase, Groq, CDN)
    if (request.method !== "GET" || url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;

            return fetch(request)
                .then(response => {
                    // cache successful responses for HTML and CSS
                    if (
                        response.ok &&
                        (request.destination === "document" ||
                         request.destination === "style" ||
                         request.destination === "script" ||
                         request.destination === "image")
                    ) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    // offline — serve offline page for navigation requests
                    if (request.destination === "document") {
                        return caches.match(OFFLINE_PAGE);
                    }
                });
        })
    );
});
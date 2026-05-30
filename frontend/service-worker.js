const CACHE_NAME    = "biggs-fitness-v1";
const OFFLINE_PAGE  = "/offline.html";

/*  Assets to cache on install  */
const STATIC_ASSETS = [
    "/offline.html"
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

    if (request.method !== "GET" || url.origin !== location.origin) return;

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;

            return fetch(request)
                .then(response => {
                    if (
                        response.ok &&
                        (request.destination === "document" ||
                         request.destination === "style"    ||
                         request.destination === "script"   ||
                         request.destination === "image")
                    ) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    if (request.destination === "document") {
                        return caches.match(OFFLINE_PAGE)
                            .then(r => r || new Response("Offline", { status: 503 }));
                    }
                    return new Response("", { status: 503 });
                });
        })
    );
});
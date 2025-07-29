const CACHE_NAME = 'menu-guard-v2'; // Increment version to force update
// This list should include all the core files needed for the app to run.
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/favicon.svg',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    // The CDN hosting React and other libs - must be the exact URLs from importmap
    'https://cdn.tailwindcss.com',
    'https://esm.sh/react@^19.1.0',
    'https://esm.sh/react-dom@^19.1.0',
    'https://esm.sh/react-dom@^19.1.0/client',
    'https://esm.sh/react@^19.1.0/',
    'https://esm.sh/@google/genai@^1.7.0',
    'https://esm.sh/jsqr@1.4.0',
    'https://esm.sh/react-dom@^19.1.0/',
];

// Install event: cache the application shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                // Use addAll to fetch and cache all resources. If any fetch fails, the install fails.
                return cache.addAll(URLS_TO_CACHE).catch(err => {
                    console.error('Failed to cache URLs:', err);
                    // It's possible some resources are not available or blocked by extensions
                    // For more robust caching, you could add resources individually and log errors
                });
            })
    );
});

// Fetch event: serve cached content when offline
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    // Don't try to cache API calls to Google services or our own Netlify functions.
    // These should always be fetched from the network.
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com') || url.pathname.includes('/.netlify/functions/')) {
        // Just fetch from the network, don't cache
        return;
    }


    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // If the request is in the cache, return it.
                if (response) {
                    return response;
                }

                // If the request is not in the cache, fetch it from the network.
                return fetch(event.request).then(
                    (networkResponse) => {
                        // We need to clone the response because it's a stream and can only be consumed once.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // Only cache successful responses
                                if(networkResponse.status === 200) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return networkResponse;
                    }
                ).catch(() => {
                    // If both cache and network fail, you could return a fallback offline page.
                    // Example: return caches.match('/offline.html');
                });
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
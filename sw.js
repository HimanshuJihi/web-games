const CACHE_NAME = 'mlampic-cache-v24';

// उन सभी फ़ाइलों की लिस्ट जिन्हें ऑफलाइन खेलने के लिए सेव करना है
const urlsToCache = [
    './',
    './index.html',
    './about.html',
    './privacy.html',
    './rules.html',
    './leaderboard.html',
    './settings.html',
    './settings.js',
    './leaderboard.js',
    './terms.html',
    './contact.html',
    './archery.html',
    './archery.js',
    './ads.js',
    './basketball.html',
    './basketball.js',
    './curling.html',
    './curling.js',
    './long_jump.html',
    './long_jump.js',
    './skeet_shooting.html',
    './skeet_shooting.js',
    './sprint.html',
    './sprint.js',
    './swimming.html',
    './swimming.js',
    './target_practice.html',
    './target_practice.js',
    './javelin_throw.html',
    './javelin_throw.js',
    './hoop_stack.html',
    './hoop_stack.js',
    './tic_tac_toe.html',
    './tic_tac_toe.js',
    './block_puzzle.html',
    './block_puzzle.js',
    './bubble_shooter.html',
    './bubble_shooter.js',
    './business_game.html',
    './business_game.js',
    './manifest.json',
    './Mlampic_L.png',
    './Mlampic_d.png',
    './Mlampic_p.png',
    './favicon.ico',
    './favicon-32x32.png',
    './favicon-16x16.png',
    './apple-touch-icon.png',
    './android-chrome-192x192.png',
    './android-chrome-512x512.png',
    './game-logo.png'
];

// इंस्टॉल होने पर फ़ाइलों को कैश (Cache) में सेव करें
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// नई सर्विस वर्कर एक्टिवेट होने पर पुरानी कैश को डिलीट करें (Very Important for Updates)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// गेम खेलते समय फ़ाइलें कैश से लोड करें (जिससे गेम बिना इंटरनेट के चले)
self.addEventListener('fetch', (event) => {
    // index.html और rules.html के लिए, पहले नेटवर्क से लाने की कोशिश करें
    if (event.request.url.includes('index.html') || event.request.url.includes('rules.html')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // अन्य सभी एसेट्स के लिए, पहले कैश से दें
    event.respondWith(async function () {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return fetch(event.request);
    }());
});
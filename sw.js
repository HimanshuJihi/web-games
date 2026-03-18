const CACHE_NAME = 'mlampic-cache-v3';

// उन सभी फ़ाइलों की लिस्ट जिन्हें ऑफलाइन खेलने के लिए सेव करना है
const urlsToCache = [
    './',
    './index.html',
    './about.html',
    './privacy.html',
    './rules.html',
    './terms.html',
    './archery.html',
    './archery.js',
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
    './manifest.json'
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
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // अगर फ़ाइल कैश में है, तो उसे दें, नहीं तो इंटरनेट से मंगाएं
                if (response) return response;
                return fetch(event.request);
            })
    );
});
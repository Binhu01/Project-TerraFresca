const CACHE_NAME = 'tf-v1';
const PRECACHE_URLS = [
	'/',
	'/main.html',
	'/offline.html',
	'/css/style.css',
	'/js/main.js',
	'/js/supabase-client.js',
	'/img/logo_terra_fresca__1.png',
	'/pedidos/index.html',
	'/loja/index.html',
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(PRECACHE_URLS);
		})
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name.startsWith('tf-') && name !== CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

const STATIC_EXTENSIONS = /\.(css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/;

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	const isStatic = STATIC_EXTENSIONS.test(url.pathname);

	if (isStatic) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				if (cached) return cached;
				return fetch(event.request)
					.then((response) => {
						if (!response || response.status !== 200 || response.type !== 'basic') {
							return response;
						}
						const responseToCache = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, responseToCache);
						});
						return response;
					})
					.catch(() => {
						if (event.request.destination === 'document') {
							return caches.match('/offline.html');
						}
					});
			})
		);
	} else {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				const fetchPromise = fetch(event.request)
					.then((response) => {
						if (!response || response.status !== 200 || response.type !== 'basic') {
							return response;
						}
						const responseToCache = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, responseToCache);
						});
						return response;
					})
					.catch(() => cached || (event.request.destination === 'document' ? caches.match('/offline.html') : undefined));

				return cached || fetchPromise;
			})
		);
	}
});
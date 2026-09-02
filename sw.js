const CACHE_NAME = "libcontrol-pwa-v2";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json"
];


self.addEventListener(
    "install",
    (event) => {

        event.waitUntil(
            caches.open(
                CACHE_NAME
            ).then(
                (cache) => {

                    return cache.addAll(
                        APP_SHELL
                    );

                }
            )
        );

        self.skipWaiting();

    }
);


self.addEventListener(
    "activate",
    (event) => {

        event.waitUntil(

            caches.keys().then(
                (cacheNames) => {

                    return Promise.all(

                        cacheNames
                            .filter(
                                (name) =>
                                    name !==
                                    CACHE_NAME
                            )
                            .map(
                                (name) =>
                                    caches.delete(
                                        name
                                    )
                            )

                    );

                }
            )

        );

        self.clients.claim();

    }
);


self.addEventListener(
    "fetch",
    (event) => {

        if (
            event.request.destination === "script"
        ) {

            event.respondWith(

                fetch(
                    event.request,
                    {
                        cache: "no-store"
                    }
                ).catch(
                    () => {

                        return caches.match(
                            event.request
                        );

                    }
                )

            );

            return;
        }


        event.respondWith(

            fetch(
                event.request
            ).catch(
                () => {

                    return caches.match(
                        event.request
                    );

                }
            )

        );

    }
);

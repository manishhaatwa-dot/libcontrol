const CACHE_NAME = "libcontrol-pwa-v3";

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

        const request =
            event.request;


        /*
         * --------------------------------------------------------------
         * DO NOT INTERCEPT EXTERNAL REQUESTS
         * --------------------------------------------------------------
         *
         * Firebase Authentication
         * Firestore
         * Cloud Functions
         * Google APIs
         *
         * These requests must go directly to the network.
         * --------------------------------------------------------------
         */

        if (
            new URL(
                request.url
            ).origin !==
            self.location.origin
        ) {

            event.respondWith(
                fetch(request)
            );

            return;

        }


        /*
         * --------------------------------------------------------------
         * JAVASCRIPT FILES
         * --------------------------------------------------------------
         *
         * Always try the latest version from network.
         * If network fails, use cached version if available.
         * --------------------------------------------------------------
         */

        if (
            request.destination ===
            "script"
        ) {

            event.respondWith(

                fetch(
                    request,
                    {
                        cache:
                            "no-store"
                    }
                ).catch(
                    () => {

                        return caches
                            .match(
                                request
                            )
                            .then(
                                (cachedResponse) => {

                                    if (
                                        cachedResponse
                                    ) {

                                        return cachedResponse;

                                    }


                                    return new Response(
                                        "",
                                        {
                                            status:
                                                503,

                                            statusText:
                                                "Service Unavailable"
                                        }
                                    );

                                }
                            );

                    }
                )

            );

            return;

        }


        /*
         * --------------------------------------------------------------
         * SAME-ORIGIN REQUESTS
         * --------------------------------------------------------------
         *
         * Try network first.
         * If network fails, use cache.
         * If nothing is cached, return a proper Response.
         * --------------------------------------------------------------
         */

        event.respondWith(

            fetch(
                request
            ).catch(
                () => {

                    return caches
                        .match(
                            request
                        )
                        .then(
                            (cachedResponse) => {

                                if (
                                    cachedResponse
                                ) {

                                    return cachedResponse;

                                }


                                return new Response(
                                    "Offline",
                                    {
                                        status:
                                            503,

                                        statusText:
                                            "Service Unavailable",

                                        headers:
                                            {
                                                "Content-Type":
                                                    "text/plain"
                                            }
                                    }
                                );

                            }
                        );

                }
            )

        );

    }
);

/**
 * Generated from the backend OpenAPI spec by `npm run api:types`. Do not edit by hand.
 */

export interface paths {
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Estado de la API y la base */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Health"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Crear cuenta e iniciar sesión
         * @description Contraseña de 8 a 72 bytes con al menos una letra y un número. Devuelve la cookie de sesión (HttpOnly, 12 h).
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name: string;
                        email: string;
                        password: string;
                    };
                };
            };
            responses: {
                /** @description Cuenta creada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["UserResponse"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description EMAIL_TAKEN */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description RATE_LIMITED */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Iniciar sesión */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        email: string;
                        password: string;
                    };
                };
            };
            responses: {
                /** @description Sesión iniciada (cookie `session`) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["UserResponse"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INVALID_CREDENTIALS */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description RATE_LIMITED */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cerrar sesión */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cookie borrada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Usuario de la sesión actual */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Usuario */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["UserResponse"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar productos
         * @description Solo productos activos y no archivados. `q` busca en nombre y descripción sin distinguir mayúsculas ni tildes. Precios en centavos.
         */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                    category?: string;
                    q?: string;
                    minPrice?: number | null;
                    maxPrice?: number | null;
                    inStock?: "true" | "false";
                    sort?: "newest" | "price_asc" | "price_desc" | "name";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Página de productos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PublicProductPage"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/products/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Detalle de producto */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    slug: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Producto */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PublicProduct"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar categorías */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Categorías */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CategoryList"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/store-info": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Datos de la tienda (retiro y envío) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Datos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoreSettings"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cart": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ver carrito (precios actuales y avisos) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Carrito */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Cart"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Vaciar carrito */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Carrito vacío */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Cart"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cart/items/{productId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Fijar la cantidad de un producto */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    productId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        quantity: number;
                    };
                };
            };
            responses: {
                /** @description Carrito actualizado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Cart"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INSUFFICIENT_STOCK, CART_LIMIT_REACHED */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        post?: never;
        /** Quitar un producto */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    productId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Carrito actualizado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Cart"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/addresses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar mis direcciones */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Direcciones */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AddressList"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        /** Crear dirección (máx. 10) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        fullName: string;
                        phone: string;
                        street: string;
                        number: string;
                        floorApt?: string | null;
                        city: string;
                        province: string;
                        postalCode: string;
                        notes?: string | null;
                    };
                };
            };
            responses: {
                /** @description Creada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Address"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ADDRESS_LIMIT_REACHED */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/addresses/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ver una dirección propia */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Dirección */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Address"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ADDRESS_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Borrar una dirección propia */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Borrada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ADDRESS_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /** Editar una dirección propia */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        fullName?: string;
                        phone?: string;
                        street?: string;
                        number?: string;
                        floorApt?: string | null;
                        city?: string;
                        province?: string;
                        postalCode?: string;
                        notes?: string | null;
                    };
                };
            };
            responses: {
                /** @description Actualizada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Address"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ADDRESS_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/checkout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirmar compra y reservar stock
         * @description Calcula todo en el servidor (ignora precios enviados), reserva el stock de forma atómica, crea el pedido PENDING_PAYMENT (vence a los RESERVATION_MINUTES) y devuelve la URL de pago de Mercado Pago.
         */
        post: {
            parameters: {
                query?: never;
                header?: {
                    /** @description Clave opcional (8 a 100 caracteres). Repetir la misma clave devuelve el mismo pedido sin duplicarlo. */
                    "idempotency-key"?: string;
                };
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        fulfillment: "PICKUP" | "DELIVERY";
                        /** Format: uuid */
                        addressId?: string;
                        notes?: string;
                    };
                };
            };
            responses: {
                /** @description Pedido creado (200 si es una repetición con la misma Idempotency-Key) */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaymentLink"];
                    };
                };
                /** @description ADDRESS_REQUIRED, VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ADDRESS_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description CART_EMPTY, INSUFFICIENT_STOCK, PRODUCT_UNAVAILABLE, ORDER_TOTAL_TOO_HIGH */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description RATE_LIMITED */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYMENT_PROVIDER_ERROR */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYMENTS_NOT_CONFIGURED */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Mis pedidos (más nuevo primero) */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Página de pedidos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["OrderPage"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Detalle de un pedido propio */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pedido */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Order"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancelar un pedido pendiente de pago */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pedido cancelado (stock liberado) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Order"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_CANCELLABLE */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/pay": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Volver a abrir el pago de un pedido pendiente */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description URL de pago */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaymentLink"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_PAYABLE */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYMENT_PROVIDER_ERROR */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/sync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Consultar el estado real del pago en Mercado Pago */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pedido actualizado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Order"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYMENT_PROVIDER_ERROR */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYMENTS_NOT_CONFIGURED */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/webhooks/mercadopago": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Notificaciones de Mercado Pago
         * @description Autenticado por la firma `x-signature` (HMAC-SHA256 con MP_WEBHOOK_SECRET). No usa cookies ni chequeo de Origin. El cuerpo no se usa como fuente de verdad: el pago se consulta a la API de Mercado Pago.
         */
        post: {
            parameters: {
                query: {
                    "data.id": string;
                    type: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Recibido */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["WebhookAck"];
                    };
                };
                /** @description INVALID_NOTIFICATION, VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INVALID_SIGNATURE */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYMENTS_NOT_CONFIGURED */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar categorías con cantidad de productos */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Categorías */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminCategoryList"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        /** Crear categoría */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Creada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Category"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/categories/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Borrar categoría sin productos */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Borrada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description CATEGORY_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description CATEGORY_HAS_PRODUCTS */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /** Renombrar categoría */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Actualizada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Category"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description CATEGORY_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/admin/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar productos (con stock) */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                    q?: string;
                    categoryId?: string;
                    archived?: "true" | "false" | "all";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Página de productos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminProductPage"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        /** Crear producto */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name: string;
                        description: string;
                        priceCents: number;
                        /** Format: uuid */
                        categoryId: string;
                        /** @default true */
                        active?: boolean;
                        /** @default 0 */
                        stock?: number;
                    };
                };
            };
            responses: {
                /** @description Creado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminProduct"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description CATEGORY_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ver producto */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Producto */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminProduct"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Archivar producto (borrado lógico) */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Archivado */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /** Editar producto (el stock se ajusta aparte) */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name?: string;
                        description?: string;
                        priceCents?: number;
                        /** Format: uuid */
                        categoryId?: string;
                        active?: boolean;
                    };
                };
            };
            responses: {
                /** @description Actualizado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminProduct"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND, CATEGORY_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_ARCHIVED */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/admin/products/{id}/stock": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Ajustar stock con motivo */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        delta: number;
                        note: string;
                    };
                };
            };
            responses: {
                /** @description Stock ajustado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminProduct"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description STOCK_BELOW_RESERVED */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{id}/stock-movements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Últimos 100 movimientos de stock */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Movimientos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StockMovementList"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{id}/images": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Subir imagen (multipart, campo "image")
         * @description JPEG, PNG o WebP (validado por contenido), máximo 5 MB y 8 por producto. Se reencodea a WebP de hasta 1600 px sin metadatos.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        /** Format: binary */
                        image: string;
                        alt?: string;
                    };
                };
            };
            responses: {
                /** @description Imagen subida */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Image"];
                    };
                };
                /** @description IMAGE_REQUIRED, VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description TOO_MANY_IMAGES */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FILE_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_IMAGE_TYPE, UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INVALID_IMAGE */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{id}/images/{imageId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Borrar imagen */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    imageId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Borrada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description IMAGE_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{id}/images/order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Reordenar imágenes */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        imageIds: string[];
                    };
                };
            };
            responses: {
                /** @description Nuevo orden */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ImageList"];
                    };
                };
                /** @description INVALID_IMAGE_ORDER, VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PRODUCT_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ver configuración */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Configuración */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoreSettings"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Editar configuración */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        storeName?: string;
                        shippingCostCents?: number;
                        pickupAddress?: string;
                    };
                };
            };
            responses: {
                /** @description Actualizada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoreSettings"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/admin/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Estadísticas */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Estadísticas */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Stats"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Listar pedidos con filtros */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                    status?: "PENDING_PAYMENT" | "PAID" | "PREPARING" | "READY_FOR_PICKUP" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "EXPIRED";
                    number?: number;
                    from?: string;
                    to?: string;
                    needsAttention?: "true" | "false";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Página de pedidos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminOrderPage"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ver pedido */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pedido */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminOrder"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Cambiar estado (máquina de estados)
         * @description PAID→PREPARING; PREPARING→READY_FOR_PICKUP (retiro) o SHIPPED (envío); READY_FOR_PICKUP→DELIVERED; SHIPPED→DELIVERED. `fromStatus` opcional para detectar cambios concurrentes.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        status: "PENDING_PAYMENT" | "PAID" | "PREPARING" | "READY_FOR_PICKUP" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "EXPIRED";
                        /** @enum {string} */
                        fromStatus?: "PENDING_PAYMENT" | "PAID" | "PREPARING" | "READY_FOR_PICKUP" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "EXPIRED";
                    };
                };
            };
            responses: {
                /** @description Estado cambiado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminOrder"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INVALID_STATUS_TRANSITION, ORDER_STATUS_CHANGED */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancelar pedido pagado (devuelve stock, reembolso manual) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        reason: string;
                    };
                };
            };
            responses: {
                /** @description Cancelado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminOrder"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_CANCELLABLE, ORDER_STATUS_CHANGED */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/resolve-attention": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Marcar como resuelto lo que requería atención */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Actualizado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminOrder"];
                    };
                };
                /** @description VALIDATION_ERROR */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description FORBIDDEN, ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dev/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Indica que los pagos son simulados (solo existe con PAYMENTS_PROVIDER=fake) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Modo demo activo */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DevStatus"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dev/orders/{id}/simulate-payment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Simular el pago de un pedido propio (solo con PAYMENTS_PROVIDER=fake)
         * @description Solo existe en modo demo (PAYMENTS_PROVIDER=fake, prohibido en producción). Registra un pago simulado aprobado o rechazado y lo procesa por el mismo camino que un webhook real de Mercado Pago.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @enum {string} */
                        outcome: "approved" | "rejected";
                    };
                };
            };
            responses: {
                /** @description Pedido después de procesar el pago */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Order"];
                    };
                };
                /** @description VALIDATION_ERROR, INVALID_JSON */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNAUTHENTICATED */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORIGIN_NOT_ALLOWED */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description ORDER_NOT_FOUND */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description PAYLOAD_TOO_LARGE */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description UNSUPPORTED_MEDIA_TYPE */
                415: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INTERNAL_ERROR */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Health: {
            /** @example ok */
            status: string;
            database: string;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            time: string;
        };
        Error: {
            error: {
                /** @example VALIDATION_ERROR */
                code: string;
                /** @example Revisá los datos enviados. */
                message: string;
                /**
                 * @example [
                 *       {
                 *         "field": "email",
                 *         "message": "Ingresá un email válido."
                 *       }
                 *     ]
                 */
                details?: unknown;
            };
        };
        UserResponse: {
            user: components["schemas"]["User"];
        };
        User: {
            /**
             * Format: uuid
             * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
             */
            id: string;
            /**
             * Format: email
             * @example cliente@example.com
             */
            email: string;
            /** @example Ana Pérez */
            name: string;
            /** @enum {string} */
            role: "CUSTOMER" | "ADMIN";
        };
        PublicProductPage: {
            items: components["schemas"]["PublicProduct"][];
            /** @example 1 */
            page: number;
            /** @example 12 */
            pageSize: number;
            /** @example 20 */
            total: number;
        };
        PublicProduct: {
            /**
             * Format: uuid
             * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
             */
            id: string;
            /** @example Taza de cerámica */
            name: string;
            /** @example taza-de-ceramica */
            slug: string;
            description: string;
            /**
             * @description Pesos argentinos en centavos (entero).
             * @example 450000
             */
            priceCents: number;
            images: components["schemas"]["Image"][];
            category: components["schemas"]["Category"];
            inStock: boolean;
            /**
             * @description Mínimo entre las unidades disponibles y 20.
             * @example 7
             */
            maxPurchasable: number;
        };
        Image: {
            /**
             * Format: uuid
             * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
             */
            id: string;
            /**
             * Format: uri
             * @example http://localhost:4000/uploads/products/9a7c.webp
             */
            url: string;
            alt: string;
            position: number;
        };
        Category: {
            /**
             * Format: uuid
             * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
             */
            id: string;
            /** @example Cocina */
            name: string;
            /** @example cocina */
            slug: string;
        };
        CategoryList: {
            items: components["schemas"]["Category"][];
        };
        StoreSettings: {
            /** @example Mi tienda */
            storeName: string;
            /**
             * @description Pesos argentinos en centavos (entero).
             * @example 350000
             */
            shippingCostCents: number;
            /** @example Av. Siempreviva 742, CABA */
            pickupAddress: string;
        };
        Cart: {
            items: {
                /**
                 * Format: uuid
                 * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
                 */
                productId: string;
                name: string;
                slug: string;
                image: components["schemas"]["Image"] | null;
                /**
                 * @description Pesos argentinos en centavos (entero).
                 * @example 450000
                 */
                unitPriceCents: number;
                /** @example 2 */
                quantity: number;
                /**
                 * @description Pesos argentinos en centavos (entero).
                 * @example 900000
                 */
                lineTotalCents: number;
                maxPurchasable: number;
                /** @enum {string|null} */
                warning: "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | null;
                warningMessage: string | null;
            }[];
            /**
             * @description Pesos argentinos en centavos (entero).
             * @example 900000
             */
            subtotalCents: number;
            itemCount: number;
            canCheckout: boolean;
        };
        AddressList: {
            items: components["schemas"]["Address"][];
        };
        Address: {
            /**
             * Format: uuid
             * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
             */
            id: string;
            /** @example Ana Pérez */
            fullName: string;
            /** @example +54 11 5555-1234 */
            phone: string;
            /** @example Av. Corrientes */
            street: string;
            /** @example 1234 */
            number: string;
            /** @example 5° B */
            floorApt: string | null;
            /** @example CABA */
            city: string;
            /** @example Buenos Aires */
            province: string;
            /** @example C1043 */
            postalCode: string;
            notes: string | null;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            createdAt: string;
        };
        PaymentLink: {
            order: components["schemas"]["Order"];
            /**
             * Format: uri
             * @example https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123
             */
            paymentUrl: string | null;
        };
        Order: {
            /**
             * Format: uuid
             * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
             */
            id: string;
            /** @example 1042 */
            number: number;
            /** @enum {string} */
            status: "PENDING_PAYMENT" | "PAID" | "PREPARING" | "READY_FOR_PICKUP" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "EXPIRED";
            /** @enum {string} */
            fulfillment: "PICKUP" | "DELIVERY";
            /**
             * @description Pesos argentinos en centavos (entero).
             * @example 900000
             */
            subtotalCents: number;
            /**
             * @description Pesos argentinos en centavos (entero).
             * @example 350000
             */
            shippingCents: number;
            /**
             * @description Pesos argentinos en centavos (entero).
             * @example 1250000
             */
            totalCents: number;
            shippingAddress: {
                /** @example Ana Pérez */
                fullName: string;
                /** @example +54 11 5555-1234 */
                phone: string;
                /** @example Av. Corrientes */
                street: string;
                /** @example 1234 */
                number: string;
                /** @example 5° B */
                floorApt: string | null;
                /** @example CABA */
                city: string;
                /** @example Buenos Aires */
                province: string;
                /** @example C1043 */
                postalCode: string;
                notes: string | null;
            } | null;
            notes: string | null;
            items: {
                /**
                 * Format: uuid
                 * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
                 */
                productId: string | null;
                name: string;
                /**
                 * @description Pesos argentinos en centavos (entero).
                 * @example 450000
                 */
                unitPriceCents: number;
                quantity: number;
                /**
                 * @description Pesos argentinos en centavos (entero).
                 * @example 900000
                 */
                lineTotalCents: number;
            }[];
            payment: {
                /** @enum {string} */
                status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED";
            } | null;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            expiresAt: string;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            paidAt: string | null;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            cancelledAt: string | null;
            cancelReason: string | null;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            createdAt: string;
        };
        OrderPage: {
            items: components["schemas"]["Order"][];
            /** @example 1 */
            page: number;
            /** @example 12 */
            pageSize: number;
            /** @example 20 */
            total: number;
        };
        WebhookAck: {
            received: boolean;
        };
        AdminCategoryList: {
            items: (components["schemas"]["Category"] & {
                productCount: number;
            })[];
        };
        AdminProductPage: {
            items: components["schemas"]["AdminProduct"][];
            /** @example 1 */
            page: number;
            /** @example 12 */
            pageSize: number;
            /** @example 20 */
            total: number;
        };
        AdminProduct: {
            /**
             * Format: uuid
             * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
             */
            id: string;
            /** @example Taza de cerámica */
            name: string;
            /** @example taza-de-ceramica */
            slug: string;
            description: string;
            /**
             * @description Pesos argentinos en centavos (entero).
             * @example 450000
             */
            priceCents: number;
            images: components["schemas"]["Image"][];
            category: components["schemas"]["Category"];
            /** @example 10 */
            stock: number;
            /** @example 2 */
            reserved: number;
            /** @example 8 */
            available: number;
            active: boolean;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            archivedAt: string | null;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            createdAt: string;
            /**
             * Format: date-time
             * @example 2026-11-04T18:30:00.000Z
             */
            updatedAt: string;
        };
        StockMovementList: {
            items: {
                /**
                 * Format: uuid
                 * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
                 */
                id: string;
                /** @example -2 */
                delta: number;
                /** @enum {string} */
                reason: "INITIAL" | "SALE" | "ADMIN_ADJUSTMENT" | "CANCEL_RESTOCK" | "LATE_PAYMENT";
                note: string | null;
                /**
                 * Format: uuid
                 * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
                 */
                orderId: string | null;
                /**
                 * Format: uuid
                 * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
                 */
                actorId: string | null;
                /**
                 * Format: date-time
                 * @example 2026-11-04T18:30:00.000Z
                 */
                createdAt: string;
            }[];
        };
        ImageList: {
            items: components["schemas"]["Image"][];
        };
        Stats: {
            ordersByStatus: {
                PENDING_PAYMENT?: number;
                PAID?: number;
                PREPARING?: number;
                READY_FOR_PICKUP?: number;
                SHIPPED?: number;
                DELIVERED?: number;
                CANCELLED?: number;
                EXPIRED?: number;
            };
            ordersNeedingAttention: number;
            last30Days: {
                /**
                 * Format: date-time
                 * @example 2026-11-04T18:30:00.000Z
                 */
                from: string;
                /**
                 * Format: date-time
                 * @example 2026-11-04T18:30:00.000Z
                 */
                to: string;
                paidOrders: number;
                /**
                 * @description Pesos argentinos en centavos (entero).
                 * @example 15300000
                 */
                salesCents: number;
            };
            /** @example 5 */
            lowStockThreshold: number;
            lowStockProducts: {
                /**
                 * Format: uuid
                 * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
                 */
                id: string;
                name: string;
                slug: string;
                stock: number;
                reserved: number;
                active: boolean;
            }[];
        };
        AdminOrderPage: {
            items: components["schemas"]["AdminOrder"][];
            /** @example 1 */
            page: number;
            /** @example 12 */
            pageSize: number;
            /** @example 20 */
            total: number;
        };
        AdminOrder: components["schemas"]["Order"] & {
            needsAttention: boolean;
            attentionNote: string | null;
            customer: {
                /**
                 * Format: uuid
                 * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
                 */
                id: string;
                /** Format: email */
                email: string;
                name: string;
            };
            payments: {
                /**
                 * Format: uuid
                 * @example 3f1c2b9e-8a41-4c55-9d1e-2b7f0c6a9e10
                 */
                id: string;
                /** @example mercadopago */
                provider: string;
                /** @example 1234567890 */
                providerPaymentId: string | null;
                /** @enum {string} */
                status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED";
                /**
                 * @description Pesos argentinos en centavos (entero).
                 * @example 1250000
                 */
                amountCents: number;
                /**
                 * Format: date-time
                 * @example 2026-11-04T18:30:00.000Z
                 */
                createdAt: string;
                /**
                 * Format: date-time
                 * @example 2026-11-04T18:30:00.000Z
                 */
                updatedAt: string;
            }[];
        };
        DevStatus: {
            /**
             * @example fake
             * @enum {string}
             */
            paymentsProvider: "mercadopago" | "fake";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

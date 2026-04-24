const STRAPI_URL = 'http://localhost:1337'

/**
 * Resolves a media URL from Strapi.
 * If Cloudinary is configured, URLs will already be absolute (https://res.cloudinary.com/...).
 * If local upload, URLs will be relative (/uploads/...).
 * This function handles both cases.
 */
export function resolveMediaUrl(url: string | null | undefined, fallback = ''): string {
    if (!url) return fallback
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${STRAPI_URL}${url}`
}

export { STRAPI_URL }

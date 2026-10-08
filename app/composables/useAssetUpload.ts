const ACCEPT = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
const MAX_BYTES = 8 * 1024 * 1024

/** Caricamento immagini di /admin su /api/admin/assets */
export const useAssetUpload = () => {
  const uploading = ref(false)
  const error = ref('')

  async function upload(file: File): Promise<string | null> {
    error.value = ''
    if (!ACCEPT.includes(file.type)) {
      error.value = 'Formato non supportato: usa SVG, PNG, JPG, WebP, GIF o AVIF'
      return null
    }
    if (file.size > MAX_BYTES) {
      error.value = 'Il file supera 8 MB'
      return null
    }
    uploading.value = true
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await $fetch<{ url: string }>('/api/admin/assets', { method: 'POST', body })
      return res.url
    }
    catch (err) {
      error.value = (err as { statusMessage?: string }).statusMessage ?? 'Caricamento non riuscito'
      return null
    }
    finally {
      uploading.value = false
    }
  }

  return { upload, uploading, error, accept: ACCEPT.join(',') }
}

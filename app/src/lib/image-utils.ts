/**
 * Utility functions for handling image URLs, including base64 data URLs
 */

/**
 * Check if a URL is a base64 data URL
 */
export function isBase64DataUrl(url: string): boolean {
  return url.startsWith('data:image/');
}

/**
 * Check if a URL is a valid HTTP/HTTPS URL
 */
export function isHttpUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate an image URL (either base64 data URL or HTTP URL)
 */
export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: true }; // Empty URL is valid (no image)
  }

  if (isBase64DataUrl(url)) {
    // Validate base64 data URL format
    if (!url.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,/)) {
      return { 
        valid: false, 
        error: 'Invalid base64 image format. Only JPEG, PNG, GIF, and WebP are supported.' 
      };
    }
    return { valid: true };
  }

  if (isHttpUrl(url)) {
    return { valid: true };
  }

  return { 
    valid: false, 
    error: 'Invalid image URL format. Must be a valid HTTP/HTTPS URL or base64 data URL.' 
  };
}

/**
 * Get a safe image URL for display (prevents console errors)
 */
export function getSafeImageUrl(url: string): string | undefined {
  if (!url) return undefined;
  
  const validation = validateImageUrl(url);
  if (!validation.valid) {
    console.warn('Invalid image URL:', validation.error);
    return undefined;
  }
  
  return url;
}

/**
 * Check if an image URL should be displayed
 */
export function shouldDisplayImage(url: string): boolean {
  if (!url) return false;
  
  const validation = validateImageUrl(url);
  return validation.valid;
}

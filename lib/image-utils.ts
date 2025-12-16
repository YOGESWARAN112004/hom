export function getProxyImageUrl(url: string | null, baseUrl: string): string | null {
  if (!url) return null;
  if (url.includes('.s3.') && url.includes('amazonaws.com')) {
    try {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1);
      return `${baseUrl}/api/images/s3/${key}`;
    } catch {
      return url;
    }
  }
  if (url.includes('cloudfront.net') || url.includes('s3.amazonaws.com')) {
    try {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1);
      return `${baseUrl}/api/images/s3/${key}`;
    } catch {
      return url;
    }
  }
  return url;
}


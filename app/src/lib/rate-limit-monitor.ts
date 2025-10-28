// Rate limit monitoring service
class RateLimitMonitor {
  private requests: Array<{
    timestamp: number;
    endpoint: string;
    ip?: string;
  }> = [];

  // Track a request
  trackRequest(endpoint: string, ip?: string) {
    this.requests.push({
      timestamp: Date.now(),
      endpoint,
      ip
    });

    // Clean up old requests (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.requests = this.requests.filter(req => req.timestamp > oneHourAgo);
  }

  // Get request statistics
  getStats() {
    const now = Date.now();
    const lastMinute = now - 60 * 1000;
    const lastHour = now - 60 * 60 * 1000;

    const recentRequests = this.requests.filter(req => req.timestamp > lastMinute);
    const hourlyRequests = this.requests.filter(req => req.timestamp > lastHour);

    return {
      requestsLastMinute: recentRequests.length,
      requestsLastHour: hourlyRequests.length,
      totalRequests: this.requests.length,
      averagePerMinute: hourlyRequests.length / 60
    };
  }

  // Check if approaching rate limit
  isApproachingLimit() {
    const stats = this.getStats();
    return stats.requestsLastMinute > 8; // Warning at 8/10 requests
  }

  // Get endpoint-specific stats
  getEndpointStats(endpoint: string) {
    const now = Date.now();
    const lastMinute = now - 60 * 1000;
    
    const endpointRequests = this.requests.filter(
      req => req.endpoint === endpoint && req.timestamp > lastMinute
    );

    return {
      endpoint,
      requestsLastMinute: endpointRequests.length,
      isHighTraffic: endpointRequests.length > 5
    };
  }
}

// Create singleton instance
export const rateLimitMonitor = new RateLimitMonitor();

// Export for manual tracking
export function trackRequest(endpoint: string, ip?: string) {
  rateLimitMonitor.trackRequest(endpoint, ip);
}

// Export for checking limits
export function isApproachingRateLimit() {
  return rateLimitMonitor.isApproachingLimit();
}

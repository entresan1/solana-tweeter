/**
 * Performance monitoring service
 * Tracks loading times and API call efficiency
 */
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  // Performance metrics
  private metrics = {
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    batchRequests: 0,
    individualRequests: 0,
    averageLoadTime: 0,
    totalLoadTime: 0,
    loadCount: 0
  };
  
  // Timing data
  private timers = new Map<string, number>();
  
  private constructor() {}
  
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Start timing an operation
   */
  public startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
  }
  
  /**
   * End timing an operation
   */
  public endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.timers.delete(operation);
    
    // Update average load time
    this.metrics.totalLoadTime += duration;
    this.metrics.loadCount++;
    this.metrics.averageLoadTime = this.metrics.totalLoadTime / this.metrics.loadCount;
    
    return duration;
  }
  
  /**
   * Record API call
   */
  public recordAPICall(): void {
    this.metrics.apiCalls++;
  }
  
  /**
   * Record cache hit
   */
  public recordCacheHit(): void {
    this.metrics.cacheHits++;
  }
  
  /**
   * Record cache miss
   */
  public recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }
  
  /**
   * Record batch request
   */
  public recordBatchRequest(): void {
    this.metrics.batchRequests++;
  }
  
  /**
   * Record individual request
   */
  public recordIndividualRequest(): void {
    this.metrics.individualRequests++;
  }
  
  /**
   * Get performance metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      batchEfficiency: this.metrics.batchRequests / (this.metrics.batchRequests + this.metrics.individualRequests) || 0
    };
  }
  
  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchRequests: 0,
      individualRequests: 0,
      averageLoadTime: 0,
      totalLoadTime: 0,
      loadCount: 0
    };
    this.timers.clear();
  }
  
  /**
   * Log performance summary
   */
  public logSummary(): void {
    const metrics = this.getMetrics();
    console.log('🚀 Performance Summary:', {
      'API Calls': metrics.apiCalls,
      'Cache Hit Rate': `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
      'Batch Efficiency': `${(metrics.batchEfficiency * 100).toFixed(1)}%`,
      'Average Load Time': `${metrics.averageLoadTime.toFixed(2)}ms`,
      'Total Load Time': `${metrics.totalLoadTime.toFixed(2)}ms`
    });
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-log performance every 30 seconds in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    performanceMonitor.logSummary();
  }, 30000);
}

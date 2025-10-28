// Performance monitoring service
class PerformanceMonitor {
  private metrics: Array<{
    name: string;
    duration: number;
    timestamp: number;
    type: 'api' | 'component' | 'operation';
  }> = [];

  // Track performance metric
  trackMetric(name: string, duration: number, type: 'api' | 'component' | 'operation' = 'operation') {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      type
    });

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log slow operations
    if (duration > 1000) { // More than 1 second
      console.warn(`Slow operation detected: ${name} took ${duration}ms`);
    }
  }

  // Get performance statistics
  getStats() {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    const recentMetrics = this.metrics.filter(m => m.timestamp > lastHour);

    if (recentMetrics.length === 0) {
      return { averageDuration: 0, slowOperations: 0, totalOperations: 0 };
    }

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const slowOperations = recentMetrics.filter(m => m.duration > 1000).length;

    return {
      averageDuration: totalDuration / recentMetrics.length,
      slowOperations,
      totalOperations: recentMetrics.length,
      slowestOperation: recentMetrics.reduce((max, m) => m.duration > max.duration ? m : max, recentMetrics[0])
    };
  }

  // Get component-specific stats
  getComponentStats(componentName: string) {
    const componentMetrics = this.metrics.filter(
      m => m.name.includes(componentName) && m.type === 'component'
    );

    if (componentMetrics.length === 0) {
      return { averageDuration: 0, renderCount: 0 };
    }

    const totalDuration = componentMetrics.reduce((sum, m) => sum + m.duration, 0);
    
    return {
      averageDuration: totalDuration / componentMetrics.length,
      renderCount: componentMetrics.length,
      slowestRender: componentMetrics.reduce((max, m) => m.duration > max.duration ? m : max, componentMetrics[0])
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Performance tracking decorator
export function trackPerformance(name: string, type: 'api' | 'component' | 'operation' = 'operation') {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        performanceMonitor.trackMetric(`${name}.${propertyKey}`, duration, type);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        performanceMonitor.trackMetric(`${name}.${propertyKey}.error`, duration, type);
        throw error;
      }
    };

    return descriptor;
  };
}

// Export for manual tracking
export function trackMetric(name: string, duration: number, type: 'api' | 'component' | 'operation' = 'operation') {
  performanceMonitor.trackMetric(name, duration, type);
}

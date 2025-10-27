import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Lazy loading service for non-critical data
 * Loads data only when it's actually needed or visible
 */
class LazyLoadingService {
  private static instance: LazyLoadingService;
  
  // Intersection Observer for lazy loading
  private observer: IntersectionObserver | null = null;
  private observedElements = new Map<Element, () => void>();
  
  // Throttling for scroll events
  private scrollThrottleTimer: number | null = null;
  private readonly SCROLL_THROTTLE_DELAY = 100; // 100ms
  
  // Loading states
  private loadingStates = new Map<string, boolean>();
  
  private constructor() {
    this.initializeObserver();
  }
  
  public static getInstance(): LazyLoadingService {
    if (!LazyLoadingService.instance) {
      LazyLoadingService.instance = new LazyLoadingService();
    }
    return LazyLoadingService.instance;
  }
  
  /**
   * Initialize Intersection Observer
   */
  private initializeObserver(): void {
    if (typeof window === 'undefined') return;
    
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const callback = this.observedElements.get(entry.target);
            if (callback) {
              callback();
              this.observedElements.delete(entry.target);
              this.observer?.unobserve(entry.target);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '50px', // Load 50px before element comes into view
        threshold: 0.1
      }
    );
  }
  
  /**
   * Observe an element for lazy loading
   */
  public observeElement(element: Element, callback: () => void): void {
    if (!this.observer) return;
    
    this.observedElements.set(element, callback);
    this.observer.observe(element);
  }
  
  /**
   * Stop observing an element
   */
  public unobserveElement(element: Element): void {
    if (!this.observer) return;
    
    this.observedElements.delete(element);
    this.observer.unobserve(element);
  }
  
  /**
   * Load data when element becomes visible
   */
  public loadWhenVisible(element: Element, loadFunction: () => Promise<void>): void {
    this.observeElement(element, loadFunction);
  }
  
  /**
   * Load data with delay (for non-critical data)
   */
  public loadWithDelay(loadFunction: () => Promise<void>, delay: number = 1000): void {
    setTimeout(loadFunction, delay);
  }
  
  /**
   * Load data on scroll (throttled)
   */
  public loadOnScroll(loadFunction: () => Promise<void>): void {
    if (this.scrollThrottleTimer) return;
    
    this.scrollThrottleTimer = window.setTimeout(() => {
      loadFunction();
      this.scrollThrottleTimer = null;
    }, this.SCROLL_THROTTLE_DELAY);
  }
  
  /**
   * Set loading state
   */
  public setLoading(key: string, loading: boolean): void {
    this.loadingStates.set(key, loading);
  }
  
  /**
   * Get loading state
   */
  public isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }
  
  /**
   * Load data in batches to avoid overwhelming the server
   */
  public async loadInBatches<T>(
    items: T[],
    batchSize: number = 5,
    loadFunction: (batch: T[]) => Promise<void>,
    delayBetweenBatches: number = 200
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await loadFunction(batch);
      
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
  }
  
  /**
   * Preload critical data
   */
  public preloadCritical(loadFunction: () => Promise<void>): void {
    // Load immediately for critical data
    loadFunction();
  }
  
  /**
   * Preload non-critical data
   */
  public preloadNonCritical(loadFunction: () => Promise<void>, delay: number = 2000): void {
    // Load after a delay for non-critical data
    setTimeout(loadFunction, delay);
  }
  
  /**
   * Load data based on priority
   */
  public loadByPriority(
    critical: () => Promise<void>,
    important: () => Promise<void>,
    niceToHave: () => Promise<void>
  ): void {
    // Load critical data immediately
    this.preloadCritical(critical);
    
    // Load important data after a short delay
    this.loadWithDelay(important, 500);
    
    // Load nice-to-have data after a longer delay
    this.loadWithDelay(niceToHave, 2000);
  }
  
  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.observedElements.clear();
    this.loadingStates.clear();
    
    if (this.scrollThrottleTimer) {
      clearTimeout(this.scrollThrottleTimer);
      this.scrollThrottleTimer = null;
    }
  }
}

// Export singleton instance
export const lazyLoadingService = LazyLoadingService.getInstance();

// Vue composable for lazy loading
export function useLazyLoading() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const loadData = async (loadFunction: () => Promise<void>) => {
    try {
      isLoading.value = true;
      error.value = null;
      await loadFunction();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Lazy loading error:', err);
    } finally {
      isLoading.value = false;
    }
  };
  
  const loadWhenVisible = (element: Element, loadFunction: () => Promise<void>) => {
    lazyLoadingService.loadWhenVisible(element, () => loadData(loadFunction));
  };
  
  const loadWithDelay = (loadFunction: () => Promise<void>, delay: number = 1000) => {
    lazyLoadingService.loadWithDelay(() => loadData(loadFunction), delay);
  };
  
  onMounted(() => {
    // Initialize lazy loading service
  });
  
  onUnmounted(() => {
    // Cleanup if needed
  });
  
  return {
    isLoading,
    error,
    loadData,
    loadWhenVisible,
    loadWithDelay
  };
}

// Simple error tracking service
class ErrorTracker {
  private errors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
    url: string;
    userAgent: string;
  }> = [];

  // Track an error
  trackError(error: Error, context?: string) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: context || 'unknown'
    };

    this.errors.push(errorData);
    
    // Keep only last 50 errors to prevent memory issues
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error tracked:', errorData);
    }

    // In production, you could send to external service
    if (import.meta.env.PROD) {
      // Example: Send to external service
      // this.sendToExternalService(errorData);
    }
  }

  // Get recent errors
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  // Clear errors
  clearErrors() {
    this.errors = [];
  }

  // Send to external service (placeholder)
  private async sendToExternalService(errorData: any) {
    try {
      // Example: Send to your own API endpoint
      await fetch('/api/error-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      });
    } catch (e) {
      console.warn('Failed to send error to tracking service:', e);
    }
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// Global error handler
window.addEventListener('error', (event) => {
  errorTracker.trackError(event.error, 'global-error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorTracker.trackError(
    new Error(event.reason?.message || 'Unhandled promise rejection'),
    'unhandled-rejection'
  );
});

// Export for manual error tracking
export function trackError(error: Error, context?: string) {
  errorTracker.trackError(error, context);
}

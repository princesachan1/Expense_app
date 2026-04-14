import { API_CONFIG } from '../constants/config';

/**
 * KeepAlive Service
 * 
 * Pings the HuggingFace backend every 10 minutes to prevent the free-tier
 * Space from going to sleep (which causes a 30-60s cold start on wake).
 */

let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

export const KeepAliveService = {
  /**
   * Starts a background interval that pings /api/health every 10 minutes.
   * Safe to call multiple times — only one interval will be active.
   */
  start() {
    if (keepAliveInterval) return; // Already running

    console.log('[KeepAlive] Starting background pings...');

    // Ping immediately on start to wake up the Space if it's asleep
    this.ping();

    // Then ping every 10 minutes (HF Spaces sleep after ~15 min of inactivity)
    keepAliveInterval = setInterval(() => {
      this.ping();
    }, 10 * 60 * 1000); // 10 minutes
  },

  /**
   * Stops the background keep-alive pings.
   */
  stop() {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
      console.log('[KeepAlive] Stopped background pings.');
    }
  },

  /**
   * Sends a single lightweight ping to the backend health endpoint.
   */
  async ping() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
      const data = await response.json();
      console.log(`[KeepAlive] Ping OK: ${data.status}`);
    } catch (error) {
      console.log('[KeepAlive] Ping failed (Space may be starting up)');
    }
  },
};

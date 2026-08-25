/**
 * 基础内存滑动窗口限流器（SEC-01）。
 *
 * 平台无关：不依赖 Cloudflare，任何能拿到客户端标识的运行时都能用。
 * 已知边界：内存状态随隔离实例各自独立，多实例部署时上限按实例数放大；
 * 作为试用期的“基础防滥用”足够，正式化时替换为共享存储实现即可。
 */

export type RateLimiterOptions = {
  /** 窗口长度（毫秒） */
  windowMs: number;
  /** 窗口内允许的最大次数 */
  max: number;
  /** 超过该 key 数量后触发 opportunistic 清理 */
  gcThreshold?: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  /** 被拒绝时，建议客户端等待的秒数 */
  retryAfterSec: number;
};

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max } = options;
  const gcThreshold = options.gcThreshold ?? 5_000;
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): RateLimitDecision {
    const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= max) {
      hits.set(key, recent);
      const retryAfterMs = Math.max(0, windowMs - (now - recent[0]));
      return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
    }

    recent.push(now);
    hits.set(key, recent);

    if (hits.size > gcThreshold) {
      for (const [entryKey, timestamps] of hits) {
        if (timestamps.every((timestamp) => now - timestamp >= windowMs)) hits.delete(entryKey);
      }
    }

    return { allowed: true, retryAfterSec: 0 };
  };
}

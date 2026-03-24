import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { rateLimitsTable } from "@workspace/db";
import { and, eq, gte, count } from "drizzle-orm";

function getIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

export function rateLimit(action: string, maxRequests: number, windowMinutes: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getIp(req);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    const rows = await db
      .select({ cnt: count() })
      .from(rateLimitsTable)
      .where(
        and(
          eq(rateLimitsTable.ipAddress, ip),
          eq(rateLimitsTable.action, action),
          gte(rateLimitsTable.createdAt, since)
        )
      );

    const cnt = Number(rows[0]?.cnt ?? 0);
    if (cnt >= maxRequests) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    await db.insert(rateLimitsTable).values({ ipAddress: ip, action });
    next();
  };
}

"use client";
import type { MetaEvent } from "@/lib/meta/events";

type Job = {
  input: MetaEvent;
  body: string;
  attempts: number;
  active: boolean;
  timer?: ReturnType<typeof setTimeout>;
  controller?: AbortController;
};

/** Best-effort, document-local retry. It never replays Pixel or persists an outbox. */
export function createObservationDelivery(
  allowed: (visitorId: string) => boolean,
  fetcher: typeof fetch = (...args) => fetch(...args),
) {
  const jobs = new Map<string, Job>();
  let active = 0;
  function valid(job: Job) {
    try {
      return Date.now() - job.input.occurredAt <= 60000 && allowed(job.input.visitorId);
    } catch {
      return false;
    }
  }
  function pump() {
    for (const [id, job] of jobs) {
      if (active >= 2) break;
      if (job.active || job.timer) continue;
      if (!valid(job)) {
        jobs.delete(id);
        continue;
      }
      job.active = true;
      job.attempts++;
      active++;
      void perform(job);
    }
  }
  async function perform(job: Job) {
    const controller = new AbortController();
    job.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 4000);
    let retryable = false;
    try {
      const response = await fetcher("/api/meta/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: job.body,
        keepalive: true,
        signal: controller.signal,
      });
      retryable = !response.ok && (response.status === 429 || response.status >= 500);
    } catch {
      retryable = true;
    } finally {
      clearTimeout(timeout);
      active--;
      job.active = false;
      job.controller = undefined;
      if (jobs.get(job.input.eventId) === job) {
        if (retryable && job.attempts < 3 && valid(job)) {
          job.timer = setTimeout(
            () => {
              job.timer = undefined;
              pump();
            },
            job.attempts === 1 ? 1000 : 3000,
          );
        } else jobs.delete(job.input.eventId);
      }
      pump();
    }
  }
  return {
    send(input: MetaEvent) {
      if (jobs.size >= 50 || jobs.has(input.eventId)) return;
      const job: Job = { input, body: JSON.stringify(input), attempts: 0, active: false };
      if (!valid(job)) return;
      jobs.set(input.eventId, job);
      pump();
    },
    cancel() {
      for (const job of jobs.values()) {
        clearTimeout(job.timer);
        job.controller?.abort();
      }
      jobs.clear();
    },
  };
}

"use client";

import { useState } from "react";
import { Button } from "./Button";

type Status = "idle" | "submitting" | "success" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus("success");
        setMessage("订阅成功，感谢关注！");
        setEmail("");
      } else if (response.status === 409) {
        setStatus("error");
        setMessage("该邮箱已订阅。");
      } else {
        setStatus("error");
        setMessage("请输入有效的邮箱地址。");
      }
    } catch {
      setStatus("error");
      setMessage("网络错误，请稍后重试。");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-label="邮箱地址"
          className="flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-900"
        />
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "订阅中…" : "订阅"}
        </Button>
      </div>
      {message ? (
        <p role="status" className="text-sm text-slate-600">
          {message}
        </p>
      ) : null}
    </form>
  );
}

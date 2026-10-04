"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./Button";

type Status = "idle" | "submitting" | "success" | "error";

export function NewsletterForm() {
  const t = useTranslations("home.newsletter");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [messageKey, setMessageKey] = useState<"success" | "duplicate" | "invalidEmail" | "networkError" | "">("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessageKey("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus("success");
        setMessageKey("success");
        setEmail("");
      } else if (response.status === 409) {
        setStatus("error");
        setMessageKey("duplicate");
      } else {
        setStatus("error");
        setMessageKey("invalidEmail");
      }
    } catch {
      setStatus("error");
      setMessageKey("networkError");
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
          placeholder={t("placeholder")}
          aria-label={t("emailAria")}
          className="flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-900"
        />
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? t("submitting") : t("submit")}
        </Button>
      </div>
      {messageKey ? (
        <p role="status" className="text-sm text-slate-600">
          {t(messageKey)}
        </p>
      ) : null}
    </form>
  );
}

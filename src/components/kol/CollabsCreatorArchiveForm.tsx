"use client";
import { useState } from "react";

export const archiveReasons: Record<string, string> = {
  test: "测试账号",
  ended: "合作已结束",
  other: "其他原因",
};

export function CollabsCreatorArchiveForm({
  creator,
  busy,
  confirm,
  cancel,
}: {
  creator: { id: string; name: string; alias: string };
  busy: boolean;
  confirm: (body: { id: string; reason: string; note: string; confirmed: true }) => Promise<void>;
  cancel: () => void;
}) {
  const [reason, setReason] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  return (
    <form
      className="collabs-form"
      aria-label={`归档 ${creator.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason || !confirmed || busy) return;
        const f = new FormData(e.currentTarget);
        void confirm({
          id: creator.id,
          reason,
          note: String(f.get("note") ?? ""),
          confirmed: true,
        });
      }}
    >
      <h3>归档 {creator.name}</h3>
      <p>
        /r/{creator.alias}{" "}
        将停用，并从日常列表和访问统计中隐藏；历史订单、报告和归属证据保留，可在下方恢复。
      </p>
      <p className="muted">
        此操作不会终止 Collabs 合作、撤销官方优惠码或取消佣金。正式结束合作请另到 Collabs 核对。
      </p>
      <label>
        归档原因
        <select required value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy}>
          <option value="" disabled>
            请选择原因
          </option>
          {Object.entries(archiveReasons).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        备注（可选）
        <input name="note" maxLength={500} disabled={busy} placeholder="例如：内部联调已结束" />
      </label>
      <label className="collabs-checkbox">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={busy}
        />
        已确认归档对象及以上影响
      </label>
      <div className="collabs-actions">
        <button className="primary" disabled={busy || !reason || !confirmed}>
          {busy ? "正在归档…" : "确认归档"}
        </button>
        <button type="button" onClick={cancel} disabled={busy}>
          取消
        </button>
      </div>
    </form>
  );
}

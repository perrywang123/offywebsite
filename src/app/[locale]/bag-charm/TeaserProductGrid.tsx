"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";

export interface TeaserProductItem {
  code: string;
  image: string;
}

/** 悬停需停留满这么久才弹出预览,避免划过卡片就意外触发。 */
const HOVER_OPEN_DELAY_MS = 3000;
/** 悬停态下,指针移到预览面板之外的关闭宽限(给移向面板留出时间)。 */
const HOVER_CLOSE_GRACE_MS = 150;

/**
 * 预告产品卡 + 悬浮预览(quick view)。不跳转页面:
 * - 悬停(hover 能力设备):鼠标在卡片上停留满 3s → 显示浮窗(临时态);未满 3s
 *   移出则取消、不弹出。打开后鼠标真正移动到浮窗面板之外(遮罩区域)150ms 后
 *   关闭,移回面板内可取消关闭、继续端详大图。
 * - 点击"点击查看":不受 3s 延迟限制,立即把浮窗"钉住"(sticky),不再自动关闭,
 *   需显式关闭(背景/Esc/✕/再次点击同一按钮)。
 *
 * 浮窗通过 React Portal 直接挂载到 document.body,而不是作为本组件的兄弟
 * 节点渲染 —— 原因:本页面根布局 `app/[locale]/template.tsx` 给整页内容包了
 * 一层 `.animate-page-enter`(进入动画),其关键帧结束态是
 * `transform: translateY(0)`,配合 `animation-fill-mode: both` 会永久保留。
 * 只要 `transform` 不是 `none`,该元素就会成为所有后代 `fixed`/`absolute`
 * 元素的新 containing block —— 导致浮窗的 `fixed inset-0` 实际相对于这个
 * 包裹了整页内容的 div 布局/居中,而不是相对于浏览器视口,表现为"浮窗没有在
 * 可视区域居中,而是偏移到页面整体内容的几何中点"。挂到 document.body 可
 * 彻底跳出这层以及任何其它父级可能存在的 transform/containing-block 干扰,
 * 确保 `fixed` 永远相对于真实视口定位。
 *
 * 真机(真实 Chrome + 鼠标指针)测试中发现并修复的问题:
 *
 * 1) 点击/悬停的时序竞争:鼠标用户点击按钮前指针必然先掠过卡片。若点击简单按
 *    "当前是否已是该商品"来 toggle,会把刚由 hover 打开的面板误判为
 *    "已打开→本次点击应关闭"。用 stickyRef 区分"临时预览"与"用户主动钉住"
 *    两种状态,点击时:若尚未钉住(即使正因 hover 显示着)→ 转为钉住态,保持
 *    打开;若已经是钉住态且点的是同一商品 → 关闭(真正的二次点击关闭)。
 *
 * 2) 悬停打开后被自己"诈关闭":浮窗是一个覆盖全屏的 fixed 遮罩,一旦插入 DOM,
 *    Chromium 会在鼠标完全静止、并未真实移动的情况下,重新计算 :hover 状态并
 *    对原卡片派发一次"合成的" mouseout/mouseleave(因为该像素位置现在被遮罩
 *    盖住了)。这个事件 isTrusted 为 true,但并非用户真实移动鼠标所致;若据此
 *    调度自动关闭,会在刚打开后很快被自己关掉。修复:不再依赖卡片的
 *    mouseleave 来调度"已打开面板"的关闭(该事件对 DOM 突变不可靠),改为
 *    监听遮罩自身的 mousemove ——该事件只会由真实指针移动触发,不会被引擎
 *    合成重放——判断指针当前是落在面板内部(取消关闭)还是面板外的遮罩区域
 *    (调度关闭)。
 */
export function TeaserProductGrid({
  items,
  viewDetailLabel,
  closeLabel,
  quickViewLabel,
}: {
  items: TeaserProductItem[];
  viewDetailLabel: string;
  closeLabel: string;
  quickViewLabel: string;
}) {
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  /** 悬停满 3s 才弹出的"待打开"计时器;未满时移出卡片会被取消。 */
  const hoverOpenTimerRef = useRef<number | null>(null);
  /** true = 当前打开的浮窗由用户显式点击"钉住",不随指针移出面板而自动关闭。 */
  const stickyRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHoverCapable(mq.matches);
    const onChange = () => setHoverCapable(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (!activeCode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (hoverOpenTimerRef.current) window.clearTimeout(hoverOpenTimerRef.current);
    };
  }, []);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const cancelPendingHoverOpen = () => {
    if (hoverOpenTimerRef.current) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  };
  /** 仅对"非钉住"的临时预览生效的延时关闭(给鼠标移向浮窗留出时间)。 */
  const scheduleClose = () => {
    if (stickyRef.current || closeTimerRef.current) return;
    closeTimerRef.current = window.setTimeout(() => setActiveCode(null), HOVER_CLOSE_GRACE_MS);
  };
  /** 悬停满 3s 后触发:打开为临时态,不钉住。 */
  const openOnHover = (code: string) => {
    hoverOpenTimerRef.current = null;
    cancelScheduledClose();
    stickyRef.current = false;
    setActiveCode(code);
  };
  /** 鼠标进入卡片:启动 3s 停留计时器,未满时移出会被取消。 */
  const handleCardMouseEnter = (code: string) => {
    if (!hoverCapable) return;
    cancelPendingHoverOpen();
    hoverOpenTimerRef.current = window.setTimeout(() => openOnHover(code), HOVER_OPEN_DELAY_MS);
  };
  /** 鼠标移出卡片:若还没满 3s(浮窗尚未弹出),取消待打开计时器。 */
  const handleCardMouseLeave = () => {
    if (!hoverCapable) return;
    cancelPendingHoverOpen();
  };
  /**
   * 点击打开/切换:不受 3s 停留延迟限制,立即生效。
   * 已钉住且是同一商品 → 关闭;否则钉住打开(覆盖/抢占悬停态或悬停待打开计时器)。
   */
  const toggleOnClick = (code: string) => {
    cancelPendingHoverOpen();
    cancelScheduledClose();
    if (activeCode === code && stickyRef.current) {
      stickyRef.current = false;
      setActiveCode(null);
      return;
    }
    stickyRef.current = true;
    setActiveCode(code);
  };
  /** 背景/Esc/✕ 的显式关闭:无论是否钉住都直接关闭。 */
  const closeAll = () => {
    cancelPendingHoverOpen();
    cancelScheduledClose();
    stickyRef.current = false;
    setActiveCode(null);
  };
  /**
   * 浮窗遮罩层的 mousemove(仅真实指针移动触发,不会被引擎合成重放):
   * 指针落在面板内 → 取消已调度的关闭;落在面板外的遮罩区域 → 调度关闭。
   */
  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverCapable || stickyRef.current) return;
    const target = e.target as Node;
    if (panelRef.current?.contains(target)) {
      cancelScheduledClose();
    } else {
      scheduleClose();
    }
  };

  const activeItem = items.find((it) => it.code === activeCode) ?? null;

  const overlay = activeItem && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${quickViewLabel} — ${activeItem.code}`}
      onClick={closeAll}
      onMouseMove={handleOverlayMouseMove}
    >
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm motion-reduce:backdrop-blur-none" />
      <div
        ref={panelRef}
        className="quick-view-panel relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-card border border-cream-line bg-white/30 shadow-card-hover backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={closeLabel}
          onClick={closeAll}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink/80 text-cream transition-colors hover:bg-ink"
        >
          ✕
        </button>
        <div className="relative aspect-[877/1078] w-full bg-cream-deep/40">
          <Image
            src={activeItem.image}
            alt={activeItem.code}
            fill
            sizes="(max-width: 768px) 90vw, 448px"
            className="object-contain p-5"
          />
        </div>
        <div className="px-5 py-4 text-center text-sm font-medium tracking-wide text-ink">
          {activeItem.code}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:gap-x-8">
        {items.map((item, i) => (
          <Reveal key={item.code} delay={Math.min(i, 5) * 60}>
            <div
              className="group"
              onMouseEnter={() => handleCardMouseEnter(item.code)}
              onMouseLeave={handleCardMouseLeave}
            >
              <div className="relative aspect-[877/1078] overflow-hidden rounded-card bg-cream-deep">
                <Image
                  src={item.image}
                  alt={item.code}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-contain p-2 transition-transform duration-500 ease-editorial group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between gap-3 pt-3">
                <span className="text-sm font-medium text-ink">{item.code}</span>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={activeCode === item.code}
                  onClick={() => toggleOnClick(item.code)}
                  className="shrink-0 text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  {viewDetailLabel} →
                </button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* 浮窗通过 Portal 挂载到 document.body,确保 fixed 相对视口定位,不受
          任何父级 transform(如页面进入动画)影响;详见组件顶部注释。 */}
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}

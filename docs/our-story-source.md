# OUR STORY 页改版文案（Excel 提取）

来源：`副本独立站首页文案 (1).xlsx` → `OUR STORY` 工作表（该表只有 7 个非空行）。
B 列 = 原文案，C 列 = 最终文案 / 修正意见。

## 已确认的现状映射（代码侧）

| Excel 行 | section | 对应代码 | 动作 |
| --- | --- | --- | --- |
| 2 | `OUR STORY` | `about.storyKicker` = "Our Story" | 保留 |
| 3 | 页首标语 | `about.title` = "Imagine with Love. Create with Companion." | 改 |
| 4 | Where She Came From 区块 | `about.storyHeading` + `storyP1/P2/P3` | 改 |
| 5 | 黑色条（The Makers / JIE·桃子） | `about/page.tsx` 的「团队」section | **整块删除** |
| 6 | Stockists 区块 | 「零售网络」section（retailKicker/Heading/1-3） | **整块删除** |
| 7 | Coming Next | 「未来 IP」section（media-placeholder + comingSoonLabel） | 换成首页的后续计划卡片 |

---

## row 3

**原文案**

```
Imagine with Love. Create with Companion.
```

**最终文案**

```
Meet Who You Love to Be
Imagine with Love. Create with Companion.
```

## row 4

**原文案**

```
Where She Came From
As die-hard Zelda fans, we wanted to bring the Korok into reality — a little spirit hiding in the city noise, drawing power from nature.
But Offy is more than soft and cute — she's willful, stubborn, and full of strange ideas. She wears her emotions on the outside.
You're not just picking a plush — you're picking the her that resonates with you.
```

**最终文案**

```
At isoffy, OFFY is never just another "cute" or "exquisite" collectible figure.

When meeting people across different cities around the world, there is one reaction we hear time and time again:
"This looks so much like me."
"This looks just like my friend—let me send them a picture."

In that moment, we realized what OFFY truly exists for: a companion to help you find yourself.

We Are Always Becoming:
Human beings are fluid. We change and evolve—some days vibrant and eager to explore, other days tired and wishing to hide away. We shift through highs and lows, but every single version of you deserves to be embraced.

OFFY is a gentle clan of spirits born on the untamed Briar Island. Rooted in OFFLINE, they carry a quiet permission: 
 Disconnect and step back, without the need to always answer the world.
 Return to nature, living at your own authentic frequency.
 Dress your true self, styled purely to match your mood. 
 
You don't need to fit into anyone else's box. Change an outfit, swap an accessory, and match your feeling—in the mirror of OFFY, find the version of yourself you truly love. 
```

## row 5

**原文案**

```
去掉这块
```

**最终文案**

```
去掉这块
```

## row 6

**原文案**

```
去掉这块
```

**最终文案**

```
去掉这块
```

## row 7

**原文案**

```
修改成首页的这块儿👉
```

**最终文案**

```
None
```

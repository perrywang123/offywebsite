import type { Series } from "./types";

export const seriesList: Series[] = [
  {
    slug: "bag-charm",
    name: { zh: "时尚包挂", en: "Fashionable Bag Charm" },
    tagline: { zh: "把 Offy 挂在包上，随身陪伴", en: "Carry Offy everywhere you go" },
  },
  {
    slug: "signature",
    name: { zh: "Signature 经典毛绒", en: "Signature Plush" },
    tagline: { zh: "最纯粹的原皮与经典形象", en: "The signature looks, in their purest form" },
  },
  {
    slug: "multi-texture",
    name: { zh: "多材质", en: "Multi-texture" },
    tagline: { zh: "环保再生与金属质感", en: "Recycled eco & metallic finishes" },
  },
  {
    slug: "recycled-eco",
    name: { zh: "环保再生", en: "Recycled & Eco" },
    tagline: { zh: "再生材质，温柔对待地球", en: "Recycled materials, gentle on the planet" },
  },
  {
    slug: "active-sporty",
    name: { zh: "活力运动", en: "Active & Sporty" },
    tagline: { zh: "为球场、健身房与街头而生", en: "Built for the court, gym, and street" },
  },
  {
    slug: "outdoor-lifestyle",
    name: { zh: "户外生活", en: "Outdoor & Lifestyle" },
    tagline: { zh: "为自然、城市漫步与聚会而生", en: "Made for nature, citywalks, and hangouts" },
  },
  {
    slug: "princess-elegance",
    name: { zh: "公主优雅", en: "Princess & Elegance" },
    tagline: { zh: "为下午茶、展览与日常优雅而定制", en: "Tailored for high tea, exhibitions, and daily chic" },
  },
  {
    slug: "playful",
    name: { zh: "玩趣", en: "Playful" },
    tagline: { zh: "为日常玩乐时刻而生", en: "Made for daily fun moments" },
  },
  {
    slug: "large-plush",
    name: { zh: "大号毛绒", en: "Large Plush" },
    tagline: { zh: "更大只，更治愈的拥抱", en: "Bigger, warmer hugs" },
  },
];

export const seriesMap: Record<string, Series> = Object.fromEntries(
  seriesList.map((s) => [s.slug, s]),
);

export function getSeries(slug: string): Series | undefined {
  return seriesMap[slug];
}

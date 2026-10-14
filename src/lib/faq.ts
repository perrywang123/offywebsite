/**
 * 独立站 Q&A 内容(final 版)。
 *
 * 来源:`独立站Q&A_审核修订稿——final(2).docx`(审核修订终稿,2026-10-14)。
 * 本文件由 `tmp/faq-extract/build_faq.py` 用 python-docx 直接从 docx 的 runs 生成
 * (读 text / bold / 字号),不是手抄,避免转录错误;带格式的对照提取稿见
 * `docs/qa-source-final.md`。
 *
 * 只把 docx 的**加粗**与**分段**带进数据:docx 里的字号不对应网页层级 ——
 * 26pt 总标题 → 页面 h1、15/16pt Part 标题 → section 的 h2、14pt 问题 → summary,
 * 都由页面元素承担;答案内部只还原加粗小标题与分段换行。
 *
 * 机械清洗(不改写正文):删掉批注锚点残留的空括号(`locked()`→`locked`、
 * `cm()`→`cm`),并去掉行尾多余空格、折叠段内连续空白。
 *
 * 三个部分共 10 条。文案只有英文(与政策页同理:法务相邻内容不做机翻)。
 * 展示页:`src/app/[locale]/faq/page.tsx`;页脚入口在「Policies & Contact」组。
 */

/** 行内片段:一段连续文本 + 是否加粗(来自 docx run 的 bold)。 */
export interface FaqSegment {
  text: string;
  /** 源文档里这一段是加粗的(渲染成 `<strong>`)。未加粗时省略。 */
  bold?: boolean;
}

/** 答案的一个段落(对应 docx 里的一个段落);段落由行内片段组成。 */
export type FaqBlock = FaqSegment[];

export interface FaqItem {
  /** 问题(英文原文,已去掉文档里的 `Qn:` 编号)。 */
  q: string;
  /** 答案:每个元素渲染成一个 `<p>`,片段按 bold 渲染成 `<strong>` 或纯文本。 */
  a: FaqBlock[];
}

export interface FaqPart {
  /** 部分标题,含编号与 emoji。注意 `PART 1` 被老板要求改成大写(源文档是 `Part 1:`),
   * 以便与 PART 2 / PART 3 一致 —— 即此处**不**完全等于源文档。 */
  title: string;
  items: FaqItem[];
}

export const faqParts: FaqPart[] = [
  {
    title: "PART 1: 📦 Shipping & Delivery",
    items: [
      {
        q: "How long will it take for my order to be dispatched?",
        a: [
          [
            { text: "In-Stock Items:", bold: true },
            { text: " Our processing time is up to " },
            { text: "72 hours", bold: true },
            {
              text: " (Monday through Saturday, excluding public holidays) before your order is dispatched. Orders placed over weekends or public holidays will be processed starting on the next business day.",
            },
          ],
          [
            { text: "Pre-Order Items:", bold: true },
            {
              text: " Pre-orders will be dispatched according to the estimated release date stated on the product page.",
            },
          ],
        ],
      },
      {
        q: "How long does shipping take to my destination?",
        a: [
          [
            { text: "Estimated delivery windows below include our " },
            { text: "72-hour processing", bold: true },
            { text: ", followed by the respective transit times by region:" },
          ],
          [
            { text: "Mainland China & Hong Kong", bold: true },
            {
              text: ": Transit takes approx. 3–7 business days (Total: approx. 6–10 business days)",
            },
          ],
          [
            { text: "Southeast Asia", bold: true },
            {
              text: " (Singapore, Malaysia, Thailand and etc.): Transit takes approx. 5–10 business days (Total: approx. 8–13 business days)",
            },
          ],
          [
            { text: "Europe", bold: true },
            {
              text: "(UK): Transit takes approx. 7–14 business days (Total: approx. 10–17 business days)",
            },
          ],
          [
            { text: "North America", bold: true },
            {
              text: " (United States, Canada): Transit takes approx. 8–18 business days (Total: approx. 11–21 business days)",
            },
          ],
          [
            { text: "Oceania", bold: true },
            {
              text: " (Australia, New Zealand): Transit takes approx. 8–18 business days (Total: approx. 11–21 business days)",
            },
          ],
          [
            {
              text: "Please note: Transit times are estimates provided in good faith and are not guaranteed. Delivery to remote or outlying areas, or during peak shopping seasons (such as Black Friday and Christmas), may require additional time.",
            },
          ],
        ],
      },
      {
        q: "How do I track my parcel? Why hasn't the tracking status updated for several days?",
        a: [
          [
            { text: "Within " },
            { text: "24 hours after your order completes processing", bold: true },
            {
              text: ", you will receive a dispatch confirmation email containing your tracking number and tracking link.",
            },
          ],
          [
            { text: "Tracking Update Gaps:", bold: true },
            {
              text: " Cross-border parcels involve international line-haul transit, export processing, and customs handovers. As packages transfer between stages, tracking updates may pause for several days between physical scans; This is normal and does not mean your package is lost.",
            },
          ],
          [
            { text: "If your tracking status shows " },
            { text: "no updates for more than 7 business days (or 10 calendar days)", bold: true },
            { text: ", please contact our support team at " },
            { text: "contact@whimcoreofficial.com", bold: true },
            {
              text: ". We will coordinate with our logistics partners to investigate and get back to you promptly.",
            },
          ],
        ],
      },
      {
        q: "Can I amend my shipping address or contact details after ordering?",
        a: [
          [
            {
              text: "Due to the speed of our fulfillment workflow and the nature of international express line-hauls, addresses cannot be altered once a parcel enters processing or dispatch:",
            },
          ],
          [
            { text: "In-Stock Orders:", bold: true },
            { text: " Address amendments can only be requested " },
            { text: "within 24 hours of placing your order", bold: true },
            { text: " and " },
            { text: "strictly before the order enters the processing phase", bold: true },
            { text: ". Please email us immediately at " },
            { text: "contact@whimcoreofficial.com", bold: true },
            {
              text: " with your Order ID and updated details, and our team will do our best to assist. Once the order has moved into processing, no change can be made.",
            },
          ],
          [
            { text: "Pre-Orders:", bold: true },
            { text: " You may request address changes anytime " },
            {
              text: "prior to the stock arriving and the order entering the fulfillment processing stage",
              bold: true,
            },
            { text: ". Once fulfillment processing begins, address updates will be locked." },
          ],
          [
            { text: "Post-Dispatch:", bold: true },
            {
              text: " Once a parcel has been handed over to the carrier, neither we nor the carrier can redirect or amend the shipping address. Any failed deliveries, parcels returned to origin, or abandonments resulting from incorrect, incomplete addresses (such as missing apartment/suite numbers), or uncontactable recipients remain the sole responsibility of the customer.",
            },
          ],
        ],
      },
      {
        q: "Why must I provide a complete and accurate shipping address? What happens if it is incorrect or incomplete?",
        a: [
          [
            {
              text: "To ensure smooth customs clearance and successful delivery, please make sure your shipping details are accurate and complete at checkout (including full name, unit/house number, street name, postal code, and an active phone number):",
            },
          ],
          [{ text: "Customer Responsibility After Dispatch (Non-Refundable)", bold: true }],
          [
            {
              text: "Once an international parcel is dispatched, clearance and delivery are carried out strictly according to the address provided. If a delivery fails, is returned, abandoned, or destroyed due to an incorrect address, missing unit number, invalid postal code, or unreachable contact details, ",
            },
            {
              text: "the customer assumes full responsibility, and the order is non-refundable and ineligible for return",
              bold: true,
            },
            { text: "." },
          ],
          [{ text: "Address Verification (7-Day Email Response Window)", bold: true }],
          [
            {
              text: "Before dispatch, if our system detects that your address is incomplete or invalid, we will reach out ",
            },
            { text: "primarily via official email", bold: true },
            { text: " to verify your details. " },
            { text: "Please reply with your complete address within 7 days.", bold: true },
            { text: " If no response is received within 7 days, the order cannot be shipped and " },
            { text: "will be automatically cancelled and refunded.", bold: true },
          ],
        ],
      },
    ],
  },
  {
    title: "PART 2: 🔄 RETURNS & QUALITY ASSURANCE",
    items: [
      {
        q: "Why does my plush toy look slightly different from the website images? Is this a defect?",
        a: [
          [
            {
              text: "OFFY products are designer art toys and plush collectibles featuring extensive handcrafted sewing and assembly techniques. Due to the physical nature of plush fabrics and manual craftsmanship, the following conditions are inherent characteristics and are not considered defects:",
            },
          ],
          [
            { text: "Minor Loose Threads:", bold: true },
            {
              text: " Minor stray threads can be safely trimmed without affecting structural integrity.",
            },
          ],
          [
            { text: "Subtle Asymmetry:", bold: true },
            {
              text: " Hand-finished stitching and facial embroidery may exhibit slight variations, giving each piece its own unique character.",
            },
          ],
          [
            { text: "Transit Flattening / Pile Impression:", bold: true },
            {
              text: " Long-distance international transport may cause temporary pile flattening or shape distortion. Gently kneading the plush and letting it rest will restore its original fullness.",
            },
          ],
          [
            { text: "Measurement Tolerances:", bold: true },
            { text: " Handcrafted items carry a normal measurement tolerance of approx. ±1–2 cm." },
          ],
        ],
      },
      {
        q: "Do you accept returns?",
        a: [
          [
            {
              text: "Generally, we do not accept returns or exchanges based on personal preference, given the limited-edition collectible nature of OFFY products. Nothing in this policy limits any statutory rights you may have under applicable law.",
            },
          ],
          [
            {
              text: "However, if your product has a quality issue or arrives damaged, we provide a Free Replacement: If your item has a verified manufacturing defect, substantial transit damage, or an incorrect item was sent, our primary remedy is to arrange a Free Replacement of the identical item at no additional cost to you (re-shipping postage fully covered).",
            },
          ],
          [
            { text: "Claim Window:", bold: true },
            { text: " Please reach out to us within " },
            { text: "14 calendar days of delivery", bold: true },
            { text: "." },
          ],
          [
            { text: "Required Proof:", bold: true },
            { text: " Send an email to " },
            { text: "contact@whimcoreofficial.com", bold: true },
            { text: " with your " },
            { text: "Order ID", bold: true },
            { text: ", " },
            { text: "clear defect photos", bold: true },
            { text: ", and a " },
            { text: "continuous, unedited one-take unboxing video", bold: true },
            {
              text: " (showing the sealed outer shipping carton, shipping label, and the entire unpacking process).",
            },
          ],
          [
            { text: "Processing:", bold: true },
            { text: " Once approved, your free replacement will typically be dispatched within " },
            { text: "5 business days", bold: true },
            {
              text: ". In the rare event that the item is completely sold out or discontinued, a refund will be issued instead.",
            },
          ],
        ],
      },
    ],
  },
  {
    title: "PART 3：🔒 PAYMENT, PRIVACY & SECURITY",
    items: [
      {
        q: "Is it safe to pay on your website? Do you store my credit card details?",
        a: [
          [
            {
              text: "We take the security of your payment seriously and apply industry-standard safeguards.",
            },
          ],
          [
            { text: "Encrypted Transmission:", bold: true },
            { text: " All sensitive data across our store is protected by robust " },
            { text: "TLS/SSL encryption protocols", bold: true },
            { text: " to ensure end-to-end security." },
          ],
          [
            { text: "No Card Data Stored:", bold: true },
            { text: " Payment processing is managed directly by globally compliant, " },
            { text: "PCI-DSS Level 1 certified payment gateways", bold: true },
            {
              text: " (such as Stripe, PayPal, Apple Pay, etc.). We do not access, process, or store your full card number, CVV code, or banking credentials on our systems.",
            },
          ],
        ],
      },
      {
        q: "What payment methods do you accept?",
        a: [
          [
            {
              text: "We accept major international credit and debit cards (Visa, Mastercard, American Express, etc.) along with trusted digital wallets such as PayPal, Apple Pay, and Google Pay, depending on available gateways displayed at checkout. Orders must be paid in full prior to order dispatch.",
            },
          ],
        ],
      },
      {
        q: "How do you use my personal data? Do you sell my information?",
        a: [
          [
            { text: "Order Fulfilment Only:", bold: true },
            {
              text: " We strictly collect essential details (name, shipping address, email, and phone number) to process, ship, and support your orders.",
            },
          ],
          [
            { text: "We Do Not Sell Your Data", bold: true },
            {
              text: ": We never sell your personal information to third parties. We handle your personal information in accordance with applicable data protection laws, including the EU GDPR, the UK GDPR, the California Consumer Privacy Act (CCPA/CPRA), and the Hong Kong Personal Data (Privacy) Ordinance (PDPO).",
            },
          ],
        ],
      },
    ],
  },
];

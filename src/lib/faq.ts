/**
 * 独立站 Q&A 内容。
 *
 * 来源:`独立站Q&A_审核修订稿(1).pages`(审核修订终版),提取与清洗过程见 `docs/qa-source.md`。
 * 正文一字未改 —— 这份数据文件是**从提取稿脚本生成**的,不是手抄,避免转录错误。
 *
 * 三个部分共 10 条。文案只有英文(与政策页同理:法务相邻内容不做机翻)。
 * 展示页:`src/app/[locale]/faq/page.tsx`;页脚入口在「Policies & Contact」组。
 */

export interface FaqItem {
  /** 问题(英文原文)。 */
  q: string;
  /** 答案(英文原文,保留原文的换行与分段)。 */
  a: string;
}

export interface FaqPart {
  /** 部分标题,含原文的 emoji。 */
  title: string;
  items: FaqItem[];
}

export const faqParts: FaqPart[] = [
  {
    title: "📦 Shipping & Delivery",
    items: [
      {
        q: "How long will it take for my order to be dispatched?",
        a: "In-Stock Items: Our processing time is up to 72 hours (Monday through Saturday, excluding public holidays) before your order is dispatched. Orders placed over weekends or public holidays will be processed starting on the next business day.\nPre-Order Items: Pre-orders will be dispatched according to the estimated release date stated on the product page.",
      },
      {
        q: "How long does shipping take to my destination?",
        a: "Estimated delivery windows below include our 72-hour processing, followed by the respective transit times by region:\nHong Kong, Macau & Taiwan: Transit takes approx. 3–7 business days (Total: approx. 6–10 business days)\nSoutheast Asia (Singapore, Malaysia, Thailand and etc.): Transit takes approx. 5–10 business days (Total: approx. 8–13 business days)\nEurope(UK): Transit takes approx. 7–14 business days (Total: approx. 10–17 business days)\nNorth America (United States, Canada): Transit takes approx. 8–18 business days (Total: approx. 11–21 business days)\nPlease note: Transit times are estimates provided in good faith and are not guaranteed. Delivery to remote or outlying areas, or during peak shopping seasons (such as Black Friday and Christmas), may require additional time.",
      },
      {
        q: "How do I track my parcel? Why hasn't the tracking status updated for several days?",
        a: "Within 24 hours after your order completes processing, you will receive a dispatch confirmation email containing your tracking number and tracking link.\nTracking Update Gaps: Cross-border parcels involve international line-haul transit, export processing, and customs handovers. As packages transfer between stages, tracking updates may pause for several days between physical scans; This is normal and does not mean your package is lost.\nIf your tracking status shows no updates for more than 7 business days (or 10 calendar days), please contact our support team at contact@whimcoreofficial.com. We will coordinate with our logistics partners to investigate and get back to you promptly.",
      },
      {
        q: "Can I amend my shipping address or contact details after ordering?",
        a: "Due to the speed of our fulfillment workflow and the nature of international express line-hauls, addresses cannot be altered once a parcel enters processing or dispatch:\nIn-Stock Orders: Address amendments can only be requested within 24 hours of placing your order and strictly before the order enters the processing phase. Please email us immediately at contact@whimcoreofficial.com with your Order ID and updated details, and our team will do our best to assist. Once the order has moved into processing, no change can be made.\nPre-Orders: You may request address changes anytime prior to the stock arriving and the order entering the fulfillment processing stage. Once fulfillment processing begins, address updates will be locked.\nPost-Dispatch: Once a parcel has been handed over to the carrier, neither we nor the carrier can redirect or amend the shipping address. Any failed deliveries, parcels returned to origin, or abandonments resulting from incorrect, incomplete addresses (such as missing apartment/suite numbers), or uncontactable recipients remain the sole responsibility of the customer.",
      },
      {
        q: "Why must I provide a complete and accurate shipping address? What happens if it is incorrect or incomplete?",
        a: "To ensure smooth customs clearance and successful delivery, please make sure your shipping details are accurate and complete at checkout (including full name, unit/house number, street name, postal code, and an active phone number):\nCustomer Responsibility After Dispatch (Non-Refundable)\nOnce an international parcel is dispatched, clearance and delivery are carried out strictly according to the address provided. If a delivery fails, is returned, abandoned, or destroyed due to an incorrect address, missing unit number, invalid postal code, or unreachable contact details, the customer assumes full responsibility, and the order is non-refundable and ineligible for return.\nAddress Verification (7-Day Email Response Window)\nBefore dispatch, if our system detects that your address is incomplete or invalid, we will reach out primarily via official email to verify your details. Please reply with your complete address within 7 days. If no response is received within 7 days, the order cannot be shipped and will be automatically cancelled and refunded.",
      },
    ],
  },
  {
    title: "🔄 RETURNS & QUALITY ASSURANCE",
    items: [
      {
        q: "Why does my plush toy look slightly different from the website images? Is this a defect?",
        a: "OFFY products are designer art toys and plush collectibles featuring extensive handcrafted sewing and assembly techniques. Due to the physical nature of plush fabrics and manual craftsmanship, the following conditions are inherent characteristics and are not considered defects:\nMinor Loose Threads: Minor stray threads can be safely trimmed without affecting structural integrity.\nSubtle Asymmetry: Hand-finished stitching and facial embroidery may exhibit slight variations, giving each piece its own unique character.\nTransit Flattening / Pile Impression: Long-distance international transport may cause temporary pile flattening or shape distortion. Gently kneading the plush and letting it rest will restore its original fullness.\nMeasurement Tolerances: Handcrafted items carry a normal measurement tolerance of approx. ±1–2 cm.",
      },
      {
        q: "Do you accept returns?",
        a: "Generally, we do not accept returns or exchanges based on personal preference, given the limited-edition collectible nature of OFFY products. Nothing in this policy limits any statutory rights you may have under applicable law.\nHowever, if your product has a quality issue or arrives damaged, we provide a Free Replacement: If your item has a verified manufacturing defect, substantial transit damage, or an incorrect item was sent, our primary remedy is to arrange a Free Replacement of the identical item at no additional cost to you (re-shipping postage fully covered).\nClaim Window: Please reach out to us within 14 calendar days of delivery.\nRequired Proof: Send an email to contact@whimcoreofficial.com with your Order ID, clear defect photos, and a continuous, unedited one-take unboxing video (showing the sealed outer shipping carton, shipping label, and the entire unpacking process).\nProcessing: Once approved, your free replacement will typically be dispatched within 5 business days. In the rare event that the item is completely sold out or discontinued, a refund will be issued instead.",
      },
    ],
  },
  {
    title: "🔒 PAYMENT, PRIVACY & SECURITY",
    items: [
      {
        q: "Is it safe to pay on your website? Do you store my credit card details?",
        a: "We take the security of your payment seriously and apply industry-standard safeguards.\nEncrypted Transmission: All sensitive data across our store is protected by robust TLS/SSL encryption protocols to ensure end-to-end security.\nNo Card Data Stored: Payment processing is managed directly by globally compliant, PCI-DSS Level 1 certified payment gateways (such as Stripe, PayPal, Apple Pay, etc.). We do not access, process, or store your full card number, CVV code, or banking credentials on our systems.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept major international credit and debit cards (Visa, Mastercard, American Express, etc.) along with trusted digital wallets such as PayPal, Apple Pay, and Google Pay, depending on available gateways displayed at checkout. Orders must be paid in full prior to order dispatch.",
      },
      {
        q: "How do you use my personal data? Do you sell my information?",
        a: "Order Fulfilment Only: We strictly collect essential details (name, shipping address, email, and phone number) to process, ship, and support your orders.\nWe Do Not Sell Your Data: We never sell your personal information to third parties. We handle your personal information in accordance with applicable data protection laws, including the EU GDPR, the UK GDPR, the California Consumer Privacy Act (CCPA/CPRA), and the Hong Kong Personal Data (Privacy) Ordinance (PDPO).",
      },
    ],
  },
];

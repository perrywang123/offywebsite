import { NewsletterForm } from "@/components/newsletter-form";

const highlights = [
  { title: "品质", description: "精选原料与工艺，坚持每一处细节。" },
  { title: "创新", description: "持续迭代产品，为用户创造真实价值。" },
  { title: "信赖", description: "透明、真诚的沟通，长期陪伴用户。" },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-semibold tracking-tight">Offy</span>
        <nav className="flex gap-8 text-sm text-slate-600">
          <a href="#about" className="hover:text-slate-900">
            关于
          </a>
          <a href="#newsletter" className="hover:text-slate-900">
            订阅
          </a>
          <a href="#contact" className="hover:text-slate-900">
            联系
          </a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          让品牌，被看见
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Offy 是一个品牌官网示例，用于品牌宣传与产品展示。这里将承载品牌故事、产品与最新动态。
        </p>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 p-8">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="newsletter" className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl bg-slate-50 p-12 text-center">
          <h2 className="text-2xl font-semibold">订阅品牌动态</h2>
          <p className="mt-2 text-slate-600">第一时间获取产品上新与品牌故事。</p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm />
          </div>
        </div>
      </section>

      <footer
        id="contact"
        className="mx-auto max-w-6xl px-6 py-12 text-center text-sm text-slate-500"
      >
        <p>© {new Date().getFullYear()} Offy. 保留所有权利。</p>
        <p className="mt-2">联系：hello@offy.example</p>
      </footer>
    </main>
  );
}

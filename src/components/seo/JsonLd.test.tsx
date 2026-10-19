import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./JsonLd";

const scriptIn = (container: HTMLElement): HTMLScriptElement => {
  const script = container.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
  if (!script) throw new Error("没有找到 application/ld+json script");
  return script;
};

describe("<JsonLd>", () => {
  it("renders one application/ld+json script whose content parses as JSON", () => {
    const data = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "is.offy",
    };
    const { container } = render(<JsonLd data={data} />);

    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(JSON.parse(scriptIn(container).textContent ?? "")).toEqual(data);
  });

  it("escapes every < so user text can never close the script tag", () => {
    const data = {
      "@context": "https://schema.org",
      "@type": "Thing",
      name: 'ACME </script><script>alert("x")</script> & <b>bold</b>',
    };
    const { container } = render(<JsonLd data={data} />);
    const raw = scriptIn(container).textContent ?? "";

    // The dangerous byte sequence must not survive; `\u003c` is the only form of <.
    expect(raw).not.toContain("</script");
    expect(raw).not.toContain("<");
    expect(raw).toContain("\\u003c/script");
    expect(raw).toContain("\\u003cb");
    // Escaping is lossless: JSON.parse restores the original user text.
    expect(JSON.parse(raw)).toEqual(data);
  });

  it("does not add any visible DOM", () => {
    const { container } = render(<JsonLd data={{ "@type": "Thing" }} />);

    // 唯一子节点是 script:没有 <div>/<p>/文本节点可以改变布局或选中文本。
    expect(container.querySelectorAll(":scope > :not(script)")).toHaveLength(0);
    expect(container.querySelectorAll("script")).toHaveLength(1);
  });
});

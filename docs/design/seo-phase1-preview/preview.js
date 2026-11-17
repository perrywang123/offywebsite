(() => {
  const data = window.SEO_PREVIEW;
  const $ = (id) => document.getElementById(id);
  const state = { icon: "a", page: data.pages[0], device: "desktop" };
  const asset = (icon) => `assets/icon-${icon === "a" ? "a-mascot" : "b-wordmark"}.png`;
  data.pages.forEach((page) => {
    const option = document.createElement("option");
    option.value = page.id;
    option.textContent = page.label;
    $("page-select").append(option);
    const item = document.createElement("article");
    item.className = "copy-item";
    const label = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = page.label;
    const path = document.createElement("p");
    path.className = "path";
    path.textContent = page.path;
    label.append(heading, path);
    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("strong");
    title.lang = "en";
    title.textContent = page.title;
    const desc = document.createElement("p");
    desc.lang = "en";
    desc.className = "desc";
    desc.textContent = page.description;
    const note = document.createElement("p");
    note.className = "why";
    note.textContent = page.note;
    meta.append(title, desc, note);
    item.append(label, meta);
    $("all-copy").append(item);
  });
  function paint() {
    const page = state.page;
    $("page-intent").textContent = `建议文案 / ${page.intent}`;
    $("copy-title").textContent = $("serp-title").textContent = page.title;
    $("copy-description").textContent = $("serp-description").textContent = page.description;
    $("title-length").textContent = `${page.title.length} 字符`;
    $("description-length").textContent = `${page.description.length} 字符`;
    $("page-note").textContent = page.note;
    $("serp-url").textContent = `https://isoffy.com${page.path === "/" ? "" : page.path}`;
    $("serp-icon").src = asset(state.icon);
    $("icon-label").textContent =
      `图标 ${state.icon.toUpperCase()} · ${state.device === "mobile" ? "手机" : "桌面"}`;
    $("serp-canvas").classList.toggle("mobile", state.device === "mobile");
    $("current-title").textContent = page.current.title;
    $("current-description").textContent = page.current.description || "该页未读取到独立摘要。";
    $("copy-status").textContent = "";
    document.querySelectorAll("[data-icon]").forEach((button) => {
      const selected = button.dataset.icon === state.icon;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("selected", selected);
      button.querySelector(".choice-mark").textContent = selected ? "✓" : "";
    });
    document.querySelectorAll("[data-device]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.device === state.device));
    });
  }
  $("page-select").addEventListener("change", (event) => {
    state.page = data.pages.find((page) => page.id === event.target.value);
    paint();
  });
  document.querySelectorAll("[data-icon]").forEach((button) => {
    button.addEventListener("click", () => {
      state.icon = button.dataset.icon;
      paint();
    });
  });
  document.querySelectorAll("[data-device]").forEach((button) => {
    button.addEventListener("click", () => {
      state.device = button.dataset.device;
      paint();
    });
  });
  $("copy-button").addEventListener("click", async () => {
    const page = state.page;
    try {
      await navigator.clipboard.writeText(
        `${page.path}\nTitle: ${page.title}\nDescription: ${page.description}`,
      );
      $("copy-status").textContent = "已复制建议文案；没有修改网站。";
    } catch {
      $("copy-status").textContent = "浏览器未允许复制，请直接选中文字复制。";
    }
  });
  paint();
})();

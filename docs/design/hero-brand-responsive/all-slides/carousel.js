const slides = [
  { key: "brand", label: "品牌首屏", image: "hero-brand.jpg" },
  {
    key: "promo",
    label: "赠品促销",
    image: "hero-promo.jpg",
    kicker: "OFFY Big Sale: Bonus Gift Included",
    title: "BUY ANY 3 OFFYs,\nGET A FREE BIG TOTE",
  },
  {
    key: "princess",
    label: "Princess",
    image: "hero-princess.jpg",
    subtitle: "Romanticize the Everyday",
    title: "Princess Series",
  },
  {
    key: "streetwear",
    label: "Streetwear",
    image: "hero-streetwear.jpg",
    subtitle: "Weekend in Motion",
    title: "STREETWEAR SERIES",
  },
  {
    key: "dressup",
    label: "Dress-up",
    image: "hero-dressup.jpg",
    subtitle: "Too Cute to Dress Normal",
    title: "DRESS-UP SERIES",
    dark: true,
  },
];
const params = new URLSearchParams(location.search);
const current = slides.find((s) => s.key === params.get("slide")) || slides[1];
const stage = document.querySelector(".stage");
const photoPath = (name) => "/public/assets/hero/" + name;
const brandTemplate = document.getElementById("brand-template");
for (const slide of slides) {
  const panel = document.createElement("div");
  panel.className = "panel" + (slide.key === current.key ? " is-active" : "");
  panel.dataset.slide = slide.key;
  panel.setAttribute("aria-hidden", String(slide.key !== current.key));
  panel.style.setProperty("--photo", `url("${photoPath(slide.image)}")`);
  if (slide.key === "brand") panel.append(brandTemplate.content.cloneNode(true));
  else {
    const photo = document.createElement("div");
    photo.className = "panel-photo " + (slide.key === "promo" ? "promo-photo" : "series-photo");
    const img = document.createElement("img");
    img.src = photoPath(slide.image);
    img.alt = "";
    photo.append(img);
    const copy = document.createElement("div");
    copy.className =
      "flow-copy " +
      (slide.key === "promo" ? "promo-copy" : "series-copy") +
      (slide.dark ? " series-dark" : "");
    const small = document.createElement("p");
    small.className = slide.key === "promo" ? "kicker" : "series-subtitle";
    small.textContent = slide.kicker || slide.subtitle;
    const title = document.createElement("p");
    title.className = slide.key === "promo" ? "promo-title" : "series-title";
    slide.title.split("\n").forEach((line) => {
      const span = document.createElement("span");
      span.textContent = line;
      title.append(span);
    });
    copy.append(small, title);
    panel.append(photo, copy);
  }
  stage.append(panel);
}
const baseline = document.querySelector(".baseline");
baseline.classList.toggle("dark", !!current.dark);
const oldImage = document.createElement("img");
oldImage.src = photoPath(current.image);
oldImage.alt = "";
oldImage.className = "background";
baseline.append(oldImage);
if (current.key === "brand") {
  const logo = document.createElement("img");
  logo.className = "old-wordmark";
  logo.src = "/public/assets/brand/is-offy-wordmark.png";
  logo.alt = "is.offy";
  const text = document.createElement("p");
  text.className = "old-brand-copy";
  text.textContent = "Designer Plush Art Toys\nMeet who you love to be.";
  baseline.append(logo, text);
} else {
  const sub = document.createElement("p");
  sub.className = current.key === "promo" ? "old-kicker" : "old-subtitle";
  sub.textContent = current.kicker || current.subtitle;
  const title = document.createElement("p");
  title.className = current.key === "promo" ? "old-promo-title" : "old-series-title";
  title.textContent = current.title;
  baseline.append(sub, title);
}
const makeUrl = (slide, view) => `?slide=${slide}&view=${view}`;
const controls = document.querySelector(".flow-controls");
controls.classList.add(`is-${current.key}`);
const view = params.get("view") === "before" ? "before" : "after";
document.body.classList.toggle("show-baseline", view === "before");
for (const slide of slides) {
  const indicator = document.createElement("a");
  indicator.href = makeUrl(slide.key, view);
  indicator.setAttribute("aria-label", slide.label);
  indicator.setAttribute("aria-current", String(slide.key === current.key));
  controls.append(indicator);
  const link = document.createElement("a");
  link.href = makeUrl(slide.key, view);
  link.textContent = slide.label;
  document.querySelector(".preview-links").append(link);
}
document.getElementById("before").href = makeUrl(current.key, "before");
document.getElementById("after").href = makeUrl(current.key, "after");
document.getElementById("slide-name").textContent = current.label;
document
  .getElementById("copy-size")
  .addEventListener("change", (event) =>
    document.documentElement.style.setProperty("--copy-scale", event.target.value),
  );

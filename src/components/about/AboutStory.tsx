import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { aboutStory, collectionLooks, storyArtwork } from "@/lib/content/about-story";
import styles from "./AboutStory.module.css";

type ArtName = keyof typeof storyArtwork;
function Artwork({
  name,
  alt,
  className,
  sizes = "(max-width: 767px) calc(100vw - 40px), 560px",
  priority = false,
}: {
  name: ArtName;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const art = storyArtwork[name];
  return (
    <Image
      src={art.file}
      width={art.width}
      height={art.height}
      alt={alt}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}

export function AboutLanding({ storyHref }: { storyHref: string }) {
  const copy = aboutStory.about;
  return (
    <div className={styles.page} data-about-landing>
      <section className={`container-site ${styles.aboutWrap}`} aria-labelledby="about-title">
        <h1 id="about-title" className={styles.aboutTitle}>
          {copy.title}
        </h1>
        <div className={styles.manifesto}>
          {copy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className={styles.aboutPair}>
          <div className={styles.characterFrame}>
            <Artwork
              name="offy-illustration-pair"
              alt="OFFY illustrated with curly hair and little wings"
              className={styles.character}
              sizes="(max-width: 767px) 44vw, 500px"
              priority
            />
          </div>
          <Artwork
            name="gia-about"
            alt="Gia, the creator of OFFY"
            className={styles.aboutPortrait}
            sizes="(max-width: 767px) 44vw, 500px"
            priority
          />
        </div>
        <Link href={storyHref} className={styles.storyCta}>
          {copy.cta}
        </Link>
      </section>
    </div>
  );
}

function Paragraphs({ items }: { items: readonly string[] }) {
  return (
    <>
      {items.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </>
  );
}

function BackToAbout({ href }: { href: string }) {
  return (
    <Link href={href} className={styles.backLink}>
      <span aria-hidden="true">←</span>Back to About
    </Link>
  );
}

export function OffyStory({ aboutHref }: { aboutHref: string }) {
  const copy = aboutStory.story;
  return (
    <div className={styles.page} data-offy-story>
      <h1 className="sr-only">{copy.title}</h1>
      <Artwork name="story-banner" alt="" className={styles.banner} sizes="100vw" priority />
      <article className={`container-site ${styles.storyWrap}`}>
        <div className={styles.topReturn}>
          <BackToAbout href={aboutHref} />
        </div>
        <section className={styles.chapter} aria-labelledby="the-creator">
          <h2 id="the-creator" className={styles.chapterTitle}>
            {copy.creatorTitle}
          </h2>
          <h3 className={styles.creatorLabel}>{copy.creatorLabel}</h3>
          <p className={styles.creatorIntro}>{copy.creatorIntro}</p>
          <div className={styles.creatorGrid}>
            <Artwork
              name="gia-story"
              alt="Gia, the creator of OFFY, on a city street"
              className={styles.creatorPortrait}
              sizes="(max-width: 899px) 340px, 450px"
            />
            <div className={styles.prose}>
              <Paragraphs items={copy.creatorParagraphs} />
            </div>
          </div>
          <blockquote className={`${styles.quote} ${styles.prose}`}>
            <p className={styles.quoteLabel}>{copy.quoteLabel}</p>
            <Paragraphs items={copy.quoteParagraphs} />
          </blockquote>
        </section>

        <section className={styles.chapter} aria-labelledby="offys-world">
          <h2 id="offys-world" className={styles.chapterTitle}>
            {copy.worldTitle}
          </h2>
          <p className={styles.chapterSubtitle}>{copy.worldSubtitle}</p>
          <Artwork
            name="offy-expressions"
            alt="Two early sketches of OFFY with sleepy and tearful expressions"
            className={styles.expressions}
            sizes="(max-width: 767px) calc(100vw - 40px), 800px"
          />
          <div className={styles.prose}>
            <Paragraphs items={copy.originParagraphs} />
            <p className={styles.originClosing}>{copy.originClosing}</p>
            <h3 className={styles.subheading}>{copy.islandTitle}</h3>
            <Paragraphs items={copy.islandParagraphs} />
          </div>
          <div className={styles.sketchGrid}>
            {(["sketch-1", "sketch-2", "sketch-3", "sketch-4"] as const).map((name, index) => (
              <figure key={name} data-story-sketch>
                <Artwork
                  name={name}
                  alt={
                    [
                      "Early OFFY character studies, expressions and outfit sketches",
                      "Pencil studies of OFFY with wings and different expressions",
                      "OFFY character concept collage with hand-drawn notes",
                      "Curly-haired OFFY expression and character studies",
                    ][index]
                  }
                />
              </figure>
            ))}
          </div>
        </section>

        <section className={styles.chapter} aria-labelledby="gias-own-words">
          <h2 id="gias-own-words" className={styles.chapterTitle}>
            {copy.reflectionTitle}
          </h2>
          <p className={styles.reflectionLabel}>{copy.reflectionLabel}</p>
          <div className={styles.prose}>
            {copy.reflections.map((reflection) => (
              <section key={reflection.title} className={styles.reflection}>
                <h3 className={styles.subheading}>{reflection.title}</h3>
                <Paragraphs items={reflection.paragraphs} />
              </section>
            ))}
          </div>
        </section>

        <section
          className={`${styles.chapter} ${styles.collection}`}
          aria-labelledby="offy-collection"
        >
          <h2 id="offy-collection" className={styles.collectionHeading}>
            <Artwork name="collection-mark" alt="" />
            <span>{copy.collectionTitle}</span>
          </h2>
          <p className={styles.copyright}>{copy.copyright}</p>
          <p className={styles.rights}>{copy.rights}</p>
          <div className={styles.collectionGrid}>
            <Artwork
              name="offy-prototype"
              alt="The original OFFY character with curly hair and glasses"
              className={styles.prototype}
              sizes="(max-width: 767px) 240px, 360px"
            />
            <div>
              <ul className={styles.looks} aria-label="Original OFFY character designs">
                {collectionLooks.map((look, index) => (
                  <li key={look.file} data-collection-look>
                    <Image
                      src={look.file}
                      width={look.width}
                      height={look.height}
                      alt={`OFFY character design ${index + 1}`}
                      sizes="(max-width: 767px) 30vw, (max-width: 1023px) 20vw, 110px"
                    />
                  </li>
                ))}
              </ul>
              <a
                className={styles.artworkLink}
                href={storyArtwork["collection-artwork"].file}
                target="_blank"
                rel="noopener noreferrer"
              >
                View full-size artwork<span aria-hidden="true"> ↗</span>
              </a>
            </div>
          </div>
        </section>
        <div className={styles.bottomReturn}>
          <BackToAbout href={aboutHref} />
        </div>
      </article>
    </div>
  );
}

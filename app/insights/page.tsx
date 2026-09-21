import Link from "next/link";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow } from "@/components/studio";
import { createPageMetadata } from "@/lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Insights",
  description:
    "Practical thinking from Blackburn Studio about websites, digital tools, workflows and removing unnecessary friction from everyday digital work.",
  path: "/insights",
});

const articles = [
  {
    title: "Why I’m Building Free Tools at Blackburn Studio",
    summary:
      "Small digital problems still waste time. Here is why Blackburn Studio is building focused tools to remove some of that friction.",
    href: "/insights/why-im-building-free-tools",
    published: "21 September 2026",
    readTime: "5 min read",
    category: "Tools & digital",
  },
];

export default function InsightsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="editorial-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <div className="mx-auto w-full max-w-328 px-6 pt-14 pb-20 md:px-8 md:pt-20 md:pb-28">
          <section aria-labelledby="insights-heading" className="max-w-[76ch]">
            <SectionEyebrow className="text-[#765d34]">Insights</SectionEyebrow>
            <h1
              id="insights-heading"
              className="mt-5 max-w-[20ch] text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl"
            >
              Practical thinking about better digital work
            </h1>
            <p className="mt-7 max-w-[66ch] text-[1.02rem] leading-relaxed text-studio-muted md:text-[1.1rem]">
              Notes from Blackburn Studio on websites, digital tools, workflows
              and the small decisions that can make technology easier to use.
            </p>
          </section>

          <section
            aria-labelledby="latest-insights-heading"
            className="mt-20 md:mt-24"
          >
            <SectionEyebrow className="text-[#765d34]">Latest</SectionEyebrow>
            <h2
              id="latest-insights-heading"
              className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              From the studio
            </h2>

            <div className="mt-10 max-w-5xl">
              {articles.map((article) => (
                <article
                  key={article.href}
                  className="border-t border-studio-border py-8 first:border-t-0 first:pt-0 md:py-10"
                >
                  <div className="grid gap-5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10">
                    <div className="text-sm leading-relaxed text-studio-dim">
                      <p className="font-medium text-[#765d34]">{article.category}</p>
                      <p className="mt-2">{article.published}</p>
                      <p>{article.readTime}</p>
                    </div>
                    <div>
                      <h3 className="max-w-[28ch] text-2xl font-medium tracking-tight text-studio-text md:text-3xl">
                        <Link
                          href={article.href}
                          className="transition-colors hover:text-[#765d34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                        >
                          {article.title}
                        </Link>
                      </h3>
                      <p className="mt-4 max-w-[64ch] text-base leading-relaxed text-studio-muted">
                        {article.summary}
                      </p>
                      <Link
                        href={article.href}
                        className="mt-5 inline-flex items-center gap-1.5 text-sm text-studio-muted underline decoration-[#b9955a]/55 underline-offset-4 transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                      >
                        Read article
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

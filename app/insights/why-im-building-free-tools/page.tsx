import Link from "next/link";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";
import { absoluteUrl, createPageMetadata } from "@/lib/siteConfig";

const articlePath = "/insights/why-im-building-free-tools";
const articleTitle = "Why I’m Building Free Tools at Blackburn Studio";
const articleDescription =
  "Small digital problems still waste time. Here is why Blackburn Studio is building focused tools to remove some of that friction.";

export const metadata = createPageMetadata({
  title: articleTitle,
  description: articleDescription,
  path: articlePath,
});

const articleStructuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: articleTitle,
  description: articleDescription,
  datePublished: "2026-09-21",
  dateModified: "2026-09-21",
  mainEntityOfPage: absoluteUrl(articlePath),
  author: {
    "@type": "Person",
    name: "Mark Blackburn",
  },
  publisher: {
    "@type": "Organization",
    name: "Blackburn Studio",
    url: absoluteUrl("/"),
  },
};

export default function WhyImBuildingFreeToolsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="editorial-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
        />

        <article className="mx-auto w-full max-w-328 px-6 pt-14 pb-20 md:px-8 md:pt-20 md:pb-28">
          <header className="max-w-[78ch]">
            <Link
              href="/insights"
              className="inline-flex items-center gap-1.5 text-sm text-studio-dim transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
            >
              <span aria-hidden="true">←</span>
              Insights
            </Link>

            <SectionEyebrow className="mt-8 text-[#765d34]">
              Tools & digital
            </SectionEyebrow>
            <h1 className="mt-5 max-w-[20ch] text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl">
              {articleTitle}
            </h1>
            <p className="mt-7 max-w-[64ch] text-lg leading-relaxed text-studio-muted md:text-xl">
              Small digital problems still waste time. I’m building focused tools
              to remove some of that friction and make common digital jobs easier.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-studio-dim">
              <span>Mark Blackburn</span>
              <span>21 September 2026</span>
              <span>5 min read</span>
            </div>
          </header>

          <div className="mt-14 max-w-[72ch] text-base leading-[1.8] text-studio-muted md:mt-16 md:text-[1.08rem]">
            <p>
              Over the past few weeks, I’ve been adding practical tools to the
              Blackburn Studio website. They are deliberately focused. Each one
              exists to solve a common digital job without adding more complexity
              than the job itself needs.
            </p>

            <p className="mt-6">
              That is the thinking behind the Web Image Resizer, QR Code
              Generator and PDF Reducer. None of them is meant to become a huge
              software platform. They are there because small digital problems
              can still get in the way of real work.
            </p>

            <section aria-labelledby="small-problems-heading" className="mt-14">
              <h2
                id="small-problems-heading"
                className="text-3xl font-medium tracking-tight text-studio-text"
              >
                Small problems still waste time
              </h2>
              <p className="mt-5">
                A lot of the frustrations we run into with technology are not
                particularly complicated. You need to create a QR code for a
                flyer. A PDF is too large to email. An image is the wrong size
                for a website. A form rejects information that your phone has
                filled in automatically.
              </p>
              <p className="mt-6">
                None of those things should require much thought, but they
                interrupt what you were actually trying to do.
              </p>
              <p className="mt-6">
                You stop, search for a solution, open a few websites and often
                find yourself dealing with advertising, account creation,
                subscriptions, upload limits or an interface that is far more
                complicated than the job you were trying to complete.
              </p>
              <p className="mt-6">
                Five minutes later, you are still trying to solve something that
                should have taken thirty seconds.
              </p>
            </section>

            <section aria-labelledby="where-tools-heading" className="mt-14">
              <h2
                id="where-tools-heading"
                className="text-3xl font-medium tracking-tight text-studio-text"
              >
                That is where the tools come from
              </h2>
              <p className="mt-5">
                Blackburn Studio is not changing direction to become a software
                company. The tools are an extension of the same approach I take
                when working on websites and other digital projects.
              </p>

              <div className="relative mt-8 overflow-hidden rounded-2xl border border-studio-border bg-studio-surface px-7 py-7 md:px-10 md:py-9">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-2 text-6xl leading-none text-[#b9955a]/35 md:left-7 md:top-3 md:text-7xl"
                >
                  “
                </span>
                <p className="relative pt-7 text-lg italic leading-relaxed text-studio-text md:pt-8 md:text-xl">
                  If something keeps getting in the way, I don’t just accept that it
                  has to be so hard. Quite often, there’s a simpler way to get
                  the job done.
                </p>
              </div>

              <p className="mt-8">
                If it is a problem I keep seeing, and I can build a useful
                solution without making people jump through unnecessary hoops,
                it makes sense to build it once and make it available.
              </p>
              <p className="mt-6">
                The QR Code Generator is deliberately straightforward. Enter
                what you need, create the code and use it. The PDF Reducer helps
                with another common problem, making a PDF smaller when it is
                simply too large to send or upload. The Web Image Resizer brings
                the same approach to preparing images for websites and digital
                content.
              </p>
              <p className="mt-6">
                They are small tools, but that is exactly what they are supposed
                to be.
              </p>
            </section>

            <section aria-labelledby="easier-heading" className="mt-14">
              <h2
                id="easier-heading"
                className="text-3xl font-medium tracking-tight text-studio-text"
              >
                Good digital work should make things easier
              </h2>
              <p className="mt-5">
                This thinking goes beyond standalone tools.
              </p>
              <p className="mt-6">
                Recently, while testing the Blackburn Studio enquiry form on my
                phone, I used the iPhone’s Contact AutoFill to enter my mobile
                number. The phone entered a valid Australian number, but without
                the leading zero.
              </p>
              <p className="mt-6">
                Technically, the number did not match the format the form
                expected, so it was rejected. From the customer’s point of view,
                though, they had done exactly what they were supposed to do.
                Their phone had entered their saved number, and the website told
                them it was wrong.
              </p>
              <p className="mt-6">
                The better solution was not to tell the customer to fix it. It
                was to fix the website.
              </p>
              <p className="mt-6">
                The form now recognises common ways Australian phone numbers are
                entered and handles the formatting itself. It is a small change,
                but these small pieces of friction add up.
              </p>
              <p className="mt-6">
                A good digital experience should work with the way people
                actually behave, not require them to understand the technical
                rules behind it.
              </p>
            </section>

            <section aria-labelledby="useful-heading" className="mt-14">
              <h2
                id="useful-heading"
                className="text-3xl font-medium tracking-tight text-studio-text"
              >
                Building things because they are useful
              </h2>
              <p className="mt-5">
                I do not want to build tools simply so there is a long list of
                them on a website. I would rather build something when there is
                a genuine problem it can solve.
              </p>
              <p className="mt-6">
                Some will be very small. Others may grow into more substantial
                services.
              </p>
              <p className="mt-6">
                One area I am exploring is a website health check: a practical
                way to identify common problems with performance, search
                visibility, usability and some of the technical foundations of a
                website.
              </p>
              <p className="mt-6">
                The goal is not to produce a complicated report full of
                technical jargon. It is to answer a much more useful question:
              </p>

              <div className="relative mt-8 overflow-hidden rounded-2xl border border-studio-border bg-studio-surface px-7 py-7 md:px-10 md:py-9">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-5 top-2 text-6xl leading-none text-[#b9955a]/35 md:left-7 md:top-3 md:text-7xl"
                >
                  “
                </span>
                <p className="relative pt-7 text-lg italic leading-relaxed text-studio-text md:pt-8 md:text-xl">
                  Is there anything here that is making this harder than it needs
                  to be?
                </p>
              </div>

              <p className="mt-8">
                That might mean harder for a customer to use, harder for Google
                to understand, harder for the business owner to maintain, or
                simply slower than it should be.
              </p>
            </section>

            <section aria-labelledby="next-heading" className="mt-14">
              <h2
                id="next-heading"
                className="text-3xl font-medium tracking-tight text-studio-text"
              >
                What should I build next?
              </h2>
              <p className="mt-5">
                Some of the most useful ideas come from small annoyances that
                people have simply learned to put up with.
              </p>
              <p className="mt-6">
                So I would genuinely like to know: what is one small digital task
                that wastes more of your time than it should?
              </p>
              <p className="mt-6">
                It could be working with files, images, documents, websites,
                social media or something completely different. If enough people
                are running into the same problem, it might be something worth
                fixing.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <StudioButton href="/contact" variant="primary" tone="light">
                  Tell me what gets in the way
                </StudioButton>
                <StudioButton href="/tools" variant="secondary" tone="light">
                  Explore the free tools
                </StudioButton>
              </div>
            </section>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

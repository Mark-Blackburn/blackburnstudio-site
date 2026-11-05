import Link from "next/link";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";
import { absoluteUrl, createPageMetadata } from "@/lib/siteConfig";

const articlePath = "/insights/does-your-small-business-need-a-website";
const articleTitle = "Does Your Small Business Really Need a Website?";
const articleDescription =
  "Before spending on a website, consider Google reviews, referrals and how you handle enquiries. Practical advice for small businesses from Blackburn Studio.";

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
  datePublished: "2026-11-06",
  dateModified: "2026-11-06",
  mainEntityOfPage: absoluteUrl(articlePath),
  author: { "@type": "Person", name: "Mark Blackburn" },
  publisher: {
    "@type": "Organization",
    name: "Blackburn Studio",
    url: absoluteUrl("/"),
  },
};

export default function SmallBusinessWebsiteArticlePage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />
      <main className="editorial-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }} />
        <article className="mx-auto w-full max-w-328 px-6 pt-14 pb-20 md:px-8 md:pt-20 md:pb-28">
          <header className="max-w-[78ch]">
            <Link href="/insights" className="inline-flex items-center gap-1.5 text-sm text-studio-dim transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]">
              <span aria-hidden="true">←</span> Insights
            </Link>
            <SectionEyebrow className="mt-8 text-[#765d34]">Small business & digital</SectionEyebrow>
            <h1 className="mt-5 max-w-[21ch] text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl">{articleTitle}</h1>
            <p className="mt-7 max-w-[64ch] text-lg leading-relaxed text-studio-muted md:text-xl">Or would your money be better spent somewhere else?</p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-studio-dim">
              <span>Mark Blackburn</span><span>6 November 2026</span><span>8 min read</span>
            </div>
          </header>

          <div className="mt-14 max-w-[72ch] text-base leading-[1.8] text-studio-muted md:mt-16 md:text-[1.08rem]">
            <p>Running a small business comes with plenty of expenses. Equipment, materials, insurance, vehicles, wages and everything else involved in keeping things going. There’s never a shortage of places the money could go.</p>
            <p className="mt-6">So if someone suggests spending a few thousand dollars on a website, I think it’s fair to ask what you’re actually going to get out of it.</p>
            <p className="mt-6">Will it bring in more enquiries? Help win more jobs? Save some time?</p>
            <p className="mt-6">Or will it just be another bill?</p>
            <p className="mt-6">Part of my work at Blackburn Studio involves building websites, but I don’t believe every small business needs one. And even when a website makes sense, it might not be the first thing worth spending money on.</p>

            <aside aria-labelledby="summary-heading" className="mt-10 border-l-2 border-[#b9955a] bg-studio-surface px-6 py-6 md:px-8">
              <h2 id="summary-heading" className="text-xl font-medium tracking-tight text-studio-text">In a nutshell</h2>
              <p className="mt-4">A website can be a worthwhile investment, but it’s not the answer for every small business.</p>
              <p className="mt-4">Before spending money on one, it’s worth looking at where your customers already come from. A good Google Business Profile, genuine customer reviews, Facebook recommendations and word of mouth can all help bring in work. And sometimes improving how you respond to enquiries and follow up quotes can make a bigger difference than attracting more visitors.</p>
              <p className="mt-4">The best place to start is understanding what’s already working, what’s getting in the way and where a few practical improvements could help.</p>
            </aside>

            <section id="where-work" aria-labelledby="where-work-heading" className="mt-14 scroll-mt-28">
              <h2 id="where-work-heading" className="text-3xl font-medium tracking-tight text-studio-text">Where does the work come from now?</h2>
              <p className="mt-5">Take a local plumber, electrician, gardener or fencing contractor.</p>
              <p className="mt-6">A lot of their work might come through recommendations. They do a good job, someone tells a friend or neighbour, and another enquiry comes in.</p>
              <p className="mt-6">They might also get work through Google, local Facebook groups, repeat customers or relationships they’ve built with other businesses.</p>
              <p className="mt-6">There’s nothing wrong with any of that. In fact, a good reputation and a steady flow of referrals are things most businesses would love to have.</p>
              <p className="mt-6">If that’s already bringing in enough work, why would I recommend spending thousands on a new website?</p>
              <p className="mt-6">I’d rather understand how customers are finding the business now, whether those enquiries are turning into jobs and where there might be an opportunity to improve things.</p>
            </section>

            <section id="google" aria-labelledby="google-heading" className="mt-14 scroll-mt-28">
              <h2 id="google-heading" className="text-3xl font-medium tracking-tight text-studio-text">Don’t overlook Google</h2>
              <p className="mt-5">For a lot of local businesses, I’d start by looking at their Google Business Profile.</p>
              <p className="mt-6">It’s free, and when someone searches for a local service, the businesses appearing on Google Maps are often among the first things they see.</p>
              <p className="mt-6">Think about the last time you needed a tradesperson.</p>
              <p className="mt-6">You probably looked at the reviews, checked a few photos, saw whether they worked in your area and looked for an easy way to make contact. You might not have visited their website at all.</p>
              <p className="mt-6">A business with plenty of genuine reviews, recent photos of completed work and accurate contact details can make a good impression before anyone has spoken to them.</p>
              <p className="mt-6">Of course, having a profile doesn’t guarantee enquiries, and getting noticed on Google takes more than simply creating a listing.</p>
              <p className="mt-6">But if a business already has happy customers and a good reputation, making sure that reputation is visible online seems a sensible place to start. And it doesn’t have to involve a major investment.</p>
            </section>

            <section id="reviews" aria-labelledby="reviews-heading" className="mt-14 scroll-mt-28">
              <h2 id="reviews-heading" className="text-3xl font-medium tracking-tight text-studio-text">Make it easy for happy customers to leave a review</h2>
              <p className="mt-5">One thing I often notice is that businesses do great work and have plenty of satisfied customers, but very few online reviews to show for it.</p>
              <p className="mt-6">Not because customers aren’t happy. They just don’t think to leave a review, or they intend to do it later and forget.</p>
              <p className="mt-6">Sometimes the simplest improvement is making it easier for them.</p>
              <p className="mt-6">I worked with Troy, a local cabinet maker, to add a direct Google review link and QR code to his invoices. Once a customer has received their finished job and the invoice arrives, the option to leave a review is right there.</p>
              <p className="mt-6">No complicated system, no expensive marketing campaign. Just a small change to something he was already sending to customers.</p>
              <p className="mt-6">It’s the sort of thing that’s easy to overlook when you’re busy running a business, but it can make a difference over time.</p>
              <p className="mt-6">There are plenty of other opportunities like this. A follow-up message after a completed job, a review link in an email signature or a simple card with a QR code can all make it easier for customers to share their experience.</p>
              <p className="mt-6">Of course, the starting point is doing good work and looking after your customers. Reviews should be genuine, and every customer should have the same opportunity to leave honest feedback.</p>
              <p className="mt-6">The idea isn’t to pressure people into leaving five-star reviews. It’s to remove the little obstacles that stop customers from sharing their experience.</p>
              <p className="mt-6">Sometimes finding and fixing those small things is where the real value lies.</p>
            </section>

            <section id="referrals" aria-labelledby="referrals-heading" className="mt-14 scroll-mt-28">
              <h2 id="referrals-heading" className="text-3xl font-medium tracking-tight text-studio-text">Facebook and referrals still matter</h2>
              <p className="mt-5">I see plenty of local businesses being recommended in Facebook community groups.</p>
              <p className="mt-6">Someone asks who can build a fence, repair a roof or do some landscaping, and other people start tagging businesses they’ve used.</p>
              <p className="mt-6">That kind of recommendation can be powerful, particularly when it comes from someone the customer knows.</p>
              <p className="mt-6">A business doesn’t necessarily need to be posting content every day. Being easy to find, having clear contact details and showing examples of recent work can go a long way.</p>
              <p className="mt-6">The same goes for word of mouth.</p>
              <p className="mt-6">If someone recommends your business, what happens next? Can the person they’ve recommended you to find your details easily? Can they see what sort of work you do?</p>
              <p className="mt-6">There might be a few simple improvements worth making before investing in a website.</p>
            </section>

            <section id="enquiries" aria-labelledby="enquiries-heading" className="mt-14 scroll-mt-28">
              <h2 id="enquiries-heading" className="text-3xl font-medium tracking-tight text-studio-text">Are you making the most of the enquiries you already have?</h2>
              <p className="mt-5">This is something I think deserves more attention.</p>
              <p className="mt-6">It’s easy to focus on getting more enquiries, but what happens to the ones already coming in?</p>
              <p className="mt-6">A phone call arrives while you’re working. Someone sends a Facebook message. Another person emails for a quote. You promise to get back to someone on Friday, but Friday comes and goes.</p>
              <p className="mt-6">It’s not necessarily that you’re disorganised. You’re busy running the business and doing the work that pays the bills.</p>
              <p className="mt-6">But it’s easy for things to slip through the cracks.</p>
              <p className="mt-6">Say you’re getting 30 enquiries a month and turning 10 into jobs. If you could win another two or three simply by responding sooner, keeping track of quotes or following up with people who haven’t made a decision, that could make a real difference.</p>
              <p className="mt-6">And you wouldn’t have needed to find a single new customer.</p>
              <p className="mt-6">Maybe the answer is a better way of tracking enquiries. Perhaps it’s a simpler quoting process or a few automatic reminders.</p>
              <p className="mt-6">Sometimes it’s just about getting information out of someone’s head, notebook or inbox and into a place where it won’t be forgotten.</p>
              <p className="mt-6">None of that necessarily requires a new website.</p>
            </section>

            <section id="website" aria-labelledby="website-heading" className="mt-14 scroll-mt-28">
              <h2 id="website-heading" className="text-3xl font-medium tracking-tight text-studio-text">So where does a website fit?</h2>
              <p className="mt-5">I still think websites have an important place. They just need to earn their keep.</p>
              <p className="mt-6">Google and Facebook are good ways for people to discover a business, but they don’t always give customers enough information to make a decision.</p>
              <p className="mt-6">If you’re a builder, cabinet maker or window supplier, customers might want to see previous projects, understand the options available and get a feel for how you work before making contact.</p>
              <p className="mt-6">A website gives you room to explain those things properly.</p>
              <p className="mt-6">It can also make life easier at the enquiry stage.</p>
              <p className="mt-6">For example, instead of receiving a message that just says “Can you give me a price for some windows?”, a well-designed enquiry form could collect project details, plans and other useful information.</p>
              <p className="mt-6">That’s better for the customer and for the business preparing the quote.</p>
              <p className="mt-6">A website can also help people discover particular services through search, and it gives you more control over your information than relying entirely on Facebook or Google.</p>
              <p className="mt-6">But a website doesn’t need to be complicated or expensive to be useful.</p>
              <p className="mt-6">A few well-written pages, some genuine photos of your work and a straightforward way to make contact might be all that’s required.</p>
              <p className="mt-6">And if your Google profile, Facebook page and referrals are already doing everything you need, perhaps a website can wait.</p>
            </section>

            <section id="need" aria-labelledby="need-heading" className="mt-14 scroll-mt-28">
              <h2 id="need-heading" className="text-3xl font-medium tracking-tight text-studio-text">What does your business actually need?</h2>
              <p className="mt-5">This is the question I’d rather start with.</p>
              <p className="mt-6">If you’re struggling to get enquiries, let’s look at where customers are searching and how your business appears to them.</p>
              <p className="mt-6">If you’re getting enquiries but not winning enough work, let’s understand what happens after someone makes contact.</p>
              <p className="mt-6">If you’ve got plenty of work but spend too much time on paperwork, quoting or chasing information, maybe that’s where we should focus.</p>
              <p className="mt-6">And if things are working well, we don’t need to invent a problem just to sell you something.</p>
              <p className="mt-6">I’ve spent much of my working life solving problems, improving processes and helping teams get things done. One thing I’ve learned is that it’s worth understanding the problem properly before jumping to a solution.</p>
              <p className="mt-6">That’s the approach I’m bringing to Blackburn Studio.</p>
              <p className="mt-6">I enjoy building websites and developing digital tools, but the technology itself isn’t the point. What matters is whether it helps someone run their business.</p>
              <p className="mt-6">Sometimes that will mean a website. Sometimes it’ll be something much simpler.</p>
              <p className="mt-6">And sometimes I’ll tell you that I don’t think you need to spend the money.</p>
              <p className="mt-6">I’d much rather have that conversation than build something that looks good but doesn’t do much for the business.</p>
            </section>

            <section id="contact" aria-labelledby="contact-heading" className="mt-14 scroll-mt-28">
              <h2 id="contact-heading" className="text-3xl font-medium tracking-tight text-studio-text">Let’s talk about what’s working</h2>
              <p className="mt-5">If you’re running a small business and wondering whether your website, Google presence or existing systems could be doing more for you, I’m happy to have a conversation.</p>
              <p className="mt-6">We can look at what’s working, what’s frustrating you and whether there’s a practical way to improve things.</p>
              <p className="mt-6">No predetermined solution. Just a sensible place to start.</p>
              <p className="mt-6 font-medium text-studio-text">Blackburn Studio</p>
              <p className="mt-1 italic">Practical digital solutions for real businesses.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <StudioButton href="/contact" variant="primary" tone="light">Start a conversation</StudioButton>
                <StudioButton href="/digital" variant="secondary" tone="light">Explore digital services</StudioButton>
              </div>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

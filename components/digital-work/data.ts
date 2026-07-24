export type DigitalWorkProject = {
  id: string;
  title: string;
  label: string;
  description: string;
  tags: string[];
  href?: string;
  linkLabel?: string;
  ariaLabel?: string;
};

export const leadDigitalProject: DigitalWorkProject & {
  imageSrc: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
} = {
  id: "create-from-concepts",
  title: "Create From Concepts",
  label: "Commercial client project",
  description:
    "Blackburn Studio modernised the Create From Concepts WordPress site with stronger structure, improved portfolio presentation and original team photography. The site is live and the project remains ongoing.",
  tags: [
    "Website modernisation",
    "Information structure",
    "Photography",
    "Ongoing improvement",
  ],
  href: "https://createfromconcepts.com.au/",
  linkLabel: "Public site",
  ariaLabel: "Visit Create From Concepts website (opens in a new tab)",
  imageSrc: "/images/digital/create-from-concepts-home.jpg",
  imageAlt:
    "Create From Concepts website homepage showing custom cabinetry positioning and project imagery",
  imageWidth: 1259,
  imageHeight: 708,
};

export const secondaryDigitalProjects = {
  platform: {
    id: "afl-platform",
    title: "AFL Masters Vic Country website platform",
    label: "Volunteer community project",
    description:
      "A simple SharePoint-pages direction was not suitable for public club websites. Blackburn Studio delivered a shared public platform for the main league site and 17 clubs, with central content and live competition information.",
    tags: [
      "Shared website platform",
      "Platform development",
      "Integrations",
      "Business systems",
    ],
    href: "https://viccountrymasters.com/",
    linkLabel: "Public site",
    ariaLabel: "Visit AFL Masters Vic Country website (opens in a new tab)",
    imageSrc: "/images/digital/vic-country-club-finder.jpg",
    imageAlt:
      "AFL Masters Vic Country find your local club page showing a club search interface and map of Victoria",
    imageWidth: 1227,
    imageHeight: 690,
  },
  workflows: {
    id: "afl-workflows",
    title: "AFL Masters Vic Country workflows and automation",
    label: "Volunteer community project",
    description:
      "Administration relied on inboxes, spreadsheets, paper forms and manual reporting. Blackburn Studio helped move this work into structured Microsoft 365, SharePoint, Forms and Power Automate workflows.",
    tags: [
      "Workflow improvement",
      "Paper-to-digital",
      "Microsoft 365",
      "Automation",
      "Reporting",
    ],
  },
  coaching: {
    id: "mark-blackburn-coaching",
    title: "Mark Blackburn Coaching",
    label: "Internal studio project",
    description:
      "Brand website, custom client platform, secure data architecture and digital service integration.",
    tags: [
      "Brand website",
      "Client platform",
      "Secure architecture",
      "Digital integration",
    ],
    href: "https://www.markblackburn.com.au/",
    linkLabel: "Public site",
    ariaLabel: "Visit Mark Blackburn Coaching website (opens in a new tab)",
    imageSrc: "/images/digital/mark-blackburn-coaching-homepage.png",
    imageAlt:
      "Mark Blackburn Coaching homepage showing the Strength Builds Confidence hero",
    imageWidth: 1311,
    imageHeight: 787,
  },
} as const;

export const featuredDigitalWorkProjects: DigitalWorkProject[] = [
  {
    id: leadDigitalProject.id,
    title: leadDigitalProject.title,
    label: leadDigitalProject.label,
    description:
      "WordPress modernisation with stronger structure, improved portfolio presentation and ongoing support.",
    href: leadDigitalProject.href,
    linkLabel: "Visit website",
    ariaLabel: leadDigitalProject.ariaLabel,
    tags: [],
  },
  {
    id: secondaryDigitalProjects.platform.id,
    title: "AFL Masters Vic Country",
    label: secondaryDigitalProjects.platform.label,
    description:
      "Shared public website platform plus structured workflows and operational improvements.",
    href: secondaryDigitalProjects.platform.href,
    linkLabel: "Visit website",
    ariaLabel: secondaryDigitalProjects.platform.ariaLabel,
    tags: [],
  },
  {
    id: secondaryDigitalProjects.coaching.id,
    title: secondaryDigitalProjects.coaching.title,
    label: secondaryDigitalProjects.coaching.label,
    description: secondaryDigitalProjects.coaching.description,
    href: secondaryDigitalProjects.coaching.href,
    linkLabel: "Visit website",
    ariaLabel: secondaryDigitalProjects.coaching.ariaLabel,
    tags: [],
  },
];

// Central, typed content model for the static parts of the site.
// Keeps content separate from UI so it is easy to maintain.

export interface SocialLink {
  label: string;
  href: string;
  icon: string; // path under /assets/icons
}

export interface NavLink {
  label: string;
  href: string;
}

export interface TechTag {
  name: string;
  icon?: string;
  href?: string;
}

export interface Project {
  title: string;
  description: string;
  image: string;
  tags: TechTag[];
  links: { label: string; href: string }[];
  year?: string;
}

export interface Experience {
  role: string;
  org: string;
  location: string;
  period: string;
  logo: string;
  bullets: string[];
  tags?: string[];
}

export interface Education {
  school: string;
  degree: string;
  location: string;
  period: string;
  logo: string;
}

export const site = {
  name: "Anpabelt Trah Javala",
  shortName: "Anpabelt",
  role: "Information Systems Student · Developer · Data",
  email: "hello@anpabelt.com",
  description: "The personal digital home of Anpabelt Trah Javala — developer, data enthusiast and design tinkerer studying at UTP, Malaysia. Projects, writing and a little bit of everything.",
  resumeUrl: "https://drive.google.com/file/d/1EXi0a5DG2-Wbdv69avJUzTQPVtYM7wf8/view?usp=sharing",
};

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const socials: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/anpabeltj", icon: "/assets/icons/github-icon.svg" },
  { label: "Telegram", href: "https://t.me/anpabelt", icon: "/assets/icons/telegram-icon.svg" },
  { label: "X", href: "https://x.com/username", icon: "/assets/icons/x-icon.svg" },
  { label: "LinkedIn", href: "https://linkedin.com/in/anpabelt", icon: "/assets/icons/linkedin-icon.svg" },
];

export const loves = [
  {
    title: "Building for the web",
    body: "There's something quietly satisfying about shipping something that works. I like the craft of it — the layout, the details, the late-night bug hunts, and the small wins that add up.",
  },
  {
    title: "Working with data",
    body: "Python and I turn messy spreadsheets into things that actually mean something. Pipelines, dashboards, and the occasional graph that makes a room go \u201Chuh, interesting.\u201D",
  },
  {
    title: "Designing calmly",
    body: "I'm still learning design, but I care about how things feel — spacing, type, restraint. Trying to make things that are pleasant to sit with rather than loud.",
  },
];

export const techStack: string[] = [
  "html5",
  "css3",
  "tailwindcss",
  "javascript",
  "typescript",
  "python",
  "react",
  "nodedotjs",
  "dbt",
  "mysql",
  "postgresql",
  "metabase",
  "looker",
  "tableau-icon-svgrepo-com",
  "apacheairflow",
  "googlebigquery",
  "docker",
  "numpy",
  "pandas",
  "r",
];

export const experiences: Experience[] = [
  {
    role: "Analytics Engineer Intern",
    org: "Pandai",
    location: "Kuala Lumpur, Malaysia · Hybrid",
    period: "Jan 2025 — Aug 2025",
    logo: "/assets/images/pandai_logo.jpeg",
    bullets: [
      "Converted bronze to silver layer in a medallion architecture using dbt into 10+ structured fact, dimension, junction and hybrid tables.",
      "Developed a real-time funnel chart in Metabase to track teacher engagement with the AI chatbot feature.",
      "Built and maintained 5+ Looker Studio dashboards with real-time visualisation, fixing scorecard streak issues and year filters.",
      "Delivered 50+ data service requests across 5+ departments — extraction, ad-hoc reports, SQL and dashboard work.",
      "Built an automated data-quality pipeline validating row counts across 50+ tables in MySQL, PostgreSQL and BigQuery using Airflow + Docker.",
    ],
    tags: ["dbt", "apacheairflow", "looker", "mysql", "googlebigquery", "metabase", "python", "postgresql", "docker"],
  },
  {
    role: "Data Management Analyst Intern",
    org: "Telkom University — Information Systems Dept.",
    location: "Bandung, Indonesia · Remote",
    period: "Mar 2024 — May 2024",
    logo: "/assets/images/s1_sistem_informasi_telkom_university_logo.jpeg",
    bullets: [
      "Designed a real-time dashboard visualising data for 50+ students in the International Class using Excel (Pivot Tables, COUNTIF, UNIQUE).",
      "Supported data documentation and database management via Microsoft Forms, ensuring seamless integration of incoming data for live updates.",
    ],
    tags: ["excel-file"],
  },
];

export const education: Education[] = [
  {
    school: "Universiti Teknologi Petronas",
    degree: "BSc (Hons) Information Systems — Double Degree Program",
    location: "Perak, Malaysia",
    period: "May 2024 — Present",
    logo: "/assets/images/universiti_teknologi_petronas_logo.jpeg",
  },
  {
    school: "Telkom University",
    degree: "Bachelor of Information Systems",
    location: "Bandung, Indonesia",
    period: "Sep 2021 — Present",
    logo: "/assets/images/telkom_university_logo.jpeg",
  },
];

const T = (name: string, icon: string, href = "#"): TechTag => ({ name, icon: `/assets/icons/${icon}`, href });

export const projects: Project[] = [
  {
    title: "Personal Website",
    description: "My digital home — projects, writing and experiments, rebuilt with Astro, TypeScript and SQLite.",
    image: "/assets/images/dummy-image-project.jpg",
    tags: [T("Astro", "typescript.svg"), T("TypeScript", "typescript.svg"), T("Tailwind", "tailwindcss.svg"), T("SQLite", "mysql.svg")],
    links: [
      { label: "View Live", href: "https://anpabelt.com" },
      { label: "GitHub", href: "https://github.com/anpabeltj/anpabelt.com" },
    ],
  },
  {
    title: "Re: Café Website",
    description: "A modern single-page café landing template built with semantic HTML5, CSS3 and vanilla JavaScript — polished and easy to customise.",
    image: "/assets/images/re-cafe-website.jpeg",
    tags: [T("Figma", "figma.svg"), T("HTML", "html5.svg"), T("CSS", "css3.svg"), T("JavaScript", "javascript.svg")],
    links: [
      { label: "View Live", href: "https://re-cafe-website.anpabelt.com" },
      { label: "GitHub", href: "https://github.com/anpabeltj/re-cafe-website" },
    ],
  },
  {
    title: "Times Higher Education Rankings Analysis",
    description: "Analysing world university rankings across teaching, research, knowledge transfer and international outlook using Tableau.",
    image: "/assets/images/THE-image.webp",
    tags: [T("Tableau", "tableau-icon-svgrepo-com.svg")],
    links: [{ label: "View Project", href: "https://anpabelt.medium.com/times-higher-educationworld-university-rankings-analysis-f1d9810263fb" }],
  },
  {
    title: "Gender & Study Time vs GPA",
    description: "Investigating the relationship between study time and GPA for the 2020 & 2021 student cohorts in Indonesia using Python.",
    image: "/assets/images/gender-and-study-project.webp",
    tags: [T("Python", "python.svg"), T("Matplotlib", "Matplotlib.svg"), T("NumPy", "numpy.svg"), T("Pandas", "pandas.svg"), T("scikit-learn", "scikitlearn.svg")],
    links: [{ label: "View Project", href: "https://anpabelt.medium.com/the-influence-of-gender-and-study-time-on-the-gpa-of-36-batch-2020-2021-students-in-indonesia-1fe77d9e29c6" }],
  },
  {
    title: "2024 Electric Vehicle Population Analysis",
    description: "A statistical and visual journey through 2024 EV adoption data — distribution, differences and what's driving the trends.",
    image: "/assets/images/ev-project-image.webp",
    tags: [T("Python", "python.svg"), T("NumPy", "numpy.svg"), T("Pandas", "pandas.svg"), T("Matplotlib", "Matplotlib.svg"), T("Seaborn", "seaborn.svg")],
    links: [{ label: "View Project", href: "https://anpabelt.medium.com/powering-the-future-an-analytical-journey-through-the-2024-electric-vehicle-population-data-with-9df58b954c46" }],
  },
  {
    title: "Two Decades of U.S. Real Estate Sales",
    description: "Visualising 20 years of real estate sales — the boom, the 2008 crash, and the slow, steady recovery — with Python.",
    image: "/assets/images/Estate Sales Project.webp",
    tags: [T("Python", "python.svg"), T("NumPy", "numpy.svg"), T("Pandas", "pandas.svg"), T("Matplotlib", "Matplotlib.svg"), T("Seaborn", "seaborn.svg")],
    links: [{ label: "View Project", href: "https://anpabelt.com" }],
  },
  {
    title: "Data Warehouse & Business Intelligence",
    description: "Optimising revenue by analysing liquor sales trends across geographies and time periods with a full DWBI pipeline.",
    image: "/assets/images/dwbi-image.webp",
    tags: [T("Pentaho", "pentaho.png"), T("RapidMiner", "RapidMiner.png"), T("MySQL", "mysql.svg"), T("Looker", "looker.svg"), T("BigQuery", "googlebigquery.svg")],
    links: [{ label: "View Project", href: "https://docs.google.com/document/d/1tL2XNUz6RSK9BinTND7hGqvIBfo3djSK4G4R_sl5VoQ/edit?usp=sharing" }],
  },
];

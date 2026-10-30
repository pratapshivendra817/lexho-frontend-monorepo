import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Headphones,
  MapPin,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { BrowserRouter, Link, Route, Routes, useLocation, useParams } from "react-router-dom";
import {
  getCategoryServices,
  getCityAreas,
  getFaqs,
  getLegalDocument,
  getServiceDetails,
  submitSupportTicket,
  type Faq,
  type WebsiteCategory,
  type WebsiteArea,
  type WebsiteCity,
  type WebsiteService,
  type WebsiteServiceDetail,
  getWebsiteCategories,
  getWebsiteCities,
} from "./api";
import { fallbackFaqs, legalPages, type LegalPage } from "./content";
import lexhoHomeLogo from "./assets/lexho-home-logo.png";
import { SocialMediaLinks } from "./SocialMediaLinks";
import { ManageDataPage } from "./ManageDataPage";

const footerLinks = [
  ["Company", "/about"],
  ["Help centre", "/faq"],
  ["Contact support", "/support"],
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
  ["Cancellation", "/cancellation-policy"],
  ["Partner terms", "/partner-terms"],
  ["Manage data", "/manage-data"],
] as const;

type AsyncState<T> = {
  status: "loading" | "success" | "error";
  data: T;
  message?: string;
};

type HeaderMenu = "services" | "cities" | null;

const initialListState: AsyncState<never[]> = { status: "loading", data: [] };

function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Lexho`;
  }, [title]);
}

function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="menu-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function formatSlugLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MenuColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="menu-column">
      <p>{label}</p>
      {children}
    </section>
  );
}

function HeaderMenuContent({
  menu,
  categories,
  cities,
  services,
  areas,
  selectedCategory,
  selectedCity,
  onCategorySelect,
  onCitySelect,
  onNavigate,
}: {
  menu: Exclude<HeaderMenu, null>;
  categories: AsyncState<WebsiteCategory[]>;
  cities: AsyncState<WebsiteCity[]>;
  services: AsyncState<WebsiteService[]>;
  areas: AsyncState<WebsiteArea[]>;
  selectedCategory: string | null;
  selectedCity: string | null;
  onCategorySelect: (slug: string) => void;
  onCitySelect: (slug: string) => void;
  onNavigate: () => void;
}) {
  const list = <T extends { slug: string; name: string }>(state: AsyncState<T[]>, render: (item: T) => React.ReactNode) => {
    if (state.status === "loading") {
      return (
        <div className="menu-scroll">
          <SkeletonList rows={4} />
        </div>
      );
    }
    if (state.status === "error") {
      return (
        <div className="menu-scroll">
          <p className="menu-message error">Unable to load options right now.</p>
        </div>
      );
    }
    if (!state.data.length) {
      return (
        <div className="menu-scroll">
          <p className="menu-message">No options available yet.</p>
        </div>
      );
    }
    return <div className="menu-scroll menu-links">{state.data.map(render)}</div>;
  };

  if (menu === "services") {
    return (
      <>
        <MenuColumn label="Our services">
          {list(categories, (category) => (
            <button
              key={category.slug}
              className={`menu-list-item${selectedCategory === category.slug ? " active" : ""}`}
              onClick={() => onCategorySelect(category.slug)}
            >
              <span>{category.name}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          ))}
        </MenuColumn>
        <MenuColumn label="Choose a service">
          {list(services, (service) => (
            <Link key={service.slug} to={`/services/${service.slug}`} state={{ serviceId: service.id, serviceName: service.name }} onClick={onNavigate}>
              <span>{service.name}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </MenuColumn>
      </>
    );
  }

  return (
    <>
      <MenuColumn label="Cities">
        {list(cities, (city) => (
          <button
            key={city.slug}
            className={`menu-list-item${selectedCity === city.slug ? " active" : ""}`}
            onClick={() => onCitySelect(city.slug)}
          >
            <span>{city.name}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        ))}
      </MenuColumn>
      <MenuColumn label="Areas">
        {list(areas, (area) => (
          <Link key={area.slug} to={`/cities/${selectedCity}/${area.slug}`} onClick={onNavigate}>
            <span>{area.name}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ))}
      </MenuColumn>
    </>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<HeaderMenu>(null);
  const [categories, setCategories] = useState<AsyncState<WebsiteCategory[]>>(initialListState);
  const [cities, setCities] = useState<AsyncState<WebsiteCity[]>>(initialListState);
  const [services, setServices] = useState<AsyncState<WebsiteService[]>>(initialListState);
  const [areas, setAreas] = useState<AsyncState<WebsiteArea[]>>(initialListState);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    setNavOpen(false);
    setActiveMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    if (activeMenu !== "services" || categories.status !== "loading") return;
    void getWebsiteCategories()
      .then((data) => setCategories({ status: "success", data }))
      .catch((error) => setCategories({ status: "error", data: [], message: error instanceof Error ? error.message : undefined }));
  }, [activeMenu, categories.status]);

  useEffect(() => {
    if (cities.status !== "loading") return;
    void getWebsiteCities()
      .then((data) => setCities({ status: "success", data }))
      .catch((error) => setCities({ status: "error", data: [], message: error instanceof Error ? error.message : undefined }));
  }, [cities.status]);

  useEffect(() => {
    if (!selectedCategory && categories.data[0]) setSelectedCategory(categories.data[0].slug);
  }, [categories.data, selectedCategory]);

  useEffect(() => {
    if (!selectedCity && cities.data[0]) setSelectedCity(cities.data[0].slug);
  }, [cities.data, selectedCity]);

  useEffect(() => {
    if (!selectedCategory) return;
    setServices({ status: "loading", data: [] });
    void getCategoryServices(selectedCategory)
      .then((data) => setServices({ status: "success", data }))
      .catch((error) => setServices({ status: "error", data: [], message: error instanceof Error ? error.message : undefined }));
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCity) return;
    setAreas({ status: "loading", data: [] });
    void getCityAreas(selectedCity)
      .then((data) => setAreas({ status: "success", data }))
      .catch((error) => setAreas({ status: "error", data: [], message: error instanceof Error ? error.message : undefined }));
  }, [selectedCity]);

  const closeMenus = () => {
    setActiveMenu(null);
    setNavOpen(false);
  };

  const toggleMenu = (menu: Exclude<HeaderMenu, null>) => {
    setActiveMenu((current) => (current === menu ? null : menu));
  };

  const menuContent = activeMenu ? (
    <HeaderMenuContent
      menu={activeMenu}
      categories={categories}
      cities={cities}
      services={services}
      areas={areas}
      selectedCategory={selectedCategory}
      selectedCity={selectedCity}
      onCategorySelect={setSelectedCategory}
      onCitySelect={setSelectedCity}
      onNavigate={closeMenus}
    />
  ) : null;

  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand" onClick={() => setNavOpen(false)}>
          <img className="brand-logo" src={lexhoHomeLogo} alt="" />
          Lexho
        </Link>
        <nav className={navOpen ? "open" : ""} aria-label="Primary navigation">
          <div className="nav-inline">
            <button
              className={`nav-trigger desktop-only${activeMenu === "services" ? " is-open" : ""}`}
              onClick={() => toggleMenu("services")}
              aria-expanded={activeMenu === "services"}
            >
              Our services <ChevronDown size={15} />
            </button>
            <button
              className={`nav-trigger desktop-only${activeMenu === "cities" ? " is-open" : ""}`}
              onClick={() => toggleMenu("cities")}
              aria-expanded={activeMenu === "cities"}
            >
              Cities <ChevronDown size={15} />
            </button>
            <button
              className={`mobile-nav-link mobile-only${activeMenu === "services" ? " is-open" : ""}`}
              onClick={() => toggleMenu("services")}
              aria-expanded={activeMenu === "services"}
            >
              <span>Our services</span><ChevronDown size={15} />
            </button>
            <button
              className={`mobile-nav-link mobile-only${activeMenu === "cities" ? " is-open" : ""}`}
              onClick={() => toggleMenu("cities")}
              aria-expanded={activeMenu === "cities"}
            >
              <span>Cities</span><ChevronDown size={15} />
            </button>
            <Link to="/about" onClick={() => setNavOpen(false)}>
              Company
            </Link>
            <Link to="/faq" onClick={() => setNavOpen(false)}>
              Help centre
            </Link>
            <Link to="/support" onClick={() => setNavOpen(false)}>
              Contact support
            </Link>
          </div>
          {menuContent ? <div className="mobile-nav-panel">{menuContent}</div> : null}
          <a className="app-link" href="#get-app">
            Get the app
            <ArrowRight size={16} />
          </a>
        </nav>
        <button className="menu" onClick={() => setNavOpen((current) => !current)} aria-label="Toggle navigation">
          {navOpen ? <X /> : <Menu />}
        </button>
        {menuContent ? <div className="menu-flyout desktop-only">{menuContent}</div> : null}
      </header>
      <main>{children}</main>
      <footer>
        <div className="footer-top">
          <div className="footer-mark">
            <img className="footer-logo" src={lexhoHomeLogo} alt="" />
            <div>
              <strong>Lexho</strong>
              <p>Home services, handled with care.</p>
            </div>
          </div>
          <section className="footer-contact" aria-label="Contact Lexho">
            <h2>Contact</h2>
            <a href="mailto:lexhoservice@gmail.com">lexhoservice@gmail.com</a>
            <a href="tel:+917999700475">+91 79997 00475</a>
            <p>Serving customers across India</p>
          </section>
          <section className="footer-trust" aria-label="Our service commitments">
            <h2>Why Lexho</h2>
            <p>Verified professionals</p>
            <p>Secure payments</p>
            <p>Easy rescheduling</p>
          </section>
          <section className="footer-cities" aria-label="Service cities">
            <h2>Service cities</h2>
            {cities.status === "success" && cities.data.length ? (
              <div>
                {cities.data.slice(0, 6).map((city) => <Link key={city.id} to={`/cities/${city.slug}`}>{city.name}</Link>)}
              </div>
            ) : (
              <p>More cities coming soon.</p>
            )}
          </section>
          <section className="footer-app" aria-label="Download the Lexho app">
            <h2>Get the app</h2>
            <p>Book and manage services on the go.</p>
            <div>
              <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer">Google Play</a>
              <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer">App Store</a>
            </div>
          </section>
        </div>
        <div className="footer-grid">
          {footerLinks.map(([label, path]) => (
            <Link key={path} to={path}>
              {label}
            </Link>
          ))}
        </div>
        <SocialMediaLinks />
        <div className="footer-bottom">
          <p className="copyright">© {new Date().getFullYear()} Lexho. All rights reserved.</p>
          <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button>
        </div>
      </footer>
    </>
  );
}

function LegalDocument({ page }: { page: LegalPage }) {
  const [remote, setRemote] = useState<{ title?: string; content?: string; updatedAt?: string } | null>(null);
  useTitle(page.title);

  useEffect(() => {
    if (page.apiSlug) {
      void getLegalDocument(page.apiSlug).then(setRemote);
    }
  }, [page.apiSlug]);

  const content = remote?.content;

  return (
    <section className="legal">
      <div className="legal-hero">
        <p>{page.eyebrow}</p>
        <h1>{remote?.title || page.title}</h1>
        <span>{page.intro}</span>
      </div>
      <article className="legal-copy">
        {content
          ? content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)
          : page.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
        <p className="updated">Last reviewed: {remote?.updatedAt ? new Date(remote.updatedAt).toLocaleDateString() : "August 2026"}</p>
      </article>
    </section>
  );
}

function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>(fallbackFaqs);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useTitle("Help centre");

  useEffect(() => {
    void getFaqs().then((items) => {
      if (items.length) setFaqs(items);
    });
  }, []);

  const filtered = faqs.filter((faq) =>
    `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="help">
      <div className="help-hero">
        <p>Lexho help centre</p>
        <h1>Answers without the runaround.</h1>
        <label className="search">
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bookings, payments, services..."
          />
        </label>
      </div>
      <div className="faq-list">
        {filtered.map((faq) => (
          <article key={`${faq.category}-${faq.question}`} className={open === faq.question ? "faq open" : "faq"}>
            <button onClick={() => setOpen(open === faq.question ? null : faq.question)}>
              <small>{faq.category}</small>
              <strong>{faq.question}</strong>
              <ChevronDown />
            </button>
            {open === faq.question ? <p>{faq.answer}</p> : null}
          </article>
        ))}
        {!filtered.length ? (
          <p className="empty">
            No answer found. <Link to="/support">Send our team a message.</Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SupportPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useTitle("Support");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await submitSupportTicket({
        name: String(form.get("name")).trim(),
        email: String(form.get("email")).trim(),
        phone: String(form.get("phone")).trim(),
        subject: String(form.get("subject")).trim(),
        message: String(form.get("message")).trim(),
        bookingId: String(form.get("bookingId")).trim() || undefined,
      });
      setStatus("sent");
      formElement.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="support">
      <div className="support-intro">
        <p>Support</p>
        <h1>Tell us what's on your mind.</h1>
        <span>For booking-specific help, include the booking ID so our team can find the details faster.</span>
        <div className="support-note">
          <Headphones />
          <div>
            <strong>Need a quick answer?</strong>
            <Link to="/faq">
              Browse the help centre
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
      <form onSubmit={submit}>
        <label>
          Full name
          <input required name="name" minLength={2} autoComplete="name" placeholder="Your name" />
        </label>
        <label>
          Email address
          <input required name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        </label>
        <label>
          Phone number
          <input required name="phone" type="tel" autoComplete="tel" minLength={10} placeholder="9876543210" />
        </label>
        <label>
          Booking ID <span>(optional)</span>
          <input name="bookingId" placeholder="For example, BK-12345" />
        </label>
        <label>
          Subject
          <input required name="subject" minLength={3} placeholder="What can we help with?" />
        </label>
        <label>
          Message
          <textarea required name="message" minLength={10} rows={7} placeholder="Share the relevant details here..." />
        </label>
        <button className="primary" disabled={status === "sending"}>
          {status === "sending" ? "Sending..." : "Send request"}
          <ArrowRight size={17} />
        </button>
        {status === "sent" ? <p className="success">Your request is with our support team.</p> : null}
        {status === "error" ? <p className="error">We could not send this just now. Please try again shortly.</p> : null}
      </form>
    </section>
  );
}

function ServiceDetailPage() {
  const { serviceSlug = "" } = useParams();
  const location = useLocation();
  const [state, setState] = useState<AsyncState<WebsiteServiceDetail | null>>({ status: "loading", data: null });

  useTitle(location.state && typeof location.state === "object" && "serviceName" in location.state ? String(location.state.serviceName) : formatSlugLabel(serviceSlug));

  useEffect(() => {
    let cancelled = false;
    const serviceId =
      location.state && typeof location.state === "object" && "serviceId" in location.state
        ? Number(location.state.serviceId)
        : undefined;

    setState({ status: "loading", data: null });
    void getServiceDetails(serviceSlug, Number.isFinite(serviceId) ? serviceId : undefined)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ status: "error", data: null, message: error instanceof Error ? error.message : "Unable to load service details." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.state, serviceSlug]);

  const detail = state.data;

  return (
    <section className="detail-page">
      <div className="detail-hero">
        <p>
          <Sparkles size={14} />
          Service details
        </p>
        <h1>{detail?.serviceName ?? formatSlugLabel(serviceSlug)}</h1>
        <span>{detail?.description || "Everything you need to know before booking this Lexho service."}</span>
        {detail?.price ? <strong>Starting at ₹{detail.price.toLocaleString("en-IN")}</strong> : null}
      </div>
      <div className="detail-content">
        {state.status === "loading" ? (
          <div className="detail-card">
            <SkeletonList rows={6} />
          </div>
        ) : null}
        {state.status === "error" ? (
          <div className="detail-card">
            <p className="error">{state.message ?? "Unable to load service details."}</p>
          </div>
        ) : null}
        {state.status === "success" && detail ? (
          <>
            <article className="detail-card">
              <h2>Overview</h2>
              <p>{detail.description || "Service information will appear here as soon as it is available."}</p>
              {detail.bookingMode ? (
                <p className="detail-meta">
                  <strong>Booking mode:</strong> {detail.bookingMode}
                </p>
              ) : null}
            </article>
            <article className="detail-grid">
              <section className="detail-card">
                <h2>Included</h2>
                {detail.included.length ? (
                  <ul>{detail.included.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p>No inclusions available.</p>
                )}
              </section>
              <section className="detail-card">
                <h2>Excluded</h2>
                {detail.excluded.length ? (
                  <ul>{detail.excluded.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p>No exclusions available.</p>
                )}
              </section>
            </article>
            <article className="detail-grid">
              <section className="detail-card">
                <h2>Instructions</h2>
                {detail.instructions.length ? (
                  <ul>{detail.instructions.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p>No instructions available.</p>
                )}
              </section>
              <section className="detail-card">
                <h2>FAQs</h2>
                {detail.faqs.length ? (
                  <ul>{detail.faqs.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : (
                  <p>No FAQs available.</p>
                )}
              </section>
            </article>
          </>
        ) : null}
      </div>
    </section>
  );
}

function CityPage() {
  const { citySlug = "" } = useParams();
  const [state, setState] = useState<AsyncState<WebsiteArea[]>>({ status: "loading", data: [] });

  useTitle(formatSlugLabel(citySlug));

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: [] });
    void getCityAreas(citySlug)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", data: [], message: error instanceof Error ? error.message : "Unable to load areas." });
      });

    return () => {
      cancelled = true;
    };
  }, [citySlug]);

  return (
    <section className="detail-page">
      <div className="detail-hero">
        <p>
          <MapPin size={14} />
          City areas
        </p>
        <h1>{formatSlugLabel(citySlug)}</h1>
        <span>Explore the areas currently mapped for this city.</span>
      </div>
      <div className="detail-content">
        <article className="detail-card">
          <h2>Areas</h2>
          {state.status === "loading" ? <SkeletonList rows={5} /> : null}
          {state.status === "error" ? <p className="error">Unable to load areas.</p> : null}
          {state.status === "success" && state.data.length === 0 ? <p>No areas available.</p> : null}
          {state.status === "success" && state.data.length > 0 ? (
            <div className="menu-links page-links">
              {state.data.map((area) => (
                <Link key={area.slug} to={`/cities/${citySlug}/${area.slug}`}>
                  <span>{area.name}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}

function AreaPage() {
  const { citySlug = "", areaSlug = "" } = useParams();

  useTitle(formatSlugLabel(areaSlug));

  return (
    <section className="detail-page">
      <div className="detail-hero">
        <p>
          <MapPin size={14} />
          Area
        </p>
        <h1>{formatSlugLabel(areaSlug)}</h1>
        <span>{formatSlugLabel(citySlug)} coverage area.</span>
      </div>
      <div className="detail-content">
        <article className="detail-card">
          <h2>Selected area</h2>
          <p>{formatSlugLabel(areaSlug)}</p>
          <Link className="inline-link" to={`/cities/${citySlug}`}>
            View all areas in {formatSlugLabel(citySlug)}
          </Link>
        </article>
      </div>
    </section>
  );
}

function NotFound() {
  useTitle("Page not found");

  return (
    <section className="not-found">
      <p>404</p>
      <h1>That page isn't here.</h1>
      <Link className="primary" to="/">
        Go to Lexho
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}

function RoutedApp() {
  const location = useLocation();
  const page = legalPages[location.pathname];

  return (
    <Layout>
      {page ? (
        <LegalDocument page={page} />
      ) : (
        <Routes>
          <Route path="/" element={<LegalDocument page={legalPages["/about"]} />} />
          <Route path="/about" element={<LegalDocument page={legalPages["/about"]} />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/manage-data" element={<ManageDataPage />} />
          <Route path="/services/:serviceSlug" element={<ServiceDetailPage />} />
          <Route path="/cities/:citySlug" element={<CityPage />} />
          <Route path="/cities/:citySlug/:areaSlug" element={<AreaPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  );
}

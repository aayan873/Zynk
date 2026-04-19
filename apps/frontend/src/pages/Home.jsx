import { Link } from "react-router-dom";
import {
  GraduationCap,
  Video,
  LayoutGrid,
  KeyRound,
  MessageSquareText,
} from "lucide-react";
import "./Home.css";

const featureItems = [
  {
    icon: GraduationCap,
    title: "Role-based Experience",
    body: "Symmetrical yet distinct workflows. Teachers curate, students absorb-all within a unified environment.",
  },
  {
    icon: Video,
    title: "Live Sessions",
    body: "Instant connectivity or scheduled rigor. High-fidelity video that feels like the front row of a lecture hall.",
  },
  {
    icon: LayoutGrid,
    title: "Classroom Hub",
    body: "Announcements, resources, and people. The single source of truth for every semester's journey.",
  },
  {
    icon: KeyRound,
    title: "Smart Access",
    body: "Automatic profile mapping. Students only see what matters, exactly when it matters most.",
  },
  {
    icon: MessageSquareText,
    title: "Real-time Interaction",
    body: "Participation controls and presence tracking that foster actual academic engagement, not just attendance.",
  },
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="nocturnal-home">
      <header className="nocturnal-topbar">
        <Link to="/home" className="nocturnal-brand" aria-label="Zynk Home">
          <img src="/image.png" alt="Zynk Logo" />
        </Link>

      </header>

      <main>
        <section className="nocturnal-hero" id="why-zynk">
          <div className="nocturnal-hero-copy">
            <h1 className="nocturnal-headline">
              Run your classroom.
              <br />
              <span>Live</span>, organized, and
              <br />
              in <span>sync</span>.
            </h1>

            <p className="nocturnal-subline">
              Create classes, schedule or start instant sessions, share updates, and keep
              students engaged from one dashboard.
            </p>

            <div className="nocturnal-actions">
              <Link to="/signup" className="nocturnal-btn nocturnal-btn-primary">
                Get Started
              </Link>
              <Link to="/login" className="nocturnal-btn nocturnal-btn-ghost">
                Explore Demo
              </Link>
            </div>
          </div>

          <div className="nocturnal-hero-art" aria-hidden="true">
            <div className="nocturnal-art-frame" />
            <div className="nocturnal-art-frame nocturnal-art-frame-offset" />
          </div>
        </section>

        <section className="nocturnal-features" id="features">
          {featureItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="nocturnal-feature-card">
                <Icon size={17} strokeWidth={1.8} className="nocturnal-feature-icon" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}

          <article className="nocturnal-feature-card nocturnal-feature-pagination" aria-hidden="true">
            <div className="nocturnal-page-dots">
              <span className="nocturnal-dot nocturnal-dot-active" />
              <span className="nocturnal-dot" />
              <span className="nocturnal-dot" />
              <span className="nocturnal-dot-line" />
            </div>
          </article>
        </section>

        <section className="nocturnal-philosophy" id="academic-flow">
          <p className="nocturnal-philosophy-kicker">The Philosophy</p>
          <blockquote>
            <span>Built for real</span> academic
            flow <span>- not just video calls.</span>
          </blockquote>
        </section>
      </main>

      <footer className="nocturnal-footer">
        <div>
          <p className="nocturnal-footer-brand">Zynk</p>
          <p className="nocturnal-footer-copy">© {year} Zynk. The modern archive of education.</p>
        </div>

        <nav className="nocturnal-footer-links" aria-label="Legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Support</a>
        </nav>
      </footer>
    </div>
  );
}

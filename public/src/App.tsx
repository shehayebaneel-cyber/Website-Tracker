import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { WhatsAppFab } from "./components/ui";
import Home from "./pages/Home";
import Plans from "./pages/Plans";
import BusinessSystems from "./pages/BusinessSystems";
import OurWork from "./pages/OurWork";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Start from "./pages/Start";
import Support from "./pages/Support";
import Track from "./pages/Track";
import Stub from "./pages/Stub";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/business-systems" element={<BusinessSystems />} />
          <Route path="/our-work" element={<OurWork />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          {/* Later phases */}
          <Route path="/start" element={<Start />} />
          <Route path="/support" element={<Support />} />
          <Route path="/track" element={<Track />} />
          <Route path="/login" element={<Stub title="Client Login" phase="Phase 4 — the client portal" />} />
          <Route path="/terms" element={<Stub title="Terms & Conditions" phase="a later phase" />} />
          <Route path="/privacy" element={<Stub title="Privacy Policy" phase="a later phase" />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}

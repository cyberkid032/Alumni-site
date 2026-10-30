// ===== Nav: scroll shadow, mobile hamburger, active link =====
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".site-nav");
  const navList = document.querySelector(".site-nav ul");
  const toggle = document.querySelector(".nav-toggle");

  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (toggle && navList) {
    toggle.addEventListener("click", () => {
      const isOpen = navList.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    // Close the mobile menu after a link is tapped
    navList.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => navList.classList.remove("open"));
    });
  }

  // Highlight the current page's nav link
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav ul a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === current) link.classList.add("active");
  });

  // Reveal-on-scroll for elements marked .reveal
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("in-view"));
  }
});

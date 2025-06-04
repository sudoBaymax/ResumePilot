const ContactPage = () => {
  return (
    <div>
      {/* Header Section */}
      <header>
        <nav>
          <ul>
            <li>
              <a href="#how-it-works">How It Works</a>
            </li>
            <li>
              <a href="#demo">Demo</a>
            </li>
            <li>
              <a href="#faq">FAQ</a>
            </li>
            <li>
              <a href="/pricing">Pricing</a>
            </li>
            <li>
              <a href="/about">About</a>
            </li>
            <li>
              <a href="/contact">Contact</a>
            </li>
            <li>
              <a href="/privacy">Privacy</a>
            </li>
          </ul>
        </nav>
      </header>

      {/* Main Content Section */}
      <main>
        <section id="how-it-works">
          <h2>How It Works</h2>
          <p>Details on how the service operates.</p>
        </section>
        <section id="demo">
          <h2>Demo</h2>
          <p>Experience the service through our demo.</p>
        </section>
        <section id="faq">
          <h2>FAQ</h2>
          <p>Frequently asked questions about the service.</p>
        </section>
      </main>

      {/* Footer Section */}
      <footer>
        <div>
          <h3>Product</h3>
          <ul>
            <li>
              <a href="#how-it-works">How It Works</a>
            </li>
            <li>
              <a href="#demo">Demo</a>
            </li>
            <li>
              <a href="/pricing">Pricing</a>
            </li>
          </ul>
        </div>
        <div>
          <h3>Company</h3>
          <ul>
            <li>
              <a href="/about">About</a>
            </li>
            <li>
              <a href="/contact">Contact</a>
            </li>
            <li>
              <a href="/privacy">Privacy</a>
            </li>
          </ul>
        </div>
        <div>
          <h3>Social</h3>
          <ul>
            <li>
              <a href="https://github.com/resumepilot">GitHub</a>
            </li>
            <li>
              <a href="https://twitter.com/ResumePilot">Twitter</a>
            </li>
            <li>
              <a href="mailto:info@resumepilot.com">Email</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  )
}

export default ContactPage

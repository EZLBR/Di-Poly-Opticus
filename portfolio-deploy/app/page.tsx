const projects = [
  {
    number: "01",
    title: "Opticus",
    type: "Marketplace + Estúdio 3D",
    year: "2026",
    description:
      "Plataforma de eyewear que une catálogo curado e estúdio 3D em tempo real para explorar modelos, personalizar armações e salvar criações.",
    visual: "orbit",
    href: "https://di-poly-opticus.vercel.app/",
  },
  {
    number: "02",
    title: "Vortex Marketplace",
    type: "Aplicação Full Stack",
    year: "2026",
    description:
      "Marketplace de economia circular para a comunidade da Unifor comprar, vender e doar livros, eletrônicos e outros materiais acadêmicos.",
    visual: "green",
    href: "https://vortex-marketplace-gamma.vercel.app/",
  },
];

const expertise = [
  "Desenvolvimento web",
  "Robótica educacional",
  "Aplicações full stack",
  "Interfaces interativas",
];

function ProjectVisual({ visual }: { visual: string }) {
  if (visual === "orbit") {
    return (
      <div
        className="project-visual visual-orbit"
        role="img"
        aria-label="Composição visual do projeto Opticus"
      >
        <span className="visual-note">3D EYEWEAR PLATFORM / CUSTOMIZE</span>
        <div className="orbit-ring ring-one" />
        <div className="orbit-ring ring-two" />
        <div className="orbit-core">O</div>
        <span className="visual-index">MARKETPLACE + 3D</span>
      </div>
    );
  }

  return (
    <div
      className="project-visual visual-green"
      role="img"
      aria-label="Composição visual do projeto Vortex Marketplace"
    >
      <span className="green-label">ECONOMIA CIRCULAR NA UNIFOR</span>
      <div className="green-mark">
        <span>V</span>
        <span>X</span>
      </div>
      <div className="green-rings" />
      <span className="green-foot">MAIS USO, MENOS DESCARTE — 2026</span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#inicio" aria-label="Enzo Linhares Brasil — voltar ao início">
          ENZO<span>®</span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#projetos">Projetos</a>
          <a href="#sobre">Sobre</a>
          <a className="nav-contact" href="#contato">Contato ↗</a>
        </nav>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-kicker reveal-one">
            <span className="status-dot" />
            Fortaleza — ADS — Robótica
          </div>

          <h1 className="hero-title" aria-label="Aprendo fazendo. Ensino criando.">
            <span className="line line-one">APRENDO <i>fazendo.</i></span>
            <span className="line line-two">ENSINO</span>
            <span className="line line-three"><i>criando.</i></span>
          </h1>

          <div className="hero-foot">
            <p>
              Sou Enzo Linhares Brasil, estudante de Análise e Desenvolvimento de Sistemas na Unifor e professor de robótica no Colégio Uniq Multiverso.
            </p>
            <a className="circle-link" href="#projetos" aria-label="Ver projetos selecionados">
              <span>VER<br />PROJETOS</span>
              <b aria-hidden="true">↓</b>
            </a>
          </div>
        </section>

        <div className="marquee" aria-label={`Especialidades: ${expertise.join(", ")}`}>
          <div className="marquee-track">
            {[...expertise, ...expertise].map((item, index) => (
              <span key={`${item}-${index}`} aria-hidden={index >= expertise.length}>
                {item} <b>✳</b>
              </span>
            ))}
          </div>
        </div>

        <section className="projects section-shell" id="projetos">
          <div className="section-heading">
            <p className="eyebrow">Projetos selecionados</p>
            <p className="section-count">(02)</p>
          </div>

          <div className="project-list">
            {projects.map((project) => (
              <article className="project" key={project.number}>
                <a
                  className="project-visual-link"
                  href={project.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir ${project.title} em uma nova aba`}
                >
                  <ProjectVisual visual={project.visual} />
                </a>
                <div className="project-info">
                  <div className="project-title-row">
                    <span className="project-number">/{project.number}</span>
                    <h2>{project.title}</h2>
                  </div>
                  <p className="project-description">{project.description}</p>
                  <div className="project-meta">
                    <span>{project.type}</span>
                    <span>{project.year}</span>
                    <a href={project.href} target="_blank" rel="noreferrer">
                      Ver projeto ↗
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about" id="sobre">
          <div className="about-top section-shell">
            <p className="eyebrow light">Um pouco sobre mim</p>
            <p className="about-intro">
              Entre a sala de aula e o código, transformo <em>curiosidade</em> em experiências que funcionam.
            </p>
          </div>

          <div className="about-grid section-shell">
            <div className="about-stamp" aria-hidden="true">
              <span>TECNOLOGIA</span>
              <b>+</b>
              <span>EDUCAÇÃO</span>
            </div>
            <div className="about-copy">
              <p>
                Curso o 4º semestre de Análise e Desenvolvimento de Sistemas na Universidade de Fortaleza (Unifor), construindo projetos que unem lógica, produto e experiência digital.
              </p>
              <p>
                Como professor de robótica no Colégio Uniq Multiverso, transformo conceitos técnicos em experiências práticas, criativas e acessíveis para os alunos.
              </p>
            </div>
            <div className="services">
              <p className="services-label">O que eu faço</p>
              <ol>
                <li><span>01</span> Desenvolvimento web</li>
                <li><span>02</span> Aplicações full stack</li>
                <li><span>03</span> Interfaces interativas</li>
                <li><span>04</span> Robótica educacional</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="contact section-shell" id="contato">
          <p className="eyebrow">Vamos construir algo?</p>
          <div className="contact-row">
            <h2>VAMOS FAZER<br /><em>acontecer.</em></h2>
            <a className="contact-button" href="mailto:enzobrasil1207@gmail.com">
              <span>Fale comigo por e-mail</span>
              <b aria-hidden="true">↗</b>
            </a>
          </div>
          <div className="contact-details">
            <a href="mailto:enzobrasil1207@gmail.com">enzobrasil1207@gmail.com</a>
            <div className="socials">
              <a href="https://www.linkedin.com/in/enzo-linhares/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
              <a href="https://github.com/EZLBR" target="_blank" rel="noreferrer">GitHub ↗</a>
              <a href="tel:85991059144">Telefone: 85 99105-9144</a>
            </div>
            <p>Fortaleza, Brasil<br />© 2026</p>
          </div>
        </section>
      </main>
    </>
  );
}

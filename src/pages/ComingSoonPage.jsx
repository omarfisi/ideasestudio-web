import "./ComingSoonPage.css";

export default function ComingSoonPage() {
  return (
    <main className="jj-coming-soon" aria-labelledby="coming-soon-title">
      <div className="jj-coming-soon__scribble jj-coming-soon__scribble--pink" aria-hidden="true" />
      <div className="jj-coming-soon__scribble jj-coming-soon__scribble--cyan" aria-hidden="true" />
      <div className="jj-coming-soon__content">
        <span className="jj-coming-soon__eyebrow">JJ Pega</span>
        <h1 id="coming-soon-title">Coming Soon</h1>
        <p>
          Estamos preparando algo especial para que puedas pegar tus ideas en
          todas partes.
        </p>
      </div>
      <div className="jj-coming-soon__sticker" aria-hidden="true">
        <span>✨</span>
        <strong>Muy<br />pronto</strong>
      </div>
    </main>
  );
}

// Page d'accueil simple pour le backend API
// Les vraies routes sont dans /api

export default function HomePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>BlindTest API</h1>
      <p>Le backend est opérationnel.</p>
      <ul>
        <li><a href="/api/games">GET /api/games</a> - Liste des parties</li>
        <li>POST /api/auth/login - Connexion</li>
        <li>POST /api/auth/register - Inscription</li>
      </ul>
    </div>
  );
}


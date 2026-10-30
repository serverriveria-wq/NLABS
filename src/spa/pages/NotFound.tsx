import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Página no encontrada — NLab</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-muted-foreground">La página que buscas no existe.</p>
        <Link to="/dashboard" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Ir al inicio
        </Link>
      </div>
    </>
  );
}
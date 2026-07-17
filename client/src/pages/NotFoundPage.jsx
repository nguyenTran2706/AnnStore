import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="font-heading text-6xl text-ink-faint mb-4">404</p>
      <h1 className="font-heading text-2xl text-ink mb-2">Page not found</h1>
      <p className="text-ink-light max-w-sm mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary">
        Back to the shop
      </Link>
    </div>
  );
}

import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkspaceLinkCard({ to, label, description }) {
  return (
    <Link className="dashboard-shortcut-card" to={to}>
      <strong>{label}</strong>
      <span>{description}</span>
      <small>
        Open page
        <ArrowRight size={14} />
      </small>
    </Link>
  );
}

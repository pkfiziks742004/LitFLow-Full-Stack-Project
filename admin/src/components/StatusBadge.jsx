export default function StatusBadge({ value }) {
  return <span className={`status-badge ${String(value).toLowerCase()}`}>{value}</span>;
}


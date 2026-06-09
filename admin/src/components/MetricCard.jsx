export default function MetricCard({ label, value, helper, icon: Icon, tone = '' }) {
  return (
    <article className={`metric-card ${tone}`.trim()}>
      <div className="metric-card-head">
        <p>{label}</p>
        {Icon ? (
          <span className="metric-card-icon">
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <strong>{value}</strong>
      {helper ? <span>{helper}</span> : null}
    </article>
  );
}

export default function ChartPanel({ title, children, aside }) {
  return (
    <section className="chart-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">Visualization</p>
          <h3>{title}</h3>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

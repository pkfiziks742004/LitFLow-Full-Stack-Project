export default function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  label = 'items'
}) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 1)));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = total ? Math.min(page * pageSize, total) : 0;

  return (
    <div className="pagination-bar">
      <p>
        Showing {start}-{end} of {total} {label}
      </p>
      <div className="pagination-actions">
        <button
          type="button"
          className="ghost-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="pagination-page">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="ghost-button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

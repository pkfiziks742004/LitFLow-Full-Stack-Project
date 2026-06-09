function resolveRowId(row, index) {
  return row.id ?? row.key ?? index;
}

export default function DataTable({
  columns,
  rows,
  emptyMessage = 'No data found.',
  onRowClick,
  selectedRowId,
  getRowClassName
}) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={resolveRowId(row, index)}
                  className={[
                    onRowClick ? 'is-clickable' : '',
                    selectedRowId === resolveRowId(row, index) ? 'is-selected' : '',
                    getRowClassName ? getRowClassName(row) : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      onClick={column.preventRowClick ? (event) => event.stopPropagation() : undefined}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

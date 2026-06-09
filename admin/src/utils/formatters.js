const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const shortDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return 'N/A';
  return dateTimeFormatter.format(new Date(value));
}

export function formatShortDate(value) {
  if (!value) return 'N/A';
  return shortDateFormatter.format(new Date(value));
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

export function formatAuthors(authors) {
  if (!Array.isArray(authors) || !authors.length) {
    return 'N/A';
  }

  const names = authors
    .map((author) => author?.name || author)
    .filter(Boolean)
    .slice(0, 3);
  const remainingCount = authors.length - names.length;

  return remainingCount > 0 ? `${names.join(', ')} +${remainingCount} more` : names.join(', ');
}

export function getSearchUsageValue(searchUsage) {
  if (!searchUsage || typeof searchUsage !== 'object') {
    return 0;
  }

  return Number(
    searchUsage.count ??
      searchUsage.usedToday ??
      searchUsage.searchesToday ??
      searchUsage.current ??
      0
  );
}

export function stringifyJson(value) {
  return JSON.stringify(value || {}, null, 2);
}

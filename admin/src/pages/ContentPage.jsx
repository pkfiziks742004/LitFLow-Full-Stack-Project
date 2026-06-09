import { ExternalLink, PencilLine, Star, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminClient } from '../api/http';
import AdminShell from '../components/AdminShell';
import DataTable from '../components/DataTable';
import MetricCard from '../components/MetricCard';
import PaginationControls from '../components/PaginationControls';
import StatusBadge from '../components/StatusBadge';
import WorkspaceLinkCard from '../components/WorkspaceLinkCard';
import useAdminLiveRefresh from '../hooks/useAdminLiveRefresh';
import { formatAuthors, formatDate } from '../utils/formatters';

const PAGE_SIZE = 8;

const INITIAL_FORM = {
  id: null,
  paperId: '',
  title: '',
  authorsText: '',
  year: '',
  abstract: '',
  venue: '',
  url: '',
  pdfUrl: '',
  notes: '',
  isTrending: false,
  isFeatured: false
};

function toAuthorPayload(authorsText) {
  return authorsText
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, authorId: '' }));
}

function isSafeExternalUrl(value) {
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (_error) {
    return false;
  }
}

export default function ContentPage({ pageView = 'home' }) {
  const [filters, setFilters] = useState({ page: 1, pageSize: PAGE_SIZE, view: 'all' });
  const [content, setContent] = useState({
    savedPapers: { rows: [], count: 0 },
    curatedPapers: { rows: [], count: 0 }
  });
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  async function loadContent(nextFilters = filters) {
    try {
      setLoading(true);
      const { data } = await adminClient.content(nextFilters);
      setContent({
        savedPapers: data.savedPapers || { rows: [], count: 0 },
        curatedPapers: data.curatedPapers || { rows: [], count: 0 }
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load content data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContent();
  }, [filters.page, filters.pageSize, filters.view]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1
    }));
  };

  const startEditing = (paper) => {
    setForm({
      id: paper.id,
      paperId: paper.paperId || '',
      title: paper.title || '',
      authorsText: (paper.authors || []).map((author) => author.name).join(', '),
      year: paper.year ? String(paper.year) : '',
      abstract: paper.abstract || '',
      venue: paper.venue || '',
      url: paper.url || '',
      pdfUrl: paper.pdfUrl || '',
      notes: paper.notes || '',
      isTrending: Boolean(paper.isTrending),
      isFeatured: Boolean(paper.isFeatured)
    });
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!isSafeExternalUrl(form.url)) {
      toast.error('Primary URL must use a valid http or https address.');
      return;
    }

    if (!isSafeExternalUrl(form.pdfUrl)) {
      toast.error('PDF URL must use a valid http or https address.');
      return;
    }

    try {
      setSubmitting(true);
      await adminClient.saveContent({
        id: form.id || undefined,
        paperId: form.paperId,
        title: form.title,
        authors: toAuthorPayload(form.authorsText),
        year: form.year ? Number(form.year) : null,
        abstract: form.abstract,
        venue: form.venue,
        url: form.url,
        pdfUrl: form.pdfUrl,
        isTrending: Boolean(form.isTrending),
        isFeatured: Boolean(form.isFeatured),
        notes: form.notes,
        source: 'manual'
      });
      toast.success(form.id ? 'Curated paper updated.' : 'Content paper saved.');
      resetForm();
      await loadContent();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save content paper.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContent = async (paper) => {
    const confirmed = window.confirm(`Delete curated paper "${paper.title}"?`);

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`curated-${paper.id}`);
      await adminClient.deleteContent(paper.id);
      toast.success('Curated paper deleted.');
      if (form.id === paper.id) {
        resetForm();
      }
      await loadContent();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete curated paper.');
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteSaved = async (paper) => {
    const confirmed = window.confirm(`Delete saved paper "${paper.title}" from user data?`);

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`saved-${paper.id}`);
      await adminClient.deleteSavedPaper(paper.id);
      toast.success('Saved paper deleted.');
      await loadContent();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete saved paper.');
    } finally {
      setActionLoading('');
    }
  };

  const handlePromote = async (paper) => {
    try {
      setActionLoading(`promote-${paper.id}`);
      await adminClient.saveContent({
        paperId: paper.paperId,
        title: paper.title,
        authors: paper.authors || [],
        year: paper.year,
        abstract: paper.abstract,
        venue: paper.venue,
        url: paper.url,
        pdfUrl: paper.pdfUrl,
        isTrending: false,
        isFeatured: true,
        source: 'saved_paper',
        notes: 'Promoted from saved papers by admin'
      });
      toast.success('Saved paper promoted to featured content.');
      await loadContent();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to promote saved paper.');
    } finally {
      setActionLoading('');
    }
  };

  const curatedColumns = [
    {
      key: 'title',
      header: 'Curated paper',
      render: (paper) => (
        <div className="table-title">
          <strong>{paper.title}</strong>
          <span>{formatAuthors(paper.authors)}</span>
        </div>
      )
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (paper) => (
        <div className="badge-row">
          {paper.isFeatured ? <StatusBadge value="FEATURED" /> : null}
          {paper.isTrending ? <StatusBadge value="TRENDING" /> : null}
          {!paper.isFeatured && !paper.isTrending ? <StatusBadge value="CURATED" /> : null}
        </div>
      )
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (paper) => formatDate(paper.updatedAt)
    },
    {
      key: 'actions',
      header: 'Actions',
      preventRowClick: true,
      render: (paper) => (
        <div className="table-actions">
          <button type="button" className="ghost-button small-button" onClick={() => startEditing(paper)}>
            <PencilLine size={14} />
            Edit
          </button>
          {paper.url ? (
            <a className="ghost-button small-button" href={paper.url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              Open
            </a>
          ) : null}
          <button
            type="button"
            className="danger-button small-button"
            disabled={Boolean(actionLoading)}
            onClick={() => handleDeleteContent(paper)}
          >
            <Trash2 size={14} />
            {actionLoading === `curated-${paper.id}` ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )
    }
  ];

  const savedColumns = [
    {
      key: 'title',
      header: 'Saved paper',
      render: (paper) => (
        <div className="table-title">
          <strong>{paper.title}</strong>
          <span>{formatAuthors(paper.authors)}</span>
        </div>
      )
    },
    { key: 'year', header: 'Year' },
    {
      key: 'createdAt',
      header: 'Saved at',
      render: (paper) => formatDate(paper.createdAt)
    },
    {
      key: 'actions',
      header: 'Actions',
      preventRowClick: true,
      render: (paper) => (
        <div className="table-actions">
          <button
            type="button"
            className="ghost-button small-button"
            disabled={Boolean(actionLoading)}
            onClick={() => handlePromote(paper)}
          >
            <Star size={14} />
            {actionLoading === `promote-${paper.id}` ? 'Promoting...' : 'Promote'}
          </button>
          <button
            type="button"
            className="danger-button small-button"
            disabled={Boolean(actionLoading)}
            onClick={() => handleDeleteSaved(paper)}
          >
            <Trash2 size={14} />
            {actionLoading === `saved-${paper.id}` ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )
    }
  ];

  const isHomeView = pageView === 'home';
  const isCuratedView = pageView === 'curated';
  const isSavedView = pageView === 'saved';
  const pageTitle = isHomeView
    ? 'Content workspace'
    : isSavedView
      ? 'Saved papers library'
      : 'Curated content studio';
  const pageSubtitle = isHomeView
    ? 'Use separate editorial screens for curated publishing and saved-paper moderation instead of mixing everything together.'
    : isSavedView
      ? 'Inspect user-saved research, promote strong candidates to curated content, and clean unwanted records.'
      : 'Create, edit, and maintain the curated papers that shape the public LitFlow experience.';
  const sectionScrollId = isCuratedView ? 'content-editor' : isSavedView ? 'content-saved' : '';

  useAdminLiveRefresh(
    () => {
      loadContent();
    },
    {
      enabled: isHomeView || isSavedView
    }
  );

  return (
    <AdminShell
      title={pageTitle}
      subtitle={pageSubtitle}
      headerVariant="compact"
      showStatusStrip={false}
      sectionScrollId={sectionScrollId}
      actions={
        <button type="button" className="ghost-button" onClick={() => loadContent()}>
          Refresh content
        </button>
      }
    >
      <section id="content-overview" className="metrics-grid">
        <MetricCard
          label="Curated papers"
          value={content.curatedPapers.count}
          helper="Featured and trending content rows"
        />
        <MetricCard
          label="Saved papers"
          value={content.savedPapers.count}
          helper="User-generated saved research"
        />
        <MetricCard
          label="Trending curated"
          value={content.curatedPapers.rows.filter((paper) => paper.isTrending).length}
          helper="Current page only"
        />
        <MetricCard
          label="Featured curated"
          value={content.curatedPapers.rows.filter((paper) => paper.isFeatured).length}
          helper="Current page only"
        />
        <MetricCard
          label="Editor mode"
          value={form.id ? 'EDITING' : 'NEW'}
          helper={form.id ? 'Updating an existing paper' : 'Creating a fresh curated record'}
        />
        <MetricCard
          label="Curated view"
          value={filters.view.toUpperCase()}
          helper="All, featured, or trending"
        />
      </section>

      {isHomeView ? (
        <section className="content-grid" style={{ marginTop: '1rem' }}>
          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Open a content page</h3>
                <p>Editorial publishing and saved-paper moderation now live on separate admin screens.</p>
              </div>
            </div>

            <div className="dashboard-shortcuts-grid">
              <WorkspaceLinkCard
                to="/content/curated"
                label="Curated content"
                description="Add, edit, and manage the papers that appear across the public product."
              />
              <WorkspaceLinkCard
                to="/content/saved"
                label="Saved papers"
                description="Review user-saved research, remove noise, and promote standout papers."
              />
              <WorkspaceLinkCard
                to="/analytics/search"
                label="Search insights"
                description="Use real search demand to guide the next papers you feature."
              />
            </div>
          </div>

          <div className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Editorial snapshot</h3>
                <p>Quick context before jumping into a dedicated content workflow.</p>
              </div>
            </div>

            <div className="list-stack">
              <div className="activity-item">
                <strong>{content.curatedPapers.count} curated records</strong>
                <p>These are the papers currently shaping homepage and workspace editorial surfaces.</p>
              </div>
              <div className="activity-item">
                <strong>{content.savedPapers.count} saved-paper records</strong>
                <p>Open the saved library to promote, clean, or inspect user-generated paper activity.</p>
              </div>
              <div className="activity-item">
                <strong>{content.curatedPapers.rows.filter((paper) => paper.isFeatured).length} featured on this page</strong>
                <p>Curated content gives you the clearest control over what users see first.</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isCuratedView ? (
        <section id="content-editor" className="two-column-grid">
          <form className="form-card" onSubmit={handleSave}>
            <div className="panel-header">
              <div>
                <h3>{form.id ? 'Edit curated paper' : 'Add curated paper'}</h3>
                <p>
                  {form.id
                    ? 'Update title, links, tags, and editorial notes for the selected curated paper.'
                    : 'Create a featured or trending paper manually from the admin panel.'}
                </p>
              </div>
              {form.id ? (
                <button type="button" className="ghost-button small-button" onClick={resetForm}>
                  <X size={14} />
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="form-grid">
              <label>
                <span>Paper id</span>
                <input
                  value={form.paperId}
                  onChange={(event) => setForm((current) => ({ ...current, paperId: event.target.value }))}
                  placeholder="Paper ID"
                />
              </label>

              <label>
                <span>Year</span>
                <input
                  type="number"
                  value={form.year}
                  onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
                  placeholder="2026"
                />
              </label>

              <label className="full-span">
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Paper title"
                  required
                />
              </label>

              <label className="full-span">
                <span>Authors</span>
                <input
                  value={form.authorsText}
                  onChange={(event) => setForm((current) => ({ ...current, authorsText: event.target.value }))}
                  placeholder="Comma-separated author names"
                />
              </label>

              <label>
                <span>Venue</span>
                <input
                  value={form.venue}
                  onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
                  placeholder="Conference or journal"
                />
              </label>

              <label>
                <span>Primary URL</span>
                <input
                  type="url"
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://..."
                />
              </label>

              <label>
                <span>PDF URL</span>
                <input
                  type="url"
                  value={form.pdfUrl}
                  onChange={(event) => setForm((current) => ({ ...current, pdfUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>

              <label className="full-span">
                <span>Abstract</span>
                <textarea
                  value={form.abstract}
                  onChange={(event) => setForm((current) => ({ ...current, abstract: event.target.value }))}
                  placeholder="Short abstract or summary"
                />
              </label>

              <label className="full-span">
                <span>Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Why this paper should be highlighted"
                />
              </label>

              <label>
                <span>Trending</span>
                <select
                  value={form.isTrending ? 'yes' : 'no'}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isTrending: event.target.value === 'yes' }))
                  }
                >
                  <option value="no">no</option>
                  <option value="yes">yes</option>
                </select>
              </label>

              <label>
                <span>Featured</span>
                <select
                  value={form.isFeatured ? 'yes' : 'no'}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isFeatured: event.target.value === 'yes' }))
                  }
                >
                  <option value="no">no</option>
                  <option value="yes">yes</option>
                </select>
              </label>
            </div>

            <div className="card-actions" style={{ marginTop: '1rem' }}>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? 'Saving...' : form.id ? 'Update curated paper' : 'Save curated paper'}
              </button>
            </div>
          </form>

          <div id="content-curated" className="page-panel">
            <div className="panel-header">
              <div>
                <h3>Curated papers</h3>
                <p>Review, filter, and edit the papers that shape your public product experience.</p>
              </div>
              <div className="inline-filters">
                <label>
                  <span>View</span>
                  <select value={filters.view} onChange={(event) => updateFilter('view', event.target.value)}>
                    <option value="all">All curated</option>
                    <option value="featured">Featured only</option>
                    <option value="trending">Trending only</option>
                  </select>
                </label>
              </div>
            </div>

            <DataTable
              columns={curatedColumns}
              rows={content.curatedPapers.rows}
              onRowClick={(paper) => startEditing(paper)}
              selectedRowId={form.id}
              emptyMessage={loading ? 'Loading curated papers...' : 'No curated papers yet.'}
            />
          </div>
        </section>
      ) : null}

      {isSavedView ? (
        <section id="content-saved" className="page-panel" style={{ marginTop: '1rem' }}>
          <div className="panel-header">
            <div>
              <h3>Saved papers</h3>
              <p>Inspect user-saved research, promote it to featured content, or remove it.</p>
            </div>
          </div>

          <DataTable
            columns={savedColumns}
            rows={content.savedPapers.rows}
            emptyMessage={loading ? 'Loading saved papers...' : 'No saved papers found.'}
          />
          <PaginationControls
            page={filters.page}
            pageSize={filters.pageSize}
            total={content.savedPapers.count}
            label="content rows"
            onPageChange={(page) => updateFilter('page', page)}
          />
        </section>
      ) : null}
    </AdminShell>
  );
}

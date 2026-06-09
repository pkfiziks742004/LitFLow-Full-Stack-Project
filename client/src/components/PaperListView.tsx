import { Bookmark, BookmarkCheck, Calendar, ExternalLink, FileText, Search, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/context/AppContext';
import { categories } from '@/data/mockData';
import { getSafeExternalUrl, openExternalUrl } from '@/lib/utils';

function getCategoryMeta(categoryId: string) {
  return categories.find((entry) => entry.id === categoryId);
}

export function PaperListView() {
  const {
    filteredPapers,
    papers,
    selectedPaper,
    setSelectedPaper,
    user,
    isSearching,
    savePaper,
    unsavePaper,
    isSavingPaper,
    searchQuery,
    searchPapers,
    planCapabilities,
  } = useApp();

  if (isSearching) {
    return (
      <div className="grid h-full min-h-[500px] place-items-center bg-transparent">
        <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white/92 px-5 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <Search className="h-5 w-5 animate-pulse text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Preparing paper list...</span>
        </div>
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="grid h-full min-h-[500px] place-items-center bg-transparent">
        <div className="max-w-[30rem] px-6 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] border border-slate-200 bg-white text-slate-900 shadow-sm">
            <FileText className="h-7 w-7" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Paper feed</p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2.2rem]">
            List view is ready
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Enter a topic in the search bar. Once results arrive, you will see clean reading cards and the detail panel here.
          </p>
          <Button className="mt-6 h-11 rounded-full px-5" disabled={!searchQuery.trim()} onClick={() => void searchPapers()}>
            Search papers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-transparent">
      <ScrollArea className="h-full">
        <div className="space-y-4 px-4 pb-24 pt-4 sm:px-6 sm:pb-28 sm:pt-5">
            <div className="paper-feed-toolbar sticky top-0 z-10 -mx-4 border-b border-slate-200/80 bg-white/88 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-[22px] sm:border sm:border-slate-200/80 sm:bg-white/92 sm:shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Paper Feed</p>
                <h2 className="mt-1 truncate text-base font-semibold text-slate-950">
                  {searchQuery.trim() || 'Latest workspace papers'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {`${planCapabilities.name} workspace - Read, save, and open source papers quickly`}
                </p>
              </div>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                {filteredPapers.length} of {papers.length}
              </Badge>
            </div>
          </div>

          {filteredPapers.map((paper) => {
            const category = getCategoryMeta(paper.category);
            const isSelected = selectedPaper?.id === paper.id;
            const isSaved = user?.savedPapers.includes(paper.id) ?? false;
            const paperUrl = getSafeExternalUrl(paper.url || paper.pdfUrl);

            return (
              <article
                key={paper.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPaper(paper)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedPaper(paper);
                  }
                }}
                className={`paper-list-card rounded-[28px] border bg-white p-5 shadow-sm transition ${
                  isSelected
                    ? 'border-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.10)]'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)]'
                }`}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {category ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-transparent"
                        style={{
                          backgroundColor: `${category.color}14`,
                          color: category.color,
                        }}
                      >
                        {category.name}
                      </Badge>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {paper.year || 'Year n/a'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <FileText className="h-3.5 w-3.5" />
                      {paper.citations.toLocaleString()} citations
                    </span>
                    {paper.summary ? (
                      <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
                        Summary ready
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-[1.05rem] font-semibold leading-8 text-slate-950 sm:text-[1.12rem]">
                      {paper.title}
                    </h3>
                    <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>{paper.authors.join(', ') || 'Unknown author'}</span>
                    </div>
                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
                      {paper.abstract || 'Abstract not available for this paper.'}
                    </p>
                  </div>

                  {paper.keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {paper.keywords.slice(0, 5).map((keyword) => (
                        <span
                          key={`${paper.id}-${keyword}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={isSaved ? 'secondary' : 'outline'}
                      onClick={(event) => {
                        event.stopPropagation();
                        void (isSaved ? unsavePaper(paper.id) : savePaper(paper.id));
                      }}
                      disabled={isSavingPaper}
                      className="rounded-full"
                    >
                      {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      {isSaved ? 'Saved' : 'Save'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedPaper(paper);
                      }}
                      className="rounded-full border-slate-200 bg-white"
                    >
                      View details
                    </Button>

                    <Button
                      variant="ghost"
                      disabled={!paperUrl}
                      onClick={(event) => {
                        event.stopPropagation();

                        if (paperUrl) {
                          openExternalUrl(paperUrl);
                        }
                      }}
                      className="rounded-full"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open source
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

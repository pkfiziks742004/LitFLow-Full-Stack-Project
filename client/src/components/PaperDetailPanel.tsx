import { useEffect, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Calendar,
  ExternalLink,
  FileText,
  Quote,
  Share2,
  Sparkles,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/context/AppContext';
import { categories } from '@/data/mockData';
import { copyTextToClipboard, getSafeExternalUrl, openExternalUrl } from '@/lib/utils';

export function PaperDetailPanel() {
  const {
    selectedPaper,
    setSelectedPaper,
    user,
    savePaper,
    unsavePaper,
    generateSummary,
    isSavingPaper,
    isSummarizing,
    planCapabilities,
    siteConfig,
    collections,
    addToCollection,
    papers,
  } = useApp();
  const [showFullAbstract, setShowFullAbstract] = useState(false);

  useEffect(() => {
    setShowFullAbstract(false);
  }, [selectedPaper?.id]);

  if (!selectedPaper) return null;

  const isSaved = user?.savedPapers.includes(selectedPaper.id);
  const category = categories.find((entry) => entry.id === selectedPaper.category);
  const paperUrl = getSafeExternalUrl(selectedPaper.url || selectedPaper.pdfUrl);
  const relatedPapers = papers
    .filter(
      (paper) =>
        paper.id !== selectedPaper.id &&
        (paper.keywords.some((keyword) => selectedPaper.keywords.includes(keyword)) ||
          paper.category === selectedPaper.category),
    )
    .slice(0, 4);

  const handleCopy = async (value: string, label: string) => {
    const didCopy = await copyTextToClipboard(value);

    if (didCopy) {
      toast.success(`${label} copied.`);
      return;
    }

    toast.error(`Unable to copy ${label.toLowerCase()}.`);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close paper details"
        onClick={() => setSelectedPaper(null)}
        className="absolute inset-0 z-20 hidden bg-slate-950/16 lg:block"
      />

      <aside className="paper-detail-panel absolute inset-x-2 bottom-2 top-[6.5rem] z-30 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] animate-panel-slide-in lg:inset-y-4 lg:right-4 lg:left-auto lg:top-4 lg:w-[25rem] lg:rounded-[32px]">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 bg-white px-4 py-4">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 lg:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full"
                    style={{
                      backgroundColor: `${category?.color}16`,
                      color: category?.color,
                      borderColor: `${category?.color}33`,
                    }}
                  >
                    {category?.name || 'Research paper'}
                  </Badge>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {selectedPaper.year || 'Year n/a'}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold leading-8 text-slate-950">{selectedPaper.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{selectedPaper.authors.join(', ') || 'Unknown author'}</p>
              </div>

              <div className="flex items-center gap-1">
                {user ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void (isSaved ? unsavePaper(selectedPaper.id) : savePaper(selectedPaper.id))}
                    className="h-9 w-9 rounded-2xl border border-slate-200 bg-white"
                    disabled={isSavingPaper}
                  >
                    {isSaved ? <BookmarkCheck className="h-4 w-4 text-blue-600" /> : <Bookmark className="h-4 w-4 text-slate-600" />}
                  </Button>
                ) : null}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl border border-slate-200 bg-white">
                      <Share2 className="h-4 w-4 text-slate-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void handleCopy(selectedPaper.doi, 'Paper ID')}>Copy DOI / Paper ID</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const citation = `${selectedPaper.authors.join(', ')} (${selectedPaper.year}). ${selectedPaper.title}. ${selectedPaper.journal || ''}`;
                        void handleCopy(citation, 'Citation');
                      }}
                    >
                      Copy citation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!paperUrl}
                      onClick={() => {
                        if (paperUrl) {
                          void handleCopy(paperUrl, 'Paper link');
                        }
                      }}
                    >
                      Copy paper link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-2xl border border-slate-200 bg-white"
                  onClick={() => setSelectedPaper(null)}
                >
                  <X className="h-4 w-4 text-slate-700" />
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-5 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Quote className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Impact</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{selectedPaper.citations.toLocaleString()} citations</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Published</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{selectedPaper.year || 'Unknown'}</p>
                </div>
              </div>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-950">Authors</h3>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{selectedPaper.authors.join(', ') || 'Unknown author'}</p>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-950">Paper ID</h3>
                </div>
                <p className="mt-3 break-all font-mono text-xs text-slate-600">{selectedPaper.doi}</p>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-950">Abstract</h3>
                <p className={`mt-3 text-sm leading-7 text-slate-600 ${!showFullAbstract ? 'line-clamp-5' : ''}`}>
                  {selectedPaper.abstract}
                </p>
                {selectedPaper.abstract.length > 220 ? (
                  <button
                    type="button"
                    onClick={() => setShowFullAbstract(!showFullAbstract)}
                    className="mt-3 text-sm font-medium text-blue-700 transition hover:text-blue-800"
                  >
                    {showFullAbstract ? 'Show less' : 'Show full abstract'}
                  </button>
                ) : null}
              </section>

              {selectedPaper.keywords.length > 0 ? (
                <section className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Tag className="h-4 w-4 text-slate-400" />
                    Keywords
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPaper.keywords.map((keyword) => (
                      <Badge key={keyword} variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              {selectedPaper.summary || selectedPaper.simplifiedAbstract ? (
                <section className="rounded-[24px] border border-blue-200 bg-blue-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-700" />
                    <h3 className="text-sm font-semibold text-blue-950">Paper summary</h3>
                  </div>
                  {selectedPaper.summary ? (
                    <p className="mt-3 text-sm leading-7 text-blue-950">{selectedPaper.summary}</p>
                  ) : null}
                  {selectedPaper.simplifiedAbstract ? (
                    <>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Simplified abstract</p>
                      <p className="mt-2 text-sm leading-7 text-blue-950">{selectedPaper.simplifiedAbstract}</p>
                    </>
                  ) : null}
                </section>
              ) : null}

              <section className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                    disabled={!paperUrl}
                    onClick={() => {
                      if (!openExternalUrl(paperUrl)) {
                        toast.error('This paper link is unavailable or unsafe to open.');
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open source
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                    onClick={() => void generateSummary(selectedPaper.id)}
                    disabled={isSummarizing || !planCapabilities.aiSummary || selectedPaper.abstract.length < 20}
                    title={
                      !planCapabilities.aiSummary
                        ? siteConfig.pricing.enabled !== false
                          ? 'Upgrade to Pro to use AI summaries'
                          : 'AI summaries are unavailable for this workspace'
                        : undefined
                    }
                  >
                    <Sparkles className="h-4 w-4" />
                    {isSummarizing ? 'Generating summary...' : 'Generate summary'}
                  </Button>
                </div>

                {collections.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-11 w-full rounded-2xl border-slate-200 bg-white">
                        Add to collection
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64">
                      {collections.map((collection) => (
                        <DropdownMenuItem
                          key={collection.id}
                          onClick={() => addToCollection(selectedPaper.id, collection.id)}
                          disabled={collection.paperIds.includes(selectedPaper.id)}
                        >
                          <div className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: collection.color }} />
                          {collection.name}
                          {collection.paperIds.includes(selectedPaper.id) ? (
                            <span className="ml-auto text-xs text-slate-500">Added</span>
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </section>

              {relatedPapers.length > 0 ? (
                <section className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Related papers</h3>
                  <div className="mt-3 space-y-2">
                    {relatedPapers.map((paper) => (
                      <button
                        key={paper.id}
                        type="button"
                        className="w-full rounded-[18px] border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                        onClick={() => {
                          setShowFullAbstract(false);
                          setSelectedPaper(paper);
                        }}
                      >
                        <p className="line-clamp-2 text-sm font-medium text-slate-950">{paper.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {paper.authors[0]} • {paper.year || 'Year n/a'}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}

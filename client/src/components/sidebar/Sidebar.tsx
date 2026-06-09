import { useMemo, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  Edit2,
  Filter,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/context/AppContext';
import { categories } from '@/data/mockData';

export function Sidebar() {
  const {
    setSidebarOpen,
    filters,
    setFilters,
    papers,
    collections,
    createCollection,
    renameCollection,
    deleteCollection,
    aiRecommendations,
    addToCollection,
    searchPapers,
    isSearching,
    quota,
    statusMessage,
    errorMessage,
    upsellMessage,
    planCapabilities,
    siteConfig,
    isAuthenticated,
    toggleLoginModal,
    upgradeToPro,
  } = useApp();
  const isPricingEnabled = siteConfig.pricing.enabled !== false;
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = useState(false);
  const [collectionDialogMode, setCollectionDialogMode] = useState<'create' | 'edit'>('create');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [authorSearch, setAuthorSearch] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');
  const currentYear = new Date().getFullYear();
  const colorOptions = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];
  const activeFilterCount =
    filters.authors.length +
    filters.keywords.length +
    filters.categories.length +
    (filters.minCitations > 0 ? 1 : 0);

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const openCreateCollectionDialog = () => {
    setCollectionDialogMode('create');
    setEditingCollectionId(null);
    setNewCollectionName('');
    setNewCollectionDesc('');
    setSelectedColor('#3B82F6');
    setNewCollectionDialogOpen(true);
  };

  const openRenameCollectionDialog = (collectionId: string) => {
    const collection = collections.find((entry) => entry.id === collectionId);

    if (!collection) {
      return;
    }

    setCollectionDialogMode('edit');
    setEditingCollectionId(collection.id);
    setNewCollectionName(collection.name);
    setNewCollectionDesc(collection.description);
    setSelectedColor(collection.color);
    setNewCollectionDialogOpen(true);
  };

  const handleSaveCollection = () => {
    if (!newCollectionName.trim()) {
      return;
    }

    if (collectionDialogMode === 'edit' && editingCollectionId) {
      renameCollection(editingCollectionId, newCollectionName.trim(), newCollectionDesc.trim(), selectedColor);
    } else {
      createCollection(newCollectionName.trim(), newCollectionDesc.trim(), selectedColor);
    }

    setCollectionDialogMode('create');
    setEditingCollectionId(null);
    setNewCollectionName('');
    setNewCollectionDesc('');
    setNewCollectionDialogOpen(false);
  };

  const handleQuickSaveRecommendation = (paperId: string) => {
    if (collections[0]?.id) {
      addToCollection(paperId, collections[0].id);
      return;
    }

    setCollectionDialogMode('create');
    setEditingCollectionId(null);
    setNewCollectionName('Research shortlist');
    setNewCollectionDesc('Papers saved from AI recommendations.');
    setNewCollectionDialogOpen(true);
  };

  const toggleAuthor = (author: string) => {
    const newAuthors = filters.authors.includes(author)
      ? filters.authors.filter((entry) => entry !== author)
      : [...filters.authors, author];

    setFilters({ ...filters, authors: newAuthors });
  };

  const toggleKeyword = (keyword: string) => {
    const newKeywords = filters.keywords.includes(keyword)
      ? filters.keywords.filter((entry) => entry !== keyword)
      : [...filters.keywords, keyword];

    setFilters({ ...filters, keywords: newKeywords });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((entry) => entry !== category)
      : [...filters.categories, category];

    setFilters({ ...filters, categories: newCategories });
  };

  const allAuthors = useMemo(() => Array.from(new Set(papers.flatMap((paper) => paper.authors))).sort(), [papers]);
  const allKeywords = useMemo(() => Array.from(new Set(papers.flatMap((paper) => paper.keywords))).sort(), [papers]);
  const filteredAuthors = allAuthors.filter((author) => author.toLowerCase().includes(authorSearch.toLowerCase())).slice(0, 10);
  const filteredKeywords = allKeywords.filter((keyword) => keyword.toLowerCase().includes(keywordSearch.toLowerCase())).slice(0, 10);

  return (
    <ScrollArea className="h-full w-full bg-transparent">
      <div className="space-y-4 p-3 sm:p-4 lg:pr-4">
        <div className="sticky top-0 z-10 rounded-[22px] border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace Tools</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">Filters, lists, and recommendations</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="h-10 w-10 rounded-2xl border border-slate-200 bg-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <section className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">{planCapabilities.name} research workspace</h2>
              <p className="mt-1 text-sm text-slate-500">{quota?.label || 'Search, review, and save papers from one place.'}</p>
            </div>
            <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">
              {papers.length} papers
            </Badge>
          </div>

          {statusMessage ? <p className="mt-3 text-xs text-emerald-700">{statusMessage}</p> : null}
          {errorMessage ? <p className="mt-3 text-xs text-red-600">{errorMessage}</p> : null}
          {upsellMessage ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
              <p>{upsellMessage}</p>
              {isPricingEnabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 rounded-full px-3 text-amber-900"
                  onClick={() => void (isAuthenticated ? upgradeToPro() : toggleLoginModal())}
                >
                  {isAuthenticated ? 'Upgrade now' : 'Login to upgrade'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <section className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-700">
                  <Filter className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-950">Filters</p>
                  <p className="text-xs text-slate-500">{activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'Refine your search results'}</p>
                </div>
              </div>
              {filtersOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-5 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Year range</label>
                  <span className="text-xs text-slate-500">
                    {filters.yearRange[0]} - {filters.yearRange[1]}
                  </span>
                </div>
                <div className="px-1">
                  <Slider
                    value={filters.yearRange}
                    min={1990}
                    max={currentYear}
                    step={1}
                    onValueChange={(value) => setFilters({ ...filters, yearRange: value as [number, number] })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        filters.categories.includes(category.id)
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                      style={{ backgroundColor: filters.categories.includes(category.id) ? category.color : undefined }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Authors</label>
                <Input
                  placeholder="Search authors"
                  value={authorSearch}
                  onChange={(event) => setAuthorSearch(event.target.value)}
                  className="h-10 rounded-2xl border-slate-200 bg-slate-50"
                />
                <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                  {filteredAuthors.map((author) => (
                    <button
                      key={author}
                      type="button"
                      onClick={() => toggleAuthor(author)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        filters.authors.includes(author)
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {author}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Keywords</label>
                <Input
                  placeholder="Search keywords"
                  value={keywordSearch}
                  onChange={(event) => setKeywordSearch(event.target.value)}
                  className="h-10 rounded-2xl border-slate-200 bg-slate-50"
                />
                <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                  {filteredKeywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => toggleKeyword(keyword)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        filters.keywords.includes(keyword)
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Minimum citations</label>
                  <span className="text-xs text-slate-500">{filters.minCitations.toLocaleString()}</span>
                </div>
                <Slider
                  value={[filters.minCitations]}
                  min={0}
                  max={100000}
                  step={1000}
                  onValueChange={(value) => setFilters({ ...filters, minCitations: value[0] })}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({
                      yearRange: [1990, new Date().getFullYear()],
                      authors: [],
                      keywords: [],
                      categories: [],
                      minCitations: 0,
                    })
                  }
                  className="h-10 rounded-2xl border-slate-200 bg-white"
                >
                  Clear filters
                </Button>
                <Button
                  onClick={() => {
                    closeSidebarOnMobile();
                    void searchPapers();
                  }}
                  disabled={isSearching}
                  className="h-10 rounded-2xl"
                >
                  {isSearching ? 'Applying...' : 'Apply filters'}
                </Button>
              </div>
            </CollapsibleContent>
          </section>
        </Collapsible>

        <Collapsible open={collectionsOpen} onOpenChange={setCollectionsOpen}>
          <section className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex min-w-0 flex-1 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-700">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-950">Collections</p>
                      <p className="text-xs text-slate-500">{collections.length} reading lists</p>
                    </div>
                  </div>
                  {collectionsOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                </button>
              </CollapsibleTrigger>

              <Dialog open={newCollectionDialogOpen} onOpenChange={setNewCollectionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl border border-slate-200 bg-white" onClick={openCreateCollectionDialog}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{collectionDialogMode === 'edit' ? 'Edit collection' : 'Create collection'}</DialogTitle>
                    <DialogDescription>
                      {collectionDialogMode === 'edit'
                        ? 'Update this collection for your current research flow.'
                        : 'Create a collection to organize papers for review.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input placeholder="Collection name" value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Input placeholder="Brief description" value={newCollectionDesc} onChange={(event) => setNewCollectionDesc(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={`h-8 w-8 rounded-full border-2 transition ${selectedColor === color ? 'scale-110 border-slate-900' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewCollectionDialogOpen(false);
                        setCollectionDialogMode('create');
                        setEditingCollectionId(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveCollection} disabled={!newCollectionName.trim()}>
                      {collectionDialogMode === 'edit' ? 'Save changes' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <CollapsibleContent className="space-y-2 pt-4">
              {collections.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Create your first collection to organize review papers.
                </div>
              ) : (
                collections.map((collection) => (
                  <div key={collection.id} className="group flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-1.5 rounded-full" style={{ backgroundColor: collection.color }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-950">{collection.name}</p>
                        <p className="text-xs text-slate-500">{collection.paperIds.length} papers</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-2xl opacity-0 transition group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRenameCollectionDialog(collection.id)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteCollection(collection.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </section>
        </Collapsible>

        <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
          <section className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-950">Recommendations</p>
                  <p className="text-xs text-slate-500">High-impact papers from your current search</p>
                </div>
              </div>
              {aiOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3 pt-4">
              {aiRecommendations.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Recommendations appear after you search real papers.
                </div>
              ) : (
                aiRecommendations.map((recommendation) => (
                  <div key={recommendation.paper.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">{recommendation.paper.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {recommendation.paper.authors[0]} • {recommendation.paper.year || 'Year n/a'}
                        </p>
                      </div>
                      <Badge className="rounded-full border-0 bg-slate-900 text-white">{recommendation.relevanceScore}%</Badge>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-600">{recommendation.reason}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-8 rounded-full border-slate-200 bg-white"
                      onClick={() => handleQuickSaveRecommendation(recommendation.paper.id)}
                    >
                      <Bookmark className="mr-1 h-3.5 w-3.5" />
                      {collections.length > 0 ? 'Save to collection' : 'Create list'}
                    </Button>
                  </div>
                ))
              )}
            </CollapsibleContent>
          </section>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}

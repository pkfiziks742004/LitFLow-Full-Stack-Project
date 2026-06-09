import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowUpRight,
  Bell,
  Crown,
  FileText,
  FolderHeart,
  Hash,
  Loader2,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from 'lucide-react';

import { BrandWordmark } from '@/components/branding/BrandWordmark';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';

type SearchSuggestion = {
  id: string;
  value: string;
  type: 'Collection' | 'Paper' | 'Keyword';
  meta: string;
  score: number;
};

function getSuggestionScore(value: string, query: string, priorityBoost = 0) {
  if (!query) return priorityBoost;

  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return priorityBoost;
  if (normalizedValue === normalizedQuery) return 140 + priorityBoost;
  if (normalizedValue.startsWith(normalizedQuery)) return 120 + priorityBoost;
  if (normalizedValue.split(/\s+/).some((part) => part.startsWith(normalizedQuery))) return 95 + priorityBoost;
  if (normalizedValue.includes(normalizedQuery)) return 72 + priorityBoost;

  return 0;
}

export function Header() {
  const {
    searchQuery,
    setSearchQuery,
    sidebarOpen,
    setSidebarOpen,
    searchPapers,
    isSearching,
    user,
    isAuthenticated,
    toggleLoginModal,
    logout,
    quota,
    planCapabilities,
    siteConfig,
    papers,
    collections,
    openAccountPanel,
    navigateHome,
    navigateToPricing,
    unreadNotificationsCount,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const isPricingEnabled = siteConfig.pricing.enabled !== false;
  const compactQuotaLabel = quota?.remaining == null ? 'Unlimited' : `${quota.remaining} left`;
  const brandGradient = `linear-gradient(135deg, ${siteConfig.branding.primaryColor}, ${siteConfig.branding.secondaryColor})`;

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const seen = new Set<string>();
    const paperMap = new Map<string, (typeof papers)[number]>();
    const candidates: SearchSuggestion[] = [];

    papers.forEach((paper) => {
      paperMap.set(paper.id, paper);
    });

    const pushSuggestion = (suggestion: SearchSuggestion) => {
      const key = `${suggestion.type}:${suggestion.value.toLowerCase()}`;

      if (seen.has(key) || suggestion.score <= 0) return;

      seen.add(key);
      candidates.push(suggestion);
    };

    collections.forEach((collection, index) => {
      pushSuggestion({
        id: `collection-${collection.id}`,
        value: collection.name,
        type: 'Collection',
        meta: `${collection.paperIds.length} papers`,
        score: query ? getSuggestionScore(collection.name, query, 34) : 110 - index,
      });
    });

    Array.from(paperMap.values()).forEach((paper) => {
      pushSuggestion({
        id: `paper-${paper.id}`,
        value: paper.title,
        type: 'Paper',
        meta: `${paper.year || 'Year n/a'} • ${paper.authors[0] || 'Unknown author'}`,
        score: query ? getSuggestionScore(paper.title, query, 22) : 32,
      });
    });

    const keywords = Array.from(new Set(Array.from(paperMap.values()).flatMap((paper) => paper.keywords || [])));

    keywords.forEach((keyword) => {
      pushSuggestion({
        id: `keyword-${keyword.toLowerCase().replace(/\s+/g, '-')}`,
        value: keyword,
        type: 'Keyword',
        meta: 'Topic from current workspace',
        score: query ? getSuggestionScore(keyword, query, 14) : 18,
      });
    });

    return candidates
      .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
      .slice(0, query ? 8 : 6);
  }, [collections, papers, searchQuery]);

  const shouldShowSuggestions = searchFocused && searchQuery.trim().length > 0;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const submitSuggestion = (value: string) => {
    setSearchQuery(value);
    setSearchFocused(false);
    setActiveSuggestionIndex(-1);
    void searchPapers(value);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!shouldShowSuggestions || searchSuggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % searchSuggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? searchSuggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
      event.preventDefault();
      submitSuggestion(searchSuggestions[activeSuggestionIndex].value);
      return;
    }

    if (event.key === 'Escape') {
      setSearchFocused(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    if (type === 'Collection') return <FolderHeart className="h-4 w-4" />;
    if (type === 'Paper') return <FileText className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  return (
    <header className="workspace-header sticky top-0 z-50 border-b border-slate-200/80 bg-white/94 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-3 px-3 py-4 sm:px-5 lg:flex-nowrap lg:gap-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-10 w-10 rounded-2xl border border-slate-200 bg-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <button type="button" onClick={navigateHome} className="flex items-center gap-3 text-left">
            <BrandWordmark
              siteName={siteConfig.siteName}
              branding={siteConfig.branding}
              size="sm"
            />
          </button>
        </div>

        <form
          className="order-3 w-full min-w-0 lg:order-none lg:flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            setSearchFocused(false);
            void searchPapers();
          }}
        >
          <div ref={searchWrapperRef} className="relative">
            <div className="workspace-search relative rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.04)]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search papers, topics, authors, or DOI"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setActiveSuggestionIndex(-1);
                }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
                className="h-12 rounded-[28px] border-0 bg-transparent pl-11 pr-28 text-[15px] shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSearching}
                className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-full px-4 text-white transition hover:opacity-95"
                style={{ backgroundColor: siteConfig.branding.primaryColor }}
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            {shouldShowSuggestions ? (
              <div className="workspace-search-results absolute left-0 right-0 top-[calc(100%+10px)] z-[70] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                {searchSuggestions.length === 0 ? (
                  <div className="px-5 py-5 text-sm text-slate-500">
                    No matching topic found yet. Press Enter to search the workspace.
                  </div>
                ) : (
                  <div className="max-h-[min(24rem,calc(100vh-10rem))] overflow-y-auto py-2 scrollbar-thin">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          submitSuggestion(suggestion.value);
                        }}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left transition ${
                          index === activeSuggestionIndex ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                          {getSuggestionIcon(suggestion.type)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-950">{suggestion.value}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">{suggestion.meta}</span>
                        </span>
                        <span className="grid h-8 w-8 place-items-center rounded-full text-slate-300">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </form>

        <div className="order-2 ml-auto flex w-full items-center justify-between gap-2 lg:order-none lg:w-auto lg:justify-end">
          <div className="hidden items-center gap-2 xl:flex">
            <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50/80 px-3 py-1.5 text-slate-700">
              {quota ? quota.label : `${planCapabilities.name} plan`}
            </Badge>
            {isAuthenticated && isPricingEnabled && user?.plan !== 'PRO' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToPricing}
                className="rounded-full border-slate-200 bg-white px-3.5 hover:bg-slate-50"
              >
                <Crown className="h-4 w-4" />
                Upgrade
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {quota ? (
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-600 xl:hidden">
                  {compactQuotaLabel}
                </Badge>
              ) : null}

            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50">
                      <Bell className="h-5 w-5 text-slate-600" />
                      {unreadNotificationsCount > 0 ? (
                        <Badge className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] text-white">
                          {unreadNotificationsCount}
                        </Badge>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="workspace-menu-content w-80 rounded-3xl border-slate-200 bg-white p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      <span>Notifications</span>
                      {unreadNotificationsCount > 0 ? (
                        <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead} className="h-auto px-2 py-1 text-xs">
                          Mark all read
                        </Button>
                      ) : null}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <div className="py-5 text-center text-sm text-slate-500">No notifications</div>
                    ) : (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          onClick={() => markNotificationAsRead(notification.id)}
                          className={`flex cursor-pointer flex-col items-start gap-1 rounded-2xl p-3 ${
                            !notification.read ? 'bg-slate-50' : ''
                          }`}
                        >
                          <div className="flex w-full items-center gap-2">
                            <span className="text-sm font-medium">{notification.title}</span>
                            {!notification.read ? <span className="ml-auto h-2 w-2 rounded-full bg-blue-500" /> : null}
                          </div>
                          <span className="line-clamp-2 text-xs text-slate-500">{notification.message}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-sm text-white" style={{ backgroundImage: brandGradient }}>
                          {user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm font-medium text-slate-700 lg:block">{user?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="workspace-menu-content w-60 rounded-3xl border-slate-200 bg-white p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{user?.name}</span>
                        <span className="text-xs font-normal text-slate-500">{user?.email}</span>
                        <span className="text-xs font-normal text-blue-600">{planCapabilities.name} plan</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openAccountPanel('profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openAccountPanel('collections')}>
                      <FolderHeart className="mr-2 h-4 w-4" />
                      Collections
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openAccountPanel('settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    {isPricingEnabled ? (
                      <DropdownMenuItem onClick={navigateToPricing}>
                        <Crown className="mr-2 h-4 w-4" />
                        Pricing
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={toggleLoginModal} className="hidden rounded-full border border-slate-200 bg-white px-4 hover:bg-slate-50 sm:flex">
                  Sign In
                </Button>
                <Button onClick={toggleLoginModal} className="rounded-full px-4 text-white hover:opacity-95" style={{ backgroundColor: siteConfig.branding.primaryColor }}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

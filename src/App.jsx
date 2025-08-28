import React, { useEffect, useMemo, useRef, useState } from "react";

const LANGUAGES = [
  { code: "", name: "Any" },
  { code: "eng", name: "English" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "hin", name: "Hindi" },
  { code: "ita", name: "Italian" },
  { code: "jpn", name: "Japanese" },
  { code: "kor", name: "Korean" },
  { code: "rus", name: "Russian" },
  { code: "zho", name: "Chinese" },
];

const pageSize = 20;

function buildSearchURL(params) {
  const {
    title = "",
    author = "",
    subject = "",
    language = "",
    yearFrom = "",
    yearTo = "",
    sort = "relevance",
    page = 1,
  } = params;

  const qs = new URLSearchParams();
  if (title.trim()) qs.set("title", title.trim());
  if (author.trim()) qs.set("author", author.trim());
  if (subject.trim()) qs.set("subject", subject.trim());
  if (language) qs.set("language", language);
  if (yearFrom || yearTo) {
    const from = yearFrom || "*";
    const to = yearTo || "*";
    qs.set("q", `first_publish_year:[${from} TO ${to}]`);
  }
  qs.set("page", String(page));

  switch (sort) {
    case "year_asc":
      qs.set("sort", "first_publish_year asc");
      break;
    case "year_desc":
      qs.set("sort", "first_publish_year desc");
      break;
    case "editions_desc":
      qs.set("sort", "edition_count desc");
      break;
    default:
      break;
  }

  return `https://openlibrary.org/search.json?${qs.toString()}`;
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function Cover({ cover_i, size = "M", alt = "Book cover" }) {
  const src = cover_i
    ? `https://covers.openlibrary.org/b/id/${cover_i}-${size}.jpg`
    : `https://placehold.co/200x300?text=No+Cover`;
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-48 object-cover rounded-lg border"
      loading="lazy"
    />
  );
}

function Badge({ children }) {
  return (
    <span className="inline-block text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border">
      {children}
    </span>
  );
}

function PillButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={
        "px-3 py-1.5 rounded-full border text-sm transition " +
        (active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200")
      }
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-48 bg-slate-200 rounded-lg" />
      <div className="h-4 bg-slate-200 rounded w-2/3" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
      <div className="h-3 bg-slate-200 rounded w-1/3" />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [language, setLanguage] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);

  const [results, setResults] = useState([]);
  const [numFound, setNumFound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const [favorites, setFavorites] = useLocalStorage("bookfinder:favorites", []);

  const abortRef = useRef(null);

  const url = useMemo(
    () =>
      buildSearchURL({
        title,
        author,
        subject,
        language,
        yearFrom,
        yearTo,
        sort,
        page,
      }),
    [title, author, subject, language, yearFrom, yearTo, sort, page]
  );

  useEffect(() => {
    setError("");
    setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    const t = setTimeout(() => {
      fetch(url, { signal: ctl.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error(`Request failed: ${r.status}`);
          return r.json();
        })
        .then((json) => {
          setResults(json.docs || []);
          setNumFound(json.numFound || 0);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message || "Something went wrong");
        })
        .finally(() => setLoading(false));
    }, 400);

    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [url]);

  useEffect(() => {
    setPage(1);
  }, [title, author, subject, language, yearFrom, yearTo, sort]);

  function toggleFavorite(doc) {
    const key = doc.key;
    setFavorites((prev) => {
      const exists = prev.find((d) => d.key === key);
      if (exists) return prev.filter((d) => d.key !== key);
      return [doc, ...prev].slice(0, 100);
    });
  }

  function isFav(doc) {
    return favorites.some((d) => d.key === doc.key);
  }

  const totalPages = Math.max(1, Math.ceil(numFound / pageSize));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alex's Book Finder</h1>
            <p className="text-sm text-slate-600">Search millions of books from Open Library. Save favorites, filter deeply, and discover new reads.</p>
          </div>
          <nav className="flex gap-2">
            <PillButton active={activeTab === "search"} onClick={() => setActiveTab("search")}>
              Search
            </PillButton>
            <PillButton active={activeTab === "favorites"} onClick={() => setActiveTab("favorites")}>
              Favorites ({favorites.length})
            </PillButton>
          </nav>
        </div>
      </header>

      {activeTab === "search" ? (
        <main className="max-w-6xl mx-auto px-4 py-6">
          <section className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g., The Pragmatic Programmer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Author</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g., Martin Fowler"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g., software engineering"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <select
                  className="w-full rounded-xl border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code || "any"} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year From</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g., 1990"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year To</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g., 2025"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Sort by</label>
                <select
                  className="rounded-xl border px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="relevance">Relevance (default)</option>
                  <option value="year_desc">First publish year (new → old)</option>
                  <option value="year_asc">First publish year (old → new)</option>
                  <option value="editions_desc">Edition count (high → low)</option>
                </select>
              </div>

              <div className="text-sm text-slate-600">
                {loading ? (
                  <span>Searching…</span>
                ) : (
                  <span>
                    {new Intl.NumberFormat().format(numFound)} results
                    {numFound > 0 && (
                      <>
                        {" "}• Page {page} of {totalPages}
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6">
            {error && (
              <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-xl">
                {error}
              </div>
            )}

            {!loading && results.length === 0 && !error && (
              <div className="p-6 text-center text-slate-600">
                Try searching by title, author, or subject — results will appear here.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading
                ? Array.from({ length: 9 }).map((_, i) => (
                    <div key={`s-${i}`} className="bg-white border rounded-2xl p-4 shadow-sm">
                      <Skeleton />
                    </div>
                  ))
                : results.map((doc) => (
                    <article key={doc.key} className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col">
                      <Cover cover_i={doc.cover_i} alt={doc.title} />
                      <h3 className="mt-3 text-lg font-semibold leading-tight">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-slate-600">{(doc.author_name || []).join(", ")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {doc.first_publish_year && <Badge>First pub. {doc.first_publish_year}</Badge>}
                        {typeof doc.edition_count === "number" && <Badge>{doc.edition_count} editions</Badge>}
                        {doc.language && <Badge>{Array.isArray(doc.language) ? doc.language.slice(0,3).join(", ") : doc.language}</Badge>}
                      </div>
                      <div className="mt-3 flex gap-2 mt-auto">
                        <button
                          className="flex-1 px-3 py-2 rounded-xl border bg-white hover:bg-slate-50"
                          onClick={() => setSelected(doc)}
                          aria-label={`View details for ${doc.title}`}
                        >
                          Details
                        </button>
                        <button
                          className={
                            "px-3 py-2 rounded-xl border " +
                            (isFav(doc)
                              ? "bg-yellow-400/20 border-yellow-400 text-yellow-900"
                              : "bg-white hover:bg-slate-50")
                          }
                          onClick={() => toggleFavorite(doc)}
                          aria-label={isFav(doc) ? "Remove from favorites" : "Add to favorites"}
                          title={isFav(doc) ? "Remove from favorites" : "Add to favorites"}
                        >
                          {isFav(doc) ? "★ Saved" : "☆ Save"}
                        </button>
                        <a
                          className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 text-center"
                          href={`https://openlibrary.org${doc.key}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open ↗
                        </a>
                      </div>
                    </article>
                  ))}
            </div>

            {numFound > pageSize && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Prev
                </button>
                <span className="text-sm text-slate-600 px-2">Page {page} / {totalPages}</span>
                <button
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="max-w-6xl mx-auto px-4 py-6">
          <section className="bg-white border rounded-2xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Favorites</h2>
              {favorites.length > 0 && (
                <button
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50"
                  onClick={() => setFavorites([])}
                >
                  Clear all
                </button>
              )}
            </div>

            {favorites.length === 0 ? (
              <p className="mt-3 text-slate-600">No favorites yet. Save books from the Search tab to see them here.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {favorites.map((doc) => (
                  <article key={doc.key} className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col">
                    <Cover cover_i={doc.cover_i} alt={doc.title} />
                    <h3 className="mt-3 text-lg font-semibold leading-tight">{doc.title}</h3>
                    <p className="text-sm text-slate-600">{(doc.author_name || []).join(", ")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {doc.first_publish_year && <Badge>First pub. {doc.first_publish_year}</Badge>}
                      {typeof doc.edition_count === "number" && <Badge>{doc.edition_count} editions</Badge>}
                    </div>
                    <div className="mt-3 flex gap-2 mt-auto">
                      <button
                        className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50"
                        onClick={() => setSelected(doc)}
                      >
                        Details
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50"
                        onClick={() => toggleFavorite(doc)}
                      >
                        Remove
                      </button>
                      <a
                        className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 text-center"
                        href={`https://openlibrary.org${doc.key}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-20"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute right-0 top-0 h-full w-full sm:w-[32rem] bg-white shadow-2xl border-l p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold leading-tight pr-6">{selected.title}</h3>
              <button
                className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <Cover cover_i={selected.cover_i} alt={selected.title} />
              </div>
              <div className="col-span-2 space-y-2">
                <p className="text-sm text-slate-700"><span className="font-medium">Authors:</span> {(selected.author_name || []).join(", ") || "—"}</p>
                <p className="text-sm text-slate-700"><span className="font-medium">First publish year:</span> {selected.first_publish_year || "—"}</p>
                <p className="text-sm text-slate-700"><span className="font-medium">Edition count:</span> {typeof selected.edition_count === "number" ? selected.edition_count : "—"}</p>
                <p className="text-sm text-slate-700"><span className="font-medium">Subjects:</span> {(selected.subject || []).slice(0, 12).join(", ") || "—"}</p>
                {selected.isbn && (
                  <p className="text-sm text-slate-700"><span className="font-medium">ISBNs:</span> {selected.isbn.slice(0, 6).join(", ")}{selected.isbn.length > 6 ? "…" : ""}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <a
                    className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 text-center"
                    href={`https://openlibrary.org${selected.key}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Open Library ↗
                  </a>
                  {selected.lending_edition_s && (
                    <a
                      className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 text-center"
                      href={`https://openlibrary.org/books/${selected.lending_edition_s}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Borrow/Read ↗
                    </a>
                  )}
                  <button
                    className={
                      "px-3 py-2 rounded-xl border " +
                      (isFav(selected)
                        ? "bg-yellow-400/20 border-yellow-400 text-yellow-900"
                        : "bg-white hover:bg-slate-50")
                    }
                    onClick={() => toggleFavorite(selected)}
                  >
                    {isFav(selected) ? "★ Saved" : "☆ Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-6xl mx-auto px-4 py-10 text-center text-sm text-slate-500">
        <p>Data © Open Library. This is a demo app for the Book Finder challenge.</p>
      </footer>
    </div>
  );
}

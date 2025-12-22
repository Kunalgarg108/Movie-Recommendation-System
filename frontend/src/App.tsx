import { useState, useEffect, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import "./App.css";
import Card from "./components/Card";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Logo from "./assets/Logo.png";
import { Routes, Route } from "react-router-dom";
import SearchResults from "./components/SearchResults";
const BASE_URL = import.meta.env.VITE_BACKEND_URL;

type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
};

type SectionProps = {
  title: string;
  movies: Movie[];
  onSelectMovie: (id: number) => void;
  loadingMovieId: number | null;
};

function MovieSection({ title, movies, onSelectMovie, loadingMovieId }: SectionProps) {
  return (
    <div className="mb-3">

      <h2 className="mb-2 text-2xl font-semibold pl-1">{title}</h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:flex-nowrap md:gap-1 md:overflow-x-auto">
        {movies.map((movie) => (
          <div
            key={movie.id}
            onClick={() => onSelectMovie(movie.id)}
            className={`relative min-w-[250px] border p-2 cursor-pointer transition
            ${loadingMovieId === movie.id ? "pointer-events-none opacity-70" : "hover:scale-101"}
          `}
          >
            {loadingMovieId === movie.id && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <div className="h-8 w-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <div className="relative">
              <img
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : "/no-poster.png"
                }
                alt={movie.title}
                className="w-full h-[310px] object-cover mb-2"
              />

              <span className="absolute top-2 right-2 bg-black/80 text-white text-sm px-2 py-1 rounded-full">
                ⭐ {movie.vote_average.toFixed(2)}
              </span>
            </div>

            <h1 className="font-medium">
              {movie.title.length > 23
                ? movie.title.slice(0, 23) + "..."
                : movie.title}
            </h1>
          </div>
        ))}
      </div>
    </div>
  );
}


function App() {
  const [query, setQuery] = useState("");
  const [loadingMovieId, setLoadingMovieId] = useState<number | null>(null);

  const [trending, setTrending] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [movieDetails, setMovieDetails] = useState<any>(null);
  const hasFetched = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch(`${BASE_URL}/movies/trending`)
      .then(r => r.json())
      .then(setTrending)
      .catch(() => setTrending([]));

    setTimeout(() => {
      fetch(`${BASE_URL}/movies/popular`)
        .then(r => r.json())
        .then(setPopular)
        .catch(() => setPopular([]));
    }, 800);

    setTimeout(() => {
      fetch(`${BASE_URL}/movies/top-rated`)
        .then(r => r.json())
        .then(setTopRated)
        .catch(() => setTopRated([]));
    }, 400);

  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/search/autocomplete?query=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data: string[] = await res.json();
        setSuggestions(data);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
        }
      }
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const fetchMovieDetails = async (id: number) => {
    if (loadingMovieId === id) return;
    setLoadingMovieId(id);
    try {
      const res = await fetch(`${BASE_URL}/movies/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMovieDetails(data);
    } catch {
      toast.error("Movie details unavailable");
    } finally {
      setLoadingMovieId(null);
    }
  };

  return (
    <div className="font-sans">
      <Toaster position="top-center" />

      <Routes>
        <Route
          path="/"
          element={
            <>
              <div className="flex items-center mb-2 px-2 bg-gray-100 pt-0.5 pb-0.5">
                <div className="flex items-center gap-1 flex-1">
                  <img
                    src={Logo}
                    alt="NextWatch Logo"
                    className="hidden sm:block w-12 h-12 object-contain"
                  />
                  <h1 className="text-2xl font-bold hidden sm:block">
                    NextWatch
                  </h1>
                </div>
                <div className="flex-[2] flex justify-center">
                  <div className="relative w-full max-w-[1100px]">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!query.trim()) return;
                          setSuggestions([]);
                          navigate(`/search?q=${encodeURIComponent(query)}`);
                        }
                      }}
                      placeholder="Recommend a movie like..."
                      className="w-full px-4 py-3 border rounded-full outline-none placeholder-transparent sm:placeholder-gray-400"
                    />

                    {suggestions.length > 0 && (
                      <ul className="absolute top-full left-0 right-0 bg-black/80 text-white rounded-md mt-0.5 z-50 divide-y divide-white/30">
                        {suggestions.map((title, idx) => (
                          <li
                            key={idx}
                            className="px-4 py-2 cursor-pointer hover:bg-white/10"
                            onClick={() => {
                              setQuery(title);
                              setSuggestions([]);
                              navigate(`/search?q=${encodeURIComponent(title)}`);
                            }}
                          >
                            {title}
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 border-l"
                      onClick={() => {
                        if (!query.trim()) return;
                        setSuggestions([]);
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                      }}
                    >
                      <FiSearch className="text-2xl text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="flex-1" />
              </div>
              <div>
                <MovieSection
                  title="Trending Movies"
                  movies={trending}
                  onSelectMovie={fetchMovieDetails}
                  loadingMovieId={loadingMovieId}
                />

                <MovieSection
                  title="Top Rated Movies"
                  movies={topRated}
                  onSelectMovie={fetchMovieDetails}
                  loadingMovieId={loadingMovieId}
                />

                <MovieSection
                  title="Popular Movies"
                  movies={popular}
                  onSelectMovie={fetchMovieDetails}
                  loadingMovieId={loadingMovieId}
                />

                {movieDetails && (
                  <Card
                    movie={movieDetails}
                    onClose={() => setMovieDetails(null)}
                  />
                )}
              </div>
            </>
          }
        />
        <Route path="/search" element={<SearchResults />} />
      </Routes>
    </div>
  );
}
export default App;

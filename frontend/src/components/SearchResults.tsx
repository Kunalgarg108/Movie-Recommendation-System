import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;


type Movie = {
    id: number;
    title: string;
    poster_path?: string | null;
    vote_average?: number;
};

function SkeletonLine() {
    return (
        <div className="h-4 w-full bg-gray-300 rounded animate-pulse" />
    );
}

export default function SearchResults() {
    const [params] = useSearchParams();
    const query = params.get("q");

    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [movieDetails, setMovieDetails] = useState<any>(null);


    useEffect(() => {
        if (!query) return;

        const fetchResults = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `${BASE_URL}/recommend?title=${encodeURIComponent(query)}&k=10`
                );

                if (!res.ok) throw new Error();
                const data = await res.json();
                setMovies(data.recommendations ?? []);
            } catch {
                toast.error("Search failed");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query]);

    const fetchMovieDetails = async (id: number) => {
        try {
            const res = await fetch(`${BASE_URL}/movies/${id}`);
            if (!res.ok) throw new Error();
            setMovieDetails(await res.json());
        } catch {
            toast.error("Movie details unavailable");
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">
                Results for "{query}"
            </h2>

            {loading && (
                <div className="space-y-2 mb-4">
                    <SkeletonLine />
                    <SkeletonLine />
                    <SkeletonLine />
                </div>
            )}

            {!loading && movies.length === 0 && (
                <p className="text-center text-5xl text-gray-400 mt-6">
                    No movies available
                </p>
            )}

            <div className="max-h-[100vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {movies.map((movie) => (
                        <div
                            key={movie.id}
                            onClick={() => fetchMovieDetails(movie.id)}
                            className="relative border p-2 cursor-pointer transition hover:scale-105"
                        >
                            <div className="relative">
                                <img
                                    src={
                                        movie.poster_path
                                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                                            : "/no-poster.png"
                                    }
                                    alt={movie.title}
                                    className="w-full h-[310px] object-cover rounded"
                                />

                                {movie.vote_average !== undefined && movie.vote_average !== 0 && (
                                    <span className="absolute top-2 right-2 bg-black/80 text-white text-sm px-2 py-1 rounded-full">
                                        ⭐ {movie.vote_average.toFixed(2)}
                                    </span>
                                )}
                            </div>

                            <h1 className="mt-2 font-medium text-sm">
                                {movie.title.length > 23
                                    ? movie.title.slice(0, 23) + "..."
                                    : movie.title}
                            </h1>
                        </div>
                    ))}
                </div>
            </div>

            {movieDetails && (
                <Card movie={movieDetails} onClose={() => setMovieDetails(null)} />
            )}
        </div>
    );
}

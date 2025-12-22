import { useEffect, useRef, useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
const BASE_URL = import.meta.env.VITE_BACKEND_URL;
type MovieDetails = {
  id: number;
  title: string;
  overview: string;
  rating: number;
  runtime: number;
  release_date: string;
  genres: string[];
  poster: string | null;
  cast: { name: string }[];
  crew: { name: string; job: string }[];
};

function SkeletonLine() {
  return (
    <div className="h-4 w-full bg-gray-300 rounded animate-pulse" />
  );
}

type Props = {
  movie: MovieDetails;
  onClose: () => void;
};


export default function Card({ movie, onClose }: Props) {
  const [cast, setCast] = useState<any[]>([]);
  const [crew, setCrew] = useState<any[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(true);

  const fetchedRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (fetchedRef.current === movie.id) return;
    
    fetchedRef.current = movie.id;
    setLoadingCredits(true);
    
    const fetchCredits = async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/movies/${movie.id}/credits`
        );
        if (!res.ok) throw new Error();

        const data = await res.json();
        setCast(data.cast ?? []);
        setCrew(data.crew ?? []);
      } catch {
        setCast([]);
        setCrew([]);
      } finally {
        setLoadingCredits(false);
      }
    };

    fetchCredits();
  }, [movie.id]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white w-[1100px] max-w-[98%] h-[750px] rounded-xl relative overflow-hidden flex">

        {/* Close button */}
        <IoCloseSharp
          onClick={onClose}
          className="absolute top-4 right-4 text-3xl cursor-pointer text-black z-10"
        />

        {/* LEFT: IMAGE (50%) */}
        <div className="hidden md:block w-1/2 relative">
          {movie.poster ? (
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              No Image
            </div>
          )}


        </div>

        {/* RIGHT: DETAILS (50%) */}
        <div className="w-full md:w-1/2 p-6 overflow-y-auto">
          <h2 className="text-3xl font-bold mb-2">{movie.title}</h2>

          <p className=" text-gray-600 mb-2">
            <strong>Release Date:</strong>{" "}
            {movie.release_date
              ? new Date(movie.release_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              : "N/A"}
          </p>

          <p className="text-sm text-gray-600 mb-2">
            <strong>Runtime:</strong>{" "}
            {movie.runtime ? `${movie.runtime} minutes` : "N/A"}
          </p>


          <strong>Overview:</strong>
          <p className="mb-2 leading-relaxed text-gray-800">
            {movie.overview}
          </p>
          <div className="mb-2">
            <p className="font-semibold mb-1">Rating</p>

            {/* Stars */}
            <div className="relative inline-block text-gray-300 text-xl leading-none">
              ★★★★★
              <div
                className="absolute top-0 left-0 overflow-hidden text-yellow-400"
                style={{ width: `${(movie.rating / 10) * 100}%` }}
              >
                ★★★★★
              </div>
            </div>

            {/* Numeric rating */}
            <span className="text-sm text-gray-600 mt-1 ml-2">
              {typeof movie.rating === "number" && movie.rating !== 0
                ? `${movie.rating.toFixed(1)} / 10`
                : "N/A"}
            </span>
          </div>



          <h4 className="font-semibold">Genres</h4>
          <p className="text-sm mb-2">
            {Array.isArray(movie.genres) && movie.genres.length > 0
              ? movie.genres
                .map((g) => {
                  // case 1: object { name }
                  if (typeof g === "object" && g !== null && "name" in g) {
                    return g.name;
                  }
                  // case 2: string "Action"
                  if (typeof g === "string") {
                    return g;
                  }
                  return null;
                })
                .filter(Boolean)
                .join(", ")
              : "Not available"}
          </p>


          <h4 className="font-semibold">Cast</h4>
          <div className="text-sm mb-2">
            {loadingCredits ? (
              <div className="mt-1 space-y-1">
                <SkeletonLine />
                <SkeletonLine />
              </div>
            ) : Array.isArray(cast) && cast.length > 0 ? (
              cast
                .map(c =>
                  c?.character
                    ? `${c.name} (${c.character})`
                    : c?.name
                )
                .filter(Boolean)
                .join(", ")
            ) : (
              "Not available"
            )}
          </div>
          <h4 className="font-semibold">Crew</h4>
          <div className="text-sm">
            {loadingCredits ? (
              <div className="mt-1 space-y-1">
                <SkeletonLine />
              </div>
            ) : Array.isArray(crew) && crew.length > 0 ? (
              crew
                .filter(
                  c =>
                    c?.name &&
                    ["Director", "Writer", "Screenplay", "Producer"].includes(c.job)
                )
                .slice(0, 3)
                .map(c => `${c.name} (${c.job})`)
                .join(", ")
            ) : (
              "Not available"
            )}
          </div>


        </div>
      </div>
    </div>
  );

}

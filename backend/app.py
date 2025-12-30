import requests
from fastapi import FastAPI, Query, HTTPException
from recommender import recommend_known_movie, recommend_external_movie
import time
import json
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
from dotenv import load_dotenv
app = FastAPI(title="Movie Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://nextwatch-umber.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
movies_tmdb = pd.read_csv("data/tmdb_combined_with_trending.csv")
movies_tmdb = movies_tmdb.set_index("id")
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0"
}
TIMEOUT = 3
CACHE = {}
CACHE_TTL = 21600  

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"
def fetch_movies(endpoint, params=None):
    if params is None:
        params = {}

    params["api_key"] = TMDB_API_KEY
    response = requests.get(
        f"{BASE_URL}{endpoint}",
        params=params,
        headers=HEADERS,
        timeout=TIMEOUT
    )
    response.raise_for_status()
    return response.json()["results"]

def fetch_movies_cached(endpoint, params=None):
    if params is None:
        params = {}

    cache_key = endpoint
    now = time.time()
    if cache_key in CACHE:
        cached_time, cached_data = CACHE[cache_key]
        if now - cached_time < CACHE_TTL:
            return cached_data
    params["api_key"] = TMDB_API_KEY
    try:
        response = requests.get(
            f"{BASE_URL}{endpoint}",
            params=params,
            headers=HEADERS,
            timeout=10
        )
        response.raise_for_status()
        data = response.json().get("results", [])
        CACHE[cache_key] = (now, data)
        return data

    except Exception:
        if cache_key in CACHE:
            return CACHE[cache_key][1]
        return []

@app.get("/")
def health():
    return {"status": "ok"}

@app.get("/movies/trending")
def trending_movies():
    return fetch_movies_cached("/trending/movie/week")

@app.get("/movies/popular")
def popular_movies():
    return fetch_movies_cached("/movie/popular")

@app.get("/movies/top-rated")
def top_rated_movies():
    return fetch_movies_cached("/movie/top_rated")

@app.get("/search/autocomplete")
def autocomplete_local(query: str = Query(..., min_length=2)):
    q = query.lower()

    matches = movies_tmdb[
        movies_tmdb["title"]
        .astype(str)
        .str.lower()
        .str.startswith(q)
    ]
    return (
        matches
        .sort_values("vote_average", ascending=False)
        .head(7)["title"]
        .tolist()
    )

@app.get("/recommend")
def recommend(title: str, k: int = 10):
    try:
        result = recommend_known_movie(title, k)
        if result is not None:
            return {"source": "local", "recommendations": result}

        result = recommend_external_movie(title, k)
        return {"source": "external", "recommendations": result}

    except Exception as e:
        return {"error": str(e)}

    
@app.get("/movies/{tmdb_id}")
def movie_details(tmdb_id: int):
    IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
    if tmdb_id in movies_tmdb.index:
        row = movies_tmdb.loc[tmdb_id]
        def safe_json(val):
            if pd.isna(val):
                return []
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except Exception:
                    return []
            return val

        return {
            "id": int(tmdb_id),
            "title": row["title"],
            "overview": row["overview"],
            "rating": row["vote_average"],
            "release_date": row["release_date"],
            "runtime": row["runtime"],
            "genres": safe_json(row["genres"]),
            "poster": (
                f"{IMAGE_BASE}{row['poster_path']}"
                if pd.notna(row["poster_path"])
                else None
            ),
            "cast": safe_json(row["cast"])[:6],  
            "crew": safe_json(row["crew"])[:3],
        }

    try:
        res = requests.get(
            f"{BASE_URL}/movie/{tmdb_id}",
            params={"api_key": TMDB_API_KEY},
            headers=HEADERS,
            timeout=TIMEOUT
        )
        res.raise_for_status()
        movie = res.json()

        return {
            "id": movie["id"],
            "title": movie["title"],
            "overview": movie["overview"],
            "rating": movie["vote_average"],
            "release_date": movie["release_date"],
            "runtime": movie["runtime"],
            "genres": [g["name"] for g in movie.get("genres", [])],
            "poster": (
                f"{IMAGE_BASE}{movie['poster_path']}"
                if movie.get("poster_path")
                else None
            ),
            "cast": None,
            "crew": None
        }

    except requests.exceptions.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Movie details unavailable"
        )


@app.get("/movies/{tmdb_id}/credits")
def movie_credits(tmdb_id: int):

    if tmdb_id in movies_tmdb.index:
        row = movies_tmdb.loc[tmdb_id]
        def safe_json(val):
            if pd.isna(val):
                return []
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except Exception:
                    return []
            return val
        
        IMPORTANT_CREW_JOBS = [
            "Director",
            "Writer",
            "Screenplay",
            "Producer",
            "Executive Producer"
        ]

        crew_list = safe_json(row["crew"])
        important_crew = [
            c for c in crew_list
            if c.get("job") in IMPORTANT_CREW_JOBS
        ]

        return {
            "cast": safe_json(row["cast"])[:6],   
            "crew": important_crew[:4],           
            "source": "cache"
        }

    try:
        res = requests.get(
            f"{BASE_URL}/movie/{tmdb_id}/credits",
            params={"api_key": TMDB_API_KEY},
            headers=HEADERS,
            timeout=5
        )
        res.raise_for_status()
        credits = res.json()
        return {
            "cast": [
                {"name": c["name"], "character": c["character"]}
                for c in credits.get("cast", [])[:6]
            ],
            "crew": [
                {"name": c["name"], "job": c["job"]}
                for c in credits.get("crew", [])
                if c["job"] in ["Director", "Producer", "Writer"]
            ],
            "source": "tmdb"
        }
    except requests.exceptions.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Credits unavailable"
        )

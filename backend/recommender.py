import numpy as np
import pandas as pd
import joblib
import re
from sklearn.metrics.pairwise import cosine_similarity
from nltk.stem.porter import PorterStemmer
import requests
import os
import nltk
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")
from dotenv import load_dotenv

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
BASE_URL = "https://api.themoviedb.org/3"

movies_ml = pd.read_csv("data/movies_final.csv")   
movies_tmdb = pd.read_csv("data/tmdb_combined_with_trending.csv")

movies_tmdb["title_lower"] = movies_tmdb["title"].str.lower()
movies_tmdb = movies_tmdb.set_index("title_lower")

vectors = np.load("data/movie_vectors.npz")["vector"]
vectorizer = joblib.load("data/vectorizer.pkl")

title_to_idx = {
    title.lower(): idx
    for idx, title in enumerate(movies_ml["title"])
}

ps = PorterStemmer()

def clean_and_stem(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return " ".join(ps.stem(w) for w in text.split())

def enrich_with_tmdb(movie_indices):
    results = []
    for idx in movie_indices:
        title = movies_ml.iloc[idx]["title"]
        key = title.lower()

        if key in movies_tmdb.index:
            row = movies_tmdb.loc[key]
            results.append({
                "id": int(row["id"]),
                "title": row["title"],
                "poster_path": row.get("poster_path"),
                "vote_average": row.get("vote_average"),
                "release_date": row.get("release_date"),
                "runtime": row.get("runtime"),
                "genres": row.get("genres"),
            })
        else:
            results.append({
                "id": int(movies_ml.iloc[idx]["movie_id"]),
                "title": title,
                "poster_path": None
            })

    return results

def recommend_known_movie(title: str, k: int):
    idx = title_to_idx.get(title.lower())
    if idx is None:
        return None

    sims = cosine_similarity(
        vectors[idx].reshape(1, -1),
        vectors
    )[0]

    similar_idx = np.argsort(sims)[::-1][1:k+1]
    return enrich_with_tmdb(similar_idx)


def recommend_external_movie(title: str, k: int):
    # 1. Fetch movie from TMDB
    movie = fetch_external_movie(title)
    if movie is None:
        return []

    # 2. Build tags (same structure as dataset)
    tags = build_tags_from_tmdb(movie)

    # 3. Clean & stem
    cleaned = clean_and_stem(tags)

    # 4. Vectorize using EXISTING vectorizer
    temp_vector = vectorizer.transform([cleaned])

    # 5. Cosine similarity with dataset vectors
    sims = cosine_similarity(temp_vector, vectors)[0]
    similar_idx = np.argsort(sims)[::-1][:k]
    print("MAX SIM:", sims.max())
    print("TOP 10 SIMS:", sorted(sims, reverse=True)[:10])

    # 6. Enrich dataset movies with TMDB info
    return enrich_with_tmdb(similar_idx)

import time

def fetch_external_movie(title: str, retries=3):
    search_url = f"{BASE_URL}/search/movie"

    for attempt in range(retries):
        try:
            params = {
                "api_key": TMDB_API_KEY,
                "query": title
            }
            res = requests.get(
                search_url,
                params=params,
                timeout=10,
            )
            if res.status_code != 200:
                raise Exception("TMDB search failed")

            data = res.json()
            if not data.get("results"):
                raise Exception("No TMDB results")

            movie_id = data["results"][0]["id"]

            detail_url = f"{BASE_URL}/movie/{movie_id}"
            params = {
                "api_key": TMDB_API_KEY,
                "append_to_response": "credits,keywords"
            }

            detail = requests.get(
                detail_url,
                params=params,
                timeout=10,
            )

            if detail.status_code != 200:
                raise Exception("TMDB detail failed")

            return detail.json()

        except Exception as e:
            print(f"TMDB attempt {attempt+1} failed:", e)
            time.sleep(0.5)   

    return None

def build_tags_from_tmdb(movie: dict) -> str:
    overview = movie.get("overview", "")

    genres = " ".join(
        g["name"] for g in movie.get("genres", [])
    )
    keywords = " ".join(
        k["name"] for k in movie.get("keywords", {}).get("keywords", [])
    )
    cast = " ".join(
        c["name"] for c in movie.get("credits", {}).get("cast", [])[:6]
    )
    IMPORTANT_JOBS = {"Director", "Writer", "Producer", "Screenplay"}
    crew = " ".join(
        c["name"] for c in movie.get("credits", {}).get("crew", [])
        if c["job"] in IMPORTANT_JOBS
    )
    tags = f"{overview} {genres} {keywords} {cast} {crew}"
    return tags

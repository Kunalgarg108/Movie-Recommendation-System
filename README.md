# NextWatch — Movie Recommendation System

NextWatch is a movie recommendation platform that combines Machine Learning, FastAPI, and a modern React UI to deliver personalized movie recommendations.
It supports both dataset-based recommendations and real-time recommendations for movies not present in the dataset using TMDB enrichment.

## 🚀 Key Features

### 🔍 Smart Movie Recommendation

- Recommends movies using content-based filtering
- Uses cosine similarity on vectorized movie tags
- Handles both Known movies (present in dataset) and External movies (fetched from TMDB and vectorized on the fly)

### ⚡ High Performance Backend

- Built with FastAPI
- In-memory caching with TTL
- CSV + TMDB hybrid data strategy to reduce API calls

### 🎨 Frontend & User Experience

- Modern, responsive React UI, fully optimized for mobile and desktop
- Smart search experience with autocomplete suggestions, debounced input handling, and a results page
- Real-time movie discovery featuring Trending, Popular, and Top-Rated movies

## 🏗️ Tech Stack

### Backend

- FastAPI
- Pandas
- NumPy
- Scikit-learn
- NLTK
- Joblib
- Requests

### Frontend

- React (Vite)
- Tailwind CSS
- React Router
- React Hot Toast
- React Icons

### External API

- TMDB (The Movie Database)

## 🧠 Machine Learning Workflow

- 1️⃣ Data Loading & Feature Selection
- 2️⃣ Data Cleaning & Normalization
- 3️⃣ Feature Engineering (Tag Construction)
- 4️⃣ Text Preprocessing using NLTK (Porter Stemming)
- 5️⃣ Vectorization using CountVectorizer
- 6️⃣ Similarity Computation using Cosine Similarity
- 7️⃣ Recommendation Generation by Selecting Top-K Similar Movies

## 📂 Project Structure

``` 
NextWatch/
│
├── backend/
│   ├── app.py               
│   ├── recommender.py          
│   ├── requirements.txt
│   └── data/
│       ├── movies_final.csv
│       ├── tmdb_combined_with_trending.csv
│       ├── movie_vectors.npz
│       └── vectorizer.pkl
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── assets/
│   ├── .env
│   └── vite.config.ts
│
└── README.md

```

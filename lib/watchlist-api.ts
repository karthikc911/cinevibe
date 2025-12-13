/**
 * Watchlist API Client
 * Handles syncing watchlist between local storage and backend database
 */

import { Movie } from "./data";

/**
 * Add movie to watchlist (syncs with backend)
 */
export async function addToWatchlistAPI(movie: Movie): Promise<boolean> {
  try {
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        movieId: movie.id,
        movieTitle: movie.title,
        movieYear: movie.year,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to add to watchlist:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    return false;
  }
}

/**
 * Remove movie from watchlist (syncs with backend)
 */
export async function removeFromWatchlistAPI(movieId: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/watchlist?movieId=${movieId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to remove from watchlist:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return false;
  }
}

/**
 * Fetch watchlist from backend
 */
export async function fetchWatchlistAPI(): Promise<Movie[]> {
  try {
    const response = await fetch("/api/watchlist");

    if (!response.ok) {
      console.error("Failed to fetch watchlist");
      return [];
    }

    const data = await response.json();
    
    // Transform backend format to Movie format
    return (data.watchlist || []).map((item: any) => ({
      id: item.movieId,
      title: item.movieTitle,
      year: item.movieYear || "",
      poster: "", // We don't store poster URLs in backend currently
      imdb: 0,
      rt: 0,
      summary: "",
      category: "",
      lang: "English", // Default
      match: 0,
      ott: "",
      genres: [],
    }));
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return [];
  }
}


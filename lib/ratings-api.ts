/**
 * Ratings API Client
 * Handles syncing movie ratings between local storage and backend database
 */

import { Movie } from "./data";
import { Rating } from "./store";

/**
 * Save movie rating (syncs with backend)
 */
export async function saveRatingAPI(
  movie: Movie,
  rating: Rating
): Promise<boolean> {
  try {
    const response = await fetch("/api/ratings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        movieId: movie.id,
        movieTitle: movie.title,
        movieYear: movie.year,
        rating,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to save rating:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error saving rating:", error);
    return false;
  }
}

/**
 * Delete movie rating (syncs with backend)
 */
export async function deleteRatingAPI(movieId: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/ratings?movieId=${movieId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to delete rating:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting rating:", error);
    return false;
  }
}

/**
 * Fetch all ratings from backend
 */
export async function fetchRatingsAPI(): Promise<any[]> {
  try {
    const response = await fetch("/api/ratings");

    if (!response.ok) {
      console.error("Failed to fetch ratings");
      return [];
    }

    const data = await response.json();
    return data.ratings || [];
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return [];
  }
}


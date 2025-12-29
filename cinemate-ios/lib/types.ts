// Types matching the web app
export interface Movie {
  id: number;
  title: string;
  year: number;
  poster?: string;
  backdrop?: string;
  lang?: string;
  genres?: string[];
  description?: string;
  summary?: string;
  overview?: string;
  rating?: number;
  matchScore?: number;
  matchReason?: string;
  matchPercent?: number;
  
  // IMDB data
  imdb?: number;
  imdbRating?: number;
  imdbVoterCount?: number;
  voteCount?: number;
  userReviewSummary?: string;
  
  // Financial data
  budget?: number;
  boxOffice?: number;
  
  // Type indicator
  type?: 'movie' | 'tvshow';
  mediaType?: 'movie' | 'tv';
}

export interface TvShow {
  id: number;
  name: string;
  title?: string;
  year: number;
  poster?: string;
  backdrop?: string;
  lang?: string;
  genres?: string[];
  description?: string;
  summary?: string;
  overview?: string;
  
  // Match data
  matchScore?: number;
  matchReason?: string;
  matchPercent?: number;
  
  // IMDB data
  imdb?: number;
  imdbRating?: number;
  imdbVoterCount?: number;
  voteCount?: number;
  userReviewSummary?: string;
  
  // Type indicator
  type?: 'movie' | 'tvshow';
  mediaType?: 'movie' | 'tv';
  
  // TV specific
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
}

export interface Rating {
  id: string;
  movieId: number;
  movieTitle: string;
  movieYear: number;
  rating: RatingType;
  createdAt: string;
  movieDetails?: Movie;
}

export interface WatchlistItem {
  id: string;
  movieId: number;
  movieTitle: string;
  movieYear: number;
  addedAt: string;
}

export interface TvShowWatchlistItem {
  id: string;
  tvShowId: number;
  tvShowName: string;
  tvShowYear?: number;
  addedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  languages?: string[];
  genres?: string[];
  isAdmin?: boolean;
  onboardingComplete?: boolean;
}

export type RatingType = 'amazing' | 'good' | 'meh' | 'awful' | 'not-interested' | 'not-seen';

// Friend types
export interface Friend {
  id: string;
  friendshipId: string;
  name: string;
  email: string;
  image?: string;
  friendsSince: string;
}

export interface FriendRequest {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  createdAt: string;
}

export interface FriendMovieRecommendation {
  id: string;
  movieId: number;
  movieTitle: string;
  movieYear?: number;
  message?: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

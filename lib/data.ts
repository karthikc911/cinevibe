export type MatchReason = {
  factor: string;
  score: number;
  description: string;
  icon: "heart" | "star" | "trending" | "calendar" | "globe" | "sparkles";
};

export type Movie = {
  id: number;
  title: string;
  lang: string;
  langs?: string[];
  year?: number;
  match?: number;
  matchPercent?: number;
  matchReasons?: MatchReason[];
  poster: string;
  imdb?: number;
  imdbVoterCount?: number;
  userReviewSummary?: string | null;
  rt?: number | null;
  voteCount?: number;
  summary?: string;
  overview?: string;
  category?: string;
  genres?: string[];
  language?: string;
  languages?: string[];
  budget?: number | null;
  boxOffice?: number | null;
};

export type TvShow = {
  id: number;
  name: string;
  lang: string;
  langs?: string[];
  year?: number;
  match?: number;
  matchPercent?: number;
  matchReasons?: MatchReason[];
  poster: string;
  imdb?: number;
  imdbVoterCount?: number;
  userReviewSummary?: string | null;
  rt?: number | null;
  voteCount?: number;
  summary?: string;
  overview?: string;
  category?: string;
  genres?: string[];
  language?: string;
  languages?: string[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRunTime?: number[];
  status?: string;
};

export const MOVIES: Movie[] = [
  {
    id: 1,
    title: "Inception",
    lang: "English",
    year: 2010,
    match: 96,
    poster: "https://image.tmdb.org/t/p/w780/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg",
    imdb: 8.8,
    rt: 87,
    summary: "A thief enters dreams to plant an idea.",
    category: "Sci-Fi, Thriller",
    genres: ["Sci-Fi", "Thriller"],
  },
  {
    id: 2,
    title: "KGF",
    lang: "Kannada",
    year: 2018,
    match: 91,
    poster: "https://image.tmdb.org/t/p/w780/tVxDe01Zy3kZqaZRNiXFGDICdZk.jpg",
    imdb: 8.2,
    rt: 72,
    summary: "A man's rise in the Kolar Gold Fields.",
    category: "Action, Drama",
    genres: ["Action", "Drama"],
  },
  {
    id: 3,
    title: "Parasite",
    lang: "Korean",
    year: 2019,
    match: 94,
    poster: "https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    imdb: 8.5,
    rt: 99,
    summary: "Two families entangle across class lines.",
    category: "Thriller, Drama",
    genres: ["Thriller", "Drama"],
  },
  {
    id: 4,
    title: "Interstellar",
    lang: "English",
    year: 2014,
    match: 97,
    poster: "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    imdb: 8.7,
    rt: 73,
    summary: "Explorers travel through a wormhole.",
    category: "Sci-Fi, Adventure",
    genres: ["Sci-Fi", "Adventure"],
  },
  {
    id: 5,
    title: "Drishyam",
    lang: "Malayalam",
    year: 2013,
    match: 89,
    poster: "https://image.tmdb.org/t/p/w780/5GbkL9DDRzq3A21nR7Gkv6cR8Qb.jpg",
    imdb: 8.4,
    rt: 84,
    summary: "A father shields his family after a crime.",
    category: "Crime, Thriller",
    genres: ["Crime", "Thriller"],
  },
  {
    id: 6,
    title: "Your Name",
    lang: "Japanese",
    year: 2016,
    match: 93,
    poster: "https://image.tmdb.org/t/p/w780/q719jXXEzOoYaps6babgKnONONX.jpg",
    imdb: 8.4,
    rt: 98,
    summary: "Two teens mysteriously swap bodies.",
    category: "Animation, Romance",
    genres: ["Animation", "Romance"],
  },
  {
    id: 7,
    title: "The Dark Knight",
    lang: "English",
    year: 2008,
    match: 95,
    poster: "https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    imdb: 9.0,
    rt: 94,
    summary: "Batman faces the Joker in Gotham.",
    category: "Action, Crime",
    genres: ["Action", "Crime"],
  },
  {
    id: 8,
    title: "Dangal",
    lang: "Hindi",
    year: 2016,
    match: 90,
    poster: "https://image.tmdb.org/t/p/w780/p2lVAcPuRPSO8AluQ0IS4Y3k4ZC.jpg",
    imdb: 8.3,
    rt: 95,
    summary: "A father trains his daughters to win.",
    category: "Biography, Sports",
    genres: ["Biography", "Sports"],
  },
  {
    id: 9,
    title: "The Matrix",
    lang: "English",
    year: 1999,
    match: 98,
    poster: "https://image.tmdb.org/t/p/w780/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    imdb: 8.7,
    rt: 88,
    summary: "A hacker discovers reality is a simulation.",
    category: "Sci-Fi, Action",
    genres: ["Sci-Fi", "Action"],
  },
  {
    id: 10,
    title: "Spirited Away",
    lang: "Japanese",
    year: 2001,
    match: 92,
    poster: "https://image.tmdb.org/t/p/w780/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    imdb: 8.6,
    rt: 97,
    summary: "A girl navigates a magical spirit world.",
    category: "Animation, Fantasy",
    genres: ["Animation", "Fantasy"],
  },
  {
    id: 11,
    title: "3 Idiots",
    lang: "Hindi",
    year: 2009,
    match: 88,
    poster: "https://image.tmdb.org/t/p/w780/66A9MqXOyVFCssoloscw00tzBk8.jpg",
    imdb: 8.4,
    rt: 100,
    summary: "Friends search for their missing college buddy.",
    category: "Comedy, Drama",
    genres: ["Comedy", "Drama"],
  },
  {
    id: 12,
    title: "Oldboy",
    lang: "Korean",
    year: 2003,
    match: 87,
    poster: "https://image.tmdb.org/t/p/w780/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg",
    imdb: 8.4,
    rt: 82,
    summary: "A man seeks revenge after 15 years imprisoned.",
    category: "Thriller, Mystery",
    genres: ["Thriller", "Mystery"],
  },
  {
    id: 13,
    title: "Baahubali",
    lang: "Telugu",
    year: 2015,
    match: 93,
    poster: "https://image.tmdb.org/t/p/w780/6Q3ZYKB8Xfh8hraJpIznXfF1FMt.jpg",
    imdb: 8.0,
    rt: 86,
    summary: "An epic tale of two brothers fighting for a throne.",
    category: "Action, Drama",
    genres: ["Action", "Drama"],
  },
  {
    id: 14,
    title: "Amélie",
    lang: "French",
    year: 2001,
    match: 85,
    poster: "https://image.tmdb.org/t/p/w780/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg",
    imdb: 8.3,
    rt: 95,
    summary: "A shy waitress brings joy to Paris.",
    category: "Romance, Comedy",
    genres: ["Romance", "Comedy"],
  },
  {
    id: 15,
    title: "City of God",
    lang: "Portuguese",
    year: 2002,
    match: 86,
    poster: "https://image.tmdb.org/t/p/w780/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg",
    imdb: 8.6,
    rt: 90,
    summary: "Gang violence in Rio's slums.",
    category: "Crime, Drama",
    genres: ["Crime", "Drama"],
  },
  {
    id: 16,
    title: "Dilwale Dulhania Le Jayenge",
    lang: "Hindi",
    year: 1995,
    match: 84,
    poster: "https://image.tmdb.org/t/p/w780/2CAL2433ZeIihfX1Hb2139CX0pW.jpg",
    imdb: 8.1,
    rt: 89,
    summary: "A romantic journey across Europe and India.",
    category: "Romance, Drama",
    genres: ["Romance", "Drama"],
  },
  {
    id: 17,
    title: "Pather Panchali",
    lang: "Bengali",
    year: 1955,
    match: 82,
    poster: "https://image.tmdb.org/t/p/w780/35x4BHCy5wSg2vYJBCUKFRqvLQS.jpg",
    imdb: 8.3,
    rt: 100,
    summary: "A poor family struggles in rural Bengal.",
    category: "Drama",
    genres: ["Drama"],
  },
  {
    id: 18,
    title: "Ratatouille",
    lang: "English",
    year: 2007,
    match: 89,
    poster: "https://image.tmdb.org/t/p/w780/npHNjldbeTHdKKw28bJKs7lzqzj.jpg",
    imdb: 8.1,
    rt: 96,
    summary: "A rat dreams of becoming a chef in Paris.",
    category: "Animation, Comedy",
    genres: ["Animation", "Comedy"],
  },
  {
    id: 19,
    title: "Memories of Murder",
    lang: "Korean",
    year: 2003,
    match: 90,
    poster: "https://image.tmdb.org/t/p/w780/7k5JDbL5peFu1sQZBdYfW2FPf0r.jpg",
    imdb: 8.1,
    rt: 98,
    summary: "Detectives hunt a serial killer in 1980s Korea.",
    category: "Crime, Drama",
    genres: ["Crime", "Drama"],
  },
  {
    id: 20,
    title: "Taare Zameen Par",
    lang: "Hindi",
    year: 2007,
    match: 87,
    poster: "https://image.tmdb.org/t/p/w780/lVq0K65gnZQw5NQQs7kHgFBnfNH.jpg",
    imdb: 8.4,
    rt: 89,
    summary: "A teacher helps a dyslexic child discover his talent.",
    category: "Drama, Family",
    genres: ["Drama", "Family"],
  },
];

export const LANGS = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Korean",
  "Japanese",
  "French",
  "Spanish",
  "Chinese",
  "Italian",
  "Bengali",
  "Portuguese",
];

export const OTT_ICONS = [
  {
    name: "Netflix",
    src: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
  },
  {
    name: "YouTube",
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg",
  },
  {
    name: "Zee5",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/20/Zee5-official-logo.svg",
  },
  {
    name: "SunNXT",
    src: "https://upload.wikimedia.org/wikipedia/en/d/dc/Sun_NXT_Logo.png",
  },
  {
    name: "Prime Video",
    src: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png",
  },
];


export interface MoonstersListResponse {
    results: { name: string; url: string }[];
  }
  
  export interface MoonstersDetails {
    id: number;
    name: string;
    image: string;
    description: string;
    types?: string[];
    abilities?: string[];
    stats?: { name: string; value: number }[];
    height?: number;
    weight?: number;
    base_experience?: number;
    evolutionChain?: { name: string; image?: string }[];
    strengths?: string[];
    weaknesses?: string[];
    resistant?: string[];
    vulnerable?: string[];
    location_area_encounters: string;
    location: string; // Optional, as getPokemonByIds may not always provide
    chance: number;  // Optional, as getPokemonByIds may not always provide
}
  
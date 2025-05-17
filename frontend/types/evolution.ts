export interface Evolution {
    name: string;
    image?: string;
    id: number;
  }

  export interface EvolutionDetails {
  chain: {
    name: string;
    image: string;
    id: number;
  }[];
  conditions: {
    from: string;
    to: string;
    trigger: string;
    details: string;
  }[];
}
  
//   export interface EvolutionDetails {
//     chain: Evolution[];
//     conditions: string[]; // Placeholder; add specific condition types if needed
//   }
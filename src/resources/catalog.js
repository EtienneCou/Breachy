/**
 * Catalogue des morceaux pour Breachy
 * Relie chaque morceau aux véritables fichiers de ressources du projet :
 * - src/resources/data/ (fichiers partitions .txt)
 * - src/resources/audio/ (fichiers MIDI .mid et audio)
 * - src/data/ (catalogue de musique de l'équipe)
 */
import { musicCatalog } from "../data/musicData";
import bicycleUrl from "./audio/abicycle.mid?url";

export const songsCatalog = [
  {
    id: "abicycle",
    title: "abicycle",
    artist: "Harry Dacre (Daisy Bell)",
    level: "Classique",
    duration: "2:04",
    image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=300&q=80",
    musicItem: {
      id: "abicycle",
      label: "abicycle",
      type: "midi",
      url: bicycleUrl,
    },
    file: "abicycle.mid",
  },
  {
    id: "mario",
    title: "Super Mario Bros",
    artist: "Koji Kondo (Nintendo)",
    level: "Débutant",
    duration: "0:25",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80",
    musicItem: musicCatalog.find((m) => m.id === "mario"),
    file: "mario.txt",
  },
  {
    id: "pirate",
    title: "Pirates des Caraïbes",
    artist: "Hans Zimmer & Klaus Badelt",
    level: "Intermédiaire",
    duration: "1:45",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80",
    musicItem: musicCatalog.find((m) => m.id === "pirate"),
    file: "pirate.txt",
  },
  {
    id: "take-on-me",
    title: "Take on Me",
    artist: "A-ha",
    level: "Intermédiaire",
    duration: "3:45",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80",
    musicItem: musicCatalog.find((m) => m.id === "take-on-me"),
    file: "Aha__Take_on_me.mid",
  },
  {
    id: "bohemian-rhapsody",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    level: "Classique",
    duration: "5:55",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80",
    musicItem: musicCatalog.find((m) => m.id === "bohemian-rhapsody"),
    file: "Queen_Bohemian_Rhapsody.mid",
  },
  {
    id: "show-must-go-on",
    title: "The Show Must Go On",
    artist: "Queen",
    level: "Intermédiaire",
    duration: "4:30",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=300&q=80",
    musicItem: musicCatalog.find((m) => m.id === "show-must-go-on"),
    file: "show_must_go_on_Queen.mid",
  },
  {
    id: "fur-elise",
    title: "Für Elise",
    artist: "L. van Beethoven",
    level: "Classique",
    duration: "3:02",
    image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=300&q=80",
    audio: "https://upload.wikimedia.org/wikipedia/commons/1/18/Fur_Elise.ogg",
  },
  {
    id: "clair-de-lune",
    title: "Clair de lune",
    artist: "C. Debussy",
    level: "Classique",
    duration: "5:12",
    image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=300&q=80",
    audio: "https://upload.wikimedia.org/wikipedia/commons/2/21/Debussy_-_Clair_de_lune.ogg",
  },
];

export default songsCatalog;

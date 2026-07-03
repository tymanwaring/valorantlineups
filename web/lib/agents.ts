export type AgentInfo = {
  slug: string;
  name: string;
  role: "Duelist" | "Initiator" | "Controller" | "Sentinel";
  abilities: string[];
};

// Agents whose kits are commonly used for lineups (projectiles / AoE).
export const AGENTS: AgentInfo[] = [
  {
    slug: "sova",
    name: "Sova",
    role: "Initiator",
    abilities: ["Recon Bolt", "Shock Bolt", "Owl Drone", "Hunter's Fury"],
  },
  {
    slug: "viper",
    name: "Viper",
    role: "Controller",
    abilities: ["Snake Bite", "Poison Cloud", "Toxic Screen", "Viper's Pit"],
  },
  {
    slug: "brimstone",
    name: "Brimstone",
    role: "Controller",
    abilities: ["Incendiary", "Sky Smoke", "Stim Beacon", "Orbital Strike"],
  },
  {
    slug: "kayo",
    name: "KAY/O",
    role: "Initiator",
    abilities: ["FRAG/ment", "FLASH/drive", "ZERO/point", "NULL/cmd"],
  },
  {
    slug: "fade",
    name: "Fade",
    role: "Initiator",
    abilities: ["Prowler", "Seize", "Haunt", "Nightfall"],
  },
  {
    slug: "gekko",
    name: "Gekko",
    role: "Initiator",
    abilities: ["Mosh Pit", "Wingman", "Dizzy", "Thrash"],
  },
  {
    slug: "killjoy",
    name: "Killjoy",
    role: "Sentinel",
    abilities: ["Nanoswarm", "Alarmbot", "Turret", "Lockdown"],
  },
  {
    slug: "raze",
    name: "Raze",
    role: "Duelist",
    abilities: ["Blast Pack", "Paint Shells", "Boom Bot", "Showstopper"],
  },
  {
    slug: "skye",
    name: "Skye",
    role: "Initiator",
    abilities: ["Trailblazer", "Guiding Light", "Regrowth", "Seekers"],
  },
  {
    slug: "harbor",
    name: "Harbor",
    role: "Controller",
    abilities: ["Cascade", "Cove", "High Tide", "Reckoning"],
  },
  {
    slug: "astra",
    name: "Astra",
    role: "Controller",
    abilities: ["Gravity Well", "Nova Pulse", "Nebula", "Cosmic Divide"],
  },
];

export function getAgent(slug: string): AgentInfo | undefined {
  return AGENTS.find((a) => a.slug === slug.toLowerCase());
}

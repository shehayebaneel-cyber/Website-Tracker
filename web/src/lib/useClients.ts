import { useEffect, useState } from "react";
import { api } from "./api";
import type { Client, Paged } from "./types";

// Lightweight client list for pickers in forms. Fetched fresh each mount so a
// newly-created client shows up immediately.
export function useClientOptions() {
  const [clients, setClients] = useState<Client[]>([]);
  useEffect(() => {
    api.get<Paged<Client>>("/clients?pageSize=200&sort=businessName").then((r) => setClients(r.items)).catch(() => {});
  }, []);
  return clients;
}

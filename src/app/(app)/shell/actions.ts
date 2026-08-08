"use server";

import { searchDirectory } from "@/lib/topbar";

export async function searchTopbar(query: string) {
  return searchDirectory(query);
}

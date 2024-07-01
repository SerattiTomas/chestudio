import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000/api/blog";

export async function getEntryBySlug(slug) {
  const response = await fetch(`${BASE_URL}/${slug}`);
  if (response.ok) {
    return await response.json();
  }
  return null;
}

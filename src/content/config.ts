// 1. Import utilities from `astro:content`
import { z, defineCollection } from "astro:content";

// 2. Define your collection(s)
const blogCollection = defineCollection({
  schema: z.object({
    ocultar: z.boolean(),
    titulo: z.string(),
    subtitulo: z.string(),
    imagen: z.object({
      url: z.string(),
      texto_alternativo: z.string(),
    }),
    fecha: z.string().transform((str) => new Date(str)),
    autor: z.string().default("Chestudio"),
    categoria: z.string(),
    tags: z.array(z.string()),
  }),
});

// 3. Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
  blog: blogCollection,
};

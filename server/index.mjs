import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware para analizar los datos del formulario
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Crear la carpeta de blog si no existe
const blogDir = path.join(__dirname, "../src/content/blog");
const compiledDir = path.join(__dirname, "../blog");
if (!fs.existsSync(blogDir)) {
  fs.mkdirSync(blogDir);
}
if (!fs.existsSync(compiledDir)) {
  fs.mkdirSync(compiledDir);
}

// Ruta para añadir una nueva entrada de blog
app.post("/add-post", (req, res) => {
  const {
    title,
    subtitle,
    imageUrl,
    altText,
    date,
    category,
    author,
    tags,
    content,
  } = req.body;

  if (
    !title ||
    !subtitle ||
    !imageUrl ||
    !altText ||
    !date ||
    !category ||
    !author ||
    !tags ||
    !content
  ) {
    return res.status(400).send("Todos los campos son requeridos.");
  }

  const slug = title.toLowerCase().replace(/ /g, "-");
  const filePath = path.join(blogDir, `${slug}.md`);
  const compiledPath = path.join(compiledDir, `${slug}.html`);

  const fileContent = `---
ocultar: false
title: "${title}"
subtitle: "${subtitle}"
image:
  {
    url: "${imageUrl}",
    altText: "${altText}",
  }
date: "${date}"
category: "${category}"
author: "${author}"
tags: [${tags
    .split(",")
    .map((tag) => tag.trim())
    .join(", ")}]
---

${content}
`;

  fs.writeFile(filePath, fileContent, (err) => {
    if (err) {
      return res.status(500).send("Error al guardar el archivo.");
    }

    // Convertir Markdown a HTML usando marked
    const htmlContent = marked(fileContent);

    // Guardar el HTML compilado
    fs.writeFile(compiledPath, htmlContent, (err) => {
      if (err) {
        return res.status(500).send("Error al guardar el archivo compilado.");
      }
      res.status(200).send("Entrada de blog añadida y compilada con éxito.");
    });
  });
});

// Servir los archivos estáticos de Astro.js
app.use(express.static(path.join(__dirname, "../dist")));

// Ruta para obtener todas las entradas del blog
// Ruta para obtener todas las entradas del blog
app.get("/posts", (req, res) => {
  fs.readdir(blogDir, (err, files) => {
    if (err) {
      return res.status(500).send("Error al leer el directorio de entradas.");
    }
    const posts = files.map((file) => {
      const content = fs.readFileSync(path.join(blogDir, file), "utf-8");
      const lines = content.split("\n");
      const post = {};
      lines.forEach((line) => {
        if (line.startsWith("title:"))
          post.title = line.replace("title: ", "").replace(/"/g, "");
        if (line.startsWith("subtitle:"))
          post.subtitle = line.replace("subtitle: ", "").replace(/"/g, "");
        if (line.startsWith("image:"))
          post.image = JSON.parse(line.replace("image: ", ""));
        if (line.startsWith("date:"))
          post.date = line.replace("date: ", "").replace(/"/g, "");
        if (line.startsWith("category:"))
          post.category = line.replace("category: ", "").replace(/"/g, "");
        if (line.startsWith("author:"))
          post.author = line.replace("author: ", "").replace(/"/g, "");
        if (line.startsWith("tags:"))
          post.tags = line
            .replace("tags: ", "")
            .replace(/[\[\]]/g, "")
            .split(",")
            .map((tag) => tag.trim());
      });
      post.content = lines
        .slice(lines.findIndex((line) => line === "") + 1)
        .join("\n");
      post.slug = file.replace(".md", "");
      return post;
    });
    res.json(posts);
  });
});

// Ruta para obtener el contenido de una entrada específica
app.get("/posts/:slug", (req, res) => {
  const slug = req.params.slug;
  const filePath = path.join(blogDir, `${slug}.md`);

  fs.readFile(filePath, "utf-8", (err, content) => {
    if (err) {
      return res.status(404).send("Post no encontrado.");
    }
    const [metadata, ...contentLines] = content.split("\n---\n");
    const lines = metadata.split("\n");
    const post = {};
    lines.forEach((line) => {
      if (line.startsWith("title:"))
        post.title = line.replace("title: ", "").replace(/"/g, "");
      if (line.startsWith("subtitle:"))
        post.subtitle = line.replace("subtitle: ", "").replace(/"/g, "");
      if (line.startsWith("image:")) {
        const imageUrl = line.match(/url: "(.*?)"/)[1];
        const altText = line.match(/altText: "(.*?)"/)[1];
        post.image = { url: imageUrl, altText: altText };
      }
      if (line.startsWith("date:"))
        post.date = line.replace("date: ", "").replace(/"/g, "");
      if (line.startsWith("category:"))
        post.category = line.replace("category: ", "").replace(/"/g, "");
      if (line.startsWith("author:"))
        post.author = line.replace("author: ", "").replace(/"/g, "");
      if (line.startsWith("tags:"))
        post.tags = line
          .replace("tags: ", "")
          .replace(/[\[\]]/g, "")
          .split(",")
          .map((tag) => tag.trim());
    });
    post.content = contentLines.join("\n");
    res.json(post);
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

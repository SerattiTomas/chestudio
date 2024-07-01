import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";
import cors from "cors";
import mysql from "mysql2";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const SECRET_KEY = "gnasildxc"; // Cambia esto por una clave secreta segura

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// Servir los archivos estáticos de Astro.js
app.use(express.static(path.join(__dirname, "../dist")));

// Configurar conexión a MySQL
const db = mysql.createConnection({
  host: "bh8966.banahosting.com",
  user: "vlyldxch_user",
  password: "q31fn42err9h",
  database: "vlyldxch_chestudio",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL");
});

// Rutas de autenticación
app.post("/api/register", (req, res) => {
  const hashedPassword = bcrypt.hashSync("admin", 10);

  res.status(201).json({ message: "pass: " + hashedPassword });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);

  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ message: "Error de base de datos" });
    if (results.length === 0) return res.status(401).json({ message: "Credenciales invalidas" });

    const user = results[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) return res.status(401).json({ message: "Credenciales invalidas 2" });

    console.log("Login con exito!");

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1d" });
    res.json({ token });
  });
});

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

app.get("/api/entries", authenticate, (req, res) => {
  res.json(entries);
});

app.post("/api/entries", authenticate, (req, res) => {
  const newEntry = { id: Date.now(), ...req.body };
  entries.push(newEntry);
  res.json(newEntry);
});

app.put("/api/entries/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const index = entries.findIndex((entry) => entry.id == id);
  if (index !== -1) {
    entries[index] = { ...entries[index], ...req.body };
    res.json(entries[index]);
  } else {
    res.status(404).json({ message: "Entry not found" });
  }
});

app.delete("/api/entries/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const index = entries.findIndex((entry) => entry.id == id);
  if (index !== -1) {
    entries.splice(index, 1);
    res.json({ message: "Entry deleted" });
  } else {
    res.status(404).json({ message: "Entry not found" });
  }
});

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

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Blog.css";
import placeholderImage from "../assets/images/placeholder.png";
import LoadingSpinner from "./LoadingSpinner";
import mockArticles from "../data/articles.json";

// Componente que muestra la lista de artículos del blog
// Sistema de filtrado por categorías que permite a las usuarias
// encontrar contenido sobre temas específicos.
//--
// El manejo de imágenes me dio algunos problemas, especialmente
// con las rutas relativas y absolutas. Por eso implementé un manejador de errores
// que muestra una imagen por defecto si la original no se puede cargar.
//--
// Para la parte de formateo de fechas al principio usé
// una librería externa, pero al final opté por las funciones nativas de JavaScript
// para reducir dependencias

function Blog() {
  const [articles, setArticles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar artículos desde datos mock
  useEffect(() => {
    try {
      setLoading(true);

      const getImageUrl = (imagePath) => {
        if (!imagePath) return placeholderImage;

        // Si ya es una URL completa
        if (imagePath.startsWith("http")) return imagePath;

        // Si es solo el nombre del archivo (sin carpetas)
        if (!imagePath.includes("/")) {
          return `/mommatch_demo/images/blog/${imagePath}`;
        }

        // Si es una ruta relativa que empieza con /images
        if (imagePath.startsWith("/images")) {
          return `/mommatch_demo${imagePath}`;
        }

        // Si es una ruta que empieza con images/
        if (imagePath.startsWith("images/")) {
          return `/mommatch_demo/${imagePath}`;
        }

        // Caso por defecto
        return `/mommatch_demo/images/blog/${imagePath}`;
      };

      setArticles(
        mockArticles.map((article) => ({
          ...article,
          image: getImageUrl(article.image),
          date: article.date || new Date().toISOString().split("T")[0],
        })),
      );
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar artículos por categoría
  const filteredArticles =
    selectedCategory === "Todas"
      ? articles
      : articles.filter((article) => article.category === selectedCategory);

  // Categorías disponibles
  const categories = [
    "Todas",
    "Maternidad",
    "Salud",
    "Comunidad",
    "Educación",
    "Estilo de vida",
    "Nutrición",
    "Bienestar emocional",
    "Actividades y juegos",
    "Moda y belleza",
    "Psicologia",
  ];

  // Manejar fallo de imágenes
  const handleImageError = (e) => {
    e.target.src = placeholderImage;
    e.target.onerror = null;
    e.target.style.objectFit = "contain";
  };

  if (loading) {
    return <LoadingSpinner text="Cargando artículos..." />;
  }

  if (error) {
    return (
      <div className="blog-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="blog-container">
      <h1 className="blog-title">Blog de MomMatch</h1>
      <p className="blog-subtitle">Tu guía en la maternidad</p>

      {/* Filtros por categoría */}
      <div className="category-filters">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? "active" : ""}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Lista de artículos */}
      <div className="article-list">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article) => (
            <div key={article.id} className="article-card">
              <div className="image-container-blog">
                <img
                  src={article.image}
                  alt={article.imageAlt}
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
              <div className="article-content">
                <span className="article-category">{article.category}</span>
                <div className="article-text-content">
                  <h2>{article.title}</h2>
                  <p className="article-excerpt">{article.excerpt}</p>
                  <div className="article-footer">
                    <time className="article-date" dateTime={article.date}>
                      {new Date(article.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                    <Link to={`/blog/${article.id}`} className="read-more">
                      Leer más
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="no-articles">
            No hay artículos disponibles en esta categoría.
          </p>
        )}
      </div>
    </div>
  );
}

export default Blog;

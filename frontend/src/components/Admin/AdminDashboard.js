import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

// Panel de admin de MomMatch
// Incluye secciones para gestionar usuarios, mensajes de ayuda, reportes del foro,
// temas del foro y artículos del blog. Lo hice bastante completo para que se pueda
// administrar casi todo desde aquí sin tener que tocar la base de datos directamente
//
// Todavía tengo pendiente añadir una sección para gestionar eventos, pero
// con lo que hay ya se puede administrar lo más importante

const BACKEND_URL = "http://localhost/mommatch/backend";

const AdminDashboard = () => {
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [helpMessages, setHelpMessages] = useState([]);
  const [forumReports, setForumReports] = useState([]);
  const [forumTopics, setForumTopics] = useState([]);
  const [blogArticles, setBlogArticles] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    image: "",
    excerpt: "",
    date: "",
  });
  const [editingArticle, setEditingArticle] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [editTopicData, setEditTopicData] = useState({
    id: null,
    title: "",
    description: "",
  }); // Form data for editing
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success", // success, error, warning, info
  });
  const [imagePreview, setImagePreview] = useState(null);
  const navigate = useNavigate();

  // Opciones de categorías predefinidas para el blog
  const blogCategories = [
    "Maternidad",
    "Crianza",
    "Educación",
    "Salud",
    "Actividades y juegos",
    "Consejos",
    "Experiencias",
    "Alimentación",
    "Desarrollo infantil",
  ];

  // Verificar si el administrador está logueado
  useEffect(() => {
    const isAdminLoggedIn =
      sessionStorage.getItem("isAdminLoggedIn") === "true";
    if (!isAdminLoggedIn) {
      navigate("/admin/login");
    }
  }, [navigate]);

  // Mostrar notificaciones personalizadas
  const showNotification = (message, type = "success") => {
    setNotification({
      show: true,
      message,
      type,
    });

    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // Cargar estadísticas
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/admin_statistics.php`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();
        if (data.success) {
          setStatistics(data.statistics);
        } else {
          setError(data.error || "Error al cargar estadísticas.");
        }
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        setError("Error de conexión. Inténtalo de nuevo más tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
    // Dependencia para actualizar cuando cambie el número de mensajes o reportes
  }, [forumReports, helpMessages, activeSection]);

  // Cargar usuarios
  useEffect(() => {
    if (activeSection === "users") {
      const fetchUsers = async () => {
        try {
          setLoading(true);
          const response = await fetch(
            `${BACKEND_URL}/admin_get_users.php?page=${currentPage}&limit=10&search=${searchTerm}`,
            {
              method: "GET",
              credentials: "include", // Asegúrate de incluir las credenciales
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data.success) {
            setUsers(data.users);
            setTotalPages(data.pagination.pages);
          } else {
            throw new Error(data.error || "Error al obtener usuarios");
          }
        } catch (error) {
          console.error("Error fetching users:", error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchUsers();
    }
  }, [activeSection, currentPage, searchTerm]);

  // Cargar mensajes de ayuda
  useEffect(() => {
    if (activeSection === "help-messages") {
      const fetchHelpMessages = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/ayuda_api.php`, {
            method: "GET",
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data.success) {
            setHelpMessages(data.mensajes || []);
          } else {
            throw new Error(
              data.message || "Error al obtener los mensajes de ayuda"
            );
          }
        } catch (error) {
          console.error("Error fetching help messages:", error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchHelpMessages();
    }
  }, [activeSection]);

  // Eliminar un mensaje de ayuda
  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/delete_help_message.php?id=${messageId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        showNotification("Mensaje eliminado correctamente");
        setHelpMessages((prevMessages) =>
          prevMessages.filter((message) => message.id !== messageId)
        );
      } else {
        showNotification(data.error || "Error al eliminar el mensaje", "error");
      }
    } catch (error) {
      console.error("Error eliminando mensaje:", error);
      showNotification(
        "Error de conexión. Inténtalo de nuevo más tarde.",
        "error"
      );
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/mark_messages_read_admin.php?id=${messageId}`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        showNotification("Mensaje marcado como leído");
        setHelpMessages((prevMessages) =>
          prevMessages.map((message) =>
            message.id === messageId ? { ...message, estado: "leido" } : message
          )
        );
      } else if (
        data.message &&
        data.message.includes("No se encontró el mensaje o ya estaba leído")
      ) {
        showNotification("Este mensaje ya estaba marcado como leído.", "info");
        setHelpMessages((prevMessages) =>
          prevMessages.map((message) =>
            message.id === messageId ? { ...message, estado: "leido" } : message
          )
        );
      } else {
        showNotification(
          data.error || data.message || "Error al marcar el mensaje como leído",
          "error"
        );
      }
    } catch (error) {
      console.error("Error marcando mensaje como leído:", error);
      showNotification(
        "Error de conexión. Inténtalo de nuevo más tarde.",
        "error"
      );
    }
  };

  const handleReplyMessage = async (messageId, email, reply) => {
    if (!reply) {
      showNotification("Por favor, escribe una respuesta.", "warning");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/reply_help_message.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ messageId, email, reply }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification("Respuesta enviada correctamente.");
        setHelpMessages((prevMessages) =>
          prevMessages.map((message) =>
            message.id === messageId
              ? { ...message, estado: "respondido" }
              : message
          )
        );
      } else {
        showNotification(
          data.error || "Error al enviar la respuesta.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error enviando respuesta:", error);
      showNotification(
        "Error de conexión. Inténtalo de nuevo más tarde.",
        "error"
      );
    }
  };

  // Renderizar mensajes de ayuda
  const renderHelpMessages = () => {
    if (!helpMessages || helpMessages.length === 0) {
      return (
        <p className="admin-no-data">No hay mensajes de ayuda pendientes.</p>
      );
    }

    return helpMessages.map((message) => (
      <div
        key={message.id}
        className={`help-message ${message.estado === "leido" ? "leido" : ""}`}
      >
        <h4>
          {message.nombre}
          {message.estado === "leido" && (
            <span className="help-message-status-badge">Leído</span>
          )}
        </h4>
        <p>{message.mensaje}</p>
        <small>Enviado el {formatDate(message.fecha_creacion)}</small>

        <div className="help-message-buttons">
          <button onClick={() => handleDeleteMessage(message.id)}>
            <i className="fas fa-trash"></i> Eliminar
          </button>
          <button
            className="help-message-mark-read-button"
            onClick={() => handleMarkAsRead(message.id)}
          >
            <i className="fas fa-check"></i> Marcar como leído
          </button>
        </div>

        <div className="help-message-reply">
          <h5>Tu respuesta</h5>
          <textarea
            placeholder="Escribe tu respuesta para este mensaje..."
            onChange={(e) => (message.reply = e.target.value)}
          ></textarea>
          <button
            className="help-message-reply-button"
            onClick={() =>
              handleReplyMessage(message.id, message.email, message.reply)
            }
          >
            Enviar Respuesta
          </button>
        </div>
      </div>
    ));
  };

  // Cargar reportes de foro
  useEffect(() => {
    if (activeSection === "forum-reports") {
      const fetchForumReports = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/forum_reports_api.php`, {
            method: "GET",
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data.success) {
            setForumReports(data.reports || []);
          } else {
            throw new Error(
              data.message || "Error al obtener los reportes del foro"
            );
          }
        } catch (error) {
          console.error("Error fetching forum reports:", error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchForumReports();
    }
  }, [activeSection]);

  const handleViewTopic = async (topicId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/get_forum_topic.php?id=${topicId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        setSelectedTopic(data);
      } else {
        showNotification(
          data.error || "No se pudo cargar el tema del foro.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error al cargar el tema del foro:", error);
      showNotification(
        "Error de conexión. Inténtalo de nuevo más tarde.",
        "error"
      );
    }
  };

  const closeTopicModal = () => {
    setSelectedTopic(null);
  };

  // Eliminar un reporte de foro - Función mejorada con mejor manejo de errores
  const handleDeleteReport = async (reportId) => {
    if (window.confirm("¿Estás seguro que deseas desestimar este reporte?")) {
      try {
        // Primero actualizamos la UI para evitar problemas de referencias
        setForumReports((prevReports) =>
          prevReports.filter((report) => report.id !== reportId)
        );

        // Luego intentamos eliminar en la base de datos
        const response = await fetch(
          `${BACKEND_URL}/delete_forum_report.php?id=${reportId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        const data = await response.json();
        if (data.success) {
          showNotification("Aviso de reporte eliminado correctamente");
        } else {
          console.error(
            "Error al eliminar el aviso de reporte en el servidor:",
            data.error
          );
          showNotification(
            "El reporte se ha eliminado de la vista, pero puede que no se haya eliminado correctamente en el servidor. Detalles: " +
              (data.error || "Error desconocido"),
            "warning"
          );
        }
      } catch (error) {
        console.error("Error de comunicación al eliminar el reporte:", error);
        showNotification(
          "El reporte se ha eliminado de la vista, pero hubo un problema de comunicación con el servidor.",
          "warning"
        );
      }
    }
  };

  // Renderizar reportes de foro
  const renderForumReports = () => {
    if (!forumReports || forumReports.length === 0) {
      return (
        <p className="admin-no-data">No hay reportes pendientes de revisar.</p>
      );
    }

    return (
      <div className="forum-reports-section">
        {forumReports.map((report) => (
          <div key={report.id} className="forum-report">
            <h4>Tema: {report.topic_title}</h4>
            <p>
              <strong>Reportado por:</strong> {report.user_name}
            </p>
            <p>
              <strong>Razón:</strong> {report.reason}
            </p>
            <small>Reportado el {formatDate(report.created_at)}</small>
            <div className="forum-report-buttons">
              <button onClick={() => handleViewTopic(report.topic_id)}>
                <i className="fas fa-eye"></i> Ver Tema
              </button>
              <button onClick={() => handleDeleteReport(report.id)}>
                <i className="fas fa-trash"></i> Desestimar Reporte
              </button>
              <button
                onClick={() =>
                  handleDeleteReportedTopic(report.topic_id, report.id)
                }
              >
                <i className="fas fa-ban"></i> Eliminar Tema Reportado
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Función para eliminar el tema reportado
  const handleDeleteReportedTopic = async (topicId, reportId) => {
    if (
      window.confirm(
        "¿Estás seguro que deseas eliminar este tema? Esta acción no se puede deshacer."
      )
    ) {
      try {
        // Primero eliminamos el reporte para evitar problemas de integridad referencial
        const reportResponse = await fetch(
          `${BACKEND_URL}/delete_forum_report.php?id=${reportId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );

        const reportData = await reportResponse.json();

        if (reportData.success) {
          // Actualizar la lista de reportes primero
          setForumReports((prevReports) =>
            prevReports.filter((report) => report.id !== reportId)
          );

          // Después eliminamos el tema
          const topicResponse = await fetch(
            `${BACKEND_URL}/forum_management.php?id=${topicId}&type=topic`,
            {
              method: "DELETE",
              credentials: "include",
            }
          );

          const topicData = await topicResponse.json();

          if (topicData.success) {
            showNotification("Tema y reporte eliminados correctamente");
          } else {
            // Aún si falla eliminar el tema, el reporte ya fue eliminado
            showNotification(
              "Se eliminó el reporte pero hubo un error al eliminar el tema: " +
                (topicData.error || "Error desconocido"),
              "warning"
            );
          }
        } else {
          showNotification(
            "Error al eliminar el reporte: " +
              (reportData.error || "Error desconocido"),
            "error"
          );
        }
      } catch (error) {
        console.error("Error eliminando el tema reportado:", error);
        showNotification(
          "Error de conexión. Inténtalo de nuevo más tarde.",
          "error"
        );
      }
    }
  };

  // Cargar entradas del foro
  useEffect(() => {
    if (activeSection === "forum-topics") {
      const fetchForumTopics = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/forum_management.php`, {
            method: "GET",
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data.success) {
            setForumTopics(data.topics || []);
          } else {
            throw new Error(
              data.error || "Error al obtener los temas del foro"
            );
          }
        } catch (error) {
          console.error("Error fetching forum topics:", error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchForumTopics();
    }
  }, [activeSection]);

  // Crear un nuevo tema
  const handleCreateTopic = async (title, description) => {
    try {
      const response = await fetch(`${BACKEND_URL}/forum_management.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ title, description }), // Quitamos el id aquí
      });

      const data = await response.json();
      if (data.success) {
        // Suponiendo que el backend devuelve el ID del nuevo tema
        const newTopicId = data.topicId;

        setForumTopics((prev) => [
          ...prev,
          {
            id: newTopicId || `temp-${Date.now()}`,
            title,
            description,
            created_at: new Date().toISOString(),
          },
        ]);

        showNotification("Tema creado correctamente");
        setTitle("");
        setDescription("");
      } else {
        throw new Error(data.error || "Error al crear el tema");
      }
    } catch (error) {
      console.error("Error creando tema:", error);
      showNotification(error.message, "error");
    }
  };

  // Editar un tema
  const handleEditTopic = async (topicId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/forum_management.php`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id: topicId, ...editTopicData }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification("Tema actualizado correctamente");
        setForumTopics((prev) =>
          prev.map((topic) =>
            topic.id === topicId ? { ...topic, ...editTopicData } : topic
          )
        );
        setEditingTopic(null);
      } else {
        throw new Error(data.error || "Error al actualizar el tema");
      }
    } catch (error) {
      console.error("Error editando tema:", error);
      showNotification(error.message, "error");
    }
  };

  // Eliminar un tema o mensaje
  const handleDelete = async (id, type) => {
    // Añadir confirmación para eliminar temas
    if (type === "topic") {
      if (
        !window.confirm(
          "¿Estás seguro que deseas eliminar este tema? Esta acción no se puede deshacer."
        )
      ) {
        return;
      }
    }

    try {
      let endpoint = `${BACKEND_URL}/forum_management.php?id=${id}&type=${type}`;

      // Si es un reporte, usar el endpoint correcto
      if (type === "report") {
        endpoint = `${BACKEND_URL}/delete_forum_report.php?id=${id}`;
      }

      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        showNotification(
          type === "topic"
            ? "Tema eliminado correctamente"
            : type === "report"
            ? "Reporte eliminado correctamente"
            : "Mensaje eliminado correctamente"
        );

        if (type === "topic") {
          setForumTopics((prev) => prev.filter((topic) => topic.id !== id));
        } else if (type === "report") {
          setForumReports((prev) => prev.filter((report) => report.id !== id));
        }
      } else {
        throw new Error(data.error || "Error al eliminar");
      }
    } catch (error) {
      console.error("Error eliminando:", error);
      showNotification(error.message, "error");
    }
  };

  // Renderizar formulario para editar un tema
  const renderEditTopicForm = (topic) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleEditTopic(topic.id);
      }}
      className="edit-topic-form"
    >
      <input
        type="text"
        placeholder="Título del tema"
        value={editTopicData.title}
        onChange={(e) =>
          setEditTopicData({ ...editTopicData, title: e.target.value })
        }
        required
      />
      <textarea
        placeholder="Descripción del tema"
        value={editTopicData.description}
        onChange={(e) =>
          setEditTopicData({ ...editTopicData, description: e.target.value })
        }
        required
      ></textarea>
      <button type="submit" className="save-edit-topic-button">
        Guardar
      </button>
      <button
        type="button"
        onClick={() => setEditingTopic(null)}
        className="cancel-edit-topic-button"
      >
        Cancelar
      </button>
    </form>
  );

  // Renderizar temas del foro
  const renderForumTopics = () => {
    if (!forumTopics || forumTopics.length === 0) {
      return <p>No hay temas disponibles.</p>;
    }

    return forumTopics.map((topic) => (
      <div key={topic.id} className="forum-topic">
        {editingTopic === topic.id ? (
          renderEditTopicForm(topic)
        ) : (
          <>
            <h4>{topic.title}</h4>
            <p>{topic.description}</p>
            <small>{formatDate(topic.created_at)}</small>
            <div className="forum-topic-buttons">
              <button
                className="delete-topic-button"
                onClick={() => handleDelete(topic.id, "topic")}
              >
                Eliminar Tema
              </button>
              <button
                className="edit-topic-button"
                onClick={() => {
                  setEditingTopic(topic.id);
                  setEditTopicData({
                    title: topic.title,
                    description: topic.description,
                  });
                }}
              >
                Editar Tema
              </button>
            </div>
          </>
        )}
      </div>
    ));
  };

  // Renderizar formulario para crear un tema
  // eslint-disable-next-line no-unused-vars
  const renderCreateTopicForm = () => {
    const handleSubmit = (e) => {
      e.preventDefault();
      handleCreateTopic(title, description);
      setTitle("");
      setDescription("");
    };

    return (
      <form onSubmit={handleSubmit} className="create-topic-form">
        <input
          type="text"
          placeholder="Título del tema"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Descripción del tema"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        ></textarea>
        <button type="submit" className="create-forum-topic-button">
          Crear Tema
        </button>
      </form>
    );
  };

  // Cargar artículos del blog
  useEffect(() => {
    if (activeSection === "blog-articles") {
      const fetchBlogArticles = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/blog_articles_api.php`, {
            method: "GET",
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data.success) {
            setBlogArticles(data.articles || []); // Asegúrate de que sea un array
          } else {
            throw new Error(
              data.error || "Error al obtener las entradas del blog"
            );
          }
        } catch (error) {
          console.error("Error fetching blog articles:", error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchBlogArticles();
    }
  }, [activeSection]);

  // Crear un nuevo artículo
  const handleCreateArticle = async (articleData) => {
    try {
      // Validaciones previas
      if (!articleData.title || articleData.title.trim() === "") {
        showNotification("El título es obligatorio", "error");
        return;
      }

      if (!articleData.category || articleData.category.trim() === "") {
        showNotification("La categoría es obligatoria", "error");
        return;
      }

      if (!articleData.excerpt || articleData.excerpt.trim() === "") {
        showNotification("El resumen es obligatorio", "error");
        return;
      }

      // NO añadir fecha, el servidor la asignará automáticamente

      if (!articleData.image || !(articleData.image instanceof File)) {
        showNotification("La imagen es obligatoria", "error");
        return;
      }

      // Crear el FormData con los datos del artículo
      const formData = new FormData();
      formData.append("title", articleData.title);
      formData.append("category", articleData.category);
      formData.append("excerpt", articleData.excerpt);
      formData.append("image", articleData.image);

      // Debug: mostrar lo que estamos enviando
      console.log("Datos a enviar:", {
        title: articleData.title,
        category: articleData.category,
        excerpt: articleData.excerpt,
        image: `Archivo: ${articleData.image.name}, Tipo: ${articleData.image.type}, Tamaño: ${articleData.image.size} bytes`,
      });

      // Usar fetch con manejo mejorado de errores
      console.log("Enviando solicitud al backend...");
      const response = await fetch(`${BACKEND_URL}/blog_articles_api.php`, {
        method: "POST",
        credentials: "include",
        // No establecer Content-Type (FormData lo hace automáticamente)
        body: formData,
      });

      // Debug: Mostrar información de respuesta
      console.log("Respuesta recibida:", {
        status: response.status,
        statusText: response.statusText,
        headers: {
          contentType: response.headers.get("content-type"),
        },
      });

      // Verificar estado HTTP antes de procesar la respuesta
      if (!response.ok) {
        const textResponse = await response.text();
        console.error("Error HTTP:", response.status, textResponse);
        throw new Error(
          `Error del servidor: ${response.status} ${response.statusText}`
        );
      }

      // Intentar leer la respuesta como JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();

        if (data.success) {
          showNotification("Artículo creado correctamente");

          // Actualizar la lista de artículos
          refreshArticlesList();

          // Limpiar el formulario con la fecha actual (¡esto falta!)
          const currentDate = new Date().toISOString().split("T")[0];
          setFormData({
            title: "",
            category: "",
            image: "",
            excerpt: "",
            date: currentDate, // Usar fecha actual en lugar de cadena vacía
          });

          // Limpiar la vista previa de la imagen
          setImagePreview(null);
        } else {
          throw new Error(data.error || "Error al crear el artículo");
        }
      } else {
        // Si la respuesta no es JSON, es un error
        const text = await response.text();
        console.error("Respuesta no válida:", text);
        throw new Error(
          "El servidor devolvió una respuesta no válida. Contacte al administrador."
        );
      }
    } catch (error) {
      console.error("Error creando artículo:", error);
      showNotification(error.message, "error");
    }
  };

  // Función para actualizar la lista de artículos
  const refreshArticlesList = async () => {
    try {
      const refreshResponse = await fetch(
        `${BACKEND_URL}/blog_articles_api.php`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setBlogArticles(refreshData.articles || []);
        }
      }
    } catch (error) {
      console.error("Error al actualizar la lista de artículos:", error);
    }
  };

  // Editar un artículo - Corregido de manera similar
  const handleEditArticle = async (articleData) => {
    try {
      // Validaciones similares a la creación...
      if (!articleData.title || articleData.title.trim() === "") {
        showNotification("El título es obligatorio", "error");
        return;
      }

      if (!articleData.category || articleData.category.trim() === "") {
        showNotification("La categoría es obligatoria", "error");
        return;
      }

      if (!articleData.excerpt || articleData.excerpt.trim() === "") {
        showNotification("El resumen es obligatorio", "error");
        return;
      }

      if (!articleData.date || articleData.date.trim() === "") {
        showNotification("La fecha es obligatoria", "error");
        return;
      }

      // No verificamos la imagen en edición, ya que podría no cambiarse

      // Crear objeto FormData
      const formData = new FormData();
      formData.append("id", articleData.id);
      formData.append("title", articleData.title.trim());
      formData.append("category", articleData.category.trim());
      formData.append("excerpt", articleData.excerpt.trim());
      formData.append("date", articleData.date.trim());
      formData.append("action", "update");

      // Añadir una bandera para indicar si se está actualizando la imagen
      const isUpdatingImage = articleData.image instanceof File;
      formData.append("update_image", isUpdatingImage ? "1" : "0");

      // Añadir el archivo solo si es un objeto File (nueva imagen)
      if (isUpdatingImage) {
        formData.append("image", articleData.image);
      }

      const response = await fetch(`${BACKEND_URL}/blog_articles_api.php`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const responseText = await response.text();
      console.log("Respuesta del servidor (edición):", responseText);

      try {
        const data = JSON.parse(responseText);

        if (data.success) {
          // Mostrar el mensaje real del backend si existe
          showNotification(
            data.message || "Artículo actualizado correctamente"
          );
          refreshArticlesList();
          setEditingArticle(null);
        } else {
          throw new Error(data.error || "Error al actualizar el artículo");
        }
      } catch (jsonError) {
        console.error(
          "Error al procesar la respuesta JSON (edición):",
          jsonError
        );
        throw new Error("Respuesta del servidor no válida: " + responseText);
      }
    } catch (error) {
      console.error("Error editando artículo:", error);
      showNotification(error.message, "error");
    }
  };

  // Eliminar un artículo
  const handleDeleteArticle = async (id) => {
    if (
      !window.confirm(
        "¿Estás seguro que deseas eliminar este artículo? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }
    try {
      const response = await fetch(
        `${BACKEND_URL}/blog_articles_api.php?id=${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        showNotification("Artículo eliminado correctamente");
        setBlogArticles((prev) => prev.filter((article) => article.id !== id));
      } else {
        throw new Error(data.error || "Error al eliminar el artículo");
      }
    } catch (error) {
      console.error("Error eliminando artículo:", error);
      showNotification(error.message, "error");
    }
  };

  // Manejar la inicialización del formulario
  useEffect(() => {
    if (editingArticle) {
      setFormData({
        title: editingArticle.title || "",
        category: editingArticle.category || "",
        image: editingArticle.image || "",
        excerpt: editingArticle.excerpt || "",
        date: editingArticle.date || "",
      });

      // Establecer la vista previa de la imagen existente
      if (editingArticle.image) {
        // Usar la misma función que ya tienes para construir la URL de la imagen
        setImagePreview(getArticleImageUrl(editingArticle.image));
      } else {
        setImagePreview(null);
      }
    } else {
      // Establecer la fecha actual en formato YYYY-MM-DD para nuevos artículos
      const currentDate = new Date().toISOString().split("T")[0];
      setFormData({
        title: "",
        category: "",
        image: "",
        excerpt: "",
        date: currentDate, // Fecha actual por defecto
      });
      // Limpiar imagen previa
      setImagePreview(null);
    }
  }, [editingArticle]);

  // Renderizar formulario para crear o editar un artículo
  const renderArticleForm = () => {
    const handleSubmit = (e) => {
      e.preventDefault();
      if (editingArticle) {
        handleEditArticle({ ...formData, id: editingArticle.id });
      } else {
        // Verifica primero si hay imagen seleccionada
        if (!formData.image || !(formData.image instanceof File)) {
          showNotification("La imagen es obligatoria", "error");
          return;
        }
        handleCreateArticle(formData);
      }
    };

    const handleFileChange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        setFormData({ ...formData, image: selectedFile });
        setImagePreview(URL.createObjectURL(selectedFile));
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="article-form"
        encType="multipart/form-data"
      >
        <input
          type="text"
          placeholder="Título"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        {/* Selector desplegable de categorías */}
        <select
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          required
          className="category-select"
        >
          <option value="" disabled>
            Selecciona una categoría
          </option>
          {blogCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <div className="file-upload-flex-container">
          <label className="custom-file-label" htmlFor="blog-image-input">
            Seleccionar imagen
            <input
              id="blog-image-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="custom-file-input"
              required={!editingArticle}
            />
          </label>

          {formData.image && formData.image instanceof File && (
            <span className="file-selected">
              Archivo seleccionado: {formData.image.name}
            </span>
          )}

          {imagePreview && (
            <div className="image-preview-container">
              <img
                src={imagePreview}
                alt="Vista previa"
                className="image-preview"
                style={{
                  width: 60,
                  height: 40,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                }}
              />
            </div>
          )}
        </div>

        <textarea
          placeholder="Resumen"
          value={formData.excerpt}
          onChange={(e) =>
            setFormData({ ...formData, excerpt: e.target.value })
          }
          required
        ></textarea>

        {/* Campo de fecha oculto/de solo lectura para evitar errores de formato */}
        <div className="date-field-container">
          <input
            type="date"
            value={formData.date}
            readOnly
            className="date-field-readonly"
          />
          <div className="date-field-info">
            Fecha de publicación: {formatReadableDate(formData.date)}
          </div>
        </div>

        <button type="submit">{editingArticle ? "Actualizar" : "Crear"}</button>
        {editingArticle && (
          <button
            type="button"
            onClick={() => setEditingArticle(null)}
            className="cancel-article-button"
          >
            Cancelar
          </button>
        )}
      </form>
    );
  };

  // Función auxiliar para formatear la fecha en formato legible
  const formatReadableDate = (dateString) => {
    if (!dateString) return "";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("es-ES", options);
  };

  // Renderizar artículos del blog (ahora con columna de imagen)
  const getArticleImageUrl = (image) => {
    if (!image) return "/images/placeholder.png";
    if (image.startsWith("http")) return image;
    if (image.startsWith("images/blog/")) return `/${image}`;
    // Si por alguna razón la ruta es solo el nombre del archivo
    return `/images/blog/${image}`;
  };

  const renderBlogArticles = () => {
    if (!blogArticles || blogArticles.length === 0) {
      return <p>No hay artículos disponibles.</p>;
    }

    return (
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Título</th>
              <th>Resumen</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {blogArticles.map((article) => (
              <tr key={article.id}>
                <td>
                  <img
                    src={getArticleImageUrl(article.image)}
                    alt={article.title}
                    style={{
                      width: 60,
                      height: 40,
                      objectFit: "cover",
                      borderRadius: 4,
                    }}
                    onError={(e) => {
                      e.target.src = "/images/placeholder.png";
                    }}
                  />
                </td>
                <td>{article.title}</td>
                <td>{article.excerpt}</td>
                <td>{formatDate(article.date)}</td>
                <td>
                  <button onClick={() => handleDeleteArticle(article.id)}>
                    Eliminar
                  </button>
                  <button
                    onClick={() => {
                      setEditingArticle(article);
                      const formElement =
                        document.querySelector(".article-form");
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Función para manejar el cambio de página
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Función para manejar la búsqueda
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reiniciar a la primera página al buscar
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    sessionStorage.removeItem("adminData");
    sessionStorage.removeItem("isAdminLoggedIn");
    navigate("/admin/login");
  };

  // Función para cambiar de sección
  const handleSectionChange = (section) => {
    setActiveSection(section);
    setCurrentPage(1);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("es-ES", options);
  };

  return (
    <div className="admin-dashboard">
      {/* Notificación emergente centrada */}
      {notification.show && (
        <div className={`admin-popup-notification ${notification.type}`}>
          <div className="admin-popup-content">
            <span className="admin-popup-message">{notification.message}</span>
            <button
              className="admin-popup-close"
              onClick={() =>
                setNotification((prev) => ({ ...prev, show: false }))
              }
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>MomMatch</h2>
          <p>Panel de Administración</p>
        </div>
        <nav className="admin-nav">
          <ul>
            <li
              className={activeSection === "dashboard" ? "active" : ""}
              onClick={() => handleSectionChange("dashboard")}
            >
              Dashboard
            </li>
            <li
              className={activeSection === "users" ? "active" : ""}
              onClick={() => handleSectionChange("users")}
            >
              Usuarios
            </li>
            <li
              className={activeSection === "help-messages" ? "active" : ""}
              onClick={() => handleSectionChange("help-messages")}
            >
              Mensajes de Ayuda
            </li>
            <li
              className={activeSection === "forum-reports" ? "active" : ""}
              onClick={() => handleSectionChange("forum-reports")}
            >
              Reportes del Foro
            </li>
            <li
              className={activeSection === "forum-topics" ? "active" : ""}
              onClick={() => handleSectionChange("forum-topics")}
            >
              Temas del Foro
            </li>
            <li
              className={activeSection === "blog-articles" ? "active" : ""}
              onClick={() => handleSectionChange("blog-articles")}
            >
              Artículos del Blog
            </li>
          </ul>
        </nav>
        <button className="admin-logout-btn" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>
            {activeSection === "dashboard" && "Dashboard"}
            {activeSection === "users" && "Gestión de Usuarios"}
            {activeSection === "help-messages" && "Mensajes de Ayuda"}
            {activeSection === "forum-reports" && "Reportes del Foro"}
            {activeSection === "forum-topics" && "Gestión de Foros"}
            {activeSection === "blog-articles" && "Gestión del Blog"}
          </h1>
          <p>
            {activeSection === "dashboard" &&
              "Resumen de la aplicación MomMatch"}
            {activeSection === "users" &&
              "Administración de usuarias registradas"}
            {activeSection === "help-messages" &&
              "Mensajes de contacto enviados por usuarias"}
            {activeSection === "forum-reports" &&
              "Reportes de contenido inapropiado"}
            {activeSection === "forum-topics" &&
              "Administrar temas y respuestas del foro"}
            {activeSection === "blog-articles" &&
              "Administrar artículos del blog"}
          </p>
        </header>

        {error && <div className="admin-error-message">{error}</div>}

        {/* Dashboard Section */}
        {activeSection === "dashboard" && (
          <section className="admin-stats-section">
            <h2>Estadísticas Generales</h2>
            <div className="admin-stats-cards">
              <div className="admin-stat-card">
                <h3>Usuarios Totales</h3>
                <div className="admin-stat-number">
                  {statistics?.totalUsers || 0}
                </div>
                <div className="admin-stat-label">Usuarias registradas</div>
              </div>
              <div className="admin-stat-card">
                <h3>Usuarias Nuevas</h3>
                <div className="admin-stat-number">
                  {statistics?.recentUsers || 0}
                </div>
                <div className="admin-stat-label">
                  Registradas en los últimos 7 días
                </div>
              </div>
              <div className="admin-stat-card">
                <h3>Matches Totales</h3>
                <div className="admin-stat-number">
                  {statistics?.totalMatches || 0}
                </div>
                <div className="admin-stat-label">Conexiones realizadas</div>
              </div>
              <div className="admin-stat-card">
                <h3>Mensajes Enviados</h3>
                <div className="admin-stat-number">
                  {statistics?.totalMessages || 0}
                </div>
                <div className="admin-stat-label">Comunicaciones</div>
              </div>
              <div className="admin-stat-card">
                <h3>Eventos Próximos</h3>
                <div className="admin-stat-number">
                  {statistics?.upcomingEvents || 0}
                </div>
                <div className="admin-stat-label">
                  Programados en los próximos días
                </div>
              </div>
              <div
                className={`admin-stat-card ${
                  statistics?.unreadHelpMessages === 0
                    ? "pending-0"
                    : "pending-1-or-more"
                }`}
              >
                <h3>Mensajes de Ayuda</h3>
                <div className="admin-stat-number">
                  {statistics?.unreadHelpMessages || 0}
                </div>
                <div className="admin-stat-label">Mensajes no leídos</div>
              </div>
              <div
                className={`admin-stat-card ${
                  statistics?.pendingReports === 0
                    ? "pending-0"
                    : "pending-1-or-more"
                }`}
              >
                <h3>Reportes de Foro</h3>
                <div className="admin-stat-number">
                  {statistics?.pendingReports || 0}
                </div>
                <div className="admin-stat-label">
                  Reportes pendientes de revisión
                </div>
              </div>
            </div>

            {/* Nuevos gráficos */}
            <div className="admin-stats-charts">
              {/* Gráfico de barras para edades */}
              <div className="admin-chart-container">
                <h3>Distribución por Edad</h3>
                {statistics?.ageStatistics &&
                statistics.ageStatistics.length > 0 ? (
                  <div className="age-distribution-chart">
                    {/* Función para agrupar las edades en rangos */}
                    {(() => {
                      // Agrupar edades en rangos
                      const ranges = {
                        "18-25": 0,
                        "26-30": 0,
                        "31-35": 0,
                        "36-40": 0,
                        "41-45": 0,
                        "46+": 0,
                      };

                      statistics.ageStatistics.forEach((stat) => {
                        const age = parseInt(stat.mother_age);
                        if (age <= 25) ranges["18-25"] += stat.count;
                        else if (age <= 30) ranges["26-30"] += stat.count;
                        else if (age <= 35) ranges["31-35"] += stat.count;
                        else if (age <= 40) ranges["36-40"] += stat.count;
                        else if (age <= 45) ranges["41-45"] += stat.count;
                        else ranges["46+"] += stat.count;
                      });

                      const maxCount = Math.max(...Object.values(ranges));

                      return (
                        <div className="horizontal-bar-chart">
                          {Object.entries(ranges).map(([range, count]) => (
                            <div className="horizontal-bar-row" key={range}>
                              <div className="horizontal-bar-label">
                                {range}
                              </div>
                              <div className="horizontal-bar-container">
                                <div
                                  className="horizontal-bar"
                                  style={{
                                    width:
                                      count > 0
                                        ? `${(count / maxCount) * 100}%`
                                        : "0%",
                                  }}
                                />
                                <span className="horizontal-bar-value">
                                  {count}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p>No hay datos de edades disponibles</p>
                )}
              </div>

              {/* Gráfico tipo dona para tipos de familia */}
              <div className="admin-chart-container">
                <h3>Tipos de Familia</h3>
                {statistics?.familyTypes &&
                statistics.familyTypes.length > 0 ? (
                  <div className="family-types-stats">
                    <div className="family-types-chart">
                      {statistics.familyTypes.map((type, index) => (
                        <div
                          key={index}
                          className="family-type-segment"
                          style={{
                            backgroundColor: [
                              "#FECB3E",
                              "#FF6F61",
                              "#44896C",
                              "#68D6FF",
                              "#E7477D",
                              "#6B5B95",
                              "#88B04B",
                              "#F7CAC9",
                              "#92A8D1",
                              "#C4E3D5",
                            ][index % 10],
                            width: `${
                              (type.count /
                                statistics.familyTypes.reduce(
                                  (sum, t) => sum + t.count,
                                  0
                                )) *
                              100
                            }%`,
                          }}
                        ></div>
                      ))}
                    </div>

                    <div className="family-types-legend">
                      {statistics.familyTypes.map((type, index) => (
                        <div className="legend-item" key={index}>
                          <span
                            className="legend-color"
                            style={{
                              backgroundColor: [
                                "#FECB3E",
                                "#FF6F61",
                                "#44896C",
                                "#68D6FF",
                                "#E7477D",
                                "#6B5B95",
                                "#88B04B",
                                "#F7CAC9",
                                "#92A8D1",
                                "#C4E3D5",
                              ][index % 10],
                            }}
                          ></span>
                          <span className="legend-label">
                            {type.family_type}: {type.count} (
                            {Math.round(
                              (type.count /
                                statistics.familyTypes.reduce(
                                  (sum, t) => sum + t.count,
                                  0
                                )) *
                                100
                            )}
                            %)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>No hay datos de tipos de familia disponibles</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Users Section */}
        {activeSection === "users" && (
          <section className="admin-users-section" id="users">
            <div className="admin-section-header">
              <h2>Usuarias Registradas</h2>
              <form className="admin-search-form" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Buscar usuarias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit">Buscar</button>
              </form>
            </div>

            {loading ? (
              <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
                <p>Cargando usuarias...</p>
              </div>
            ) : (
              <>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Edad usuaria</th>
                        <th>Email</th>
                        <th>Ciudad</th>
                        <th>Tipo de familia</th>
                        <th>Nº hijos</th>
                        <th>Fecha registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.name}</td>
                            <td>{user.mother_age || "No especificada"}</td>
                            <td>{user.email}</td>
                            <td>{user.city || "No especificada"}</td>
                            <td>{user.family_type || "No especificado"}</td>
                            <td>{user.number_of_children || "0"}</td>
                            <td>{formatDate(user.created_at)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="admin-no-data">
                            No se encontraron usuarios
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="admin-pagination-btn"
                    >
                      Anterior
                    </button>
                    <span className="admin-pagination-info">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="admin-pagination-btn"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Help Messages Section */}
        {activeSection === "help-messages" && (
          <section className="admin-help-messages-section" id="help-messages">
            <div className="admin-section-header">
              <h2>Mensajes de Ayuda</h2>
            </div>

            {loading ? (
              <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
                <p>Cargando mensajes...</p>
              </div>
            ) : (
              <div className="help-messages-section">
                {renderHelpMessages()}
                {error && <p className="error">{error}</p>}
              </div>
            )}
          </section>
        )}

        {/* Forum Reports Section */}
        {activeSection === "forum-reports" && (
          <div className="forum-reports-section">
            <h2>Reportes del Foro</h2>
            {loading ? <p>Cargando...</p> : renderForumReports()}
            {error && <p className="error">{error}</p>}
          </div>
        )}

        {/* Forum Topics Section */}
        {activeSection === "forum-topics" && (
          <section className="admin-forum-topics-section" id="forum-topics">
            <div className="admin-section-header">
              <h2>Temas del Foro</h2>
            </div>

            <div className="admin-actions">
              <h3>Crear nuevo tema de foro</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateTopic(title, description);
                  setTitle("");
                  setDescription("");
                }}
                className="create-topic-form"
              >
                <input
                  type="text"
                  placeholder="Título del tema"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder="Descripción del tema"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
                <button type="submit" className="create-forum-topic-button">
                  Crear Tema
                </button>
              </form>
            </div>

            <h3 className="forum-topics-title">Listado de temas existentes</h3>

            {loading ? (
              <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
                <p>Cargando temas...</p>
              </div>
            ) : (
              <div className="forum-topics-section">{renderForumTopics()}</div>
            )}
          </section>
        )}

        {/* Blog Articles Section */}
        {activeSection === "blog-articles" && (
          <section className="admin-blog-articles-section">
            <h2>Artículos del Blog</h2>
            <div className="admin-actions">{renderArticleForm()}</div>
            {loading ? <p>Cargando...</p> : renderBlogArticles()}
            {error && <p className="error">{error}</p>}
          </section>
        )}
      </main>

      {selectedTopic && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <span className="close-button" onClick={closeTopicModal}>
                &times;
              </span>
              <h2>{selectedTopic.topic.title}</h2>
              <p>{selectedTopic.topic.description}</p>
              <h3>Respuestas:</h3>
              {selectedTopic.replies && selectedTopic.replies.length > 0 ? (
                <ul className="topic-replies-list">
                  {selectedTopic.replies.map((reply) => (
                    <li key={reply.id} className="topic-reply-item">
                      <p>{reply.reply}</p>
                      <small>{formatDate(reply.created_at)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay respuestas para este tema.</p>
              )}
              <button onClick={closeTopicModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

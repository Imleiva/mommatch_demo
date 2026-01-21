import React, { useState, useEffect } from "react";
import "./Forum.css";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { config } from "../config";
import forumTopicsData from "../data/forum_topics.json";
import forumRepliesData from "../data/forum_replies.json";
import usersData from "../mock-data/users.json";

// Este componente implementa el foro de la comunidad, donde las mamás
// pueden crear temas, comentar y reportar contenido inapropiado.
//--
// Se implementa creación de temas, comentarios, edición,
// eliminación, reportes... Cada una de estas acciones requiere comunicación
// con el backend y actualización del estado local.
//--
// El sistema de mensajes temporales me dio algunos quebraderos de cabeza,
// ya que necesitaba mostrar diferentes mensajes para cada tema/comentario.
// Al final implementé un objeto de mensajes indexado por ID de tema, que
// funciona
//
// Implemento el modal de confirmación para eliminación
// de comentarios, que es importante para evitar eliminaciones accidentales

const Forum = () => {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTopic, setNewTopic] = useState({ title: "", description: "" });
  const [reportDropdown, setReportDropdown] = useState({
    isOpen: false,
    topicId: null,
  });
  const [message, setMessage] = useState({ text: "", type: "", show: false });
  const [topicMessages, setTopicMessages] = useState({});
  const [formMessage, setFormMessage] = useState({
    text: "",
    type: "",
    show: false,
  });
  const [activeComment, setActiveComment] = useState({
    topicId: null,
    text: "",
  });
  const [replies, setReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [commentCounts, setCommentCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    replyId: null,
    topicId: null,
  });

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        // Modo demo: usar datos mock
        if (config.useMocks) {
          setTopics(forumTopicsData);
          fetchCommentCounts(forumTopicsData);
          setLoading(false);
          return;
        }

        const response = await fetch(
          "http://localhost/mommatch/backend/get_forum_topics.php",
          {
            credentials: "include",
          }
        );
        const data = await response.json();
        if (data.success) {
          setTopics(data.topics);
          fetchCommentCounts(data.topics);
        } else {
          console.error(data.error);
        }
      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);
  const fetchReplies = async (topicId) => {
    // Añadir un pequeño delay antes de mostrar el loading para evitar parpadeos
    const loadingTimeout = setTimeout(() => {
      setLoadingReplies((prev) => ({ ...prev, [topicId]: true }));
    }, 200);

    try {
      // Modo demo: usar datos mock
      if (config.useMocks) {
        const topicReplies = forumRepliesData
          .filter(reply => reply.topic_id === topicId)
          .map(reply => ({
            ...reply,
            user_name: usersData.find(u => u.id === reply.user_id)?.name || "Usuario"
          }));
        
        setReplies((prev) => ({ ...prev, [topicId]: topicReplies }));
        setCommentCounts((prev) => ({
          ...prev,
          [topicId]: topicReplies.length,
        }));
        
        clearTimeout(loadingTimeout);
        setLoadingReplies((prev) => ({ ...prev, [topicId]: false }));
        return;
      }

      const response = await fetch(
        `http://localhost/mommatch/backend/get_forum_replies.php?topic_id=${topicId}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setReplies((prev) => ({ ...prev, [topicId]: data.replies || [] }));

        setCommentCounts((prev) => ({
          ...prev,
          [topicId]: data.replies ? data.replies.length : 0,
        }));
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      clearTimeout(loadingTimeout);
      setLoadingReplies((prev) => ({ ...prev, [topicId]: false }));
    }
  };

  const fetchCommentCounts = async (topics) => {
    if (!topics || topics.length === 0) return;

    setLoadingCounts(true);
    try {
      // Modo demo: contar desde datos mock
      if (config.useMocks) {
        const counts = {};
        topics.forEach((topic) => {
          counts[topic.id] = forumRepliesData.filter(reply => reply.topic_id === topic.id).length;
        });
        setCommentCounts(counts);
        setLoadingCounts(false);
        return;
      }

      const promises = topics.map((topic) =>
        fetch(
          `http://localhost/mommatch/backend/get_forum_replies.php?topic_id=${topic.id}`,
          {
            credentials: "include",
          }
        )
          .then((response) => response.json())
          .then((data) => ({
            topicId: topic.id,
            count: data.success ? (data.replies ? data.replies.length : 0) : 0,
          }))
      );

      const results = await Promise.all(promises);
      const counts = {};
      results.forEach((result) => {
        counts[result.topicId] = result.count;
      });

      setCommentCounts(counts);
    } catch (error) {
      console.error("Error fetching comment counts:", error);
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleNewTopicSubmit = async (e) => {
    e.preventDefault();
    
    // Modo demo: simulación local
    if (config.useMocks) {
      const newTopicData = {
        id: Date.now(),
        title: newTopic.title,
        content: newTopic.description,
        description: newTopic.description,
        created_at: new Date().toISOString(),
        user_id: 1,
        category: "General",
      };

      setTopics((prevTopics) => [newTopicData, ...prevTopics]);
      setCommentCounts((prev) => ({
        ...prev,
        [newTopicData.id]: 0,
      }));
      setNewTopic({ title: "", description: "" });
      setFormMessage({
        text: "Tema creado correctamente (modo demo)",
        type: "success",
        show: true,
      });
      setShowCreateForm(false);
      
      setTimeout(() => {
        setFormMessage((prev) => ({ ...prev, show: false }));
      }, 3000);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost/mommatch/backend/create_forum_topic.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newTopic.title,
            content: newTopic.description,
            category: "General",
          }),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        const newTopicData = {
          id: data.topic_id,
          title: newTopic.title,
          content: newTopic.description,
          description: newTopic.description,
          created_at: new Date().toISOString(),
          user_id: user?.id || null,
          category: "General",
        };

        setTopics((prevTopics) => [newTopicData, ...prevTopics]);
        setCommentCounts((prev) => ({
          ...prev,
          [data.topic_id]: 0,
        }));
        setNewTopic({ title: "", description: "" });
        setFormMessage({
          text: "Tema creado correctamente",
          type: "success",
          show: true,
        });
        setShowCreateForm(false);
      } else {
        console.error("Error:", data.message || data.error);
        setFormMessage({
          text: data.message || "Error al crear el tema",
          type: "error",
          show: true,
        });
      }
    } catch (error) {
      console.error("Error creating topic:", error);
      setFormMessage({
        text: "Error al conectar con el servidor",
        type: "error",
        show: true,
      });
    } finally {
      setTimeout(() => {
        setFormMessage((prev) => ({ ...prev, show: false }));
      }, 3000);
    }
  };

  const handleReportSubmit = async (reason) => {
    // Modo demo: simulación local
    if (config.useMocks) {
      setTopicMessages((prev) => ({
        ...prev,
        [reportDropdown.topicId]: {
          text: "¡Reporte enviado! (modo demo)",
          type: "success",
          show: true,
        },
      }));

      setTimeout(() => {
        setTopicMessages((prev) => ({
          ...prev,
          [reportDropdown.topicId]: {
            ...prev[reportDropdown.topicId],
            show: false,
          },
        }));
      }, 3000);

      setReportDropdown({ isOpen: false, topicId: null });
      return;
    }

    try {
      const response = await fetch(
        "http://localhost/mommatch/backend/report_forum_topic.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ topicId: reportDropdown.topicId, reason }),
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setTopicMessages((prev) => ({
          ...prev,
          [reportDropdown.topicId]: {
            text: "¡Reporte enviado!",
            type: "success",
            show: true,
          },
        }));

        setTimeout(() => {
          setTopicMessages((prev) => ({
            ...prev,
            [reportDropdown.topicId]: {
              ...prev[reportDropdown.topicId],
              show: false,
            },
          }));
        }, 3000);

        setReportDropdown({ isOpen: false, topicId: null });
      } else {
        console.error(data.error);
        showMessage("Error al enviar el reporte", "error");
      }
    } catch (error) {
      console.error("Error reporting topic:", error);
      showMessage("Error al conectar con el servidor", "error");
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type, show: true });
    setTimeout(() => {
      setMessage((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleCommentClick = (topicId) => {
    if (activeComment.topicId === topicId) {
      setActiveComment({ topicId: null, text: "" });
    } else {
      setActiveComment({ topicId, text: "" });
      fetchReplies(topicId);
    }
  };

  const handleCommentChange = (e) => {
    setActiveComment((prev) => ({ ...prev, text: e.target.value }));
  };

  const handleCommentSubmit = async (e, topicId) => {
    e.preventDefault();
    if (!activeComment.text.trim()) return;

    // Modo demo: simulación local
    if (config.useMocks) {
      const newReply = {
        id: Date.now(),
        topic_id: topicId,
        user_id: 1,
        user_name: "Usuario Demo",
        reply: activeComment.text,
        created_at: new Date().toISOString(),
      };

      const updatedReplies = [...(replies[topicId] || []), newReply];
      setReplies((prev) => ({
        ...prev,
        [topicId]: updatedReplies,
      }));

      setCommentCounts((prev) => ({
        ...prev,
        [topicId]: updatedReplies.length,
      }));

      setActiveComment((prev) => ({ ...prev, text: "" }));

      setTopicMessages((prev) => ({
        ...prev,
        [topicId]: {
          text: "Comentario añadido correctamente (modo demo)",
          type: "success",
          show: true,
        },
      }));

      setTimeout(() => {
        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: { ...prev[topicId], show: false },
        }));
      }, 3000);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost/mommatch/backend/add_forum_reply.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topicId,
            content: activeComment.text,
          }),
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        const updatedReplies = [...(replies[topicId] || []), data.reply];
        setReplies((prev) => ({
          ...prev,
          [topicId]: updatedReplies,
        }));

        setCommentCounts((prev) => ({
          ...prev,
          [topicId]: updatedReplies.length,
        }));

        setActiveComment((prev) => ({ ...prev, text: "" }));

        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            text: "Comentario añadido correctamente",
            type: "success",
            show: true,
          },
        }));

        setTimeout(() => {
          setTopicMessages((prev) => ({
            ...prev,
            [topicId]: {
              ...prev[topicId],
              show: false,
            },
          }));
        }, 3000);
      } else {
        console.error(data.error);

        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            text: data.error || "Error al añadir el comentario",
            type: "error",
            show: true,
          },
        }));

        setTimeout(() => {
          setTopicMessages((prev) => ({
            ...prev,
            [topicId]: {
              ...prev[topicId],
              show: false,
            },
          }));
        }, 3000);
      }
    } catch (error) {
      console.error("Error adding comment:", error);

      setTopicMessages((prev) => ({
        ...prev,
        [topicId]: {
          text: "Error al conectar con el servidor",
          type: "error",
          show: true,
        },
      }));

      setTimeout(() => {
        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            ...prev[topicId],
            show: false,
          },
        }));
      }, 3000);
    }
  };

  const handleEditReply = (reply) => {
    setEditingReply(reply.id);
    setEditReplyText(reply.content);
  };

  const handleCancelEdit = () => {
    setEditingReply(null);
    setEditReplyText("");
  };

  const handleSaveEdit = async (reply, topicId) => {
    if (!editReplyText.trim()) return;

    try {
      const response = await fetch(
        "http://localhost/mommatch/backend/edit_forum_reply.php",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            replyId: reply.id,
            content: editReplyText,
          }),
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setReplies((prev) => ({
          ...prev,
          [topicId]: prev[topicId].map((r) =>
            r.id === reply.id ? data.reply : r
          ),
        }));
        setEditingReply(null);
        setEditReplyText("");

        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            text: "Comentario actualizado correctamente",
            type: "success",
            show: true,
          },
        }));

        setTimeout(() => {
          setTopicMessages((prev) => ({
            ...prev,
            [topicId]: {
              ...prev[topicId],
              show: false,
            },
          }));
        }, 3000);
      } else {
        console.error(data.error);

        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            text: data.error || "Error al actualizar el comentario",
            type: "error",
            show: true,
          },
        }));

        setTimeout(() => {
          setTopicMessages((prev) => ({
            ...prev,
            [topicId]: {
              ...prev[topicId],
              show: false,
            },
          }));
        }, 3000);
      }
    } catch (error) {
      console.error("Error editing reply:", error);

      setTopicMessages((prev) => ({
        ...prev,
        [topicId]: {
          text: "Error al conectar con el servidor",
          type: "error",
          show: true,
        },
      }));

      setTimeout(() => {
        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            ...prev[topicId],
            show: false,
          },
        }));
      }, 3000);
    }
  };

  const handleDeleteReply = async (replyId, topicId) => {
    try {
      const response = await fetch(
        "http://localhost/mommatch/backend/delete_forum_reply.php",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            replyId,
          }),
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        const updatedReplies = replies[topicId].filter((r) => r.id !== replyId);
        setReplies((prev) => ({
          ...prev,
          [topicId]: updatedReplies,
        }));

        setCommentCounts((prev) => ({
          ...prev,
          [topicId]: updatedReplies.length,
        }));

        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            text: "Comentario eliminado correctamente",
            type: "success",
            show: true,
          },
        }));

        setTimeout(() => {
          setTopicMessages((prev) => ({
            ...prev,
            [topicId]: {
              ...prev[topicId],
              show: false,
            },
          }));
        }, 3000);
      } else {
        console.error(data.error);

        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            text: data.error || "Error al eliminar el comentario",
            type: "error",
            show: true,
          },
        }));

        setTimeout(() => {
          setTopicMessages((prev) => ({
            ...prev,
            [topicId]: {
              ...prev[topicId],
              show: false,
            },
          }));
        }, 3000);
      }
    } catch (error) {
      console.error("Error deleting reply:", error);

      setTopicMessages((prev) => ({
        ...prev,
        [topicId]: {
          text: "Error al conectar con el servidor",
          type: "error",
          show: true,
        },
      }));

      setTimeout(() => {
        setTopicMessages((prev) => ({
          ...prev,
          [topicId]: {
            ...prev[topicId],
            show: false,
          },
        }));
      }, 3000);
    }
  };

  const handleDeleteClick = (replyId, topicId) => {
    setConfirmDelete({ open: true, replyId, topicId });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.replyId || !confirmDelete.topicId) return;
    await handleDeleteReply(confirmDelete.replyId, confirmDelete.topicId);
    setConfirmDelete({ open: false, replyId: null, topicId: null });
  };

  const handleCancelDelete = () => {
    setConfirmDelete({ open: false, replyId: null, topicId: null });
  };

  const toggleCreateForm = () => {
    setShowCreateForm((prev) => !prev);
  };

  const handleReportClick = (topicId) => {
    // Si ya está abierto este dropdown, cerrarlo
    if (reportDropdown.isOpen && reportDropdown.topicId === topicId) {
      setReportDropdown({ isOpen: false, topicId: null });
      return;
    }

    // Si hay otro dropdown abierto, cerrarlo primero y abrir el nuevo
    setReportDropdown({
      isOpen: true,
      topicId: topicId,
    });
  };

  if (loading) {
    return <LoadingSpinner text="Cargando temas del foro..." />;
  }

  return (
    <div className="forum">
      {message.show && (
        <div className={`forum-message ${message.type}`}>{message.text}</div>
      )}

      <div className="forum-header">
        <h1>Foro de la Comunidad</h1>
        <p>
          Un espacio para compartir experiencias, resolver dudas y conectar con
          otras madres
        </p>
      </div>

      <div className="forum-section-divider"></div>

      <div className="create-topic-container">
        <button className="toggle-form-button" onClick={toggleCreateForm}>
          {showCreateForm ? "Cancelar" : "Crear nuevo tema"}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleNewTopicSubmit} className="new-topic-form">
          {formMessage.show && (
            <div className={`form-message ${formMessage.type}`}>
              {formMessage.text}
            </div>
          )}
          <input
            type="text"
            placeholder="Título del tema"
            value={newTopic.title}
            onChange={(e) =>
              setNewTopic({ ...newTopic, title: e.target.value })
            }
            required
          />
          <textarea
            placeholder="Descripción del tema"
            value={newTopic.description}
            onChange={(e) =>
              setNewTopic({ ...newTopic, description: e.target.value })
            }
            required
          ></textarea>
          <button type="submit">Publicar tema</button>
        </form>
      )}

      {topics.length > 0 ? (
        <div className="topics">
          {topics.map((topic) => (
            <div key={topic.id} className="topic" data-topic-id={topic.id}>
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
              <div className="topic-meta">
                <small>
                  Creado el: {new Date(topic.created_at).toLocaleDateString()}
                </small>
                <div className="comments-badge">
                  {loadingCounts ? (
                    <span className="loading-count">...</span>
                  ) : (
                    <>
                      <i className="comment-icon">💬</i>
                      <span className="comment-count">
                        {commentCounts[topic.id] || 0}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {activeComment.topicId === topic.id && (
                <div
                  className={`comment-section${
                    activeComment.topicId === topic.id ? " active" : ""
                  }`}
                >
                  <h3>Comentarios</h3>                  {loadingReplies[topic.id] ? (
                    <div className="replies-loading">
                      <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  ) : replies[topic.id] && replies[topic.id].length > 0 ? (
                    <div className="replies-list">
                      {replies[topic.id].map((reply) => {
                        return (
                          <div key={reply.id} className="reply">
                            <div className="reply-header">
                              <strong>{reply.username || "Usuario"}</strong>
                              <span>
                                {new Date(reply.created_at).toLocaleString()}
                              </span>
                            </div>
                            {editingReply === reply.id ? (
                              <div className="reply-edit-form">
                                <textarea
                                  value={editReplyText}
                                  onChange={(e) =>
                                    setEditReplyText(e.target.value)
                                  }
                                  className="reply-edit-textarea"
                                  required
                                ></textarea>
                                <div className="reply-edit-actions">
                                  <button
                                    onClick={() =>
                                      handleSaveEdit(reply, topic.id)
                                    }
                                    className="save-edit-button"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="cancel-edit-button"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="reply-content">
                                  {reply.content}
                                </div>
                                {user && reply.user_id === user.id && (
                                  <div className="reply-actions">
                                    <button
                                      onClick={() => handleEditReply(reply)}
                                      className="icon-button edit-reply-button"
                                      title="Editar comentario"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteClick(reply.id, topic.id)
                                      }
                                      className="icon-button delete-reply-button"
                                      title="Eliminar comentario"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-replies">
                      No hay comentarios todavía. ¡Sé la primera en comentar!
                    </div>
                  )}

                  <form
                    onSubmit={(e) => handleCommentSubmit(e, topic.id)}
                    className="comment-form"
                  >
                    <textarea
                      value={activeComment.text}
                      onChange={handleCommentChange}
                      placeholder="Escribe tu comentario..."
                      required
                    ></textarea>
                    <div className="comment-form-actions">
                      <button type="submit" className="submit-comment">
                        Enviar comentario
                      </button>
                      <button
                        type="button"
                        className="cancel-comment"
                        onClick={() =>
                          setActiveComment({ topicId: null, text: "" })
                        }
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="topic-actions">
                <button
                  className="comment-button"
                  onClick={() => handleCommentClick(topic.id)}
                >
                  {activeComment.topicId === topic.id
                    ? "Cerrar comentarios"
                    : "Ver comentarios y participar"}
                </button>

                <div className="report-container">
                  {topicMessages[topic.id]?.show && (
                    <span className="topic-report-message">
                      {topicMessages[topic.id]?.text}
                    </span>
                  )}

                  <div className="report-dropdown-container">
                    <button
                      className="report-button"
                      onClick={() => handleReportClick(topic.id)}
                    >
                      Reportar
                    </button>
                    {reportDropdown.isOpen &&
                      reportDropdown.topicId === topic.id && (
                        <div className="report-dropdown">
                          <button
                            onClick={() =>
                              handleReportSubmit("Contenido inapropiado")
                            }
                          >
                            Contenido inapropiado
                          </button>
                          <button
                            onClick={() => handleReportSubmit("Violencia")}
                          >
                            Violencia
                          </button>
                          <button
                            onClick={() =>
                              handleReportSubmit("Incitación al odio")
                            }
                          >
                            Incitación al odio
                          </button>
                          <button onClick={() => handleReportSubmit("Racismo")}>
                            Racismo
                          </button>
                          <button
                            onClick={() =>
                              handleReportSubmit("Spam o publicidad")
                            }
                          >
                            Spam o publicidad
                          </button>
                          <button
                            onClick={() =>
                              handleReportSubmit("Información falsa o engañosa")
                            }
                          >
                            Información falsa o engañosa
                          </button>
                          <button
                            onClick={() => handleReportSubmit("Otros motivos")}
                          >
                            Otros motivos
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-forum-section">
          <h3>No hay temas disponibles en este momento</h3>
          <p>¡Sé la primera en crear un tema y comenzar una conversación!</p>
        </div>
      )}

      <div className="forum-section-divider"></div>

      {confirmDelete.open && (
        <div className="modal-overlay">
          <div className="modal-confirm">
            <p>¿Estás segura de que deseas eliminar este comentario?</p>
            <div className="modal-actions">
              <button
                className="delete-confirm-btn"
                onClick={handleConfirmDelete}
              >
                Eliminar
              </button>
              <button
                className="cancel-confirm-btn"
                onClick={handleCancelDelete}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;

const { createProxyMiddleware } = require("http-proxy-middleware");

// Después de muchísimos problemas con errores de CORS, esto me ha salvado la vida
// Básicamente redirije las peticiones a Apache local
// Lo configuré para que todas las rutas que empiezan con "/mommatch/backend"
// vayan al localhost, así puedo trabajar con mi backend en PHP sin problemas

module.exports = function (app) {
  app.use(
    "/mommatch/backend",
    createProxyMiddleware({
      target: "http://localhost",
      changeOrigin: true,
      secure: false,
      logLevel: "debug", // Muestra info de depuración por consola
    })
  );
};

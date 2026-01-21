# Configurar GitHub Pages

Para que la aplicación funcione correctamente en GitHub Pages, necesitas configurar el repositorio para servir desde la rama `gh-pages`:

## Pasos:

1. Ve a tu repositorio en GitHub: https://github.com/Imleiva/mommatch_demo

2. Haz clic en **Settings** (Configuración)

3. En el menú lateral izquierdo, busca y haz clic en **Pages**

4. En la sección "Source", selecciona:
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`

5. Haz clic en **Save**

6. GitHub Pages debería reconstruir el sitio automáticamente en unos segundos

7. Tu aplicación estará disponible en: https://imleiva.github.io/mommatch_demo/

## Nota:
- La rama `main` contiene el código fuente (frontend)
- La rama `gh-pages` contiene la aplicación compilada (build)
- GitHub Pages debe servir desde `gh-pages` para que funcione correctamente

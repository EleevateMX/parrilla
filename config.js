/* =====================================================
   GTAHUB · STAFF CONTROL · CONFIGURACIÓN
   =====================================================
   Editar este archivo para conectar el motor Google Sheets.

   PASOS:
   1) Abre tu Google Sheets con los items.
   2) Archivo → Compartir → Publicar en la web.
   3) Selecciona la hoja que quieres exponer y formato CSV.
   4) Copia el link y pégalo abajo en SHEETS_CSV_URL.

   Si lo dejas vacío (""), el dashboard usará el archivo
   local data/items.csv que viaja en el repo.

   ===================================================== */

window.GTAHUB_CONFIG = {

  // URL del CSV publicado del Sheets. Vacío = usar local.
  SHEETS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQr6-C_5uayLgMHSBAWCIzYlWh43BjVWWpEzNAUlIEL_bzZNRMzYx2MurppqIAoSDYtZqE_kEGL6YOB/pubhtml?gid=594018710&single=true",

  // URL de edición del Sheets (para el botón "MOTOR SHEETS").
  // Lleva al STAFF directo a la hoja a editar comentarios o estado.
  SHEETS_EDIT_URL: "https://docs.google.com/spreadsheets/d/1NqCA1C84I4JBpZhM3YEUODvEiMtYMWtL0wzNn_hNc_4/edit",

  // Path del CSV local (fallback). No tocar salvo que cambies la estructura.
  LOCAL_CSV_PATH: "data/items.csv",

  // Refresco automático (segundos). 0 = desactivado.
  AUTO_REFRESH_SECONDS: 0,

  // Modo de aprobación:
  //   "sheets"  → cada acción abre el Sheets en la fila correspondiente (recomendado)
  //   "local"   → cambios solo se guardan en el navegador (preview, no persistente)
  APPROVAL_MODE: "sheets",
};

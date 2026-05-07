/* =====================================================
   GTAHUB · CENTRO DE APROBACIÓN CREATIVA
   Configuración
   =====================================================
   1) Despliega el Apps Script (apps-script/Code.gs) como Aplicación Web.
   2) Pega la URL terminada en /exec en API_URL.
   3) Si dejas API_URL vacío, la app corre en MODO DEMO con
      el archivo data/items.csv (sólo lectura visual).
   ===================================================== */

window.GTAHUB_CONFIG = {
  API_URL: "",   // ej: https://script.google.com/macros/s/AKfycbzo85SgirMOanXH4WZ6FnK3cW-D9FPKT70y-zwOJg0TTkOgPVjvF0raamW8XM02ILAzDw/exec"
  DEMO_CSV: "data/items.csv",
  PRODUCT_NAME: "GTAHUB · Centro de Aprobación Creativa",
  AGENCY_NAME: "Eleevate",
  THEME: {
    accent: "#E51F1F",       // rojo GTAHUB
    accent2: "#FFB400",      // ámbar GTAHUB
    eleevate: "#3B82F6",     // azul Eleevate
  }
};

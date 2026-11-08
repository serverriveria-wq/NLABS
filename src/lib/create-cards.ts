export type CreateCardCfg = { title?: string; description?: string; cta?: string; icon_url?: string; bg_url?: string; bg_color?: string; text_color?: string };
/** Claves y textos por defecto de las tarjetas de «Crear» (los usa la pantalla y el panel Shell). */
export const CREATE_CARD_DEFAULTS: { key: string; label: string; title: string; description: string; cta: string }[] = [
  { key: "editor", label: "Editor avanzado", title: "Crear Collab / Level · editor avanzado", description: "Partes con línea de tiempo y arrastrar y soltar, equipo y solicitudes, configuración de Geometry Dash (BPM, IDs, paleta), recursos, vista previa y publicación con avisos al team.", cta: "Abrir el editor" },
  { key: "art", label: "Arte", title: "Arte", description: "Galería con visor ampliado, categorías, etiquetas, créditos, visibilidad y proyecto relacionado.", cta: "Abrir galería" },
  { key: "music", label: "Música", title: "Música", description: "Biblioteca con reproductor, BPM, género, licencia, créditos, portada y enlaces externos.", cta: "Abrir biblioteca" },
  { key: "quick", label: "Proyecto rápido", title: "Crear proyecto rápido", description: "Formulario clásico con nombre con degradado, participantes y modalidades.", cta: "Comenzar" },
  { key: "edit", label: "Editar proyecto", title: "Editar proyecto", description: "Elige uno de tus proyectos y edítalo: info, galería, progreso, participantes y más.", cta: "Elegir" },
];

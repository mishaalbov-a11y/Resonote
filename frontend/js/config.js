// ── Конфигурация игры ──────────────────────────
// Все игровые константы в одном месте

export const FIELD_SIZE  = 600;
export const WALL_INNER  = 2;

export const BALL_RADIUS = 6;
export const MAX_BALLS   = 3;
export const MAX_SPEED   = 1200;
export const DRAG_DETECT_RADIUS_MULTIPLIER = 3; // зона захвата шарика мышью
export const DRAG_MIN_DIST = 10;                // минимальная длина броска

// Физика
export const GRAVITY  = 800;
export const FRICTION = 1.0;
export const BOUNCE   = 1.0;
export const SUBSTEPS = 8;

// Траектория прицеливания
export const TRAJECTORY_DOTS      = 20;
export const TRAJECTORY_TIME_STEP = 0.05;
export const TRAJECTORY_DOT_MAX_R = 2.3;
export const TRAJECTORY_DOT_MIN_R = 0.8;
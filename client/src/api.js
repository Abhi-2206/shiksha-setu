/**
 * api.js — Central API base URL for ShikshaSetu
 *
 * In development (Vite dev server):
 *   - VITE_API_BASE is not set, so apiBase is ''.
 *   - fetch('/api/students') → Vite proxies it to http://localhost:5001/api/students.
 *
 * In Electron production (file:// protocol):
 *   - Vite injects VITE_API_BASE='http://localhost:5001' at build time.
 *   - fetch('http://localhost:5001/api/students') → hits Express directly.
 *
 * Usage:
 *   import { apiBase } from '../api';
 *   const res = await fetch(`${apiBase}/api/students`, { ... });
 */
export const apiBase = import.meta.env.VITE_API_BASE || '';

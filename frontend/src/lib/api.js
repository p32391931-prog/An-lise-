import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

export const fileUrl = (storagePath) => `${API}/files/${storagePath}`;

// Videos
export const getVideos = () => client.get("/videos").then((r) => r.data);
export const getVideo = (id) => client.get(`/videos/${id}`).then((r) => r.data);
export const createVideo = (body) => client.post("/videos", body).then((r) => r.data);
export const updateVideo = (id, body) => client.put(`/videos/${id}`, body).then((r) => r.data);
export const setVideoStatus = (id, status) => client.patch(`/videos/${id}/status?status=${status}`).then((r) => r.data);
export const deleteVideo = (id) => client.delete(`/videos/${id}`).then((r) => r.data);

// Upload
export const uploadFile = (file, kind = "video", onProgress) => {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  return client
    .post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded * 100) / e.total)),
    })
    .then((r) => r.data);
};

// Athletes
export const getAthletes = () => client.get("/athletes").then((r) => r.data);
export const getAthlete = (id) => client.get(`/athletes/${id}`).then((r) => r.data);
export const createAthlete = (body) => client.post("/athletes", body).then((r) => r.data);
export const updateAthlete = (id, body) => client.put(`/athletes/${id}`, body).then((r) => r.data);
export const deleteAthlete = (id) => client.delete(`/athletes/${id}`).then((r) => r.data);

// Positions
export const getPositions = () => client.get("/positions").then((r) => r.data);
export const createPosition = (body) => client.post("/positions", body).then((r) => r.data);
export const updatePosition = (id, body) => client.put(`/positions/${id}`, body).then((r) => r.data);
export const deletePosition = (id) => client.delete(`/positions/${id}`).then((r) => r.data);

// Fundamentos
export const getFundamentos = () => client.get("/fundamentos").then((r) => r.data);
export const createFundamento = (body) => client.post("/fundamentos", body).then((r) => r.data);
export const updateFundamento = (id, body) => client.put(`/fundamentos/${id}`, body).then((r) => r.data);
export const deleteFundamento = (id) => client.delete(`/fundamentos/${id}`).then((r) => r.data);

// Classificacoes
export const getClassificacoes = (fundamentoId) =>
  client.get("/classificacoes", { params: fundamentoId ? { fundamento_id: fundamentoId } : {} }).then((r) => r.data);
export const createClassificacao = (body) => client.post("/classificacoes", body).then((r) => r.data);
export const updateClassificacao = (id, body) => client.put(`/classificacoes/${id}`, body).then((r) => r.data);
export const deleteClassificacao = (id) => client.delete(`/classificacoes/${id}`).then((r) => r.data);

// Actions
export const getActions = (params = {}) => client.get("/actions", { params }).then((r) => r.data);
export const createAction = (body) => client.post("/actions", body).then((r) => r.data);
export const updateAction = (id, body) => client.put(`/actions/${id}`, body).then((r) => r.data);
export const updateAnnotations = (id, annotations) =>
  client.patch(`/actions/${id}/annotations`, { annotations }).then((r) => r.data);
export const deleteAction = (id) => client.delete(`/actions/${id}`).then((r) => r.data);

// Saved filters
export const getSavedFilters = () => client.get("/saved-filters").then((r) => r.data);
export const createSavedFilter = (body) => client.post("/saved-filters", body).then((r) => r.data);
export const deleteSavedFilter = (id) => client.delete(`/saved-filters/${id}`).then((r) => r.data);

// Settings
export const getSettings = () => client.get("/settings").then((r) => r.data);
export const updateSettings = (body) => client.put("/settings", body).then((r) => r.data);

export const exportCsvUrl = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return `${API}/export/csv${q ? `?${q}` : ""}`;
};

export default client;

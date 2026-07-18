import { useState, useEffect, useRef, useCallback } from "react";
import { fetchBreadList, fetchMealDetail, BREAD_SEARCH_TERM } from "../lib/mealdb.js";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export function useExternalRecipes() {
  const [query, setQuery] = useState(BREAD_SEARCH_TERM);
  const [list, setList] = useState([]);
  const [listStatus, setListStatus] = useState("loading"); // loading | error | ready | prompt
  const [listError, setListError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle"); // idle | loading | error | ready
  const [detailError, setDetailError] = useState(null);

  const detailCache = useRef(new Map()); // id -> detalle normalizado (caché de sesión)

  // Carga del listado para un término dado.
  const loadList = useCallback((term, signal) => {
    setListStatus("loading");
    setListError(null);
    fetchBreadList(term, signal)
      .then((items) => { setList(items); setListStatus("ready"); })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setListError(err.message || "Error de red");
        setListStatus("error");
      });
  }, []);

  // Búsqueda con debounce: cada cambio de término espera 400 ms antes de disparar la
  // petición (cancela el timer anterior si el usuario sigue tecleando) y aborta la
  // petición en vuelo si vuelve a cambiar antes de que responda.
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      setList([]);
      setListStatus("prompt");
      setListError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => loadList(term, ctrl.signal), DEBOUNCE_MS);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query, loadList]);

  // Selección + carga de detalle (con caché de sesión).
  const selectRecipe = useCallback((id) => {
    setSelectedId(id);
    if (detailCache.current.has(id)) {
      setDetail(detailCache.current.get(id));
      setDetailStatus("ready");
      setDetailError(null);
      return;
    }
    setDetail(null);
    setDetailStatus("loading");
    setDetailError(null);
    fetchMealDetail(id)
      .then((d) => {
        detailCache.current.set(id, d);
        setDetail(d);
        setDetailStatus("ready");
      })
      .catch((err) => {
        setDetailError(err.message || "Error de red");
        setDetailStatus("error");
      });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailStatus("idle");
    setDetailError(null);
  }, []);

  const retryList = useCallback(() => loadList(query.trim()), [loadList, query]);
  const retryDetail = useCallback(() => { if (selectedId) selectRecipe(selectedId); },
    [selectedId, selectRecipe]);

  return {
    query, setQuery,
    list, listStatus, listError, retryList,
    selectedId, detail, detailStatus, detailError,
    selectRecipe, clearSelection, retryDetail,
  };
}

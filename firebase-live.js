let SeguimentDb = null;
let SeguimentLastPath = "";
let SeguimentLastSignature = "";
let SeguimentLastStaticSignature = "";
let SeguimentLastWriteAt = 0;
let SeguimentFocusState = null;
let SeguimentIntervalId = null;
let SeguimentStartTimeoutId = null;
let SeguimentCleanupIntervalId = null;
let SeguimentCleanupInProgress = false;
let SeguimentCommentPath = "";
let SeguimentCommentRef = null;
let SeguimentCommentCallback = null;
let SeguimentLastComment = null;
const SEGUIMENT_MS_HORA = 60 * 60 * 1000;
const SEGUIMENT_DEFAULT_TTL_MS = 72 * SEGUIMENT_MS_HORA;

function seguimentNormalitzarText(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function seguimentTipusAmbSeguiment(tipusCorreccio) {
  const tipus = seguimentNormalitzarText(tipusCorreccio);
  return tipus === "teoria" || tipus === "test";
}

function seguimentSafeKey(value) {
  const key = (value || "sense-dada")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.#$\/\[\]\s]+/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return key || "sense-dada";
}

function seguimentGetTtlMs() {
  const hours = Number(window.LIVE_PENDING_TTL_HOURS);
  return Number.isFinite(hours) && hours > 0 ? hours * SEGUIMENT_MS_HORA : SEGUIMENT_DEFAULT_TTL_MS;
}

function seguimentGetCleanupIntervalMs() {
  const interval = Number(window.LIVE_CLEANUP_INTERVAL_MS);
  return Number.isFinite(interval) && interval > 0 ? Math.max(interval, 60000) : SEGUIMENT_MS_HORA;
}

function seguimentGetHeartbeatIntervalMs() {
  const interval = Number(window.LIVE_HEARTBEAT_INTERVAL_MS);
  return Number.isFinite(interval) && interval >= 20000 ? interval : 60000;
}

function seguimentPotEnviarHeartbeat() {
  return document.visibilityState === "visible"
    && (typeof document.hasFocus !== "function" || document.hasFocus());
}

function seguimentGetDades() {
  if (window.SeguimentDadesRenderitzades) {
    try {
      return JSON.parse(JSON.stringify(window.SeguimentDadesRenderitzades));
    } catch (err) {
      return window.SeguimentDadesRenderitzades;
    }
  }

  try {
    const raw = localStorage.getItem("Dades");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("No s'ha pogut llegir Dades per al seguiment.", err);
    return null;
  }
}

function seguimentGetGrup() {
  if (window.GrupSeguiment) {
    return window.GrupSeguiment;
  }

  const params = new URLSearchParams(window.location.search);
  const opcio = Number(params.get("opcio"));
  return Number.isInteger(opcio) && opcio >= 0 ? `T${opcio + 1}` : "T?";
}

function seguimentStripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function seguimentTextToHtml(text) {
  const div = document.createElement("div");
  div.textContent = (text || "").toString();
  return div.innerHTML.replace(/\n/g, "<br>");
}

function seguimentLimitarHtml(html, maxChars) {
  const value = (html || "").toString();
  if (value.length <= maxChars) {
    return value;
  }
  const plainText = seguimentLimitarText(seguimentStripHtml(value), maxChars);
  return seguimentTextToHtml(plainText) + "<p><em>Contingut retallat en el seguiment en viu.</em></p>";
}

function seguimentCompactarEspais(text) {
  return (text || "").toString().replace(/\s+/g, " ").trim();
}

function seguimentLimitarText(text, maxChars) {
  const value = (text || "").toString();
  if (value.length <= maxChars) {
    return value;
  }
  return value.slice(0, maxChars - 1) + "…";
}

function seguimentGetRespostaActual() {
  const editor = document.getElementById("Camp");
  return editor ? editor.innerText : "";
}

function seguimentGetHtmlElementById(id) {
  const element = document.getElementById(id);
  return element ? element.innerHTML : "";
}

function seguimentBuildQuestionHtml(Dades) {
  const apartatHtml = (seguimentGetHtmlElementById("Apartat") || Dades.Apartat || "").toString().trim();
  const questioHtml = (seguimentGetHtmlElementById("Questio") || Dades.Questio || "").toString().trim();
  const apartatText = seguimentCompactarEspais(seguimentStripHtml(apartatHtml));
  const questioText = seguimentCompactarEspais(seguimentStripHtml(questioHtml));

  if (apartatHtml && questioHtml) {
    if (apartatText && questioText && apartatText.indexOf(questioText) !== -1) {
      return apartatHtml;
    }
    if (apartatText && questioText && questioText.indexOf(apartatText) !== -1) {
      return questioHtml;
    }
    return apartatHtml + questioHtml;
  }

  return questioHtml || apartatHtml;
}

function seguimentGetRespostaMathActual(resposta) {
  if (typeof parseTextToLatex === "function") {
    return parseTextToLatex(resposta || "");
  }
  return (resposta || "").toString();
}

function seguimentGetRespostaGuardada() {
  try {
    const raw = localStorage.getItem("Resposta");
    const respostaBuida = {
      respostaGuardada: "",
      correccioGuardada: ""
    };

    if (!raw) {
      return respostaBuida;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return respostaBuida;
    }

    return {
      respostaGuardada: seguimentLimitarHtml(parsed.Resposta || "", window.LIVE_SAVED_RESPONSE_MAX_CHARS || 30000),
      correccioGuardada: seguimentLimitarHtml(parsed.Correction || "", window.LIVE_SAVED_RESPONSE_MAX_CHARS || 30000)
    };
  } catch (err) {
    console.warn("No s'ha pogut llegir la resposta guardada per al seguiment.", err);
    return {
      respostaGuardada: "",
      correccioGuardada: ""
    };
  }
}

function seguimentGetUltimesParaules(text, totalParaules) {
  const paraules = seguimentCompactarEspais(text).split(" ").filter(Boolean);
  if (paraules.length === 0) {
    return "sense text encara";
  }
  return paraules.slice(-totalParaules).join(" ");
}

function seguimentLimitarResposta(text) {
  const maxChars = window.LIVE_RESPONSE_MAX_CHARS || 12000;
  const resposta = (text || "").toString();
  if (resposta.length <= maxChars) {
    return resposta;
  }
  return resposta.slice(resposta.length - maxChars);
}

function seguimentGetSnapshot() {
  const Dades = seguimentGetDades();
  const alumne = sessionStorage.getItem("NomAlumnes");

  if (!Dades || !alumne) {
    return null;
  }

  const respostaActual = seguimentGetRespostaActual();
  const resposta = seguimentLimitarResposta(respostaActual);
  const respostaMath = seguimentLimitarHtml(
    seguimentGetRespostaMathActual(respostaActual),
    window.LIVE_RESPONSE_MATH_MAX_CHARS || 20000
  );
  const respostaGuardada = seguimentGetRespostaGuardada();
  const grup = seguimentGetGrup();
  const exerciciId = (Dades.ID_Exercici || Dades.ID || "sense-exercici").toString();
  const previewWords = window.LIVE_PREVIEW_WORDS || 15;
  const preview = seguimentLimitarText(
    seguimentGetUltimesParaules(resposta, previewWords),
    window.LIVE_PREVIEW_MAX_CHARS || 500
  );
  const preguntaHtml = seguimentBuildQuestionHtml(Dades);
  const preguntaText = seguimentStripHtml(preguntaHtml);

  return {
    grup: grup,
    alumne: alumne,
    apartat: seguimentLimitarText(seguimentStripHtml(Dades.Apartat || ""), 200),
    preguntaTitol: Dades.ID_Exercici ? `Pregunta ${Dades.ID_Exercici}` : "Pregunta",
    pregunta: seguimentLimitarText(preguntaText, window.LIVE_QUESTION_TEXT_MAX_CHARS || 10000),
    preguntaHtml: seguimentLimitarHtml(preguntaHtml, window.LIVE_QUESTION_HTML_MAX_CHARS || 100000),
    solucio: seguimentLimitarHtml(Dades.Resposta || "", window.LIVE_SOLUTION_MAX_CHARS || 50000),
    preview: preview,
    previewMath: seguimentLimitarHtml(
      seguimentGetRespostaMathActual(preview),
      window.LIVE_PREVIEW_MATH_MAX_CHARS || 5000
    ),
    resposta: resposta,
    respostaMath: respostaMath,
    respostaGuardada: respostaGuardada.respostaGuardada,
    correccioGuardada: respostaGuardada.correccioGuardada,
    tipusCorreccio: seguimentLimitarText(Dades.TipusCorreccio || "", 40),
    id: (Dades.ID || "").toString(),
    exerciciId: exerciciId,
    focusState: SeguimentFocusState || (seguimentPotEnviarHeartbeat() ? "VISIBLE" : "HIDDEN"),
    updatedAt: Date.now()
  };
}

function seguimentGetLivePath(snapshot) {
  const key = [
    snapshot.alumne,
    snapshot.id || "sense-id",
    snapshot.exerciciId
  ].map(seguimentSafeKey).join("_");

  return `live/${seguimentSafeKey(snapshot.grup)}/${key}`;
}

function seguimentGetCommentPathFromLivePath(path) {
  return path ? path.replace(/^live\//, "comments/") : "";
}

function seguimentGetCommentPath(snapshot) {
  return seguimentGetCommentPathFromLivePath(seguimentGetLivePath(snapshot));
}

function seguimentMostrarComentari(comment) {
  SeguimentLastComment = comment;
  const panel = document.getElementById("ProfessorCommentPanel");
  const textEl = document.getElementById("ProfessorCommentText");
  if (!panel || !textEl) {
    return;
  }

  const text = comment && comment.text ? comment.text.toString().trim() : "";
  if (!text) {
    textEl.textContent = "";
    panel.hidden = true;
    return;
  }

  textEl.textContent = text;
  panel.hidden = false;
}

function seguimentAturarComentaris() {
  if (SeguimentCommentRef && SeguimentCommentCallback) {
    SeguimentCommentRef.off("value", SeguimentCommentCallback);
  }
  SeguimentCommentPath = "";
  SeguimentCommentRef = null;
  SeguimentCommentCallback = null;
  SeguimentLastComment = null;
  seguimentMostrarComentari(null);
}

function seguimentEscoltarComentaris(path) {
  const commentPath = seguimentGetCommentPathFromLivePath(path);
  if (!SeguimentDb || !commentPath) {
    return;
  }

  if (commentPath === SeguimentCommentPath) {
    seguimentMostrarComentari(SeguimentLastComment);
    return;
  }

  seguimentAturarComentaris();
  SeguimentCommentPath = commentPath;
  SeguimentCommentRef = SeguimentDb.ref(commentPath);
  SeguimentCommentCallback = function (snapshotDb) {
    seguimentMostrarComentari(snapshotDb.val());
  };
  SeguimentCommentRef.on("value", SeguimentCommentCallback, function (err) {
    console.warn("No s'ha pogut llegir el comentari del professor.", err);
  });
}

function seguimentEsMateixAlumne(item, snapshot) {
  return item && snapshot && item.alumne === snapshot.alumne;
}

function seguimentEsborrarDuplicats(snapshot, currentPath) {
  if (!SeguimentDb || !snapshot || !currentPath) {
    return Promise.resolve(0);
  }

  const groupPath = `live/${seguimentSafeKey(snapshot.grup)}`;
  const currentKey = currentPath.split("/").pop();

  return SeguimentDb.ref(groupPath)
    .orderByChild("alumne")
    .equalTo(snapshot.alumne)
    .once("value")
    .then(function (snapshotDb) {
      const updates = {};
      snapshotDb.forEach(function (child) {
        const item = child.val();
        if (child.key !== currentKey && seguimentEsMateixAlumne(item, snapshot)) {
          updates[`${groupPath}/${child.key}`] = null;
          updates[`comments/${seguimentSafeKey(snapshot.grup)}/${child.key}`] = null;
        }
      });

      const total = Object.keys(updates).length;
      if (!total) {
        return 0;
      }

      return SeguimentDb.ref().update(updates).then(function () {
        return total;
      });
    })
    .catch(function (err) {
      console.warn("No s'han pogut esborrar duplicats del seguiment.", err);
      return 0;
    });
}

function seguimentGetStaticSignature(snapshot, path) {
  return [
    path,
    snapshot.grup,
    snapshot.alumne,
    snapshot.apartat,
    snapshot.preguntaTitol,
    snapshot.pregunta,
    snapshot.preguntaHtml,
    snapshot.solucio,
    snapshot.tipusCorreccio,
    snapshot.id,
    snapshot.exerciciId
  ].join("|");
}

function seguimentGetDynamicSignature(snapshot, path) {
  return [
    path,
    snapshot.resposta,
    snapshot.respostaMath,
    snapshot.respostaGuardada,
    snapshot.correccioGuardada,
    snapshot.focusState,
    snapshot.preview,
    snapshot.previewMath
  ].join("|");
}

function seguimentGetDynamicPayload(snapshot) {
  return {
    resposta: snapshot.resposta,
    respostaMath: snapshot.respostaMath,
    respostaGuardada: snapshot.respostaGuardada,
    correccioGuardada: snapshot.correccioGuardada,
    focusState: snapshot.focusState,
    preview: snapshot.preview,
    previewMath: snapshot.previewMath,
    updatedAt: firebase.database.ServerValue.TIMESTAMP
  };
}

function seguimentNetejarCaducats(grup) {
  if (!SeguimentDb || SeguimentCleanupInProgress) {
    return Promise.resolve(0);
  }

  const cutoff = Date.now() - seguimentGetTtlMs();
  const grupKey = seguimentSafeKey(grup || seguimentGetGrup());
  const ref = SeguimentDb.ref(`live/${grupKey}`);
  SeguimentCleanupInProgress = true;

  return ref.orderByChild("updatedAt").endAt(cutoff).once("value")
    .then(function (snapshotDb) {
      const updates = {};
      snapshotDb.forEach(function (child) {
        const item = child.val();
        const updatedAt = Number(item && item.updatedAt);
        if (!Number.isFinite(updatedAt) || updatedAt <= cutoff) {
          updates[`live/${grupKey}/${child.key}`] = null;
          updates[`comments/${grupKey}/${child.key}`] = null;
        }
      });

      const total = Object.keys(updates).length;
      if (!total) {
        return 0;
      }

      return SeguimentDb.ref().update(updates).then(function () {
        return total;
      });
    })
    .catch(function (err) {
      console.warn("No s'ha pogut netejar el seguiment caducat.", err);
      return 0;
    })
    .then(function (total) {
      SeguimentCleanupInProgress = false;
      return total;
    });
}

function seguimentEnviarAra(force) {
  if (!SeguimentDb) {
    return Promise.resolve();
  }

  const snapshot = seguimentGetSnapshot();
  if (!snapshot) {
    seguimentAturarComentaris();
    return Promise.resolve();
  }

  const path = seguimentGetLivePath(snapshot);
  const draftContext = obtenirContextDraft();
  if (draftContext && !DraftRestoreCompleted.has(draftContext.path)
      && !snapshot.resposta) {
    return Promise.resolve();
  }
  seguimentEscoltarComentaris(path);
  const staticSignature = seguimentGetStaticSignature(snapshot, path);
  const dynamicSignature = seguimentGetDynamicSignature(snapshot, path);
  const pathChanged = path !== SeguimentLastPath;
  const staticChanged = staticSignature !== SeguimentLastStaticSignature;
  const heartbeatDue = seguimentPotEnviarHeartbeat()
    && Date.now() - SeguimentLastWriteAt >= seguimentGetHeartbeatIntervalMs();
  const onlyHeartbeat = !force
    && !pathChanged
    && !staticChanged
    && dynamicSignature === SeguimentLastSignature
    && heartbeatDue;

  if (!force
    && !pathChanged
    && !staticChanged
    && dynamicSignature === SeguimentLastSignature
    && !heartbeatDue) {
    return Promise.resolve();
  }

  const ref = SeguimentDb.ref(path);
  const needsFullWrite = pathChanged || staticChanged;
  let writePromise;

  if (needsFullWrite) {
    writePromise = ref.set(Object.assign({}, snapshot, {
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    }));
  } else if (onlyHeartbeat) {
    writePromise = ref.update({ updatedAt: firebase.database.ServerValue.TIMESTAMP });
  } else {
    writePromise = ref.update(seguimentGetDynamicPayload(snapshot))
      .catch(function (err) {
        console.warn("L'actualitzacio parcial ha fallat; es reintenta completa.", err);
        return ref.set(Object.assign({}, snapshot, {
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        }));
      });
  }

  return writePromise
    .then(function () {
      SeguimentLastPath = path;
      SeguimentLastSignature = dynamicSignature;
      SeguimentLastStaticSignature = staticSignature;
      SeguimentLastWriteAt = Date.now();
      if (pathChanged) {
        seguimentEsborrarDuplicats(snapshot, path);
      }
    })
    .catch(function (err) {
      console.warn("No s'ha pogut actualitzar el seguiment en viu.", err);
    });
}

function seguimentEsborrarActual() {
  if (!SeguimentDb) {
    return Promise.resolve();
  }

  const snapshot = seguimentGetSnapshot();
  const path = SeguimentLastPath || (snapshot ? seguimentGetLivePath(snapshot) : "");
  if (!path) {
    return Promise.resolve();
  }

  const commentPath = seguimentGetCommentPathFromLivePath(path);
  const lastPathWhenRemoving = SeguimentLastPath;
  const updates = {};
  updates[path] = null;
  updates[commentPath] = null;

  return SeguimentDb.ref().update(updates)
    .then(function () {
      if (SeguimentLastPath === path || (!lastPathWhenRemoving && SeguimentCommentPath === commentPath)) {
        SeguimentLastPath = "";
        SeguimentLastSignature = "";
        SeguimentLastStaticSignature = "";
        SeguimentLastWriteAt = 0;
        seguimentAturarComentaris();
      }
    })
    .catch(function (err) {
      console.warn("No s'ha pogut esborrar el seguiment en viu.", err);
    });
}

function seguimentIniciar() {
  if (!SeguimentDb || SeguimentIntervalId || SeguimentStartTimeoutId) {
    return;
  }

  const interval = window.LIVE_UPDATE_INTERVAL_MS || 20000;
  const jitterMax = Math.min(window.LIVE_INITIAL_JITTER_MS || 10000, interval);
  const jitter = Math.floor(Math.random() * jitterMax);

  SeguimentStartTimeoutId = window.setTimeout(function () {
    seguimentEnviarAra(true);
    SeguimentIntervalId = window.setInterval(function () {
      seguimentEnviarAra(false);
    }, interval);
  }, jitter);

  // La neteja de caducats la fa seguiment.html. Així cada alumne no ha de
  // llegir el grup complet en iniciar i després cada hora.
}


const DRAFT_TTL_MS = 72 * 60 * 60 * 1000;
const DRAFT_DEBOUNCE_MS = 750;
const DRAFT_CLOCK_TOLERANCE_MS = 5000;
const DRAFT_ROOT = "exercicimates/drafts";
const DraftSyncTimers = new Map();
const DraftRestores = new Map();
const DraftRestoreCompleted = new Set();
let DraftInputGeneration = 0;
let DraftServerOffsetMs = 0;

function obtenirContextDraft() {
  const dades = seguimentGetDades();
  const alumne = sessionStorage.getItem("NomAlumnes");
  const grup = seguimentGetGrup();
  const idExercici = dades && dades.ID_Exercici != null
    ? String(dades.ID_Exercici) : "";
  if (!dades || !alumne || !idExercici || !grup || grup === "T?") {
    return null;
  }
  const alumneKey = seguimentSafeKey(alumne) + "--"
    + encodeURIComponent(alumne).replace(/\./g, "%2E");
  const parts = [seguimentSafeKey(grup), alumneKey, seguimentSafeKey(idExercici)];
  return {
    grup: grup,
    alumne: alumne,
    idExercici: idExercici,
    localKey: "ExercicisMates:draft:" + parts.join(":"),
    path: DRAFT_ROOT + "/" + parts.join("/")
  };
}

function draftCoincideix(context, record) {
  return record && record.grup === context.grup
    && record.alumne === context.alumne
    && String(record.idExercici) === context.idExercici
    && typeof record.resposta === "string";
}

function draftCaducat(record, esRemot) {
  const updatedAt = Number(record && record.updatedAt);
  const ara = Date.now() + (esRemot ? DraftServerOffsetMs : 0);
  return !Number.isFinite(updatedAt) || updatedAt <= 0
    || ara - updatedAt > DRAFT_TTL_MS;
}

function llegirDraftLocal(context) {
  try {
    const raw = localStorage.getItem(context.localKey);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (!draftCoincideix(context, record) || draftCaducat(record)) {
      localStorage.removeItem(context.localKey);
      return null;
    }
    return record;
  } catch (err) {
    console.warn("No s'ha pogut llegir el draft local.", err);
    return null;
  }
}

function guardarDraftLocal(context, resposta) {
  const record = {
    resposta: resposta,
    updatedAt: Date.now(),
    grup: context.grup,
    alumne: context.alumne,
    idExercici: context.idExercici
  };
  try {
    localStorage.setItem(context.localKey, JSON.stringify(record));
  } catch (err) {
    console.warn("No s'ha pogut guardar el draft local.", err);
  }
  return record;
}

function esborrarDraftCaducat(context) {
  if (!SeguimentDb) return Promise.resolve(false);
  return SeguimentDb.ref(context.path).transaction(function (current) {
    return current && draftCaducat(current, true) ? null : undefined;
  }, undefined, false).then(function (result) {
    return Boolean(result.committed);
  }).catch(function (err) {
    console.warn("No s'ha pogut esborrar el draft caducat.", err);
    return false;
  });
}

function llegirDraftFirebase(context) {
  if (!SeguimentDb) return Promise.resolve(null);
  return SeguimentDb.ref(context.path).once("value").then(function (snapshot) {
    const record = snapshot.val();
    if (!record || !draftCoincideix(context, record)) return null;
    if (draftCaducat(record, true)) {
      esborrarDraftCaducat(context);
      return null;
    }
    return record;
  }).catch(function (err) {
    console.warn("No s'ha pogut llegir el draft Firebase.", err);
    return null;
  });
}

function llegirDraftLegacyLive(context) {
  if (!SeguimentDb) return Promise.resolve(null);
  const snapshot = seguimentGetSnapshot();
  if (!snapshot) return Promise.resolve(null);
  return SeguimentDb.ref(seguimentGetLivePath(snapshot)).once("value")
    .then(function (snapshotDb) {
      const item = snapshotDb.val();
      if (!item || item.alumne !== context.alumne
          || String(item.exerciciId) !== context.idExercici
          || typeof item.resposta !== "string" || draftCaducat(item, true)) {
        return null;
      }
      return {
        resposta: item.resposta,
        updatedAt: item.updatedAt,
        grup: context.grup,
        alumne: context.alumne,
        idExercici: context.idExercici
      };
    }).catch(function (err) {
      console.warn("No s'ha pogut migrar el draft antic de live.", err);
      return null;
    });
}

function triarDraft(local, remot) {
  if (!local) return remot;
  if (!remot) return local;
  const diferencia = Number(remot.updatedAt) - (Number(local.updatedAt) + DraftServerOffsetMs);
  if (!local.resposta && remot.resposta && diferencia >= 0) return remot;
  if (!remot.resposta && local.resposta && diferencia <= 0) return local;
  return diferencia > DRAFT_CLOCK_TOLERANCE_MS ? remot : local;
}

function guardarDraftFirebase(context) {
  if (!SeguimentDb) return Promise.resolve(false);
  const pending = DraftRestores.get(context.path);
  return (pending || Promise.resolve()).then(function () {
    const record = llegirDraftLocal(context);
    if (!record) return false;
    return SeguimentDb.ref(context.path).transaction(function (current) {
      if (current && draftCoincideix(context, current)
          && !draftCaducat(current, true)
          && Number(current.updatedAt) > record.updatedAt + DraftServerOffsetMs + DRAFT_CLOCK_TOLERANCE_MS) {
        return undefined;
      }
      return {
        resposta: record.resposta,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        grup: context.grup,
        alumne: context.alumne,
        idExercici: context.idExercici
      };
    }, undefined, false).then(function (result) {
      return Boolean(result.committed);
    });
  }).catch(function (err) {
    console.warn("No s'ha pogut sincronitzar el draft Firebase.", err);
    return false;
  });
}

function programarDraftFirebase(context) {
  const anterior = DraftSyncTimers.get(context.path);
  if (anterior) window.clearTimeout(anterior.timer);
  const timer = window.setTimeout(function () {
    DraftSyncTimers.delete(context.path);
    guardarDraftFirebase(context);
  }, DRAFT_DEBOUNCE_MS);
  DraftSyncTimers.set(context.path, { timer: timer, context: context });
}

function guardarEnInputDraft(resposta) {
  const context = obtenirContextDraft();
  if (!context) return;
  DraftInputGeneration++;
  guardarDraftLocal(context, resposta);
  programarDraftFirebase(context);
}

function restaurarDraft() {
  const context = obtenirContextDraft();
  const editor = document.getElementById("Camp");
  if (!context || !editor) return Promise.resolve(false);
  const generacioInicial = DraftInputGeneration;
  const local = llegirDraftLocal(context);
  if (local && !editor.innerText) {
    editor.innerText = local.resposta;
    if (typeof actualitzarVistaMatematica === "function") {
      actualitzarVistaMatematica();
    }
  }
  const lectura = llegirDraftFirebase(context).then(function (remot) {
    return (!local && !remot ? llegirDraftLegacyLive(context) : Promise.resolve(null))
      .then(function (legacy) {
        const actual = obtenirContextDraft();
        if (document.getElementById("Camp") !== editor || !actual
            || actual.path !== context.path || DraftInputGeneration !== generacioInicial) {
          return false;
        }
        const triat = triarDraft(local, remot) || legacy;
        if (!triat) return false;
        if (editor.innerText !== triat.resposta) {
          editor.innerText = triat.resposta;
          if (typeof actualitzarVistaMatematica === "function") {
            actualitzarVistaMatematica();
          }
        }
        if (triat === remot || triat === legacy) {
          try {
            localStorage.setItem(context.localKey, JSON.stringify(triat));
          } catch (err) {
            console.warn("No s'ha pogut copiar el draft remot al magatzem local.", err);
          }
          if (triat === legacy) programarDraftFirebase(context);
        } else if (!remot || remot.resposta !== local.resposta) {
          programarDraftFirebase(context);
        }
        return true;
      });
  }).finally(function () {
    if (DraftRestores.get(context.path) === lectura) {
      DraftRestores.delete(context.path);
    }
    DraftRestoreCompleted.add(context.path);
    if (window.SeguimentLive) window.SeguimentLive.enviarAra(true);
  });
  DraftRestores.set(context.path, lectura);
  return lectura;
}

function flushDraftsPendents() {
  DraftSyncTimers.forEach(function (entry, path) {
    window.clearTimeout(entry.timer);
    DraftSyncTimers.delete(path);
    guardarDraftFirebase(entry.context);
  });
}

window.DraftResposta = {
  guardarEnInput: guardarEnInputDraft,
  restaurar: restaurarDraft,
  flushPendents: flushDraftsPendents
};
window.addEventListener("pagehide", flushDraftsPendents);
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") flushDraftsPendents();
});

try {
  if (!window.firebase || !window.firebaseConfig) {
    throw new Error("Firebase scripts o configuracio no carregats.");
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }
  SeguimentDb = firebase.database();
  const controlPath = "exercicimates/config/" + seguimentSafeKey(seguimentGetGrup())
    + "/penalitzarAbandonament";
  let penalitzarAbandonament = false;
  window.ControlAbandonament = {
    estaActiu: function () { return penalitzarAbandonament; },
    establir: function (actiu) {
      if (typeof esPerfilProfe !== "function" || !esPerfilProfe()) {
        return Promise.reject(new Error("Control reservat a Profe."));
      }
      return SeguimentDb.ref(controlPath).set(Boolean(actiu));
    }
  };
  SeguimentDb.ref(controlPath).on("value", function (snapshot) {
    penalitzarAbandonament = snapshot.val() === true;
    window.dispatchEvent(new Event("control-abandonament-change"));
  }, function (err) {
    console.warn("No s'ha pogut llegir el control d'eixida.", err);
  });
  function actualitzarPresencia(event) {
    SeguimentFocusState = event.type === "blur" || event.type === "pagehide"
      || document.visibilityState === "hidden" ? "HIDDEN"
      : (seguimentPotEnviarHeartbeat() ? "VISIBLE" : "HIDDEN");
    seguimentEnviarAra(true);
  }
  document.addEventListener("visibilitychange", actualitzarPresencia);
  window.addEventListener("focus", actualitzarPresencia);
  window.addEventListener("pageshow", actualitzarPresencia);
  window.addEventListener("blur", actualitzarPresencia);
  window.addEventListener("pagehide", actualitzarPresencia);
  SeguimentDb.ref(".info/serverTimeOffset").on("value", function (snapshot) {
    const offset = Number(snapshot.val());
    if (Number.isFinite(offset)) DraftServerOffsetMs = offset;
  });

  window.SeguimentLive = {
    enviarAra: seguimentEnviarAra,
    esborrarActual: seguimentEsborrarActual,
    iniciarSeguiment: seguimentIniciar,
    netejarCaducats: seguimentNetejarCaducats,
    provaFirebase: function () {
      if (!SeguimentDb) {
        return Promise.reject(new Error("Firebase no inicialitzat."));
      }
      return SeguimentDb.ref("live/TEST/prova_manual").set({
        grup: "TEST",
        alumne: "Prova manual",
        apartat: "Diagnosi",
        preguntaTitol: "Pregunta prova",
        pregunta: "Si veus aquesta fila, Firebase escriu i seguiment.html llegeix correctament.",
        preguntaHtml: "Calcula \\(2+2\\) i explica el resultat.",
        solucio: "<details><summary>Veure solucio</summary><p>La solucio es \\(2+2=4\\).</p></details>",
        preview: "prova de connexio firebase",
        resposta: "Aquesta entrada es pot esborrar des de Firebase Data.",
        respostaMath: "Aquesta entrada mostra \\(2+2=4\\).",
        respostaGuardada: "",
        correccioGuardada: "",
        tipusCorreccio: "Test",
        id: "prova",
        exerciciId: "prova",
        updatedAt: Date.now()
      });
    }
  };

  window.addEventListener("load", seguimentIniciar);
} catch (err) {
  console.warn("Firebase live no s'ha inicialitzat.", err);
}

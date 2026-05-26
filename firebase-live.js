let SeguimentDb = null;
let SeguimentLastPath = "";
let SeguimentLastSignature = "";
let SeguimentIntervalId = null;
let SeguimentStartTimeoutId = null;
let SeguimentCleanupIntervalId = null;
let SeguimentCleanupInProgress = false;
let SeguimentCommentPath = "";
let SeguimentCommentRef = null;
let SeguimentCommentCallback = null;
let SeguimentLastComment = null;
const SEGUIMENT_MS_HORA = 60 * 60 * 1000;
const SEGUIMENT_DEFAULT_TTL_MS = 48 * SEGUIMENT_MS_HORA;

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

function seguimentGetDades() {
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

  if (!Dades || !alumne || !seguimentTipusAmbSeguiment(Dades.TipusCorreccio)) {
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
  const previewWords = window.LIVE_PREVIEW_WORDS || 5;
  const preguntaHtml = (Dades.Questio || Dades.Apartat || "").toString();
  const preguntaText = seguimentStripHtml(preguntaHtml);

  return {
    grup: grup,
    alumne: alumne,
    apartat: seguimentLimitarText(seguimentStripHtml(Dades.Apartat || ""), window.LIVE_APARTAT_TEXT_MAX_CHARS || 10000),
    preguntaTitol: Dades.ID_Exercici ? `Pregunta ${Dades.ID_Exercici}` : "Pregunta",
    pregunta: seguimentLimitarText(preguntaText, window.LIVE_QUESTION_TEXT_MAX_CHARS || 10000),
    preguntaHtml: seguimentLimitarHtml(preguntaHtml, window.LIVE_QUESTION_HTML_MAX_CHARS || 100000),
    solucio: seguimentLimitarHtml(Dades.Resposta || "", window.LIVE_SOLUTION_MAX_CHARS || 50000),
    preview: seguimentGetUltimesParaules(resposta, previewWords),
    resposta: resposta,
    respostaMath: respostaMath,
    respostaGuardada: respostaGuardada.respostaGuardada,
    correccioGuardada: respostaGuardada.correccioGuardada,
    tipusCorreccio: seguimentLimitarText(Dades.TipusCorreccio || "", 40),
    id: (Dades.ID || "").toString(),
    exerciciId: exerciciId,
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

function seguimentEsMateixaPregunta(item, snapshot) {
  return item
    && item.alumne === snapshot.alumne
    && (item.id || "").toString() === (snapshot.id || "").toString()
    && (item.exerciciId || "").toString() === (snapshot.exerciciId || "").toString();
}

function seguimentEsborrarDuplicats(snapshot, currentPath) {
  if (!SeguimentDb || !snapshot || !currentPath) {
    return Promise.resolve(0);
  }

  const groupPath = `live/${seguimentSafeKey(snapshot.grup)}`;
  const currentKey = currentPath.split("/").pop();

  return SeguimentDb.ref(groupPath).once("value")
    .then(function (snapshotDb) {
      const updates = {};
      snapshotDb.forEach(function (child) {
        const item = child.val();
        if (child.key !== currentKey && seguimentEsMateixaPregunta(item, snapshot)) {
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
  seguimentEscoltarComentaris(path);
  const signature = [
    path,
    snapshot.resposta,
    snapshot.respostaMath,
    snapshot.respostaGuardada,
    snapshot.correccioGuardada,
    snapshot.pregunta,
    snapshot.preguntaHtml
  ].join("|");

  if (!force && signature === SeguimentLastSignature) {
    return Promise.resolve();
  }

  return SeguimentDb.ref(path).set(snapshot)
    .then(function () {
      SeguimentLastPath = path;
      SeguimentLastSignature = signature;
      if (force) {
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

  seguimentNetejarCaducats(seguimentGetGrup());
  if (!SeguimentCleanupIntervalId) {
    SeguimentCleanupIntervalId = window.setInterval(function () {
      seguimentNetejarCaducats(seguimentGetGrup());
    }, seguimentGetCleanupIntervalMs());
  }
}

try {
  if (!window.firebase || !window.firebaseConfig) {
    throw new Error("Firebase scripts o configuracio no carregats.");
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }
  SeguimentDb = firebase.database();

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

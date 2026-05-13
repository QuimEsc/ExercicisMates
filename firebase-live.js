let SeguimentDb = null;
let SeguimentLastPath = "";
let SeguimentLastSignature = "";
let SeguimentIntervalId = null;
let SeguimentStartTimeoutId = null;

function seguimentNormalitzarText(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

function seguimentGetSessionId() {
  let sessionId = sessionStorage.getItem("seguimentLiveSessionId");
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("seguimentLiveSessionId", sessionId);
  }
  return sessionId;
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

function seguimentCompactarEspais(text) {
  return (text || "").toString().replace(/\s+/g, " ").trim();
}

function seguimentGetRespostaActual() {
  const editor = document.getElementById("Camp");
  return editor ? editor.innerText : "";
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

  const resposta = seguimentLimitarResposta(seguimentGetRespostaActual());
  const grup = seguimentGetGrup();
  const exerciciId = (Dades.ID_Exercici || Dades.ID || "sense-exercici").toString();
  const previewWords = window.LIVE_PREVIEW_WORDS || 5;

  return {
    grup: grup,
    alumne: alumne,
    apartat: seguimentStripHtml(Dades.Apartat || ""),
    preguntaTitol: Dades.ID_Exercici ? `Pregunta ${Dades.ID_Exercici}` : "Pregunta",
    pregunta: seguimentStripHtml(Dades.Questio || ""),
    preview: seguimentGetUltimesParaules(resposta, previewWords),
    resposta: resposta,
    tipusCorreccio: Dades.TipusCorreccio || "",
    id: (Dades.ID || "").toString(),
    exerciciId: exerciciId,
    updatedAt: Date.now()
  };
}

function seguimentGetLivePath(snapshot) {
  const key = [
    snapshot.alumne,
    snapshot.id || "sense-id",
    snapshot.exerciciId,
    seguimentGetSessionId()
  ].map(seguimentSafeKey).join("_");

  return `live/${seguimentSafeKey(snapshot.grup)}/${key}`;
}

function seguimentEnviarAra(force) {
  if (!SeguimentDb) {
    return Promise.resolve();
  }

  const snapshot = seguimentGetSnapshot();
  if (!snapshot) {
    return Promise.resolve();
  }

  const path = seguimentGetLivePath(snapshot);
  const signature = `${path}|${snapshot.resposta}|${snapshot.pregunta}`;

  if (!force && signature === SeguimentLastSignature) {
    return Promise.resolve();
  }

  return SeguimentDb.ref(path).set(snapshot)
    .then(function () {
      SeguimentLastPath = path;
      SeguimentLastSignature = signature;
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

  return SeguimentDb.ref(path).remove()
    .then(function () {
      SeguimentLastPath = "";
      SeguimentLastSignature = "";
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
    iniciarSeguiment: seguimentIniciar
  };

  window.addEventListener("load", seguimentIniciar);
} catch (err) {
  console.warn("Firebase live no s'ha inicialitzat.", err);
}

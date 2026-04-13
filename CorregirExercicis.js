// ==========================================================================================================================
// Configuracio de servidors
// ==========================================================================================================================

var Servidor = [
    'https://script.google.com/macros/s/AKfycbxvgyZP2QJm2OtwaOXn8ycYTLKXsSENb8acfVEN93CxC68Xi6PAP0rkXbPsV-rKuuZH/exec',
    'https://script.google.com/macros/s/AKfycbz1uPaLD_6hxD0C_nAK8fkjuFRFIEvkrKFOGnO8mACiwhmngZfD3Vmf3AvGAbnvd6x_7A/exec',
    'https://script.google.com/macros/s/AKfycbxqHmK7Tfp4GlWK664y_YH_lkwnkfeeOkSXCiAthi4QWsb9gT6DNkk7b7TJP3sUF3EROQ/exec',
    'https://script.google.com/macros/s/AKfycbztPjI8M7LbhdtE5zcwzBsYiLjRUP71xE5MbDzgFCl___ilA5APHRVaxZYKCozrcJY/exec'
];

const urlParams = new URLSearchParams(window.location.search);
const servidor = urlParams.get('opcio');

var url = '';
if (servidor === '0') {
    url = Servidor[0];
} else if (servidor === '1') {
    url = Servidor[1];
} else if (servidor === '2') {
    url = Servidor[2];
} else if (servidor === '3') {
    url = Servidor[3];
} else {
    window.location.href = 'https://quimesc.github.io/ExercicisMates';
}

var url2 = 'https://script.google.com/macros/s/AKfycbyEL44Kh46RKxhH7FFx2hNwYxUa3vah2ZTSixPHbol0Eb1ixKhtVRyxV8RWD417j0w/exec';
var RetrasEnviarResposta;

// ==========================================================================================================================
// Utilitats generals
// ==========================================================================================================================

function postJSON(fetchUrl, data) {
    return fetch(fetchUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(function(response) {
        return response.json();
    });
}

function getDades() {
    return JSON.parse(localStorage.getItem('Dades'));
}

function setDades(data) {
    localStorage.setItem('Dades', JSON.stringify(data));
}

function getResposta() {
    return JSON.parse(localStorage.getItem('Resposta'));
}

function setResposta(data) {
    localStorage.setItem('Resposta', JSON.stringify(data));
}

function replaceAll(text, busca, reemplaza) {
    while (text.toString().indexOf(busca) !== -1) {
        text = text.toString().replace(busca, reemplaza);
    }
    return text;
}

function renderMathJaxDelayed(delay) {
    setTimeout(RenderizarMathJax, delay || 500);
}

function renderWhenContentReady(elementId) {
    var element = document.getElementById(elementId);
    if (!element) {
        return;
    }

    if (element.textContent.trim() !== '') {
        renderMathJaxDelayed(500);
        renderMathJaxDelayed(1500);
        return;
    }

    var observer = new MutationObserver(function(mutations, obs) {
        if (element.textContent.trim() !== '') {
            renderMathJaxDelayed(500);
            renderMathJaxDelayed(1500);
            obs.disconnect();
        }
    });

    observer.observe(element, { childList: true, characterData: true, subtree: true });
    renderMathJaxDelayed(3000);
}

function setButton(label, action) {
    var btn = document.getElementById('Btn');
    if (!btn) {
        return;
    }

    btn.innerHTML =
        '<p style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#3AAEE0;border-radius:4px;width:auto;border-top:1px solid #3AAEE0;border-right:1px solid #3AAEE0;border-bottom:1px solid #3AAEE0;border-left:1px solid #3AAEE0;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;">' +
        '<span onclick="' + action + '()" style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;">' +
        '<span style="font-size:16px; line-height:2; word-break: break-word; mso-line-height-alt: 32px;">' + label + '</span>' +
        '</span></p>';
}

function escapeHtml(text) {
    return String(text).split('<').join('&lt;');
}

// ==========================================================================================================================
// Correccio
// ==========================================================================================================================

function corregir(original, contenido) {
    var pos1 = 0;
    var pos2 = 0;
    var accion = '';
    var mod = '';
    var trozo = '';
    var aux = '';
    var numfallos = 0;
    var contenidoOriginal = contenido.trim();

    if (typeof original === 'number') {
        original = original.toString();
    }

    var solucion = original.trim();
    contenido = contenido.trim();

    contenido = contenido.toUpperCase();
    solucion = solucion.toUpperCase();

    contenido = borraAcentos(contenido);
    solucion = borraAcentos(solucion);

    contenido = contenido.replace(/\[\n]+/g, ' ');
    solucion = solucion.replace(/\[\n]+/g, ' ');

    var correccion = distancia(contenido, solucion);

    for (var i = 0; i < correccion.length; i++) {
        accion = correccion.charAt(i);
        switch (accion) {
            case 'X':
                aux = contenido.charAt(pos2);
                trozo = escapeHtml(aux);
                pos1++;
                pos2++;
                break;
            case 'D':
                aux = contenido.charAt(pos2);
                trozo = "<span class='txtSobra'>" + escapeHtml(aux) + '</span>';
                pos2++;
                numfallos++;
                break;
            case 'I':
                aux = solucion.charAt(pos1);
                trozo = "<span class='txtFalta'>" + escapeHtml(aux) + '</span>';
                pos1++;
                numfallos++;
                break;
            case 'S':
                aux = contenido.charAt(pos2);
                trozo = "<span class='txtError'>" + escapeHtml(aux) + '</span>';
                pos2++;
                pos1++;
                numfallos++;
                break;
        }
        mod = mod + trozo;
    }

    var modAux = mod;
    var Dades = getDades();
    var Resultat;

    if (Dades.TipusCorreccio === 'Paraula') {
        modAux = replaceAll(modAux, "<span class='txtFalta'>", '*');
        modAux = replaceAll(modAux, "<span class='txtSobra'>", '*');
        modAux = replaceAll(modAux, "<span class='txtError'>", '*');
        modAux = replaceAll(modAux, '</span>', '');
        modAux = replaceAll(modAux, '* ', '*');

        var numPalabrasTotal = solucion.split(' ').length;
        var arrayModAux = modAux.split(' ');
        var escrit = contenidoOriginal.split(' ');
        var SolucioParaules = solucion.split(' ');
        var numPalabrasCorrectas = 0;

        if (solucion.length < 50) {
            for (var k = 0; k < escrit.length; k++) {
                for (var l = 0; l < SolucioParaules.length; l++) {
                    if (SolucioParaules[l].slice(-1) === ',') {
                        SolucioParaules[l] = SolucioParaules[l].substring(0, SolucioParaules[l].length - 1);
                    }
                    if (escrit[k].slice(-1) === ',') {
                        escrit[k] = escrit[k].substring(0, escrit[k].length - 1);
                    }
                    if (SolucioParaules[l].indexOf(escrit[k]) !== -1) {
                        if (escrit[k].length !== 0) {
                            numPalabrasCorrectas++;
                        }
                    }
                }
            }
        } else {
            for (var m = 0; m < arrayModAux.length; m++) {
                if (arrayModAux[m].indexOf('*') === -1 && arrayModAux[m].length !== 0) {
                    numPalabrasCorrectas++;
                }
            }
        }

        Resultat = {
            Resposta: contenido,
            PercentatgeAcert: numPalabrasCorrectas / numPalabrasTotal
        };
    } else if (Dades.TipusCorreccio === 'Test' || Dades.TipusCorreccio === 'Teoria') {
        Resultat = {
            Resposta: contenido,
            PercentatgeAcert: 1
        };
    } else {
        var LevenshteinPerc = calculateImprovedLevenshteinDistance(original, contenido);
        if (LevenshteinPerc !== 1) {
            LevenshteinPerc = 0;
        }

        Resultat = {
            Resposta: contenido,
            PercentatgeAcert: LevenshteinPerc
        };
    }

    if (localStorage.getItem('Resposta') === null) {
        setResposta(Resultat);
    }

    console.log(Resultat);
    return [mod, Resultat.PercentatgeAcert];
}

function distancia(cadena1, cadena2) {
    var longitud1 = cadena1.length;
    var longitud2 = cadena2.length;
    var d = [];
    var pila = [];
    var respuesta = '';

    for (var i = 0; i <= longitud1; i++) {
        d[i] = [];
        pila[i] = [];
    }

    for (var j = 0; j <= longitud1; j++) {
        d[j][0] = j;
        pila[j][0] = j === 0 ? '' : 'D' + pila[j - 1][0];
    }

    for (var k = 0; k <= longitud2; k++) {
        d[0][k] = k;
        pila[0][k] = k === 0 ? '' : 'I' + pila[0][k - 1];
    }

    for (var x = 1; x <= longitud1; x++) {
        for (var y = 1; y <= longitud2; y++) {
            var caracter_i = cadena1.charAt(x - 1);
            var caracter_j = cadena2.charAt(y - 1);
            var coste = caracter_i === caracter_j ? 0 : 1;

            var insertar = 1 + d[x - 1][y];
            var eliminar = 1 + d[x][y - 1];
            var sustituir = coste + d[x - 1][y - 1];
            var minimo = Math.min(insertar, eliminar, sustituir);

            if (insertar === minimo) {
                pila[x][y] = pila[x - 1][y] + 'D';
            } else if (eliminar === minimo) {
                pila[x][y] = pila[x][y - 1] + 'I';
            } else {
                pila[x][y] = pila[x - 1][y - 1] + (coste ? 'S' : 'X');
            }

            d[x][y] = minimo;
        }
    }

    respuesta = pila[longitud1][longitud2];
    return respuesta;
}

function borraAcentos(cadenaQuitar) {
    var conAcentos = 'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÖÔÚÙÛÜÇ';
    var sinAcentos = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC';
    var nueva = '';

    for (var i = 0; i < cadenaQuitar.length; i++) {
        var encontrada = 0;
        for (var j = 0; j < conAcentos.length; j++) {
            if (cadenaQuitar[i] === conAcentos[j]) {
                nueva += sinAcentos[j];
                encontrada = 1;
                break;
            }
        }
        if (encontrada === 0) {
            nueva += cadenaQuitar[i];
        }
    }

    return nueva;
}

/* ---------------- INICI Levenshtein ---------------- */
function calculateLevenshteinDistance(a, b) {
    var aLimit = a.length + 1;
    var bLimit = b.length + 1;
    var distance = Array(aLimit);

    for (var i = 0; i < aLimit; ++i) {
        distance[i] = Array(bLimit);
    }

    for (var x = 0; x < aLimit; ++x) {
        distance[x][0] = x;
    }

    for (var y = 0; y < bLimit; ++y) {
        distance[0][y] = y;
    }

    for (var i2 = 1; i2 < aLimit; ++i2) {
        for (var j2 = 1; j2 < bLimit; ++j2) {
            var substitutionCost = a[i2 - 1] === b[j2 - 1] ? 0 : 1;
            distance[i2][j2] = Math.min(
                distance[i2 - 1][j2] + 1,
                distance[i2][j2 - 1] + 1,
                distance[i2 - 1][j2 - 1] + substitutionCost
            );
        }
    }

    return 1 - distance[a.length][b.length] / Math.max(a.length, b.length);
}

function calculateImprovedLevenshteinDistance(a, b) {
    return calculateLevenshteinDistance(a.toLowerCase(), b.toLowerCase());
}
/* ---------------- FI Levenshtein ---------------- */

// ==========================================================================================================================
// Inici i carrega d'exercicis
// ==========================================================================================================================

function iniciarProces() {
    sessionStorage.clear();
    localStorage.clear();
    Actualitzar();
}

function Actualitzar() {
    if (sessionStorage.getItem('NomAlumnes') === null) {
        carregarLlistaAlumnes();
        return;
    }

    if (localStorage.getItem('Dades') === null) {
        carregarExerciciDelServidor();
        return;
    }

    pintarExercici(getDades());
}

function carregarLlistaAlumnes() {
    var data = { NomAlumne: '' };

    postJSON(url, data)
        .then(function(data) {
            CrearDom();
            var DivDesplegable = document.getElementById('container');
            var opcions = '<label>Tria el teu nom</label><select id="Alumne">';

            for (var i = 0; i < data.length; i++) {
                opcions += '<option>' + data[i][0] + '</option>';
            }

            opcions += '</select><button onclick="GuardarNomAlumne()">Afegir</button>';
            DivDesplegable.innerHTML = opcions;
        })
        .catch(function(err) {
            console.warn('Something went wrong.', err);
        });
}

function carregarExerciciDelServidor() {
    var NomAlumne = sessionStorage.getItem('NomAlumnes');
    var data = { NomAlumne: NomAlumne };

    CrearDom();

    postJSON(url, data)
        .then(function(data) {
            setDades(data);
            pintarExercici(data);
        })
        .catch(function(err) {
            console.warn('Something went wrong.', err);
        });
}

function pintarExercici(Dades) {
    CrearDom();

    document.getElementById('Apartat').innerHTML = Dades.Apartat || '';
    document.getElementById('Questio').innerHTML = Dades.Questio || '';

    if (Dades.Audio !== '') {
        document.getElementById('Audio').innerHTML =
            '<audio controls autoplay><source src="Audio/' + Dades.Audio + '.mp3" type="audio/mpeg"></audio>';
    }

    renderWhenContentReady('Questio');
}

function CrearDom() {
    var DivContainer = document.getElementById('container');
    var HtmlContainer =
        '<h2 id="Apartat"></h2>' +
        '<h3 id="Questio"></h3>' +
        '<h3 id="Resposta"></h3>' +
        '<h3 id="Correcio"><div id="FormulaMath"><p></p></div></h3>' +
        '<h3 id="Audio"></h3>' +
        '<div id="Camp" contenteditable="true" style="border-style: inset; min-height:150px"></div><br>' +
        '<div id="Btn"></div>';

    DivContainer.innerHTML = HtmlContainer;
    setButton('Comprovar', 'ComencaRutina');
    setTimeout(initEditor, 100);
}

function GuardarNomAlumne() {
    var select = document.getElementById('Alumne');
    var TextSelect = select.options[select.selectedIndex].text;
    sessionStorage.setItem('NomAlumnes', TextSelect);

    fetch('https://api.ipify.org?format=json')
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            sessionStorage.setItem('userIP', data.ip);
        })
        .catch(function(error) {
            console.error('Error al obtener la IP:', error);
        });

    Actualitzar();
}

// ==========================================================================================================================
// Rutina principal
// ==========================================================================================================================

function ComencaRutina() {
    function LlevarCodiHtml(x) {
        var y = x.replaceAll('</span></div>', ')');
        y = y.replaceAll('</span><span class="bar">/</span><span class="fdn">', ')/(');
        y = y.replaceAll('<div class="fraction"><span class="fup">', '(');
        return y;
    }

    function ActualitzarRespostaLocal(Resultat) {
        if (localStorage.getItem('Resposta') === null) {
            setResposta(Resultat);
        }
    }

    function autocorreccio(RespostaAlumne, Dades) {
        document.getElementById('Btn').style.display = 'none';
        document.getElementById('Correcio').innerHTML = '<b style="color:blue;"><u>Generant correcció... Tingueu paciència...</u></b>';

        var payload = {
            question: Dades.Questio,
            answer: RespostaAlumne,
            solution: Dades.Resposta
        };

        postJSON(url2, payload)
            .then(function(data) {
                ActualitzarRespostaLocal(data);

                var Feedback = getResposta();

                setTimeout(function() {
                    setButton('Següent', 'EnviarInfo');
                    document.getElementById('Correcio').innerHTML =
                        '<b style="color:blue;"><u>CORRECCIO: </u></b><br>' + (Feedback.Correction || '');
                    renderWhenContentReady('Correcio');
                }, 1000);

                document.getElementById('Btn').style.display = 'block';
                return data;
            })
            .catch(function(err) {
                console.warn('Something went wrong.', err);
                document.getElementById('Btn').style.display = 'block';
                EnviarInfo();
            });
    }

    var Dades = getDades();
    var RespostaAlumne = obtenerRespuestaAlumno();

    if (Dades.TipusCorreccio === 'Teoria') {
        var RespostaTeoricaTeoria = LlevarCodiHtml(RespostaAlumne.replace(/ /g, '').replace(/<br>/g, ''));
        corregir(Dades.Resposta, RespostaTeoricaTeoria);

        document.getElementById('Resposta').innerHTML =
            '<b style="color:blue;"><u>RESPOSTA: </u></b>' + Dades.Resposta;
        document.getElementById('Correcio').innerHTML =
            '<b style="color:blue;"><u>COPIA LA RESPOSTA CORRECTA I DESPRES PREM SEGÜENT.</u></b>';
        document.getElementById('Camp').innerText = Dades.Resposta;
        setButton('Següent', 'EnviarInfo');
        renderMathJaxDelayed(1000);
        return;
    }

    if (Dades.TipusCorreccio === 'AutoAvaluacio') {
        autocorreccio(RespostaAlumne, Dades);
        return;
    }

    var RespostaTeorica = LlevarCodiHtml(RespostaAlumne.replace(/ /g, '').replace(/<br>/g, ''));
    var Resposta = Dades.Resposta;
    var CorreccioArray = corregir(Resposta, RespostaTeorica);

    if (CorreccioArray[1] < 1) {
        setButton('Corregir', 'ComencaRutina');
        document.getElementById('Resposta').innerHTML =
            '<b style="color:blue;"><u>RESPOSTA: </u></b>' + Dades.Resposta;
        document.getElementById('Correcio').innerHTML =
            '<b style="color:blue;"><u>CORRECCIO: </u></b>' + CorreccioArray[0];

        document.getElementById('Camp').innerText = Resposta;
        RetrasEnviarResposta = setTimeout(EnviarInfo, 7000);
        renderMathJaxDelayed(1000);
    } else {
        EnviarInfo();
    }
}

// ==========================================================================================================================
// Enviament al servidor i pas al següent exercici
// ==========================================================================================================================

function EnviarInfo() {
    if (typeof RetrasEnviarResposta !== 'undefined' && RetrasEnviarResposta) {
        clearTimeout(RetrasEnviarResposta);
    }

    var NomAlumne = sessionStorage.getItem('NomAlumnes');
    var UserIp = sessionStorage.getItem('userIP');
    var Dades = getDades();
    var Respostes = getResposta();

    if (!Dades || !Respostes) {
        console.warn('Falten dades per enviar.');
        return;
    }

    var data = {
        NomAlumne: NomAlumne,
        ID: Dades.ID,
        ID_Exercici: Dades.ID_Exercici,
        RespostaTeorica: Respostes.Resposta,
        Retroalimentacio: Respostes.Correction,
        Percen: Respostes.PercentatgeAcert,
        IP: UserIp
    };

    localStorage.clear();
    setDades(data);

    var DivDesplegable = document.getElementById('container');
    DivDesplegable.innerHTML = '';

    var maxim = 8;
    var Aleatori = Math.floor(Math.random() * maxim) + 1;
    DivDesplegable.innerHTML =
        '<video autoplay loop><source src="img/' + Aleatori + '.mp4" type="video/mp4"></video>';

    postJSON(url, data)
        .then(function(data) {
            localStorage.clear();
            setDades(data);

            setTimeout(function() {
                pintarExercici(data);
            }, 2000);
        })
        .catch(function(err) {
            console.warn('Something went wrong.', err);
        });
}

// ==========================================================================================================================
// Funcions per a fraccions i editor
// ==========================================================================================================================

function parseTextToLatex(text) {
    return text.split('\n').map(function(line) {
        return line.split(/\s+/).map(function(token) {
            var converted = convertToken(token);
            return converted === token ? token : '\\(' + converted + '\\)';
        }).join(' ');
    }).join('<br>');
}

function convertToken(token) {
    var rootMatch = token.match(/^sqrt(\d)(.*)/);
    if (rootMatch) {
        var index = rootMatch[1];
        var radicand = rootMatch[2] || '';
        return '\\sqrt[' + index + ']{' + convertToken(radicand) + '}';
    }

    var fractionParts = token.split('/');
    if (fractionParts.length > 1) {
        var numerator = fractionParts.slice(0, -1).join('/');
        var denominator = fractionParts.pop();
        return '\\frac{' + convertToken(numerator) + '}{' + convertToken(denominator) + '}';
    }

    var powerParts = token.split('^');
    if (powerParts.length > 1) {
        var base = powerParts.slice(0, -1).join('^');
        var exponent = powerParts.pop();
        return convertToken(base) + '^{' + convertToken(exponent) + '}';
    }

    return token;
}

function debounce(fn, delay) {
    var timer = null;
    return function() {
        var args = arguments;
        var context = this;
        clearTimeout(timer);
        timer = setTimeout(function() {
            fn.apply(context, args);
        }, delay);
    };
}

function initEditor() {
    var editor = document.getElementById('Camp');
    var output = document.getElementById('FormulaMath');

    if (!editor || !output) {
        return;
    }

    var debouncedHandle = debounce(function() {
        var rawText = editor.innerText;
        var latexText = parseTextToLatex(rawText);
        output.innerHTML = latexText;
        MathJax.typesetPromise();
    }, 500);

    editor.addEventListener('input', debouncedHandle);
}

function obtenerRespuestaAlumno() {
    var editor = document.getElementById('Camp');
    var rawText = editor ? editor.innerText : '';
    var latexText = parseTextToLatex(rawText);
    console.log('Respuesta procesada del alumno: ', latexText);
    return latexText;
}

function RenderizarMathJax() {
    MathJax.typesetPromise()
        .then(function() {
            console.log('MathJax ha renderizado el contenido correctamente.');
        })
        .catch(function(err) {
            console.error('Error al renderizar MathJax: ', err.message);
        });
}

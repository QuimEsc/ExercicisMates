//==========================================================================================================================
//Funciones que vamos a utilizar cuando el usuario comienza a interactuar con esta aplicacion (Propio del Dictado)
//==========================================================================================================================


// Obtén el parámetro 'servidor' de la URL
    var Servidor =[
        'https://script.google.com/macros/s/AKfycbxvgyZP2QJm2OtwaOXn8ycYTLKXsSENb8acfVEN93CxC68Xi6PAP0rkXbPsV-rKuuZH/exec',
        'https://script.google.com/macros/s/AKfycbz1uPaLD_6hxD0C_nAK8fkjuFRFIEvkrKFOGnO8mACiwhmngZfD3Vmf3AvGAbnvd6x_7A/exec',
        'https://script.google.com/macros/s/AKfycbxqHmK7Tfp4GlWK664y_YH_lkwnkfeeOkSXCiAthi4QWsb9gT6DNkk7b7TJP3sUF3EROQ/exec',
        'https://script.google.com/macros/s/AKfycbztPjI8M7LbhdtE5zcwzBsYiLjRUP71xE5MbDzgFCl___ilA5APHRVaxZYKCozrcJY/exec'
    ]
    var GrupsSeguiment = ["T1", "T2", "T3", "T4"];
    var grupSeguiment = "";
    
    const urlParams = new URLSearchParams(window.location.search);
    const servidor = urlParams.get('opcio');

    // Redirige al servidor correspondiente
    if (servidor === '0') {
        var url = Servidor[0];
        grupSeguiment = GrupsSeguiment[0];
    } else if (servidor === '1') {
        var url = Servidor[1];;
        grupSeguiment = GrupsSeguiment[1];
    } else if (servidor === '2') {
        var url = Servidor[2];;
        grupSeguiment = GrupsSeguiment[2];
    } else if (servidor === '3') {
        var url = Servidor[3];;
        grupSeguiment = GrupsSeguiment[3];
    } else {
        // Si no se especifica un servidor, redirige a un valor por defecto (servidor 1)
        window.location.href = 'https://quimesc.github.io/ExercicisMates';
    }
    window.GrupSeguiment = grupSeguiment;


//var url = 'https://script.google.com/macros/s/AKfycbztPjI8M7LbhdtE5zcwzBsYiLjRUP71xE5MbDzgFCl___ilA5APHRVaxZYKCozrcJY/exec';
var url2 = 'https://script.google.com/macros/s/AKfycbyEL44Kh46RKxhH7FFx2hNwYxUa3vah2ZTSixPHbol0Eb1ixKhtVRyxV8RWD417j0w/exec';
var RetrasEnviarResposta;
var EnviamentPerSortidaEnProces = false;
var EnviamentSheetsPromise = null;
var RESPOSTA_ENVIADA_SHEETS_KEY = "RespostaEnviadaSheets";
var DADES_SEGUENT_SHEETS_KEY = "DadesSeguentSheets";

function normalitzarTipusCorreccio(tipusCorreccio) {
    return (tipusCorreccio || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function esPerfilProfe() {
    return normalitzarTipusCorreccio(sessionStorage.getItem("NomAlumnes")) === "profe";
}

function llegirJsonLocalStorage(clau) {
    try {
        var raw = localStorage.getItem(clau);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.warn("No s'ha pogut llegir " + clau + ".", err);
        return null;
    }
}

function obtenirPayloadRespostaSheets() {
    var NomAlumne = sessionStorage.getItem("NomAlumnes");
    var UserIp = sessionStorage.getItem("userIP");
    var Dades = llegirJsonLocalStorage("Dades");
    var Respostes = llegirJsonLocalStorage("Resposta");

    if (!NomAlumne || !Dades || !Respostes) {
        return null;
    }

    return {
        NomAlumne: NomAlumne,
        ID: Dades.ID,
        ID_Exercici: Dades.ID_Exercici,
        RespostaTeorica: unescapeHtmlForMathText(Respostes.Resposta || ""),
        Retroalimentacio: Respostes.Correction || "",
        Percen: typeof Respostes.PercentatgeAcert === "number" ? Respostes.PercentatgeAcert : 0,
        IP: UserIp || ""
    };
}

function respostaJaEnviadaSheets() {
    return localStorage.getItem(RESPOSTA_ENVIADA_SHEETS_KEY) === "1";
}

function llegirDadesSeguentSheets() {
    return llegirJsonLocalStorage(DADES_SEGUENT_SHEETS_KEY);
}

function guardarEnviamentSheetsComplet(dadesSeguent) {
    localStorage.setItem(RESPOSTA_ENVIADA_SHEETS_KEY, "1");
    localStorage.setItem(DADES_SEGUENT_SHEETS_KEY, JSON.stringify(dadesSeguent));
}

function enviarRespostaSheets() {
    if (respostaJaEnviadaSheets()) {
        return Promise.resolve(llegirDadesSeguentSheets());
    }

    if (EnviamentSheetsPromise) {
        return EnviamentSheetsPromise;
    }

    var data = obtenirPayloadRespostaSheets();
    if (!data) {
        return Promise.reject(new Error("No hi ha dades suficients per enviar la resposta."));
    }

    EnviamentSheetsPromise = fetch(url, {
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify(data)
    })
    .then(function (response) {
        return response.json();
    })
    .then(function (dadesSeguent) {
        guardarEnviamentSheetsComplet(dadesSeguent);
        return dadesSeguent;
    })
    .catch(function (err) {
        console.warn("No s'ha pogut enviar la resposta a Sheets.", err);
        throw err;
    })
    .then(function (dadesSeguent) {
        EnviamentSheetsPromise = null;
        return dadesSeguent;
    }, function (err) {
        EnviamentSheetsPromise = null;
        throw err;
    });

    return EnviamentSheetsPromise;
}

function enviarRespostaSheetsEnComprovar() {
    enviarRespostaSheets().catch(function (err) {
        console.warn("La resposta es reintentara en premer Seguent.", err);
    });
}

function GestionarBlur() {
    if (esPerfilProfe()) {
        return;
    }

    if (EnviamentPerSortidaEnProces) {
        return;
    }

    var dadesGuardades = localStorage.getItem("Dades");
    if (!dadesGuardades) {
        return;
    }

    var Dades;
    try {
        Dades = JSON.parse(dadesGuardades);
    } catch (err) {
        console.warn("No s'ha pogut llegir Dades per al blur.", err);
        return;
    }

    if (normalitzarTipusCorreccio(Dades.TipusCorreccio) !== "teoria") {
        return;
    }

    try {
        EnviamentPerSortidaEnProces = true;
        if (localStorage.getItem("Resposta") == null) {
            ComencaRutina();
        }

        if (localStorage.getItem("Resposta") != null) {
            EnviarInfo();
        }
    } catch (err) {
        EnviamentPerSortidaEnProces = false;
        console.warn("No s'ha pogut enviar la resposta en perdre el focus.", err);
    }
}

function corregir(original, contenido)	{
    var pos1=0;
    var pos2=0;
    var accion="";
    mod="";
    var trozo="";
    var aux="";
    numfallos=0;
    var error=0;
    if(typeof(contenido) !== 'string'){
      var contenido=contenido.toString();
    }
    var respostaOriginalAlumne = contenido;
    var contenido = unescapeHtmlForMathText(contenido).trim();
        
        
        //Comenzamos la corrección

//FALTA ORIGINAL!!
if(typeof(original) === 'number'){
  var original=original.toString();
}
      var solucion = original.trim();
  

//posar frase en minúscula
            contenido = contenido.toUpperCase();
            solucion = solucion.toUpperCase();

//Borrar els accents
            contenido = borraAcentos(contenido);
            solucion = borraAcentos(solucion);

// Borrar els saltos de línia
            contenido = contenido.replace(new RegExp('\[\n]+','g'),' ');
            solucion = solucion.replace(new RegExp('\[\n]+','g'),' ');			
            contenidoOriginal = contenido;


        var correccion=distancia(contenido,solucion);

    
        for(i=0;i<correccion.length;i++)
        {
            accion=correccion.charAt(i);
            switch (accion)
            {
                case "X":
                    aux=contenido.charAt(pos2);
                    trozo=aux.split("<").join("&lt;");
                    pos1++;
                    pos2++;
                    break;
                case "D":
                    aux=contenido.charAt(pos2);
                    trozo="<span class='txtSobra'>"+aux.split("<").join("&lt;")+"</span>";
                    pos2++;
                    numfallos++;
                    break;
                case "I":
                    aux=solucion.charAt(pos1);
                    trozo="<span class='txtFalta'>"+aux.split("<").join("&lt;")+"</span>";
                    pos1++;
                    numfallos++;
                    break;
                case "S":
                    aux=contenido.charAt(pos2);
                    trozo="<span class='txtError'>"+aux.split("<").join("&lt;")+"</span>";
                    pos2++;
                    pos1++;
                    numfallos++;
                    break;
            }
            mod=mod+trozo;  //Frase en HTML donant format als errors
    
        }

        contenido = contenido.split("<").join("&lt;");
        solucion = solucion.split("<").join("&lt;");
        modAux = mod;

//CÀLCUL DEL % D'ERROR PER PARAULA.
//ModAux posa un * a les paraules que son incorrectes
        var Dades = JSON.parse(localStorage.getItem("Dades"));	
        var tipusCorreccio = normalitzarTipusCorreccio(Dades.TipusCorreccio);
        if(tipusCorreccio == "paraula"){
            modAux = replaceAll(modAux,"<span class='txtFalta'>","*");
            modAux = replaceAll(modAux,"<span class='txtSobra'>","*");
            modAux = replaceAll(modAux,"<span class='txtError'>","*");
            modAux = replaceAll(modAux,"</span>","");
            modAux = replaceAll(modAux,"* ","*");
            
            //Calcula % error i guarda en LocalStore
            var numPalabrasTotal = solucion.split(" ").length;
            var arrayModAux = modAux.split(" ");
            var escrit = contenidoOriginal.split(" ");
            var SolucioParaules = solucion.split(" ");

            var numPalabrasCorrectas = 0;
            var numPalabrasErroneas = 0;

            //AFEGIR ESPAI QUAN HI HA MENYS DE 50 CARACTERS JA QUE SI CORREGEIX PARAULES I AQUESTA VA ENMIG TÉ UN ESPAI PREVI I ME LA CONTA COM MALAMENT
                //INICI    --eliminar si canvia, i habilitar la part de sota
                    if(solucion.length < 50){
                        for(k=0;k<escrit.length;k++){													
                            for(l=0;l<SolucioParaules.length;l++){
                                if(SolucioParaules[l].slice(-1) ==","){
                                    SolucioParaules[l]=SolucioParaules[l].substring(SolucioParaules[l].length - 1, 0);
                                }
                                if(escrit[k].slice(-1) ==","){
                                    escrit[k]=escrit[k].substring(escrit[k].length - 1, 0);
                                }
                                //text.slice(-1)
                                //text.substring(text.length - 1, text.length)
                                if(SolucioParaules[l].indexOf(escrit[k]) != -1){
                                    if(escrit[k].length != 0){
                                        numPalabrasCorrectas++;
                                    }										
                                }
                            }
                        }
                    }else{
                        for(k=0;k<arrayModAux.length;k++)
                        {
                            if(arrayModAux[k].indexOf("*") == -1)
                            {
                                if(arrayModAux[k].length != 0)
                                {
                                    numPalabrasCorrectas++;
                                }
                            }
                        }
                    }					
                //FI


            /*for(k=0;k<arrayModAux.length;k++)
            {
                if(arrayModAux[k].indexOf("*") == -1)
                {
                    if(arrayModAux[k].length != 0)
                    {
                        numPalabrasCorrectas++;
                    }
                }
            }
                */

            var PorcentajePalabrasCorrectas = numPalabrasCorrectas/numPalabrasTotal;
                var Resultat = {
                  Resposta: respostaOriginalAlumne,
                  PercentatgeAcert: PorcentajePalabrasCorrectas
                };

            if(localStorage.getItem("Resposta") == null){
                    localStorage.setItem("Resposta", JSON.stringify(Resultat)  );  //Guarda les respostes en Magatzenament Local
                }
        }else if(tipusCorreccio == "test" || tipusCorreccio == "teoria"){
            var Resultat = {
                  Resposta: respostaOriginalAlumne,
                  PercentatgeAcert: 1
                };

            if(localStorage.getItem("Resposta") == null){
                    localStorage.setItem("Resposta", JSON.stringify(Resultat)  );  //Guarda les respostes en Magatzenament Local
                }
        }else{
            var LevenshteinPerc = calculateImprovedLevenshteinDistance(original, contenido);
            if(LevenshteinPerc!=1){var LevenshteinPerc=0}
                var Resultat = {
                  Resposta: respostaOriginalAlumne,
                  PercentatgeAcert: LevenshteinPerc
                };

            if(localStorage.getItem("Resposta") == null){
                    localStorage.setItem("Resposta", JSON.stringify(Resultat)  );  //Guarda les respostes en Magatzenament Local
                }
    }
    
console.log(Resultat);
return [mod, Resultat.PercentatgeAcert];	
}

function replaceAll(text, busca, reemplaza)	{
    while (text.toString().indexOf(busca) != -1)
      text = text.toString().replace(busca,reemplaza);
      return text;
}


//Funcion para comparar la respuesta introducida y el texto correcto

function distancia(cadena1,cadena2)	{
    var longitud1=cadena1.length;
    var longitud2=cadena2.length;
    var i=0;
    var j=0;
    var d=new Array();
    var pila=new Array();
    var caracter_i="";
    var caracter_j="";
    var coste=0;
    var insertar=0;
    var eliminar=0;
    var sustituir=0;
    var minimo=0;
    var maximo=Math.max(longitud1,longitud2);
    var respuesta="";
    for(i=0;i<=longitud1;i++)
    {
        d[i]=new Array();
        pila[i]=new Array();
    }
    for(i=0;i<=longitud1;i++)
    {
        d[i][0]=i;
        if(i==0)
        {
            pila[i][0]="";
        }
        else
        {
            pila[i][0]="D"+pila[i-1][0];
        }
    }
    for(j=0;j<=longitud2;j++)
    {
        d[0][j]=j;
        if(j==0)
        {
            pila[0][j]="";
        }
        else
        {
            pila[0][j]="I"+pila[0][j-1];
        }
    }
    for(i=1;i<=longitud1;i++)
    {
        for(j=1;j<=longitud2;j++)
        {
            caracter_i=cadena1.charAt(i-1);
            caracter_j=cadena2.charAt(j-1);
            if(caracter_i==caracter_j)
            {
                coste=0;
            }
            else
            {
                coste=1;
            }
            insertar=1+(d[i-1][j]);
            eliminar=1+(d[i][j-1]);
            sustituir=coste+(d[i-1][j-1]);
            minimo=Math.min(insertar,eliminar,sustituir);
            if(insertar==minimo)
            {
                pila[i][j]=pila[i-1][j]+"D";
            }
            else if(eliminar==minimo)
            {
                pila[i][j]=pila[i][j-1]+"I";
            }
            else
            {
                if(coste)
                {
                    pila[i][j]=pila[i-1][j-1]+"S";
                }
                else
                {
                    pila[i][j]=pila[i-1][j-1]+"X";
                }
            }
            d[i][j]=minimo;
        }
    }
    respuesta=pila[longitud1][longitud2];
    return(respuesta);
}

//En caso de que la aplicacion no sea sensible a acentos, eliminamos los acentos antes de comparar las cadenas

function borraAcentos(cadenaQuitar) {  
     var conAcentos= "áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÖÔÚÙÛÜÇ";  
    var sinAcentos = "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC";  
    var nueva = "";
    var encontrada = 0;
    for(i=0;i<cadenaQuitar.length;i++) 
    {	
        encontrada = 0;  
        for(j=0;j<conAcentos.length;j++)
        {
             if(cadenaQuitar[i] == conAcentos[j])
            {
                nueva += sinAcentos[j];
                encontrada = 1;
                break;
            } 
           }
           if(encontrada == 0) nueva += cadenaQuitar[i]; 	  
    }
     return nueva;   
 }


/*----------------INICI Levenstein distance algorithm--------------------*/
function calculateLevenshteinDistance(a, b) {
  const aLimit = a.length + 1;
  const bLimit = b.length + 1;
  const distance = Array(aLimit);
  for (let i = 0; i < aLimit; ++i) {
      distance[i] = Array(bLimit);
  }
  for (let i = 0; i < aLimit; ++i) {
      distance[i][0] = i;
  }
  for (let j = 0; j < bLimit; ++j) {
      distance[0][j] = j;
  }
  for (let i = 1; i < aLimit; ++i) {
      for (let j = 1; j <  bLimit; ++j) {
          const substitutionCost = (a[i - 1] === b[j - 1] ? 0 : 1);
          distance[i][j] = Math.min(
              distance[i - 1][j] + 1,
              distance[i][j - 1] + 1,
              distance[i - 1][j - 1] + substitutionCost
          );
      }
  }
  return 1 - (distance[a.length][b.length])/Math.max(a.length, b.length);
};

function calculateImprovedLevenshteinDistance(a, b) {
    return calculateLevenshteinDistance (a.toLowerCase(), b.toLowerCase());
};
/*---------------FI Levenstein distance algorithm---------------------*/
    function iniciarProces(){
        sessionStorage.clear();
        localStorage.clear();
        Actualitzar();


    }

function prepararDadesDespresEnviamentSheets() {
    if (sessionStorage.getItem("NomAlumnes") == null || !respostaJaEnviadaSheets()) {
        return;
    }

    var dadesSeguent = llegirDadesSeguentSheets();
    localStorage.clear();

    if (dadesSeguent) {
        localStorage.setItem("Dades", JSON.stringify(dadesSeguent));
    }
}

  function Actualitzar() {
  prepararDadesDespresEnviamentSheets();
  if(sessionStorage.getItem("NomAlumnes")==null){ //En cas de no tindre nom d'alumnes.
        var data = { NomAlumne: "" }; // Datos a enviar, vacío inicialmente
        fetch(url, {
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify(data)
        })
    .then(function (response) {
            // The API call was successful!
            return response.json();})
    .then(function (data) {
        // This is the JSON from our response
        //console.log(data.Sentence);
        CrearDom();
        var DivDesplegable = document.getElementById("container");  //Selecciona el ID de container
        var opcions="<label>Tria el teu nom</label><select id=\"Alumne\">";
        for(var i=0;i<data.length; i++){
          opcions += "<option>" + data[i][0] + "</option>";
        }
        opcions +="</select><button onclick=\"GuardarNomAlumne()\">Afegir</button>";
        DivDesplegable.innerHTML = opcions;

      }).catch(function (err) {
        // There was an error
        console.warn('Something went wrong.', err);
      })
  }else if(localStorage.getItem("Dades") == null){
        CrearDom();
        var NomAlumne = sessionStorage.getItem("NomAlumnes");
        
        var data = { NomAlumne: NomAlumne }; // Datos a enviar con el nombre del alumno
        fetch(url, {
          method: 'POST',
          contentType: 'application/json',
          body: JSON.stringify(data)
        })
    .then(function (response) {
        // The API call was successful!
        return response.json();
      }).then(function (data) {
        // This is the JSON from our response
        localStorage.setItem("Dades", JSON.stringify(data));
        var Dades = JSON.parse(localStorage.getItem("Dades"));
        document.getElementById("Apartat").innerHTML = Dades.Apartat;
        document.getElementById("Questio").innerHTML = Dades.Questio;
        if(Dades.Audio != ""){
            document.getElementById("Audio").innerHTML =  "<audio controls autoplay><source src=\"Audio/" + Dades.Audio + ".mp3\" type=\"audio/mpeg\"></audio>"
        }
        // 1r) Configura el observer para disparar MathJax al aparecer texto
        const observer = new MutationObserver((mutations, obs) => {
          if (document.getElementById("Questio").textContent.trim() !== "") {
            setTimeout(RenderizarMathJax, 1000);
            obs.disconnect();
          }
            setTimeout(RenderizarMathJax, 5000);
        });
        observer.observe(document.getElementById("Questio"), { childList: true, characterData: true, subtree: true });
        
        // 2n) Si por algún motivo #Questio ya tenía texto (caso raro), ejecútalo ya:
        if (document.getElementById("Questio").textContent.trim() !== "") {
          observer.disconnect();
          setTimeout(RenderizarMathJax, 1000);
        }
        setTimeout(RenderizarMathJax, 5000);
        RestaurarRespostaPendentSeguiment();
      }).catch(function (err) {
        // There was an error
        console.warn('Something went wrong.', err);
      })
    }else{
            CrearDom();
        var Dades = JSON.parse(localStorage.getItem("Dades"));
        document.getElementById("Apartat").innerHTML = Dades.Apartat;
        document.getElementById("Questio").innerHTML = Dades.Questio;
        if(Dades.Audio != ""){
            document.getElementById("Audio").innerHTML =  "<audio controls autoplay><source src=\"Audio/" + Dades.Audio + ".mp3\" type=\"audio/mpeg\"></audio>"
        }
        // 1r) Configura el observer para disparar MathJax al aparecer texto
        const observer = new MutationObserver((mutations, obs) => {
          if (document.getElementById("Questio").textContent.trim() !== "") {
            setTimeout(RenderizarMathJax, 1000);
            obs.disconnect();
          }
            setTimeout(RenderizarMathJax, 5000);
        });
        observer.observe(document.getElementById("Questio"), { childList: true, characterData: true, subtree: true });
        
        // 2n) Si por algún motivo #Questio ya tenía texto (caso raro), ejecútalo ya:
        if (document.getElementById("Questio").textContent.trim() !== "") {
          observer.disconnect();
          setTimeout(RenderizarMathJax, 1000);
        }
          setTimeout(RenderizarMathJax, 5000);
          RestaurarRespostaPendentSeguiment();
    }
}

function RestaurarRespostaPendentSeguiment() {
    window.setTimeout(function () {
        if (
            window.SeguimentLive
            && typeof window.SeguimentLive.restaurarRespostaPendent === "function"
        ) {
            window.SeguimentLive.restaurarRespostaPendent();
        }
    }, 250);
}

function CrearDom(){
  //Crear el nou DOM
    var DivContainer = document.getElementById("container");  //Selecciona el ID de container
    var HtmlContainer = [
        "<h2 id=\"Apartat\"></h2>",
        "<div id=\"Questio\" class=\"exercise-question\"></div>",
        "<section id=\"FormulaMathPanel\" class=\"math-preview-panel\" hidden>",
        "<h3>Vista matematica</h3>",
        "<div id=\"FormulaMath\" class=\"math-preview-output\"></div>",
        "</section>",
        "<section id=\"ProfessorCommentPanel\" class=\"teacher-comment-panel\" hidden>",
        "<h3>Comentari del professor</h3>",
        "<div id=\"ProfessorCommentText\"></div>",
        "</section>",
        "<div id=\"Resposta\" class=\"answer-solution\"></div>",
        "<div id=\"Correcio\" class=\"correction-panel\"></div>",
        "<div id=\"Audio\" class=\"audio-panel\"></div>",
        "<section class=\"student-answer-panel\">",
        "<h3>La meua resposta</h3>",
        "<div id=\"Camp\" class=\"student-answer-editor\" contenteditable=\"true\" role=\"textbox\" aria-label=\"La meua resposta\"></div>",
        "</section>",
        "<div id=\"Btn\" class=\"action-panel\"><p style=\"text-decoration:none;display:inline-block;color:#ffffff;background-color:#3AAEE0;border-radius:4px;width:auto;border-top:1px solid #3AAEE0;border-right:1px solid #3AAEE0;border-bottom:1px solid #3AAEE0;border-left:1px solid #3AAEE0;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;\"><span onclick=\"ComencaRutina()\" style=\"padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;\"><span style=\"font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;\">Comprovar</span></span></p></div>"
    ].join("");

    DivContainer.innerHTML=HtmlContainer; //Crea el nom DOM
    
  // Inicializar el editor después de crear los elementos
    setTimeout(initEditor, 100);  
}

function GuardarNomAlumne(){
    var TextSelect = document.getElementById("Alumne").options[document.getElementById("Alumne").selectedIndex].text;
    sessionStorage.setItem('NomAlumnes', TextSelect);   //Carrega el nom de l'alumne        
    

    //Guardar la IP de qui es connecta
    fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
        // Capturamos la IP y la guardamos en una variable
        let IP = data.ip;
        
        // Guardamos la IP en sessionStorage
        sessionStorage.setItem('userIP', IP);
    })
    .catch(error => {
        console.error('Error al obtener la IP:', error);
    });


    Actualitzar();
}


function ComencaRutina(){

    //Reemplaçar codi HTML en RESPOSTA
    const LlevarCodiHtml = function (x){
            let y = x.replaceAll("</span></div>",")");
            y = y.replaceAll("</span><span class=\"bar\">/</span><span class=\"fdn\">",")/(");
            y = y.replaceAll("<div class=\"fraction\"><span class=\"fup\">","(");
            //y = y.replaceAll(" ","");
            //y = y.replaceAll("<br>","");
        return y;
      };

    const prepararRespostaAlumne = function(resposta, tipusCorreccio){
        var respostaPreparada = resposta;
        if(tipusCorreccio === "paraula"){
            respostaPreparada = respostaPreparada.replace(/ /g, "").replace(/<br>/g, "");
        }
        return LlevarCodiHtml(respostaPreparada);
      };

    const autocorreccio = function(RespostaAlumne){
        function ActualitzarDades(Resultat){
            if(localStorage.getItem("Resposta") == null){
                localStorage.setItem("Resposta", JSON.stringify(Resultat)  );  //Guarda les respostes en Magatzenament Local
            }
        }

            // Ocultar el botón inmediatamente después
            document.getElementById("Btn").style.display = "none";

            document.getElementById("Correcio").innerHTML = "<b style=\"color:blue;\"><u>Generant correcció... Tingueu paciència...</u></b>";

            //INFO a enviar
            const question = Dades.Questio;
            const answer = unescapeHtmlForMathText(RespostaAlumne);
            const solution = Dades.Resposta;        
            const payload = { question, answer, solution };
    
           // Realiza la solicitud POST con fetch
           fetch(url2, {
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify(payload) // Convierte el objeto a JSON
        })
        .then(function (response) {
            // The API call was successful!
            return response.json();
          }).then(function (data) {
            // This is the JSON from our response
            ActualitzarDades(data);
            enviarRespostaSheetsEnComprovar();
/*            localStorage.clear();
            localStorage.setItem("Dades", JSON.stringify(data)  );
*/

            var Feedback = JSON.parse(localStorage.getItem("Resposta"));
      
            //TEMPS ESPERA PER CARREGAR NOVA PÀGINA
                setTimeout(CarregarNouExercici, 1000);
              function CarregarNouExercici(){
                document.getElementById("Btn").innerHTML = "<p style=\"text-decoration:none;display:inline-block;color:#ffffff;background-color:#3AAEE0;border-radius:4px;width:auto;border-top:1px solid #3AAEE0;border-right:1px solid #3AAEE0;border-bottom:1px solid #3AAEE0;border-left:1px solid #3AAEE0;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;\"><span onclick=\"EnviarInfo()\" style=\"padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;\"><span style=\"font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;\">Corregir</span></span></p>"; //Canvia nom botó
                //document.getElementById("Resposta").innerHTML = "<b style=\"color:blue;\"><u>RESPOSTA: </u></b>" + Feedback.Resposta;
                document.getElementById("Correcio").innerHTML = "<b style=\"color:blue;\"><u>CORRECCI&Oacute;: </u></b></br>" + Feedback.Correction;
                //document.getElementById("Correcio").innerHTML = "<b style=\"color:blue;\"><u>CORRECCI&Oacute;: </u></b>" + "$$" +Feedback.Correction + "$$";      //Aço recomana ChatGpt per renderitzar MathJax

        // 1r) Configura el observer para disparar MathJax al aparecer texto
        const observer = new MutationObserver((mutations, obs) => {
          if (document.getElementById("Correcio").textContent.trim() !== "") {
            setTimeout(RenderizarMathJax, 1000);
            obs.disconnect();
          }
        });
            setTimeout(RenderizarMathJax, 5000);
        observer.observe(document.getElementById("Correcio"), { childList: true, characterData: true, subtree: true });
        
        // 2n) Si por algún motivo #Questio ya tenía texto (caso raro), ejecútalo ya:
        if (document.getElementById("Correcio").textContent.trim() !== "") {
          observer.disconnect();
          setTimeout(RenderizarMathJax, 1000);
        }
              }
            setTimeout(RenderizarMathJax, 5000);

              //Visualitzar de nou el BOTÓ.
              document.getElementById("Btn").style.display = "block";

            return data;
          }).catch(function (err) {
            // There was an error
            console.warn('Something went wrong.', err);

            //Visualitzar de nou el BOTÓ.
            document.getElementById("Btn").style.display = "block";

            EnviarInfo();
          });    //envia dades al servidor
    
    };

      //Canvi Nom text i reprodueix audio
    var Dades = JSON.parse(localStorage.getItem("Dades"));   //Carrega tota la info del Magatzem local
    var tipusCorreccio = normalitzarTipusCorreccio(Dades.TipusCorreccio);
    var RespostaAlumne = obtenerRespuestaAlumno(); // Resposta alumne.

    if(tipusCorreccio === "teoria"){
        var RespostaTeoricaTeoria = prepararRespostaAlumne(RespostaAlumne, tipusCorreccio);
        var ResultatTeoria = {
            Resposta: RespostaTeoricaTeoria,
            Correction: "",
            PercentatgeAcert: 1
        };

        localStorage.setItem("Resposta", JSON.stringify(ResultatTeoria));
        enviarRespostaSheetsEnComprovar();

        document.getElementById("Btn").innerHTML = "<p style=\"text-decoration:none;display:inline-block;color:#ffffff;background-color:#3AAEE0;border-radius:4px;width:auto;border-top:1px solid #3AAEE0;border-right:1px solid #3AAEE0;border-bottom:1px solid #3AAEE0;border-left:1px solid #3AAEE0;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;\"><span onclick=\"EnviarInfo()\" style=\"padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;\"><span style=\"font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;\">Següent</span></span></p>";
        document.getElementById("Resposta").innerHTML = "<b style=\"color:blue;\"><u>RESPOSTA: </u></b>" + Dades.Resposta;
        document.getElementById("Correcio").innerHTML = "<b style=\"color:blue;\"><u>COPIA LA RESPOSTA CORRECTA I DESPRÉS PREM SEGÜENT.</u></b>";
        document.getElementById("Camp").innerText = "";
        actualitzarVistaMatematica();
        setTimeout(RenderizarMathJax, 1500);
        return;
    }
      
    if(tipusCorreccio !== "autoavaluacio"){
        var RespostaTeorica = prepararRespostaAlumne(RespostaAlumne, tipusCorreccio);  //Resposta del Quadre de text
        var Resposta =  Dades.Resposta;
        console.log(RespostaTeorica);
        var CorreccioArray = corregir(Resposta, RespostaTeorica);  //[HTML correccio, % acert]
        enviarRespostaSheetsEnComprovar();

        //VISUALITZACIÓ DE LA CORRECCIÓ
        if(CorreccioArray[1]<1){
            document.getElementById("Btn").innerHTML = "<p style=\"text-decoration:none;display:inline-block;color:#ffffff;background-color:#3AAEE0;border-radius:4px;width:auto;border-top:1px solid #3AAEE0;border-right:1px solid #3AAEE0;border-bottom:1px solid #3AAEE0;border-left:1px solid #3AAEE0;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;\"><span onclick=\"ComencaRutina()\" style=\"padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;\"><span style=\"font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;\">Corregir</span></span></p>"; //Canvia nom botó
            document.getElementById("Resposta").innerHTML = "<b style=\"color:blue;\"><u>RESPOSTA: </u></b>" + Dades.Resposta;
            document.getElementById("Correcio").innerHTML = "<b style=\"color:blue;\"><u>CORRECCI&Oacute;: </u></b>" + CorreccioArray[0];
    
    
            //Afegit:  SI ERROR -->  mostra la resposta durant 7 segons i passa a la següent pregunta.
                document.getElementById("Camp").innerText = Resposta;		//escriu la resposta correcta en el quadre.
                actualitzarVistaMatematica();
                RetrasEnviarResposta = setTimeout(EnviarInfo,7000);
            //Fi de l'afegit
            setTimeout(RenderizarMathJax, 1500);
    
        }else{
            EnviarInfo();
        }
    }else{
        var CorreccioArray = autocorreccio(RespostaAlumne);  //AutoAvaluació automàtica
    }

}
function mostrarCarregaSeguentExercici() {
       var DivDesplegable = document.getElementById("container");
       if (!DivDesplegable) {
           return;
       }

       DivDesplegable.innerHTML ="";
       let maxim = 8;
       let Aleatori = Math.floor(Math.random() * maxim) +1;
       DivDesplegable.innerHTML= "<video autoplay loop><source src=\"img/" + Aleatori + ".mp4\" type=\"video/mp4\"></video>";
}

function carregarNouExerciciDesDeDades(data) {
           localStorage.clear();
           localStorage.setItem("Dades", JSON.stringify(data)  );
           var Dades = JSON.parse(localStorage.getItem("Dades"));

           setTimeout(CarregarNouExercici, 2000);
             function CarregarNouExercici(){
                 CrearDom();
                 document.getElementById("Apartat").innerHTML = Dades.Apartat;
                 document.getElementById("Questio").innerHTML = Dades.Questio;
                 if(Dades.Audio != ""){
                     document.getElementById("Audio").innerHTML =  "<audio controls autoplay><source src=\"Audio/" + Dades.Audio + ".mp3\" type=\"audio/mpeg\"></audio>";
                     }

              setTimeout(() => {
                MathJax.typesetPromise()
                  .then(() => {
                    console.log("MathJax ha renderizado el contenido correctamente.");
                  })
                  .catch((err) => console.error("Error al renderizar MathJax: ", err.message));
              }, 500);

              RestaurarRespostaPendentSeguiment();
             }
}



function EnviarInfo(){
         if (typeof RetrasEnviarResposta !== "undefined") {
            clearTimeout(RetrasEnviarResposta);
        }

        mostrarCarregaSeguentExercici();

        enviarRespostaSheets()
        .then(function (data) {
            if (!data) {
                throw new Error("No s'ha rebut la pregunta seguent.");
            }

            if (window.SeguimentLive && typeof window.SeguimentLive.esborrarActual === "function") {
                window.SeguimentLive.esborrarActual();
            }

            carregarNouExerciciDesDeDades(data);
        })
        .catch(function (err) {
           console.warn('Something went wrong.', err);
           Actualitzar();
        });
        return;
         //Borra SetTimeout
         if (typeof RetrasEnviarResposta !== "undefined") {
            clearTimeout(RetrasEnviarResposta);
        }
         //Envia la informació al servidor per actulitzar la BBDD
           // Recupera la información del almacenamiento local y de sesión
           var NomAlumne = sessionStorage.getItem("NomAlumnes"); // Nombre del alumno
           var UserIp = sessionStorage.getItem("userIP"); // Dirección IP del usuario
           var Dades = JSON.parse(localStorage.getItem("Dades")); // Datos de ejercicios
           var Respostes = JSON.parse(localStorage.getItem("Resposta")); // Respuestas
   
           // Crea el objeto de datos a enviar
           var data = {
           NomAlumne: NomAlumne,
           ID: Dades.ID,
           ID_Exercici: Dades.ID_Exercici,
           RespostaTeorica: Respostes.Resposta,
           Retroalimentacio: Respostes.Correction,
           Percen: Respostes.PercentatgeAcert,
           IP: UserIp
           };

        if (window.SeguimentLive && typeof window.SeguimentLive.esborrarActual === "function") {
            window.SeguimentLive.esborrarActual();
        }
   
        //BORRA LocalStore
        localStorage.clear();
        localStorage.setItem("Dades", JSON.stringify(data)  )

       //BORRA EL DOM
       var DivDesplegable = document.getElementById("container");  //Selecciona el ID de container
       DivDesplegable.innerHTML ="";
       //FI borrar DOM
       
       //Publica imatge d'ÀNIM
       let maxim = 8;  //Nombre mmàxim fotos
       let Aleatori = Math.floor(Math.random() * maxim) +1;
       DivDesplegable.innerHTML= "<video autoplay loop><source src=\"img/" + Aleatori + ".mp4\" type=\"video/mp4\"></video>"; //Crea animació ànim 	
   
   
       //Fi publicació Ànim
   
   
       // Realiza la solicitud POST con fetch
       fetch(url, {
           method: 'POST',
           contentType: 'application/json',
           body: JSON.stringify(data) // Convierte el objeto a JSON
       })
       .then(function (response) {
           // The API call was successful!
           return response.json();
         }).then(function (data) {
           // This is the JSON from our response
           //console.log(data.Sentence);
           localStorage.clear();
           localStorage.setItem("Dades", JSON.stringify(data)  );
           var Dades = JSON.parse(localStorage.getItem("Dades"));
     
           //TEMPS ESPERA PER CARREGAR NOVA PÀGINA
               setTimeout(CarregarNouExercici, 2000);
             function CarregarNouExercici(){
                 CrearDom();		//Crea el nou dom
                 document.getElementById("Apartat").innerHTML = Dades.Apartat;
                 document.getElementById("Questio").innerHTML = Dades.Questio;
                 if(Dades.Audio != ""){
                     document.getElementById("Audio").innerHTML =  "<audio controls autoplay><source src=\"Audio/" + Dades.Audio + ".mp3\" type=\"audio/mpeg\"></audio>"
                     }
                 
                   // Asegúrate de que MathJax renderice el contenido después de que se haya actualizado
              setTimeout(() => {
                MathJax.typesetPromise()
                  .then(() => {
                    console.log("MathJax ha renderizado el contenido correctamente.");
                  })
                  .catch((err) => console.error("Error al renderizar MathJax: ", err.message));
              }, 500); // Retraso pequeño para asegurar que el DOM está listo
                   
              RestaurarRespostaPendentSeguiment();
             }    
         }).catch(function (err) {
           // There was an error
           console.warn('Something went wrong.', err);
         });    //envia dades al servidor
}


//FUNCIONS PER A FRACCIONS
// Funciones globales para convertir texto mixto a LaTeX sin perder el texto normal
function parseTextToLatex(text) {
    return text.split(/\r?\n/).map(function(line) {
        return renderMixedMathLine(line);
    }).join('<br>');
}

function escapeHtmlForMathRender(value) {
    return (value || "").toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function unescapeHtmlForMathText(value) {
    return (value || "").toString()
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function renderMixedMathLine(line) {
    return renderLineWithSpecialMath(line);
}

function renderLineWithSpecialMath(line) {
    var result = "";
    var index = 0;

    while (index < line.length) {
        var special = findNextSpecialMathConstruct(line, index);
        if (!special) {
            result += renderPlainMixedMathSegment(line.slice(index));
            break;
        }

        if (special.start > index) {
            result += renderPlainMixedMathSegment(line.slice(index, special.start));
        }

        result += "\\(" + escapeHtmlForMathRender(special.latex) + "\\)";
        index = special.end;
    }

    return result;
}

function renderPlainMixedMathSegment(line) {
    var tokens = tokenizeMixedLine(line);
    var result = "";
    var i = 0;
    var trimmedLine = line.trim();
    var trimmedStart = line.search(/\S/);
    var trimmedEnd = trimmedLine === "" ? -1 : trimmedStart + trimmedLine.length;

    while (i < tokens.length) {
        if (!canStartMathSegment(tokens[i])) {
            result += escapeHtmlForMathRender(tokens[i].value);
            i++;
            continue;
        }

        var bestEnd = -1;
        var bestLatex = "";

        for (var j = i; j < tokens.length; j++) {
            if (!isMathCandidateToken(tokens[j])) {
                break;
            }

            if (tokens[j].type === "space") {
                continue;
            }

            var rawCandidate = line.slice(tokens[i].start, tokens[j].end);
            var trimmedCandidate = rawCandidate.trim();
            var parsedCandidate = tryParseMathExpression(trimmedCandidate);

            if (parsedCandidate && shouldRenderAsMath(parsedCandidate, trimmedCandidate, tokens[i].start, tokens[j].end, trimmedStart, trimmedEnd)) {
                bestEnd = j;
                bestLatex = "\\(" + escapeHtmlForMathRender(parsedCandidate.latex) + "\\)";
            }
        }

        if (bestEnd !== -1) {
            result += bestLatex;
            i = bestEnd + 1;
        } else {
            result += escapeHtmlForMathRender(tokens[i].value);
            i++;
        }
    }

    return result;
}

function findNextSpecialMathConstruct(line, startIndex) {
    for (var i = startIndex; i < line.length; i++) {
        var special = parseSpecialMathConstructAt(line, i);
        if (special) {
            special.start = i;
            if (isSpecialConstructPartOfMathExpression(line, special)) {
                continue;
            }
            return special;
        }
    }

    return null;
}

function isSpecialConstructPartOfMathExpression(line, special) {
    if (!special) {
        return false;
    }

    var previousIndex = special.start - 1;
    while (previousIndex >= 0 && /\s/.test(line.charAt(previousIndex))) {
        previousIndex--;
    }

    var nextIndex = skipSpaces(line, special.end);
    var previousChar = previousIndex >= 0 ? line.charAt(previousIndex) : "";
    var nextChar = nextIndex < line.length ? line.charAt(nextIndex) : "";

    return /[=<>+\-*/^(|]/.test(previousChar) || /[=<>+\-*/^)|]/.test(nextChar);
}

function parseSpecialMathConstructAt(line, index) {
    if (!hasKeywordBoundaryBefore(line, index)) {
        return null;
    }

    var matrix = parseMatrixConstruct(line, index, "mat", "pmatrix");
    if (matrix) {
        return matrix;
    }

    var determinant = parseMatrixConstruct(line, index, "det", "vmatrix");
    if (determinant) {
        return determinant;
    }

    var system = parseSystemConstruct(line, index);
    if (system) {
        return system;
    }

    var limit = parseLimitConstruct(line, index);
    if (limit) {
        return limit;
    }

    return parseIntegralConstruct(line, index);
}

function parseMatrixConstruct(line, index, keyword, environment) {
    var afterKeyword = matchSpecialKeyword(line, index, keyword);
    if (afterKeyword === -1) {
        return null;
    }

    var openIndex = skipSpaces(line, afterKeyword);
    if (line.charAt(openIndex) !== "(") {
        return null;
    }

    var block = readParenthesizedContent(line, openIndex);
    if (!block) {
        return null;
    }

    var rows = splitTopLevel(block.content, ";")
        .map(function(row) {
            return splitMatrixRow(row)
                .map(function(cell) {
                    return cell === "__MID__" ? "\\mid" : mathExpressionToLatex(cell);
                })
                .join("&");
        })
        .filter(Boolean);

    if (!rows.length) {
        return null;
    }

    return {
        end: block.end,
        latex: "\\begin{" + environment + "}" + rows.join("\\\\") + "\\end{" + environment + "}"
    };
}

function parseMatrixExpressionToken(line, index) {
    if (!hasKeywordBoundaryBefore(line, index)) {
        return null;
    }

    var matrix = parseMatrixConstruct(line, index, "mat", "pmatrix");
    if (matrix) {
        matrix.keyword = "mat";
        return matrix;
    }

    var determinant = parseMatrixConstruct(line, index, "det", "vmatrix");
    if (determinant) {
        determinant.keyword = "det";
        return determinant;
    }

    return null;
}

function parseSystemConstruct(line, index) {
    var afterKeyword = matchSpecialKeyword(line, index, "sis");
    if (afterKeyword === -1) {
        return null;
    }

    var openIndex = skipSpaces(line, afterKeyword);
    if (line.charAt(openIndex) !== "(") {
        return null;
    }

    var block = readParenthesizedContent(line, openIndex);
    if (!block) {
        return null;
    }

    var equations = splitTopLevel(block.content, ";")
        .map(mathExpressionToLatex)
        .filter(Boolean);

    if (!equations.length) {
        return null;
    }

    return {
        end: block.end,
        latex: "\\left\\{\\begin{array}{l}" + equations.join("\\\\") + "\\end{array}\\right."
    };
}

function parseLimitConstruct(line, index) {
    var afterKeyword = matchSpecialKeyword(line, index, "lim");
    if (afterKeyword === -1) {
        return null;
    }

    var openIndex = skipSpaces(line, afterKeyword);
    if (line.charAt(openIndex) !== "(") {
        return null;
    }

    var block = readParenthesizedContent(line, openIndex);
    if (!block) {
        return null;
    }

    var arrowIndex = block.content.indexOf("->");
    if (arrowIndex === -1) {
        return null;
    }

    var variable = block.content.slice(0, arrowIndex).trim();
    var target = block.content.slice(arrowIndex + 2).trim();
    if (!variable || !target) {
        return null;
    }

    var expressionStart = skipSpaces(line, block.end);
    var expression = line.slice(expressionStart).trim();
    var latex = "\\lim_{" + variable + "\\to " + limitTargetToLatex(target) + "}";
    if (expression) {
        latex += " " + mathExpressionToLatex(expression);
    }

    return {
        end: line.length,
        latex: latex
    };
}

function parseIntegralConstruct(line, index) {
    var afterKeyword = matchSpecialKeyword(line, index, "int");
    if (afterKeyword === -1) {
        return null;
    }

    var cursor = skipSpaces(line, afterKeyword);
    var lowerLimit = "";
    var upperLimit = "";

    if (line.charAt(cursor) === "(") {
        var block = readParenthesizedContent(line, cursor);
        if (!block) {
            return null;
        }

        var functionCursor = skipSpaces(line, block.end);
        if (line.charAt(functionCursor) === "(") {
            var functionBlock = readParenthesizedContent(line, functionCursor);
            if (!functionBlock) {
                return null;
            }

            if (block.content.trim() !== "") {
                var newStyleLimits = splitTopLevel(block.content, ",");
                if (newStyleLimits.length !== 2) {
                    return null;
                }

                lowerLimit = mathExpressionToLatex(newStyleLimits[0]);
                upperLimit = mathExpressionToLatex(newStyleLimits[1]);
            }

            var newStyleIntegrand = functionBlock.content.trim();
            if (!newStyleIntegrand) {
                return null;
            }

            var differentialStart = skipSpaces(line, functionBlock.end);
            var leadingDifferential = findLeadingDifferential(line.slice(differentialStart));
            if (!leadingDifferential) {
                return null;
            }

            return {
                end: differentialStart + leadingDifferential.end,
                latex: buildIntegralLatex(lowerLimit, upperLimit, newStyleIntegrand, leadingDifferential.variable)
            };
        }

        var limits = splitTopLevel(block.content, ",");
        if (limits.length !== 2) {
            return null;
        }

        lowerLimit = mathExpressionToLatex(limits[0]);
        upperLimit = mathExpressionToLatex(limits[1]);
        cursor = skipSpaces(line, block.end);
    }

    var rest = line.slice(cursor);
    var differential = findDifferential(rest);
    if (!differential) {
        return null;
    }

    var integrand = rest.slice(0, differential.start).trim();
    if (!integrand) {
        return null;
    }

    return {
        end: cursor + differential.end,
        latex: buildIntegralLatex(lowerLimit, upperLimit, integrand, differential.variable)
    };
}

function buildIntegralLatex(lowerLimit, upperLimit, integrand, variable) {
    var latex = "\\int";
    if (lowerLimit || upperLimit) {
        latex += "_{" + lowerLimit + "}^{" + upperLimit + "}";
    }
    return latex + " " + mathExpressionToLatex(integrand) + "\\,d" + variable;
}

function mathExpressionToLatex(expression) {
    var value = (expression || "").toString().trim();
    if (!value) {
        return "";
    }

    var parsed = tryParseMathExpression(value);
    if (parsed) {
        return parsed.latex;
    }

    return value.replace(/\binf\b/gi, "\\infty");
}

function matchSpecialKeyword(line, index, keyword) {
    if (line.slice(index, index + keyword.length).toLowerCase() !== keyword) {
        return -1;
    }

    var afterKeyword = index + keyword.length;
    if (!hasKeywordBoundaryAfter(line, afterKeyword)) {
        return -1;
    }

    return afterKeyword;
}

function hasKeywordBoundaryBefore(line, index) {
    return index === 0 || !/[A-Za-z0-9_]/.test(line.charAt(index - 1));
}

function hasKeywordBoundaryAfter(line, index) {
    return index >= line.length || !/[A-Za-z0-9_]/.test(line.charAt(index));
}

function skipSpaces(line, index) {
    while (index < line.length && /\s/.test(line.charAt(index))) {
        index++;
    }
    return index;
}

function readParenthesizedContent(line, openIndex) {
    var depth = 0;
    for (var i = openIndex; i < line.length; i++) {
        var chunk = line.charAt(i);
        if (chunk === "(") {
            depth++;
        } else if (chunk === ")") {
            depth--;
            if (depth === 0) {
                return {
                    content: line.slice(openIndex + 1, i),
                    end: i + 1
                };
            }
        }
    }

    return null;
}

function splitTopLevel(text, separator) {
    var parts = [];
    var start = 0;
    var depth = 0;

    for (var i = 0; i < text.length; i++) {
        var chunk = text.charAt(i);
        if (chunk === "(") {
            depth++;
        } else if (chunk === ")") {
            depth = Math.max(0, depth - 1);
        } else if (chunk === separator && depth === 0) {
            parts.push(text.slice(start, i).trim());
            start = i + 1;
        }
    }

    parts.push(text.slice(start).trim());
    return parts.filter(function(part) {
        return part !== "";
    });
}

function splitMatrixRow(row) {
    var cells = [];
    var start = 0;
    var depth = 0;

    for (var i = 0; i < row.length; i++) {
        var chunk = row.charAt(i);
        if (chunk === "(") {
            depth++;
        } else if (chunk === ")") {
            depth = Math.max(0, depth - 1);
        } else if ((chunk === "," || chunk === "|") && depth === 0) {
            var cell = row.slice(start, i).trim();
            if (cell) {
                cells.push(cell);
            }
            if (chunk === "|") {
                cells.push("__MID__");
            }
            start = i + 1;
        }
    }

    var lastCell = row.slice(start).trim();
    if (lastCell) {
        cells.push(lastCell);
    }

    return cells;
}

function limitTargetToLatex(target) {
    var value = target.trim();
    var side = "";
    if (value.length > 1 && (value.slice(-1) === "+" || value.slice(-1) === "-")) {
        side = "^" + value.slice(-1);
        value = value.slice(0, -1);
    }

    if (/^inf$/i.test(value)) {
        value = "\\infty";
    } else if (/^-inf$/i.test(value)) {
        value = "-\\infty";
    } else {
        value = mathExpressionToLatex(value);
    }

    return value + side;
}

function findDifferential(text) {
    for (var i = 0; i < text.length - 1; i++) {
        var previous = i === 0 ? " " : text.charAt(i - 1);
        var current = text.charAt(i);
        var variable = text.charAt(i + 1);
        var next = i + 2 >= text.length ? " " : text.charAt(i + 2);

        if (current === "d" && /[A-Za-z]/.test(variable) && /\s/.test(previous) && (i + 2 >= text.length || /\s|[.,;:!?=]/.test(next))) {
            return {
                start: i,
                end: i + 2,
                variable: variable
            };
        }
    }

    return null;
}

function findLeadingDifferential(text) {
    var start = skipSpaces(text, 0);
    var current = text.charAt(start);
    var variable = text.charAt(start + 1);
    var next = start + 2 >= text.length ? " " : text.charAt(start + 2);

    if (current === "d" && /[A-Za-z]/.test(variable) && (start + 2 >= text.length || /\s|[.,;:!?=]/.test(next))) {
        return {
            start: start,
            end: start + 2,
            variable: variable
        };
    }

    return null;
}

function tokenizeMixedLine(line) {
    var tokens = [];
    var i = 0;

    while (i < line.length) {
        var start = i;
        var chunk = line.charAt(i);

        if (/\s/.test(chunk)) {
            while (i < line.length && /\s/.test(line.charAt(i))) {
                i++;
            }
            tokens.push({ type: "space", value: line.slice(start, i), start: start, end: i });
            continue;
        }

        var mixedMatrixToken = parseMatrixExpressionToken(line, i);
        if (mixedMatrixToken) {
            tokens.push({
                type: "specialMath",
                value: line.slice(i, mixedMatrixToken.end),
                latex: mixedMatrixToken.latex,
                start: i,
                end: mixedMatrixToken.end
            });
            i = mixedMatrixToken.end;
            continue;
        }

        if ((chunk === "<" || chunk === ">") && line.charAt(i + 1) === "=") {
            tokens.push({ type: "math", value: line.slice(i, i + 2), start: i, end: i + 2 });
            i += 2;
            continue;
        }

        if (/[0-9]/.test(chunk)) {
            i++;
            while (i < line.length && /[0-9.,]/.test(line.charAt(i))) {
                i++;
            }
            tokens.push({ type: "number", value: line.slice(start, i), start: start, end: i });
            continue;
        }

        if (/[A-Za-zÀ-ÿ]/.test(chunk)) {
            i++;
            while (i < line.length && /[A-Za-zÀ-ÿ]/.test(line.charAt(i))) {
                i++;
            }
            tokens.push({ type: "word", value: line.slice(start, i), start: start, end: i });
            continue;
        }

        if ("()+-*/^=<>|".indexOf(chunk) !== -1) {
            tokens.push({ type: "math", value: chunk, start: i, end: i + 1 });
            i++;
            continue;
        }

        tokens.push({ type: "other", value: chunk, start: i, end: i + 1 });
        i++;
    }

    return tokens;
}

function canStartMathSegment(token) {
    return token.type !== "space" && token.type !== "other";
}

function isMathCandidateToken(token) {
    return token.type !== "other";
}

function shouldRenderAsMath(parsedCandidate, trimmedCandidate, start, end, trimmedStart, trimmedEnd) {
    if (!parsedCandidate || !trimmedCandidate) {
        return false;
    }

    if (containsStructuredMath(parsedCandidate.ast)) {
        return true;
    }

    if (trimmedStart === -1) {
        return false;
    }

    var coversWholeLine = start === trimmedStart && end === trimmedEnd;
    if (!coversWholeLine) {
        return false;
    }

    return isStandaloneMathAtom(parsedCandidate.tokens);
}

function containsStructuredMath(node) {
    if (!node) {
        return false;
    }

    if (node.type === "binary" || node.type === "relation" || node.type === "unary" || node.type === "power" || node.type === "sqrt" || node.type === "func" || node.type === "probability" || node.type === "specialMath") {
        return true;
    }

    return false;
}

function isStandaloneMathAtom(tokens) {
    if (!tokens || tokens.length !== 1) {
        return false;
    }

    if (tokens[0].type === "number") {
        return true;
    }

    if (tokens[0].type === "name") {
        return tokens[0].value.length <= 2 || tokens[0].value.toLowerCase() === "pi";
    }

    return false;
}

function tryParseMathExpression(expression) {
    if (!expression) {
        return null;
    }

    var tokens = tokenizeMathExpression(expression);
    if (!tokens || tokens.length === 0) {
        return null;
    }

    var state = {
        tokens: tokens,
        current: 0
    };

    var ast = parseRelationExpression(state);
    if (!ast || state.current !== tokens.length) {
        return null;
    }

    return {
        ast: ast,
        latex: astToLatex(ast),
        tokens: tokens
    };
}

function tokenizeMathExpression(expression) {
    var tokens = [];
    var i = 0;

    while (i < expression.length) {
        var start = i;
        var chunk = expression.charAt(i);

        if (/\s/.test(chunk)) {
            i++;
            continue;
        }

        var matrixToken = parseMatrixExpressionToken(expression, i);
        if (matrixToken) {
            tokens.push({
                type: "specialMath",
                value: expression.slice(i, matrixToken.end),
                latex: matrixToken.latex,
                start: i,
                end: matrixToken.end
            });
            i = matrixToken.end;
            continue;
        }

        if (expression.slice(i, i + 4).toLowerCase() === "sqrt" && !/[A-Za-zÀ-ÿ]/.test(expression.charAt(i + 4) || "")) {
            tokens.push({ type: "sqrt", value: "sqrt", start: i, end: i + 4 });
            i += 4;
            continue;
        }

        if ((chunk === "<" || chunk === ">") && expression.charAt(i + 1) === "=") {
            tokens.push({ type: "op", value: expression.slice(i, i + 2), start: i, end: i + 2 });
            i += 2;
            continue;
        }

        if (/[0-9]/.test(chunk)) {
            var previousMathToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;

            if (previousMathToken && previousMathToken.type === "sqrt") {
                i++;
                tokens.push({ type: "number", value: expression.slice(start, i), start: start, end: i });
                continue;
            }

            i++;
            while (i < expression.length && /[0-9.,]/.test(expression.charAt(i))) {
                i++;
            }
            tokens.push({ type: "number", value: expression.slice(start, i), start: start, end: i });
            continue;
        }

        if (/[A-Za-zÀ-ÿ]/.test(chunk)) {
            i++;
            while (i < expression.length && /[A-Za-zÀ-ÿ]/.test(expression.charAt(i))) {
                i++;
            }
            tokens.push({ type: "name", value: expression.slice(start, i), start: start, end: i });
            continue;
        }

        if ("()+-*/^=<>|".indexOf(chunk) !== -1) {
            tokens.push({ type: "op", value: chunk, start: i, end: i + 1 });
            i++;
            continue;
        }

        return null;
    }

    return tokens;
}

function parseRelationExpression(state) {
    var node = parseAdditiveExpression(state);
    if (!node) {
        return null;
    }

    while (matchOperator(state, "=") || matchOperator(state, "<") || matchOperator(state, ">") || matchOperator(state, "<=") || matchOperator(state, ">=") || matchOperator(state, "|")) {
        var operator = previousToken(state).value;
        var rightNode = parseAdditiveExpression(state);
        if (!rightNode) {
            return null;
        }
        node = { type: "relation", operator: operator, left: node, right: rightNode };
    }

    return node;
}

function parseAdditiveExpression(state) {
    var node = parseMultiplicativeExpression(state);
    if (!node) {
        return null;
    }

    while (matchOperator(state, "+") || matchOperator(state, "-")) {
        var operator = previousToken(state).value;
        var rightNode = parseMultiplicativeExpression(state);
        if (!rightNode) {
            return null;
        }
        node = { type: "binary", operator: operator, left: node, right: rightNode };
    }

    return node;
}

function parseMultiplicativeExpression(state) {
    var node = parseUnaryExpression(state);
    if (!node) {
        return null;
    }

    while (true) {
        if (matchOperator(state, "*")) {
            var explicitRight = parseUnaryExpression(state);
            if (!explicitRight) {
                return null;
            }
            node = { type: "binary", operator: "*", implicit: false, left: node, right: explicitRight };
            continue;
        }

        if (matchOperator(state, "/")) {
            var divisionRight = parseUnaryExpression(state);
            if (!divisionRight) {
                return null;
            }
            node = { type: "binary", operator: "/", left: node, right: divisionRight };
            continue;
        }

        if (canImplicitMultiply(state)) {
            var implicitRight = parseUnaryExpression(state);
            if (!implicitRight) {
                return null;
            }
            node = { type: "binary", operator: "*", implicit: true, left: node, right: implicitRight };
            continue;
        }

        break;
    }

    return node;
}

function parseUnaryExpression(state) {
    if (matchOperator(state, "+")) {
        return parseUnaryExpression(state);
    }

    if (matchOperator(state, "-")) {
        var value = parseUnaryExpression(state);
        if (!value) {
            return null;
        }
        return { type: "unary", operator: "-", value: value };
    }

    return parsePowerExpression(state);
}

function parsePowerExpression(state) {
    var node = parsePrimaryExpression(state);
    if (!node) {
        return null;
    }

    if (matchOperator(state, "^")) {
        var exponent = parseUnaryExpression(state);
        if (!exponent) {
            return null;
        }
        node = { type: "power", base: node, exponent: exponent };
    }

    return node;
}

function parsePrimaryExpression(state) {
    if (matchOperator(state, "(")) {
        var innerNode = parseRelationExpression(state);
        if (!innerNode || !matchOperator(state, ")")) {
            return null;
        }
        return innerNode;
    }

    if (matchType(state, "sqrt")) {
        var rootIndex = null;
        if (shouldUseRootIndex(state)) {
            rootIndex = advanceToken(state).value;
        }

        var rootValue = parseRootArgument(state);
        if (!rootValue) {
            return null;
        }

        return { type: "sqrt", index: rootIndex, value: rootValue };
    }

    if (matchType(state, "number")) {
        return { type: "number", value: previousToken(state).value };
    }

    if (matchType(state, "specialMath")) {
        return { type: "specialMath", latex: previousToken(state).latex };
    }

    if (peekToken(state) && peekToken(state).type === "name" && peekToken(state).value === "P" && peekToken(state, 1) && peekToken(state, 1).type === "op" && peekToken(state, 1).value === "(") {
        advanceToken(state);
        advanceToken(state);
        var probabilityArgument = parseRelationExpression(state);
        if (!probabilityArgument || !matchOperator(state, ")")) {
            return null;
        }
        return { type: "probability", argument: probabilityArgument };
    }

    if (peekToken(state) && peekToken(state).type === "name" && isKnownMathFunction(peekToken(state).value) && peekToken(state, 1) && peekToken(state, 1).type === "op" && peekToken(state, 1).value === "(") {
        var functionName = advanceToken(state).value;
        advanceToken(state);
        var functionArgument = parseRelationExpression(state);
        if (!functionArgument || !matchOperator(state, ")")) {
            return null;
        }
        return { type: "func", name: functionName, argument: functionArgument };
    }

    if (matchType(state, "name")) {
        return { type: "name", value: previousToken(state).value };
    }

    return null;
}

function shouldUseRootIndex(state) {
    var current = peekToken(state);
    var following = peekToken(state, 1);

    if (!current || current.type !== "number" || !following) {
        return false;
    }

    return canStartPrimaryToken(following);
}

function parseRootArgument(state) {
    if (!peekToken(state)) {
        return null;
    }

    if (peekToken(state).type === "op" && peekToken(state).value === "(") {
        return parsePrimaryExpression(state);
    }

    var node = parseUnaryExpression(state);
    if (!node) {
        return null;
    }

    while (canImplicitMultiply(state)) {
        var rightNode = parseUnaryExpression(state);
        if (!rightNode) {
            return null;
        }
        node = { type: "binary", operator: "*", implicit: true, left: node, right: rightNode };
    }

    return node;
}

function canImplicitMultiply(state) {
    var previous = previousToken(state);
    var next = peekToken(state);

    if (!previous || !next || !canEndPrimaryToken(previous) || !canStartPrimaryToken(next)) {
        return false;
    }

    return previous.end === next.start;
}

function canStartPrimaryToken(token) {
    if (!token) {
        return false;
    }

    return token.type === "number" || token.type === "name" || token.type === "sqrt" || token.type === "specialMath" || (token.type === "op" && token.value === "(");
}

function canEndPrimaryToken(token) {
    if (!token) {
        return false;
    }

    return token.type === "number" || token.type === "name" || token.type === "specialMath" || (token.type === "op" && token.value === ")");
}

function matchOperator(state, operator) {
    var current = peekToken(state);
    if (current && current.type === "op" && current.value === operator) {
        state.current++;
        return true;
    }
    return false;
}

function matchType(state, type) {
    var current = peekToken(state);
    if (current && current.type === type) {
        state.current++;
        return true;
    }
    return false;
}

function advanceToken(state) {
    state.current++;
    return state.tokens[state.current - 1];
}

function peekToken(state, offset) {
    var index = state.current + (offset || 0);
    return state.tokens[index] || null;
}

function previousToken(state) {
    return state.tokens[state.current - 1] || null;
}

function astToLatex(node) {
    if (!node) {
        return "";
    }

    if (node.type === "number" || node.type === "name") {
        return node.value;
    }

    if (node.type === "specialMath") {
        return node.latex;
    }

    if (node.type === "sqrt") {
        var rootValue = astToLatex(node.value);
        if (!node.index || node.index === "2") {
            return "\\sqrt{" + rootValue + "}";
        }
        return "\\sqrt[" + node.index + "]{" + rootValue + "}";
    }

    if (node.type === "func") {
        return functionNameToLatex(node.name) + "\\left(" + astToLatex(node.argument) + "\\right)";
    }

    if (node.type === "probability") {
        return "P\\left(" + astToLatex(node.argument) + "\\right)";
    }

    if (node.type === "unary") {
        var unaryValue = astToLatex(node.value);
        if (needsParenthesesInUnary(node.value)) {
            unaryValue = wrapWithParentheses(unaryValue);
        }
        return "-" + unaryValue;
    }

    if (node.type === "power") {
        var baseLatex = astToLatex(node.base);
        if (needsParenthesesInPowerBase(node.base)) {
            baseLatex = wrapWithParentheses(baseLatex);
        }
        return baseLatex + "^{" + astToLatex(node.exponent) + "}";
    }

    if (node.type === "relation") {
        return astToLatex(node.left) + relationOperatorToLatex(node.operator) + astToLatex(node.right);
    }

    if (node.type === "binary") {
        if (node.operator === "/") {
            return "\\frac{" + astToLatex(node.left) + "}{" + astToLatex(node.right) + "}";
        }

        if (node.operator === "*") {
            var leftProduct = astToLatex(node.left);
            var rightProduct = astToLatex(node.right);

            if (needsParenthesesInProduct(node.left)) {
                leftProduct = wrapWithParentheses(leftProduct);
            }
            if (needsParenthesesInProduct(node.right)) {
                rightProduct = wrapWithParentheses(rightProduct);
            }

            return node.implicit ? leftProduct + rightProduct : leftProduct + "\\cdot " + rightProduct;
        }

        var leftValue = astToLatex(node.left);
        var rightValue = astToLatex(node.right);
        if (node.operator === "-" && needsParenthesesInSubtraction(node.right)) {
            rightValue = wrapWithParentheses(rightValue);
        }
        return leftValue + node.operator + rightValue;
    }

    return "";
}

function relationOperatorToLatex(operator) {
    if (operator === "<=") {
        return "\\le ";
    }
    if (operator === ">=") {
        return "\\ge ";
    }
    if (operator === "|") {
        return "\\mid ";
    }
    return operator;
}

function isKnownMathFunction(name) {
    return ["sin", "cos", "tan", "ln", "log", "exp"].indexOf((name || "").toLowerCase()) !== -1;
}

function functionNameToLatex(name) {
    var normalized = (name || "").toLowerCase();
    if (normalized === "ln") {
        return "\\ln";
    }
    if (normalized === "log") {
        return "\\log";
    }
    if (normalized === "exp") {
        return "\\exp";
    }
    return "\\" + normalized;
}

function needsParenthesesInUnary(node) {
    return node && (node.type === "binary" || node.type === "relation" || node.type === "unary");
}

function needsParenthesesInPowerBase(node) {
    return node && (node.type === "binary" || node.type === "relation" || node.type === "unary");
}

function needsParenthesesInProduct(node) {
    return node && (node.type === "binary" && (node.operator === "+" || node.operator === "-") || node.type === "relation");
}

function needsParenthesesInSubtraction(node) {
    return node && ((node.type === "binary" && (node.operator === "+" || node.operator === "-")) || node.type === "relation");
}

function wrapWithParentheses(content) {
    return "\\left(" + content + "\\right)";
}

// Función de debounce genérica
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Función para inicializar el editor
function mostrarVistaMatematica(visible) {
  const panel = document.getElementById('FormulaMathPanel');
  if (panel) {
    panel.hidden = !visible;
  }
}

function actualitzarVistaMatematica() {
  const editor = document.getElementById('Camp');
  const output = document.getElementById('FormulaMath');
  if (!editor || !output) {
    return;
  }

  const rawText = editor.innerText || "";
  if (rawText.trim() === "") {
    output.innerHTML = "";
    mostrarVistaMatematica(false);
    return;
  }

  const latexText = parseTextToLatex(rawText);
  output.innerHTML = latexText;
  mostrarVistaMatematica(latexText.trim() !== "");

  if (window.MathJax && typeof MathJax.typesetPromise === "function") {
    MathJax.typesetPromise([output])
      .catch((err) => console.error("Error al renderizar MathJax: ", err.message));
  }
}

function initEditor() {
  const editor = document.getElementById('Camp');
  if (!editor) {
    return;
  }

  // Creamos un handler debounced de 1000 ms
  const debouncedHandle = debounce(actualitzarVistaMatematica, 600);

  // Cada vez que cambie el contenido, reiniciamos el timer
  editor.addEventListener('input', debouncedHandle);
  actualitzarVistaMatematica();
}

// Función para obtener la respuesta del alumno y pasarla por la conversión LaTeX
function obtenerRespuestaAlumno() {
    // Obtener el texto crudo del editor (lo que está en el id "Camp")
    const editor = document.getElementById('Camp');
    const rawText = editor.innerText;

    // Convertir el texto crudo a LaTeX utilizando la función parseTextToLatex
    const latexText = parseTextToLatex(rawText);

    // Almacenar el resultado en RespostaAlumne
    var Resposta = latexText;

    // Retornar el resultado si es necesario
    console.log('Respuesta procesada del alumno: ', Resposta);

    return Resposta;
}


function RenderizarMathJax(){
    MathJax.typesetPromise()
    .then(() => {
      console.log("MathJax ha renderizado el contenido correctamente.");
    })
    .catch((err) => console.error("Error al renderizar MathJax: ", err.message));
}

// Ejecutar RenderizarMathJax cada 10 segundos (10000 milisegundos)
//setInterval(RenderizarMathJax, 10000);

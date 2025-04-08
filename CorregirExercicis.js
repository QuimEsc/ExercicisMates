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
    
    const urlParams = new URLSearchParams(window.location.search);
    const servidor = urlParams.get('opcio');

    // Redirige al servidor correspondiente
    if (servidor === '0') {
        var url = Servidor[0];
    } else if (servidor === '1') {
        var url = Servidor[1];;
    } else if (servidor === '2') {
        var url = Servidor[2];;
    } else if (servidor === '3') {
        var url = Servidor[3];;
    } else {
        // Si no se especifica un servidor, redirige a un valor por defecto (servidor 1)
        window.location.href = 'https://quimesc.github.io/ExercicisMates';
    }


//var url = 'https://script.google.com/macros/s/AKfycbztPjI8M7LbhdtE5zcwzBsYiLjRUP71xE5MbDzgFCl___ilA5APHRVaxZYKCozrcJY/exec';
var url2 = 'https://script.google.com/macros/s/AKfycbyEL44Kh46RKxhH7FFx2hNwYxUa3vah2ZTSixPHbol0Eb1ixKhtVRyxV8RWD417j0w/exec';
function corregir(original, contenido)	{
    var pos1=0;
    var pos2=0;
    var accion="";
    mod="";
    var trozo="";
    var aux="";
    numfallos=0;
    var error=0;
    var contenido=contenido.trim();
        
        
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
        if(Dades.TipusCorreccio == "Paraula"){
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
                  Resposta: contenido,
                  PercentatgeAcert: PorcentajePalabrasCorrectas
                };

            if(localStorage.getItem("Resposta") == null){
                    localStorage.setItem("Resposta", JSON.stringify(Resultat)  );  //Guarda les respostes en Magatzenament Local
                }
        }else if(Dades.TipusCorreccio == "Test"){
            var Resultat = {
                  Resposta: contenido,
                  PercentatgeAcert: 1
                };

            if(localStorage.getItem("Resposta") == null){
                    localStorage.setItem("Resposta", JSON.stringify(Resultat)  );  //Guarda les respostes en Magatzenament Local
                }
        }else{
            var LevenshteinPerc = calculateImprovedLevenshteinDistance(original, contenido);
            if(LevenshteinPerc!=1){var LevenshteinPerc=0}
                var Resultat = {
                  Resposta: contenido,
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

  function Actualitzar() {
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
        setTimeout(RenderizarMathJax, 500);
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
        setTimeout(RenderizarMathJax, 500);
    }
}

function RenderizarMathJax(){
    MathJax.typesetPromise()
    .then(() => {
      console.log("MathJax ha renderizado el contenido correctamente.");
    })
    .catch((err) => console.error("Error al renderizar MathJax: ", err.message));
}

function CrearDom(){
  //Crear el nou DOM
    var DivContainer = document.getElementById("container");  //Selecciona el ID de container
    var HtmlContainer = "<h2 id=\"Apartat\"></h2><h3 id=\"Questio\"></h3><h3 id=\"Resposta\"></h3><h3 id=\"Correcio\"><div id=\"FormulaMath\"><p></p></div></h3><h3 id=\"Audio\"></h3><div id=\"Camp\" contenteditable=\"true\" style=\"border-style: inset; min-height:150px\"></div></br><div id =\"Btn\" ><p style=\"text-decoration:none;display:inline-block;color:#ffffff;background-color:#3AAEE0;border-radius:4px;width:auto;border-top:1px solid #3AAEE0;border-right:1px solid #3AAEE0;border-bottom:1px solid #3AAEE0;border-left:1px solid #3AAEE0;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;\"><span onclick=\"ComencaRutina()\" style=\"padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;\"><span style=\"font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;\">Comprovar</span></span></p></div>";

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
            const answer = RespostaAlumne;
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

              }

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
    var RespostaAlumne = obtenerRespuestaAlumno(); // Resposta alumne.
      
    if(Dades.TipusCorreccio !== "AutoAvaluacio"){
        var RespostaTeorica = LlevarCodiHtml(RespostaAlumne.replace(/ /g, "").replace(/<br>/g, ""));  //Resposta del Quadre de text
        var Resposta =  Dades.Resposta;
        console.log(RespostaTeorica);
        var CorreccioArray = corregir(Resposta, RespostaTeorica);  //[HTML correccio, % acert]

        //VISUALITZACIÓ DE LA CORRECCIÓ
        if(CorreccioArray[1]<1){
            document.getElementById("Btn").innerHTML = "<p style=\"text-decoration:none;display:inline-block;color:#ffffff;background-color:#3AAEE0;border-radius:4px;width:auto;border-top:1px solid #3AAEE0;border-right:1px solid #3AAEE0;border-bottom:1px solid #3AAEE0;border-left:1px solid #3AAEE0;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;\"><span onclick=\"ComencaRutina()\" style=\"padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;\"><span style=\"font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;\">Corregir</span></span></p>"; //Canvia nom botó
            document.getElementById("Resposta").innerHTML = "<b style=\"color:blue;\"><u>RESPOSTA: </u></b>" + Dades.Resposta;
            document.getElementById("Correcio").innerHTML = "<b style=\"color:blue;\"><u>CORRECCI&Oacute;: </u></b>" + CorreccioArray[0];
    
    
            //Afegit:  SI ERROR -->  mostra la resposta durant 7 segons i passa a la següent pregunta.
                document.getElementById("Camp").innerText = Resposta;		//escriu la resposta correcta en el quadre.
                var RetrasEnviarResposta = setTimeout(EnviarInfo,7000);
            //Fi de l'afegit
    
    
        }else{
            EnviarInfo();
        }
    }else{
        var CorreccioArray = autocorreccio(RespostaAlumne);  //AutoAvaluació automàtica
    }

  // Asegúrate de que MathJax renderice el contenido después de que se haya actualizado
  setTimeout(() => {
    MathJax.typesetPromise()
      .then(() => {
        console.log("MathJax ha renderizado el contenido correctamente.");
      })
      .catch((err) => console.error("Error al renderizar MathJax: ", err.message));
  }, 500); // Retraso pequeño para asegurar que el DOM está listo
}



function EnviarInfo(){
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
                   
             }    
         }).catch(function (err) {
           // There was an error
           console.warn('Something went wrong.', err);
         });    //envia dades al servidor
}


//FUNCIONS PER A FRACCIONS
 // Funciones globales para convertir texto a LaTeX
 function parseTextToLatex(text) {
    return text.split('\n').map(line => {
        return line.split(/\s+/).map(token => {
            const converted = convertToken(token);
            return converted === token ? token : `\\(${converted}\\)`;
        }).join(' ');  // Unir los tokens con un espacio
    }).join('<br>');  // Usar <br> para saltos de línea reales
}

function convertToken(token) {
    // Raíces: sqrtNvalor
    const rootMatch = token.match(/^sqrt(\d)(.*)/);
    if (rootMatch) {
        const index = rootMatch[1];
        const radicand = rootMatch[2] || '';
        return `\\sqrt[${index}]{${convertToken(radicand)}}`;
    }

    // Fracciones: a/b
    const fractionParts = token.split('/');
    if (fractionParts.length > 1) {
        const numerator = fractionParts.slice(0, -1).join('/');
        const denominator = fractionParts.pop();
        return `\\frac{${convertToken(numerator)}}{${convertToken(denominator)}}`;
    }

    // Potencias: a^b
    const powerParts = token.split('^');
    if (powerParts.length > 1) {
        const base = powerParts.slice(0, -1).join('^');
        const exponent = powerParts.pop();
        return `${convertToken(base)}^{${convertToken(exponent)}}`;
    }

    return token;
}

// Función para inicializar el editor
function initEditor() {
    const editor = document.getElementById('Camp');
    const output = document.getElementById('FormulaMath');

    editor.addEventListener('input', handleInput);

    function handleInput() {
        const rawText = editor.innerText; 
        const latexText = parseTextToLatex(rawText);
        output.innerHTML = latexText;
        MathJax.typesetPromise();
    }
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

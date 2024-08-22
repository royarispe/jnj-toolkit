document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("uploadForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();

      const fileInput = document.getElementById("fileInput");
      const file = fileInput.files[0];

      if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
          const text = e.target.result;
          processFile(text);
        };

        reader.readAsText(file);
      }
    });

  document
    .getElementById("filterForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();

      applyFilter();
    });
});

let referentes = [];
let inscriptos = [];
let inscripciones = [];

function processFile(content) {
  const lines = content.split("\n");
  referentes = [];
  inscriptos = [];
  inscripciones = [];
  let currentReferente = null;
  let currentInscriptos = [];
  let costoTotal = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    console.log("Processing line: ", line);

    if (line.startsWith("false,formulario,")) {
      if (currentReferente) {
        const inscripcion = new Inscripcion(
          costoTotal,
          currentReferente,
          currentInscriptos
        );
        inscripciones.push(inscripcion);
        referentes.push(currentReferente);
        inscriptos = [...inscriptos, ...currentInscriptos];
      }

      currentReferente = null;
      currentInscriptos = [];
      
      const costoMatch = line.match(/"(\d+,\d+)"/);
      if (costoMatch) {
        const costoString = costoMatch[1].replace(/,/g, "");
        costoTotal = parseFloat(costoString);
      }

    } else if (line.startsWith("Nombre del Referente")) {
      let referenteLines = [];

      // Capturamos todas las líneas hasta "Nuevo Integrante" o una nueva inscripción
      while (i < lines.length && 
             !lines[i].startsWith("Nuevo Integrante") && 
             !lines[i].startsWith("false,formulario,")) {
        console.log("Referente line: ", lines[i]); // Log de cada línea de referente
        referenteLines.push(lines[i].trim());
        i++;
      }

      const referenteData = extractReferenteData(referenteLines);
      currentReferente = new Referente(...referenteData);

      // Asegurarse de que no se salte la línea de "Nuevo Integrante" o "false,formulario"
      i--;

    } else if (line.startsWith("Nuevo Integrante")) {
      let inscriptoLines = [];

      // Capturamos todas las líneas hasta el próximo integrante o una nueva inscripción
      i++; // Avanzar para empezar a capturar las líneas del inscripto
      while (i < lines.length && 
             !lines[i].startsWith("Nuevo Integrante") && 
             !lines[i].startsWith("false,formulario,")) {
        console.log("Inscriptos line: ", lines[i]); // Log de cada línea de inscripto
        inscriptoLines.push(lines[i].trim());
        i++;
      }

      const inscriptoData = extractInscriptoData(inscriptoLines);

      // Verificar que inscriptoData no sea null antes de usarlo
      if (inscriptoData) {
        const inscripto = new Inscripto(...inscriptoData);
        currentInscriptos.push(inscripto);
      }

      // Asegurarse de que no se salte la línea de "Nuevo Integrante" o "false,formulario"
      i--;
    }
  }

  // Al finalizar, crear la última inscripción si existe un referente
  if (currentReferente) {
    const inscripcion = new Inscripcion(
      costoTotal,
      currentReferente,
      currentInscriptos
    );
    inscripciones.push(inscripcion);
    referentes.push(currentReferente);
    inscriptos = [...inscriptos, ...currentInscriptos];
  }

  displaySummary(referentes, inscriptos, inscripciones);
  console.log("Processing complete.");
}


function applyFilter() {
  const filterType = document.getElementById("filterSelect").value;
  let filteredData = [];

  if (filterType === "referentes") {
    filteredData = referentes;
  } else if (filterType === "inscriptos") {
    filteredData = inscriptos;
  } else if (filterType === "totalPersonas") {
    filteredData = [...referentes, ...inscriptos];
  } else if (filterType === "restriccionAlimenticia") {
    filteredData = inscriptos.filter(
      (inscripto) => inscripto.restriccionAlimenticia.toLowerCase() !== "no"
    );
  } else if (filterType === "diocesis") {
    filteredData = inscriptos.reduce((acc, inscripto) => {
      acc[inscripto.diocesis] = (acc[inscripto.diocesis] || 0) + 1;
      return acc;
    }, {});
  } else if (filterType === "actividadPreferencia") {
    filteredData = inscriptos.reduce((acc, inscripto) => {
      acc[inscripto.actividadPreferencia] =
        (acc[inscripto.actividadPreferencia] || 0) + 1;
      return acc;
    }, {});
  }

  displayFilteredResults(filteredData);
}

function displayFilteredResults(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (Array.isArray(data)) {
    const list = document.createElement("ul");
    data.forEach((item, index) => {
      const listItem = document.createElement("li");
      listItem.textContent = JSON.stringify(item);
      list.appendChild(listItem);
    });
    resultsDiv.appendChild(list);
  } else {
    for (const key in data) {
      const p = document.createElement("p");
      p.textContent = `${key}: ${data[key]}`;
      resultsDiv.appendChild(p);
    }
  }
}

function extractReferenteData(lines) {
  const data = {};
  let process_next_line_as_restriction = false;
  let process_next_line_as_activity = false;

  for (let line of lines) {
    if (line.includes("Foto de Cédula del Referente")) {
      continue; // Ignorar la línea de la foto
    }

    const [key, value] = line.split(":").map((item) => item.trim());

    if (process_next_line_as_restriction) {
      if (value) {
        data["restriccionAlimenticia"] = [data["restriccionAlimenticia"], value];
      }
      process_next_line_as_restriction = false;
      continue;
    }

    if (process_next_line_as_activity) {
      data["actividadPreferencia"] += " - " + value;
      process_next_line_as_activity = false;
      continue;
    }

    // Lógica para manejar la restricción alimenticia
    if (key === "¿Tienes alguna restriccion alimenticia?") {
      data["restriccionAlimenticia"] = value;
      process_next_line_as_restriction = true; // Siempre procesar la siguiente línea como la restricción alimenticia
    } 
    // Lógica para manejar la actividad de preferencia
    else if (key === "Actividad de preferencia") {
      if (value.toLowerCase() === "taller") {
        data["actividadPreferencia"] = value;
        process_next_line_as_activity = true; // Procesar la siguiente línea como parte del taller
      } else {
        data["actividadPreferencia"] = value;
      }
    } 
    // Asignar a los atributos del objeto Referente según la clave
    else {
      switch (key) {
        case "Nombre del Referente":
          data["nombre"] = value;
          break;
        case "Apellido del Referente":
          data["apellido"] = value;
          break;
        case "Celular del Referente":
          data["celular"] = value;
          break;
        case "Email del Referente":
          data["email"] = value;
          break;
        case "Fecha de nacimiento del Referente":
          data["fechaNacimiento"] = value;
          break;
        case "Cédula del Referente":
          data["cedula"] = value;
          break;
        case "Otra situación de salud a considerar":
          data["salud"] = value;
          break;
        case "Contacto de emergencia":
          data["contactoEmergencia"] = value;
          break;
        case "Nombre del Contacto de emergencia":
          data["nombreContactoEmergencia"] = value;
          break;
        case "Vínculo del Contacto de emergencia":
          data["vinculoContactoEmergencia"] = value;
          break;
        case "¿Perteneces a un movimiento?":
          data["movimiento"] = value;
          break;
        case "Selecciona una diócesis":
          const match = value.match(/\(([^)]+)\)/);
          data["diocesis"] = match ? match[1] : value;
          break;
        case "¿Cuántos integrantes tiene tu grupo?":
          data["cantidadIntegrantes"] = value;
          break;
        case "Costo de tu cupo $":
          data["costo"] = value;
          break;
        default:
          console.warn(`Clave no reconocida: ${key}`);
          break;
      }
    }
  }

  return Object.values(data); // Retornar los valores en orden para crear el objeto Referente
}

function extractInscriptoData(lines) {
  const data = {};
  let process_next_line_as_restriction = false;
  let process_next_line_as_activity = false;

  lines.forEach((line) => {
    const [key, value] = line.split(":").map((item) => item.trim());

    // Verificar si la línea tiene el formato clave:valor esperado
    if (!key || !value) {
      console.warn(`Línea inválida o malformada: ${line}`);
      return; // Continuar si la línea no tiene formato clave:valor
    }

    // Manejo de la restricción alimenticia
    if (process_next_line_as_restriction) {
      if (value) {
        data["restriccionAlimenticia"] = [data["restriccionAlimenticia"], value];
      }
      process_next_line_as_restriction = false;
      return; // Continuar con la siguiente línea
    }

    // Manejo de la actividad de preferencia
    if (process_next_line_as_activity) {
      data["actividadPreferencia"] += " - " + value;
      process_next_line_as_activity = false;
      return; // Continuar con la siguiente línea
    }

    // Lógica para manejar la restricción alimenticia
    if (key === "Tienes alguna restriccion alimenticia") {
      data["restriccionAlimenticia"] = value;
      process_next_line_as_restriction = true; // Siempre procesar la siguiente línea como la restricción alimenticia
    } 
    // Lógica para manejar la actividad de preferencia
    else if (key === "Actividad de preferencia") {
      if (value.toLowerCase() === "taller") {
        data["actividadPreferencia"] = value;
        process_next_line_as_activity = true; // Procesar la siguiente línea como parte del taller
      } else {
        data["actividadPreferencia"] = value;
      }
    } 
    // Asignar a los atributos del objeto Inscripto según la clave
    else {
      switch (key) {
        case "Nombre del integrante":
          data["nombre"] = value;
          break;
        case "Apellido del Integrante":
          data["apellido"] = value;
          break;
        case "Celular del Integrante":
          data["celular"] = value;
          break;
        case "Fecha de nacimiento del Integrante":
          data["fechaNacimiento"] = value;
          break;
        case "Cédula del Integrante":
          data["cedula"] = value;
          break;
        case "Otra situación de salud a considerar":
          data["salud"] = value;
          break;
        case "Perteneces a un movimiento":
          data["movimiento"] = value;
          break;
        case "Selecciona una Diócesis":
          const match = value.match(/\(([^)]+)\)/);
          data["diocesis"] = match ? match[1] : value;
          break;
        case "Costo del cupo $":
          data["costo"] = value;
          break;
        default:
          console.warn(`Clave no reconocida: ${key}`);
          break;
      }
    }
  });

  // Verificar si los datos fueron correctamente asignados
  console.log("Inscripto data procesado: ", data);
  return Object.keys(data).length ? Object.values(data) : null; // Retornar null si el objeto está vacío
}

function displaySummary(referentes, inscriptos, inscripciones) {
  const totalPersonas = referentes.length + inscriptos.length;
  const totalCosto = inscripciones.reduce(
    (sum, inscripcion) => sum + inscripcion.costoTotal,
    0
  );

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `
        <p><strong>Información cargada con éxito.</strong></p>
        <p><strong>Cantidad de inscripciones:</strong> ${
          inscripciones.length
        }</p>
        <p><strong>Cantidad de referentes:</strong> ${referentes.length}</p>
        <p><strong>Cantidad de inscriptos:</strong> ${inscriptos.length}</p>
        <p><strong>Cantidad total de personas:</strong> ${totalPersonas}</p>
        <p><strong>Dinero total recaudado:</strong> $${totalCosto.toLocaleString()}</p>
    `;
}

class Referente {
  constructor(
    nombre,
    apellido,
    celular,
    email,
    fechaNacimiento,
    cedula,
    restriccionAlimenticia,
    salud,
    contactoEmergencia,
    nombreContactoEmergencia,
    vinculoContactoEmergencia,
    movimiento,
    actividadPreferencia,
    diocesis,
    cantidadIntegrantes,
    costo
  ) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.celular = celular;
    this.email = email;
    this.fechaNacimiento = fechaNacimiento;
    this.cedula = cedula;
    this.restriccionAlimenticia = restriccionAlimenticia;
    this.salud = salud;
    this.contactoEmergencia = contactoEmergencia;
    this.nombreContactoEmergencia = nombreContactoEmergencia;
    this.vinculoContactoEmergencia = vinculoContactoEmergencia;
    this.movimiento = movimiento;
    this.actividadPreferencia = actividadPreferencia;
    this.diocesis = diocesis;
    this.cantidadIntegrantes = cantidadIntegrantes;
    this.costo = costo;
  }
}

class Inscripto {
  constructor(
    nombre,
    apellido,
    celular,
    fechaNacimiento,
    cedula,
    restriccionAlimenticia,
    salud,
    movimiento,
    diocesis,
    actividadPreferencia,
    costo
  ) {
    this.nombre = nombre;
    this.apellido = apellido;
    this.celular = celular;
    this.fechaNacimiento = fechaNacimiento;
    this.cedula = cedula;
    this.restriccionAlimenticia = restriccionAlimenticia;
    this.salud = salud;
    this.movimiento = movimiento;
    this.diocesis = diocesis;
    this.actividadPreferencia = actividadPreferencia;
    this.costo = costo;
  }
}

class Inscripcion {
  constructor(costoTotal, referente, inscriptos) {
    this.costoTotal = costoTotal;
    this.referente = referente;
    this.inscriptos = inscriptos; // Array de objetos Inscripto
  }
}

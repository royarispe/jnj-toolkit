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
    // Ignoramos la primera línea
    const line = lines[i].trim();

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

      const costoMatch = line.match(/"(\d+,\d+)"/);
      if (costoMatch) {
        const costoString = costoMatch[1].replace(/,/g, "");
        costoTotal = parseFloat(costoString);
      }

      currentReferente = null;
      currentInscriptos = [];
    } else if (line.startsWith("Nombre del Referente")) {
      const referenteData = extractReferenteData(lines.slice(i, i + 18));
      currentReferente = new Referente(...referenteData);
      i += 17;
    } else if (line.startsWith("Nuevo Integrante")) {
      const inscriptoData = extractInscriptoData(lines.slice(i + 1, i + 13));
      const inscripto = new Inscripto(...inscriptoData);
      currentInscriptos.push(inscripto);
      i += 12;
    }
  }

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
  displayInscriptionCosts(inscripciones); // Imprimir listado de costos por inscripción
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
  const data = [];

  lines.forEach((line) => {
    if (!line.startsWith("Foto de Cédula del Referente")) {
      const parts = line.split(":");
      data.push(parts[1].trim());
    }
  });

  return data;
}

function extractInscriptoData(lines) {
  const data = [];

  lines.forEach((line) => {
    const parts = line.split(":");
    data.push(parts[1].trim());
  });

  return data;
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

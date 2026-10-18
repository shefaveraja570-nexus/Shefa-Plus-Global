'use strict';

/**

* SHEFA-SHOP GLOBAL
* Punto de entrada de la aplicación.
* 
* Carga las variables de entorno y ejecuta el servidor existente.
* La lógica comercial permanece en server.js.
  */

try {
require('dotenv').config();
} catch (error) {
if (error.code !== 'MODULE_NOT_FOUND') {
console.error(
'[Shefa-Shop] Error al cargar las variables de entorno.'
);
throw error;
}
}

require('./server.js');

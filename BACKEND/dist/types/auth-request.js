"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 *Creamos una interfaz que extienda todo lo que tiene Request de express y
 ademas se le agrega una popiedad opcional de tipo JwtPayload el cual es se importa de la libreria
 jsonwebtoken, este tipo describe la forma del objeto que nos regresaria verify() cuando el token es valido.

 La propiedad es opcional porque no todas las peticiones la van a tener
 */

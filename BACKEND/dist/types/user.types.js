"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Roles = exports.Plataforma = exports.Idioma = exports.ModoDeJuego = exports.Sexo = void 0;
//Los enums sirven para evitar errores de tipeo y para tener un conjunto de valores predefinidos
var Sexo;
(function (Sexo) {
    Sexo["MASCULINO"] = "masculino";
    Sexo["FEMENINO"] = "femenino";
    Sexo["OTRO"] = "otro";
})(Sexo || (exports.Sexo = Sexo = {}));
var ModoDeJuego;
(function (ModoDeJuego) {
    ModoDeJuego["CASUAL"] = "casual";
    ModoDeJuego["COMPETITIVO"] = "competitivo";
    ModoDeJuego["AGRESIVO"] = "agresivo";
    ModoDeJuego["ESTRATEGICO"] = "estrategico";
    ModoDeJuego["COOPERATIVO"] = "cooperativo";
    ModoDeJuego["EXPLORADOR"] = "explorador";
    ModoDeJuego["APOYO"] = "apoyo";
    ModoDeJuego["ROLERO"] = "rolero";
    ModoDeJuego["COMPLETISTA"] = "completista";
    ModoDeJuego["TRYHARD"] = "tryhard";
})(ModoDeJuego || (exports.ModoDeJuego = ModoDeJuego = {}));
var Idioma;
(function (Idioma) {
    Idioma["ESPANOL"] = "espa\u00F1ol";
    Idioma["INGLES"] = "ingl\u00E9s";
    Idioma["PORTUGUES"] = "portugu\u00E9s";
    Idioma["FRANCES"] = "franc\u00E9s";
    Idioma["ALEMAN"] = "alem\u00E1n";
    Idioma["ITALIANO"] = "italiano";
    Idioma["JAPONES"] = "japon\u00E9s";
    Idioma["COREANO"] = "coreano";
    Idioma["CHINO"] = "chino";
    Idioma["RUSO"] = "ruso";
    Idioma["ARABE"] = "\u00E1rabe";
    Idioma["HINDI"] = "hindi";
})(Idioma || (exports.Idioma = Idioma = {}));
var Plataforma;
(function (Plataforma) {
    Plataforma["PC"] = "pc";
    Plataforma["PLAYSTATION"] = "playstation";
    Plataforma["XBOX"] = "xbox";
    Plataforma["NINTENDO_SWITCH"] = "nintendo_switch";
    Plataforma["MOBILE"] = "mobile";
})(Plataforma || (exports.Plataforma = Plataforma = {}));
var Roles;
(function (Roles) {
    Roles["ADMIN"] = "administrador";
    Roles["USER"] = "usuario";
    Roles["MOD"] = "moderador";
})(Roles || (exports.Roles = Roles = {}));

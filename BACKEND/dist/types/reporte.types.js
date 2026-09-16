"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estadoReporte = exports.motivoReporte = void 0;
var motivoReporte;
(function (motivoReporte) {
    motivoReporte["SPAM"] = "spam";
    motivoReporte["ACOSO"] = "acoso";
    motivoReporte["CONTENIDO_INAPROPIADO"] = "contenido_inapropiado";
    motivoReporte["OTRO"] = "otro";
})(motivoReporte || (exports.motivoReporte = motivoReporte = {}));
var estadoReporte;
(function (estadoReporte) {
    estadoReporte["PENDIENTE"] = "pendiente";
    estadoReporte["RESUELTO"] = "resuelto";
    estadoReporte["RECHAZADO"] = "rechazado";
})(estadoReporte || (exports.estadoReporte = estadoReporte = {}));

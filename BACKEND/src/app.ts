import express from 'express';
import { engine } from 'express-handlebars';
import { handlebarsHelpers } from './config/handlebars-helpers';
import routes from './routes';
import path from 'path';
import cookieParser from 'cookie-parser';
import { inyectarUsuarioEnVistas } from './middlewares/auth-vistas.middleware';

let app: express.Express;

export function createApp() {
    app = express();

    app.use(express.json());
    app.use(cookieParser());
    app.use(inyectarUsuarioEnVistas);

    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, '..', '..', 'FRONTEND', 'public')));

    app.engine(
        'handlebars',
        engine({
            helpers: handlebarsHelpers,
        }),
    );
    app.set('view engine', 'handlebars');
    app.set('views', path.join(__dirname, '..', '..', 'FRONTEND', 'views'));

    app.use(routes);

    return app;
}
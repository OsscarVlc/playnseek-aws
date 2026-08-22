import { Router } from 'express';
import pagesRouter from './pages';
import userRoutes from './users';
import juegosRoutes from './juego';
import grupoRoutes from './grupo';
import postRoutes from './post';
import comentarioRoutes from './comentario';
import reporteRoutes from './reporte';
import matchRoutes from './match';
import solicitudRoutes from './solicitud';
import recomendacionRoutes from './recomendacion';

const router = Router(); // usamos el servicio de rutas de express

router.use(pagesRouter);

router.use('/user', userRoutes);

router.use('/juegos', juegosRoutes);

router.use('/grupo', grupoRoutes);

router.use('/post', postRoutes);

router.use('/comentario', comentarioRoutes);

router.use('/reporte', reporteRoutes);

router.use('/match', matchRoutes);

router.use('/solicitud', solicitudRoutes);

router.use('/recomendacion', recomendacionRoutes);

export default router;

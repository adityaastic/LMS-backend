import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import morgan from 'morgan'; // Import morgan
import userRoutes from './routes/user.routes.js'
import errorMiddleware from './middlewares/error.middlewares.js';
config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.use(cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true
}));

app.use(cookieParser());

// Use morgan for logging
app.use(morgan('dev'));

app.use('/ping', function(req, res) {
    res.send('pong');
});

// Add routes for other modules here
app.use('/api/v1/user', userRoutes)

app.all('*', (req, res) => {
    res.status(404).send('Oops!! 404 page not found');
});


app.use(errorMiddleware);

export default app;

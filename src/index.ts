import express from 'express';
import subjectsRouter from "./routes/subject";
import cors from 'cors';

const app = express();
const port = 8000;

if(!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL is not set in .env file');

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

app.use(express.json());

app.use('/api/subjects', subjectsRouter)

app.get('/', (req, res) => {
    res.send('Hello, welcome to the Classroom API!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
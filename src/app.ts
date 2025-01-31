import express, {
  Application,
  json,
  NextFunction,
  Request,
  Response,
  urlencoded,
} from "express";
import compression from "compression";
import cors from "cors";
import RoutesV1 from "./api/routes/v1";
import Logger from "./core/Logger";
import { environment, port as EnvPort } from "./config";
import { connectDatabase } from "./config/database";
import { ApiError, InternalError, NotFoundError } from "./core/ApiError";
import timeout from "connect-timeout";

// process.on("uncaughtException", (e) => {
//   Logger.error(e);
// });

const app: Application = express();
export const port = process.env.PORT || EnvPort;

app.use(timeout("120s"));
app.set("port", port);

//gzip compression to reduce file size before sending to the web browser. Reduces latency and lag
app.use(compression());

app.use(cors());

app.use(urlencoded({ limit: "10mb", extended: false, parameterLimit: 10000 }));

app.use(json({ limit: "10mb" }));

// connect the mongodb database
connectDatabase();
// Index route
app.get("/", (req: Request, res: Response) => {
  return res.status(200).json({
    environment,
    message: `Welcome to Montech XRP Wallet Server`,
  });
});

//middleware for routes
app.use("/v1", RoutesV1);

// catch 404 and forward to error handler
app.use((req, res, next) => next(new NotFoundError()));

//custom error handler for all routes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApiError) {
    ApiError.handle(err, res);
  } else {
    console.log(err.message);
    // ApiError.handle(new InternalError(), res);
    return res.status(500).send(err.message);
  }
});

export default app;

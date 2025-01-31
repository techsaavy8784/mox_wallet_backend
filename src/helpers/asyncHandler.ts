import { NextFunction, Request, Response } from "express";

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export default (execution: AsyncFunction) =>
  (req: Request, res: Response, next: NextFunction): void => {
    execution(req, res, next).catch(
      /*(reason) => {
      console.log(reason);
      next();
    }*/ next
    );
  };

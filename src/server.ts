import app, { port } from "./app";
import Logger from "./core/Logger";

app
  .listen(app.get("port"), () => {
    Logger.info("App listening on port " + port);
  })
  .on("error", (e) => {
    Logger.error(e);
  });

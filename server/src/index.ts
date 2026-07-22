import "dotenv/config";
import { app } from "./app.js";

const port = process.env.PORT ? Number(process.env.PORT) : 8787;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

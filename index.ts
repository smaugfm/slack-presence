import { main } from "./src/main";

(async () => {
  try {
    await main();
  } catch (e) {
    console.error(e);
  }
})();

import { Application } from './App/app.js';

main();

/** @param {api_obj} api */
async function 
main(api)
{
  const app = new Application();
  await app.init();
  app.run();
}